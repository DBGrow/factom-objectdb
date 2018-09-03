const {FactomObject} = require('./FactomObject');
const ObjectRules = require('./rules/ObjectRules');

//setup crypto
const crypto = require('crypto');
const aes256 = require('aes256');

const zlib = require('zlib');

const {FactomCli} = require('factom');
const {Entry} = require('factom/src/entry');
const {Chain} = require('factom/src/chain');

let dbId = '';
let aesKey;

function FactomObjectDB(params) {
    if (!params) params = {};

    if (params.db_id) dbId = params.db_id; //db ID override

    const cli = new FactomCli(params.factom ? params.factom : {});

    const ec_address = params.ec_address; //if not included will result in read only access

    //Handle encryption settings
    if (params.aes_key) {
        aesKey = params.aes_key.toString();
    }

    //Set core methods
    this.commitObject = async function (id, object, rules) {
        if (!ec_address) throw new Error('You must include a public or private EC Address!(ec_address)');

        if (!id) throw new Error('Must provide an Object ID!');

        if (!object) object = {};

        //evaluate object rules
        if (rules && !ObjectRules.validate(object, rules)) throw new Error('Object rules were invalid');

        // console.log('Creating a new chain for object ' + id + ' in db ' + dbId);

        //by default the ExtID is assembled like this
        const extId = crypto.createHash('md5').update(dbId + id).digest("hex");

        //handle object rules
        rules = rules !== undefined ? rules : new ObjectRules.Builder().build();

        //chain meta object keys can be shortened to decrease average content size!
        const metaEntry = { //will be converted to JSON. Do not set options that can not be converted to JSON!
            type: 'meta', //required
            protocol_version: '0.0.1', //The version of the protocol this object chain was initialized with. Set by this library. Required
            timestamp: new Date().getTime(),
            object: object, //required, the initial version of the object
            rules: rules,
        };

        let compressedContent = await encryptZipObject(metaEntry);

        let entry = Entry.builder()
            .extId(extId)
            .content(compressedContent)
            .build();

        let chain = new Chain(entry);
        return await cli.addChain(chain, ec_address, {commitTimeout: 120, revealTimeout: 20});
    };

    //commit an update to the object, fire and forget. This may result in an invalid update!
    this.commitObjectUpdate = async function (objectId, update) {
        if (!params) params = {};
        if (!objectId) new Error('Must provide an Object ID!');
        if (!update) new Error('Must provide an Object update!');

        const chainId = getObjectChainID(dbId, objectId);

        const updateEntryContent = {
            type: 'update',
            timestamp: new Date().getTime(),
            update: update
        };

        let compressedContent = await encryptZipObject(updateEntryContent);

        const updateEntry = Entry.builder()
            .chainId(chainId)
            .extId('' + new Date().getTime()) //timestamp of the
            .content(compressedContent)
            .build();

        return await cli.addEntry(updateEntry, ec_address);
    };

    this.getObjectMetadata = async function (objectId) {

        //determine the ChainID from building an entry from MD5(db_id + object _id)
        const chainId = getObjectChainID(dbId, objectId);
        // console.log('Retrieving object chain with ID: ' + chainId);

        //get the chain and entries from the ChainID
        const metaEntry = await cli.getFirstEntry(chainId);
        return await parseObjectFromEntry(metaEntry);
    };

    this.getObject = async function (objectId, callback) {
        //determine the ChainID from building an entry from sha256 hash of the db_id + object _id
        const chainId = getObjectChainID(dbId, objectId);
        // console.log('Retrieving object with chain ID: ' + chainId);

        //get the chain and entries from the ChainID
        const entries = await cli.getAllEntriesOfChain(chainId);
        return await getObjectFromEntries(entries);
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
        .extId(crypto.createHash('md5').update(dbId + objectId).digest("hex"))
        .build()).id.toString('hex')
}

module.exports = {
    FactomObjectDB: FactomObjectDB
};
