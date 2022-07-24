
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

let _errHandle= (err, fallbackFn) =>    {  if((Boolean(err)) && Boolean(err.status)) return err;
                                            else return fallbackFn(err);
                                        }

function check_connect(){
    if(!strash_db_handler.connected){
        return strash_db_handler.connect().then( client => {
            return {response: true, client};
        })
        .catch( err => {
            throw _errHandle(err, (e) => { return {response: false, client: strash_db_handler, error: err} } );
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
        else throw _errHandle(err, e => { return {status: "can't connect to DataBase (connection refused)"} });
    }).catch( err => {
        throw _errHandle(err, e => { return {status: "can't connect to DataBase (connection error)", error: e} });
    });
}

function getClipPage(perPage=32, pageNum=1){
    let pp= (perPage>512)?512:((perPage<=0)?1:perPage);
    let pn= (pageNum<=0)?1:pageNum;

    return check_connect().then(async result => {
        if(result.response){
            let collection= strash_db_handler.db().collection(clip_collection);
            let count= await collection.estimatedDocumentCount();

            pageTotal= Math.ceil((count<0)?0:(count/pp));

            return collection.find({}, {projection: {_id: 0, submitter_id: 0}})
                            .limit(pp)
                            .skip(pp*(pn-1))
                            .toArray()
                        .then( array => {
                            return {page: pn, perPage: pp, totalPages: pageTotal, availableClipsCount: count, clips: array}
                        }).catch( err => {
                            hereLog(`[getClipPage] error fetching result array - ${err}`)
                            throw {status: "bad query results processing", error: err};
                        });
        }
        else throw {status: "can't connect to DataBase (connection refused)"}
    }).catch( err => {
        throw _errHandle(err, e => { return {status: "can't connect to DataBase (connection error)", error: e} } );
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
            res.status(400).send({status: "internal query error"});
        })
}

function API_requestClipsPages(req, res){
    var { perPage, pageNum }= req.query
    perPage= Number(perPage);
    pageNum= Number(pageNum);
    perPage= (isNaN(perPage))?32:perPage;
    pageNum= (isNaN(pageNum))?1:pageNum;


    return getClipPage(perPage, pageNum).then(resultObj => {
        if((!Boolean(resultObj.clips)) || resultObj.clips.length<=0){
            res.status(204).send();
        }
        else{
            res.status(200).send(resultObj);
        }
    }).catch(err => {
        hereLog(`Error with query to strashbot DB - status: ${err.status} - ${err.error}`);
        res.status(400).send({status: "internal query error"});
    });
}


module.exports.API_requestClipById= API_requestClipById;
module.exports.API_requestClipsPages= API_requestClipsPages;
