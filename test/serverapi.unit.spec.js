const assert = require('chai').assert;
const axios = require('axios');

require('../index'); //run API server

const testDBId = 'factomdbtest:0.0.2';
const testObjectId = '5bdf8697c45ceeb43c00001f';

const FieldRules = require('../src/rules/FieldRules');
const ObjectRules = require('../src/rules/ObjectRules');


describe('API Unit Tests', function () {
    //prepare HTTP client for requests
    let routes;

    it('Server Initialization', function () {
        routes = require('../dbengine/routes');
    });

    let client;

    it('Client Initialization', function () {
        const ClientBuilder = require('../src/FactomObjectDBClient').ClientBuilder;
        client = new ClientBuilder(testDBId).build();
    });

    it('Get Object', async function () {
        this.timeout(60000);
        const object = await client.getObject(testObjectId);
        assert(object !== undefined, "Failed to return object");
        assert(typeof object === 'object', "Failed to return object");
        assert(object._id === testObjectId, "Failed to return correct object from findOne");
    });

    it('Find Object', async function () {
        this.timeout(60000);
        const object = await client.findObject({_id: testObjectId});
        assert(object !== undefined, "Failed to return object from findOne");
        assert(typeof object === 'object', "Failed to return type object from findOne");
        assert(object._id === testObjectId, "Failed to return correct object from findOne");
    });

    it('Find Objects', async function () {
        this.timeout(60000);
        const objects = await client.findObjects({_id: testObjectId});
        assert(objects !== undefined, "Failed to return objects from find");
        assert(Array.isArray(objects), "Failed to return type array from find");
        assert(objects.find(object => object._id === testObjectId), "Failed to return target object")
    });

    it('Commit Object', async function () {
        this.timeout(60000);
        const _id = new Date().getTime();
        const object = { //the initial version of the object
            _id: _id,
            name: 'Joe Testerson',
            age: 5,
            best_friends: []
        };

        const rules = new ObjectRules.Builder()
            .setAddFields(false) //disable adding fields to the object
            .setDeleteFields(false) //disable deleting fields from the object
            .setRenameFields(false) //disable renaming fields in the object

            //handle field rules:
            .addFieldRule('_id', new FieldRules.Builder().setType('string').setEditable(false).build()) //mark the person's ID final
            .addFieldRule('name', new FieldRules.Builder().setType('string').setEditable(false).build()) //mark the name final
            .addFieldRule('age', new FieldRules.Builder().setType('number').setEditable(true).setDeletable(false).setMin(0).setMax(100).build()) //the age is non negative integer <= 100 that cannot be deleted
            .addFieldRule('best_friends', new FieldRules.Builder().setType('array').setEditable(true).setDeletable(false).setMax(5).build()) //limit best friends to 5 in count, non deletable
            .build();

        const response = await client.commitObject(_id, object, rules);
        assert(response !== undefined, "Failed to commit object");
    });

    it('Commit Object Update', async function () {
        this.timeout(60000);
        let update = {
            $inc: {
                age: 3
            }
        };

        const response = await client.commitObjectUpdate(testObjectId, update);
        assert(response !== undefined, "Failed to commit object");
    });

    it('Close', function () {
        routes.close();
    });
});