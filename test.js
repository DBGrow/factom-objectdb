var {FactomObjectDB} = require('./src/FactomObjectDB');
var ObjectId = require('objectid');
var crypto = require('crypto');

var FieldRules = require('./src/rules/FieldRules');

var ObjectRules = require('./src/rules/ObjectRules');


var {FactomCli} = require('factom');

//Testnet credentials, enjoy the free testnet EC's!
const EC = 'EC1tE4afVGPrBUStDhZPx1aHf4yHqsJuaDpM7WDbXCcYxruUxj2D';
const ES = 'Es3k4L7La1g7CY5zVLer21H3JFkXgCBCBx8eSM2q9hLbevbuoL6a';
const testObjectId = '5b396865cbf4239c10000001';

var cli = new FactomCli({host: '88.200.170.90'}); //testnet courtesy node

var db = new FactomObjectDB({
    db_id: 'factomdbtest:0.0.1',
    factomparams: {host: '88.200.170.90'},  //testnet courtesy node
    ec_address: EC,
    es_address: ES,
});

//build an example object, a person in a database
/*

var object = {
    _id: new ObjectId(),
    name: 'Joe Testerson',
    age: 5,
    best_friends: []
};

var objectRules = new ObjectRules.Builder()
    .setAddFields(false) //disable adding fields to the object
    .setDeleteFields(false) //disable deleting fields from the object
    .setRenameFields(false) //disable renaming fields in the object

    //handle field rules:
    .addFieldRule('_id', new FieldRules.Builder().setType('string').setEditable(false).build()) //mark the person's ID final
    .addFieldRule('name', new FieldRules.Builder().setType('string').setEditable(false).build()) //mark the name final
    .addFieldRule('age', new FieldRules.Builder().setType('number').setEditable(true).setDeletable(false).setMin(0).setMax(100).build()) //the age is non negative integer <= 100 that cannot be deleted
    .addFieldRule('best_friends', new FieldRules.Builder().setType('array').setEditable(true).setDeletable(false).setMax(5).build()) //limit best friends to 5 in count, non deletable
    .build();

console.log(JSON.stringify(objectRules, undefined, 2));

//check if our object rules are valid, otherwise we'll get an error when we try to inter it into Factom
if (!ObjectRules.validate(object, objectRules)) throw new Error('Object rules were invalid!');

//commit the initial object and rules to Factom!
db.commitObject(object._id, object, objectRules, function (err, chain) {
    if (err) throw err;
    console.log(JSON.stringify(chain, undefined, 2));

    //get the entry we just created to see what it looks like!
    cli.getEntry(chain.entryHash).then(function (entry) {
        console.log(db.parseObjectFromEntry(entry, function (err, entry) {
            if (err) throw err;

            console.log(entry);

        }))
    }).catch(function (err) {
        throw err;
    });
});
*/

//get a test object
db.getObject(testObjectId, function (err, object) {
        if (err) {
            console.error(err);
            return;
        }

    setTimeout(function () {
        console.log('Retrieved Object:\n' + JSON.stringify(object, undefined, 2));
    }, 2000);

});
return;

//get the metadata for a test object
/*db.getObjectMetadata(testObjectId, function (err, object) {
    if (err) {
        console.error(err);
        return;
    }

    console.log('Retrieved Object Metadata:\n' + JSON.stringify(object, undefined, 2));
});*/

var updates = [
    { //this is an invalid update since _id is marked as not editable
        $set: {
            _id: 'hello0'
        },
    },
    { //this is an invalid update since age is marked as type 'number'
        $set: {
            age: 'ninety'
        }
    },

    { //set the persons age to 9. Should be successful
        $set: {
            age: 9
        }
    },
    { //increase the persons age by 1. Should be successful
        $inc: {
            age: 1
        }
    },
    { //increase the persons age by 100. Should be invalid since the persons age is marked to be 100 at max
        $inc: {
            age: 100
        }
    },
    { //Reset best_friends array. Should be successful
        $set: {
            best_friends: []
        }
    },
    { //push a new friend to the best_friends array. Should be successful
        $push: {
            best_friends: {_id: new ObjectId(), name: 'Yohan B', age: 27}
        }
    },
    { //push another new friend to the best_friends array. Should be successful
        $push: {
            best_friends: {_id: new ObjectId(), name: 'Franklin R', age: 55}
        }
    },
    { //pop the most recent friend to the best_friends array. Should be successful
        $pop: {
            best_friends: {}
        }
    }
];

function commitUpdatesRecursive() {
    if (updates.length == 0) console.log('DONE RUNNING UPDATES!');

    db.commitObjectUpdate(testObjectId,
        updates.shift()
        , function (err, entry) {
            if (err) throw err;

            //get the entry we just created to see what it looks like!
            cli.getEntry(entry.entryHash).then(function (entry) {
                console.log(db.parseObjectFromEntry(entry, function (err, entry) {
                    if (err) throw err;

                    console.log(entry);

                    if (updates.length > 0) commitUpdatesRecursive();
                    else console.log('DONE RUNNING UPDATES!');
                }));
            }).catch(function (err) {
                throw err;
            });
        });
}

if (updates.length > 0) commitUpdatesRecursive();


db.getObjectMetadata(testObjectId, function (err, object) {
    if (err) throw err;
    console.log('GOT META!');
    console.log(JSON.stringify(object, undefined, 2));
});
return;

