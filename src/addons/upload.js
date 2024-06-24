const multer = require('multer');
const path = require('path');

const addons_util= require('./util')

//Usefull ref: https://devsarticles.com/multer-file-upload-nodejs-complete-guide

const MB_size= 1024 * 1024;

const FILE_SIZE_LIMIT= 256 * MB_size;

const allowed_filenameExt= [
    "cfg",
    "kart",
    "lua",
    "pk3",
    "wad",
    "txt"
]

const allowed_mimetypes= [
    "application/javascript",
    "application/octet-stream",
    "application/zip",
    "text/plain"
]

function fileFilter(req, file, cb){
    if(!allowed_filenameExt.includes(path.extname(file.originalname))){
        cb(new Error('File must have allowed filename extension'), false)
    }
    else if(!allowed_mimetypes.includes(file.mimetype)){
        cb(new Error('File with unallowed mime type'), false)
    }
    else{
        cb(null, true);
    }
}

const addons_storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, addons_util.getInstalledDir(karter));
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
        fieldSize: FILE_SIZE_LIMIT
    }
});

module.exports= { addon_upload }