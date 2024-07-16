const request= require("supertest");
const assert = require('assert');
const fs= require('fs')
const path= require('path')

const config= require("../config/test_config.json")

const api_url= config.api_adress
const api_root= config.api_root

console.log(`API ADRESS: '${api_url}'`)
console.log(`API ROOT: '${Boolean(api_root)?api_root:''}'`)

const f_addr= `${api_url}${Boolean(api_root)?`/${api_root}`:""}`



const test_addon1_filepath= path.resolve(__dirname, "../data/test.pk3")

const keys= require("../config/auth/key.json")

const jwt= require("jsonwebtoken");

const JWT_SIGN_CONFIG= {
        expiresIn: "1min",
        algorithm:  "RS256"
}

let adminPubkey= fs.readFileSync(path.resolve(__dirname, '../config/admin_jwtRS256.key'))
let discorduserPubkey= fs.readFileSync(path.resolve(__dirname, '../config/jwtRS256.key'))

const admin_token= jwt.sign(
        {
                auth : {
                        role: "ADMIN"
                },
        },
        adminPubkey,
        JWT_SIGN_CONFIG
)

describe("addon upload", () => {
    test("POST /addons/ringracers/upload (no auth)", async () => {
        await request(f_addr)
            .post("/addons/ringracers/upload")
            .attach('file', test_addon1_filepath)
            .expect(403)
    })

    test("POST /addons/ringracers/upload (auth admin)", async () => {
        await request(f_addr)
            .post("/addons/ringracers/upload")
            .set("x-access-token", admin_token)
            .attach('file', test_addon1_filepath)
            .expect(200).then(res => {
                expect(res.body.status).toEqual('added')
                expect(res.body.result.addon).toEqual(path.basename(test_addon1_filepath))
                expect(res.body.result.state).toEqual('installed')
            })

        await request(f_addr)
            .get("/addons/ringracers/info")
            .query({addon: path.basename(test_addon1_filepath)})
            .expect(200).then(res => {
                expect(res.body.info.name).toEqual(path.basename(test_addon1_filepath))
                expect(res.body.info.extension).toEqual(path.extname(test_addon1_filepath))
                expect(res.body.info.enabled).toEqual(false)
                expect(res.body.info.racer).toEqual("ringracers")
            })
            //TODO:
            // later, need to check if installed
            // also need to check can install something already there

        await request(f_addr)
            .get("/addons/srb2kart/info")
            .expect(200).then(res => {
                expect(res.body.status).toEqual("nothing")
                expect(res.body.result.number).toEqual(0)
                expect(res.body.result.infos).toEqual([])
            })

        await request(f_addr)
            .get("/addons/ringracers/info")
            .expect(200).then(res => {
                expect(res.body.status).toEqual("fetched")
                expect(res.body.result.number).toEqual(1)
                expect(res.body.result.infos[0].name).toEqual(path.basename(test_addon1_filepath))
                expect(res.body.result.infos[0].extension).toEqual(path.extname(test_addon1_filepath))
                expect(res.body.result.infos[0].enabled).toEqual(false)
                expect(res.body.result.infos[0].racer).toEqual("ringracers")
            })
    })

    test("POST /addons/srb2kart/upload (auth admin)", async () => {
        await request(f_addr)
            .post("/addons/srb2kart/upload")
            .set("x-access-token", admin_token)
            .attach('file', test_addon1_filepath)
            .expect(200).then(res => {
                expect(res.body.status).toEqual('added')
                expect(res.body.result.addon).toEqual(path.basename(test_addon1_filepath))
                expect(res.body.result.state).toEqual('installed')
            })

        await request(f_addr)
            .get("/addons/srb2kart/info")
            .query({addon: path.basename(test_addon1_filepath)})
            .expect(200).then(res => {
                console.log(`hmmmm ${JSON.stringify(res.body)}`)
                expect(res.body.info.name).toEqual(path.basename(test_addon1_filepath))
                expect(res.body.info.extension).toEqual(path.extname(test_addon1_filepath))
                expect(res.body.info.enabled).toEqual(false)
                expect(res.body.info.racer).toEqual("srb2kart")
            })

        await request(f_addr)
            .get("/addons/srb2kart/info")
            .expect(200).then(res => {
                expect(res.body.status).toEqual("fetched")
                expect(res.body.result.number).toEqual(1)
                expect(res.body.result.infos[0].name).toEqual(path.basename(test_addon1_filepath))
                expect(res.body.result.infos[0].extension).toEqual(path.extname(test_addon1_filepath))
                expect(res.body.result.infos[0].enabled).toEqual(false)
                expect(res.body.result.infos[0].racer).toEqual("srb2kart")
            })
    })

    test("POST /addons/mariokart/upload (badracer)", async () => {
        await request(f_addr)
            .post("/addons/mariokart/upload")
            .set("x-access-token", admin_token)
            .attach('file', test_addon1_filepath)
            .expect(404)
    })
})

