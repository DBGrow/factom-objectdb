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

    self.applyUpdate = function (updateEntry, callback) {
        //validate updateEntry

        var update = updateEntry.update;
        //check for safety:

        //update entry needs to have certain fields

        //also contain at least one key:value

        //handle signing & crypto verification

        //check for field editability
        if (!rules.editfields) {
            if (callback) callback(new Error("Ignoring Update: The object does not allow editing of it's fields"));
            return;
        }

        //check for maxupdates
        if (rules.maxupdates && rules.maxupdates == updates) {
            if (callback) callback(new Error('Ignoring Update: The object has hit its update limit of ' + rules.maxupdates));
            return;
        }

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

                                //gtfo if the key does not exist/has an inappropriate type
                                if (!self.object[key]) {
                                    if (callback) callback(new Error('Ignoring Update: Cannot increment a field that does not exist: ' + key));
                                    continue;
                                }

                                if (typeof self.object[key] !== 'number') {
                                    if (callback) callback(new Error('Ignoring Update: Cannot increment a field is not a number: ' + key));
                                    continue;
                                }

                                if (typeof fields_values[key] !== 'number') {
                                    if (callback) callback(new Error('Ignoring Update: Cannot increment a field with a value that is not a number: ' + fields_values[key]));
                                    continue;
                                }

                                //check rules for this field
                                if (fieldRules[key]) {
                                    if (!fieldRules[key].editable) {
                                        if (callback) callback(new Error('Ignoring Update: Field ' + key + ' is not editable'));
                                        continue;
                                    }

                                    //check min value
                                    if (fieldRules[key].min && fieldRules[key].min > self.object[key] + fields_values[key]) {
                                        if (callback) callback(new Error('Ignoring Update: Update would push ' + key + ' under its minimum value ' + fieldRules[key].min));
                                        continue
                                    }

                                    //check max value
                                    if (fieldRules[key].max && fieldRules[key].max < self.object[key] + fields_values[key]) {
                                        if (callback) callback(new Error('Ignoring Update: Update would push ' + key + ' over its maximum value ' + fieldRules[key].max));
                                        continue;
                                    }
                                }

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

                                //key = fruit_count
                                //fields_values[key] = 10
                                //gtfo if the key does not exist/has no value
                                if (!self.object[key]) {
                                    if (callback) callback(new Error('Ignoring Update: Cannot multiply a field that does not exist: ' + key));
                                    continue;
                                }

                                if (typeof self.object[key] !== 'number') {
                                    if (callback) callback(new Error('Ignoring Update: Cannot multiply a field that is not a number: ' + key));
                                    continue;
                                }

                                if (typeof fields_values[key] !== 'number') {
                                    if (callback) callback(new Error('Ignoring Update: Cannot multiply a field with a value that is not a number: ' + fields_values[key]));
                                    continue;
                                }


                                //check rules for this field
                                if (fieldRules[key]) {
                                    if (!fieldRules[key].editable) {
                                        if (callback) callback(new Error('Ignoring Update: Field ' + key + ' is not editable'));
                                        continue;
                                    }

                                    //check min value
                                    if (fieldRules[key].min && fieldRules[key].min > self.object[key] * fields_values[key]) {
                                        if (callback) callback(new Error('Ignoring Update: Update would push ' + key + ' under its minimum value ' + fieldRules[key].min));
                                        continue;
                                    }

                                    //check max value
                                    if (fieldRules[key].max && fieldRules[key].max < self.object[key] * fields_values[key]) {
                                        if (callback) callback(new Error('Ignoring Update: Update would push ' + key + ' over its maximum value ' + fieldRules[key].max));
                                        continue;
                                    }
                                }

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
                                    if (!fieldRules[key].editable) {
                                        if (callback) callback(new Error('Ignoring Update: Field ' + key + ' is not editable'));
                                        continue;
                                    }

                                    if (!fieldRules[key].renameable) {
                                        if (callback) callback(new Error('Ignoring Update: Field ' + key + ' is not renameable'));
                                        continue;
                                    }
                                }

                                //gtfo if the key does not exist/has no value
                                if (!self.object[key]) {
                                    if (callback) callback(new Error('Ignoring Update: Cannot rename a field that does not exist: ' + key));
                                    continue;
                                }

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

                                //check if add fields is false and trying to add new field
                                if (!rules.addfields && !self.object[key]) {
                                    if (callback) callback(new Error('Ignoring Update: Field ' + key + ' cannot be added as a field'));
                                    continue;
                                }

                                //check rules for this field
                                if (fieldRules[key]) {
                                    if (!fieldRules[key].editable) {
                                        if (callback) callback(new Error('Ignoring Update: Field ' + key + ' is not editable. Ignoring update'));
                                        continue;
                                    }

                                    //check if field is bound by type
                                    if (fieldRules[key].type) {

                                        //if the field isn't supposed to be an array, compare typof
                                        if (fieldRules[key].type != typeof fields_values[key] && fieldRules[key].type != 'array') {
                                            if (callback) callback(new Error('Ignoring Update: Field ' + key + ' must be of type ' + fieldRules[key].type));
                                            continue;
                                        } else if (!Array.isArray(fields_values[key])) { //otherwise check if the new value isn't an array
                                            if (callback) callback(new Error('Ignoring Update: Field ' + key + ' must be of type ' + fieldRules[key].type));
                                            continue;
                                        }


                                    }

                                    //check min value
                                    if (fieldRules[key].min && fieldRules[key].min > fields_values[key]) {
                                        if (callback) callback(new Error('Ignoring Update: Update would push ' + key + ' under its minimum value ' + fieldRules[key].min));
                                        continue
                                    }

                                    //check max value
                                    if (fieldRules[key].max && fieldRules[key].max < fields_values[key]) {
                                        if (callback) callback(new Error('Ignoring Update: Update would push ' + key + ' over its maximum value ' + fieldRules[key].max));
                                        continue;
                                    }
                                }

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
                                    if (!fieldRules[key].editable) throw new Error('Ignoring Update: Field ' + key + ' is not editable');
                                    if (!fieldRules[key].deletable) throw new Error('Ignoring Update: Field ' + key + ' is not deletable');
                                    continue;
                                }

                                delete self.object[key] //unset the value
                            }
                        }
                        break;
                    }

                    //array methods, simple for now
                    case '$push': {
                        /*{
                            $mul:{
                                fruit_count : 10
                            }
                        }*/
                        for (var key in fields_values) {
                            if (fields_values.hasOwnProperty(key)) {

                                //key = fruit_count
                                //fields_values[key] = [1,2,3]
                                //gtfo if the key does not exist/has no value
                                if (!self.object[key]) {
                                    if (callback) callback(new Error('Ignoring Update: Cannot push onto a field that does not exist: ' + key));
                                    continue;
                                }

                                if (!Array.isArray(self.object[key])) {
                                    if (callback) callback(new Error('Ignoring Update: Cannot push onto a field that is not an array : ' + key));
                                    continue;
                                }

                                //check rules for this field
                                if (fieldRules[key]) {
                                    if (!fieldRules[key].editable) {
                                        if (callback) callback(new Error('Ignoring Update: Field ' + key + ' is not editable'));
                                        continue;
                                    }

                                    //check max value
                                    if (fieldRules[key].max && fieldRules[key].max < self.object[key].length + 1) {
                                        if (callback) callback(new Error('Ignoring Update: Update would push ' + key + ' over its maximum element count ' + fieldRules[key].max));
                                        continue;
                                    }
                                }

                                self.object[key].push(fields_values[key]); //push the new element onto the array
                            }
                        }
                        break;
                    }

                    //array methods, simple for now
                    case '$pop': {
                        /*{
                            $mul:{
                                fruit_count : 10
                            }
                        }*/
                        for (var key in fields_values) {
                            if (fields_values.hasOwnProperty(key)) {

                                //key = fruit_count
                                //fields_values[key] = [1,2,3]
                                //gtfo if the key does not exist/has no value
                                if (!self.object[key]) {
                                    if (callback) callback(new Error('Ignoring Update: Cannot pop from a field that does not exist: ' + key));
                                    continue;
                                }

                                if (!Array.isArray(self.object[key])) {
                                    if (callback) callback(new Error('Ignoring Update: Cannot pop from a field that is not an array : ' + key));
                                    continue;
                                }

                                //check rules for this field
                                if (fieldRules[key]) {
                                    if (!fieldRules[key].editable) {
                                        if (callback) callback(new Error('Ignoring Update: Field ' + key + ' is not editable'));
                                        continue;
                                    }

                                    //check min value
                                    if (fieldRules[key].min && fieldRules[key].min > self.object[key].length - 1) {
                                        if (callback) callback(new Error('Ignoring Update: Update would push ' + key + ' under its minumum element count ' + fieldRules[key].max));
                                        continue;
                                    }
                                }

                                self.object[key].pop(); //pop an element off the array
                            }
                        }
                        break;
                    }

                    default: {
                        console.error('Ignoring Unknown Update! Object: ' + JSON.stringify(update))
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
                self.applyUpdate(update, function (err) {
                    if (err) console.error(err);
                });
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
};