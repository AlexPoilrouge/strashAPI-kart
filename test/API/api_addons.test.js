const request= require("supertest");
const assert = require('assert');
const fs= require('fs')
const path= require('path')
const mime = require('mime-types');


const config= require("../config/test_config.json")

const api_url= config.api_adress
const api_root= config.api_root

// console.log(`API ADRESS: '${api_url}'`)
// console.log(`API ROOT: '${Boolean(api_root)?api_root:''}'`)

const f_addr= `${api_url}${Boolean(api_root)?`/${api_root}`:""}`



const remote_test_addons_location_url= 'https://github.com/AlexPoilrouge/strashAPI-kart/raw/dev/test/data'
const test_addon1_filepath= path.resolve(__dirname, "../data/test.pk3")
const test_addon2_basename= 'test2.wad'
const test_addon2_url= `${remote_test_addons_location_url}/${test_addon2_basename}`
const test_order_yaml1_filepath= path.resolve(__dirname, "../data/ordering_addons_1.yaml")
const test_order_yaml2_basename= 'ordering_addons_2.yaml'
const test_order_yaml2_url= `${remote_test_addons_location_url}/${test_order_yaml2_basename}`
const test_order_yaml2_filepath= path.resolve(__dirname, `../data/${test_order_yaml2_basename}`)

// const keys= require("../config/auth/key.json")

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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

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
                expect(res.body.info.enabled).toBeFalsy()
                expect(res.body.info.pendingOp).toBeUndefined()
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
                expect(res.body.result.infos[0].enabled).toBeFalsy()
                expect(res.body.result.infos[0].pendingOp).toBeUndefined()
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
                expect(res.body.info.name).toEqual(path.basename(test_addon1_filepath))
                expect(res.body.info.extension).toEqual(path.extname(test_addon1_filepath))
                expect(res.body.info.enabled).toBeFalsy()
                expect(res.body.info.pendingOp).toBeUndefined()
                expect(res.body.info.racer).toEqual("srb2kart")
            })

        await request(f_addr)
            .get("/addons/srb2kart/info")
            .expect(200).then(res => {
                expect(res.body.status).toEqual("fetched")
                expect(res.body.result.number).toEqual(1)
                expect(res.body.result.infos[0].name).toEqual(path.basename(test_addon1_filepath))
                expect(res.body.result.infos[0].extension).toEqual(path.extname(test_addon1_filepath))
                expect(res.body.result.infos[0].enabled).toBeFalsy()
                expect(res.body.result.infos[0].pendingOp).toBeUndefined()
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

describe("addon upload", () => {
    test("POST /addons/ringracers/install (no auth)", async() => {
        await request(f_addr)
            .post("/addons/ringracers/install")
            .send({url: test_addon2_url})
            .expect(403)
    })

    test("POST /addons/ringracers/install (auth admin)", async() => {
        await request(f_addr)
            .post("/addons/ringracers/install")
            .set("x-access-token", admin_token)
            .send({url: test_addon2_url})
            .expect(200).then(res => {
                expect(res.body.status).toEqual('added')
                expect(res.body.result.addon).toEqual(test_addon2_basename)
                expect(res.body.result.state).toEqual('installed')
            })

        await request(f_addr)
            .get("/addons/ringracers/info")
            .query({addon: test_addon2_basename})
            .expect(200).then(res => {
                expect(res.body.info.name).toEqual(test_addon2_basename)
                expect(res.body.info.extension).toEqual(path.extname(test_addon2_basename))
                expect(res.body.info.enabled).toBeFalsy()
                expect(res.body.info.pendingOp).toBeUndefined()
                expect(res.body.info.racer).toEqual("ringracers")
            })

        await request(f_addr)
            .get("/addons/srb2kart/info")
            .expect(200).then(res => {
                expect(res.body.status).toEqual("fetched")
                expect(res.body.result.number).toEqual(1)
            })

        await request(f_addr)
            .get("/addons/ringracers/info")
            .expect(200).then(res => {
                expect(res.body.status).toEqual("fetched")
                expect(res.body.result.number).toEqual(2)
            })
    })

    test("POST /addons/srb2kart/install (auth admin)", async () => {
        await request(f_addr)
            .post("/addons/srb2kart/install")
            .set("x-access-token", admin_token)
            .send({url: test_addon2_url})
            .expect(200).then(res => {
                expect(res.body.status).toEqual('added')
                expect(res.body.result.addon).toEqual(test_addon2_basename)
                expect(res.body.result.state).toEqual('installed')
            })

        await request(f_addr)
            .get("/addons/srb2kart/info")
            .query({addon: path.basename(test_addon2_basename)})
            .expect(200).then(res => {
                expect(res.body.info.name).toEqual(test_addon2_basename)
                expect(res.body.info.extension).toEqual(path.extname(test_addon2_basename))
                expect(res.body.info.enabled).toBeFalsy()
                expect(res.body.info.pendingOp).toBeUndefined()
                expect(res.body.info.racer).toEqual("srb2kart")
            })

        await request(f_addr)
            .get("/addons/srb2kart/info")
            .expect(200).then(res => {
                expect(res.body.status).toEqual("fetched")
                expect(res.body.result.number).toEqual(2)
            })
    })

    test("POST /addons/crashteamracing/upload (badracer)", async () => {
        await request(f_addr)
            .post("/addons/crashteamracing/upload")
            .set("x-access-token", admin_token)
            .send({addon: test_addon2_basename})
            .expect(404)
    })
})

describe("addon enable", () => {
    test("POST /addons/ringracers/enable (no auth)", async() => {
        await request(f_addr)
            .post("/addons/ringracers/enable")
            .send({addons: path.basename(test_addon1_filepath)})
            .expect(403)
    })

    test("POST /addons/ringracers/enable (auth admin)", async() => {
        await request(f_addr)
            .post("/addons/ringracers/enable")
            .set("x-access-token", admin_token)
            .send({addons: path.basename(test_addon1_filepath)})
            .expect(200).then(res => {
                expect(res.body.status).toEqual('success')
                let res_enabled= res.body.enabled
                expect(res_enabled.length).toEqual(1)
                expect(res_enabled.includes(path.basename(test_addon1_filepath))).toBeTruthy()
            })

        await request(f_addr)
            .get("/addons/ringracers/info")
            .query({addon: path.basename(test_addon1_filepath)})
            .expect(200).then(res => {
                expect(res.body.info.enabled).toBeTruthy()
                expect(res.body.info.pendingOp).toBeUndefined()
                expect(res.body.info.racer).toEqual("ringracers")
            })
    })

    test("POST /addons/srb2kart/enable (auth admin)", async() => {
        await request(f_addr)
            .post("/addons/srb2kart/enable")
            .set("x-access-token", admin_token)
            .send({addons: [ test_addon2_basename, path.basename(test_addon1_filepath), "not_existing.pk3" ]})
            .expect(201).then(res => {
                let res_enabled= res.body.enabled
                let res_failed= res.body.failed
                expect(res_enabled.length).toEqual(2)
                expect(res_failed.length).toEqual(1)
                expect(res_enabled.includes(path.basename(test_addon1_filepath))).toBeTruthy()
                expect(res_enabled.includes(test_addon2_basename)).toBeTruthy()
                expect(res_failed.includes("not_existing.pk3")).toBeTruthy()
            })

        await request(f_addr)
            .get("/addons/srb2kart/info")
            .expect(200).then(res => {
                expect(res.body.result.number).toEqual(2)
                for(var addon of [test_addon2_basename, path.basename(test_addon1_filepath)]){
                    var infos= res.body.result.infos.find(addon_info => (addon_info.name===addon))
                    expect(Boolean(infos)).toBeTruthy()
                    expect(infos.enabled).toBeTruthy()
                    expect(infos.pendingOp).toBeUndefined()
                }
            })
    })

    test("POST /addons/ringracers/disable (no auth)", async() => {
        await request(f_addr)
            .post("/addons/ringracers/disable")
            .send({addons: path.basename(test_addon1_filepath)})
            .expect(403)
    })

    test("POST /addons/ringracers/disable (auth admin)", async() => {
        await request(f_addr)
            .post("/addons/ringracers/disable")
            .set("x-access-token", admin_token)
            .send({addons: path.basename(test_addon1_filepath)})
            .expect(200).then(res => {
                expect(res.body.status).toEqual('success')
                let res_disabled= res.body.disabled
                expect(res_disabled.length).toEqual(1)
                expect(res_disabled.includes(path.basename(test_addon1_filepath))).toBeTruthy()
            })

        await request(f_addr)
            .get("/addons/ringracers/info")
            .query({addon: path.basename(test_addon1_filepath)})
            .expect(200).then(res => {
                expect(res.body.info.enabled).toBeTruthy()
                expect(res.body.info.racer).toEqual("ringracers")
                expect(res.body.info.pendingOp).toEqual("disablement")
            })
    })

    test("POST /addons/srb2kart/disable (auth admin)", async() => {
        await request(f_addr)
            .post("/addons/srb2kart/disable")
            .set("x-access-token", admin_token)
            .send({addons: [ path.basename(test_addon1_filepath), "not_existing.pk3" ]})
            .expect(200).then(res => {
                let res_disabled= res.body.disabled
                expect(res_disabled.length).toEqual(2)
                expect(res_disabled.includes(path.basename(test_addon1_filepath))).toBeTruthy()
                expect(res_disabled.includes("not_existing.pk3")).toBeTruthy()
            })

        await request(f_addr)
            .get("/addons/srb2kart/info")
            .expect(200).then(res => {
                expect(res.body.result.number).toEqual(2)
                var infos= res.body.result.infos.find(addon_info => (addon_info.name===path.basename(test_addon1_filepath)))
                expect(Boolean(infos)).toBeTruthy()
                expect(infos.enabled).toBeTruthy()
                expect(infos.pendingOp).toEqual("disablement")
                infos= res.body.result.infos.find(addon_info => (addon_info.name===test_addon2_basename))
                expect(Boolean(infos)).toBeTruthy()
                expect(infos.enabled).toBeTruthy()
        })
    })
})

describe("addon remove", () => {
    test("POST /addons/ringracers/remove (no auth)", async() => {
        await request(f_addr)
            .post("/addons/ringracers/remove")
            .send({addons: path.basename(test_addon1_filepath)})
            .expect(403)
    })
    test("POST /addons/ringracers/remove (auth admin)", async() => {
        await request(f_addr)
            .post("/addons/ringracers/remove")
            .set("x-access-token", admin_token)
            .send({addons: path.basename(test_addon1_filepath)})
            .expect(200).then(res => {
                expect(res.body.status).toEqual('success')
                let res_removed= res.body.removed
                expect(res_removed.length).toEqual(1)
                expect(res_removed.includes(path.basename(test_addon1_filepath))).toBeTruthy()
            })

        await request(f_addr)
            .get("/addons/ringracers/info")
            .query({addon: path.basename(test_addon1_filepath)})
            .expect(200).then(res => {
                expect(res.body.info.enabled).toBeTruthy()
                expect(res.body.info.racer).toEqual("ringracers")
                expect(res.body.info.pendingOp).toEqual("deletion")
            })

        await request(f_addr)
            .get("/addons/ringracers/info")
            .query({addon: test_addon2_basename})
            .expect(200).then(res => {
                expect(res.body.info.enabled).toBeFalsy()
                expect(res.body.info.racer).toEqual("ringracers")
            })
    })

    test("POST /addons/srb2kart/remove (auth admin)", async() => {
        await request(f_addr)
            .post("/addons/srb2kart/remove")
            .set("x-access-token", admin_token)
            .send({addons: [ test_addon2_basename, "not_existing.pk3" ]})
            .expect(200).then(res => {
                let res_removed= res.body.removed
                expect(res_removed.length).toEqual(2)
                expect(res_removed.includes(test_addon2_basename)).toBeTruthy()
                expect(res_removed.includes("not_existing.pk3")).toBeTruthy()
            })

        await request(f_addr)
            .get("/addons/srb2kart/info")
            .expect(200).then(res => {
                expect(res.body.result.number).toEqual(2)
                var infos= res.body.result.infos.find(addon_info => (addon_info.name===path.basename(test_addon1_filepath)))
                expect(Boolean(infos)).toBeTruthy()
                expect(infos.enabled).toBeTruthy()
                expect(infos.pendingOp).toEqual('disablement')
                infos= res.body.result.infos.find(addon_info => (addon_info.name===test_addon2_basename))
                expect(Boolean(infos)).toBeTruthy()
                expect(infos.enabled).toBeTruthy()
                expect(infos.pendingOp).toEqual('deletion')
            })
    })
})

describe("addon load order", () => {
    test("GET /addons/ringracers/load_order", async() => {
        await request(f_addr)
            .get("/addons/ringracers/load_order")
            .expect(404)
    })

    test("PUT /addons/ringracers/load_order (no auth) - file upload", async() => {
        await request(f_addr)
            .put("/addons/ringracers/load_order")
            .attach('file', test_order_yaml1_filepath)
            .expect(403)
    })

    test("PUT /addons/ringracers/load_order (auth admin) - file upload", async () => {
        await request(f_addr)
            .put("/addons/ringracers/load_order")
            .set("x-access-token", admin_token)
            .attach('file', test_order_yaml1_filepath)
            .expect(200).then(res => {
                expect(res.body.status).toEqual('updated')
                expect(res.body.result.addon_order_file).toEqual(path.basename('addons_order.yaml'))
            })
    })

    test("GET /addons/srb2kart/load_order", async() => {
        await request(f_addr)
            .get("/addons/srb2kart/load_order")
            .expect(404)
    })

    test("GET /addons/ringracers/load_order", async() => {
        await request(f_addr)
            .get("/addons/ringracers/load_order")
            .expect(200).then( res => {
                expect(res.header['content-type'].split(';')[0]).toEqual(mime.lookup(test_order_yaml1_filepath))
                expect(res.text).toEqual(fs.readFileSync(test_order_yaml1_filepath, 'utf-8'))
            })
    })

    test("PUT /addons/srb2kart/load_order (no auth) - url install", async() => {
        await request(f_addr)
            .put("/addons/srb2kart/load_order")
            .send({ url: test_order_yaml2_url })
            .expect(403)
    })

    test("PUT /addons/srb2kart/load_order (auth admin) - url install", async () => {
        await request(f_addr)
            .put("/addons/srb2kart/load_order")
            .set("x-access-token", admin_token)
            .send({ url: test_order_yaml2_url })
            .expect(200).then(res => {
                expect(res.body.status).toEqual('updated')
                expect(res.body.result.addon_order_file).toEqual(path.basename('addons_order.yaml'))
            })
    })

    test("GET /addons/srb2kart/load_order", async() => {
        await request(f_addr)
            .get("/addons/srb2kart/load_order")
            .expect(200).then( res => {
                expect(res.header['content-type'].split(';')[0]).toEqual(mime.lookup(test_order_yaml2_filepath))
                expect(res.text).toEqual(fs.readFileSync(test_order_yaml2_filepath, 'utf-8'))
            })
    })
})
