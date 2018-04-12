var {FactomObjectDB} = require('./src/FactomObjectDB');
var ObjectId = require('objectid');
var crypto = require('crypto');

//Enter your own testnet server or use courtesy IP/DNS!
var FACTOMD_IP = process.env.FACTOMD_DEV_IP;

var FACTOM_EC = process.env.FACTOM_DEV_ES;


/*var root_eh = 'flaksjd34mk5n34n5j3n4k5jn3k45jnk3j4n5'; //entry hash of the first entry
//compute arbitrary n'th ext_id from chain's root entry hash
function getExtId(root_eh, index) {
    return crypto.createHash('md5').update(root_eh + index).digest("hex");
}
var next_ext_id;
return;*/

new FactomObjectDB({
    factomd_host: FACTOMD_IP,
    walletd_host: FACTOMD_IP,
    ec_address: FACTOM_EC,
}, function (err, db) {
    if (err) throw err;

    console.time('GetObject');
    db.getObject("factomdbtest:0.0.0", "5acec1b0c88848cc19000001", function (err, object) {
        if (err) {
            console.error(err);
            return;
        }
        console.timeEnd('GetObject');
        console.log('Retrieved Object:\n' + JSON.stringify(object, undefined, 2));
        // console.log('DONE!!!');
    });

    /*var ObjectId = require('objectid');

    var object = {
        _id: new ObjectId(),
        // add any JSON serializable object fields here!
        status: true,
        status_message: "It's Alive!"
    };

    db.initObjectChain({
            db_id: 'factomdbtest:0.0.0',
            object: object
        },
        function (err, chain) {
            if (err) throw err;
            console.log(JSON.stringify(chain, undefined, 2));

            var chain_id = chain.chainId.toString();
            console.log(chain_id);
        });*/

    /*db.commitObjectUpdate({
        chain_id: 'ee7215ad1f9791b1f91ca5efe18d45f7f48d4544df68a7d7311d2fb7b6ac2e39'
    })*/
});
