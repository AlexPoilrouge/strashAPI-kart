
const child_process= require("child_process");
const lockfile = require('proper-lockfile');
const path = require('path')


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

    async LockWait(time_out_sec=60){
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
        return this.filepath() && lockfile.checkSync(this.filepath)
    }
}

module.exports= {execute_sh_command, _errHandle, FileMutex}