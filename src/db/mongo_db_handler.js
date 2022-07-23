
const {MongoClient}= require('mongodb')

let hereLog= (...args) => {console.log("[kart - DBHandler] ", ...args);};

class MongoDB_handler{
    constructor(username, password, host){
        this._uri= `mongodb://${username}:${password}`
                + `@${host}:27017`;
        hereLog(`URI: ${this._uri}`)
        this._connected=false;
    }

    connect(){
        this._client= new MongoClient(this._uri);

        let _t= this;
        return this._client.connect().then( client => {
            _t._connected=true;
            hereLog(`Connected to mongodb`);
            return client;
        })
        .catch(err => {
            hereLog(`Connection attempt failed - ${err}`)
            _t._connected= false;
            throw err;
        });
    }

    get connected(){ return this._connected;}

    db(database=undefined){
        return this._client.db(database);
    }


}



module.exports.MongoDB_handler= MongoDB_handler;