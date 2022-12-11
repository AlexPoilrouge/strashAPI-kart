
const { MongoDB_client_handler, MongoDB_database_handler } = require("./mongo_db_handler")




class StrashKartDB_handler extends MongoDB_database_handler {
    constructor(strashDB_config){
        let db_name= undefined
        try{
            db_name= strashDB_config.databases[0].name;
        }
        catch(e){
            db_name= "strashbotkarting_db";
        }

        super(
            new MongoDB_client_handler(
                    strashDB_config.username, strashDB_config.password,
                    strashDB_config.host, db_name),
            db_name
        )
    }
}

module.exports.StrashKartDB_handler= StrashKartDB_handler;
