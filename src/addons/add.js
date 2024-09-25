const addons_config= require("../../config/addons.json")

const utils= require("../utils")
const addons_utils= require("./addons_utils");
const path = require('path');


let hereLog= (...args) => {console.log("[kart - add_addon]", ...args);};

function API_addons_add(req, res, next){
    res.status(200).send({
        status: 'added',
        result: {
            addon: req.file.filename,
            state: path.basename(req.file.destination)
        }
    })
}

function API_addons_download(req, res, next){
    var { url }= req.body
    const racer= req.params.karter
    const fileSizeLimit= addons_config.file_size_MB * addons_utils.MB_size

    utils.fileInfo_preDownload(url).then( fileInfo => {
        if( fileInfo.fileSize > fileSizeLimit ){
            hereLog(`API_addons_download - file at '${url}' seems to heavy: ${fileInfo.fileSize} > ${fileSizeLimit}`)
            res.status(440).send({status: "file_too_heavy"})
        }
        else if(!addons_config.allowed_mimetypes.includes(fileInfo.mimeType)){
            hereLog(`API_addons_download - file at '${url}' seems to have bad mimetype: ${fileInfo.mimeType}`)
            res.status(441).send({status: "file_bad_mimetype"})
        }
        else if(!addons_config.allowed_filenameExt.includes(path.extname(utils.getFilenameFromUrl(url)))){
            hereLog(`API_addons_download - file at '${url}' seems to have bad extension.`)
            res.status(442).send({status: "file_bad_extension"})
        }
        else{
            let racer_installDir= addons_utils.getInstalledDir(racer, true)
            utils.file_download(url, racer_installDir).then( async addonPath => {
                const addonName= path.basename(addonPath)

                try{
                    if(await addons_utils.isAddonDeletionPending(racer, addonName)){
                        await addons_utils.rmPendingOp(racer, 'deletion', addonName)
                    }
                }
                catch(err){
                    hereLog(`[API_addons_download]{${racer}} - failed removing the pending un-delete op for ${addonName}`)
                }

                res.status(200).send({
                    status: 'added',
                    result: {
                        addon: addonName,
                        state: addons_utils.isAddonEnabled(racer, addonName)? 'enabled': 'installed'
                    }
                })
            })
            .catch(err => {
                hereLog(`[API_addons_download] failed fetching addon from '${url}' - ${err}`)
                res.status(513).send({status: 'addon_download_failed'})
            })
        }
    } )
    .catch(err => {
        hereLog(`[API_addons_download] error ${err}`)
        res.status(500).send({status: "internal_error"})
    })
}

module.exports= { API_addons_add, API_addons_download }
