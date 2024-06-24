
const fs= require('fs')


const addons_config= require("../../config/addons.json")

function getKarters(){
    return Object.keys(addons_config);
}

function karterReqCheck(req, res, next){
    let karter= (req.params.karter ?? "").toLowerCase()
    if (!getKarters().includes(karter)){
        res.status(403).send({ status: "forbidden", error: `invalibe karter '${karter}'`})
    }
    
    return next()
}

function getInstalledDir(karter){
    return `${addons_config[karter].directory}/installed`
}

function getEnabledDir(karter){
    return `${addons_config[karter].directory}/enabled`
}

function listAddonDir(karter, dirname){
    return fs.readdirSync(
        (dirname.toLowerCase()==='installed') ?
                `${getInstalledDir(karter)}`
            :   `${getEnabledDir(karter)}`
    )
}

const listInstalledDir= (karter) => listAddonDir(karter, 'installed')
const listEnabledDir= (karter) => listAddonDir(karter, 'enabled')

function isInstalled(karter, addonName){
    return listInstalledDir(karter).includes(addonName)
}

function isEnabled(karter, addonName){
    return listEnabledDir(karter).includes(addonName)
}

module.exports= { getKarters, karterReqCheck, getInstalledDir, getEnabledDir }