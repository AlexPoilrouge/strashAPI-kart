const jwt= require("jsonwebtoken");
const fs= require('fs')

function generateToken(keys, objs, outfilebasename, token_prefixes= undefined){
    if (keys.length!==objs.length)
        throw "not as many keys as objs?!"

    var res= {}
    for (var i=0; i<keys.length; ++i){
        console.log("generating test token")
        var obj= objs[i]
        var key= keys[i]

        const token= jwt.sign(
            obj, key, {expiresIn: "24h"}
        )

        if (!Boolean(outfilebasename)){
            console.log(JSON.stringify({token}))
        }
        else{
            if(Boolean(token_prefixes) && token_prefixes.length>i)
                res[`${token_prefixes[i]}_token`]= token
            else
                res[`token${i}`]= token
        }
    }

    if(Boolean(outfilebasename)){
        const outfile_path= `${__dirname}/${outfilebasename}`

        fs.writeFile(outfile_path, JSON.stringify(res, null, 4), (err)=>{
            if(err) throw err
            console.log(`token in '${outfile_path}'…`)
        })
    }
}


const myArgs = process.argv.slice(2);

var admin_k= Boolean(myArgs[0])? myArgs[0]:"9xmj2PMGz8PXnUmhSHdmv6R8jvCsUdeP"
var admin_o= { 
    auth : {
        role: "ADMIN",
        id: "185096597799960577"
    }
 }

var user_k= Boolean(myArgs[1])? myArgs[1]:"5pBrc0rQ9gOYUs1hPMbqtbq1DVYDoRHM"
var user_o= { 
    auth : {
        role: "DISCORD_USER",
        id: "185096597799960577"
    }
 }


var f= Boolean(myArgs[1])?myArgs[1]:"test_token.json"


generateToken([admin_k, user_k], [admin_o, user_o], f, ['admin', 'user'])
