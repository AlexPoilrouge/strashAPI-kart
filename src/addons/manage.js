const fs = require('fs');
const path = require('path');

const { getInstalledDir, getEnabledDir }= require('./util')

let hereLog= (...args) => {console.log("[kart - addons_manage]", ...args);};

function enable_addon(karter, addon){
    const installDirectory= getInstalledDir(karter, true)
    const enableDirectory= getEnabledDir(karter, true)

    const targetAddonPath = path.join(installDirectory, addon);
    const linkAddonPath = path.join(enableDirectory, addon);

    if (!fs.existsSync(targetAddonPath)) { 
        hereLog(`enable_addon[${karter}](${addon}) - no such installed addon…`)
        return false
    }

    // Create the symbolic link (overwrite if it exists)
    try {
        // Remove the existing symlink if it exists
        if (fs.existsSync(linkAddonPath)) {
            fs.unlinkSync(linkAddonPath);
        }
        fs.symlinkSync(targetAddonPath, linkAddonPath);
        hereLog(`enable_addon[${karter}](${addon}) - Symlink created: ${linkAddonPath} -> ${targetAddonPath}`);
        return true
    } catch (error) {
        hereLog(`enable_addon[${karter}](${addon}) - error ${error}`)
        return false
    }
}

function disable_addon(karter, addon){
    const enableDirectory= getEnabledDir(karter, true)
    const linkAddonPath = path.join(enableDirectory, addon);

    if(!fs.existsSync(linkAddonPath)){ return true }

    try{
        fs.unlinkSync(linkAddonPath)
        hereLog(`disable_addon[${karter}](${addon}) - Symlink removed: ${linkAddonPath} `);
        return true;
    } catch (error) {
        hereLog(`disable_addon[${karter}](${addon}) - error ${error}`)
        return false
    }
}

function remove_addon(karter, addon){
    disable_addon(karter, addon)

    const installDirectory= getInstalledDir(karter, true)
    const installedAddonPath = path.join(installDirectory, addon);

    if (!fs.existsSync(installedAddonPath)) { 
        hereLog(`enable_addon[${karter}](${addon}) - no such installed addon…`)
        return true
    }

    try {
        if (fs.existsSync(installedAddonPath)) {
            fs.unlinkSync(installedAddonPath);
        }
        hereLog(`enable_addon[${karter}](${addon}) - removing installed addon '${installedAddonPath}'`)
        return true
    } catch (error) {
        hereLog(`enable_addon[${karter}](${addon}) - error ${error}`)
        return false
    }
}

function API_addons_enable(req, res, next){
    let karter= req.params.karter
    let addons= req.body.addons
    if (!addons){
        hereLog(`helllooooo? ${JSON.stringify(req.body)}`)
        return res.status(400).send({status: 'bad_request'})
    }
    if(!Array.isArray(addons)) addons= [addons]

    var enabled= [], failed= []
    for(var addon of addons){
        if(enable_addon(karter, addon)){ enabled.push(addon)}
        else { failed.push(addon)}
    }

    if(failed.length<=0){
        return res.status(200).send({status: 'success', enabled})
    }
    else if(enabled.length>0){
        return res.status(201).send({status: 'partial', enabled, failed})
    }
    else{
        return res.status(513).send({status: 'failure', failed})
    }
}

function API_addons_disable(req, res, next){
    let karter= req.params.karter
    let addons= req.body.addons
    if (!addons) return res.status(400).send({status: 'bad_request'})
    if(!Array.isArray(addons)) addons= [addons]

    var disabled= [], failed= []
    for(var addon of addons){
        if(disable_addon(karter, addon)){ disabled.push(addon)}
        else { failed.push(addon)}
    }

    if(failed.length<=0){
        return res.status(200).send({status: 'success', disabled})
    }
    else if(disabled.length>0){
        return res.status(201).send({status: 'partial', disabled, failed})
    }
    else{
        return res.status(513).send({status: 'failure', failed})
    }
}

function API_addons_remove(req, res, next){
    let karter= req.params.karter
    let addons= req.body.addons
    if (!addons) return res.status(400).send({status: 'bad_request'})
    if(!Array.isArray(addons)) addons= [addons]

    var removed= [], failed= []
    for(var addon of addons){
        if(remove_addon(karter, addon)){ removed.push(addon)}
        else { failed.push(addon)}
    }

    if(failed.length<=0){
        return res.status(200).send({status: 'success', removed})
    }
    else if(removed.length>0){
        return res.status(201).send({status: 'partial', removed, failed})
    }
    else{
        return res.status(513).send({status: 'failure', failed})
    }
}

module.exports= { API_addons_enable, API_addons_disable, API_addons_remove }
