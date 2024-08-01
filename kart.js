const express= require('express');
const bodyParser= require('body-parser');
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUI = require('swagger-ui-express');

const { process_kart_info_args, about_kart_service }= require("./src/serv_works");

const { API_requestClipById, API_requestClipsPages, API_requestInsertClip, API_requestEditClip, API_requestDeleteClip }= require("./src/clip/serv_clips");
const { API_addons_add, API_addons_download }= require("./src/addons/add")
const { API_getAddonsInfos }= require("./src/addons/infos")
const { API_addons_enable, API_addons_disable, API_addons_remove }= require("./src/addons/manage")
const { API_addons_get_load_order, API_addons_set_load_order }= require("./src/addons/load_order")

const { API_verifyTokenFromPOSTBody }= require("./src/jwt/token");

const { addon_upload }= require("./src/addons/upload")


const config= require("./config/config.json");
const { karterReqCheck } = require('./src/addons/util');


const app= express();

// support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(config.PORT, ()=>console.log(`listening on ${config.PORT}`));



const swaggerOptions= {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'kart_api',
            version: '0.1.2'
        },
        host: config.api.HOST,
        basePath: config.api.BASE_PATH,
        servers: [
            {
                url: `http${config.api.HAS_HTTPS?'s':''}://${config.api.HOST}/${config.api.BASE_PATH}`

            }
        ]
    },
    apis: ['kart.js']
}

const swaggerDocs= swaggerJSDoc(swaggerOptions);

app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

/**
 * @swagger
 * /info:
 *  get:
 *      description: get info about a kart server
 *      parameters:
 *      -   name: address
 *          description: the address of kart server, defaults to strashbot.fr
 *          in: query
 *          type: String
 *          required: false
 *      -   name: port
 *          description: the port of the kart server, defaults to 5029
 *          in: query
 *          type: int
 *          required: false
 *      responses:
 *          200:
 *              description: info found
 *          500:
 *              description: an error occurred while fetching infos
 * 
 */
app.get("/info", (req, res) => {
    var { address, port }= req.query

    process_kart_info_args(address, port).then( info => {
        res.send(
            info
        )
    })
    .catch(err => {
        console.error(`[GET /info - ERROR] ${JSON.stringify(err)}`)
        res.status(500).send({status: "ERROR"})
    })
});

/**
 * @swagger
 * /service:
 *  get:
 *      description: on the server, check if kart service is running
 *      responses:
 *          200:
 *              description: JSON field status gives info about service state UP, DOWN, or UNAVAILABLE
 *          500:
 *              description: an unexpected error has occured
 *              
 * */
app.get("/service", (req, res) => {
    about_kart_service().then(about => {
        res.send(about);
    })
    .catch(err => {
        res.status(500).send({status: "ERROR"});
    })
});

/**
 * @swagger
 * /clip/{clipId}:
 *  get:
 *      description: get info about a clip giving its id
 *      parameters:
 *      -   name: clipId
 *          in: path
 *          required: true
 *          schema:
 *              type: integer
 *              format: int64
 *      responses:
 *          200:
 *              description: clip lookup succeeded. Returin JSON object providing infos
 *          404:
 *              description: clip lookup succeded but no clip matching this id was found
 *          500:
 *              description: an error occured during clip lookup
 */
app.get("/clip/:clipId", API_requestClipById);

/**
 * @swagger
 * /clips:
 *  get:
 *      description: get pages of clips
 *      parameters:
 *      -   name: perPage
 *          description: how many clips per page? Default to 32.
 *          in: query
 *          type: String
 *      -   name: pageNum
 *          description: page number
 *          in: query
 *          schema:
 *              type: interger
 *              format: int64
 *      responses:
 *          200:
 *              description: success. Returns object including page number and a list of clips
 *          204:
 *              description: no clip to show
 *          500:
 *              description: an error occured during clip fetch
 */
app.get("/clips", API_requestClipsPages);

/**
 * @swagger
 * /clip/new:
 *     post:
 *       description: add a new clip to the database
 *       parameters:
 *         - name: x-access-token
 *           in: header
 *           required: true
 *           type: string
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  submitter_id:
 *                      type: string
 *                      format: id
 *                  description:
 *                      type: string
 *                      format: text
 *                  url:
 *                      type: string
 *                      format: url
 *                  timestamp:
 *                      type: string
 *                      format: date-time
 *               required:
 *                  - submitter_id
 *                  - url
 *       responses:
 *         200:
 *           description: ok
 *         409:
 *           description: clip already inserted
 *         400:
 *           description: bad request
 *         401:
 *           description: bad token
 *         403:
 *           description: forbidden access
 *         440:
 *           description: bad clip data - clip url?
 *         441:
 *           description: bad data - submitter invalid?
 *         500:
 *           description: error occured server side
 */
app.post("/clip/new", API_verifyTokenFromPOSTBody, API_requestInsertClip);

/**
 * @swagger
 * /clip/{clipId}:
 *      put:
 *          description: edit clip info
 *          parameters:
 *            - name: clipId
 *              in: path
 *              required: true
 *              schema:
 *                  type: integer
 *                  format: int64
 *            - name: x-access-token
 *              in: header
 *              required: true
 *              type: string
 *          requestBody:
 *              required: false
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              description:
 *                                  type: string
 *                              submitter_id:
 *                                  type: string
 *                                  format: id
 *          responses:
 *              200:
 *                  description: ok
 *              400:
 *                  description: bad request
 *              401:
 *                  description: bad token
 *              403:
 *                  description: forbidden access
 *              500:
 *                  description: error occured server side
 */
app.put("/clip/:clipId", API_verifyTokenFromPOSTBody, API_requestEditClip);

/**
 * @swagger
 * /clip/{clipId}:
 *      delete:
 *          description: remove clip
 *          parameters:
 *              - name: clipId
 *                in: path
 *                required: true
 *                schema:
 *                  type: integer
 *                  format: int64
 *              - name: x-access-token
 *                in: header
 *                required: true
 *                type: string
 *          requestBody:
 *              required: false
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              submitter_id:
 *                                  type: string
 *                                  format: id
 *          responses:
 *              200:
 *                  description: ok
 *              400:
 *                  description: bad request
 *              401:
 *                  description: bad token
 *              403:
 *                  description: forbidden access
 *              500:
 *                  description: error occured server side
 */
app.delete("/clip/:clipId", API_verifyTokenFromPOSTBody, API_requestDeleteClip);

require('./src/clip/clip_thumbnail').setClipsThumbnailFileEntryPoint(app)

const multer = require('multer');
/**
 * @swagger
 * /addons/{karter}/upload:
 *     post:
 *       description: uploads a new addon to the karter's server
 *       parameters:
 *         - name: karter
 *           in: path
 *           required: true
 *           type: string
 *         - name: x-access-token
 *           in: header
 *           required: true
 *           type: string
 *       requestBody:
 *         required: true
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               properties:
 *                 file:
 *                   type: string
 *                   format: binary
 *       responses:
 *         200:
 *           description: ok
 *         400:
 *           description: bad request
 *         401:
 *           description: bad token
 *         403:
 *           description: forbidden access
 *         404:
 *           description: resource not found (bad 'karter' param?)
 *         500:
 *           description: error occured server side
 */
app.post("/addons/:karter/upload", karterReqCheck, API_verifyTokenFromPOSTBody,
            (req, res, next) => {
                addon_upload.single('file')(req, res, err => {
                    if (err instanceof multer.MulterError) {
                        // A Multer error occurred when uploading the file
                        return res.status(400).send({status: 'file_error', error: err.message});
                    } else if (err) {
                        // An unknown error occurred when uploading the file
                        return res.status(500).send({status: 'internal_error'});
                    }

                    next();
                })
            }, 
            API_addons_add
);

/**
 * @swagger
 * /addons/{karter}/install:
 *     post:
 *       description: push and addon url for server to download
 *       parameters:
 *         - name: karter
 *           in: path
 *           required: true
 *           type: string
 *         - name: x-access-token
 *           in: header
 *           required: true
 *           type: string
 *       requestBody:
 *           required: true
 *           content:
 *             application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: url
 *       responses:
 *         200:
 *           description: ok
 *         400:
 *           description: bad request
 *         401:
 *           description: bad token
 *         403:
 *           description: forbidden access
 *         404:
 *           description: resource not found (bad 'karter' param?)
 *         440:
 *           description: file to heavy (limit should be 256 MB)
 *         441:
 *           description: unallowed file mimetype
 *         442:
 *           description: unallowed file extension
 *         500:
 *           description: error occured server side
 *         513:
 *           description: failed to download file at given url
*/
app.post("/addons/:karter/install", karterReqCheck, API_verifyTokenFromPOSTBody,
            API_addons_download
);

/**
 * @swagger
 * /addons/{karter}/info:
 *     get:
 *       description: push and addon url for server to download
 *       parameters:
 *         - name: karter
 *           in: path
 *           required: true
 *           type: string
 *         - name: addon
 *           in: query
 *           required: false
 *           type: string
 *       responses:
 *         200:
 *           description: ok
 *         400:
 *           description: bad request
 *         401:
 *           description: bad token
 *         403:
 *           description: forbidden access
 *         404:
 *           description: resource not found (bad 'karter' param? no addons installed? given addon not installed?)
 *         500:
 *           description: error occured server side
*/
app.get("/addons/:karter/info", karterReqCheck, API_getAddonsInfos)

/**
 * @swagger
 * /addons/{karter}/enable:
 *     post:
 *       description: enable already installed addons on the server
 *       parameters:
 *         - name: karter
 *           in: path
 *           required: true
 *           type: string
 *         - name: x-access-token
 *           in: header
 *           required: true
 *           type: string
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 addons:
 *                   oneOf:
 *                     - type: string
 *                     - type: array
 *                       items:
 *                         type: string
 *       responses:
 *         200:
 *           description: ok
 *         201:
 *           description: failure occured enabling some addons
 *         400:
 *           description: bad request
 *         401:
 *           description: bad token
 *         403:
 *           description: forbidden access
 *         404:
 *           description: resource not found (bad 'karter' param? no addons installed? given addon not installed?)
 *         500:
 *           description: error occured server side
 *         513:
 *           description: no addon enabled
*/
app.post("/addons/:karter/enable", karterReqCheck, API_verifyTokenFromPOSTBody,
            API_addons_enable
)

/**
 * @swagger
 * /addons/{karter}/disable:
 *     post:
 *       description: disable installed addons on the server
 *       parameters:
 *         - name: karter
 *           in: path
 *           required: true
 *           type: string
 *         - name: x-access-token
 *           in: header
 *           required: true
 *           type: string
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 addons:
 *                   oneOf:
 *                     - type: string
 *                     - type: array
 *                       items:
 *                         type: string
 *       responses:
 *         200:
 *           description: ok
 *         201:
 *           description: failure occured disabling some addons
 *         400:
 *           description: bad request
 *         401:
 *           description: bad token
 *         403:
 *           description: forbidden access
 *         404:
 *           description: resource not found (bad 'karter' param?)
 *         500:
 *           description: error occured server side
 *         513:
 *           description: no addon disabled
*/
app.post("/addons/:karter/disable", karterReqCheck, API_verifyTokenFromPOSTBody,
            API_addons_disable
)

/**
 * @swagger
 * /addons/{karter}/remove:
 *     post:
 *       description: remove/uninstall installed addons on the server
 *       parameters:
 *         - name: karter
 *           in: path
 *           required: true
 *           type: string
 *         - name: x-access-token
 *           in: header
 *           required: true
 *           type: string
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 addons:
 *                   oneOf:
 *                     - type: string
 *                     - type: array
 *                       items:
 *                         type: string
 *       responses:
 *         200:
 *           description: ok
 *         201:
 *           description: failure occured removing some addons
 *         400:
 *           description: bad request
 *         401:
 *           description: bad token
 *         403:
 *           description: forbidden access
 *         404:
 *           description: resource not found (bad 'karter' param?)
 *         500:
 *           description: error occured server side
 *         513:
 *           description: no addon removed
*/
app.post("/addons/:karter/remove", karterReqCheck, API_verifyTokenFromPOSTBody,
            API_addons_remove
)

app.get("/addons/:karter/load_order", karterReqCheck, API_verifyTokenFromPOSTBody,
            API_addons_get_load_order
)

app.put("/addons/:karter/load_order", karterReqCheck, API_verifyTokenFromPOSTBody,
            API_addons_set_load_order
)
