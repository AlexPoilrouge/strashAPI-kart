
const fs= require('fs')
const path = require('path');


const addons_config= require("../../config/addons.json")

const MB_size= 1024 * 1024;

let hereLog= (...args) => {console.log("[utils]", ...args);};


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

function _getKarterSubdir(karter, dirbasename, ensure){
    const dirpath= path.join(addons_config.racers[karter].directory, dirbasename)

    if(ensure) _ensureDirectory(dirpath)

    return dirpath
}

let getInstalledDir = (karter, ensure=false) => _getKarterSubdir(karter, 'installed', ensure)
let getEnabledDir = (karter, ensure=false) => _getKarterSubdir(karter, 'enabled', ensure)


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

module.exports= { MB_size, getKarters, karterReqCheck, getInstalledDir, getEnabledDir,
                    listInstalledAddons, listEnabledAddons, isAddonInstalled, isAddonEnabled
                }