
const child_process= require("child_process");


function execute_sh_command(sh_cmd_string, timeout=0){
    return new Promise( (resolve, reject) => {
        try{
            child_process.exec(sh_cmd_string, {timeout: timeout},
                (error, stdout, stderr) => {
                    if (error){
                        reject(`Error calling sh cmd "${sh_cmd_string}" : ${error} - ${stderr}`)
                    }
                    
                    resolve(stdout.trim());
                }
            );
        }
        catch(e){
            reject(`Error calling sh cmd "${sh_cmd_string}" : ${e}`)
        }
    })
}

module.exports.execute_sh_command= execute_sh_command