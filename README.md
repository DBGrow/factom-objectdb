# factom-objectdb
Object database implementation for the Factom protocol written in NodeJS

## State of development

This library is in active development, currently at proof of concept stage. Commits in the `development` branch may contain breaking changes

~~Branch `development` contains the most recent builds versions!~~

### Current Capabilities

The following capabilities have been tested and are working with the [Factom Testnet](/):

- Can take an object with a unique ID and initiate it's chain
- AES256 encryption and decryption of object chains and their metadata is supported.

## Prerequisites

### Factom

You must have a funded Factoid or EntryCredit address to begin storing objects. Reading stored objects is free! The address must remain funded to continue creating entries! You may use testnet addresses and servers.

## Mechanism

When an object is inserted, the library will create a new `Chain` with the first `Entry` being the hash of the complete object. The `Chain`'s external ID's will contain the ID of the object, as well as it's namespace within the database.

Updates to the object will result in a new `Entry` being placed on the object's `Chain`, containing the hash of the new version the object or the update to the object itself.

## Examples

### Initialization

```javascript
var {FactomObjectDB} = require('./src/FactomObjectDB');

//get db object async
new FactomObjectDB({
    factomd_host: FACTOMD_IP,
    walletd_host: FACTOMD_IP,
    ec_address: FACTOM_EC,
}, function (err, db) {
    if (err) throw err;
    
    //paste an example from below here!
})

//or get db object sync
var db = new FactomObjectDB({
    factomd_host: FACTOMD_IP,
    walletd_host: FACTOMD_IP,
    ec_address: FACTOM_EC,
});
```



### Store an Object

```javascript
var ObjectId = require('objectid');
var object = { //All fields must be able to be serialized by JSON.stringify!
	_id: new ObjectId(), //required. Just has to be a unique ID for your object
	//you may add any other field you'd like here!
};

db.initObjectChain({
    db_id: 'factomdbtest:0.0.0',
    object: object
},
function (err, chain) {
    if (err) throw err;
    console.log(JSON.stringify(chain, undefined, 2));
});
```

Output:

```javascript
{
  "txId": "886551468df23eea5563b9fcde09e92555081bd09e0a1ae1d61095aab03ad4b7",
  "repeatedCommit": false,
  "chainId": "c7364f0765e7305150ce69134e366520a6f93265eb5475f76d48f5cd9e921440",
  "entryHash": "f0c108f54ccef72d4b207dd764db11ed2e1d7bf757398a09844e944d9b0e9d24"
}
```



### Get an Object Chain's Metadata

```javascript
var {FactomObjectDB} = require('./src/FactomObjectDB');

//Get DB Wrapper Async
new FactomObjectDB({
    factomd_host: FACTOMD_IP, //replace with your factomd's
    walletd_host: FACTOMD_IP,
    factom_ec: FACTOM_EC, //your private Entry Credit address
}, function (err, db) {
    if (err) throw err;
    
    //get the JSON metadata for object in database 5acd81b0ace6a1781d000001 from database 'factomdbtest:0.0.0' (the first entry in the object's chain)
    
    db.getChainMetaContent("factomdbtest:0.0.0", "5acd81b0ace6a1781d000001", function (err, content) {
        if (err) {
            console.error(err);
            return;
        }
        console.log('Retrieved Object!:\n' + JSON.stringify(content, undefined, 2));
    });
});
```

Output:

```javascript
{
  "_id": "5acd81b0ace6a1781d000001", //the ID of the object
  "protocol_version": "0.0.0a", //the factom-objectdb protocol version
  "hashed": false, 
  "message": "@drkatz --- 'It's Alive!' --- This is beginning of an object's chain!697ede"
  "init_object": {
  "_id": "5acd81b0ace6a1781d000001", //the ID of the object
  //your other fields
  }
}

// All possible fields:
{
  _id: params.object._id, //Unique ID of the object this chain tracks. Also acts as timestamp if ObjectID. Regex for this?
  protocol_version: '0.0.0a', //The version of the protocol this object chain was initialized with. Set by this library
  hashed: false, //Whether the content of the entries in this chain will be hashes of objects/changes or not.
            //hashed = true will provide proof of existence and authenticity
            //hashed = false will provide everything in hashed = true and allow point in time reconstructions/backups of complete objects
 parent: undefined, //if this chain is a continuation or branch of another, specify that chain's ID

 //user defined stuff
 message: undefined,
 user_meta: undefined //JSON Metadata from the user
}

```



## Object Chain Structure

Each object is represented as a chain of Entries.

### Entry Construction

Object --> JSON String --> AES256 PK Signing* --> DEFLATE compression (RFC 1951) --> content of Entry

 (* = conditional)

### First Chain Entry

 Contains metadata about the chain including the first version of the object. If the chain is private (signed by PK) then the metadata and all the Entry content of the chain must be signed by the same PK to be interpreted as authentic.
##### Structure

`ExtIDS[0] = SHA256(db_id + object_id)`
`content = JSON metadata object`

##### Metadata

```javascript
{
_id: params.object._id, //Unique ID of the object this chain tracks
protocol_version: '0.0.0a', //Objectdb protocol version this object chain was initialized with
hashed: false, //Whether the entries in this chain will be hashes of the complete object or updates.
message: "'It's Alive!' --- This is beginning of an object's chain!",
meta: undefined, //JSON Metadata from the user
init_object: object //the object at the time of initialization
};
```

### Additional Chain Entries

Contains the next version of the object(experimental: or JSON object specifying an event).

If the chain has `hashed=true` then each entry's content will be the MD5 hash of the new version of the object.

If the chain has `hashed = false` then the entry's content is a JSON representation of the update applied to the object to bring it to it's current state.

Think of additional chain entries as commits of a Git repo!

##### Structure

ExtId[0] = 

##### JSON Events

More info coming soon...

​    