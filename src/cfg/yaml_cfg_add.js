const multer = require('multer');
const path = require('path');
const fs = require('fs');

const cron_validate = require('node-cron').validate;

const utils= require('../utils')
const cfg_utils= require("./cfg_utils")

let hereLog= (...args) => {console.log("[yaml_cfg_add]", ...args);};


const CFG_YAML_SCHEMA = {
    type: "object",
    properties: {
        name: { type: "string" },
        triggertime: { type: "string" },
        configuration: {
            type: "object",
            properties: {
                commands: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            command: { type: "string" },
                            arguments: { type: "array", items: { type: "string" }, default: [] }
                        },
                        required: ["command"],
                        additionalProperties: false
                    }
                },
                addons: {
                    type: "object",
                    properties: {
                        enable: { type: "array", items: { type: "string" } },
                        disable: { type: "array", items: { type: "string" } }
                    },
                    additionalProperties: false
                }
            },
            required: ["commands"],
            additionalProperties: false
        }
    },
    required: ["name", "triggertime", "configuration"],
    additionalProperties: false
}

function getCfgYamlTmp_filename(filename){
    let extList= utils.YAML_EXT.map(ext =>
        ext.startsWith('.')? ext : `.${ext}`
    )

    var basename= filename
    for(let ext of extList){
        if(filename.endsWith(ext)){
            basename= filename.slice(0, -ext.length);
            break;
        }
    }

    return `${basename}.${Date.now()}.yaml.new`
}

function getRealCfgYamlFromTmp_filename(tmp_filename){
    let filename= path.basename(tmp_filename)
    let extList= utils.YAML_EXT.map(ext =>
        ext.startsWith('.')? ext : `.${ext}`
    )

    const pattern = new RegExp(`^(.*)\\.\\d+\\.(${extList.map(ext => ext.slice(1)).join('|')})\\.new$`);

    const match= filename.match(pattern);

    if(match){
        const basename= match[1];
        const ext= match[2];

        return `${basename}.${ext}`
    }

    return filename;
}

const cfg_yaml_storage= multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, cfg_utils.getCustomConfigSubdir(req.params.karter, true));
    },
    filename: (req, file, cb) => {
        cb(null, getCfgYamlTmp_filename(file.originalname));
    }
})

const config_yaml_cfg= multer({
    storage: cfg_yaml_storage,
    fileFilter: utils.yaml_multer_fileFilter,
    limits: {
        files: 1,//per request
        fieldSize: 4 * utils.MB_size
    }
})

function validate_cfgYaml(yamlDataText, karter){
    let data= utils.validateYaml(yamlDataText, CFG_YAML_SCHEMA)

    if((!cron_validate(data.triggertime)) && data.triggertime.toLowerCase()!=='never'){
        throw new utils.YamlReadError(`Invalid cron string for 'triggertime' (can also be 'never').`)
    }

    let allowed_cmds= cfg_utils.getAllowedCommands(karter)
    for(let item of data.configuration.commands){
        if(!allowed_cmds.includes(item.command)){
            throw new utils.YamlReadError(`Command '${item.command}' is not allowed.`)
        }
    }

    return data;
}
let validate_cfgYamlFile = (filepath, karter) => validate_cfgYaml(fs.readFileSync(filepath,'utf-8'), karter)

function API_custom_yaml_config_install(req, res, next){
    return config_yaml_cfg.single('file')(req, res, err => {
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

function API_custom_yaml_config_download(req, res, next){
    var { url }= req.body
    const racer= req.params.karter
    const fileSizeLimit= 4 * utils.MB_size

    utils.fileInfo_preDownload(url).then( fileInfo => {
        let filename= utils.getFilenameFromUrl(url);
        if( fileInfo.fileSize > fileSizeLimit ){
            hereLog(`API_yaml_cfg_download - file at '${url}' seems to heavy: ${fileInfo.fileSize} > ${fileSizeLimit}`)
            res.status(440).send({status: "file_too_heavy"})
        }
        else if(!utils.YAML_MIMETYPES.includes(fileInfo.mimetype)){
            hereLog(`[API_yaml_cfg_download] - file at '${url}' seems to have bad mimetype: ${fileInfo.mimetype}`)
            res.status(441).send({status: "file_bad_mimetype"})
        }
        else if(!utils.YAML_EXT.includes(path.extname(filename))){
            hereLog(`[API_yaml_cfg_download] - file at '${url}' seems to have bad extension.`)
            res.status(442).send({status: "file_bad_extension"})
        }
        else{
            let racer_installDir= cfg_utils.getCustomConfigSubdir(racer)
            utils.file_download(url, racer_installDir, getCfgYamlTmp_filename(filename)).then( filepath => {
                req.file= { path: filepath }

                next()
            })
            .catch(err => {
                hereLog(`[API_yaml_cfg_download] failed fetching addon from '${url}' - ${err}`)
                res.status(513).send({status: 'addon_download_failed'})
            })
        }
    } )
    .catch(err => {
        hereLog(`[API_yaml_cfg_download] error ${err}`)
        res.status(500).send({status: "internal_error"})
    })
}

function API_config_set_cfg_yaml(req, res, next){
    let racer= req.params.karter
    let filepath= req.file.path
    var filename= undefined
    var filedir= undefined
    try{
        if(filepath){
            filedir= path.dirname(filepath)
            try{
                validate_cfgYamlFile(filepath, racer)
            }
            catch(err){
                if(fs.existsSync(filepath)){
                    fs.unlinkSync(filepath, racer)
                }

                if (err instanceof utils.YamlReadError) {
                    hereLog(`[API_setCfgYaml] failed validating '${filepath}' - ${err}`)
                    res.status(415).send({
                        status:'yaml_fail',
                        details: (err.error)? `${err.error}` : `${err}`
                    });
                } else {
                    hereLog(`[API_setCfgYaml] error ${err}`)
                    res.status(500).send({status: "internal_error"})
                }
                return
            }

            let dest= cfg_utils.getCustomConfigSubdir(racer);
            fs.renameSync(filepath, `${dest}/${getRealCfgYamlFromTmp_filename(filepath)}`)
        }
    } catch(e){
        hereLog(`[API_setCfgYaml] error handling yaml files - ${e}`)
        res.status(500).send({status: "internal_error"})
        return
    }

    res.status(200).send({
        status: 'updated',
        result: {
            addon_order_file: getRealCfgYamlFromTmp_filename(filepath)
        }
    })
}

module.exports= { config_yaml_cfg,
    API_custom_yaml_config_install,
    API_custom_yaml_config_download,
    API_config_set_cfg_yaml
}
