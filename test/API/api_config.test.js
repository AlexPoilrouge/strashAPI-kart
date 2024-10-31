const request= require("supertest");
const assert = require('assert');
const fs= require('fs')
const path= require('path')
const mime = require('mime-types');
const yaml = require("js-yaml");


const config= require("../config/test_config.json")

const api_url= config.api_adress
const api_root= config.api_root

const f_addr= `${api_url}${Boolean(api_root)?`/${api_root}`:""}`

const jwt= require("jsonwebtoken");

const JWT_SIGN_CONFIG= {
        expiresIn: "1min",
        algorithm:  "RS256"
}

let adminKey= fs.readFileSync(path.resolve(__dirname, '../config/admin_jwtRS256.key'))
let discorduserKey= fs.readFileSync(path.resolve(__dirname, '../config/jwtRS256.key'))

const admin_token= jwt.sign(
        {
                auth : {
                        role: "ADMIN"
                },
        },
        adminKey,
        JWT_SIGN_CONFIG
)


const testConfig_allowed_commands_RR_yaml_file= path.resolve(__dirname, "../config/allowed_commands.ringracers.yaml")
const testConfig_allowed_commands_SRBK_yaml_file= path.resolve(__dirname, "../config/allowed_commands.srb2kart.yaml")
const test_allowed_command_RR_data= yaml.load(fs.readFileSync(
    testConfig_allowed_commands_RR_yaml_file,
    "utf8"
)).allowed_commands;
const test_allowed_command_SRB2K_data= yaml.load(fs.readFileSync(
    testConfig_allowed_commands_SRBK_yaml_file,
    "utf8"
)).allowed_commands;

const test_config1YamlCfg_filepath= path.resolve(__dirname, "../data/testConfig1.RR.yaml")


describe("nothing info", () => {
    test("GET /config/ringracers/info", async () => {
        await request(f_addr)
            .get("/config/ringracers/info")
            .expect(200).then(res => {
                expect(res.body.enabled_custom_configs).toEqual([])
                expect(res.body.custom_cfg.allowed_commands).toEqual(
                    test_allowed_command_RR_data
                )
                expect(res.body.custom_cfg.available_configs).toEqual([])
            })
    })
    test("GET /config/srb2kart/info", async () => {
        await request(f_addr)
            .get("/config/srb2kart/info")
            .expect(200).then(res => {
                expect(res.body.enabled_custom_configs).toEqual([])
                expect(res.body.custom_cfg.allowed_commands).toEqual(
                    test_allowed_command_SRB2K_data
                )
                expect(res.body.custom_cfg.available_configs).toEqual([])
            })
    })
})

describe("config add (file upload)", () => {

    test("PUT /config/ringracers/custom (file upload)(no auth)", async () => {
        await request(f_addr)
            .put("/config/ringracers/custom")
            .attach('file', test_config1YamlCfg_filepath)
            .expect(403)
    })

    test("PUT /config/ringracers/custom (file upload)(admin auth)", async () => {
        await request(f_addr)
            .put("/config/ringracers/custom")
            .set("x-access-token", admin_token)
            .attach('file', test_config1YamlCfg_filepath)
            .expect(200).then(res => {
                expect(res.body.status).toEqual('updated')
                expect(res.body.result.addon_order_file).toEqual(
                    path.basename(test_config1YamlCfg_filepath)
                )
            })
    })
})

