const axios = require('axios');

const addons_config= require("../../config/addons.json")

const addons_util= require("./util");
const url = require('url');
const path = require('path');


let hereLog= (...args) => {console.log("[kart - add_addon]", ...args);};

function API_addons_add(err, req, res, next){
    res.status(403).send({status: "not_implemented"})

    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading the file
        return res.status(400).send({status: 'file_error', error: err.message});
    } else if (err) {
        // An unknown error occurred when uploading the file
        hereLog(err.message)
        return res.status(500).send({status: 'internal_error'});
    }
}

async function fileInfo_preDownload(url){
    const headResponse = await axios.head(url);
    const fileSize = parseInt(headResponse.headers['content-length'], 10);
    const mimeType = headResponse.headers['content-type'];

    return [ fileSize, mimeType ];
}

function getFilenameFromUrl(fileUrl) {
    // Parse the URL
    const parsedUrl = url.parse(fileUrl);
    // Extract the pathname
    const pathname = parsedUrl.pathname;
    // Get the basename (the filename with extension)
    const filename = path.basename(pathname);
  
    return filename;
  }

function API_addons_download(err, req, res, next){
    res.status(403).send({status: "not_implemented"})

    var { url }= req.body
    const fileSizeLimit= addons_config.file_size_MB * addons_util.MB_size

    fileInfo_preDownload(url).then( fileInfo => {
        if( fileInfo.fileSize < fileSizeLimit ){
            res.status(440).send({status: "file_too_heavy"})
        }
        else if(!addons_config.allowed_mimetypes.includes(getFilenameFromUrl(fileInfo.mimeType))){
            res.status(441).send({status: "file_bad_mimetype"})
        }
        else if(!addons_config.allowed_filenameExt.includes(getFilenameFromUrl(url))){
            res.status(442).send({status: "file_bad_extension"})
        }

        res.status(200)
    } )
    .catch(err => {
        hereLog(`[API_addons_download] ${err}`)
        res.status(500).send({status: "internal_error"})
    })
}

module.exports= { API_addons_add, API_addons_download }
