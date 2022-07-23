
const { MongoDB_handler } = require("./mongo_db_handler")




class StrashKartDB_handler extends MongoDB_handler {
    constructor(strashDB_config){
        super(strashDB_config.username, strashDB_config.password, strashDB_config.host)
        try{
            this._db= strashDB_config.databases[0].name;
        }
        catch(e){
            this._db= "strashbotkarting_db";
        }
    }

    db(){
        return super.db(this._db);
    }
}

module.exports.StrashKartDB_handler= StrashKartDB_handler;
