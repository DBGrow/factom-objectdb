const persistence = require('./persistence');

const express = require('express');
const config = require('../config');
const app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // for parsing application/json

app.get('/api/v1/db/:db/object', queryObject);
app.get('/api/v1/db/:db/objects', queryObjects);
app.get('/api/v1/db/:db/object/:id/', getObject);
app.post('/api/v1/db/:db/object/:id/', postObject);
app.patch('/api/v1/db/:db/object/:id/', patchObject);
const server = app.listen(config.apiport, () => console.log('Factom Object Database HTTP API listening on port ' + config.apiport));

function queryObject(req, res) {

    const db = req.params.db;

    let query;
    try {
        query = JSON.parse(req.query.query);
        const result = persistence.getDB(db).findOne(query);
        res.send(result);
    } catch (e) {
        console.error(e);
        res.status(400).send({message: 'Invalid JSON query object in request body'});
    }
}

function queryObjects(req, res) {
    const db = req.params.db;

    let query;
    try {
        query = JSON.parse(req.query.query);
        const results = persistence.getDB(db).find(query);
        res.send(results);
    } catch (e) {
        console.error(e);
        res.status(400).send({message: 'Invalid JSON query object in request body'});
    }
}

async function getObject(req, res) {
    const db = req.params.db;
    const id = req.params.id;
    try {
        let objectDB = persistence.getDB(db);
        const object = await objectDB.getObject(id);
        res.send(object);
    } catch (e) {
        console.error(e);
        res.status(500).send(e);
    }
}

function postObject(req, res) {
    const db = req.params.db;
    const id = req.params.id;

    let object = req.body;
    if (typeof object !== 'object') {
        res.status(400).send({message: 'Invalid JSON Object in request body'});
        return;
    }

    let rules;
    try {
        if (req.query.rules) rules = JSON.parse(req.query.rules);
    } catch (e) {
        console.error(e);
        res.status(400).send({message: 'Invalid JSON rules object'});
        return;
    }

    try {
        const entry = persistence.getDB(db).commitObject(id, object, rules);
        res.send(entry);
    } catch (e) {
        console.error(e);
        res.status(500).send(e);
    }
}

function patchObject(req, res) {
    const db = req.params.db;
    const id = req.params.id;

    let update = req.body;
    if (typeof update !== 'object') {
        res.status(400).send({message: 'Invalid JSON Object update in request body'});
        return;
    }

    const entry = persistence.getDB(db).commitObjectUpdate(id, update);
    res.send(entry);
    res.status(400).send({message: 'Invalid JSON update object in request body'});

}

module.exports.close = () =>
    server.close();