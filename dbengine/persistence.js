const fs = require('fs');
const config = require('../config');
const {FactomObjectDB} = require('../src/FactomObjectDB');

// 1) Create our database, supply location and options.
//    This will create or open the underlying LevelDB store.
const dbmap = new Map();

//get existing object databases and load them
console.log('Loading Databases: ' + fs.readdirSync('./databases'));
if (!fs.existsSync('./databases')) fs.mkdirSync('./databases');

fs.readdirSync('./databases').forEach(id => {
    getDB(id)
});

function getDB(id) {
    if (dbmap.get(id)) return dbmap.get(id);

    const objectdb = new FactomObjectDB({
        factom: {
            host: '0.testnet.factom.dbgrow.com',
            port: 8088
        },
        db_id: id,
        ec_address: config.es,
    });
    dbmap.set(id, objectdb);
    return objectdb
}

module.exports = {
    getDB
};