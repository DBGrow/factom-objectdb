var ObjectId = require('objectid');


function Object(object) {
    var self = this;

    if (!object) self.object = {_id: new ObjectId()};
    else self.object = object;

    //evaluate object for stringifyability

    self.get = function () {
        return self.object;
    };

    self.applyUpdate = function applyUpdate(update, callback) {
        //check for safety:

        //original object
        {
            fieldname:'hello'
        }

        //update to apply
        {
            $set:{
                fieldname:'kajsk'
            }
        }

        //result
        {
            fieldname:'kajsk'
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
                                //key = fruit_count
                                //fields_values[key] = 10
                                //gtfo if the key does not exist/has no value
                                if (!self.object[key]) throw new Error('Cannot multiply a field that does not exist: ' + key);
                                if (typeof self.object[key] !== 'number') throw new Error('Cannot multiply a field is not a number: ' + key);
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
                                self.object[key] = fields_values[key]; //set the value
                            }
                        }
                        break;
                    }
                    case '$unset': {
                        for (var key in fields_values) {
                            if (fields_values.hasOwnProperty(key)) {
                                delete self.object[key] //unset the value
                            }
                        }
                        break;
                    }

                    default: {
                        console.log('Unknown Update!: ' + op)
                    }
                }
            }
        }


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
    Object: Object
}