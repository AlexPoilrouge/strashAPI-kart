


const { ServerInfo_Promise }= require("./serv_info");

const kart_util= require("./kart_util");

const strashbot_info= require("../config/info/strashbot_info.json");
const others_info= require("../config/info/others_info.json");
const e = require("express");

function _fetch_real_address_and_port(addr, p){
    var address= addr
    var port= (Boolean(p)?p:5029)

    if( (!Boolean(address)) || ((!(strashbot_info.ADDRESS.includes(address))) && (strashbot_info.NAMES.includes(address))) )
    {
        address= strashbot_info.ADDRESS[0]
    }
    else if ( Boolean(others_info.list) && ((others_info.list.length>0)))
    {
        matching_name_serv_obj= others_info.list.find( obj => {
                return (obj.NAMES.includes(address))
            })

        if (Boolean(matching_name_serv_obj)){
            address= matching_name_serv_obj.ADDRESS[0]
            port= (matching_name_serv_obj.PORT? matching_name_serv_obj.PORT : port )
        }
    }

    return { address, port }
}

function _parse_command_obj_local(cmd_obj){
    return kart_util.execute_sh_command(cmd_obj.cmd, (cmd_obj.timeout?cmd_obj.timeout:32000))
            .then( output => {
                try {
                    return JSON.parse(output)
                }
                catch(e) {
                    throw { status: "bad_command", error: `Error parsing sh cmd "${cmd_obj.cmd}" output: ${e}`}
                }
            })
            .catch(e => {
                throw { status: "bad_command", error: `${Boolean(e.error)?e.error:e}` }
            })
}

function _parse_command_obj_ssh(cmd_obj){
    return new Promise((resolve, reject) => {
        var distant= (Boolean(cmd_obj.machine)?cmd_obj.machine:"localhost")
        var port= (Boolean(cmd_obj.port)?cmd_obj.port:"")
        var user= (Boolean(cmd_obj.user)?cmd_obj.user:"")

        let ssh_cmd= `ssh ${Boolean(user)?`${user}@`:""}${distant} ${Boolean(port)?`-p ${port}`:""} ${cmd_obj.cmd}`

        _parse_command_obj(ssh_cmd).then(result_obj => {
            resolve(result_obj)
        }).catch(e =>{
            reject(e);
        });
    })
}

function _parse_command_obj(cmd_obj){
    if ((!Boolean(cmd_obj.type)) || (cmd_obj.type.toLowerCase()==="local")){
        return _parse_command_obj_local(cmd_obj)
    }
    else if(cmd_obj.type.toLowerCase()==="ssh"){
        return _parse_command_obj_ssh(cmd_obj)
    }
}

function process_args(addr, p=5029){
    let { address, port } = _fetch_real_address_and_port(addr, p);

    console.log( `address: ${address}; port: ${port}`)

    return ServerInfo_Promise(address, port).then( async info => {
        var serv_obj= null

        if (strashbot_info.ADDRESS.includes(address)){
            serv_obj= strashbot_info
        }
        else if(Boolean(others_info.list) && ((others_info.list.length>0))){
            serv_obj= others_info.list.find( obj => {
                    return (obj.NAMES.includes(address) || obj.ADDRESS.includes(address))
                });
        }

        if (Boolean(serv_obj) && Boolean(serv_obj.additionnal_cmd)){
            for (key in serv_obj.additionnal_cmd){
                cmd_res= await _parse_command_obj(serv_obj.additionnal_cmd[key]).then(result_obj => {
                        result_obj.status= "OK"
                        return result_obj
                    })
                    .catch(err => {
                        if (err.status!=="bad_command") throw err;
                        else {
                            console.error(`[ServerInfo_Promise (${address}, ${port}) - ERROR] ${err.error}`)
                            return { status: "unavailable", info: "internal error" }
                        }
                    })

                if (Boolean(cmd_res))
                    info[key]= cmd_res
            }
        }

        if(Boolean(serv_obj) && Boolean(serv_obj.thumbnail)){
            info.thumbnail= serv_obj.thumbnail
        }

        if(Boolean(address)){
            info.address=
                `${address}${((Boolean(port)) && (port!=5029))?`:${port}`:''}`
        }

        return info
    })
    .catch(e => {
        throw {status: "query_error", error: e}
    })
}

module.exports.process_kart_info_args= process_args;