![](https://png.icons8.com/ultraviolet/200/000000/sugar-cubes.png)

# factom-objectdb

[![npm](https://img.shields.io/npm/v/factom-objectdb.svg?style=for-the-badge)](https://npm.org/package/factom-objectdb)

 [![Travis (.org)](https://img.shields.io/travis/DBGrow/factom-objectdb.svg?style=for-the-badge)](https://travis-ci.org/DBGrow/factom-objectdb)

 [![Coveralls github](https://img.shields.io/coveralls/github/DBGrow/factom-objectdb.svg?style=for-the-badge)](https://coveralls.io/github/DBGrow/factom-objectdb)

A blockchain object database implemented in NodeJS, built on Factom -  all for a fraction of the cost of competitors.

This library enables basic immutable Create, Read, and Update database operations for JSON objects stored on the blockchain, featuring a familiar MongoDB inspired update syntax.



- ### [Installation](#Installation)

- ### [Examples](#Examples)

- ### [Motivation](#Motivation)

- ### [TODO](#TODO)



# Installation

 Command Line:

```javascript
npm -i factom-objectdb
```

**or**

In `package.json`:

```javascript
"dependencies": {
    "factom-objectdb": "0.0.2",
}
```







# Examples

## Initialization

Simple Initialization:

```javascript
var {FactomObjectDB} = require('factom-objectdb');

var db = new FactomObjectDB({
    db_id: 'factomdbtest:0.0.1', //the ID of your database
    ec_address: 'Es3k4L7La1g7CY5zVLer21H3JFkXgCBCBx8eSM2q9hLbevbuoL6a',  //Public or private EC address
});
```



All configuration options:

```javascript
var db = new FactomObjectDB({
    db_id: 'factomdbtest:0.0.1', //the ID of your database
    ec_address: 'Es3k4L7La1g7CY5zVLer21H3JFkXgCBCBx8eSM2q9hLbevbuoL6a',  //Public or private EC address
    factom: {
        factomd: {
        	host: '52.202.51.228',
        	port: 8088
    	},
    	walletd: {
        	host: '52.202.51.228',
        	port: 8089
    	},
        user: 'username', // RPC basic authentication
    	password: 'pwd',
    	rejectUnauthorized: true, // Set to false to allow connection to a node with a self-signed certificate
    	retry: {
        	retries: 4,
        	factor: 2,
        	minTimeout: 500,
        	maxTimeout: 2000
    	}
    }
});
```



## Store an Object

Lets say we have an object we want to store, a person in a database:

```javascript
var joe = {
    _id: '134e366520a6f93265eb',
    name: 'Joe Testerson',
    age: 30,
    best_friends: []
};
```

We want to store the object under unique ID `134e366520a6f93265eb` (`joe._id`)



Saving the object permanently in Factom is as easy as:

```javascript
//save the initial object to Factom!

//using async/await
let storedObject = await db.commitObject('134e366520a6f93265eb', joe);

//or using promises
db.commitObject(joe._id, joe).then(function(storedObject){
    
}).catch(function(err){
    throw err;
});
```

 It is important to note that creation of and updates to objects take up until the next block to be reflected (up to 10 Minutes).





### Object & Field Rules

The library allows placing restrictions on how the objects you store can be updated. The current state of an object is determined by the library using these rules when retrieving the object from Factom.

In this case, `Joe Testerson` is a user in a database. To facilitate that functionality, we should place some restrictions on how his object and it's fields can be updated:



```javascript
let FieldRules = require('factom-objectdb/rules/FieldRules');
let ObjectRules = require('factom-objectdb/rules/ObjectRules');

//declare object rules

let objectRules = new ObjectRules.Builder()
    .setAddFields(false) //disable adding fields to Joe's object
    .setDeleteFields(false) //disable deleting fields from to Joe's object
    .setRenameFields(false) //disable renaming fields in Joe's object

    //declare field rules:
    .addFieldRule('_id', new FieldRules.Builder().setType('string').setEditable(false).build()) //mark Joe's ID final, so it can never be changed
    .addFieldRule('name', new FieldRules.Builder().setType('string').setEditable(true).build()) //mark Joe's name editable so he can change it later
    .addFieldRule('age', new FieldRules.Builder().setType('number').setEditable(true).setMin(0).setMax(100).build()) //Joes age is, updatable, but will be locked to non negative number <= 100
    .addFieldRule('best_friends', new FieldRules.Builder().setType('array').setEditable(true).setMax(5).build()) //limit Joe's best friends to to 5 in count, non deletable
    .build();
```





 the field rules for the object at the same time you commit it:

```javascript
//commit the initial object and rules to Factom!
let storedObject = await db.commitObject(joe._id, joe, objectRules);
```

Please note rules are not updatable at this time. Rule declarations for objects are permanent.





## Get an Object

Get Joe's object using his id: `5ad28b9d18c35e2b4c000001`

```javascript
let joe = await db.getObject("134e366520a6f93265eb");
```

Retrieved Object:

```javascript
{
  "_id": "134e366520a6f93265eb",
  "name": "Joe Testerson",
  "age": 25,
  "best_friends": []
}
```







## Update an Object

This library uses a [MongoDB inspired update syntax](https://docs.mongodb.com/manual/reference/operator/update/#id1). 

Currently, these operators are supported:

- `$set` : Set the value of a key in the object
- `$unset` : Delete the key from an object
- `$rename` : Rename the key of an object
- `$inc` : Increase the value of the key of an object by an amount
- `$mul` : Multiply the value of the key by an number
- `$push` : Add a value to the end of an array
- `$pop` : Remove a value from the end of an array



Updates to Factom objects are subject to the object's Field and Object rules. Updates that do not meet the restrictions placed on the Object will be ignored when retrieving it next time. It is important to note that updates to objects take up until the next block to be reflected using `getObject`. Changes can take up to 10 Minutes to be reflected in the final retrieval of the object.



Let's say Joe just had his 27th birthday. We want to `$set` his new age:

```javascript
var update = { //increase Joe's age by 1
        $set: {
            age: 27
        }
 };

await db.commitObjectUpdate("134e366520a6f93265eb", update);
```



Lets say Joe just made a friend named Johan! We want to `$push` a friend to his best_friends array:

```javascript
var update = { //push a new friend to the best_friends array. Should be successful
        $push: {
            best_friends: {name: 'Yohan B', age: 30}
        }
};

await db.commitObjectUpdate("134e366520a6f93265eb", update);
```



Lets say Joe fell into a black hole and has aged 70 years:

```javascript
var update = {
        $inc: {  //Increase Joe's age by 70!
            age: 70
        }
};

await db.commitObjectUpdate("134e366520a6f93265eb", update);
```



Joe is now 97 years of age, and sadly all his friends are dead. Better get rid of Johan :(

```javascript
var update = { //pull a single friend from the best_friends array
        $pop: {
            best_friends: {}
        }
};

await db.commitObjectUpdate("134e366520a6f93265eb", update);
```



Lets say Joe keeps falling for another 10 years:

```javascript
var update = {
        $inc: {  //Increase Joe's age by 10!
            age: 10
        }
};

await db.commitObjectUpdate("134e366520a6f93265eb", update);
```

But now we have a problem! Increasing Joe's age by 10 would make him 107, which is over the maximum value we set for his age of 100. This update will be ignored the next time Joe's object is retrieved.





### Get An Object's Metadata

Let's say we want to get info on Joe's object:

```javascript
let meta = await db.getObjectMetadata("134e366520a6f93265eb")
```



The output illustrates how the library stores and defines rules for the Object:



```javascript
{
  "type": "meta",
  "protocol_version": "0.0.1",
  "timestamp": 1530488933194,
  "object": {
    "_id": "5b396865cbf4239c10000001",
    "name": "Joe Testerson",
    "age": 5,
    "best_friends": []
  },
  "rules": {
    "editfields": true,
    "addfields": false,
    "deletefields": false,
    "renamefields": false,
    "fields": {
      "_id": {
        "editable": false,
        "deletable": true,
        "renameable": true,
        "type": "string"
      },
      "name": {
        "editable": false,
        "deletable": true,
        "renameable": true,
        "type": "string"
      },
      "age": {
        "editable": true,
        "deletable": false,
        "renameable": true,
        "type": "number",
        "min": 0,
        "max": 100
      },
      "best_friends": {
        "editable": true,
        "deletable": false,
        "renameable": true,
        "type": "array",
        "max": 5
      }
    }
  }
}

```







## Security & Permissions

By default objects created using this library are publicly viewable and editable. This library offers several approaches to keeping objects permissioned and secure:





### AES Encryption

Objects and updates written using this library can be encrypted using AES256. Doing so results in object storage that can only be read and updated by the holder of the private encryption key.

To use AES, specify your key during initialization:

```javascript
var db = new FactomObjectDB({
    //... other options
    aes_key : 'my awesome passphrase' //private key string or buffer
});
```





### Cryptographic Signatures (Coming Soon)

Have an object you want to be publicly readable, but only want to allow updates from authorized parties? Each update entry can be signed using asymmetric encryption keys 





### Obfuscation

The library uses deflate compression to shrink the data that is put into Factom. This means that the entries this library creates are not human readable. This will be made optional in the near future



<u>Please note that once an object is initialized, AES and compression settings cannot be changed. Attempting to read an object using incorrect encryption or compression settings will result in an error.</u>





# Testing

```
npm test
```





# Motivation

Applications deserve easy, affordable, immutable data storage. Factom-objectdb wraps the required functionality into an easy to use package based on a universal structured data standard (JSON) and language (NodeJS), all for a fraction of the cost of competitors.





### Cost Reduction

The price performance of immutable data solutions on Factom, like factom-objectdb, blow competitors out of the water on a $ per KB basis:

|          | Cost/KB | % of Factom’s Cost |
| -------- | ------- | ------------------ |
| Factom   | $0.001  | -                  |
| Ethereum | $0.13   | 13000% (13x)       |
| NEO      | $0.22   | 2.47 M% (24800x)   |





### Ease Of Use

factom-objectdb does not require any knowledge of or integration with contract languages like Solidity. It is a language agnostic protocol can be implemented in any programming language. Anyone who can read JSON can understand objectdb.





### No Exchanges or Securities

Entering data costs [Entry Credits](/), a fixed value, non tradable token that can be purchased by anyone, anywhere. Entry credits are not securities, cost $0.001 USD each, and enable the entry of 1 KB of data permanently into the blockchain.





# TODO

- Better examples for field and object rules
- Full object and field rules table with descriptions
- Signature based validation for updates
- Make deflate compression optional for human readability





## Legal

Factom-objectdb logo & Icon packs by [Icons8](https://icons8.com)