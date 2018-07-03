var fs = require('fs');

var {FactomObject} = require('./FactomObject');


var ObjectRules = require('./rules/ObjectRules');

//setup crypto
var crypto = require('crypto');
var aes256 = require('aes256');

var zlib = require('zlib');

var {FactomCli} = require('factom');
var {Entry} = require('factom/src/entry');
var {Chain} = require('factom/src/chain');

var dbId = 'factomdbtest:0.0.1';
var aesKey;


function FactomObjectDB(params) {
    const self = this;

    if (!params) params = {};

    if (params.db_id) dbId = params.db_id; //db ID override

    const cli = new FactomCli(params.factomparams ? params.factomparams : {});

    var ec_address = params.ec_address; //if not included will result in read only access
    var es_address = params.es_address; //if not included will result in read only access

    //Handle encryption settings
    if (params.private_key) {
        aesKey = params.private_key.toString();
        console.log('Loaded AES256 encryption key!');
    }

    var zip = params.zip;

    //Set core methods
    self.commitObject = function (id, object, rules, callback) {
        if (!ec_address && !es_address) {
            var err = new Error('You must include a public or private EC Address!(ec_address)');
            if (callback) {
                callback(err);
                return;
            } else throw err;
        }

        if (!id) {
            var err = new Error('Must provide an Object ID!');
            if (callback) {
                callback(err);
                return;
            } else throw err;
        }

        if (!object) object = {};

        //evaluate object rules
        if (rules && !ObjectRules.validate(object, rules)) {
            var err = new Error('Object rules were invalid');
            if (callback) {
                callback(err);
                return;
            } else throw err;
        }

        console.log('Creating a new chain for object ' + id + ' in db ' + dbId);

        //by default the ExtID is assembled like this
        var extId = crypto.createHash('md5').update(dbId + id).digest("hex");

        //handle object rules
        rules = rules ? rules : {};

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
            cli.addChain(chain, es_address, {commitTimeout: 120, revealTimeout: 20})
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

    //commit an update to the object, fire and forget. This may result in an invalid update!
    self.commitObjectUpdate = function (objectId, update, callback) {
        if (!params) params = {};

        if (!objectId) {
            if (callback) callback(new Error('Must provide an Object ID!'));
            else console.error(new Error('Must provide an Object ID!'));
            return;
        }

        if (!update) {
            if (callback) callback(new Error('Must provide an Object update!'));
            else console.error(new Error('Must provide an Object update!'));
            return;
        }

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

            console.log('Committing entry update to chain ' + chainId);
            console.time('Commit AddUpdate');
            cli.addEntry(updateEntry, es_address)
                .then(function (entry) {
                    console.timeEnd('Commit AddUpdate');
                    console.log('Committed entry update!!!');

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

    self.getObjectMetadata = function (objectId, callback) {

        //determine the ChainID from building an entry from MD5(db_id + object _id)
        var chainId = getObjectChainID(dbId, objectId);
        console.log('Retrieving object chain with ID: ' + chainId);

        //get the chain and entries from the ChainID

        console.time('Get Meta Entry');
        cli.getFirstEntry(chainId)
            .then(function (metaEntry) {
                console.timeEnd('Get Meta Entry');

                parseObjectFromEntry(metaEntry, function (err, object) {
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
                    // console.log(object);
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

        console.log('Parsing ' + entries.length + ' entries');

        //race condition waiting to happen!
        for (var index = 0; index < entries.length; index++) {
            const entry = entries[index];
            //needs to complete sequentially, guaranteed
            parseObjectFromEntry(entry, function (err, decryptedContentObject) {
                //parse error based on meta entry if exists
                //
                if (err) {
                    console.error(err);
                    return;
                }

                console.log(JSON.stringify(decryptedContentObject));

                //parse what type of entry this is
                switch (decryptedContentObject.type) {
                    case 'meta': {
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
                }
            })
        }
    }

    function parseObjectFromEntry(entry, callback) {
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
                if (!aesKey) {
                    err = new Error('Content did not resolve to JSON and no private key available to attempt decryption');
                    if (callback) callback(err);
                    else throw err;
                    return;
                }

                // console.log('Encountered an error parsing JSON. Attempting to decrypt...');

                content = aes256.decrypt(aesKey, content);
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

    this.parseObjectFromEntry = parseObjectFromEntry;

    function encryptZipObject(object, callback) {
        //check type for safety

        var contentString;

        //sign if encryption is enabled
        if (aesKey) {
            contentString = aes256.encrypt(aesKey, JSON.stringify(object));
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
