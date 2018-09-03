//all possible rules and default values
var allRules = {
    type: 'string', //type of the field
    editable: false, //can the value be edited
    deletable: false, //can the key be deleted
    renameable: false, //can the key be renamed
    min: 1, //minimum number value or array length
    max: 1, //max number value or array length
};

this.Builder = function Builder(rules) {
    const self = this;
    //defaults

    this.rules = {};

    //pull from rules object if available

    //defaults
    self.rules.editable = true;
    self.rules.deletable = true;
    self.rules.renameable = true;

    this.setType = function (type) {
        if (!['boolean', 'number', 'string', 'object', 'array'].includes(type)) throw new Error('Type must be [\'boolean\', \'number\', \'string\', \'object\', \'array\']');
        self.rules.type = type;
        return this;
    };

    this.setEditable = function (editable) {
        if (typeof editable !== 'boolean') throw new Error('Expected Boolean');
        self.rules.editable = editable;
        return this;
    };

    this.setDeletable = function (deletable) {
        if (typeof deletable !== 'boolean') throw new Error('Expected Boolean');
        self.rules.deletable = deletable;
        return this;
    };

    this.setRenameable = function (renameble) {
        if (typeof renameble !== 'boolean') throw new Error('Expected Boolean');
        self.rules.renameable = renameble;
        return this;
    };

    this.setMin = function (min) {
        if (typeof min !== 'number') throw new Error('Expected Number');
        //validate fields and throw
        self.rules.min = min;
        return this;
    };

    this.setMax = function (max) {
        if (typeof max !== 'number') throw new Error('Expected Number');

        //validate fields and throw
        self.rules.max = max;
        return this;
    };

    this.build = function () {
        return self.rules
    };

    //check types of rules & validate
    Object.keys(self.rules).forEach(function (key, index) {
        if (allRules[key] && typeof self.rules[key] != typeof allRules[key]) throw new Error("Type mismatch for key " + key);
    });

    //validate type option

    return this;
};

module.exports = this;