
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

const _errHandle= require("../kart_util")._errHandle

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
            throw {
                status: "no_id",
                error: "can't find clip without id"
            }
        }
        if(result.response){
            return strash_db_handler.db.collection(clip_collection).findOne( {_id: id}, {projection: {_id: 0} } );
        }
        else throw _errHandle(err, e => { return {status: 'db_connect_error' ,error: "can't connect to DataBase (connection refused)"} });
    }).catch( err => {
        throw _errHandle(err, e => { return {
            status: "db_connect_error",
            error: `can't connect to DataBase (connection error) - ${e}`
        } });
    });
}

function getClipPage(perPage=32, pageNum=1){
    let pp= (perPage>512)?512:((perPage<=0)?1:perPage);
    let pn= (pageNum<=0)?1:pageNum;

    return check_connect().then(async result => {
        if(result.response){
            let collection= strash_db_handler.db.collection(clip_collection);
            let count= await collection.estimatedDocumentCount();

            pageTotal= Math.ceil((count<0)?0:(count/pp));

            return collection.find({}, {projection: {_id: 1, submitter_id: 0}})
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
        else throw {status: "db_connect_error", error: "can't connect to DataBase (connection refused)"}
    }).catch( err => {
        throw _errHandle(err, e => { 
            return {
                status: "db_connect_error",
                error: `can't connect to DataBase (connection error) - ${e}`
            } } 
        );
    });
}

function getClipTypeFromURL(url){
    fn= (regex ,str_if_match, next= null) => {
        return (str => {
            return (Boolean(str) && Boolean(str.match(regex))?
                            str_if_match
                        :   (Boolean(next)?next(str):null)
                    )
            }
        ) 
    };

    return  fn(/^https?\:\/\/(w{3}\.)?.+\..{1,8}\/.*\.gif$/, 'gif',
                fn(/^https?\:\/\/(w{3}\.)?.+\..{1,8}\/.*\.((webm)|(mp4)|(ogg))$/, 'video',
                    fn(/^https?\:\/\/(w{3}\.)?((youtube\.com.*(\?v=|\/embed\/))|(youtu\.be\/))(.{11})$/, 'youtube',
                        fn(/^https?\:\/\/(w{3}\.)?streamable\.com\/(.*)?$/, 'streamable.com')
                    )
                )
            )(url);
}

function findClipFromUrl(url){
    if (url.length<=0) return new Promise((res,rej)=>{rej({status: 'empty_url_param'});})

    return check_connect().then( result => {
        if(result.response){
            var type= undefined;
            if(!Boolean(type=getClipTypeFromURL(url))) throw {status: 'bad_clip_url', error: `unkown type - ${err}`}

            if(type==='youtube'){
                var yt_id= url.match(/^https?\:\/\/(w{3}\.)?((youtube\.com.*(\?v=|\/embed\/))|(youtu\.be\/))(.{11})$/)[6]
                return strash_db_handler.db.collection('clips').findOne( {url: {$regex: RegExp(`${yt_id}/*$`) }, type} )
            }
            else{
                var search_str= url.match(/^https?\:\/\/(www\.)?(.*)$/)[2]
                var search_regex= RegExp(`'^https?://(www\\.)?${search_str}/*$`)
                return strash_db_handler.db.collection('clips').findOne( {url: {$regex: search_regex }, type} )
            }
        }
        else throw _errHandle(err, e => { 
            return {status: 'db_connect_error', error: `can't connect to DataBase (connection refused) - ${e}`}
        });
    });
}

async function insertClip(url, submitter_id, description, timestamp){
    var type= null;
    if(!Boolean(type=getClipTypeFromURL(url))) throw {status: 'bad_clip_url', error: `unhandled url type`}

    var find_existing_clip= undefined
    try{
        var search_clip_res= await findClipFromUrl(url)
        if (Boolean(search_clip_res)){
            find_existing_clip= search_clip_res
        }
    }
    catch(err){
        find_existing_clip= undefined
    }
    
    if(Boolean(find_existing_clip)) {
        throw {
            status: 'clip_exists', error: `matching url cli '${url}' already in database`,
            resource: `/clip/${find_existing_clip._id}` 
        }
    }

    if(!Boolean(submitter_id.match(/^[0-9]{15,21}$/))){
        throw {status: 'bad_submitter_id', error: "id not matching expected format"}
    }
    return check_connect().then(async result => {
        if(result.response){
            return strash_db_handler.insertOneInCollectionWithIDIncrement(clip_collection,
                    {type, url, timestamp, description, submitter_id, thumbnail:""}
                ).then(resultObj => {
                    return resultObj;
                }).catch(err =>{
                    throw _errHandle(err, e => { 
                        hereLog(`[clip insert - insert one] Insertion error - ${err}`)
                        return {status: 'clip_insert_erro', error: "couldn't insert clip (insertion error)"}
                    });
                });
        }
        else throw _errHandle(err, e => { 
            return {status: 'db_connect_error', error: `can't connect to DataBase (connection refused) - ${e}`}
        });
    })
}

function editClip(clipId, description, submitter_id=undefined){
    return check_connect().then( result => {
        if(result.response){
            var query= { _id: clipId }
            if (Boolean(submitter_id)){
                query.submitter_id= submitter_id
            }
            hereLog(`[editClip] query be like ${JSON.stringify(query)}`)

            return strash_db_handler.db.collection('clips').findOneAndUpdate(
                query,
                { $set: { description } },
                { returnDocument: 'after' }
            ).then( resultObj => {
                if (Boolean(resultObj) && Boolean(resultObj.ok)){
                    if (Boolean(resultObj.value))
                        return resultObj.value
                    else
                        throw { status: 'no_update_result', error: `update on clip ${clipId} failed: no access or doesn't exist`}
                }
                else{
                    throw { status: 'update_result_not_found', error: `couldn't find clip ${clipId} to update` }
                }
            })
            .catch(err => {
                throw _errHandle(err, e => {
                    return {status: 'internal_error', err: e}
                })
            });
        }
        else throw _errHandle(err, e => { 
            return {status: 'db_connect_error', error: `can't connect to DataBase (connection refused) - ${e}`}
        });
    })
}

function deleteClip(clipId, submitter_id=undefined){
    return check_connect().then( result => {
        if(result.response){
            var query= { _id: clipId }
            if (Boolean(submitter_id)){
                query.submitter_id= submitter_id
            }

            return strash_db_handler.db.collection('clips').findOneAndDelete(
                query
            ).then( resultObj => {
                if (Boolean(resultObj) && Boolean(resultObj.ok)){
                    if (Boolean(resultObj.value)){
                        return resultObj.value
                    }
                    else{
                        throw { status: 'delete_bad_result', error: `couldn't delete clip ${clipId}: either not found, or no access` }
                    }
                }
                else{
                    throw { status: 'delete_clip_not_found', error: `couldn't find clip ${clipId} to delete` }
                }
            })
        }
        else throw _errHandle(err, e => { 
            return {status: 'db_connect_error', error: `can't connect to DataBase (connection refused) - ${e}`}
        });
    })
}

function API_requestClipById(req, res){
    return getClipById(Number(req.params.clipId))
        .then( clip => {
            if(!Boolean(clip)){
                //turns out 204 is a special status that corresponds to 'No Content'
                res.status(404).send();
            }
            else{
                res.status(200).send(clip);
            }
        }).catch(err => {
            hereLog(`Error  with query to strashbot DB - status: ${err.status} - ${err.error}`)
            res.status(500).send({status: "internal_query_error"});
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
            res.status(204).send({status: "no_clip_to_show"});
        }
        else{
            res.status(200).send(resultObj);
        }
    }).catch(err => {
        hereLog(`Error with query to strashbot DB - status: ${err.status} - ${err.error}`);
        res.status(500).send({status: "internal_query_error"});
    });
}

function _get_submitter_id_from_auth_body(req_body){
    hereLog("getting submitter id from req body")
    if(!Boolean(req_body)){
        return undefined
    }
    else if( Boolean(req_body.decoded && req_body.decoded.auth) ){
        let auth_role= req_body.decoded.auth.role
        let auth_id= req_body.decoded.auth.id
        let subm_id= req_body.submitter_id
        if(auth_role==="DISCORD_USER"){
            return auth_id
        }
        else if (auth_role==="ADMIN"){
            return (Boolean(subm_id))? subm_id : auth_id
        }
    }
    else return req_body.submitter_id
}

const addClipThumbnail= require("./clip_thumbnail").addClipThumbnail

function API_requestInsertClip(req, res){
    var { url, description, timestamp }= req.body

    var submitter_id= _get_submitter_id_from_auth_body(req.body)

    if(!(Boolean(url) && Boolean(submitter_id))){
        hereLog(`[insert clip request] missing parameters from body (submitter id: '${submitter_id}')…`)
        res.status(400).send(
            {   
                status: 'bad_request',
                error: `missing parameters - ${Boolean(url)?"":`url - `} ${Boolean(submitter_id)?"":"submitter_id"}`
            }
        );

        return
    }
    description= Boolean(description)?description:"";
    timestamp= Boolean(timestamp)?new Date(timestamp):(new Date());

    hereLog(`[insert clip request] gonna insert clip\n\t${JSON.stringify(req.body)}`)

    return insertClip(url, submitter_id, description, timestamp).then( resultObj => {
        if(Boolean(resultObj) && Boolean(resultObj.insertedId)) {
            res.status(200).send(resultObj)

            addClipThumbnail(resultObj.insertedId, {dbHandler: strash_db_handler, collection: clip_collection})
        }
        else{
            hereLog(`Error with insert clip query result in strashbot DB - bad result: ${JSON.stringify(resultObj)}`)
            res.status(500).send({status: "internal_error"});
        }
    }).catch(err => {
        if (Boolean(err.status)) {
            hereLog(`Error with insert clip query to strashbot DB - status: ${err.status} - ${err.error}`)
            if ((err.status==='bad_clip_url'))
                res.status(440).send(err)
            else if(err.status==='bad_submitter_id'){
                res.status(441).send(err)
            }
            else if (err.status==='clip_exists'){
                if (Boolean(err.resource)) res.location(err.resource)
                res.status(409).send({err})
            }
            else{
                res.status(500).send({status: "internal_query_error"});
            }
        }
        else{
            hereLog(`Error trying to insert clip query in strashbot DB - ${err}`)
            res.status(500).send({status: "internal_error"});
        }
    });
}

function API_requestEditClip(req, res){
    // res.status(403).send({status: "not_implemented"})
    var { description }= req.body
    var clipId= Number(req.params.clipId)
    hereLog(`dnzajdhnezf body: ${JSON.stringify(req.body)}`)
    var submitter_id= _get_submitter_id_from_auth_body(req.body)
    let role= Boolean(req.body.decoded && req.body.decoded.auth)? req.body.decoded.auth.role : undefined
    submitter_id= 
        ( Boolean(role)
            && role==="ADMIN"
        )   ?   undefined
            :   submitter_id;
    
    if(!(Boolean(description) && (Boolean(submitter_id) || role==="ADMIN") && Boolean(clipId))){
        hereLog(`[edit clip request] missing parameters`)
        res.status(400).send(
            {   
                status: 'bad_request',
                error: `missing parameters - ${Boolean(description)?"":`body.description - `} ${Boolean(submitter_id)?"":"body.submitter_id -"} ${Boolean(clipId)?"":"params.clipId"}`
            }
        );
    }
    else{
        hereLog(`editClip('${clipId}','${description}','${submitter_id}'`)
        editClip(clipId, description, submitter_id).then( resultObj => {
            res.status(200).send({
                status: 'updated',
                result: resultObj
            })
        }).catch( err => {
            if (Boolean(err) && Boolean(err.status)){
                if (err.status==="update_result_not_found" || err.status==="no_update_result"){
                    res.status(404).send(err)
                }
                else{
                    hereLog(`[APIrequestClip] error (1) - ${JSON.stringify(err)}`)
                    res.status(500).send({status: "internal_query_error"});
                }
            }
            else{
                hereLog(`[APIrequestClip] error (2) - ${err}`)
                res.status(500).send({status: "internal_query_error"});
            }
        })
    }
}


const removeClipThumbnail= require("./clip_thumbnail").removeClipThumbnail

function API_requestDeleteClip(req, res){
    // res.status(403).send({status: "not_implemented"})
    var clipId= Number(req.params.clipId)
    var submitter_id= _get_submitter_id_from_auth_body(req.body)
    let role= Boolean(req.body.decoded && req.body.decoded.auth)? req.body.decoded.auth.role : undefined
    submitter_id= 
        ( Boolean(role)
            && role==="ADMIN"
        )   ?   undefined
            :   submitter_id;
    
    if(!((Boolean(submitter_id) || role==="ADMIN") && Boolean(clipId))){
        hereLog(`[insert clip request] missing parameters`)
        res.status(400).send(
            {   
                status: 'bad_request',
                error: `missing parameters - ${Boolean(submitter_id)?"":"body.submitter_id -"} ${Boolean(clipId)?"":"params.clipId"}`
            }
        );
    }
    else{
        deleteClip(clipId, submitter_id).then( resultObj => {
            res.status(200).send({
                status: 'deleted',
                result: resultObj
            })
            hereLog(`deleteClip - deleted clip ${clipId}`)

            removeClipThumbnail(clipId)
        }).catch( err => {
            if (Boolean(err) && Boolean(err.status)){
                if (err.status==="delete_clip_not_found" || err.status==="delete_bad_result"){
                    res.status(404).send(err)
                }
                else{
                    hereLog(`[APIrequestClip] error - ${JSON.stringify(err)}`)
                    res.status(500).send({status: "internal_query_error"});
                }
            }
            else{
                hereLog(`[APIrequestClip] error - ${JSON.stringify(err)}`)
                res.status(500).send({status: "internal_query_error"});
            }
        })
    }
}


module.exports= {API_requestClipById, API_requestClipsPages, API_requestInsertClip, API_requestEditClip, API_requestDeleteClip};
