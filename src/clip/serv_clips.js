
const { StrashKartDB_handler }= require("../db/strashkart_db_handler")


const mongo_config= require("../../config/mongodb/mongodb.json");


let strash_db_handler= new StrashKartDB_handler(mongo_config);




let clip_collection= (
    ( Boolean(mongo_config.databases[0]) && Boolean(mongo_config.databases[0].collections) &&
        Boolean(mongo_config.databases[0].collections.clips)
    )?      mongo_config.databases[0].collections.clips
        :   "clips"
);

let hereLog= (...args) => {console.log("[kart - clips]", ...args);};

function check_connect(){
    if(!strash_db_handler.connected){
        return strash_db_handler.connect().then( client => {
            return {response: true, client};
        })
        .catch( err => {
            throw {response: false, client: strash_db_handler, error: err};
        });
    }
    return new Promise((res, rej) => {
        res({response: true, client: strash_db_handler})
    })
}

function getClipById(id){
    return check_connect().then((result) =>{
        if (!Boolean(id)){
            throw {status: "can't find clip without id"}
        }
        if(result.response){
            return strash_db_handler.db().collection(clip_collection).findOne( {id}, {projection: {_id: 0} } );
        }
        else throw {status: "can't connect to DataBase (connection refused)"}
    }).catch( err => {
        throw {status: "can't connect to DataBase (connection error)", error: err.error}
    });
}


function API_requestClipById(req, res){
    return getClipById(Number(req.params.clipId))
        .then( clip => {
            if(!Boolean(clip)){
                //turns out 204 is a special status that corresponds to 'No Content'
                //  and wont return a body, ever.
                res.status(204).send();
            }
            else{
                res.status(200).send(clip);
            }
        }).catch(err => {
            hereLog(`Error  with query to strashbot DB - status: ${err.status} - ${err.error}`)
            res.status(400).send({status: "internal query error"})
        })
}


module.exports.API_requestClipById= API_requestClipById;
