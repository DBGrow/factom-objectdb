# factom-objectdb
Object database implementation for the Factom protocol written in NodeJS.

# State of development

This library is in active development, currently at alpha stage. Commits may contain breaking changes!

## Prerequisites

### Factom

You must have the following to write objects using this library:

-  A funded public/private Entry Credit address
- Access to the `factomd-api` and `walletd-api`

The public EC address must remain funded to continue creating entries! You may use testnet addresses and servers.

Reading stored objects is **free** and does not require an EC address.

# Mechanism

When a new object is inserted into a database, the library will create a new Chain with the first Entry being a metadata entry for the object.

Updates and other events about the object will result in a new `Entry` being placed on the object's `Chain`, containing the hash of the new version the object or the update to the object itself.

# Examples

### Initialization

```javascript
var {FactomObjectDB} = require('./src/FactomObjectDB');

//get db object async
new FactomObjectDB({
    ec_address: FACTOM_EC, //public EC address
    encrypt : true, //enable/disable encryption (default enabled)
    private_key_path : undefined //Path to your private key to encrypt and decrypt entries. By default will be ./crypto/demo_private.pem unless you set encryption : false
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

Store new object.

```javascript
 var ObjectId = require('objectid');

        var object = {
            _id: new ObjectId(), //required
            // add any JSON serializable object fields here!
            status: true,
            status_message: "It's Alive!"
        };

        db.commitObject({
                db_id: 'factomdbtest:0.0.0',
                object: object
            },
            function (err, chain) {
                if (err) throw err;
                console.log(chain);
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



### Get an Object

Get an object on DB `factomdbtest:0.0.0` with objectID `5ad28b9d18c35e2b4c000001`

```javascript
db.getObject("factomdbtest:0.0.0", "5ad28b9d18c35e2b4c000001", function (err, object) {
        if (err) {
            console.error(err);
            return;
        }
        console.log('Retrieved Object:\n' + JSON.stringify(object, undefined, 2));
});
```

Output:

```javascript
Retrieved Object:
{
  "_id": "5ad28b9d18c35e2b4c000001",
  "status": true,
  "status_message": "It's Alive!",
  "test_field": "hello there!",
  "errors": 99,
  "friends": 0.2537180160835515,
  "count": 23
}
```



### Update an Object

This library uses a [MongoDB inspired update syntax](https://docs.mongodb.com/manual/reference/operator/update/#id1). 

Currently, these operators are supported:

- `$set` : Set the value of a key in the object
- `$unset` : Delete the key and value from an object
- `$rename` : Rename the key of an object
- `$inc` : Increase the value of the key of an object by an amount
- `$mul` : Multiply the value of the key of an object by an amount

These operators follow the same rules as their Mongodb counterparts.

##### Example

Update an object on DB `factomdbtest:0.0.0` with objectID `5ad28b9d18c35e2b4c000001` to set field `count` equal to `10`.

```javascript
var update = {
        $set: {
            count: 10
        }
};

db.commitObjectUpdate("factomdbtest:0.0.0", "5ad28b9d18c35e2b4c000001",
        update
        , function (err, entry) {
            if (err) throw err;
            console.log('Committed entry with hash' + entry.entryHash.toString('hex'))
});
```

Output:

```javascript
Retrieved Object:
{
  "_id": "5ad28b9d18c35e2b4c000001",
  "status": true,
  "status_message": "It's Alive!",
  "test_field": "hello there!",
  "errors": 99,
  "friends": 0.2537180160835515,
  "count": 23
}
```



### Index An Object

Get an object on DB `factomdbtest:0.0.0`'s metadata with objectID `5ad28b9d18c35e2b4c000001`

```javascript
db.commitObjectIndex("5ad28b9d18c35e2b4c000001", function (err, object) {
            if (err) {
                console.error(err);
                return;
            }
            // console.timeEnd('GetObject');
            console.log('Retrieved Object:\n' + JSON.stringify(object, undefined, 2));
        });
```

Output:

```javascript
GOT META!
{
  "type": "meta",
  "_id": "5ad28b9d18c35e2b4c000001",
  "protocol_version": "0.0.0a",
  "hashed": false,
  "message": "'It's Alive!' --- This is beginning of an object's chain!",
  "init_object": {
    "_id": "5ad28b9d18c35e2b4c000001",
    "status": true,
    "status_message": "It's Alive!"
  }
}
```





### Get an Object Chain's Metadata

Get an object on DB `factomdbtest:0.0.0`'s metadata with objectID `5ad28b9d18c35e2b4c000001`

```javascript
 db.getChainMetaObject("factomdbtest:0.0.0", "5ad28b9d18c35e2b4c000001", function (err, object) {
        if (err) throw err;
        console.log('GOT META!');
        console.log(JSON.stringify(object, undefined, 2));
});
```

Output:

```javascript
GOT META!
{
  "type": "meta",
  "_id": "5ad28b9d18c35e2b4c000001",
  "protocol_version": "0.0.0a",
  "hashed": false,
  "message": "'It's Alive!' --- This is beginning of an object's chain!",
  "init_object": {
    "_id": "5ad28b9d18c35e2b4c000001",
    "status": true,
    "status_message": "It's Alive!"
  }
}
```



# Chain Structure

Each object is represented as a chain of Entries.

### Entry Content Construction

`ExtIDS[0] = SHA256(db_id + object_id)`
`content =Zipped, (and optionally encrypted) JSON metadata object`

Object --> JSON String --> AES256 PK Encryption* --> DEFLATE compression (RFC 1951) --> content of Entry

 (* = conditional)

Follow in reverse for Object construction from content

### First Chain Entry

Contains metadata about the chain including the first version of the complete object. If the chain is private (signed by PK) then the metadata and all the Entry content of the chain must be signed by the same PK to be interpreted as authentic.
##### Metadata Structure

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

Think of additional chain entries kind of like commits to a Git repo!

They represent checkpoints in time where updates and events happened.

##### Structure

`ExtId[0]` =  Unix Epoch Converted to String of when this entry was made

`content` = zipped (Optionally incrypted) content of the entry

### Entry Content

### Updates

Update entries represent an update to the object

```javascript
{
    $set: {
        count: count
    }
}
```

### Indexes

Index entries represent a point in time snapshot of the object

```javascript
{
    type: 'index',
    index_object: { //the complete copy of the object at ExtID[0] Unix epoch
  		"_id": "5ad28b9d18c35e2b4c000001",
  		"status": true,
  		"status_message": "It's Alive!",
  		"test_field": "hello there!",
  		"errors": 99,
  		"friends": 0.2537180160835515,
  		"count": 23
	}
}
```



​    