var allRules = {
    type: 'string', //type of the field
    editable: false, //can the value be edited
    deletable: false, //can it be deleted
    renameable: false, //can it be renamed
    length: 100, //what is it's maximum length of the string/array?
};

this.Builder = function Builder(rules) {
    const self = this;
    //defaults

    this.rules = {};


    //pull from rules object if available
    if (rules) {
        self.rules.type = rules.type ? rules.type : undefined;
        self.rules.editable = rules.editable ? rules.editable : undefined;
        self.rules.deletable = rules.deletable ? rules.deletable : undefined;
        self.rules.renameable = rules.renameable ? rules.renameable : undefined;
        self.rules.length = rules.length ? rules.length : undefined;
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
    this.setLength = function (length) {
        //validate fields and throw
        self.rules.length = length;
        return this;
    };

    this.build = function () {
        return self.rules
    };

    //check types of rules & validate
    Object.keys(self.rules).forEach(function (key, index) {
        console.log(key+' : '+allRules[key])
        if (allRules[key] && typeof self.rules[key] != typeof allRules[key]) throw new Error("Type mismatch for key " + key);
    });

    return this;
};

module.exports = this;