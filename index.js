var {FactomObjectDB} = require('./src/FactomObjectDB');
var ObjectId = require('objectid');
var crypto = require('crypto');

//Testnet credentials, enjoy the free testnet EC's!
const EC = 'EC1tE4afVGPrBUStDhZPx1aHf4yHqsJuaDpM7WDbXCcYxruUxj2D';
const ES = 'Es3k4L7La1g7CY5zVLer21H3JFkXgCBCBx8eSM2q9hLbevbuoL6a';

//arguments
//

var db = new FactomObjectDB({
    db_id: 'factomdbtest:0.0.1',
    factomparams: {host: '88.200.170.90'},
    ec_address: EC,
    es_address: ES,
});
console.log('Setting obj rules');

//builder examples
var FieldRules = require('./src/rules/FieldRules');
var fieldRules = new FieldRules.Builder()
    .setType('string')
    .setEditable(true)
    .build();

// console.log(fieldrules);
var ObjectRules = require('./src/rules/ObjectRules');

var objectRules = new ObjectRules.Builder()
    .setFieldRule('a', fieldRules)
    .build();

var object = {
    _id: new ObjectId(),
    a: 'blink',
    status_message: "It's Alive!"
};

db.commitObject({
        _id: object._id, //required
        object: object,
        rules: objectRules
    },
    function (err, chain) {
        if (err) throw err;
        console.log(JSON.stringify(chain, undefined, 2));

        var chain_id = chain.chainId.toString();
        // console.log(chain_id);
    });


/*
db.getObject("5b0e3c6d9391184e3e000001", function (err, object) {
        if (err) {
            console.error(err);
            return;
        }

    console.log('Retrieved Object:\n' + JSON.stringify(object, undefined, 2));
});
*/

    /*var update = {
        $set: {
            count: 10
        }
    };

    db.commitObjectUpdate("5ad28b9d18c35e2b4c000001",
        update
        , function (err, entry) {
            if (err) throw err;
            console.log('Committed entry with hash' + entry.entryHash.toString('hex'))
        });*/

    /*var count = 0;
    setInterval(function () {
        var update = {
            $set: {
                count: count
            }
        };

        db.commitObjectUpdate("5ad28b9d18c35e2b4c000001",
            update
            , function (err, entry) {
                if (err) throw err;
                // console.log('Committed entry with hash' + entry.hash.toString('hex'))
            });
        count++;
    }, 5000);
    return;*/


/*db.getChainMetaObject("5ad28b9d18c35e2b4c000001", function (err, object) {
    if (err) throw err;
    console.log('GOT META!');
    console.log(JSON.stringify(object, undefined, 2));
});*/
