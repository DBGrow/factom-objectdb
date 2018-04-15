var fs = require('fs');
var path = require('path');

var ObjectId = require('objectid');
var {Object} = require('./Object');

//setup crypto
var crypto = require('crypto');
var aes256 = require('aes256');


var zlib = require('zlib');

var {FactomCli} = require('factom');
var {Entry} = require('factom/src/entry');
var {Chain} = require('factom/src/chain');

function FactomObjectDB(params, callback) {
    var self = this;

    if (!params) params = {};
    var factomd_host = params.factomd_host ? params.factomd_host : '127.0.0.1';
    var factomd_port = params.factomd_port ? params.factomd_port : '8088';

    var walletd_host = params.walletd_host ? params.walletd_host : '127.0.0.1';
    var walletd_port = params.walletd_port ? params.walletd_port : '8089';
    self.cli = new FactomCli({
        factomd: {
            host: factomd_host,
            port: factomd_port
        },
        walletd: {
            host: walletd_host,
            port: walletd_port
        }
    });

    var ec_address = params.ec_address; //if not included will result in read only access
    var es_address = params.es_address; //if not included will result in read only access

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

        //check prereqs if available
        // Must have at least object with ID field
        if (!params.object) params.object = {_id: new ObjectId()};

        var object = params.object;
        var db_id = params.db_id ? params.db_id : 'factomdbtest:0.0.0';

        console.log('Creating a new chain for object ' + object._id + ' in db ' + db_id);

        var chain_ext_id = crypto.createHash('md5').update(db_id + object._id).digest("hex");

        //chain meta object keys can be shortened to decrease average content size!
        var chain_meta = { //will be converted to JSON. Do not set options that can not be converted to JSON!
            type: 'meta', //required
            _id: params.object._id, //Unique ID of the object this chain tracks. Also acts as timestamp if ObjectID. Regex for this? Required
            protocol_version: '0.0.0a', //The version of the protocol this object chain was initialized with. Set by this library. Required
            hashed: false, //Whether the content of the entries in this chain will be hashes of objects/changes or not.
            init_object: object //required
        };

        // console.log(JSON.stringify(chain_meta, undefined, 2));

        encryptZipObject(chain_meta, function (err, compressed_content) {
            if (err) throw err;
            // console.log('Compressed content size: ' + compressed_content.length + 'B');

            var meta_entry = Entry.builder()
                .extId(chain_ext_id)
                .content(compressed_content)
                .build();

            const chain = new Chain(meta_entry);
            console.log('\nCreating chain with ID: ' + chain.id.toString('hex'));

            console.time('Commit AddChain');
            self.cli.addChain(chain, ec_address, {commitTimeout: 120, revealTimeout: 20})
                .then(function (chain) {
                    console.timeEnd('Commit AddChain');
                    if (callback) callback(undefined, chain);
                    else console.log(chain);
                    return chain;
                }).catch(function (err) {
                if (callback) callback(err);
                else throw err;
            });
        })

        /*var chain_meta_string;

        //convert the metadata to a JSON string, account for encryption if enabled
        if (self.private_key) {
            chain_meta_string = aes256.encrypt(self.private_key, JSON.stringify(chain_meta));
            console.log('encrypted content to', chain_meta_string, '\n');
        } else chain_meta_string = JSON.stringify(chain_meta);

        // console.log('\n\nUncompressed content size: ' + JSON.stringify(chain_meta_strings).length + 'B');

        console.time('Commit Compress');


        zlib.deflate(chain_meta_string, function (error, compressed_content) {
            if (error) throw error;
            console.timeEnd('Commit Compress');
            // console.log('Compressed content size: ' + compressed_content.length + 'B');

            var meta_entry = Entry.builder()
                .extId(chain_ext_id)
                .content(compressed_content)
                .build();

            const chain = new Chain(meta_entry);
            console.log('\nCreating chain with ID: ' + chain.id.toString('hex'));

            console.time('Commit AddChain');
            self.cli.addChain(chain, ec_address, {commitTimeout: 120, revealTimeout: 20})
                .then(function (chain) {
                    console.timeEnd('Commit AddChain');
                    if (callback) callback(undefined, chain);
                    else console.log(chain);
                    return chain;
                }).catch(function (err) {
                if (callback) callback(err);
                else throw err;
            });
        });*/

    };

    self.commitObjectUpdate = function (db_id, object_id, update, callback) {
        if (!params) params = {};

        var chain_id = getObjectChainID(db_id, object_id);

        var update_scaffold = {
            type: 'update',
            update: update
        };

        encryptZipObject(update_scaffold, function (err, compressed_content) {
            if (err) {
                if (callback) callback(err);
                else throw err;
                return;
            }

            var update_entry = Entry.builder()
                .chainId(chain_id)
                .extId('' + new Date().getTime()) //timestamp of the
                .content(compressed_content)
                .build();

            console.log('Committing entry to chain ' + chain_id);
            console.time('Commit AddUpdate');
            self.cli.addEntry(update_entry, ec_address)
                .then(function (entry) {
                    console.timeEnd('Commit AddUpdate');
                    console.log('Committed entry!!!');

                    if (callback) {
                        callback(undefined, entry);
                    } else console.log(entry)
                    return entry;
                }).catch(function (err) {
                console.error(err)
                throw new Error(err)
            });

            /*self.cli.addEntry(update_entry, 'EC3SQT9KfxZWkN3qmnH4imWtaXXK6md7KDqiVnB9zkokU4xo64xd')
                .then(console.log);*/
        });
    };

    //Commit a full copy of the object to act as an index
    //Helpful for increasing the performance of reconstructing long object histories
    //computed as MD5(chain ID +':i:'+ index count)
    //Index is an arbitrary number based on the number of times an index has been committed

    //to insert an index we need to get the object history up until this point in time
    //we are going to insert 2 entries:
    //1. the actual index object. We record it's entry hash once it's commited to the object's chain so we can get it real fast!
    //2. an index record in the object's index chain. Index ChainID calculated as empty chain with an empty Entry with extID(MD5(Object Chain ID+':index'))
    //the additional entries in the index chain will contain the entry hashes of the index 'snapshot' (from 1 above)
    //what results is a limited number of entries to search over to get full snapshots of the object throughout time

    self.commitObjectIndex = function (db_id, object_id, callback) {
        if (!params) params = {};

        var object_chain_id = getObjectChainID(db_id, object_id);

        //get the most recent version of the object
        self.getObject(db_id, object_id, function (err, object) {

            var index_scaffold = {
                type: 'index',
                index_object: object
            };

            encryptZipObject(index_scaffold, function (err, compressed_content) {
                if (err) {
                    if (callback) callback(err);
                    else throw err;
                    return;
                }

                var update_entry = Entry.builder()
                    .chainId(object_chain_id)
                    .content(compressed_content)
                    .content(compressed_content)
                    .build();

                console.log('Committing object index to chain ' + object_chain_id);
                console.time('Commit AddIndex');
                self.cli.addEntry(update_entry, ec_address)
                    .then(function (entry) {
                        console.timeEnd('Commit AddIndex');
                        console.log('Committed index entry!!!');
                        // console.log(entry)
                        var index_hash = entry.entryHash.toString('hex');

                        //This is simply a reference to the next link in the chain!
                        var index_key_scaffold = {
                            type: 'index_key',
                            index_entry_hash: index_hash
                        };

                        //Otherwise
                        //Initialize the index chain!
                        //handle encryption for inserting the new chain
                        encryptZipObject(index_key_scaffold, function (err, compressed_content) {
                            if (err) {
                                if (callback) callback(err);
                                else throw err;
                                return;
                            }

                            var index_chain_id = getObjectIndexChainID(db_id, object_id);
                            var index_key_entry = Entry.builder()
                                .extId(index_chain_id)
                                .content(compressed_content)
                                .build();

                            //check if the Object's index chain exists. If not then create it with this entry!

                            self.cli.chainExists(index_chain_id).then(function (exists) {
                                //if the chain exists just write an entry!
                                if (exists) {
                                    console.log('Index Chain Exists!');
                                    self.cli.addEntry(index_key_entry, ec_address)
                                        .then(function (entry) {
                                            console.log('Committed index key entry!!!');

                                            if (callback) {
                                                callback(undefined, entry);
                                            } else console.log(entry)
                                            return entry;
                                        }).catch(function (err) {

                                        if (callback) callback(err);
                                        else throw err;

                                    });
                                    return;
                                }

                                //otherwise create a new chain from the index key entry and then write
                                console.log('Creating an index chain for object ' + object_id + ' in DB ' + db_id);
                                var index_chain = new Chain(index_key_entry);

                                console.time('Commit AddIndexChain');
                                self.cli.addChain(index_chain, ec_address)
                                    .then(function (chain) {
                                        console.timeEnd('Commit AddIndexChain');
                                        if (callback) callback(undefined, chain);
                                        else console.log(chain);
                                        return chain;
                                    }).catch(function (err) {
                                    if (callback) callback(err);
                                    else throw err;
                                });
                            });
                        });
                    }).catch(function (err) {
                    if (callback) callback(err);
                    else throw err;
                });
            });
        });

    };

    self.getChainMetaObject = function (db_id, object_id, callback) {

        //determine the ChainID from building an entry from MD5(db_id + object _id)
        var retrieval_chain_id = getObjectChainID(db_id, object_id);
        console.log('Retrieving object chain with ID: ' + retrieval_chain_id);

        //get the chain and entries from the ChainID

        console.time('Get Meta Entry');
        self.cli.getFirstEntry(retrieval_chain_id)
            .then(function (first_entry) {
                console.timeEnd('Get Meta Entry');

                getObjectFromEntry(first_entry, function (err, object) {
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
        })

        //unzip content for the chain

        //decrypt if encrypted

        //print content!
    };

    self.getObject = function (db_id, object_id, callback) {
        //determine the ChainID from building an entry from sha256 hash of the db_id + object _id
        var retrieval_chain_id = getObjectChainID(db_id, object_id);
        console.log('Retrieving object with chain ID: ' + retrieval_chain_id);

        //get the chain and entries from the ChainID
        self.cli.getAllEntriesOfChain(retrieval_chain_id)
            .then(function (entries) {
                getObjectFromEntries(entries, function (err, object) {
                    if (err) {
                        if (callback) callback(undefined, object);
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
        var meta_entry;

        //race condition waiting to happen!
        for (var index = 0; index < entries.length; index++) {
            const entry = entries[index];
            //needs to complete sequentially, guaranteed
            getObjectFromEntry(entry, function (err, decrypted_content_object) {
                //parse error based on meta entry if exists
                //
                if (err) {
                    console.error(err);
                    return;
                }

                // console.log(JSON.stringify(decrypted_content_object));

                //parse what type of entry this is
                switch (decrypted_content_object.type) {
                    case 'meta': {
                        console.log('Got meta entry!');
                        object = new Object(decrypted_content_object.init_object); //begin with the init object contained in the root
                        meta_entry = decrypted_content_object;
                        break;
                    }
                    case 'update': {
                        object.applyUpdate(decrypted_content_object.update, function (err) {
                            if (err) console.error(err);
                        });
                        break;
                    }
                    case 'index': {
                        console.log('Got index entry!');
                        break
                    }

                    default: {
                        console.error('Skipping unknown entry with type: ' + decrypted_content_object.type);
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
                var content_object = JSON.parse(content);
                console.log(content_object);
                if (callback) callback(undefined, content_object);
                return content_object;
            } catch (err) {
                if (!self.private_key) {
                    err = new Error('Content did not resolve to JSON and no private key available to attempt decryption');
                    if (callback) callback(err);
                    else throw err;
                    return;
                }

                // console.log('Encountered an error parsing JSON. Attempting to decrypt...');

                content = aes256.decrypt(self.private_key, content);
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
    };

    //last is loading any private keys as it's async
    var encryption = params.encrption ? params.encrption : true;

    //if encryption is disabled gtfo
    if (!encryption) {
        if (callback) callback(undefined, this);
        return this;
    }

    //otherwise get default encryption key path or user defined path
    var private_key_path = params.private_key_path ? private_key_path : './crypto/demo_private.pem';
    //if encryption is ignored and path exists enable encryption

    fs.readFile(private_key_path, function (err, private_key_buffer) {
        if (err) {
            if (callback) {
                callback(err);
                return;
            } else throw err;
        }
        console.log('Loaded AES256 encryption key!');
        self.private_key = private_key_buffer.toString();

        if (callback) callback(undefined, self);
        return this;
    });


    function encryptZipObject(object, callback) {
        //check type for safety

        var content_string;

        //sign if encryption is enabled
        if (self.private_key) {
            content_string = aes256.encrypt(self.private_key, JSON.stringify(object));
            // console.log('encrypted content to', content_string, '\n');
        } else content_string = JSON.stringify(object);

        zlib.deflate(content_string, function (error, compressed_content) {
            if (error) throw error;
            // console.log('Compressed content size: ' + compressed_content.length + 'B');
            if (callback) callback(undefined, compressed_content);
            return compressed_content
        });
    }
}

function getObjectChainID(db_id, object_id) {
    return new Chain(Entry.builder()
        .extId(crypto.createHash('md5').update(db_id + object_id).digest("hex"))
        .build()).id.toString('hex')
}

function getObjectIndexChainID(db_id, object_id) {
    return new Chain(Entry.builder()
        .extId(crypto.createHash('md5').update(getObjectChainID(db_id, object_id) + ':index').digest("hex"))
        .build()).id.toString('hex')
}

module.exports = {
    FactomObjectDB: FactomObjectDB
};
