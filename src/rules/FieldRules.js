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
    if (rules) {
        self.rules.type = rules.type ? rules.type : undefined;

        self.rules.editable = rules.editable ? true : false;
        self.rules.deletable = rules.deletable ? true : false;
        self.rules.renameable = rules.renameable ? true : false;

        self.rules.min = rules.min ? rules.min : undefined;
        self.rules.max = rules.max ? rules.max : undefined;
    } else { //set defaults

        self.rules.editable = true;
        self.rules.deletable = true;
        self.rules.renameable = true;
    }

    this.setType = function (type) {
        self.rules.type = type;
        return this;
    };

    this.setEditable = function (editable) {
        self.rules.editable = editable;
        return this;
    };

    this.setDeletable = function (deletable) {
        self.rules.deletable = deletable;
        return this;
    };

    this.setRenameable = function (renameble) {
        self.rules.renameable = renameble;
        return this;
    };

    this.setMin = function (min) {
        //validate fields and throw
        self.rules.min = min;
        return this;
    };

    this.setMax = function (max) {
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