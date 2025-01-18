
const fs= require('fs');
const path= require('path');

const { FileMutex, ensureDirectory, ensureFile, validateYaml } = require('../utils')


const cfg_config= require("../../config/cfg.json");

const customCfg_filename= "custom_config.cfg"
const allowed_command_yaml_filename= "allowed_commands.yaml"

const default_customCfg_content= "// found nothing\nwait\n"
const default_allowedCommands_yaml_content= "allowed_commands: []\n"


const TRIGGERTIME_DISABLE_STRING_LC= 'never'
const TRIGGERTIME_DEFAULT_STRING_LC= 'default'

const ALLOWED_CMD_YAML_SCHEMA= {
    type: "object",
    properties: {
      allowed_commands: {
        type: "array",
        items: {
          type: "string"
        }
      }
    },
    required: ["allowed_commands"],
    additionalProperties: false  // No extra properties allowed
};

const CUSTOM_CONFIG_HEADER_YAML_SCHEMA= {
    type: "object",
    properties: {
        name: { type: "string" },
        triggertime: { type: "string" }
    },
    required: ["name", "triggertime"],
    additionalProperties: true
};



let hereLog= (...args) => {console.log("[cfg_utils]", ...args);};


function getKarters(){
    return (cfg_config && cfg_config.racers)? Object.keys(cfg_config.racers) : [];
}

function karterReqCheck(req, res, next){
    let karter= (req.params.karter ?? "").toLowerCase()
    if (!getKarters().includes(karter)){
        hereLog(`karterReqCheck - invalid karter '${karter}'…`)
        res.status(404).send({ status: "forbidden", error: `invalid karter '${karter}'`})
    }
    else {    
        return next()
    }
}

function getCfgDir(karter, ensure){
    const dirpath= cfg_config.racers[karter].directory

    if(ensure) ensureDirectory(dirpath);

    return dirpath
}

function getCustomConfigSubdir(karter, ensure){
    const dirpath= path.join(cfg_config.racers[karter].directory, 'config.d')

    if(ensure) ensureDirectory(dirpath);
    
    return dirpath
}

function _getKarterSubfile(karter, subpath, ensure=false, defaultData=''){
    const filepath= path.join(getCfgDir(karter, ensure), subpath)

    if(ensure){ 
        ensureDirectory(path.dirname(filepath))

        if(!ensureFile(filepath, defaultData)) return undefined
    }

    return filepath
}

let get_CustomCfgFile= karter => 
    _getKarterSubfile(karter, customCfg_filename, true, default_customCfg_content);
let get_allowedCommandsYamlFile= karter =>
    _getKarterSubfile(karter, allowed_command_yaml_filename, true, default_allowedCommands_yaml_content);

function getAllowedCommands(karter){
    try{
        let allowedCommand_yaml_filepath= get_allowedCommandsYamlFile(karter);

        const data = fs.readFileSync(allowedCommand_yaml_filepath, 'utf8');
        const yaml_data= validateYaml(data, ALLOWED_CMD_YAML_SCHEMA)

        return yaml_data.allowed_commands;
    } catch(err) {
        hereLog(`[get_allowed_cmd] Error reading allowed_commands yaml - ${err}`);
        return undefined
    }
}

function getCustomConfigList(karter){
    try{
        var configs= [];

        let customConfig_dir= getCustomConfigSubdir(karter, true)
        let files= fs.readdirSync(customConfig_dir);

        for (let file of files){
            let filePath= path.join(customConfig_dir, file);

            if ( fs.lstatSync(filePath).isFile() &&
                ( file.endsWith('.yaml') || file.endsWith('.yml') )
            ) {
                try {
                    // Synchronously read and parse the YAML file
                    const fileContents = fs.readFileSync(filePath, 'utf8');
                    const parsedYaml = validateYaml(fileContents, CUSTOM_CONFIG_HEADER_YAML_SCHEMA);
            
                    // Extract 'name' and 'triggertime' if they exist
                    const { name, triggertime } = parsedYaml;
            
                    if (name && triggertime) {
                        configs.push({ name, triggertime, filename: file });
                    }
                } catch (err) {
                    hereLog(`[get_custom_cfg_yaml] Error reading/parsing yaml file ${file}:`, err);
                }
            }
        }

        return configs;
    } catch(err) {
        hereLog(`[get_custom_cfg_yaml] Error reading allowed_commands yaml - ${err}`);
        return undefined
    }
}

module.exports= {
    getKarters, karterReqCheck,
    getCfgDir, getCustomConfigSubdir,
    TRIGGERTIME_DISABLE_STRING_LC, TRIGGERTIME_DEFAULT_STRING_LC,
    get_CustomCfgFile, get_allowedCommandsYamlFile,
    getAllowedCommands, ALLOWED_CMD_YAML_SCHEMA,
    getCustomConfigList, CUSTOM_CONFIG_HEADER_YAML_SCHEMA,
}


