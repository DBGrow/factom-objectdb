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
- **Hashing** - SHA-256d is chosen as the sole algorithm for hashing



### Compression

- **Deflate**

Using combinations of the above techniques on protocol data affords an adjustable level of access control and authenticity. 

For example:

- An unsigned, unencrypted object is completely public and can be read and written to by anyone.
- An unsigned, unencrypted, compressed object is completely public and can be read and written to by anyone. However it is not human readable
- A signed, unencrypted object is publicly readable, but updates must be authentic to it's owner.
- An unsigned, encrypted object is private, but if the private key is compromised anyone can read and update it.
- A signed, encrypted object is private, and each update must be authentic to it's owner.

And so on



## Factom

### Entry Content

All protocol data is contained in the content of entries. This allows all object and database data to be optionally.

### Entry ExtIDS

First entry extIds for all chains shall be of the form:

| Index | Value    | Description               |
| ----- | -------- | ------------------------- |
| 0     | objectdb | Application nonce         |
| 1     | 0.0.0    | ObjectDB Protocol version |
| 2     | *        | ObjectDB URI space        |

Entry ExtIDS beyond the initial entry in a chain are ignored.





## Databases [TODO]

Objects are divided into logical groups by databases. Each database allows a singular listing of an object under a unique ID string. 



### Database Index Chain [TODO]

The database index chain contains references to the IDs of objects collected under each database. The index chain improves object discoverability since object IDs can be forgotten.





## Objects

Objects are valid JSON objects that hold user defined data. 

The protocol allows unlimited object depth and width up to the 10KB limit of an entry's content.



### Object Chain

Each object in the database is represented by a chain, which stores it's initial state, rules, and subsequent updates.

An objects chain ID can be calculated as:

```javascript
sha256d(databaseId + objectId)
```

where `objectId` is a string identifier unique among the objects in the database. As such, there is a single unique chain for each object and duplicates are barred due to Factom's rules.



#### Object Metadata Entry



##### Metadata Content Example

```
{
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

| Rule         | Value       | Description                                         |
| ------------ | ----------- | --------------------------------------------------- |
| `editable`   | true\|false | Can this field be edited                            |
| `deletable`  | true\|false | Can this field be deleted                           |
| `renameable` | true\|false | Can this field be renamed                           |
| `min`        | number      | The maximum value of the field (Or length of array) |
| `max`        | number      | The minimum value of the field                      |

Object rules trump field level rules in all cases. For example if an object is marked `editfields = false`, setting `editable = true` for a FieldRule will not make that field editable.



#### Object Update Entries

##### Update Content Example

```
{
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

