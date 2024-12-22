const fs= require('fs')



const strashbot_info= require("../config/info/strashbot_info.json");

let hereLog= (...args) => {console.log("[password]", ...args);};


let getPasswordFilePath= (karter) => `${strashbot_info[karter].password_file}`;

function readPasswordFromFile(karter){
    var password= undefined

    try{
        password= fs.readFileSync(getPasswordFilePath(karter), 'utf8');
        password= password.split(/\r?\n/)[0];
    }
    catch(err){
        hereLog(`Couldn't fetch ${karter} password - ${err}`)

        password= undefined
    }

    return password
}

function API_getKarterPassword(req, res, next){
    const racer= req.params.karter
    try{
        let password= readPasswordFromFile(racer)

        if(!Boolean(password)){
            res.status(404).send({status: "not_found"});
        }
        else{
            res.status(200).send({password})
        }
    }
    catch(err){
        hereLog(`<API_getKarterPassword>(${racer}) error fetching password - ${err}`)
        res.status(500).send({status: "internal_query_error"});
    }
}

module.exports= { API_getKarterPassword }