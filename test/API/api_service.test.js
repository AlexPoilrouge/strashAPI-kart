const request= require("supertest");
const assert = require('assert');
const fs= require('fs');
const path= require('path');


const config= require("../config/test_config.json")

const api_url= config.api_adress
const api_root= config.api_root

const f_addr= `${api_url}${Boolean(api_root)?`/${api_root}`:""}`

let adminKey= fs.readFileSync(path.resolve(__dirname, '../config/admin_jwtRS256.key'))
let discorduserKey= fs.readFileSync(path.resolve(__dirname, '../config/jwtRS256.key'))

const jwt= require("jsonwebtoken");

const JWT_SIGN_CONFIG= {
        expiresIn: "1min",
        algorithm:  "RS256"
}

const admin_token= jwt.sign(
        {
                auth : {
                        role: "ADMIN"
                },
        },
        adminKey,
        JWT_SIGN_CONFIG
)

/**
 * These tests assumes that:
 * - GET /service/restart/ringracers should returns a body that is the JSON string `{ "state": "ok" }`
 * - GET /service/stop/srb2kart should returns a body that is the JSON string:
 *          `{ "state": "cooldown", "remaining_seconds": 96 }`
 * 
 * See values in 'compose/variables.api.yaml'
 */

describe("service restart ringracers", () => {

    test("GET /service/restart/ringracers (no auth)", async () => {
        await request(f_addr)
                .get("/service/restart/ringracers")
                .expect(403)
    })

    test("GET /service/restart/ringracers (admin auth)", async () => {
        await request(f_addr)
                .get("/service/restart/ringracers")
                .set("x-access-token", admin_token)
                .expect(200).then(res => {
                    expect(res.body.state).toEqual("ok")
                })
    })
})

describe("service stop srb2kart", () => {

    test("GET /service/stop/srb2kart (no auth)", async () => {
        await request(f_addr)
                .get("/service/stop/srb2kart")
                .expect(403)
    })

    test("GET /service/stop/srb2kart (admin auth)", async () => {
        await request(f_addr)
                .get("/service/stop/srb2kart")
                .set("x-access-token", admin_token)
                .expect(503).then(res => {
                    expect(res.body.state).toEqual("cooldown")
                    expect(res.body.remaining_seconds).toEqual(96)
                })
    })
})

