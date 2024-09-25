const axios = require('axios');
const child_process= require("child_process");
const lockfile = require('proper-lockfile');
const path = require('path');
const fs = require('fs');

let hereLog= (...args) => {console.log("[kart_util]", ...args);};

function execute_sh_command(sh_cmd_string, timeout=0){
    return new Promise( (resolve, reject) => {
        try{
            child_process.exec(sh_cmd_string, {timeout: timeout},
                (error, stdout, stderr) => {
                    if (error){
                        // reject(`Error calling sh cmd "${sh_cmd_string}" : ${error} - ${stderr}`)
                        if(error.signal==='SIGTERM'){
                            reject({status: 'interrupted', error, stdout: stdout.trim(), stderr})
                        }
                        else{
                            reject({status: 'error', error, stdout: stdout.trim(), stderr})
                        }
                    }
                    
                    resolve(stdout.trim());
                }
            );
        }
        catch(e){
            reject({status: 'failure', error: e});
        }
    })
}

function _parse_command_obj_local(cmd_obj, default_timeout=32000){
    return execute_sh_command(cmd_obj.cmd, (cmd_obj.timeout ?? default_timeout))
            .then( output => {
                try {
                    return JSON.parse(output)
                }
                catch(e) {
                    if (Boolean(output)){
                        try {
                            return { result: `${output}`}
                        }
                        catch(e) {
                            throw { status: "bad_output_reading", error: `Error parsing sh cmd "${cmd_obj.cmd}" - unprocessable output - ${e}`}
                        }
                    }
                    else
                        throw { status: "bad_output_parsing", error: `Error parsing sh cmd "${cmd_obj.cmd}" output: ${e}`}
                }
            })
            .catch(e => {
                if(Boolean(e.status) && e.status==='error'){
                    throw { status: `cmd_error`, error: e.error, stdout: e.stdout, stderr: e.stderr}
                }
                else
                    throw { status: `cmd_${e.status}`, error: `${Boolean(e.error)?e.error:e}` }
            })
}

function _parse_command_obj_ssh(cmd_obj, default_timeout=32000){
    return new Promise((resolve, reject) => {
        var distant= (Boolean(cmd_obj.machine)?cmd_obj.machine:"localhost")
        var port= (Boolean(cmd_obj.port)?cmd_obj.port:"")
        var user= (Boolean(cmd_obj.user)?cmd_obj.user:"")

        let ssh_cmd= `ssh ${Boolean(user)?`${user}@`:""}${distant} ${Boolean(port)?`-p ${port}`:""} ${cmd_obj.cmd}`

        _parse_command_obj(ssh_cmd, default_timeout).then(result_obj => {
            resolve(result_obj)
        }).catch(e =>{
            reject(e);
        });
    })
}

function parse_command_obj(cmd_obj, default_timeout=32000){
    if ((!Boolean(cmd_obj.type)) || (cmd_obj.type.toLowerCase()==="local")){
        return _parse_command_obj_local(cmd_obj, default_timeout)
    }
    else if(cmd_obj.type.toLowerCase()==="ssh"){
        return _parse_command_obj_ssh(cmd_obj, default_timeout)
    }
    else{
        throw new Error(`Bad cmd type - got ${cmd_obj.type}`)
    }
}



let _errHandle= (err, fallbackFn) =>    {  if((Boolean(err)) && Boolean(err.status)) return err;
    else return fallbackFn(err);
}

class FileMutex{
    constructor(filepath){
        this.filepath= path.resolve(filepath)
    }

    Lock(){
        if(this.filepath)
            lockfile.lockSync(this.filepath)
    }

    _lockWait(time_out){
        return new Promise(resolve => {
            setTimeout(resolve, time_out)
        })
    }

    async LockWait(time_out_sec=30){
        const MAX_TIME= time_out_sec*1000
        var ellapsed=0
        let step= 33

        let locked= false
        while(ellapsed<MAX_TIME){
            if(this.isLocked()){
                await this._lockWait(step)
                ellapsed+= step
            }
            else{
                this.Lock()
                locked= true
                break
            }
        }

        if(!locked) throw new Error(`Couldn't get file lock on file '${this.filepath}'…`)
    }

    Unlock(){
        if(this.filepath)
            lockfile.unlockSync(this.filepath)
    }

    isLocked(){
        return this.filepath && lockfile.checkSync(this.filepath)
    }
}

async function fileInfo_preDownload(url){
    const headResponse = await axios.head(url);
    const fileSize = parseInt(headResponse.headers['content-length'], 10);
    const mimeType = headResponse.headers['content-type'];

    return { fileSize, mimeType };
}

function getFilenameFromUrl(fileUrl) {
    let parsedUrl = new URL(fileUrl);
    parsedUrl.query=''
    parsedUrl.search=''

    // Extract the pathname
    const pathname = parsedUrl.pathname;
    // Get the basename (the filename with extension)
    const filename = path.basename(pathname);
  
    return filename;
}

async function file_download(url, installDirectory, filebasename=undefined){
    let filename= filebasename ?? getFilenameFromUrl(url)

    const addonPath= path.resolve(installDirectory, filename)

    // axios image download with response type "stream"
    const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
    })

    // pipe the result stream into a file on disc
    response.data.pipe(fs.createWriteStream(addonPath))

    // return a promise and resolve when download finishes
    return new Promise((resolve, reject) => {
        response.data.on('end', () => {
            resolve(addonPath)
        })

        response.data.on('error', err => {
            reject(err)
        })
    })
}

module.exports= {
    execute_sh_command, parse_command_obj,
    _errHandle, FileMutex,
    fileInfo_preDownload, getFilenameFromUrl, file_download
}