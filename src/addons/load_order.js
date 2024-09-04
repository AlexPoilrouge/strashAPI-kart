const multer = require('multer');
const path = require('path');
const fs = require('fs')

const addons_util= require('./util')
const addons_config= require("../../config/addons.json");

const ORDER_YAML_FILENAME="addons_order.yaml"

let hereLog= (...args) => {console.log("[addons_load_order]", ...args);};

function orderYaml_fileFilter(req, file, cb){
    if(![".yaml",".yml"].includes(path.extname(file.originalname))){
        hereLog(`fileFilter - file '${file.originalname}' has bad extension…`)
        cb(new Error('File must have allowed filename extension'), false)
    }
    else if(!["text/plain","text/yaml","text/x-yaml","application/x-yaml","application/yaml"].includes(file.mimetype)){
        hereLog(`fileFilter - file '${file.originalname}' has bad mimetype (${file.mimetype})…`)
        cb(new Error('File with unallowed mime type'), false)
    }
    else{
        cb(null, true);
    }
}

const order_yaml_storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, addons_config.racers[req.params.karter].directory);
    },
    filename: (req, file, cb) => {
        cb(null, ORDER_YAML_FILENAME);
    },
});


const addon_load_order= multer({
    storage: order_yaml_storage,
    fileFilter: orderYaml_fileFilter,
    limits: {
        files: 1,//per request
        fieldSize: 16 * addons_util.MB_size
    }
});

function API_addons_get_load_order(req, res, next){
    let orderOps_yaml_file= path.join(addons_config.racers[req.params.karter].directory, ORDER_YAML_FILENAME)

    if(!fs.existsSync(orderOps_yaml_file)){
        res.status(404).send()
    }
    else{
        res.sendFile(orderOps_yaml_file, err => {
            if(err){
                res.status(500).send({status: "internal_query_error"});
                hereLog(`[order_yaml_get] error: ${err}`)
            }
            else{
                hereLog(`[order_yaml_get] fetched ${orderOps_yaml_file}…`)
            }
        })
    }
}

function API_addons_set_load_order(req, res, next){
    res.status(200).send({
        status: 'updated',
        result: {
            addon_order_file: ORDER_YAML_FILENAME
        }
    })
}


module.exports= { addon_load_order, API_addons_get_load_order, API_addons_set_load_order }
