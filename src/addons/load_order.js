const multer = require('multer');
const path = require('path');
const fs = require('fs')

const utils= require('../utils')
const addons_utils= require('./addons_utils')
const addons_config= require("../../config/addons.json");

const ORDER_YAML_FILENAME="addons_order.yaml"
const ORDER_YAML_FILENAME_TMP_NEW= `${ORDER_YAML_FILENAME}.new`

let hereLog= (...args) => {console.log("[addons_load_order]", ...args);};


const ORDER_YAML_EXT= [".yaml",".yml"]
const ORDER_YAML_MIMETYPES= ["text/plain","text/yaml","text/x-yaml","application/x-yaml","application/yaml"]

const ORDER_YAML_SCHEMA = {
    type: 'object',
    properties: {
      rules: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            filename: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                regex: { type: 'string', pattern: '^.*$' }
              },
              additionalProperties: false
            },
            rules: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  before: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' }
                    },
                    additionalProperties: false
                  },
                  after: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' }
                    },
                    additionalProperties: false
                  },
                  position: {
                    type: 'string',
                    enum: ['first', 'last']
                  }
                },
                additionalProperties: false
              }
            }
          },
          additionalProperties: false
        }
      }
    },
    required: ['rules'],
    additionalProperties: false
}

function validate_orderYaml(yamlDataText){
    let data= utils.validateYaml(yamlDataText, ORDER_YAML_SCHEMA)

    data.rules.forEach(filerule => {
        if(filerule){
            if (filerule.filename && filerule.filename.regex) {
                try {
                    new RegExp(filerule.filename.regex);
                } catch (e) {
                    throw new utils.YamlReadError(`Invalid regex in rule: ${filerule.filename.regex}`, e.message);
                }
            }
            if (filerule.rules){
                filerule.rules.forEach(rule=>{
                    if( (_rn=rule.before)
                        || (_rn=rule.after)
                    ){
                        if(_rn.regex){
                            try {
                                new RegExp(_rn.regex);
                            } catch (e) {
                                throw new utils.YamlReadError(`Invalid regex in rule: ${_rn.regex}`, e.message);
                            }
                        }
                    }
                })
            }
        }
    });

    return data
}
let validate_orderFile = (filepath) => validate_orderYaml(fs.readFileSync(filepath,'utf-8'))

function orderYaml_fileFilter(req, file, cb){
    if(!ORDER_YAML_EXT.includes(path.extname(file.originalname))){
        hereLog(`fileFilter - file '${file.originalname}' has bad extension…`)
        cb(new Error('File must have allowed filename extension'), false)
    }
    else if(!ORDER_YAML_MIMETYPES.includes(file.mimetype)){
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
        cb(null, ORDER_YAML_FILENAME_TMP_NEW);
    },
});


const addon_load_order= multer({
    storage: order_yaml_storage,
    fileFilter: orderYaml_fileFilter,
    limits: {
        files: 1,//per request
        fieldSize: 16 * addons_utils.MB_size
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

function API_addons_load_order_install(req, res, next){
    addon_load_order.single('file')(req, res, err => {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading the file
            return res.status(400).send({status: 'file_error', error: err.message});
        } else if (err) {
            // An unknown error occurred when uploading the file
            return res.status(500).send({status: 'internal_error'});
        }

        next();
    })
}

function API_addons_load_order_download(req, res, next){
    var { url }= req.body
    const racer= req.params.karter
    const fileSizeLimit= addons_config.file_size_MB * addons_utils.MB_size

    utils.fileInfo_preDownload(url).then( fileInfo => {
        if( fileInfo.fileSize > fileSizeLimit ){
            hereLog(`API_addons_LO_download - file at '${url}' seems to heavy: ${fileInfo.fileSize} > ${fileSizeLimit}`)
            res.status(440).send({status: "file_too_heavy"})
        }
        else if(!ORDER_YAML_MIMETYPES.includes(fileInfo.mimetype)){
            hereLog(`API_addons_LO_download - file at '${url}' seems to have bad mimetype: ${fileInfo.mimetype}`)
            res.status(441).send({status: "file_bad_mimetype"})
        }
        else if(!ORDER_YAML_EXT.includes(path.extname(utils.getFilenameFromUrl(url)))){
            hereLog(`API_addons_LO_download - file at '${url}' seems to have bad extension.`)
            res.status(442).send({status: "file_bad_extension"})
        }
        else{
            let racer_installDir= addons_config.racers[racer].directory
            utils.file_download(url, racer_installDir, ORDER_YAML_FILENAME_TMP_NEW).then( filepath => {
                req.file= { path: filepath }

                next()
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

function API_addons_set_load_order(req, res, next){
    let filepath= req.file.path
    var filename= undefined
    var filedir= undefined
    try{
        if(filepath && (filename=path.basename(filepath))!==ORDER_YAML_FILENAME){
            filedir= path.dirname(filepath)
            try{
                validate_orderFile(filepath)
            }
            catch(err){
                if(fs.existsSync(filepath)){
                    fs.unlinkSync(filepath)
                }

                if (err instanceof utils.YamlReadError) {
                    hereLog(`[API_setloadOrder] failed validating '${filepath}' - ${err}`)
                    res.status(415).send({ status:'yaml_fail', details: err.error });
                } else {
                    hereLog(`[API_setloadOrder] error ${err}`)
                    res.status(500).send({status: "internal_error"})
                }
                return
            }

            let dest= addons_config.racers[req.params.karter].directory
            fs.renameSync(filepath, `${dest}/${ORDER_YAML_FILENAME}`)
        }
    } catch(e){
        hereLog(`[API_setloadOrder] error handling yaml files - ${e}`)
        res.status(500).send({status: "internal_error"})
        return
    }

    res.status(200).send({
        status: 'updated',
        result: {
            addon_order_file: ORDER_YAML_FILENAME
        }
    })
}


module.exports= { addon_load_order,
    API_addons_get_load_order, API_addons_set_load_order,
    API_addons_load_order_install, API_addons_load_order_download
}
