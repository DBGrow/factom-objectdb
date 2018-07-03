var allfields = {
    addfields: false, //can new fields be added to this object
    deletefields: false, //fields be removed from this object
    editfields: false, //fields be edited in this object
    renamefields: false, //fields be renamed in this object
    maxupdates: 200, //this object will be considered locked after x number of valid updates

    //encryption
    signed: false, //require updates to this chain to be signed
    keys: ['pubkey1'],

    fields: {}
};

this.Builder = function Builder(rules) {
    const self = this;
    //defaults

    this.rules = {};


    //pull from rules object if available
    if (rules) {

        self.rules.editfields = rules.editfields ? rules.editfields : true;
        self.rules.addfields = rules.addfields ? rules.addfields : true;
        self.rules.deletefields = rules.deletefields ? rules.deletefields : true;
        self.rules.renamefields = rules.renamefields ? rules.renamefields : true;
        self.rules.fields = rules.fields ? rules.fields : undefined;

        self.rules.maxupdates = rules.maxupdates ? rules.maxupdates : undefined;
        self.rules.signed = rules.signed ? rules.signed : undefined;
        self.rules.keys = rules.keys ? rules.keys : undefined;

    } else {
        //set defaults

        self.rules.editfields = true;
        self.rules.addfields = true;
        self.rules.deletefields = true;
        self.rules.renamefields = true;
    }

    this.setEditFields = function (editfields) {
        self.rules.editfields = editfields;
        return this;
    };

    this.setAddFields = function (addfields) {
        self.rules.addfields = addfields;
        return this;
    };

    this.setDeleteFields = function (deletefields) {
        self.rules.deletefields = deletefields;
        return this;
    };

    this.setRenameFields = function (renamefields) {
        self.rules.renamefields = renamefields;
        return this;
    };

    this.setMaxUpdates = function (maxupdates) {
        self.rules.maxupdates = maxupdates;
        return this;
    };

    this.setSigned = function (signed) {
        self.rules.signed = signed;
        return this;
    };

    this.setKeys = function (keys) {
        self.rules.keys = keys;
        return this;
    };
    this.addFieldRule = function (field, rule) {
        //validate fields and throw
        if (!self.rules.fields) self.rules.fields = {};
        self.rules.fields[field] = rule;
        return this;
    };

    this.build = function () {
        return self.rules
    };

    //check types of rules & validate
    Object.keys(this.rules).forEach(function (key, index) {
        if (allfields[key] && rules[key] != typeof allfields[key]) throw new Error("Type mismatch for key " + key);
    });

    return this;
};

this.validate = function (object, rules) {
//check if all fields defined in rules are in object
    for (var key in rules.fields) {
        if (rules.fields.hasOwnProperty(key)) {
            if (!object[key]) {
                console.error('Object did not have key specified in rules: ' + key);
                return false;
            }
        }
    }
    return true;
};

module.exports = this;