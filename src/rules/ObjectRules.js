var allfields = {
    addfields: false, //can new fields be added to this object
    lockat: 1527211591, //this object will be considered locked at this timestamp. No further entries will be valid
    maxupdates: 200, //this object will be considered locked after x number of updates

    //encryption
    signed: false, //require updates to this chain to be signed
    length: ['pubkey1'],

    fields: {
        a: { //field name
            type: 'string', //type of the field
            editable: false, //can the value be edited
            delete: false, //can it be deleted
            rename: false, //can it be renamed
            length: 100, //what is it's maximum length(bytes)?
        },
        b: {
            type: 'array',
            editable: false,
            delete: false,
            rename: false,
            length: 10, //what is it's maximum length(elements)?
        }
    }
};

this.Builder = function Builder(rules) {
    const self = this;
    //defaults

    this.rules = {};


    //pull from rules object if available
    if (rules) {
        self.rules.addfields = rules.addfields ? rules.addfields : undefined;
        self.rules.lockat = rules.lockat ? rules.lockat : undefined;
        self.rules.maxupdates = rules.maxupdates ? rules.maxupdates : undefined;
        self.rules.signed = rules.signed ? rules.signed : undefined;
        self.rules.length = rules.length ? rules.length : undefined;
        self.rules.fields = rules.fields ? rules.fields : undefined;
    }

    this.setAddFields = function (addfields) {
        self.rules.addfields = addfields;
        return this;
    };

    this.setLockAt = function (lockat) {
        self.rules.lockat = lockat;
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
    this.setPubKeys = function (pubkeys) {
        self.rules.length = length;
        return this;
    };
    this.setFieldRule = function (field, rule) {
        //validate fields and throw
        if (!self.rules.fields) self.rules.fields = {};
        self.rules.fields[field] = rule;
        return this;
    };

    this.build = function () {
        return self.rules
    };

    var allRulesAndTypes = {
        addfields: 'boolean',
        lockat: 'number',
        maxupdates: 'number',
        signed: 'boolean',
        length: 'array',
        fields: 'object'
    };

    //check types of rules & validate
    Object.keys(this.rules).forEach(function (key, index) {
        if (allfields[key] && rules[key] != typeof allfields[key]) throw new Error("Type mismatch for key " + key);
    });

    return this;
};

module.exports = this;