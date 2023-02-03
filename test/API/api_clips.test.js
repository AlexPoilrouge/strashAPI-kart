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


describe("clips fetching", () => {
        test("GET /clips", async () =>{
                console.log("start")
                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        console.log("1")
                        expect(res.body.page).toEqual(1)
                        expect(res.body.perPage).toEqual(32)
                        expect(res.body.totalPages).toEqual(1)
                        expect(res.body.availableClipsCount).toEqual(2)
                        expect(res.body.clips.length).toEqual(2)
                        expect(res.body.clips[0]._id).toEqual(181)
                        expect(res.body.clips[0].type).toEqual('video')
                        expect(res.body.clips[1]._id).toEqual(173)
                        expect(res.body.clips[1].type).toBe('youtube')
                        console.log("8")
                })
                console.log("end")
        })

        test("GET /clips?perPage=1&pageNum=2", async () => {
                await request(`${f_addr}`)
                .get("/clips").query({perPage: 1, pageNum: 2})
                .expect("Content-Type", /json/)
                .expect(200)
                .then(res=>{
                        expect(res.body.page).toEqual(2)
                        expect(res.body.perPage).toEqual(1)
                        expect(res.body.totalPages).toEqual(2)
                        expect(res.body.clips.length).toEqual(1)
                        expect(res.body.clips[0]._id).toEqual(173)
                        expect(res.body.clips[0].type).toEqual('youtube')
                })
        })

        test("GET /clips?perPage=0&pageNum=0", async () => {
                await request(`${f_addr}`)
                .get("/clips").query({perPage: 0, pageNum: 0})
                .expect("Content-Type", /json/)
                .expect(200)
                .then(res=>{
                        expect(res.body.page).toEqual(1)
                        expect(res.body.perPage).toEqual(1)
                        expect(res.body.totalPages).toEqual(2)
                        expect(res.body.clips.length).toEqual(1)
                        expect(res.body.clips[0]._id).toEqual(181)
                        expect(res.body.clips[0].type).toEqual('video')
                })
        })

        test("GET /clips?perPage=128&pageNum=1", async () => {
                await request(`${f_addr}`)
                .get("/clips").query({perPage: 128, pageNum: 1})
                .expect("Content-Type", /json/)
                .expect(200)
                .then(res=>{
                        expect(res.body.page).toEqual(1)
                        expect(res.body.perPage).toEqual(128)
                        expect(res.body.totalPages).toEqual(1)
                        expect(res.body.clips.length).toEqual(2)
                })
        })

        test("GET /clips?perPage=4&pageNum=2", async () => {
                await request(`${f_addr}`)
                .get("/clips").query({perPage: 4, pageNum: 2})
                .expect(204)
        })
})

describe("clip lookup", () => {
        test("GET /clip/181", async () =>{
                await request(`${f_addr}`)
                .get("/clip/181")
                .expect("Content-Type", /json/)
                .expect(200)
                .then(res => {
                        expect(res.body.type).toEqual('video')
                        expect(res.body.submitter_id).toEqual('185096597799960577')
                        expect(res.body.url.length).toBeGreaterThan("http://".length)
                        expect(res.body.timestamp).not.toBeUndefined()
                        expect(new Date(res.body.timestamp)).not.toBeNaN()
                        expect(res.body.description).not.toBeUndefined()
                })
        })
        test("GET /clip/173", async () =>{
                await request(`${f_addr}`)
                .get("/clip/173")
                .expect("Content-Type", /json/)
                .expect(200)
                .then(res => {
                        expect(res.body.type).toEqual('youtube')
                        expect(res.body.submitter_id).toEqual('185096597799960577')
                        expect(res.body.url.length).toBeGreaterThan("http://".length)
                        expect(res.body.timestamp).not.toBeUndefined()
                        expect(new Date(res.body.url.timestamp)).not.toBeNaN()
                        expect(res.body.description).not.toBeUndefined()
                })
        })
        test("GET /clip/68", async () =>{
                await request(`${f_addr}`)
                .get("/clip/68")
                .expect(404)
        })
})


const jwt= require("jsonwebtoken");

const keys= require("../config/auth/key.json")

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

const admin_token_id= jwt.sign(
        {
                auth : {
                        role: "ADMIN",
                        id: "684068116019413036"
                },
        },
        adminPubkey,
        JWT_SIGN_CONFIG
)

const bad_role_admin_token= jwt.sign(
        {
                auth : {
                        role: "ADMIN"
                },
        },
        discorduserPubkey,
        JWT_SIGN_CONFIG
)

const user_token= jwt.sign(
        {
                auth : {
                        role: "DISCORD_USER",
                        id: "185096597799960577"
                }
        },
        discorduserPubkey,
        JWT_SIGN_CONFIG
)

const user_token_no_id= jwt.sign(
        {
                auth : {
                        role: "DISCORD_USER"
                }
        },
        discorduserPubkey,
        JWT_SIGN_CONFIG
)


describe("clip insert", () => {
        const clip1= {url: 'https://www.youtube.com/watch?v=sw4esl9i5WE', submitter_id:"185096597799960577", description: "test instert"}
        const clip2_bad= {url: 'https://www.google.fr/lol', submitter_id:"185096597799960577", description: "bad url test"}
        const clip3_bad= {submitter_id:"185096597799960577", description: "no url test"}
        const clip4_bad= {url: 'https://www.youtube.com/watch?v=p1Hrw-TFD5s', submitter_id:"McBling_skillster", description: "bad submitter test"}
        const clip5_bad= {url: 'https://www.youtube.com/watch?v=p1Hrw-TFD5s', description: "no submitter test"}
        const clip6= {url: 'https://cdn.discordapp.com/attachments/713699603777716267/940019188293066793/kart0091.gif', description: "user insert test with random id", submitter_id:"684068116019413036"}
        const clip7= {url: 'https://cdn.discordapp.com/attachments/713699603777716267/940314913652473906/geometre_lvl_3000.webm', description: "user insert video", submitter_id:"684068116019413036"}

        test("POST /clip/new (no auth)", async () => {
                await request(`${f_addr}`)
                .post("/clip/new")
                .send(clip1)
                .expect(403)
        })

        test("POST /clip/new (auth admin)", async () => {
                await request(`${f_addr}`)
                .post("/clip/new")
                .set("x-access-token", admin_token)
                .send(clip1)
                .expect(200).then(res => {
                        expect(res.body.acknowledged).toBeTruthy()
                        expect(res.body.insertedId).toEqual(182)
                })

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(3)
                })

                await request(`${f_addr}`)
                .get("/clip/182")
                .expect("Content-Type", /json/)
                .expect(200)
                .then(res => {
                        expect(res.body.type).toEqual('youtube')
                        expect(res.body.submitter_id).toEqual(clip1.submitter_id)
                        expect(res.body.description).toEqual(clip1.description)
                        expect(res.body.url).toEqual(clip1.url)
                        expect(res.body.timestamp).not.toBeUndefined()
                        expect(new Date(res.body.timestamp)).not.toBeNaN()
                })

        })

        test("POST /clip/new (auth admin) - existing fail", async () => {
                await request(`${f_addr}`)
                .post("/clip/new")
                .set("x-access-token", admin_token)
                .send(clip1)
                .expect(409)

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(3)
                })

                await request(`${f_addr}`)
                .get("/clip/183")
                .expect(404)
        })

        test("POST /clip/new (auth admin) - bad url fail", async () => {
                await request(`${f_addr}`)
                .post("/clip/new")
                .set("x-access-token", admin_token)
                .send(clip2_bad)
                .expect(440)

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(3)
                })

                await request(`${f_addr}`)
                .get("/clip/183")
                .expect(404)
        })

        test("POST /clip/new (auth admin) - no url fail", async () => {
                await request(`${f_addr}`)
                .post("/clip/new")
                .set("x-access-token", admin_token)
                .send(clip3_bad)
                .expect(400)

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(3)
                })

                await request(`${f_addr}`)
                .get("/clip/183")
                .expect(404)
        })

        test("POST /clip/new (auth admin) - bad submitter fail", async () => {
                await request(`${f_addr}`)
                .post("/clip/new")
                .set("x-access-token", admin_token)
                .send(clip4_bad)
                .expect(441)

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(3)
                })

                await request(`${f_addr}`)
                .get("/clip/183")
                .expect(404)
        })

        test("POST /clip/new (auth admin) - no submitter id", async () => {
                await request(`${f_addr}`)
                .post("/clip/new")
                .set("x-access-token", admin_token)
                .send(clip5_bad)
                .expect(400)

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(3)
                })

                await request(`${f_addr}`)
                .get("/clip/183")
                .expect(404)
        })

        test("POST /clip/new (auth admin) - no submitter id, admin id", async () => {
                await request(`${f_addr}`)
                .post("/clip/new")
                .set("x-access-token", admin_token_id)
                .send(clip5_bad)
                .expect(200).then(res => {
                        expect(res.body.acknowledged).toBeTruthy()
                        expect(res.body.insertedId).toEqual(183)
                })

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(4)
                })

                await request(`${f_addr}`)
                .get("/clip/183")
                .expect("Content-Type", /json/)
                .expect(200)
                .then(res => {
                        expect(res.body.type).toEqual('youtube')
                        expect(res.body.submitter_id).toEqual(jwt.decode(admin_token_id).auth.id)
                        expect(res.body.description).toEqual(clip5_bad.description)
                        expect(res.body.url).toEqual(clip5_bad.url)
                        expect(res.body.timestamp).not.toBeUndefined()
                        expect(new Date(res.body.timestamp)).not.toBeNaN()
                })
        })

        test("POST /clip/new (auth user) - bad role token", async () => {
                await request(`${f_addr}`)
                .post("/clip/new")
                .set("x-access-token", bad_role_admin_token)
                .send(clip6)
                .expect(401)
        })

        test("POST /clip/new (auth user) - user insert test", async () => {
                await request(`${f_addr}`)
                .post("/clip/new")
                .set("x-access-token", user_token)
                .send(clip6)
                .expect(200).then(res => {
                        expect(res.body.acknowledged).toBeTruthy()
                        expect(res.body.insertedId).toEqual(184)
                })

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(5)
                })

                await request(`${f_addr}`)
                .get("/clip/184")
                .expect("Content-Type", /json/)
                .expect(200)
                .then(res => {
                        expect(res.body.type).toEqual('gif')
                        expect(res.body.submitter_id).toEqual(jwt.decode(user_token).auth.id)
                        expect(res.body.description).toEqual(clip6.description)
                        expect(res.body.url).toEqual(clip6.url)
                        expect(res.body.timestamp).not.toBeUndefined()
                        expect(new Date(res.body.timestamp)).not.toBeNaN()
                })                
        })

        test("POST /clip/new (auth user) - user no id insert test", async () => {
                await request(`${f_addr}`)
                .post("/clip/new")
                .set("x-access-token", user_token_no_id)
                .send(clip7)
                .expect(401)

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(5)
                })

                await request(`${f_addr}`)
                .get("/clip/185")
                .expect(404)              
        })
})

describe( "clip edit", () => {
        test("PUT /clip/182 (no auth) - edit test", async () => {
                let new_descr= "edited description"

                await request(`${f_addr}`)
                .put("/clip/182")
                .send({description: new_descr, submitter_id: "185096597799960577"})
                .expect(403)

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(5)
                })

                await request(`${f_addr}`)
                .get("/clip/182")
                .expect(200)
                .then(res=>{
                        expect(res.body.description).not.toBe(new_descr)
                })
        })

        test("PUT /clip/182 (auth admin) - edit testn=, different submitter_id", async () => {
                let new_descr= "edited description"
                req_sub_id= "684068116019413036"

                await request(`${f_addr}`)
                .put("/clip/182")
                .set("x-access-token", admin_token)
                .send({description: new_descr, submitter_id: req_sub_id})
                .expect(200)
                .then(res=>{
                        expect(res.body.status).toBe("updated")
                        expect(res.body.result._id).toEqual(182)
                        expect(res.body.result.description).toBe(new_descr)
                })

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(5)
                })

                await request(`${f_addr}`)
                .get("/clip/182")
                .expect(200)
                .then(res=>{
                        expect(res.body.description).toBe(new_descr)
                        expect(res.body.submitter_id).not.toBe(req_sub_id)
                })
        })

        test("PUT /clip/182 (auth admin) - edit test, different admin id", async () => {
                let new_descr= "edited description2"

                await request(`${f_addr}`)
                .put("/clip/182")
                .set("x-access-token", admin_token_id)
                .send({description: new_descr})
                .expect(200)
                .then(res=>{
                        expect(res.body.status).toBe("updated")
                        expect(res.body.result._id).toEqual(182)
                        expect(res.body.result.description).toBe(new_descr)
                })

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(5)
                })

                await request(`${f_addr}`)
                .get("/clip/182")
                .expect(200)
                .then(res=>{
                        expect(res.body.description).toBe(new_descr)
                        expect(res.body.submitter_id).not.toBe(jwt.decode(admin_token_id).auth.id)
                })
        })

        test("PUT /clip/182 (auth admin) - bad admin role", async () => {
                let new_descr= "edited description3"

                await request(`${f_addr}`)
                .put("/clip/182")
                .set("x-access-token", bad_role_admin_token)
                .send({description: new_descr})
                .expect(401)

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(5)
                })

                await request(`${f_addr}`)
                .get("/clip/182")
                .expect(200)
                .then(res=>{
                        expect(res.body.description).not.toBe(new_descr)
                })
        })

        test("PUT /clip/183 (auth user) - user no id", async () => {
                let new_descr= "edited description3"

                await request(`${f_addr}`)
                .put("/clip/183")
                .set("x-access-token", user_token_no_id)
                .send({description: new_descr, submitter_id: "684068116019413036"})
                .expect(401)

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(5)
                })

                await request(`${f_addr}`)
                .get("/clip/183")
                .expect(200)
                .then(res=>{
                        expect(res.body.description).not.toBe(new_descr)
                })
        })

        test("PUT /clip/183 (auth user) - user bad id", async () => {
                let new_descr= "edited description3"

                await request(`${f_addr}`)
                .put("/clip/183")
                .set("x-access-token", user_token)
                .send({description: new_descr})
                .expect(403)

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(5)
                })

                await request(`${f_addr}`)
                .get("/clip/183")
                .expect(200)
                .then(res=>{
                        expect(res.body.description).not.toBe(new_descr)
                })
        })

        test("PUT /clip/184 (auth user) - user edit test", async () => {
                let new_descr= "edited description3"

                await request(`${f_addr}`)
                .put("/clip/184")
                .set("x-access-token", user_token)
                .send({description: new_descr})
                .expect(200)
                .then(res=>{
                        expect(res.body.status).toBe("updated")
                        expect(res.body.result._id).toEqual(184)
                        expect(res.body.result.description).toBe(new_descr)
                })

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(5)
                })

                await request(`${f_addr}`)
                .get("/clip/184")
                .expect(200)
                .then(res=>{
                        expect(res.body.description).toBe(new_descr)
                        expect(res.body.submitter_id).toBe(jwt.decode(user_token).auth.id)
                })
        })
})

describe( "clip delete", () => {
        test("DELETE /clip/182 (no auth) - delete test", async () => {
                await request(`${f_addr}`)
                .delete("/clip/182")
                .send({submitter_id: "185096597799960577"})
                .expect(403)

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(5)
                })

                await request(`${f_addr}`)
                .get("/clip/182")
                .expect(200)
        })

        test("DELETE /clip/182 (no auth) - delete test", async () => {
                await request(`${f_addr}`)
                .delete("/clip/182")
                .set("x-access-token", admin_token)
                .send({submitter_id: "684068116019413036"})
                .expect(200)
                .then(res=>{
                        expect(res.body.status).toBe('deleted')
                        let old_clip= res.body.result
                        expect(old_clip._id).toEqual(182)
                        expect(old_clip.submitter_id).toBe("185096597799960577")
                })

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(4)
                })

                await request(`${f_addr}`)
                .get("/clip/182")
                .expect(404)
        })

        test("DELETE /clip/183 (auth admin) - bad admin role", async () => {
                await request(`${f_addr}`)
                .delete("/clip/183")
                .set("x-access-token", bad_role_admin_token)
                .send({submitter_id: "684068116019413036"})
                .expect(401)

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(4)
                })

                await request(`${f_addr}`)
                .get("/clip/183")
                .expect(200)
                .then(res=>{
                        expect(res.body.submitter_id).toBe("684068116019413036")
                })
        })

        test("DELETE /clip/184 (auth user) - no submitter id", async () => {
                await request(`${f_addr}`)
                .delete("/clip/184")
                .set("x-access-token", user_token_no_id)
                .send({submitter_id: "185096597799960577"})
                .expect(401)

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(4)
                })

                await request(`${f_addr}`)
                .get("/clip/184")
                .expect(200)
                .then(res=>{
                        expect(res.body.submitter_id).toBe("185096597799960577")
                })
        })

        test("DELETE /clip/183 (auth user) - bad submitter id", async () => {
                await request(`${f_addr}`)
                .delete("/clip/183")
                .set("x-access-token", user_token)
                .send({submitter_id: "684068116019413036"})
                .expect(403)

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(4)
                })

                await request(`${f_addr}`)
                .get("/clip/183")
                .expect(200)
                .then(res=>{
                        expect(res.body.submitter_id).toBe("684068116019413036")
                })
        })

        test("DELETE /clip/184 (auth user) - user delete test", async () => {
                await request(`${f_addr}`)
                .delete("/clip/184")
                .set("x-access-token", user_token)
                .send({submitter_id: "684068116019413036"})
                .expect(200)

                await request(`${f_addr}`)
                .get("/clips")
                .expect(200)
                .then(res=>{
                        expect(res.body.availableClipsCount).toEqual(3)
                })

                await request(`${f_addr}`)
                .get("/clip/184")
                .expect(404)
        })
})
