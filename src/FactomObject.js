var ObjectId = require('objectid');
var ObjectRules = require('../src/rules/ObjectRules');

function FactomObject(metadata) {
    const self = this;

    var updates = 0;

    if (!metadata) self.object = {};
    else self.metadata = metadata;

    //evaluate object for stringifyability

    const rules = metadata.rules ? metadata.rules : new ObjectRules.Builder().build();

    const timestamp = metadata.timestamp;

    const fieldRules = rules.fields;

    self.object = metadata.object;

    self.get = function () {
        return self.object;
    };

    self.applyUpdate = function (updateEntry) {
        //validate updateEntry

        const update = updateEntry.update;
        //check for safety:

        //update entry needs to have certain fields

        //also contain at least one key:value

        //handle signing & crypto verification

        //check for field editability
        if (!rules.editfields) throw new Error("Ignoring Update: The object does not allow editing of it's fields");

        //check for maxupdates
        if (rules.maxupdates && rules.maxupdates == updates) throw new Error('Ignoring Update: The object has hit its update limit of ' + rules.maxupdates);

        //for every operation and key/value in the update:
        //check if field is editable
        //check for duplicate operations on the same field
        for (let op in update) {
            if (update.hasOwnProperty(op)) {
                let fields_values = update[op];
                for (let key in fields_values) {
                    if (fields_values.hasOwnProperty(key)) {
                        if (fieldRules && fieldRules[key]) {
                            if (!fieldRules[key].editable) throw new Error('Field ' + key + ' is not editable')
                        }
                    }
                }
            }
        }

        let objectCopy = Object.assign({}, self.object);


        for (let op in update) { //needs to be async
            if (update.hasOwnProperty(op)) {
                // process the modification of the object
                let fields_values = update[op];
                switch (op) {
                    case '$inc': {
                        for (let key in fields_values) {

                            if (fields_values.hasOwnProperty(key)) {

                                //key does not exist/has an inappropriate type
                                if (!objectCopy[key]) throw new Error('Ignoring Update: Cannot increment a field that does not exist: ' + key);

                                if (typeof objectCopy[key] !== 'number') throw new Error('Ignoring Update: Cannot increment a field is not a number: ' + key);

                                if (typeof fields_values[key] !== 'number') throw new Error('Ignoring Update: Cannot increment a field with a value that is not a number: ' + fields_values[key]);

                                //check rules for this field
                                if (fieldRules && fieldRules[key]) {
                                    //check min value
                                    if (fieldRules[key].min !== undefined && fieldRules[key].min > objectCopy[key] + fields_values[key]) throw new Error('Ignoring Update: Update would push ' + key + ' under its minimum value ' + fieldRules[key].min);

                                    //check max value
                                    if (fieldRules[key].max !== undefined && fieldRules[key].max < objectCopy[key] + fields_values[key]) throw new Error('Ignoring Update: Update would push ' + key + ' over its maximum value ' + fieldRules[key].max);
                                }

                                objectCopy[key] += fields_values[key]; //set the the value of the new field
                            }
                        }
                        break;
                    }

                    case '$mul': {
                        for (let key in fields_values) {
                            if (fields_values.hasOwnProperty(key)) {

                                //key = fruit_count
                                //fields_values[key] = 10
                                //gtfo if the key does not exist/has no value

                                if (!objectCopy[key]) throw new Error('Ignoring Update: Cannot multiply a field that does not exist: ' + key);

                                if (typeof objectCopy[key] !== 'number') throw new Error('Ignoring Update: Cannot multiply a field that is not a number: ' + key);

                                if (typeof fields_values[key] !== 'number') throw new Error('Ignoring Update: Cannot multiply a field with a value that is not a number: ' + fields_values[key]);

                                //check rules for this field
                                if (fieldRules && fieldRules[key]) {
                                    //check min value
                                    if (fieldRules[key].min !== undefined && fieldRules[key].min > objectCopy[key] * fields_values[key]) throw new Error('Ignoring Update: Update would push ' + key + ' under its minimum value ' + fieldRules[key].min);

                                    //check max value
                                    if (fieldRules[key].max !== undefined && fieldRules[key].max < objectCopy[key] * fields_values[key]) throw new Error('Ignoring Update: Update would push ' + key + ' over its maximum value ' + fieldRules[key].max);
                                }
                                objectCopy[key] *= fields_values[key]; //set the the value of the new field
                            }
                        }
                        break;
                    }

                    case '$rename': {
                        for (let key in fields_values) {
                            if (fields_values.hasOwnProperty(key)) {
                                //key = fruit
                                //fields_values[key] = 'orange'

                                //check rules for this field
                                if (fieldRules && fieldRules[key]) {
                                    if (!fieldRules[key].renameable) throw new Error('Ignoring Update: Field ' + key + ' is not renameable');
                                    // if (!fieldRules[key].editable) throw new Error('Ignoring Update: Field ' + key + ' is not editable');
                                    if (!fieldRules[key].deletable) throw new Error('Ignoring Update: Field ' + key + ' is not editable');
                                }

                                //gtfo if the key does not exist/has no value
                                if (!objectCopy[key]) throw new Error('Ignoring Update: Cannot rename a field that does not exist: ' + key);

                                if (typeof fields_values[key] !== 'string') throw new Error('Ignoring Update: Value to rename field to was not a string')

                                objectCopy[fields_values[key]] = objectCopy[key]; //set the the value of the new field from old
                                delete objectCopy[key]; //delete the old field
                            }
                        }
                        break;
                    }

                    //Operators that don't require checking variable state
                    case '$set': {
                        for (let key in fields_values) {
                            if (fields_values.hasOwnProperty(key)) {

                                if (fields_values[key] === undefined || fields_values[key] === null) throw new Error('Ignoring Update: $set does not support undefined or null. Please use $unset');

                                //check if add fields is false and trying to add new field
                                if (!rules.addfields && !objectCopy[key]) throw new Error('Ignoring Update: Field ' + key + ' cannot be added as a field');

                                //check rules for this field
                                if (fieldRules && fieldRules[key]) {

                                    //check if field is editable
                                    // if (!fieldRules[key].editable) throw new Error('Ignoring Update: Field ' + key + ' is not editable');

                                    //check if field is bound by type
                                    if (fieldRules[key].type) {

                                        //if the field isn't supposed to be an array, compare typof
                                        if (fieldRules[key].type !== typeof fields_values[key] && fieldRules[key].type != 'array') throw new Error('Ignoring Update: Field ' + key + ' must be of type ' + fieldRules[key].type);
                                        else if (!Array.isArray(fields_values[key])) throw new Error('Ignoring Update: Field ' + key + ' must be of type ' + fieldRules[key].type); //otherwise check if the new value isn't an array
                                    }

                                    //check min value
                                    if (fieldRules[key].min !== undefined && fieldRules[key].min > fields_values[key]) throw new Error('Ignoring Update: Update would push ' + key + ' under its minimum value ' + fieldRules[key].min);

                                    //check max value
                                    if (fieldRules[key].max !== undefined && fieldRules[key].max < fields_values[key]) throw new Error('Ignoring Update: Update would push ' + key + ' over its maximum value ' + fieldRules[key].max);
                                }

                                objectCopy[key] = fields_values[key]; //set the value
                            }
                        }
                        break;
                    }

                    case '$unset': {
                        for (let key in fields_values) {
                            if (fields_values.hasOwnProperty(key)) {
                                //check rules for this field
                                if (fieldRules && fieldRules[key]) {
                                    // if (!fieldRules[key].editable) throw new Error('Ignoring Update: Field ' + key + ' is not editable');
                                    if (!fieldRules[key].deletable) throw new Error('Ignoring Update: Field ' + key + ' is not deletable');
                                }

                                delete objectCopy[key] //unset the value
                            }
                        }
                        break;
                    }

                    //array methods, simple for now
                    case '$push': {
                        for (let key in fields_values) {
                            if (fields_values.hasOwnProperty(key)) {

                                //key = fruit_count
                                //fields_values[key] = [1,2,3]
                                //gtfo if the key does not exist/has no value
                                if (!objectCopy[key]) throw new Error('Ignoring Update: Cannot push onto a field that does not exist: ' + key);

                                if (!Array.isArray(objectCopy[key])) throw new Error('Ignoring Update: Cannot push onto a field that is not an array : ' + key);

                                //check rules for this field
                                if (fieldRules && fieldRules[key]) {
                                    // if (!fieldRules[key].editable) throw new Error('Ignoring Update: Field ' + key + ' is not editable');

                                    //check max value
                                    if (fieldRules[key].max !== undefined && fieldRules[key].max < objectCopy[key].length + 1) throw new Error('Ignoring Update: Update would push ' + key + ' over its maximum element count ' + fieldRules[key].max);
                                }

                                objectCopy[key].push(fields_values[key]); //push the new element onto the array
                            }
                        }
                        break;
                    }

                    //array methods, simple for now
                    case '$pop': {
                        for (let key in fields_values) {
                            if (fields_values.hasOwnProperty(key)) {

                                //key = fruit_count
                                //fields_values[key] = [1,2,3]
                                //gtfo if the key does not exist/has no value
                                if (!objectCopy[key]) throw new Error('Ignoring Update: Cannot pop from a field that does not exist: ' + key);

                                if (!Array.isArray(objectCopy[key])) throw new Error('Ignoring Update: Cannot pop from a field that is not an array : ' + key);

                                //check rules for this field
                                if (fieldRules && fieldRules[key]) {
                                    // if (!fieldRules[key].editable) throw new Error('Ignoring Update: Field ' + key + ' is not editable');
                                }

                                objectCopy[key].pop(); //pop an element off the array
                            }
                        }
                        break;
                    }

                    default: {
                        throw new Error('Ignoring Unknown Update: ' + JSON.stringify(update))
                    }
                }
            }
        }

        //we've successfully applied the update
        self.object = objectCopy;
        updates++;

        return self;
    };
}

module.exports.FactomObject = FactomObject;