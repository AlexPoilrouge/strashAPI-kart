//This is basically NodeJS translated code from
// NielsjeNL's srb2kb
// with parts left out (addons listing), because not
// relevant at this time
// https://github.com/NielsjeNL/srb2kb/blob/main/srb2kpacket.py


var udp = require('dgram');

let hereLog= (...args) => {console.log("[kart - servinfo]", ...args);};


let _ADDR="127.0.0.1"
let _PORT=5029

const REQUESTS={
    ASKINFO:           {code: 12,   name:"ASKINFO"},
    SERVERINFO:        {code: 13,   name:"SERVERINFO"},
    PLAYERINFO:        {code: 14,   name:"PLAYERINFO"},
    TELLFILESNEEDED:   {code: 32,   name:"TELLFILESNEEDED"},
    MOREFILESNEEDED:   {code: 33,   name:"MOREFILESNEEDED"}
}

const CONTROLS={
    RACE:              {code: 2,    name:"RACE"},
    MATCH:              {code: 3,    name:"MATCH"},
    SPEEDMASK:         {code: 0x03, name:"SPEEDMASK"}
}

const DRRR_KARTVARS= {
    IS_DEDICATED_SERVER: 0x40,
    SPEEDMASK: 0x03,
    LOTS_OF_ADDONS: 0x20,
}

const PK_FORMATS={
    'SERVERINFO': {
        'header': {
            'format':
                'B_255/'           +
                'Bpacketversion/'  +
                '16sapplication/'  +
                'Bversion/'        +
                'Bsubversion/',
            'strings': [
                'application'
            ]
        },
        'srb2k': {
            'format':
                'Bnumberofplayer/' +
                'Bmaxplayer/'      +
                'Bgametype/'       +
                'Bmodifiedgame/'   +
                'Bcheatsenabled/'  +
                'Bisdedicated/'    +
                'Bfileneedednum/'  +
                'Itime/'           +
                'Ileveltime/'      +
                '32sservername/'   +
                '8smapname/'       +
                '33smaptitle/'     +
                '16smapmd5/'       +
                'Bactnum/'         +
                'Biszone/'         +
                '256shttpsource/'  +
                '*sfileneeded',

            'strings': [
                'servername',
                'mapname',
                'maptitle',
                'httpsource',
            ]
        },
        'drrr': {
            'format':
                '4Bcommit/'        +
                'Bnumberofplayer/' +
                'Bmaxplayer/'      +
                'Brefusereason/'   +
                '24sgametypename/' +
                'Bmodifiedgame/'   +
                'Bcheatsenabled/'  +
                'Bkartvars/'       +
                'Bfileneedednum/'  +
                'Itime/'           +
                'Ileveltime/'      +
                '32sservername/'   +
                '33smaptitle/'     +
                '16smapmd5/'       +
                'Bactnum/'         +
                'Biszone/'         +
                '256shttpsource/'  +
                'Havgpwrlvl/'      +
                '*sfileneeded',
    
            'strings': [
                'gametypename',
                'servername',
                'maptitle',
                'httpsource',
            ],
        },

        'minimum': 151,
    },
    'PLAYERINFO': {
        'format':
            'Bnode/'           +
            '22sname/'         +
            '4saddress/'       +
            'Bteam/'           +
            'Bskin/'           +
            'Bdata/'           +
            'Iscore/'          +
            'Htimeinserver',

        'strings': [
            'name'
        ],

        'minimum': 36,
    }
}

function toArrayBuffer(buf) {
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}

function toBuffer(ab) {
    var buf = Buffer.alloc(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        buf[i] = view[i];
    }
    return buf;
}

class Packet{
    constructor(req){
        this.type= req.code
        
        var b= Buffer.alloc(9)
        b.fill(0x00)
        var offset= 8

        if(this.type===REQUESTS.ASKINFO.code){
            offset-=5
        }
        offset-=1
        b.writeUInt8(req.code,offset)
        
        var b_checksum= Buffer.alloc(4)
        b_checksum.writeUInt32LE(Packet._checksum(b,0))

        this.buffer= Buffer.concat([b_checksum,b])
    }

    static _checksum(buf,l){
        var n= buf.length-l
        var c= 0x1234567
        var str= "c + "
        for (var i=0; i<n; ++i){
            str= str +`(${(String.fromCharCode(buf[l+i]).charCodeAt(0))*(i+1)}) + `
            c+= (String.fromCharCode(buf[l+i]).charCodeAt(0))*(i+1)
        }
        return c
    }
}

class KartServInfo{
    constructor(addr=_ADDR, port=_PORT){
        this.addr= addr
        this.port= port

        this.soc= udp.createSocket('udp4');

        this.soc.on('message',this._onMessage.bind(this))

        this.closed= false
        this.soc.on('close',()=>{
            this.closed= true
        })

        this.timedout= false

        this.recieved_data= []
    }

    send(req){
        var pac= new Packet(req)
        if(this.closed){
            this.soc.connect(this.port,this.addr,()=>{hereLog('connect?')})
        }
        this.soc.send(pac.buffer,this.port,this.addr,function(error){
            if(error){
                hereLog(`Sending error: ${error}`)
            }
        })
    }
    
    _onMessage(msg,info){
        this.recieved_data.push(msg)
        if(this.read(REQUESTS.SERVERINFO)){}
        else if(this.read(REQUESTS.PLAYERINFO)){
            this._on_recieve_playerInfos(this.playerinfo)
        }
        else{
            hereLog(`[OnMessage] Unknown response from server…`)
        }
    }

    _unpack_integer(buf, offset, readmethod='readUInt8', size=1){
        var res= undefined
        if(size>1){
            res= []
            for(var i=0; i<size; ++i){
                res.push( buf[readmethod](offset+(i*size)) )
            }
        }
        else
            res= buf[readmethod](offset)
        return res
    }

    _unpack_format(format,buf,offset){
        var match= undefined
        var size= 1
        var f= format
        if(Boolean(match=format.match(/^(^\d+)(.*)$/))){
            size= Number(match[1])
            f= match[2]
        }

        var ret= {size: size}
        switch(f){
            case 'B':
                // ret.data= buf.readUInt8(offset)
                ret.data= this._unpack_integer(buf, offset, 'readUInt8', size)
            break;
            case 'I':
                // ret.data= buf.readUInt32LE(offset)
                ret.data= this._unpack_integer(buf, offset, 'readUInt32LE', size)
                ret.size= 4*size
            break;
            case 'H':
                // ret.data= buf.readUInt16LE(offset)
                ret.data= this._unpack_integer(buf, offset, 'readUInt16LE', size)
                ret.size= 2*size
            break;
            case 's':
                var str=""
                for(var i=0; i<size; ++i){
                    var c= buf.readUInt8(offset+i)
                    str+= String.fromCharCode(c)
                }
                ret.data= str
            break;
        }
        return ret
    }

    php_unpack(format,buf,offset){
        var off= offset
        var format_array= format.split('/')
        var output= {}
        for (var data_format of format_array){
            var unpack_param= ""
            var unpack_param_len= 0
            for (var i=0; i<data_format.length; ++i){
                var c= data_format[i]
                unpack_param+= c
                unpack_param_len+= 1
                if( !(/^\d$/.test(c)) && c!=='*' ) break;
            }
            if (unpack_param.includes('*')){
                unpack_param= `${buf.length-off}`+unpack_param.slice(-1)
            }
            var data= this._unpack_format(unpack_param,buf,off)
            var data_format_name= data_format.slice(unpack_param_len)
            output[data_format_name]= data.data

            off+= data.size
        }

        return output
    }

    cstr(s){
        var size= 0
        var n= -1
        if((s.length>0) && ((n=(s.indexOf('\0')))>=0) && n<s.length){
            size= n
        }
        else{
            size= s.length
        }
        return s.slice(0,size)
    }

    processData(pkf,minimum,buf,offset,n=0){
        var _n= n*minimum
        if(_n+minimum>buf.length){
            return false
        }
        
        var t= this.php_unpack(pkf['format'],buf,offset+_n)
        if ('strings' in pkf){
            for (var s of pkf['strings']){
                t[s]= this.cstr(t[s])
            }
        }
        return t
    }

    unpack(buf, req, unpk= True){
        var n= buf.length
        if(n<8){
            hereLog("[unpack] header")
            return false
        }
        if(buf.readUInt32LE()!==Packet._checksum(buf,4)){
            hereLog("[unpack] bad checksum")
            return false
        }
        if(!Boolean(req)){
            hereLog("[unpack] unknown type")
            return false
        }
        var p_type= String.fromCharCode(buf[6]).charCodeAt(0)
        if(p_type!==req.code){
            // hereLog(`[unpack] bad type (got ${p_type})`)
            return false
        }
        var pkf= PK_FORMATS[req.name]
        if(!Boolean(pkf)){
            hereLog("[unpack] unknown format")
            return false
        }
        var pkf_min= pkf['minimum']
        if(n<pkf_min){
            hereLog("[unpack] smaller than minimum")
            return false
        }
        var offset= 8
        var res= undefined
        if(req.code===REQUESTS.SERVERINFO.code){
            this.servinfo= undefined

            let header= this.processData(pkf['header'],pkf_min,buf,offset)
            var app_data= {}
            if(header['application'].toLowerCase()==="ringracers"){
                app_data= this.processData(pkf['drrr'],pkf_min-20,buf,offset+20)
            }
            else{
                app_data= this.processData(pkf['srb2k'],pkf_min-20,buf,offset+20)
            
                if(app_data['gametype']===CONTROLS.RACE.code){
                    let speeds= ['Easy','Normal','Hard']

                    var c= app_data['isdedicated']
                    var speed= speeds[(c & CONTROLS.SPEEDMASK.code)]
                    app_data['kartspeed']= (Boolean(speed))? speed : 'Too fast'
                }
            }

            this.servinfo= Object.assign({}, header, app_data)

            res= this.servinfo
        }
        else if(req.code===REQUESTS.PLAYERINFO.code){
            this.playerinfo= {}
            var mpk= this.processData(pkf,pkf_min,buf,offset)
            for(var i=0; i<32; ++i){
                var pk= this.processData(pkf,pkf_min,buf,offset,i)
                if(!Boolean(pk)){
                    break;
                }
                if(pk['node']<255){
                    if(!Boolean(this.playerinfo.players)) this.playerinfo.players= []
                    var p= {}
                    p['name']= pk['name']
                    var t= pk['team']
                    p['team']= (t===0)?"PLAYING":((t===1)?"RED":((t===2)?"BLUE":((t===255)?"SPECTATOR":"UNKNOWN")))
                    p['score']= pk['score']
                    p['seconds']= pk['timeinserver']

                    this.playerinfo.players.push(p)
                }
            }

            res= this.playerinfo
        }

        return Boolean(res)
    }

    read(req, unpk=true){
        var pk= false

        if (this.recieved_data.length>0){
            var b= this.unpack(this.recieved_data[0],req,unpk)
            if(b) this.recieved_data.shift()
            pk= b || pk
        }

        return pk
    }

    ask(timeout=10000){
        if(this.servinfo){
            delete this.servinfo
            this.servinfo= undefined
        }
        if(this.playerinfo){
            delete this.playerinfo
            this.playerinfo= undefined
        }
        if(this.timer){
            clearTimeout(this.timer)
            delete this.timer
            this.timer= undefined
        }

        this.send(REQUESTS.ASKINFO)
        this.timedout= false
        this.timer= setTimeout(() =>{
            this.timedout= true
            this.soc.close()
            if(this.timeout_func) this.timeout_func()
        },timeout)
    }
    
    bye(){
        if (Boolean(this.soc)){
            // hereLog("closing...")
            try{
                this.soc.close()
            } catch(err){
                hereLog(`[bye] couldn't close socket:\n\t${err}`)
            }
        }
        if(Boolean(this.timer)){
            clearTimeout(this.timer)
        }
    }

    onTimeOut(func){
        this.timeout_func= func
    }

    _on_recieve_playerInfos(playerinfo){
        if(Boolean(this.servinfo) && Boolean(playerinfo)){
            if(Boolean(this.func_onServerBasicInfos)){
                this.func_onServerBasicInfos({server: this.servinfo, players: playerinfo.players})
            }
        }
    }

    onServerBasicInfos(func){
        this.func_onServerBasicInfos= func
    }

    //didn't quite work properly for some reason…
    // static DecolorizeString(s){
    //     var codes = [
    //         "\x80","\x81","\x82","\x83","\x84","\x85","\x86","\x87",
    //         "\x88","\x89","\x8a","\x8b","\x8c","\x8d","\x8e","\x8f"
    //     ]
    //     var r= Buffer.from(s, 'utf-8').toString();
    //     for (var code of codes){
    //         r= r.replace(code,'')
    //     }
    //     return Buffer.from(r, 'utf-8').toString();
    // }

    static RemoveNonAsciiFromString(s){
        return Buffer.from(s.replace(/[\u{0080}-\u{FFFF}]/gu,"")).toString();
    }

    static ValuesToHexString(values){
        var input= values
        if((typeof values) === 'string'){
            input= values.split('').map(c => c.charCodeAt(0))
        }

        var commitAbbrev_str=""
        for(var v of input){
            commitAbbrev_str+= (v).toString(16,2).padStart(2, '0')
        }
        return commitAbbrev_str
    }

    static ProcessDRRRKartvars(kartvars){
        let input= kartvars
        if((typeof values) === 'string'){
            input= parseInt(kartvars)
        }

        var ret_kartvars_obj= {}

        ret_kartvars_obj.value= input
        ret_kartvars_obj.isdedicated= Boolean(input & DRRR_KARTVARS.IS_DEDICATED_SERVER)
        ret_kartvars_obj.gear= (input & DRRR_KARTVARS.SPEEDMASK)+1
        ret_kartvars_obj.lotsofaddonsflag= Boolean(input & DRRR_KARTVARS.LOTS_OF_ADDONS)

        return ret_kartvars_obj
    }
}

function ServerInfo_Promise(addr, port, timeout=10000,decolorize=true){
    let isEmpty= (obj) =>{
        return (Object.keys(obj).length===0 && obj.constructor===obj)
    }

    return new Promise((resolve,reject) =>{
        var ksi= new KartServInfo(addr, port)
        ksi.onTimeOut(()=>{
            ksi.bye()
            reject('TIMEDOUT')
        })
        ksi.onServerBasicInfos((info)=>{
            ksi.bye()
            if(!Boolean(info) || isEmpty(info)){
                reject('BAD_RESPONSE')
            }
            else{
                if(decolorize){
                    info.server['servername_colorized']= info.server['servername']
                    info.server['servername']=KartServInfo.RemoveNonAsciiFromString(
                        info.server['servername']
                    )
                }
                for(var field of ['commit','mapmd5'])
                if(info.server[field]){
                    info.server[field]=KartServInfo.ValuesToHexString(
                        info.server[field]
                    )
                }
                if(info.server['kartvars']){
                    info.server['kartvars']= KartServInfo.ProcessDRRRKartvars(
                        info.server['kartvars']
                    )
                }
                resolve(info)
            }
        })
        ksi.ask(timeout)
    })
}


module.exports.ServerInfo_Promise= ServerInfo_Promise
