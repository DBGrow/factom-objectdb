var ObjectId = require('objectid');


function FactomObject(metaEntry) {
    const self = this;

    var updates = 0;

    if (!metaEntry) self.object = {};
    else self.metaEntry = metaEntry;

    //evaluate object for stringifyability

    const rules = metaEntry.rules ? metaEntry.rules : {};

    const timestamp = metaEntry.timestamp;

    const fieldRules = rules.fields;

    self.object = metaEntry.object;

    self.get = function () {
        return self.object;
    };

    self.applyUpdate = function applyUpdate(updateEntry) {


        var update = updateEntry.update;
        //check for safety:

        //check for lockat
        if (rules.lockat >= updateEntry.timestamp) throw new Error('The object was locked at  ' + rules.lockat + ' (' + new Date(rules.lockat).toISOString());

        //check for maxupdates
        if (rules.maxupdates && rules.maxupdates == updates) throw new Error('The object has hit its update limit of ' + rules.maxupdates);

        //check for duplicate operations on the same field

        for (var op in update) { //needs to be async
            if (update.hasOwnProperty(op)) {
                // process the modification of the object
                var fields_values = update[op];
                switch (op) {
                    case '$inc': {
                        /*{
                           $inc:{
                               fruit_count : 10
                           }
                       }*/
                        for (var key in fields_values) {


                            if (fields_values.hasOwnProperty(key)) {

                                //key = fruit_count
                                //fields_values[key] = 10

                                //check rules for this field
                                if (fieldRules[key]) {
                                    if (!fieldRules[key].editable) throw new Error('Field ' + key + ' is not editable');
                                    continue;
                                }

                                //gtfo if the key does not exist/has no value
                                if (!self.object[key]) throw new Error('Cannot increment a field that does not exist: ' + key);
                                if (typeof self.object[key] !== 'number') throw new Error('Cannot increment a field is not a number: ' + key);
                                if (typeof fields_values[key] !== 'number') throw new Error('Cannot increment a field with a value that is not a number: ' + fields_values[key]);

                                self.object[key] += fields_values[key]; //set the the value of the new field
                            }
                        }
                        break;
                    }

                    //multiply the field
                    case '$mul': {
                        /*{
                            $mul:{
                                fruit_count : 10
                            }
                        }*/
                        for (var key in fields_values) {
                            if (fields_values.hasOwnProperty(key)) {

                                //check rules for this field
                                if (fieldRules[key]) {
                                    if (!fieldRules[key].editable) throw new Error('Field ' + key + ' is not editable');
                                    continue;
                                }

                                //key = fruit_count
                                //fields_values[key] = 10
                                //gtfo if the key does not exist/has no value
                                if (!self.object[key]) throw new Error('Cannot multiply a field that does not exist: ' + key);
                                if (typeof self.object[key] !== 'number') throw new Error('Cannot multiply a field that is not a number: ' + key);
                                if (typeof fields_values[key] !== 'number') throw new Error('Cannot multiply a field with a value that is not a number: ' + fields_values[key]);

                                self.object[key] *= fields_values[key]; //set the the value of the new field
                            }
                        }
                        break;
                    }
                    case '$rename': {
                        /*{
                            $rename:{fruit:'orange'}
                        }*/

                        for (var key in fields_values) {
                            if (fields_values.hasOwnProperty(key)) {
                                //key = fruit
                                //fields_values[key] = 'orange'

                                //check rules for this field
                                if (fieldRules[key]) {
                                    if (!fieldRules[key].editable) throw new Error('Field ' + key + ' is not editable');
                                    if (!fieldRules[key].renameable) throw new Error('Field ' + key + ' is not renameable');
                                    continue;
                                }

                                //gtfo if the key does not exist/has no value
                                if (!self.object[key]) throw new Error('Cannot rename a field that does not exist: ' + key);

                                self.object[fields_values[key]] = self.object[key]; //set the the value of the new field from old
                                delete self.object[key]; //delete the old field
                            }
                        }
                        break;
                    }

                    //Operators that don't require checking variable state
                    case '$set': {
                        for (var key in fields_values) {
                            if (fields_values.hasOwnProperty(key)) {

                                //check rules for this field
                                if (fieldRules[key]) {
                                    if (!fieldRules[key].editable) throw new Error('Field ' + key + ' is not editable');
                                    continue;
                                }

                                //check if add fields is false and trying to add new field
                                if (!rules.addfields && !self.object[key]) throw new Error('Field ' + key + ' cannot be added as a field');

                                //check if field is bound by type
                                if (fieldRules[key].type && fieldRules[key].type != typeof fields_values[key]) throw new Error('Field ' + key + ' must be of type ' + fieldRules[key].type);

                                self.object[key] = fields_values[key]; //set the value
                            }
                        }
                        break;
                    }
                    case '$unset': {
                        for (var key in fields_values) {
                            if (fields_values.hasOwnProperty(key)) {
                                //check rules for this field
                                if (fieldRules[key]) {
                                    if (!fieldRules[key].editable) throw new Error('Field ' + key + ' is not editable');
                                    if (!fieldRules[key].deletable) throw new Error('Field ' + key + ' is not deletable');
                                    continue;
                                }

                                delete self.object[key] //unset the value
                            }
                        }
                        break;
                    }

                    default: {
                        console.error('Skipping Unknown Update! Object: ' + JSON.stringify(update))
                    }
                }
            }
        }
        updates++;

        return self;
    };

    self.applyUpdates = function applyUpdates(updates, callback) {
        try {
            updates.forEach(function (update) { //needs to be async
                self.applyUpdate(update)
            });

            if (callback) callback(undefined, self);
            return self;
        } catch (err) {
            if (callback) {
                callback(err);
                return self;
            } else throw err;
        }
    };
    return self;
}

module.exports = {
    FactomObject: FactomObject
}