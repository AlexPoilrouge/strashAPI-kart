const fs = require('fs');
const path = require('path');

const { getInstalledDir, getEnabledDir, addPendingOp, isAddonDisablementPending, rmPendingOp }= require('./addons_utils')
const { parse_command_obj}= require('../utils')

const core_cmd= require("../../config/core_commands.json")


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

async function pendingOps_update_try(karter){
    var pendingOps_cmd= undefined
    if((!Boolean(core_cmd[karter])) || !Boolean(pendingOps_cmd=core_cmd[karter].pending_ops)){
        hereLog(`[pending_ops - config read failure] missing or bad config in 'core_commands.json' for 'pending_ops' cmd of '${karter}'…`)
        return false;
    }

    try{
        await parse_command_obj(pendingOps_cmd, 4000)

        return true;
    } catch(err){
        hereLog(`[pending_ops update] no pending_op update for '${karter}' - ${err}`)

        return false;
    }
}



async function API_addons_enable(req, res, next){
    let karter= req.params.karter
    let addons= req.body.addons
    if (!addons){
        return res.status(400).send({status: 'bad_request'})
    }
    if(!Array.isArray(addons)) addons= [addons]

    var enabled= [], failed= []
    for(var addon of addons){
        if(enable_addon(karter, addon)){
            enabled.push(addon)
            try{
                if(await isAddonDisablementPending(karter, addon)){
                    await rmPendingOp(karter, 'disablement', addon)
                }
            }
            catch(err){
                hereLog(`[API_addon_enable]{${karter}} error handling re-enablement of '${addon}' - ${err}`)
            }
        }
        else { failed.push(addon)}
    }

    if(failed.length<=0){
        await pendingOps_update_try(karter)
        return res.status(200).send({status: 'success', enabled})
    }
    else if(enabled.length>0){
        await pendingOps_update_try(karter)
        return res.status(201).send({status: 'partial', enabled, failed})
    }
    else{
        return res.status(513).send({status: 'failure', failed})
    }
}

async function API_addons_disable(req, res, next){
    let karter= req.params.karter
    let addons= req.body.addons
    if (!addons) return res.status(400).send({status: 'bad_request'})
    if(!Array.isArray(addons)) addons= [addons]

    var disabled= [], failed= []
    for(var addon of addons){
        // if(disable_addon(karter, addon)){ disabled.push(addon)}
        // else { failed.push(addon)}
        try{
            if(await addPendingOp(karter, 'disablement', addon)){
                disabled.push(addon)
            }
            else{
                hereLog(`[API_addons_disable_pending]{${karter}} Couldn't insert a pending disablement for '${addon}'`)
                failed.push(addon)
            }
        } catch(err){
            hereLog(`[API_addons_disable_pending]{${karter}} no '${addon}' disablement - ${err}`)
            failed.push(addon)
        }
    }

    if(failed.length<=0){
        await pendingOps_update_try(karter)
        return res.status(200).send({status: 'success', disabled})
    }
    else if(disabled.length>0){
        await pendingOps_update_try(karter)
        return res.status(201).send({status: 'partial', disabled, failed})
    }
    else{
        return res.status(513).send({status: 'failure', failed})
    }
}

async function API_addons_remove(req, res, next){
    let karter= req.params.karter
    let addons= req.body.addons
    if (!addons) return res.status(400).send({status: 'bad_request'})
    if(!Array.isArray(addons)) addons= [addons]

    var removed= [], failed= []
    for(var addon of addons){
        // if(remove_addon(karter, addon)){ removed.push(addon)}
        // else { failed.push(addon)}
        try{
            if(await addPendingOp(karter, 'deletion', addon)){
                removed.push(addon)
            }
            else{
                hereLog.err(`[API_addons_remove_pending]{${karter}} Couldn't insert a pending deletion for '${addon}'`)
                failed.push(addon)
            }
        } catch(err){
            hereLog(`[API_addons_remove_pending]{${karter}} no '${addon}' deletion - ${err}`)
            failed.push(addon)
        }
    }

    if(failed.length<=0){
        await pendingOps_update_try(karter)
        return res.status(200).send({status: 'success', removed})
    }
    else if(removed.length>0){
        await pendingOps_update_try(karter)
        return res.status(201).send({status: 'partial', removed, failed})
    }
    else{
        return res.status(513).send({status: 'failure', failed})
    }
}

module.exports= { API_addons_enable, API_addons_disable, API_addons_remove }
