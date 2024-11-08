const fs = require('fs');
const path = require('path');

const cfg_utils = require("./cfg_utils");


let hereLog= (...args) => {console.log("[cfg - remove]", ...args);};


function API_removeCustomConfig(req, res, next){
    const racer= req.params.karter
    const configName= req.params.name

    let availableCustomsConfigs= cfg_utils.getCustomConfigList(racer);
    if(!availableCustomsConfigs){
        hereLog(`[API_rm_cfg] error fetching custom configs`)
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
        hereLog(`[API_rm_cfg] file '${customConfigFile}' is actually non-existent`)
        res.status(404).send({status: "absent"})
    }
    else{
        try{
            fs.unlinkSync(customConfigFile);
            res.status(200).send({
                removed: matchingConfig.filename
            })
        }
        catch(err){
            hereLog(`[API_rm_cfg] error: ${err}`)
            res.status(500).send({status: "internal_query_error"});
        }
    }
}

module.exports= { API_removeCustomConfig, }
