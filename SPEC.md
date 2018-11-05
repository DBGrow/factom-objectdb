# Factom ObjectDB Specifcation

[TOC]

# Version

0.0.0

# Summary

A cross platform blockchain object database built on Factom.

# Specification



## Data & Cryptography

### Data Format

All protocol data is formatted as JSON ([RFC 7159](https://tools.ietf.org/html/rfc7159))



### Cryptography

- **Asymmetric Encryption** - ed25519 asymmetric cryptography is chosen as the sole algorithm for signatures.
- **Symmetric Encryption** - AES-256 is chosen as the sole algorithm for encryption
- **Hashing** - SHA-256d (a double round of SHA-256) is chosen as the sole algorithm for hashing



### Compression

- **Deflate**

Using combinations of the above techniques on protocol data affords an adjustable level of access control and authenticity. 

For example:

- An unsigned, unencrypted object is completely public and can be read and written to by anyone.
- An unsigned, unencrypted, compressed object is completely public and can be read and written to by anyone. However it is not human readable
- A signed, unencrypted object is publicly readable, but updates must be authentic to it's owner.
- An unsigned, encrypted object is private, but if the private key is compromised anyone can read and update it.
- A signed, encrypted object is private, and each update must be authentic to it's owner.

And so on.



## Chain ID Derivation & Namespace

The ExtIDs of the first entry on any objectdb chain or resource is deterministically defined. It shall be of the form:

| Index | Value    | Description               |
| ----- | -------- | ------------------------- |
| 0     | objectdb | Application nonce         |
| 1     | 0.0.0    | ObjectDB Protocol version |
| 2     | *        | ObjectDB URI space.       |

Entry ExtIDS beyond the initial entry in a chain are ignored.



## Databases

Objects are divided into logical groups by databases. Each database allows a singular listing of an object under a unique ID string. 



## Object Index Chain

The object index chain contains references to the IDs of objects created under each database. The index chain improves object discoverability since object IDs can be forgotten if not recorded. The Object Index Chain is optional, and may or may not exist depending on the database. It is up to the user to establish an index chain if they wish.

### Object Index Chain ID Derivation

From the section above "Chain ID Derivation & Namespace", ExtID[2] is used as the object namespace. The namespace value to get a databases index Chain' ID shall be hex encoded: `database:<databaseid>:index` where `<databaseid>` is replaced with the ID of the database.

### Object Index Chain Entry Content

```json
{
    "type":"index",
    "ids" :[
        "'5b396865cbf4239c10000001"
    ],
}
```



## Objects

Objects are valid JSON objects that hold user defined data. 

The protocol allows unlimited object depth and width up to the 10KB limit of an entry's content.



### Object Chain

Each object in the database is represented by a chain, which stores it's initial state, rules, and subsequent updates.

#### Object Chain ID Derivation

From the section above "Chain ID Derivation & Namespace", ExtID[2] is used as the object namespace. The namespace value to get an object's Chain ID shall be hex encoded: `database:<databaseid>:object:<objectid>` where `<databaseid>` is replace with the ID of the database, and `<objectid>` is replaced with the ID of the object.



#### Object Chain First Entry

##### First Entry Content Example

```json
{
    "type":"meta",
    "object": {
        "_id": "5b396865cbf4239c10000001",
        "name": "Joe Testerson",
        "age": 5,
        "best_friends": []
    },
    "rules": {
        "editfields": true,
        "addfields": false,
        "deletefields": false
        "fields": {
            "_id": {
                "editable": false,
                "deletable": true,
                "type": "string"
            }
        }
    }
}
```

| Field  | Type   | Description                                                  |
| ------ | ------ | ------------------------------------------------------------ |
| object | object | User defined object to store. If an object is not defined a blank object is used as a seed. |
| rules  | object | Optional object level rules                                  |



##### Object Rules

Object rules govern the entire object.

| Rule           | Value       | Description                                                  |
| -------------- | ----------- | ------------------------------------------------------------ |
| `addfields`    | true\|false | Can new keys be added to the object                          |
| `editfields`   | true\|false | Can values be changed in the object                          |
| `deletefields` | true\|false | Can keys be removed from the object                          |
| `maxupdates`   | number      | The maximum number of updates until this object is locked to new updates. |
| `fields`       | object      | Field level rules for the object                             |



##### Field Rules

| Rule        | Value       | Description                                         |
| ----------- | ----------- | --------------------------------------------------- |
| `editable`  | true\|false | Can this field be edited                            |
| `deletable` | true\|false | Can this field be deleted                           |
| `min`       | number      | The maximum value of the field (Or length of array) |
| `max`       | number      | The minimum value of the field                      |

Object rules trump field level rules in all cases. For example if an object is marked `editfields = false`, setting `editable = true` for a FieldRule will not make that field editable.



#### Object Update Entries

Object update entries can be placed on the object's chain to immutably change the content of the object.

##### Update Content Example

```json
{
    "type":"update",
    "update":{
        "$inc":{
            "age": 1,
            "fingers": 5
        },
        "$set":{
            "name": "Crypto Chad"
        }
    }
}
```

##### Update Operators 

| Operator  | Description                                | Key                           | Value Type                    | Value                       |
| --------- | ------------------------------------------ | ----------------------------- | ----------------------------- | --------------------------- |
| `$set`    | Set a key value pair                       | Key name to set               | string\|number\|array\|object | value                       |
| `$unset`  | Delete a key value pair                    | Key name to delete            | -                             | -                           |
| `$rename` | Rename a key                               | Key name to rename            | string                        | value to rename key to      |
| `$inc`    | Increase a numeric key                     | Key name to increment         | signed number                 | value to increment value by |
| `$mul`    | Multiply a numeric key                     | Key name to multiply          | signed number                 | value to multiply value by  |
| `$push`   | Add an element to the end of an array      | Key name to push element onto | string\|number\|array\|object | value to push onto array    |
| `$pop`    | Remove an element from the end of an array | Key name to pop element from  | -                             | -                           |

