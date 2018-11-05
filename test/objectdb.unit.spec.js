const assert = require('chai').assert;

const {FactomObjectDB} = require('../src/FactomObjectDB');
const ObjectId = require('objectid');
const FieldRules = require('../src/rules/FieldRules');
const ObjectRules = require('../src/rules/ObjectRules');

//Testnet credentials, enjoy the free testnet EC's!
const ES = 'Es3k4L7La1g7CY5zVLer21H3JFkXgCBCBx8eSM2q9hLbevbuoL6a';
const testObjectId = '5bdf8697c45ceeb43c00001f';
const testAESObjectId = '5bdf8a1f807be19e3e000020';

const db = new FactomObjectDB({
    factom: {
        host: '0.testnet.factom.dbgrow.com',
        port: 8088
    },
    db_id: 'factomdbtest:0.0.2',
    ec_address: ES,
});

const aesdb = new FactomObjectDB({
    factom: {
        host: '0.testnet.factom.dbgrow.com',
        port: 8088
    },
    db_id: 'factomdbtest:0.0.2',
    ec_address: ES,
    aes_key: 'test'
});

function getDB() {
    return db;
}

function getAESDB() {
    return aesdb;
}

describe('ObjectDB Tests', async function () {

    let db;
    describe('Initialization', function () {
        it('Basic Initialization', function () {
            assert.doesNotThrow(() => getDB());
            assert.doesNotThrow(() => getAESDB());
        });
    });

    describe('FactomObject', function () {
        let {FactomObject} = require('../src/FactomObject');

        function getTestMeta(rules) {
            return Object.assign({}, { //will be converted to JSON. Do not set options that can not be converted to JSON!
                type: 'meta', //required
                protocol_version: '0.0.1', //The version of the protocol this object chain was initialized with. Set by this library. Required
                timestamp: new Date().getTime(),
                object: { //the initial version of the object
                    _id: new ObjectId(),
                    name: 'Joe Testerson',
                    age: 5,
                    best_friends: []
                },
                rules: rules,
            });
        }

        describe('Initialization', function () {
            it('Basic Initialization', function () {
                let object = new FactomObject(getTestMeta({}));

                assert(typeof object.applyUpdate === 'function', "Method applyUpdate not found");
                assert(typeof object.get === 'function', "Method get not found");

                let initObject = object.get();
                assert(initObject !== undefined, 'Result of get() not defined')
                assert(typeof initObject === 'object', 'Result of get() was not an object')
            });

            it('Initialization With Rules', function () {
                let rules = new ObjectRules.Builder()
                    .setAddFields(false) //disable adding fields to the object
                    .setDeleteFields(false) //disable deleting fields from the object
                    .setRenameFields(false) //disable renaming fields in the object

                    //handle field rules:
                    .addFieldRule('_id', new FieldRules.Builder().setType('string').setEditable(false).build()) //mark the person's ID final
                    .addFieldRule('name', new FieldRules.Builder().setType('string').setEditable(false).build()) //mark the name final
                    .addFieldRule('age', new FieldRules.Builder().setType('number').setEditable(true).setDeletable(false).setMin(0).setMax(100).build()) //the age is non negative integer <= 100 that cannot be deleted
                    .addFieldRule('best_friends', new FieldRules.Builder().setType('array').setEditable(true).setDeletable(false).setMax(5).build()) //limit best friends to 5 in count, non deletable
                    .build();

            });
        });


        describe('FieldRules Builder', function () {
            // let FieldRulesBuilder = FactomObject.FieldRules.Builder;

            it('Initialization', function () {
                let builder = new FieldRules.Builder();

            });

            it('Input Validation', function () {
                let builder = new FieldRules.Builder();

                //type
                assert.doesNotThrow(() => builder.setType('boolean'));
                assert.doesNotThrow(() => builder.setType('number'));
                assert.doesNotThrow(() => builder.setType('string'));
                assert.doesNotThrow(() => builder.setType('object'));
                assert.doesNotThrow(() => builder.setType('array'));
                assert.throws(() => builder.setType('google'));
                assert.throws(() => builder.setType(1));
                assert.throws(() => builder.setType(x => x));

                //editable
                assert.doesNotThrow(() => builder.setEditable(true));
                assert.doesNotThrow(() => builder.setEditable(false));
                assert.throws(() => builder.setEditable('google'));
                assert.throws(() => builder.setEditable(1));
                assert.throws(() => builder.setEditable(x => x));

                //deletable
                assert.doesNotThrow(() => builder.setDeletable(true));
                assert.doesNotThrow(() => builder.setDeletable(false));
                assert.throws(() => builder.setDeletable('google'));
                assert.throws(() => builder.setDeletable(1));
                assert.throws(() => builder.setDeletable(x => x));

                //renameable
                assert.doesNotThrow(() => builder.setRenameable(true));
                assert.doesNotThrow(() => builder.setRenameable(false));
                assert.throws(() => builder.setRenameable('google'));
                assert.throws(() => builder.setRenameable(1));
                assert.throws(() => builder.setRenameable(x => x));

                //min
                assert.doesNotThrow(() => builder.setMin(1));
                assert.doesNotThrow(() => builder.setMin(-100));
                assert.throws(() => builder.setMin('google'));
                assert.throws(() => builder.setMin(false));
                assert.throws(() => builder.setMin(x => x));

                //max
                assert.doesNotThrow(() => builder.setMax(1));
                assert.doesNotThrow(() => builder.setMax(100));
                assert.throws(() => builder.setMax('google'));
                assert.throws(() => builder.setMax(false));
                assert.throws(() => builder.setMax(x => x));
            });

            it('Output Validation', function () {
                let builder = new FieldRules.Builder();

                //defaults
                let rules = builder.build();
                assert(rules.editable, 'Default Fieldrules were not editable');
                assert(rules.deletable, 'Default Fieldrules were not deletable');
                assert(rules.renameable, 'Default Fieldrules were not renameable');

                rules = new FieldRules.Builder()
                    .setType('number')
                    .setEditable(false)
                    .setDeletable(false)
                    .setRenameable(false)
                    .setMax(100)
                    .setMin(-100)
                    .build();

                assert(rules.type === 'number', 'Change had no effect');
                assert(!rules.editable, 'Change had no effect');
                assert(!rules.deletable, 'Change had no effect');
                assert(!rules.renameable, 'Change had no effect');
                assert(rules.max === 100, 'Change had no effect');
                assert(rules.min === -100, 'Change had no effect');
            });

        });

        describe('ObjectRules Builder', function () {
            it('Initialization', function () {
                let builder = new ObjectRules.Builder();
            });

            it('Input Validation', function () {
                let builder = new ObjectRules.Builder();

                //addfields
                assert.doesNotThrow(() => builder.setAddFields(true));
                assert.doesNotThrow(() => builder.setAddFields(false));
                assert.throws(() => builder.setAddFields('google'));
                assert.throws(() => builder.setAddFields(1));
                assert.throws(() => builder.setAddFields(x => x));

                //editfields
                assert.doesNotThrow(() => builder.setEditFields(true));
                assert.doesNotThrow(() => builder.setEditFields(false));
                assert.throws(() => builder.setEditFields('google'));
                assert.throws(() => builder.setEditFields(1));
                assert.throws(() => builder.setEditFields(x => x));

                //deletefields
                assert.doesNotThrow(() => builder.setDeleteFields(true));
                assert.doesNotThrow(() => builder.setDeleteFields(false));
                assert.throws(() => builder.setDeleteFields('google'));
                assert.throws(() => builder.setDeleteFields(1));
                assert.throws(() => builder.setDeleteFields(x => x));

                //renamefields
                assert.doesNotThrow(() => builder.setRenameFields(true));
                assert.doesNotThrow(() => builder.setRenameFields(false));
                assert.throws(() => builder.setRenameFields('google'));
                assert.throws(() => builder.setRenameFields(1));
                assert.throws(() => builder.setRenameFields(x => x));

                //max updates
                assert.doesNotThrow(() => builder.setMaxUpdates(100));
                assert.throws(() => builder.setMaxUpdates(0));
                assert.throws(() => builder.setMaxUpdates('google'));
                assert.throws(() => builder.setMaxUpdates(false));
                assert.throws(() => builder.setMaxUpdates(x => x));

                //signed
                assert.doesNotThrow(() => builder.setSigned(true));
                assert.doesNotThrow(() => builder.setSigned(false));
                assert.throws(() => builder.setSigned('google'));
                assert.throws(() => builder.setSigned(1));
                assert.throws(() => builder.setSigned(x => x));

                //keys
                assert.doesNotThrow(() => builder.setKeys([]));
                assert.throws(() => builder.setKeys(0));
                assert.throws(() => builder.setKeys('google'));
                assert.throws(() => builder.setKeys(false));
                assert.throws(() => builder.setKeys(x => x));

                //fieldrules
            });

            it('Output Validation', function () {
                let rules = new ObjectRules.Builder().build();

                assert(rules.addfields, 'Default ObjectRules did not allow adding fields');
                assert(rules.editfields, 'Default ObjectRules did not allow editing fields');
                assert(rules.deletefields, 'Default ObjectRules did not allow deleting fields');
                assert(rules.renamefields, 'Default ObjectRules did not allow renaming fields');

                rules = new ObjectRules.Builder()
                    .setAddFields(false)
                    .setEditFields(false)
                    .setRenameFields(false)
                    .setDeleteFields(false)
                    .setMaxUpdates(1000)
                    .setKeys(['abc'])
                    .addFieldRule('_id', new FieldRules.Builder().setType('string'))
                    .build();

                assert(!rules.addfields, 'Change had no effect');
                assert(!rules.editfields, 'Change had no effect');
                assert(!rules.deletefields, 'Change had no effect');
                assert(!rules.renamefields, 'Change had no effect');
                assert(rules.maxupdates === 1000, 'Change had no effect');
                assert(rules.keys.indexOf('abc') !== -1, 'Change had no effect');
                assert(typeof rules.fields === 'object', 'Change had no effect')
            });
        });
        describe('Object Update Operators', function () {

            let object = new FactomObject(getTestMeta());
            let update;


            it('$inc', function () {
                update = {
                    update: {
                        $inc: {
                            age: 3
                        }
                    }
                };
                assert(object.get().age === 5);
                assert.doesNotThrow(() => object.applyUpdate(update));
                assert(object.get().age === 8, '$inc unsuccessful');

                //push over max
                object = new FactomObject(getTestMeta(
                    new ObjectRules.Builder()
                        .addFieldRule('age', new FieldRules.Builder().setMin(0).setMax(100).build())
                        .build()));
                update = {
                    update: {
                        $inc: {
                            age: 300
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));


                //push under min
                update = {
                    update: {
                        $inc: {
                            age: -300
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));


                //incorrect input type
                update = {
                    update: {
                        $inc: {
                            age: 'a'
                        }
                    }
                };

                assert.throws(() => object.applyUpdate(update));

                //nonexistent field
                update = {
                    update: {
                        $inc: {
                            age0: 1
                        }
                    }
                };

                assert.throws(() => object.applyUpdate(update));
            });

            it('$mul', function () {

                object = new FactomObject(getTestMeta());
                update = {
                    update: {
                        $mul: {
                            age: 3
                        }
                    }
                };
                assert(object.get().age === 5);
                assert.doesNotThrow(() => object.applyUpdate(update));
                assert(object.get().age === 15, '$mul unsuccessful');


                //push over max
                object = new FactomObject(getTestMeta(
                    new ObjectRules.Builder()
                        .addFieldRule('age', new FieldRules.Builder().setMin(0).setMax(100).build())
                        .build()));
                update = {
                    update: {
                        $mul: {
                            age: 300
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));


                //push under min
                update = {
                    update: {
                        $mul: {
                            age: -3
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));


                //incorrect input type
                update = {
                    update: {
                        $mul: {
                            age: 'a'
                        }
                    }
                };

                assert.throws(() => object.applyUpdate(update));

                //nonexistent field
                update = {
                    update: {
                        $mul: {
                            age0: 1
                        }
                    }
                };

                assert.throws(() => object.applyUpdate(update));
            });

            it('$rename', function () {
                update = {
                    update: {
                        $rename: {
                            name: 'surname'
                        }
                    }
                };

                assert(object.get()['name'], 'Field name did not exist');
                assert.doesNotThrow(() => object.applyUpdate(update));
                assert(!object.get()['name'], '$rename unsuccessful');
                assert(object.get()['surname'], '$rename unsuccessful');


                //field is not renameable
                object = new FactomObject(getTestMeta(
                    new ObjectRules.Builder()
                        .addFieldRule('age', new FieldRules.Builder().setRenameable(false).build())
                        .build()));

                update = {
                    update: {
                        $rename: {
                            age: 'mangoYears'
                        }
                    }
                };

                assert.throws(() => object.applyUpdate(update));

                //field is not editable
                object = new FactomObject(getTestMeta(
                    new ObjectRules.Builder()
                        .addFieldRule('age', new FieldRules.Builder().setEditable(false).build())
                        .build()));

                update = {
                    update: {
                        $rename: {
                            age: 'mangoYears'
                        }
                    }
                };

                assert.throws(() => object.applyUpdate(update));

                //field is not deletable
                object = new FactomObject(getTestMeta(
                    new ObjectRules.Builder()
                        .addFieldRule('age', new FieldRules.Builder().setDeletable(false).build())
                        .build()));

                update = {
                    update: {
                        $rename: {
                            age: 'mangoYears'
                        }
                    }
                };

                assert.throws(() => object.applyUpdate(update));

                //incorrect input type
                object = new FactomObject(getTestMeta());
                update = {
                    update: {
                        $rename: {
                            age: 1
                        }
                    }
                };

                assert.throws(() => object.applyUpdate(update));

                //nonexistent field
                object = new FactomObject(getTestMeta());
                update = {
                    update: {
                        $rename: {
                            age0: 'age99'
                        }
                    }
                };

                assert.throws(() => object.applyUpdate(update));
            });

            it('$set', function () {
                let object = new FactomObject(getTestMeta());

                update = {
                    update: {
                        $set: {
                            name: 'Stephen Curry'
                        }
                    }
                };

                assert(object.get()['name'] === 'Joe Testerson', 'Field name did not exist');
                assert.doesNotThrow(() => object.applyUpdate(update));
                assert(object.get()['name'] === 'Stephen Curry', '$set unsuccessful');

                //field is not editable
                object = new FactomObject(getTestMeta(
                    new ObjectRules.Builder()
                        .addFieldRule('name', new FieldRules.Builder().setEditable(false).build()).build()
                ));
                update = {
                    update: {
                        $set: {
                            name: 'Harold'
                        }
                    }
                };

                assert.throws(() => object.applyUpdate(update));


                //input type of undefined or null
                object = new FactomObject(getTestMeta(
                    new ObjectRules.Builder()
                        .addFieldRule('name', new FieldRules.Builder().setEditable(false).build()).build()
                ));
                update = {
                    update: {
                        $set: {
                            name: undefined
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));

                update = {
                    update: {
                        $set: {
                            name: null
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));


                //incorrect input type when field locked to type
                object = new FactomObject(getTestMeta(
                    new ObjectRules.Builder()
                        .addFieldRule('name', new FieldRules.Builder().setType('string').build()).build()
                ));
                update = {
                    update: {
                        $set: {
                            name: 1
                        }
                    }
                };

                assert.throws(() => object.applyUpdate(update));

                //incorrect input type when field locked to type (Array)
                object = new FactomObject(getTestMeta(
                    new ObjectRules.Builder()
                        .addFieldRule('best_friends', new FieldRules.Builder().setType('array').build()).build()
                ));
                update = {
                    update: {
                        $set: {
                            best_friends: 1
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));

                //set min and max
                object = new FactomObject(getTestMeta(
                    new ObjectRules.Builder()
                        .addFieldRule('age', new FieldRules.Builder().setMin(0).setMax(100).build()).build()
                ));
                update = { //min
                    update: {
                        $set: {
                            age: -1
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));
                update = { //max
                    update: {
                        $set: {
                            age: 101
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));


                //set nonexistent field
                update = {
                    update: {
                        $set: {
                            age0: 2
                        }
                    }
                };

                assert.doesNotThrow(() => object.applyUpdate(update));
                assert(object.get()['age0'] === 2, '$set unsuccessful');
            });

            it('$unset', function () {
                let object = new FactomObject(getTestMeta());

                update = {
                    update: {
                        $unset: {
                            name: ''
                        }
                    }
                };
                assert(object.get()['name'] === 'Joe Testerson', 'Field name did not exist');
                assert.doesNotThrow(() => object.applyUpdate(update));
                assert(object.get()['name'] === undefined, '$unset unsuccessful');


                //field is not editable
                object = new FactomObject(getTestMeta(
                    new ObjectRules.Builder()
                        .addFieldRule('name', new FieldRules.Builder().setEditable(false).build()).build()
                ));
                update = {
                    update: {
                        $unset: {
                            name: ''
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));

                //field is not deletable
                object = new FactomObject(getTestMeta(
                    new ObjectRules.Builder()
                        .addFieldRule('name', new FieldRules.Builder().setDeletable(false).build()).build()
                ));
                update = {
                    update: {
                        $unset: {
                            name: ''
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));
            });

            it('$push', function () {
                let object = new FactomObject(getTestMeta());

                update = {
                    update: {
                        $push: {
                            best_friends: 'Henry'
                        }
                    }
                };
                assert(object.get()['best_friends'].length === 0, 'Field did not have expected length');
                assert.doesNotThrow(() => object.applyUpdate(update));
                assert(object.get()['best_friends'].length === 1, '$push unsuccessful');
                assert(object.get()['best_friends'].indexOf('Henry') === 0, '$push unsuccessful');


                //field is not an array
                object = new FactomObject(getTestMeta());

                update = {
                    update: {
                        $push: {
                            name: 'Harold'
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));


                //field has a max length
                object = new FactomObject(getTestMeta(
                    new ObjectRules.Builder()
                        .addFieldRule('best_friends', new FieldRules.Builder().setMax(1).build()).build()
                ));
                update = {
                    update: {
                        $push: {
                            best_friends: 'Harold'
                        }
                    }
                };
                assert.doesNotThrow(() => object.applyUpdate(update));
                assert.throws(() => object.applyUpdate(update));

                //field is not editable
                object = new FactomObject(getTestMeta(
                    new ObjectRules.Builder()
                        .addFieldRule('name', new FieldRules.Builder().setEditable(false).build()).build()
                ));
                update = {
                    update: {
                        $push: {
                            name: ''
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));

                //field does not exist
                object = new FactomObject(getTestMeta());
                update = {
                    update: {
                        $push: {
                            abc: 'Harold'
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));
            });

            it('$pop', function () {
                let object = new FactomObject(getTestMeta());

                //push to work up to poppable
                update = {
                    update: {
                        $push: {
                            best_friends: 'Henry'
                        }
                    }
                };
                assert.doesNotThrow(() => object.applyUpdate(update));
                update = {
                    update: {
                        $pop: {
                            best_friends: ''
                        }
                    }
                };
                assert.doesNotThrow(() => object.applyUpdate(update));
                assert(object.get()['best_friends'].length === 0, '$pop unsuccessful');

                //field is not editable
                object = new FactomObject(getTestMeta(
                    new ObjectRules.Builder()
                        .addFieldRule('best_friends', new FieldRules.Builder().setEditable(false).build()).build()
                ));
                update = {
                    update: {
                        $pop: {
                            name: ''
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));

                //field does not exist
                object = new FactomObject(getTestMeta());
                update = {
                    update: {
                        $pop: {
                            abc: ''
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));
            });

            it('Unknown Operator', function () {
                object = new FactomObject(getTestMeta());
                update = {
                    update: {
                        $bang: {
                            foo: ''
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));
            });

            it('Mulitple Operators', function () {
                let object = new FactomObject(getTestMeta());

                update = {
                    update: {
                        $inc: {
                            age: 3
                        },
                        $push: {
                            best_friends: 'Henry'
                        }
                    }
                };

                assert(object.get().age === 5);
                assert(object.get()['best_friends'].length === 0, 'Field did not have expected length');

                assert.doesNotThrow(() => object.applyUpdate(update));

                //validate inc
                assert(object.get().age === 8, '$inc unsuccessful');

                //validate push
                assert(object.get()['best_friends'].length === 1, '$push unsuccessful');
                assert(object.get()['best_friends'].indexOf('Henry') === 0, '$push unsuccessful');

                //multiple operators, one of which is invalid
                object = new FactomObject(getTestMeta());
                update = {
                    update: {
                        $inc: {
                            age0: 3
                        },
                        $push: {
                            best_friends: 'Henry'
                        }
                    }
                };
                assert.throws(() => object.applyUpdate(update));
                //validate there was no change
                assert(object.get().age === 5);
                assert(object.get()['best_friends'].length === 0, 'Field did not have expected length');

            });
        });

    });


    describe('Get Methods', function () {

        it('Get Object Metadata', async function () {    //get a test object's metadata
            this.timeout(60000);
            db = getDB();
            let meta = await db.getObjectMetadata(testObjectId);
            assert(meta !== undefined, 'No object returned from getObjectMetadata');
        });

        it('Get Object Metadata (AES)', async function () {    //get a test object's metadata
            this.timeout(60000);
            db = getAESDB();
            let meta = await db.getObjectMetadata(testAESObjectId);
            assert(meta !== undefined, 'No object returned from getObjectMetadata');
        });

        it('Get Object', async function () {    //get a test object
            this.timeout(60000);
            db = getDB();
            let object = await db.getObject(testObjectId);
            assert(object !== undefined, 'No object returned from getObject');
        });

        it('Get Object (AES)', async function () {    //get a test object
            this.timeout(60000);
            db = getAESDB();
            let object = await db.getObject(testAESObjectId);
            assert(object !== undefined, 'No object returned from getObject');
        });
    });

    describe('Query Methods', function () {

        it('Find One', function () {
            this.timeout(60000);

            db = getDB();
            const object = db.findOne({_id: testObjectId});
            assert(object !== undefined, "Failed to return object from findOne");
            assert(typeof object === 'object', "Failed to return type object from findOne");
            assert(object._id === testObjectId, "Failed to return correct object from findOne");
        });

        it('Find', function () {
            db = getDB();
            const objects = db.find({_id: testObjectId});
            console.log(objects);
            assert(objects !== undefined, "Failed to return objects from find");
            assert(Array.isArray(objects), "Failed to return type array from find");
            assert(objects.find(object => object._id === testObjectId), "Failed to return target object")
        });
    });
        describe('Write Methods', function () {

            it('Commit Object', async function () {   //commit a new object
                this.timeout(60000);

                let db = getDB();

                let object = {
                    _id: new ObjectId(),
                    name: 'Joe Testerson',
                    age: 5,
                    best_friends: []
                };

                let objectRules = new ObjectRules.Builder()
                    .setAddFields(true) //disable adding fields to the object
                    .setDeleteFields(false) //disable deleting fields from the object
                    .setRenameFields(false) //disable renaming fields in the object

                    //handle field rules:
                    .addFieldRule('_id', new FieldRules.Builder().setType('string').setEditable(false).build()) //mark the person's ID final
                    .addFieldRule('name', new FieldRules.Builder().setType('string').setEditable(false).build()) //mark the name final
                    .addFieldRule('age', new FieldRules.Builder().setType('number').setEditable(true).setDeletable(false).setMin(0).setMax(100).build()) //the age is non negative integer <= 100 that cannot be deleted
                    .addFieldRule('best_friends', new FieldRules.Builder().setType('array').setEditable(true).setDeletable(false).setMax(5).build()) //limit best friends to 5 in count, non deletable
                    .build();

                // console.log(JSON.stringify(objectRules, undefined, 2));

                //check if our object rules are valid, otherwise we'll get an error when we try to inter it into Factom
                assert(ObjectRules.validate(object, objectRules), 'Object rules were invalid!');

                //commit the initial object and rules to Factom!
                let entry = await db.commitObject(object._id, object, objectRules);
                console.log(JSON.stringify(entry, undefined, 2));
            });

            it('Commit Object(AES)', async function () {   //commit a new object
                this.timeout(60000);

                let db = getAESDB();

                var object = {
                    _id: new ObjectId(),
                    name: 'Joe Testerson',
                    age: 5,
                    best_friends: []
                };

                let objectRules = new ObjectRules.Builder()
                    .setAddFields(true) //disable adding fields to the object
                    .setDeleteFields(false) //disable deleting fields from the object
                    .setRenameFields(false) //disable renaming fields in the object

                    //handle field rules:
                    .addFieldRule('_id', new FieldRules.Builder().setType('string').setEditable(false).build()) //mark the person's ID final
                    .addFieldRule('name', new FieldRules.Builder().setType('string').setEditable(false).build()) //mark the name final
                    .addFieldRule('age', new FieldRules.Builder().setType('number').setEditable(true).setDeletable(false).setMin(0).setMax(100).build()) //the age is non negative integer <= 100 that cannot be deleted
                    .addFieldRule('best_friends', new FieldRules.Builder().setType('array').setEditable(true).setDeletable(false).setMax(5).build()) //limit best friends to 5 in count, non deletable
                    .build();

                // console.log(JSON.stringify(objectRules, undefined, 2));

                //check if our object rules are valid, otherwise we'll get an error when we try to inter it into Factom
                if (!ObjectRules.validate(object, objectRules)) throw new Error('Object rules were invalid!');

                //commit the initial object and rules to Factom!
                let chain = await db.commitObject(object._id, object, objectRules);

                console.log(JSON.stringify(chain, undefined, 2));
                console.log(object._id);
            });

            it('Commit Object Update', async function () {   //commit a new object
                this.timeout(60000);

                let db = getDB();

                let update = {
                    $inc: {
                        age: 3
                    }
                };
                let result = await db.commitObjectUpdate(testObjectId, update);
            });

            it('Commit Object Update(AES)', async function () {   //commit a new object
                this.timeout(60000);

                let update = {
                    $inc: {
                        age: 3
                    }
                };

                let db = getAESDB();

                let result = await db.commitObjectUpdate(testAESObjectId, update);
            });
        });
});
