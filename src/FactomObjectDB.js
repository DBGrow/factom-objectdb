var fs = require('fs');

var {FactomObject} = require('./FactomObject');

//setup crypto
var crypto = require('crypto');
var aes256 = require('aes256');

var zlib = require('zlib');

var {FactomCli} = require('factom');
var {Entry} = require('factom/src/entry');
var {Chain} = require('factom/src/chain');

var dbId = 'factomdbtest:0.0.1';
var privateKey;


function FactomObjectDB(params) {
    const self = this;

    if (!params) params = {};

    if (params.db_id) dbId = params.db_id; //db ID override

    const cli = new FactomCli(params.factomparams ? params.factomparams : {});

    var ec_address = params.ec_address; //if not included will result in read only access
    var es_address = params.es_address; //if not included will result in read only access

    var encryption = params.encryption ? params.encryption : false;

    //if encryption is disabled gtfo
    if (encryption) {
        //load private keys if available, otherwise demo key
        var privateKeyPath = params.private_key_path ? private_key_path : './crypto/demo_private.pem';
        var privateKeyBuffer = fs.readFileSync(privateKeyPath);
        console.log('Loaded AES256 encryption key!');
        privateKey = privateKeyBuffer.toString();
    }

    var zip = params.zip;

    //Set core methods
    self.commitObject = function (params, callback) {
        if (!ec_address) {
            var err = new Error('You must include a public or private EC Address!(ec_address)');
            if (callback) {
                callback(err);
                return;
            } else throw err;
        }

        if (!params) params = {};

        if (!params._id) throw new Error('Must provide an object ID!');

        if (!params.object) params.object = {};

        var object = params.object;

        console.log('Creating a new chain for object ' + object._id + ' in db ' + dbId);

        //by default the ExtID is assembled like this
        var extId = crypto.createHash('md5').update(dbId + object._id).digest("hex");

        //handle object rules
        const rules = params.rules ? params.rules : {};

        //chain meta object keys can be shortened to decrease average content size!
        var metaEntry = { //will be converted to JSON. Do not set options that can not be converted to JSON!
            type: 'meta', //required
            protocol_version: '0.0.1', //The version of the protocol this object chain was initialized with. Set by this library. Required
            timestamp: new Date().getTime(),
            object: object, //required, the initial version of the object
            rules: rules,
        };

        encryptZipObject(metaEntry, function (err, compressedContent) {
            if (err) throw err;
            // console.log('Compressed content size: ' + compressed_content.length + 'B');

            let entry = Entry.builder()
                .extId(extId)
                .content(compressedContent)
                .build();

            let chain = new Chain(entry);
            console.log('\nCreating chain with ID: ' + chain.id.toString('hex'));

            console.time('Commit AddChain');
            cli.addChain(chain, ec_address, {commitTimeout: 120, revealTimeout: 20})
                .then(function (chain) {
                    console.timeEnd('Commit AddChain');
                    if (callback) callback(undefined, chain);
                    else console.log(chain);
                }).catch(function (err) {
                if (callback) callback(err);
                else throw err;
            });
        });
    };

    self.commitObjectUpdate = function (objectId, update, callback) {
        if (!params) params = {};

        var chainId = getObjectChainID(dbId, objectId);

        var updateEntryContent = {
            type: 'update',
            timestamp: new Date().getTime(),
            update: update
        };

        encryptZipObject(updateEntryContent, function (err, compressedContent) {
            if (err) {
                if (callback) callback(err);
                else throw err;
                return;
            }

            var updateEntry = Entry.builder()
                .chainId(chainId)
                .extId('' + new Date().getTime()) //timestamp of the
                .content(compressedContent)
                .build();

            console.log('Committing entry to chain ' + chainId);
            console.time('Commit AddUpdate');
            cli.addEntry(updateEntry, ec_address)
                .then(function (entry) {
                    console.timeEnd('Commit AddUpdate');
                    console.log('Committed entry!!!');

                    if (callback) {
                        callback(undefined, entry);
                    } else console.log(entry);
                    return entry;
                }).catch(function (err) {
                console.error(err);
                throw new Error(err)
            });
        });
    };

    self.getChainMetaObject = function (objectId, callback) {

        //determine the ChainID from building an entry from MD5(db_id + object _id)
        var chainId = getObjectChainID(dbId, objectId);
        console.log('Retrieving object chain with ID: ' + chainId);

        //get the chain and entries from the ChainID

        console.time('Get Meta Entry');
        cli.getFirstEntry(chainId)
            .then(function (metaEntry) {
                console.timeEnd('Get Meta Entry');

                getObjectFromEntry(metaEntry, function (err, object) {
                    if (err) {
                        if (callback) callback(err);
                        else throw err;
                        return
                    }

                    if (callback) callback(undefined, object);
                    return object;
                })
            }).catch(function (err) {
            if (callback) callback(err);
            else console.error(err);
        });
    };

    self.getObject = function (objectId, callback) {
        //determine the ChainID from building an entry from sha256 hash of the db_id + object _id
        var chainId = getObjectChainID(dbId, objectId);
        console.log('Retrieving object with chain ID: ' + chainId);

        //get the chain and entries from the ChainID
        cli.getAllEntriesOfChain(chainId)
            .then(function (entries) {
                getObjectFromEntries(entries, function (err, object) {
                    console.log(object);
                    if (err) {
                        if (callback) callback(err);
                        else throw err;
                        return;
                    }
                    if (callback) callback(undefined, object);
                    else return object;
                });
            }).catch(function (err) {
            if (callback) callback(err);
            else console.error(err);
        })
    };

    function getObjectFromEntries(entries, callback) {
        //its required that entries[0] is the metadata entry
        // console.log(entries[0]);
        //validate

        var object;
        var metaEntry;

        //race condition waiting to happen!
        for (var index = 0; index < entries.length; index++) {
            const entry = entries[index];
            //needs to complete sequentially, guaranteed
            getObjectFromEntry(entry, function (err, decryptedContentObject) {
                //parse error based on meta entry if exists
                //
                if (err) {
                    console.error(err);
                    return;
                }

                // console.log(JSON.stringify(decrypted_content_object));

                //parse what type of entry this is
                switch (decryptedContentObject.type) {
                    case 'meta': {
                        console.log('Got meta entry!');
                        object = new FactomObject(decryptedContentObject); //begin with the init object
                        metaEntry = decryptedContentObject;
                        break;
                    }
                    case 'update': {
                        object.applyUpdate(decryptedContentObject, function (err) {
                            if (err) console.error(err);
                        });
                        break;
                    }

                    default: {
                        console.error('Skipping unknown entry with type: ' + decryptedContentObject.type);
                        break;
                    }
                }

                if (entries.indexOf(entry) == entries.length - 1) {
                    if (callback) callback(undefined, object.get());
                    else return object.get();
                }
            })
        }
    }

    function getObjectFromEntry(entry, callback) {
        //first unzip the content
        zlib.unzip(entry.content, function (err, content) {
            // console.log(first_entry);
            if (err) {
                if (callback) {
                    callback(err);
                    return;
                }
                else throw err;
            }

            //convert from buffer
            content = content.toString();
            // console.log('UnzippedContent: \n' + content);

            //need to check if the returned entry content
            // is encrypted or not before parse
            //try to do this without try/catch!
            try {
                var contentObject = JSON.parse(content);
                // console.log(content_object);
                if (callback) callback(undefined, contentObject);
                return contentObject;
            } catch (err) {
                if (!privateKey) {
                    err = new Error('Content did not resolve to JSON and no private key available to attempt decryption');
                    if (callback) callback(err);
                    else throw err;
                    return;
                }

                // console.log('Encountered an error parsing JSON. Attempting to decrypt...');

                content = aes256.decrypt(privateKey, content);
                // console.log('decrypted content to', content, '\n');

                try {
                    content = JSON.parse(content);
                    if (callback) callback(undefined, content);
                    else console.log('GOT OBJECT!: \n' + JSON.stringify(content, undefined, 2));
                } catch (err) {
                    if (callback) {
                        callback(new Error('Decryption with Private Key did not resolve to JSON!\nThis entry may be unauthentic.\nAre you using the right Private Key for this chain?'));
                    }
                    else throw new Error('Cyphertext not resolve to JSON!');
                }
            }
        });
    }



    function encryptZipObject(object, callback) {
        //check type for safety

        var contentString;

        //sign if encryption is enabled
        if (privateKey) {
            contentString = aes256.encrypt(privateKey, JSON.stringify(object));
            // console.log('encrypted content to', content_string, '\n');
        } else contentString = JSON.stringify(object);

        zlib.deflate(contentString, function (error, compressedContent) {
            if (error) throw error;
            // console.log('Compressed content size: ' + compressed_content.length + 'B');
            if (callback) callback(undefined, compressedContent);
            return compressedContent
        });
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
