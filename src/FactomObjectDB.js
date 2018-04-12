/*
    * * * Chain Info:
    * Content is written to entries in the following order:
    * Object --> JSON String --> PK Signing* --> Gzip compression --> content of Entry
    * (* = conditional)
    *
    * * *The first entry of the object's chain:
    *
    * Contains metadata about the chain. If the chain is private(signed by PK)
    * then the metadata and all the content of the chain must be signed by the
    * * * same PK to be interpreted as authentic.
    *
    * model:
    * ExtIDS[0] = db_id + object_id
    * content = JSON metadata about the chain
    *
    * * * The second entry of the object's chain:
    *
    * Contains the initial version of the complete object, either hashed or whole.
    * Think of this like the first commit of a Git repo. it's a blank slate!
    * This object may be left as an empty object: {}
    *
    *
    * * * Additional entries in the object's chain:
    * Additional entries in the object's chain are like commits in Git!
    * They track versions of the object through time
    *
    * Each additional entry of the chain will contain either:
    *
    * -If hashed = true, The most recent hashed version of the complete object
    * -If hashed = false, A representation of the update applied to the object to bring it to it's current state.
    *
    * -(experimental) A JSON object specifying an event, such as deletion, branching, etc
    * */


var fs = require('fs');

var ObjectId = require('objectid');
var {Object} = require('./Object');

//setup crypto
var crypto = require('crypto');
var aes256 = require('aes256');


var zlib = require('zlib');

var {FactomCli} = require('factom');
var {Entry} = require('factom/src/entry');
var {Chain} = require('factom/src/chain');


/*
* Params:
* EC Private/Public address: ec_address
*
* Factomd API Host: factomd_host (string)
* Factomd API port: factomd_port (string)
*
* Walletd API Host: walletd_host (string)
* Walletd API port: walletd_port (string)
*
* Use Encryption: encrypt (boolean). If set to false will never sign entry contents with private key
* Private Encryption Key Path: private_key (passphrase or base64 encryption key. default is ./crypto/demo_private.pem
*
*
* */
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

    //Set core methods
    self.initObjectChain = function (params, callback) {
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
            _id: params.object._id, //Unique ID of the object this chain tracks. Also acts as timestamp if ObjectID. Regex for this?
            protocol_version: '0.0.0a', //The version of the protocol this object chain was initialized with. Set by this library
            hashed: false, //Whether the content of the entries in this chain will be hashes of objects/changes or not.
            //hashed = true will provide proof of existence and authenticity
            //hashed = false will provide everything in hashed = true and allow point in time reconstructions/backups of complete objects
            parent: undefined, //if this chain is a continuation or branch of another, specify that chain's ID

            //user defined stuff
            message: "'It's Alive!' --- This is beginning of an object's chain!",
            meta: undefined, //JSON Metadata from the user
            init_object: object
        };

        console.log(JSON.stringify(chain_meta, undefined, 2));

        var chain_meta_string;

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
            console.log('Compressed content size: ' + compressed_content.length + 'B');

            var meta_entry = Entry.builder()
                .extId(chain_ext_id)
                .content(compressed_content)
                .build();

            const chain = new Chain(meta_entry);
            console.log('\nCreating chain with ID: ' + chain.chainId.toString('hex'));

            console.time('Commit AddChain');
            self.cli.addChain(chain, ec_address, {commitTimeout: 120, revealTimeout: 20})
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

    self.commitObjectUpdate = function (params, callback) {
        if (!params) params = {};

        var chain_id = params.chain_id; //required
        var object_update = params.object_update; //required

        var previous_entry_hash = params.previous_entry_hash;

        //if no previous entry hash is supplied we'll have to grab the most recent entry in the chain!
        if (!previous_entry_hash) {
            self.cli.getAllEntriesOfChain(chain_id)
                .then(function (entries) {
                    console.log('Chain contained ' + entries.length + ' entries');

                    //get the hash of last authentic entry
                    var most_recent_entry = entries[entries.length - 1];
                    console.log('EH: ' + most_recent_entry.hash)

                }).catch(function (err) {
                throw new Error(err)
            });
            return;
        }

        //commit the initial version of the object
        console.log('First commit extid: ' + chain.entryHash.toString());
        var init_object_entry = Entry.builder()
            .chainId(chain_id)
            .extId(previous_entry_hash) //extid of the object entry is the entryhash of the meta entry
            .content(JSON.stringify(object))
            .build();

        // console.log(init_object_entry.hash)

        self.cli.addEntry(init_object_entry, ec_address)
            .then(function (entry) {
                console.log('Committed entry!!!');
                // console.log(entry)
            }).catch(function (err) {
            throw new Error(err)
        });
    };

    self.getChainMetaContent = function (db_id, object_id, callback) {

        //determine the ChainID from building an entry from sha256 hash of the db_id + object _id
        var retrieval_chain_id = getObjectChainID(db_id, object_id);
        console.log('Retrieving object chain with ID: ' + retrieval_chain_id);

        //get the chain and entries from the ChainID

        console.time('Get Meta Entry');
        self.cli.getFirstEntry(retrieval_chain_id)
            .then(function (first_entry) {
                console.timeEnd('Get Meta Entry');

                //construct entry from buffers
                var zipped_content = first_entry.content;
                // console.log('ZippedContent: ' + zipped_content);
                zlib.unzip(zipped_content, function (err, content) {
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
                        content = JSON.parse(content);
                        console.log(content);
                        if (callback) callback(undefined, content);

                    } catch (err) {
                        if (!self.private_key) {
                            err = new Error('Content did not resolve to JSON and no private key available to attempt decryption');
                            if (callback) callback(err);
                            else throw err;
                            return;
                        }

                        console.log('Encountered an error parsing JSON. Attempting to decrypt...');

                        content = aes256.decrypt(self.private_key, content);
                        console.log('decrypted content to', content, '\n');

                        try {
                            content = JSON.parse(content);
                            if (callback) callback(undefined, content);
                            else console.log('GOT OBJECT!: \n' + JSON.stringify(content, undefined, 2));

                        } catch (err) {
                            if (callback) {
                                callback(new Error('Cyphertext not resolve to JSON!'));

                            }
                            else throw new Error('Cyphertext not resolve to JSON!');
                        }
                    }
                });
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

        for (var index = 0; index < entries.length; index++) {
            var entry = entries[index];
            //needs to complete sequentially, guaranteed
            getObjectFromEntry(entry, function (err, decrypted_content_object) {
                //parse error based on meta entry if exists
                //
                if (err) {
                    console.error(err);
                    return;
                }

                console.log(JSON.stringify(decrypted_content_object));

                if (!object) { //initialize object version tracking on first entry(the meta entry
                    console.log('Got meta entry!');
                    if (!decrypted_content_object.init_object) decrypted_content_object.init_object = {};
                    // console.log('INIT OBJ:\n' + JSON.stringify(decrypted_content_object.init_object));
                    object = new Object(decrypted_content_object.init_object); //begin with the init object contained in the root
                    meta_entry = decrypted_content_object;

                    console.log('idex: ' + entries.indexOf(entry));
                    if (entries.indexOf(entry) == entries.length - 1) { //done
                        if (callback) callback(undefined, object.get());
                        else return object.get();
                    }
                    return;
                }

                //apply the update!
                object.applyUpdate(decrypted_content_object, function (err, new_version) {
                    if (err) throw err;

                    if (entries.indexOf(entry) == entries.length - 1) { //done
                        if (callback) callback(undefined, object.get());
                        else return object.get();
                    }
                });
            })
        }
        ;
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
            } catch (err) {
                if (!self.private_key) {
                    err = new Error('Content did not resolve to JSON and no private key available to attempt decryption');
                    if (callback) callback(err);
                    else throw err;
                    return;
                }

                console.log('Encountered an error parsing JSON. Attempting to decrypt...');

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
    }

    //last is loading any private keys as it's async
    var encryption = params.encrption ? params.encrption : true;

    //if encryption is ignored gtfo
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
}

function getObjectChainID(db_id, object_id) {
    return new Chain(Entry.builder()
        .extId(crypto.createHash('md5').update(db_id + object_id).digest("hex"))
        .build()).chainId.toString('hex')
}


module.exports = {
    FactomObjectDB: FactomObjectDB
};