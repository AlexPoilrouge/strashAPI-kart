
const clips_config= require("../../config/clips.json")
const config= require("../../config/config.json")

const path = require("path");
const fsPromises= require("fs/promises")

const { Check_Connect }= require("../db/mongo_db_handler")

const util_exec_sh= require("../kart_util").execute_sh_command



const _errHandle= require("../kart_util")._errHandle



let hereLog= (...args) => {console.log("[kart - clips - thumb]", ...args);};



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
    let resultFile= path.resolve(`${options.out_thumb_dirpath}/${id}.jpg`)
    cmd= cmd.replace(`__outfilename__`, resultFile)

    return {cmd, resultFile}
}



async function _generateThumbnailFromVideoUrl(id, url, options= {}){
    const cmd_resObj= _getThumbGenerationCmd(id, url, options)

    return fsPromises.mkdir(path.resolve(`${options.out_thumb_dirpath}`), {recursive: true, mode:'0755'})
        .then(() => {
            return util_exec_sh( cmd_resObj.cmd, 256000 ).then(res => {
                return {
                    status: 'ok',
                    url: `http${Boolean(config.api.HAS_HTTPS)?'s':''}://${config.api.HOST}/kart/${clips_config.thumbnail.http_thumb_root_dirname}/${path.basename(cmd_resObj.resultFile)}`
                }
            }).catch(err => {
                hereLog(`[thumb_from_url] error generating thumb from vid url '${url}'`)
                return {status: 'thumb_gen_fail', error: `Thmub gen cmd failed: '${cmd_resObj.cmd}' - ${err.status} - ${err.error}`}
            })
        }).catch(err => { hereLog(`[from_url] Error creating dir '${options.out_thumb_dirpath}' - ${err}`)})
}


async function generateThumbnailFromClip(clipID, collectionDBHandle){
    return Check_Connect(collectionDBHandle.dbHandler).then((result) =>{
        if (!Boolean(clipID)){
            throw {status: "no_id", error: "can't find clip without id"};
        }
        if(result.response){
            return collectionDBHandle.dbHandler.db.collection(collectionDBHandle.collection).findOne( {_id: clipID} ).then(clip =>{
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
                        outsize: "-1:384",
                        out_thumb_dirpath: `${clips_config.thumbnail.thumb_dirpath}`
                    }

                    return _generateThumbnailFromVideoUrl(clip._id, clip.url, options)
                }
                else{
                    hereLog(`Failure at generating new thumbnail... bad clip object, no type?!`)
                    throw {status: "no_clip_type", error: "bad clip object, no type?!"}
                }
            }).catch(err => { hereLog(`Error invoking thumbnail generating command - ${err.status} - ${err.error}`);})
        }
        else{
            hereLog(`couldn't generate thumbnail beacause of unfound id...`)
            throw {status: 'error', error: "can't find clip from id"}
        }
    }).catch(err => {
        hereLog(`Error generating clip thumbnail - ${err.status} - ${err.error}`)
    })
}

async function addClipThumbnail(clipID, collectionDBHandle){
    generateThumbnailFromClip(clipID, collectionDBHandle).then(thumb_res => {
        if(thumb_res.status==='ok'){
            Check_Connect(collectionDBHandle.dbHandler).then( result => {
                if(result.response){
                    var query= { _id: clipID}
                    return collectionDBHandle.dbHandler.db.collection(collectionDBHandle.collection).findOneAndUpdate(
                        query,
                        { $set: { thumbnail: `${thumb_res.url}` } },
                        { returnDocument: 'after' }
                    ).then( resultObj => {
                        if (Boolean(resultObj) && Boolean(resultObj.ok)){
                            if (Boolean(resultObj.value)){
                                return {
                                    status: "new_thumb",
                                    result: resultObj.value
                                }
                            }
                            else
                                throw { status: 'no_update_result', error: `update on clip ${clipId} failed: no access or doesn't exist`}
                        }
                        else{
                            throw { status: 'update_result_not_found', error: `couldn't find clip ${clipId} to update` }
                        }
                    })
                    .catch( err => {
                        throw _errHandle(err, e => {
                            return {status: 'clip_lookup_for_thumb_fail', error: `couldn't locate clip ${clipID} in DB`}
                        })
                    })
                }
                else throw _errHandle(err, e => { 
                    return {status: 'db_connect_error', error: `can't connect to DataBase (connection refused) - ${e}`}
                });
            }).catch( err => {
                let f_err= _errHandle(err, e => {return {status: 'db_check_connect_error', error: `no connection to DB availabe - ${e}`}})
                hereLog(`${f_err.status} - ${f_err.error}`)
            })
        }
        else{
            hereLog(`Error generating thumbnail - ${thumb_res.status} - ${thumb_res.error}`)
        }
    })
    .catch(err => {
        hereLog(`Generating thumbnail failed - ${(Boolean(err.status))?`${err.status} - ${err.error}`:err}`)
    })
}

async function removeClipThumbnail(clipID){
    fsPromises.unlink(path.resolve(`${clips_config.thumbnail.thumb_dirpath}/${clipID}.jpg`)).then(ok => {
        hereLog(`[removeClipThumb] File for thumbnail of clip ${clipID} deleted.`)
    }).catch(err => {
        hereLog(`[removeClipThumb] Couldn't delete clip ${clipID}'s thumbnail: ${err}`)
    })
}

function setClipsThumbnailFileEntryPoint(app){
    hereLog(`[entrypoint] setting entry '/${clips_config.thumbnail.http_thumb_root_dirname}/:thumbnail'…`)
    app.get(`/${clips_config.thumbnail.http_thumb_root_dirname}/:thumbnail`, (req, res) => {
        try{
            thumbnail_path= `${path.resolve(`${clips_config.thumbnail.thumb_dirpath}`)}/${req.params.thumbnail}`

            res.sendFile(`${thumbnail_path}`, err => {
                if(err){
                    res.status(500).send({status: "internal_query_error"});
                    hereLog(`[thumbnail_get] error: ${err}`)
                }
                else{
                    hereLog(`[thumbnail_get] fetched ${thumbnail_path}…`)
                }
            })
        } catch(err){
            res.status(500).send({status: "internal_query_error"});
            hereLog(`[thumbnail_request] error: ${err}`)
        }
    })
}

module.exports= {addClipThumbnail, removeClipThumbnail, setClipsThumbnailFileEntryPoint}
