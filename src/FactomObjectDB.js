const {FactomObject} = require('./FactomObject');
const {FactomdCache} = require('factomd-cache');
const ObjectRules = require('./rules/ObjectRules');
// const level = require('level');
const level = require('level-party');

//setup crypto
const crypto = require('crypto');
const aes256 = require('aes256');

const zlib = require('zlib');

const {FactomCli} = require('factom');
const {Entry} = require('factom/src/entry');
const {Chain} = require('factom/src/chain');

let dbId = '';
let aesKey;
const sodb = require('sodb');
const db = new sodb();

function FactomObjectDB(params) {
    const self = this;
    if (!params) params = {};

    if (params.db_id) dbId = params.db_id; //db ID override

    const cli = new FactomCli(params.factom ? params.factom : {});
    const cache = new FactomdCache(params.factom ? {factomdParams: params.factom} : {});

    const ec_address = params.ec_address; //if not included will result in read only access

    //Handle encryption settings
    if (params.aes_key) {
        aesKey = params.aes_key.toString();
    }

    //prime the cache by priming chaincaches for all objects
    const leveldb = level('./databases/' + dbId);
    leveldb.createReadStream()
        .on('data', async function (data) {
            let object = await self.getObject(data.key);
            db.add(object);
            console.log('ADDED OBJECT: ' + data.key);
        })
        .on('error', function (err) {
            console.error('STREAM ERROR:', err)
        });


    async function sync() {
        const indexExists = await cli.chainExists(getObjectIndexChainID(dbId));
        //if index chain exists, load it and aggregate all object IDS
        if (indexExists) {
            const objectIds = await self.getObjectIds();
            console.log("Priming", objectIds.length, "objects for DB " + dbId);
            objectIds.forEach(id => self.getObject(id))  //prime & store F&F
        } else { //otherwise establish the chain
            const compressedContent = await encryptZipObject({type: 'index'});
            let entry = Entry.builder()
                .extId(Buffer.from('objectdb'.toString('hex')))
                .extId(Buffer.from('0.0.0'.toString('hex')))
                .extId(Buffer.from(('database:' + dbId + ':index').toString('hex')))
                .content(compressedContent)
                .build();

            let chain = new Chain(entry);
            await cli.addChain(chain, ec_address); //F&F, doesn't matter
        }
    }

    sync();

    //Set core methods
    this.commitObject = async function (objectId, object, rules) {
        console.log('COMMITTING OBJECTID: ' + objectId);

        if (!ec_address) throw new Error('You must include a public or private EC Address!(ec_address)');

        if (!objectId) throw new Error('Must provide an Object ID!');

        if (!object) object = {};

        //evaluate object rules
        if (rules && !ObjectRules.validate(object, rules)) throw new Error('Object rules were invalid');

        // console.log('Creating a new chain for object ' + id + ' in db ' + dbId);

        //by default the ExtID is assembled like this
        const extId = crypto.createHash('md5').update(dbId + objectId).digest("hex");

        //handle object rules
        rules = rules !== undefined ? rules : new ObjectRules.Builder().build();

        //chain meta object keys can be shortened to decrease average content size!
        const metaEntry = { //will be converted to JSON. Do not set options that can not be converted to JSON!
            type: 'meta', //required
            object: object, //required, the initial version of the object
            rules: rules,
        };

        let compressedContent = await encryptZipObject(metaEntry);

        let entry = Entry.builder() //prepare first entry
            .extId(Buffer.from('objectdb'.toString('hex')))
            .extId(Buffer.from('0.0.0'.toString('hex')))
            .extId(Buffer.from(('database:' + dbId + ':object:' + objectId).toString('hex')))
            .content(compressedContent)
            .build();

        console.log(entry);

        let chain = new Chain(entry);
        console.log(chain);
        console.log('Expected CHAINID:' + getObjectChainID(dbId, objectId));
        const newEntry = await cli.addChain(chain, ec_address);

        //persist the new Object's ID
        leveldb.put(objectId, true);

        //add a new entry to the index chain
        let indexEntry = {
            type: 'index',
            ids: [objectId]
        };

        compressedContent = await encryptZipObject(indexEntry);
        entry = Entry.builder()
            .chainId(getObjectIndexChainID(dbId))
            .extId(Buffer.from('test'))
            .content(compressedContent)
            .build();

        console.log('newINDEXENTRY:', entry);
        let newIndexEntry = await cli.addEntry(entry, ec_address);

        // console.log('NEWENTRY:', newEntry);

        return newEntry;
    };

    //commit an update to the object, fire and forget. This may result in an invalid update!
    this.commitObjectUpdate = async function (objectId, update) {
        if (!params) params = {};
        if (!objectId) new Error('Must provide an Object ID!');
        if (!update) new Error('Must provide an Object update!');

        const chainId = getObjectChainID(dbId, objectId);

        const updateEntryContent = {
            type: 'update',
            update: update
        };

        let compressedContent = await encryptZipObject(updateEntryContent);

        const updateEntry = Entry.builder()
            .chainId(chainId)
            .content(Buffer.from(compressedContent))
            .build();

        return await cli.addEntry(updateEntry, ec_address);
    };

    this.getObjectMetadata = async function (objectId) {
        // const metaEntry = await cli.getFirstEntry(chainId);
        const entries = await cache.getRangedChainEntries(getObjectChainID(dbId, objectId), 0, 1);
        // leveldb.put(objectId, true); //persist the object for next time if it's not already

        return await parseObjectFromEntry(entries[0]);
    };

    this.getObject = async function (objectId, callback) {
        // const entries = await cli.getAllEntriesOfChain(chainId);
        const entries = await cache.getAllChainEntries(getObjectChainID(dbId, objectId));
        // leveldb.put(objectId, true); //if successful, persist the object for next time if it's not already

        return await getObjectFromEntries(entries);
    };

    this.getObjectIds = async function () {
        let indexEntries = await cli.getAllEntriesOfChain(getObjectIndexChainID(dbId));
        const ids = new Set();
        const objects = await Promise.all(indexEntries.map(entry => parseObjectFromEntry(entry)));
        objects.forEach(object => {
            if (object.ids && Array.isArray(object.ids)) object.ids.forEach(id => ids.add(id))
        });
        return Array.from(ids);
    };

    this.find = function (query) {
        return db.where(query);
    };

    this.findOne = function (query) {
        return db.findOne(query);
    };

    async function getObjectFromEntries(entries) {
        let object;
        let metaEntry;

        // console.log('Parsing ' + entries.length + ' entries');

        //race condition waiting to happen!
        for (let index = 0; index < entries.length; index++) {
            const entry = entries[index];
            //needs to complete sequentially, guaranteed
            let decryptedContentObject;
            try {
                decryptedContentObject = await parseObjectFromEntry(entry);
            } catch (e) {
                continue;
            }
            //parse error based on meta entry if exists

            // console.log(JSON.stringify(decryptedContentObject, undefined, 2));

            //parse what type of entry this is
            switch (decryptedContentObject.type) {
                case 'meta': {
                    if (metaEntry) continue; //can only have one metadata entry
                    object = new FactomObject(decryptedContentObject); //begin with the init object
                    metaEntry = decryptedContentObject;
                    break;
                }

                case 'update': {
                    try {
                        object.applyUpdate(decryptedContentObject);
                    } catch (e) {
                        console.log(e);
                    }
                    break;
                }
                default: {
                    console.log('UNKNOWN TYPE:' + decryptedContentObject.type);
                    break;
                }
            }
        }

        return object.get();
    }

    async function parseObjectFromEntry(entry) {
        //first unzip the content
        let content = await new Promise((resolve, reject) => {
            zlib.unzip(entry.content, async (err, content) => {
                if (err) reject(err);
                else resolve(content);
            });
        });

        //convert from buffer
        content = content.toString();
        // console.log('UnzippedContent: \n' + content);

        //need to check if the returned entry content
        // is encrypted or not before parse
        //try to do this without try/catch!
        try {
            return JSON.parse(content);
        } catch (err) {
            if (!aesKey) {
                throw new Error('Content did not resolve to JSON and no private key available to attempt decryption');
            }

            content = aes256.decrypt(aesKey, content);

            try {
                content = JSON.parse(content);
                return content;
            } catch (err) {
                throw new Error('Cyphertext did not resolve to JSON!');
            }
        }
    }

    async function encryptZipObject(object) {
        //check type for safety

        var contentString;

        //sign if encryption is enabled
        if (aesKey) {
            contentString = aes256.encrypt(aesKey, JSON.stringify(object));
            // console.log('encrypted content to', content_string, '\n');
        } else contentString = JSON.stringify(object);

        return await new Promise((resolve, reject) => {
            zlib.deflate(contentString, (err, compressedContent) => {
                if (err) reject(err);
                else resolve(compressedContent)
            })
        })
    }

    return this;
}

function getObjectChainID(dbId, objectId) {
    return new Chain(Entry.builder()
        .extId(Buffer.from('objectdb'.toString('hex')))
        .extId(Buffer.from('0.0.0'.toString('hex')))
        .extId(Buffer.from(('database:' + dbId + ':object:' + objectId).toString('hex')))
        .build()).id.toString('hex')
}

function getObjectIndexChainID(dbId) {
    return new Chain(Entry.builder()
        .extId(Buffer.from('objectdb'.toString('hex')))
        .extId(Buffer.from('0.0.0'.toString('hex')))
        .extId(Buffer.from('database:' + dbId + ':index').toString('hex'))
        .build()).id.toString('hex')
}

module.exports = {
    FactomObjectDB: FactomObjectDB
};
