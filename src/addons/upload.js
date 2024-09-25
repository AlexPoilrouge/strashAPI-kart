const multer = require('multer');
const path = require('path');


const addons_config= require("../../config/addons.json")

const addons_util= require('./addons_utils')

//Usefull ref: https://devsarticles.com/multer-file-upload-nodejs-complete-guide


let hereLog= (...args) => {console.log("[addons_upldoad]", ...args);};


function fileFilter(req, file, cb){
    if(!addons_config.allowed_filenameExt.includes(path.extname(file.originalname))){
        hereLog(`fileFilter - file '${file.originalname}' has bad extension…`)
        cb(new Error('File must have allowed filename extension'), false)
    }
    else if(!addons_config.allowed_mimetypes.includes(file.mimetype)){
        hereLog(`fileFilter - file '${file.originalname}' has bad mimetype (${file.mimetype})…`)
        cb(new Error('File with unallowed mime type'), false)
    }
    else{
        cb(null, true);
    }
}

const addons_storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, addons_util.getInstalledDir(req.params.karter, true));
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const addon_upload= multer({
    storage: addons_storage,
    fileFilter: fileFilter,
    limits: {
        files: 1,//per request
        fieldSize: addons_config.file_size_MB * addons_util.MB_size
    }
});

module.exports= { addon_upload }