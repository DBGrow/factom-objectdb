const axios = require('axios');

class ClientBuilder {
    constructor(dbId) {
        this.dbId = dbId;
    }

    host(host) {
        this.host = host;
        return this;
    }

    port(port) {
        this.port = port;
        return this;
    }

    build() {
        return new Client(this);
    }
}

class Client {
    constructor(builder) {
        if (!builder instanceof ClientBuilder) throw new Error('Must construct client with object of type ClientBuilder');
        this.host = builder.host | 'localhost';
        this.port = builder.port | 3000;
        this.dbId = builder.dbId;
    }

    async getObject(id) {
        const response = await axios.get('http://' + this.host + ':' + this.port + '/api/v1/db/' + encodeURIComponent(this.dbId) + '/object/' + encodeURIComponent(id));
        console.log(response.status, response.data);
        return response.data;
    }

    async findObject(query) {
        const response = await axios(
            {
                method: 'get',
                url: 'http://' + this.host + ':' + this.port + '/api/v1/db/' + encodeURIComponent(this.dbId) + '/object',
                params: {
                    query: query
                }
            }
        );

        return response.data;
    }

    async findObjects(query) {
        const response = await axios(
            {
                method: 'get',
                url: 'http://' + this.host + ':' + this.port + '/api/v1/db/' + encodeURIComponent(this.dbId) + '/objects',
                params: {
                    query: query
                }
            }
        );
        return response.data;
    }

    async commitObject(id, object, rules) {
        const response = await axios(
            {
                method: 'post',
                url: 'http://' + this.host + ':' + this.port + '/api/v1/db/' + encodeURIComponent(this.dbId) + '/object/' + encodeURIComponent(id),

                params: {
                    rules: rules
                },
                data: object
            }
        );
        return response.data;
    }

    async commitObjectUpdate(id, update) {
        const response = await axios(
            {
                method: 'patch',
                url: 'http://' + this.host + ':' + this.port + '/api/v1/db/' + encodeURIComponent(this.dbId) + '/object/' + encodeURIComponent(id),
                data: update
            }
        );
        return response.data;
    }
}

module.exports.ClientBuilder = ClientBuilder;