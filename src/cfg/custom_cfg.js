const fs = require('fs');
const path = require('path');

const yaml_dump = require('js-yaml').dump;
const cron_validate = require('node-cron').validate;

const utils= require("../utils");
const cfg_utils= require("./cfg_utils");


const CUSTOM_CFG_LINE_NAME_REGEX= /\/\/\s*name:(.+)/g;
const CUSTOM_CFG_LINE_FILE_REGEX= /\/\/\s*file:(.+)/g;

let customCfg_nameMatch= data => CUSTOM_CFG_LINE_NAME_REGEX.exec(data);
let customCfg_fileMatch= data => CUSTOM_CFG_LINE_FILE_REGEX.exec(data);

let hereLog= (...args) => {console.log("[cfg - custom]", ...args);};


function getConfigFromCustomCfg(karter){
    try{
        let customCfg_filepath= cfg_utils.get_CustomCfgFile(karter);
        
        const data = fs.readFileSync(customCfg_filepath, 'utf8');
        var configs = [];
        var matchName, matchFile;

        // Find all name and file matches
        while ((matchName = customCfg_nameMatch(data))
            && (matchFile = customCfg_fileMatch(data))
        ) {
            configs.push({
                name: matchName[1].trim(),
                file: matchFile[1].trim(),
            });
        }

        return configs;
    } catch(err) {
        hereLog(`[get_enabled_custom_cfg] Error reading custom cfg - ${err}`);
        return undefined
    }
}


function API_customConfigInfo(req, res, next){
    const racer= req.params.karter

    let customCfg_config= getConfigFromCustomCfg(racer);
    let allowedCommands= cfg_utils.getAllowedCommands(racer);
    let availableCustomsConfigs= cfg_utils.getCustomConfigList(racer);

    if(customCfg_config && allowedCommands && availableCustomsConfigs){
        return res.status(200).send({ 
            enabled_custom_configs: customCfg_config,
            custom_cfg: {
                allowed_commands: allowedCommands,
                available_configs: availableCustomsConfigs
            }
        });
    }
    else{
        return res.status(500).send({status: "internal_error"});
    }
}

function API_getCustomConfig(req, res, next){
    const racer= req.params.karter
    const configName= req.params.name

    let availableCustomsConfigs= cfg_utils.getCustomConfigList(racer);
    if(!availableCustomsConfigs){
        hereLog(`[customConfigGet] error fetching custom configs`)
        return res.status(500).send({status: "internal_error"});
    }

    let matchingConfig= availableCustomsConfigs.find(
        config=> config.name===configName || config.filename===configName
    )
    if(!matchingConfig){
        return res.status(404).send({status: "not_found"});
    }

    let customConfigFile= path.join(cfg_utils.getCustomConfigSubdir(racer, true), matchingConfig.filename);
    if(!fs.existsSync(customConfigFile)){
        hereLog(`[customConfigGet] file '${customConfigFile}' is actually non-existent`)
        res.status(404).send({status: "absent"})
    }
    else{
        res.sendFile(customConfigFile, err => {
            if(err){
                hereLog(`[customConfigGet] error: ${err}`)
                res.status(500).send({status: "internal_query_error"});
            }
            else{
                hereLog(`[customConfigGet] fetched ${customConfigFile}…`)
            }
        })
    }
}


function changeCfgYamlTriggerTime(karter, cfgYaml_filename, cron_string){
    try{
        let cfgYamlFile= path.join(cfg_utils.getCustomConfigSubdir(karter, true), cfgYaml_filename)
        let cfgYamlData= fs.readFileSync(cfgYamlFile, 'utf8');
        var yaml_data= utils.load_yamlData(cfgYamlData)

        yaml_data.triggertime= cron_string

        fs.writeFileSync(cfgYamlFile, yaml_dump(yaml_data), "utf-8");

        return true;
    } catch(err){
        hereLog(`[change_triggertime](${karter}) can change triggertime for '${cfgYaml_filename}' - ${err}`)

        return false;
    }
}

const TRIGGERTIME_DISABLE_STRING_LC= 'never'

function API_triggerChangeCustomConfig(req, res, next){
    const racer= req.params.karter
    const configName= req.params.name
    const cron_string= req.body.triggertime ?? TRIGGERTIME_DISABLE_STRING_LC
    
    let availableCustomsConfigs= cfg_utils.getCustomConfigList(racer);
    if(!availableCustomsConfigs){
        hereLog(`[customConfigGet] error fetching custom configs`)
        return res.status(500).send({status: "internal_error"});
    }

    let matchingConfig= availableCustomsConfigs.find(
        config=> config.name===configName || config.filename===configName
    )
    if(!matchingConfig){
        return res.status(404).send({status: "not_found"});
    }
    if((!cron_validate(cron_string)) && cron_string.toLowerCase()!==TRIGGERTIME_DISABLE_STRING_LC){
        return res.status(400).send({
            status: "invalid_cron_string"
        })
    }

    if(changeCfgYamlTriggerTime(racer, matchingConfig.filename, cron_string)){
        return res.status(200).send({
            status: (cron_string.toLowerCase()===TRIGGERTIME_DISABLE_STRING_LC? "disabled" : "enabled"),
            triggertime: cron_string 
        })
    }
    else{
        hereLog(`[disableConfig] error`)
        res.status(500).send({status: "internal_query_error"});
    }

}
function API_disableCustomConfig(req, res, next){
    req.body.triggertime= TRIGGERTIME_DISABLE_STRING_LC;
    return API_triggerChangeCustomConfig(req,res,next);
}
let API_enableCustomConfig= (req, res, next) => API_triggerChangeCustomConfig(req,res,next);

module.exports= { API_customConfigInfo, API_getCustomConfig,
    API_disableCustomConfig, API_enableCustomConfig,
 }
