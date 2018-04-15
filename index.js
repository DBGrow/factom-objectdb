var {FactomObjectDB} = require('./src/FactomObjectDB');
var ObjectId = require('objectid');
var crypto = require('crypto');

//Enter your own testnet server or use courtesy IP/DNS!
var FACTOMD_IP/* = process.env.FACTOMD_IP*/;

var FACTOM_EC = process.env.FACTOM_EC;
var FACTOM_ES = process.env.FACTOM_ES;

console.log('Factomd API IP ' + FACTOMD_IP);
console.log('Using EC address ' + FACTOM_EC);
console.log('Using ES address ' + FACTOM_ES);
new FactomObjectDB({
    ec_address: FACTOM_EC,
    es_address: FACTOM_ES,
    db_id: 'factomdbtest:0.0.0'
}, function (err, db) {
    if (err) throw err;

    // console.time('GetObject');
    /*db.getObject("factomdbtest:0.0.0", "5ad28b9d18c35e2b4c000001", function (err, object) {
        if (err) {
            console.error(err);
            return;
        }
        console.timeEnd('GetObject');
        console.log('Retrieved Object:\n' + JSON.stringify(object, undefined, 2));
        // console.log('DONE!!!');
    });*/


    /*db.commitObjectIndex("5ad28b9d18c35e2b4c000001", function (err, object) {
        if (err) {
            console.error(err);
            return;
        }
        // console.timeEnd('GetObject');
        console.log('Stored Index Object:\n' + JSON.stringify(object, undefined, 2));
        // console.log('DONE!!!');
    });*/


    /*var update = {
        $set: {
            count: 10
        }
    };

    db.commitObjectUpdate("factomdbtest:0.0.0", "5ad28b9d18c35e2b4c000001",
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

        db.commitObjectUpdate("factomdbtest:0.0.0", "5ad28b9d18c35e2b4c000001",
            update
            , function (err, entry) {
                if (err) throw err;
                // console.log('Committed entry with hash' + entry.hash.toString('hex'))
            });
        count++;
    }, 5000);
    return;*/


    /*db.getChainMetaObject("factomdbtest:0.0.0", "5ad28b9d18c35e2b4c000001", function (err, object) {
        if (err) throw err;
        console.log('GOT META!');
        console.log(JSON.stringify(object, undefined, 2));
    });*/


    /*    var ObjectId = require('objectid');

        var object = {
            _id: 'myuniqueid',
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
                console.log(JSON.stringify(chain, undefined, 2));

                var chain_id = chain.chainId.toString();
                console.log(chain_id);
            });*/
});