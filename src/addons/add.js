
const addons_util= require("./util")

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

module.exports= { API_addons_add }
