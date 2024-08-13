const axios = require('axios');

const addons_config= require("../../config/addons.json")

const addons_util= require("./util");
const url = require('url');
const path = require('path');
const fs = require('fs');


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

async function fileInfo_preDownload(url){
    const headResponse = await axios.head(url);
    const fileSize = parseInt(headResponse.headers['content-length'], 10);
    const mimeType = headResponse.headers['content-type'];

    return { fileSize, mimeType };
}

function getFilenameFromUrl(fileUrl) {
    let parsedUrl = new URL(fileUrl);
    parsedUrl.query=''
    parsedUrl.search=''

    // Extract the pathname
    const pathname = parsedUrl.pathname;
    // Get the basename (the filename with extension)
    const filename = path.basename(pathname);
  
    return filename;
}

async function addon_download(karter, url){
    const installDirectory= addons_util.getInstalledDir(karter, true)
    const filename= getFilenameFromUrl(url)

    const addonPath= path.resolve(installDirectory, filename)

    // axios image download with response type "stream"
    const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
    })

    // pipe the result stream into a file on disc
    response.data.pipe(fs.createWriteStream(addonPath))

    // return a promise and resolve when download finishes
    return new Promise((resolve, reject) => {
        response.data.on('end', () => {
            resolve(addonPath)
        })

        response.data.on('error', err => {
            reject(err)
        })
    })
}

function API_addons_download(req, res, next){
    var { url }= req.body
    const racer= req.params.karter
    const fileSizeLimit= addons_config.file_size_MB * addons_util.MB_size

    fileInfo_preDownload(url).then( fileInfo => {
        if( fileInfo.fileSize > fileSizeLimit ){
            hereLog(`API_addons_download - file at '${url}' seems to heavy: ${fileInfo.fileSize} > ${fileSizeLimit}`)
            res.status(440).send({status: "file_too_heavy"})
        }
        else if(!addons_config.allowed_mimetypes.includes(fileInfo.mimeType)){
            hereLog(`API_addons_download - file at '${url}' seems to have bad mimetype: ${fileInfo.mimeType}`)
            res.status(441).send({status: "file_bad_mimetype"})
        }
        else if(!addons_config.allowed_filenameExt.includes(path.extname(getFilenameFromUrl(url)))){
            hereLog(`API_addons_download - file at '${url}' seems to have bad extension.`)
            res.status(442).send({status: "file_bad_extension"})
        }
        else{
            addon_download(racer, url).then( async addonPath => {
                const addonName= path.basename(addonPath)

                try{
                    if(await addons_util.isAddonDeletionPending(racer, addonName)){
                        await addons_util.rmPendingOp(racer, 'deletion', addonName)
                    }
                }
                catch(err){
                    hereLog(`[API_addons_download]{${racer}} - failed removing the pending un-delete op for ${addonName}`)
                }

                res.status(200).send({
                    status: 'added',
                    result: {
                        addon: addonName,
                        state: addons_util.isAddonEnabled(racer, addonName)? 'enabled': 'installed'
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
