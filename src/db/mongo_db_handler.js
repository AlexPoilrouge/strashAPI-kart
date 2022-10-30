
const {MongoClient}= require('mongodb')

let hereLog= (...args) => {console.log("[kart - DBHandler] ", ...args);};

class MongoDB_client_handler{
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
        return (Boolean(this._client) && Boolean(this._client.db))? this._client.db(database) : undefined;
    }
}

class MongoDB_database_handler{
    constructor(client_handler, database){
        this._client_handler= client_handler

        this._databasename= database
        this._db= this._client_handler.db(database)
    }

    get client_handler() {
        return this._client_handler
    }

    get db() {
        if (!Boolean(this._db)){
            this._db=
                (Boolean(this._databasename))? 
                    this._client_handler.db(this._databasename)
                :   undefined
        }
        return this._db
    }

    getNextSequence(tablename) {
        console.log(">0 "+this._databasename)
        let counter_collec= this.db.collection("counters")
        if (!Boolean(counter_collec)) return undefined;

        console.log(">1"+(typeof counter_collec))
        return counter_collec.findOneAndUpdate(
            {_id: tablename}, {$inc: {seq_number: 1}},
            {upsert: true}
        ).then(result => {
                if (!Boolean(result) || !Boolean(result.value)){
                    throw { status: "db_id_update", error: "bad result while handling id updates"}
                }
                else{
                    return result.value.seq_number + 1
                }         
            }
        ).catch(err => {
            throw { status: "db_id_update", error: "error while handling id updates"}
        });
    }

    insertOneInCollectionWithIDIncrement(collecname, obj){
        return this.getNextSequence(collecname).then( seq_id => {
            let n_obj= obj
            n_obj._id= seq_id
            hereLog(`[insertOne] in "${collecname}" inserting "${JSON.stringify(obj)} under id ${seq_id}"`)
            return this.db.collection(collecname).insertOne(
                n_obj
            )
        })
    }

    connect(){
        return this._client_handler.connect()
    }

    get connected(){
        return this._client_handler.connected
    }
}



module.exports.MongoDB_client_handler= MongoDB_client_handler;
module.exports.MongoDB_database_handler= MongoDB_database_handler;