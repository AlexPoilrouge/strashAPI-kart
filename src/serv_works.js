


const { ServerInfo_Promise }= require("./serv_info");

const kart_util= require("./kart_util");

const strashbot_info= require("../config/info/strashbot_info.json");
const others_info= require("../config/info/others_info.json");
const core_cmd= require("../config/core_commands.json")

let default_racers="ringracers"
if(strashbot_info){
    var r= Object.values(strashbot_info).find(v => v.default)
    if(r && r.name) default_racers= r.name
}

function _lookForKarterThatMatchesAsAdressOrAlias(pattern, port=undefined){
    if(!pattern) return strashbot_info[default_racers]

    if(Object.keys(strashbot_info).includes(pattern.toLowerCase())){
        return strashbot_info[pattern.toLowerCase()]
    }

    for(let karter_name in strashbot_info){
        let kart_obj= strashbot_info[karter_name]

        if(kart_obj.NAMES.includes(pattern)
            ||  kart_obj.ADDRESS.includes(pattern)
        ){
            return kart_obj
        }
        if(kart_obj.NAMES.includes(pattern)){
            return kart_obj
        }
        if(kart_obj.ADDRESS.includes(pattern.toLowerCase())){
            if((!Boolean(port)) ||
                (port===kart_obj.PORT)
            ){
                return kart_obj
            }
        }
    }

    return undefined
}

function _fetch_connectionObject(addr, p){
    var address= addr
    var port= (Boolean(p)?p:5029)
    
    var karter_obj= _lookForKarterThatMatchesAsAdressOrAlias(address, port)
    if(Boolean(karter_obj)){
        karter_obj.connection= {
            address: ( (karter_obj.ADDRESS.includes(address))?
                            address
                        :   karter_obj.ADDRESS[0]),
            port: (karter_obj.PORT ?? port)
        }

        return karter_obj
    }
    else if( Boolean(others_info.list)){
        for(let item of others_info.list){
            var b_addrmatch= false
            if(item.NAMES.includes(address)
                || (b_addrmatch=item.ADDRESS.includes(address))
            ){
                karter_obj= Object.assign({},item)

                karter_obj.connection= {
                    address: ((b_addrmatch)? address : item.ADDRESS[0]),
                    port: (item.PORT ?? port)
                }

                return karter_obj
            }
        }
    }

    return { connection: { address, port } }
}


function process_args(addr, p=5029){
    let kartservInfos= _fetch_connectionObject(addr, p);
    let { address, port }= kartservInfos.connection

    console.log( `address: ${address}; port: ${port}`)

    return ServerInfo_Promise(address, port).then( async info => {
        if (Boolean(kartservInfos.additionnal_cmd)){
            for (key in kartservInfos.additionnal_cmd){
                cmd_res= await kart_util.parse_command_obj(kartservInfos.additionnal_cmd[key]).then(result_obj => {
                        result_obj.status= "OK"
                        return result_obj
                    })
                    .catch(err => {
                        if (!["cmd_error", "bad_command"].includes(err.status)) throw err;
                        else {
                            console.error(`[ServerInfo_Promise (${address}, ${port}) - ERROR] ${err.error}`)
                            return { status: "unavailable", info: "internal error" }
                        }
                    })

                if (Boolean(cmd_res))
                    info[key]= cmd_res
            }
        }

        if(Boolean(kartservInfos.thumbnail)){
            info.thumbnail= kartservInfos.thumbnail
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

function _run_core_cmd(op="service", karter=undefined){
    var cmd= undefined
    let _op= (op ?? "service").toLocaleLowerCase()

    let _karter= karter ?? default_racers
    if((!Boolean(core_cmd[_karter])) || !Boolean(cmd=core_cmd[_karter][_op])){
        console.log(`[service cmd - config read failure]{${_op}} missing or bad config in 'core_commands.json' for 'service' cmd of '${karter}'…`)
        throw {status: "CONFIG_ERROR"} // caught into 404
    }

    return kart_util.parse_command_obj(cmd, 5000)
}

function about_service(karter=undefined){
    return _run_core_cmd('service', karter).then(result_obj => {
        if ( (!Boolean(result_obj)) || (!Boolean(result_obj.result)) ){
            throw { status: "ERROR" } // caught into 500 
        }

        return {
            status: `${(['active','ok','up','true','online','running'].includes(result_obj.result.toLowerCase()))?"UP":"DOWN"}`
        }
    })
    .catch(e => {
        if(Boolean(e.status) && e.status==='cmd_error'
            && Boolean(e.stdout) && Boolean(e.stdout.toLowerCase)
            && ['inactive','ko','down','false','offline','dead'].includes(e.stdout.toLowerCase())
        ){
            return {status: "DOWN"}
        }
        console.log(`[about service - parse command fail] `+
            `${Boolean(e.status)?(e.status+" - "):''}`+
            `${(Boolean(e.error) && Boolean(e.error.code))?(`code: ${e.error.code} - `):''}` +
            `${(Boolean(e.stderr)?e.stderr:'')}`
        )

        return {
            status: `UNAVAILABLE`
        }
    })
}

function _handle_service(op='restart', karter=undefined){
    return _run_core_cmd(`${op}`, karter).then(result_obj => {
        if ( (!Boolean(result_obj)) || (!Boolean(result_obj.state)) ){
            throw { status: "CMD_ERROR" } // caught into 500 
        }

        return result_obj
    })
    .catch(e => {
        console.log(`[${op} service - parse command fail] `+
            `${Boolean(e.status)?(e.status+" - "):''}`+
            `${(Boolean(e.error) && Boolean(e.error.code))?(`code: ${e.error.code} - `):''}` +
            `${(Boolean(e.stderr)?e.stderr:'')}`
        )

        throw e
    })
}

let restart_service = (karter=undefined) => _handle_service('restart', karter)
let stop_service = (karter=undefined) => _handle_service('stop', karter)

module.exports.process_kart_info_args= process_args;
module.exports.about_kart_service= about_service;
module.exports.restart_service= restart_service;
module.exports.stop_service= stop_service;
