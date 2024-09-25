const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const {listInstalledAddons, isAddonInstalled, isAddonEnabled, getInstalledDir, isAddonDeletionPending, isAddonDisablementPending}= require('./addons_utils')

const addons_config= require("../../config/addons.json")

let hereLog= (...args) => {console.log("[kart - addons_infos]", ...args);};


function _getFileInfo(existing_filepath){
    const stats = fs.statSync(existing_filepath);
    const filename= path.basename(existing_filepath)

    return {
        name: filename,
        size: stats.size,
        extension: path.extname(filename),
        mimetype: mime.lookup(existing_filepath) || 'application/octet-stream'
    };
}

async function getAddonInfo(addon, karter){
    if(!isAddonInstalled(karter, addon)) {
        hereLog(`[get_addon_info] addon '${addon} isn't installed`)

        return undefined;
    }

    var addonInfo= _getFileInfo(path.join(getInstalledDir(karter), addon))
    if(!addonInfo) return undefined
    addonInfo.enabled= isAddonEnabled(karter, addon)
    addonInfo.pendingOp= (await isAddonDeletionPending(karter, addon))?
                            'deletion'
                        :   (await isAddonDisablementPending(karter, addon))?
                            'disablement'
                        :   undefined
    addonInfo.racer= karter

    return addonInfo
}

const getAllAddonsInfo= async (karter) =>
    await Promise.all( listInstalledAddons(karter).map(async addonFullPath =>
        (await getAddonInfo(path.basename(addonFullPath), karter))
    ) )

async function API_getAddonsInfos(req, res, next){
    let karter= req.params.karter
    let lookfor_addon= req.query.addon;

    if(lookfor_addon && lookfor_addon.length){
        let addonInfo= await getAddonInfo(lookfor_addon, karter)

        if(!addonInfo){
            res.status(404).send({
                status: "not_found"
            })
        }
        else{
            res.status(200).send({
                status: "found",
                info: addonInfo
            })
        }
    } 
    else{
        let addonsInfos= await getAllAddonsInfo(karter)
        if(!addonsInfos){
            res.status(404).send({
                status: "not found"
            })
        }
        else if(addonsInfos.length===0){
            res.status(200).send({
                status: "nothing",
                result: {
                    number: 0,
                    infos: []
                }
            })
        }
        else{
            res.status(200).send({
                status: "fetched",
                result: {
                    number: addonsInfos.length,
                    infos:  addonsInfos
                }
            })
        }
    }
}

module.exports= { API_getAddonsInfos }
