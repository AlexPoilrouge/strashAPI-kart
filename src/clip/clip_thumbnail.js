
const clips_config= require("../../config/clips.json")
const config= require("../../config/config.json")

const path = require("path");

const util_exec_sh= require("../kart_util").execute_sh_command



let hereLog= (...args) => {console.log("[kart - clips - thumb]", ...args);};

const thumbnail_directory="."

function _extractVideoPlateformId(src_type, url){
    switch (src_type){
        case "youtube":
            return url.match(/((youtube\.com.*(\?v=|\/embed\/))|(youtu\.be\/))(.{11})/).pop()
        case "streamable.com":
            return url.match(/streamable\.com\/(.*)/).pop()
        default:
            return null
    }
}

function _getThumbGenerationCmd(id, url, options={}){
    var cmd= clips_config.thumbnail.command_template
    for (let opt in options){
        cmd= cmd.replace(`__${opt}__`, `${options[opt]}`)
    }
    cmd= cmd.replace(`__url__`, url)
    let resultFile= path.resolve(`${thumbnail_directory}/${id.jpg}`)
    cmd= cmd.replace(`__outfilename__`, resultFile)

    return {cmd, resultFile}
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


async function _generateThumbnailFromVideoUrl(id, url, options= {}){
    const cmd_resObj= _getThumbGenerationCmd(id, url, options)

    return util_exec_sh( cmd_resObj.cmd, 256000 ).then(res => {
        return check_connect().then( result => {
            if(result.response){
                var query= { _id: id}
    
                return strash_db_handler.db.collection('clips').findOneAndUpdate(
                    query,
                    { $set: { thumbnail: `http://${config.api.HOST}/${clips_config.thumbnail.thumb_root_dir}/${path.basename(cmd_resObj.resultFile)}` } },
                    { returnDocument: 'after' }
                ).then( resultObj => {
                    if (Boolean(resultObj) && Boolean(resultObj.ok)){
                        if (Boolean(resultObj.value))
                            return {
                                status: "new_thumb",
                                result: resultObj.value
                            }
                        else
                            throw { status: 'no_update_result', error: `update on clip ${clipId} failed: no access or doesn't exist`}
                    }
                    else{
                        throw { status: 'update_result_not_found', error: `couldn't find clip ${clipId} to update` }
                    }
                })
            }
            else throw _errHandle(err, e => { 
                return {status: 'db_connect_error', error: `can't connect to DataBase (connection refused) - ${e}`}
            });
        })
    })
}


async function generateThumbnailFromClip(clipID){
    if (!Boolean(clipObj && clipObj._id && clipObj.url && clipObj.type)){
        hereLog(`Failure at generating new thumbnail... incomplete clip object`)
        return {status: 'error', error: 'incomplete clip object'}
    }

    check_connect().then((result) =>{
        if (!Boolean(id)){
            throw {
                status: "no_id",
                error: "can't find clip without id"
            }
        }
        if(result.response){
            strash_db_handler.db.collection(clip_collection).findOne( {_id: clipID} ).then(clip =>{
                if (clip.type==='youtube'){
                    let id= _extractVideoPlateformId(clip.type, clip.url)
                    if (Boolean(id)){
                        return {status: 'ok', url: `https://img.youtube.com/vi/${id}/0.jpg`}
                    }
                    else{
                        throw {status: 'error', error: 'unable to extract id from video url'}
                    }    
                }
                else if (clip.type==='streamable'){
                    let id= _extractVideoPlateformId(clip.type, clip.url)
                    if (Boolean(id)){
                        return {status: 'ok', url: `https://cdn-cf-east.streamable.com/image/${id}.jpg`}
                    }
                    else{
                        throw {status: 'error', error: 'unable to extract id from video url'}
                    }
                }
                else if(Boolean(clip.type)){
                    let options={
                        sectime: 0,
                        framenum: 1,
                        outsize: "-1:384"
                    }
            
                    return _generateThumbnailFromVideoUrl(clip._id, clip.url, options).then( res => {
                        if (res.status==="new_thumb"){
                            hereLog(`new thumbnail generated: `)
                            return res
                        }
                    })
                    .catch(err => {
                        hereLog(`Failure at generating new thumbnail... - Status: ${err.status} - Error: ${err.error}`)
                        throw err;
                    })
                }
                else{
                    hereLog(`Failure at generating new thumbnail... bad clip object, no type?!`)
                    throw {status: "no_clip_type", error: "bad clip object, no type?!"}
                }
            })
        }
        else{
            hereLog(`couldn't generate thumbnail beacause of unfound id...`)
            throw {status: 'error', error: "can't find clip from id"}
        }
    }).catch(err => {
        hereLog(`Error generating clip thumbnail - ${err.status} - ${err.error}`)
    })
}

module.exports= {generateThumbnailFromClip}
