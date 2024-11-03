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

const remote_test_addons_location_url= 'https://github.com/AlexPoilrouge/strashAPI-kart/raw/dev/test/data'

const test_config1YamlCfg_filepath= path.resolve(__dirname, "../data/testConfig1.RR.yaml")
const test_config1YamlCfg_data= yaml.load(fs.readFileSync(
    test_config1YamlCfg_filepath,
    "utf8"
))
const test_config2YamlCfg_filename= "testConfig2.SRB2K.yaml"
const test_config2YamlCfg_filepath= path.resolve(__dirname, `../data/${test_config2YamlCfg_filename}`)
const test_config2YamlCfg_data= yaml.load(fs.readFileSync(
    test_config2YamlCfg_filepath,
    "utf8"
))
const test_config2YamlCfg_url=`${remote_test_addons_location_url}/${test_config2YamlCfg_filename}`

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

        await request(f_addr)
            .get("/config/ringracers/info")
            .expect(200).then(res => {
                let {enabled_custom_configs, custom_cfg}=  res.body

                let available_configs= custom_cfg.available_configs
                expect(available_configs.length).toEqual(1)
                expect(available_configs[0].name).toEqual(
                    test_config1YamlCfg_data.name
                )
                expect(available_configs[0].triggertime).toEqual(
                    test_config1YamlCfg_data.triggertime
                )
                expect(available_configs[0].filename).toEqual(path.basename(test_config1YamlCfg_filepath))
            })
        let test_config_fetched_result= (res) =>{
            expect(res.header['content-type'].split(';')[0]).toEqual(mime.lookup(test_config1YamlCfg_filepath))
            expect(res.text).toEqual(fs.readFileSync(test_config1YamlCfg_filepath, 'utf-8'))
        }
        await request(f_addr)
            .get(`/config/ringracers/${test_config1YamlCfg_data.name}`)
            .expect(200).then(res => {
                test_config_fetched_result(res)
            })
        await request(f_addr)
            .get(`/config/ringracers/${path.basename(test_config1YamlCfg_filepath)}`)
            .expect(200).then(res => {
                test_config_fetched_result(res)
            })

        await request(f_addr)
            .get(`/config/srb2kart/${test_config1YamlCfg_data.name}`)
            .expect(404)
        await request(f_addr)
            .get(`/config/srb2kart/${path.basename(test_config1YamlCfg_filepath)}`)
            .expect(404)
    })
})

describe("config add (from url)", () => {

    test("PUT /config/srb2kart/custom (from url)(no auth)", async () => {
        await request(f_addr)
            .put("/config/srb2kart/custom")
            .send({url: test_config2YamlCfg_url})
            .expect(403)
    })

    test("PUT /config/srb2kart/custom (from url)(admin auth)", async () => {
        await request(f_addr)
            .put("/config/srb2kart/custom")
            .set("x-access-token", admin_token)
            .send({url: test_config2YamlCfg_url})
            .expect(200).then(res => {
                expect(res.body.status).toEqual('updated')
                expect(res.body.result.addon_order_file).toEqual(
                    test_config2YamlCfg_filename
                )
            })

        await request(f_addr)
            .get("/config/srb2kart/info")
            .expect(200).then(res => {
                let {enabled_custom_configs, custom_cfg}=  res.body

                let available_configs= custom_cfg.available_configs
                expect(available_configs.length).toEqual(1)
                expect(available_configs[0].name).toEqual(
                    test_config2YamlCfg_data.name
                )
                expect(available_configs[0].triggertime).toEqual(
                    test_config2YamlCfg_data.triggertime
                )
                expect(available_configs[0].filename).toEqual(path.basename(test_config2YamlCfg_filepath))
            })
        let test_config_fetched_result= (res) =>{
            expect(res.header['content-type'].split(';')[0]).toEqual(mime.lookup(test_config2YamlCfg_filepath))
            expect(res.text).toEqual(fs.readFileSync(test_config2YamlCfg_filepath, 'utf-8'))
        }
        await request(f_addr)
            .get(`/config/srb2kart/${test_config2YamlCfg_data.name}`)
            .expect(200).then(res => {
                test_config_fetched_result(res)
            })
        await request(f_addr)
            .get(`/config/srb2kart/${path.basename(test_config2YamlCfg_filepath)}`)
            .expect(200).then(res => {
                test_config_fetched_result(res)
            })

        await request(f_addr)
            .get(`/config/ringracers/${test_config2YamlCfg_data.name}`)
            .expect(404)
        await request(f_addr)
            .get(`/config/ringracers/${test_config2YamlCfg_filename}`)
            .expect(404)
    })
})

