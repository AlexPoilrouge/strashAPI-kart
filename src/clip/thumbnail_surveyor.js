
const fs= require('fs');
const path= require('path')

const cron= require('node-cron')

const {addClipThumbnail, removeClipThumbnail}= require('./clip_thumbnail')

const { Check_Connect }= require("../db/mongo_db_handler")

const thumbnails_dir= require('../../config/clips.json').thumbnail.thumb_dirpath

let thumb_add_queue= []
let thumb_del_queue= []



let hereLog= (...args) => {console.log("[kart - clips - thumb_survey]", ...args);};


async function check_for_missing_thumbnails(collectionDBHandle){
    hereLog(`[check] checking for missing thumbnails…`)
    thumb_add_queue= []

    await Check_Connect(collectionDBHandle.dbHandler).then(async result => {
        if(result.response){
            await collectionDBHandle.dbHandler.db.collection(collectionDBHandle.collection).find(
                {thumbnail: ""}
            ).toArray().then(array =>{
                for(var doc of array){
                    thumb_add_queue.push(doc._id)
                }
            }).catch(err => {
                hereLog(`Error locating ids for thumbnail adds in DB - ${err}`)
            })
        }
        else{
            hereLog("Could'nt connect to DB to look for missing thumbnail... (bad response)")
        }
    }).catch(err => {
        hereLog(`Could'nt connect to DB to look for missing thumbnail... - ${err}`)
    })
}

async function check_for_deletable_thumbnails(collectionDBHandle){
    hereLog(`[check] checking for orphan thumbnails…`)
    thumb_del_queue= []

    try{
        let thumb_files= fs.readdirSync(thumbnails_dir).filter(fn => Boolean(path.basename(fn).match(/[0-9]+\.(png|gif|jpg|jpeg|bmp)/)))

        var tmp_ids= []
        for(var t_f of thumb_files){
            try{
                tmp_ids.push(parseInt(path.basename(t_f).split('.')[0]))
            } catch(err){
                hereLog(`Couldn't extract id of '${t_f}' - ${err}`)
            }
        }

        await Check_Connect(collectionDBHandle.dbHandler).then(async result => {
            if(result.response){
                await collectionDBHandle.dbHandler.db.collection(collectionDBHandle.collection).find(
                    {_id: {$in: tmp_ids}}
                ).toArray().then(array =>{
                    thumb_del_queue= tmp_ids.filter(id => {return !Boolean(array.find(elmt => {return elmt._id===id}))})
                }).catch(err => {
                    hereLog(`Error locating ids for thumbnail del in DB - ${err}`)
                })
            }
            else{
                hereLog("Could'nt connect to DB to look for orphan thumbnail... (bad response)")
            }
        }).catch(err => {
            hereLog(`Could'nt connect to DB to look for orphan thumbnail... - ${err}`)
        })
    } catch(err){
        hereLog(`Couldn't read for thumbnail files... - ${err}`)
    }
}

async function missingThumbnailSurvey(collectionDBHandle){
    hereLog(`[worker] missing thumbnail survey…`)
    await check_for_missing_thumbnails(collectionDBHandle)

    for (id of thumb_add_queue){
        try{
            var conn_resp= await Check_Connect(collectionDBHandle.dbHandler)

            if(Boolean(conn_resp && conn_resp.response)){
                await collectionDBHandle.dbHandler.db.collection(collectionDBHandle.collection).findOne(
                    {_id: id}
                ).then(async clip_doc => {
                    hereLog(`[result] adding thumbnail for clip ${id}`)
                    await addClipThumbnail(id, collectionDBHandle)
                })
            }
            else{
                hereLog(`Could'nt connect to DB to generate for missing thumbnail... (bad response)`)
            }
        }
        catch(err){
            hereLog(`[missing_thumbnail_survey] error generating thumbnail for ${id} - ${err}`)
        }
    }
    hereLog("[add] done")
}

async function deletingOrphanThumbnails(collectionDBHandle){
    hereLog(`[worker] orphan thumbnail survey…`)
    await check_for_deletable_thumbnails(collectionDBHandle)

    for (id of thumb_del_queue){
        try{
            hereLog(`[result] removing thumbnail for clip ${id}`)
            await removeClipThumbnail(id)
        }
        catch(err){
            hereLog(`[missing_thumbnail_survey] error deleting thumbnail ${id} - ${err}`)
        }
    }
    hereLog("[del] done")
}

let cron_thumb_survey_task= undefined

function schedule_thumb_survey(cron_string, collectionDBHandle){
    if(Boolean(cron_thumb_survey_task)){
        cron_thumb_survey_task.stop()
    }

    hereLog(`[thumb_survey] Scheduling… (${cron_string})`)
    cron_thumb_survey_task= cron.schedule(cron_string, () => {
        hereLog(`[thumb_survey] starts (${cron_string})`)

        deletingOrphanThumbnails(collectionDBHandle)

        missingThumbnailSurvey(collectionDBHandle)
    })
}

module.exports= {schedule_thumb_survey}
