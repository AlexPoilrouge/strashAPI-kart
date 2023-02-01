const jwt= require("jsonwebtoken");
const auth_config= require("../../config/auth/key.json")
const fs= require('fs')
const path= require('path')

let hereLog= (...args) => {console.log("[kart - token]", ...args);};

let Update_Keys= {
    mem_keys: {},
    last: 0,
    allowed_diff: 300000 //should be 5 min
}

function _readkey_from_file(configEntryName){
    var key= Update_Keys.mem_keys[configEntryName]

    let now= Date.now()
    if(!Boolean(key) || ((now-Update_Keys.last)>Update_Keys.allowed_diff)){
        Update_Keys.last= now
        key= fs.readFileSync(path.resolve(auth_config[configEntryName]))
        Update_Keys.mem_keys[configEntryName]= key
    }

    return key
}

const VERIFY_OPTIONS= {algorithm: ["RS256"]}

function API_verifyTokenFromPOSTBody(req, res, next){
    hereLog("let's verify some tokenssss")
    const token = req.body.token || req.query.token || req.headers["x-access-token"];
    if(!Boolean(token)){
        return res.status(403).send({status: "forbidden", error: "a token is required to authenticate"});
    }
    try{
        const unverified= jwt.decode(token)
        if (!(Boolean(unverified) && Boolean(unverified.auth))){
            return res.status(401).send({status: "malformed_token", error: "auth info missing or ill formed in token payload"})
        }
        if(unverified.auth.role==="ADMIN"){
            const decoded= jwt.verify(token, _readkey_from_file('adminPubkey'), VERIFY_OPTIONS)
            req.body.decoded= decoded
        }
        else if(unverified.auth.role==="DISCORD_USER" && Boolean(unverified.auth.id)){
            const decoded= jwt.verify(token, _readkey_from_file('discorduserPubkey'), VERIFY_OPTIONS);
            req.body.decoded= decoded;
        }
        else{
            return res.status(401).send({status: "bad_auth_token", error: "unrecognized token info"})
        }
    }
    catch(err){
        hereLog(`[auth error] - ${(Boolean(err) && Boolean(err.name))?err.name:'unknown'} `+
                `- ${(Boolean(err) && Boolean(err.message))?err.message:'uninformed'}`
        );

        if (Boolean(err) && err.name==='TokenExpiredError'){
            return res.status(401).send({status: "expired", error: "token expiration"});
        }
        else return res.status(401).send({status: "auth_error", error: "authentification error"});
    }

    return next()
}

module.exports= {API_verifyTokenFromPOSTBody};
