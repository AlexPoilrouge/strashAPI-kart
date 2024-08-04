
const fs= require('fs')
const path = require('path');

const { FileMutex } = require('../kart_util')


const addons_config= require("../../config/addons.json");
const { unlock } = require('proper-lockfile');

const MB_size= 1024 * 1024;

let hereLog= (...args) => {console.log("[utils]", ...args);};

const pendingOpFilename= "pending_op.json"


function getKarters(){
    return (addons_config && addons_config.racers)? Object.keys(addons_config.racers) : [];
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

function _ensureDirectory(in_path){
    const isFile = path.extname(in_path) !== '';
    // If it's a file path, get the containing directory
    const dirPath = isFile ? path.dirname(in_path) : in_path;

    if (!fs.existsSync(dirPath)) {
        hereLog(`ensureDirectory(${dirPath}) - creating '${dirPath}'`)

        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function _ensureFile(filePath){
    try {
        if (fs.existsSync(filePath)) {
            if (fs.statSync(filePath).isFile()) {
                return true;
            } else {
                hereLog(`[ensureFile](${path}) - path exists as a directory…`)
                return false;
            }
        } else {
            fs.writeFileSync(filePath, '');
            return true;
        }
    } catch (error) {
        hereLog(`[ensureFile](${path}) - ${error}`)
        return false;
    }
}

function _getKarterSubdir(karter, dirbasename, ensure){
    const dirpath= path.join(addons_config.racers[karter].directory, dirbasename)

    if(ensure) _ensureDirectory(dirpath)

    return dirpath
}

function _getKarterSubfile(karter, subpath, ensure){
    const filepath= path.join(addons_config.racers[karter].directory, subpath)

    if(ensure){ 
        _ensureDirectory(path.dirname(dirpath))

        if(!_ensureFile(filepath)) return undefined
    }

    return filepath
}

let getInstalledDir = (karter, ensure=false) => _getKarterSubdir(karter, 'installed', ensure)
let getEnabledDir = (karter, ensure=false) => _getKarterSubdir(karter, 'enabled', ensure)

let getAddonPendingOpFile = (karter, ensure=false) => _getKarterSubfile(karter, pendingOpFilename, ensure)


function _listAddonDir(addonDirectory, filter=null){
    if(!fs.existsSync(addonDirectory)) return []

    var list= fs.readdirSync(addonDirectory)
                .map(file => path.join(addonDirectory, file))
    if(list && filter)
        list= list.filter(filter)

    return list
}

const listInstalledAddons= (karter) => _listAddonDir(getInstalledDir(karter),
        file => {
            const fileExt = path.extname(file).toLowerCase();
            return (addons_config.allowed_filenameExt.includes(fileExt)
                        && !fs.statSync(file).isDirectory()
                    );
        }
)
const listEnabledAddons= (karter) => _listAddonDir(getEnabledDir(karter),
        file => fs.lstatSync(file).isSymbolicLink()
)

const _isAddonListed= (addonFile_list, addonName) => addonFile_list && Boolean(
    addonFile_list.find(addon_file => path.basename(addon_file)===addonName)
)

const isAddonInstalled= (karter, addonName) => _isAddonListed(listInstalledAddons(karter), addonName)
const isAddonEnabled= (karter, addonName) => _isAddonListed(listEnabledAddons(karter), addonName)

function _fetchPendingOpData(karter){
    let empty= { deletion: [], disablement: [] }

    try {
        let pendingOp_filepath= getAddonPendingOpFile(karter, true)
        if(!pendingOp_filepath) return empty;

        const absolutePath = path.resolve(filePath); // Ensure the path is absolute
        const data = fs.readFileSync(absolutePath, 'utf8'); // Read the file as a string

        if(!data.deletion) data.deletion= []
        if(!data.disablement) data.disablement= []

        return JSON.parse(data); // Parse the JSON string to an object
    } catch (error) {
        hereLog(`[fetchPendingOpData]{${karter}} error - ${error}`);
        
        return empty
    }
}

function _setPendingOpData(karter, pendingOp_obj){
    let pendingOp_filepath= getAddonPendingOpFile(karter, true)
    if(!pendingOp_filepath) throw Error(`Cant' save pending op data to corresponding file (for ${karter})`)

    try {
        const jsonData = JSON.stringify(jsonObject, null, 2); // Convert object to JSON string with pretty print
        fs.writeFileSync(pendingOpFilename, jsonData, 'utf8'); // Write JSON data to the file
        console.log(`Data successfully written to ${absolutePath}`);
    } catch (error) {
        hereLog(`[fetchPendingOpData]{${karter}} can't write pending op data - ${error}`);
        throw error;
    }
}

function _removePendingOpData(in_out_pendingOp_data, op, addon_filename){
    var notfound_check= true
    in_out_pendingOp_data[op]= in_out_pendingOp_data[op].filter(fn => {
        let b= (fn != addon_filename)
        notfound_check= notfound_check && b
        return b
    })

    // if(!notfound_check) _setPendingOpData(karter, data)
    return !notfound_check
}

function _addPendingOpData(in_out_pendingOp_data, op, addon_filename){
    var found_check= Boolean(in_out_pendingOp_data[op].find(addon_filename))

    if(!found_check){
        in_out_pendingOp_data[op].push(addon_filename)
        return true
    }
    return false
}

async function addPendingOp(karter, op, addon_filename){
    let lock= new FileMutex(getAddonPendingOpFile(karter))
    await lock.LockWait()

    var data= _fetchPendingOpData(karter)
    let other_op= (op==="disablement")? "deletion" : "disablement"

    var change= false
    change= change || _rmPendingOpData(data, other_op, addon_filename)
    change= change || _addPendingOpData(data, op, addon_filename)

    if(change) _setPendingOpData(karter, data)

    lock(unlock)

    return data
}

async function rmPendingOp(karter, op, addon_filename){
    let lock= new FileMutex(getAddonPendingOpFile(karter))
    await lock.LockWait()

    var data= _fetchPendingOpData(karter)

    if(_removePendingOpData(data, op, addon_filename))
        _setPendingOpData(karter, data)

    lock.Unlock()

    return data
}

function _hasPendingOp(karter, addon_filename, op){
    var data= _fetchPendingOpData(karter)

    return Boolean(data[op].find(fn => fn === addon_filename))
}
let isAddonDeletionPending = (karter, addon_filename) => _hasPendingOp(karter, addon_filename, "deletion")
let isAddonDisablementPending = (karter, addon_filename) => _hasPendingOp(karter, addon_filename, "disablement")

module.exports= { MB_size, getKarters, karterReqCheck, getInstalledDir, getEnabledDir,
                    getAddonPendingOpFile, addPendingOp, rmPendingOp, isAddonDeletionPending, isAddonDisablementPending,
                    listInstalledAddons, listEnabledAddons, isAddonInstalled, isAddonEnabled
                }