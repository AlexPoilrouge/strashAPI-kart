const express= require('express');
const bodyParser= require('body-parser');
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUI = require('swagger-ui-express');
const path = require('path')

const { process_kart_info_args, about_kart_service, restart_service, stop_service }= require("./src/serv_works");

const { API_requestClipById, API_requestClipsPages, API_requestInsertClip, API_requestEditClip, API_requestDeleteClip }= require("./src/clip/serv_clips");
const { API_addons_download, API_addons_install }= require("./src/addons/add")
const { API_getAddonsInfos }= require("./src/addons/infos")
const { API_addons_enable, API_addons_disable, API_addons_remove }= require("./src/addons/manage")
const { API_addons_get_load_order, API_addons_set_load_order, API_addons_load_order_download, API_addons_load_order_install }= require("./src/addons/load_order")

const { API_verifyTokenFromPOSTBody }= require("./src/jwt/token");


const config= require("./config/config.json");
const { karterReqCheck } = require('./src/addons/addons_utils');


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
 *      tags:
 *      -   base
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
 * /service/{karter}:
 *  get:
 *      tags:
 *      -   base
 *      description: check racer's server service status (UP,DOWN, or UNAVAILABLE)
 *      parameters:
 *          - name: karter
 *            in: path
 *            required: true
 *            type: string
 *      responses:
 *          200:
 *              description: JSON field status gives info about service state UP, DOWN, or UNAVAILABLE
 *          404:
 *              description: Racer isn't register/doesn't exist
 *          500:
 *              description: an unexpected error has occured
 *              
 * */
app.get("/service/:karter", (req, res) => {
    about_kart_service(req.params.karter).then(about => {
        res.send(about);
    })
    .catch(err => {
        if(Boolean(err) && err.status==="CONFIG_ERROR")
            res.status(400).send({status: "BAD_RACER"})
        else
            res.status(500).send({status: "ERROR"});
    })
});

/**
 * @swagger
 * /service/restart/{karter}:
 *  get:
 *      tags:
 *      -   base
 *      description: restarts the racer's server service
 *      parameters:
 *         - name: karter
 *           in: path
 *           required: true
 *           type: string
 *         - name: x-access-token
 *           in: header
 *           required: true
 *           type: string
 *      responses:
 *          200:
 *              description: JSON field status gives info about service state UP, DOWN, or UNAVAILABLE
 *          404:
 *              description: Racer isn't register/doesn't exist
 *          500:
 *              description: an unexpected error has occured
 *          503:
 *              description: operation is unavailable (cooldown?)         
 * */
app.get("/service/restart/:karter", API_verifyTokenFromPOSTBody, (req, res) => {
    restart_service(req.params.karter).then(result => {
        if(Boolean(result.state)){
            let state= result.state.toLowerCase()
            if(state==="cooldown"){
                res.status(503).send(result)
            }
            else if(state==="ok"){
                res.send(result)
            }
            else{
                res.status(500).send({status: "ERROR"});
            }
        }
        else{
            res.status(500).send({status: "ERROR"});
        }
    }).catch(err => {
        if(Boolean(err) && err.status==="CONFIG_ERROR")
            res.status(400).send({status: "BAD_RACER"})
        else
            res.status(500).send({status: "ERROR"});
    })
})

/**
 * @swagger
 * /service/stop/{karter}:
 *  get:
 *      tags:
 *      -   base
 *      description: stops the racer's server service
 *      parameters:
 *         - name: karter
 *           in: path
 *           required: true
 *           type: string
 *         - name: x-access-token
 *           in: header
 *           required: true
 *           type: string
 *      responses:
 *          200:
 *              description: JSON field status gives info about service state UP, DOWN, or UNAVAILABLE
 *          404:
 *              description: Racer isn't register/doesn't exist
 *          500:
 *              description: an unexpected error has occured
 *          503:
 *              description: operation is unavailable (cooldown?)         
 * */
app.get("/service/stop/:karter", API_verifyTokenFromPOSTBody, (req, res) => {
    stop_service(req.params.karter).then(result => {
        if(Boolean(result.state)){
            let state= result.state.toLowerCase()
            if(state==="cooldown"){
                res.status(503).send(result)
            }
            else if(state==="ok"){
                res.send(result)
            }
            else{
                res.status(500).send({status: "ERROR"});
            }
        }
        else{
            res.status(500).send({status: "ERROR"});
        }
    }).catch(err => {
        if(Boolean(err) && err.status==="CONFIG_ERROR")
            res.status(400).send({status: "BAD_RACER"})
        else
            res.status(500).send({status: "ERROR"});
    })
})

/**
 * @swagger
 * /clip/{clipId}:
 *  get:
 *      tags:
 *      -   clips
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
 *      tags:
 *      -   clips
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
 *       tags:
 *         - clips
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
 *          tags:
 *            - clips
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
 *          tags:
 *              - clips
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


/**
 * @swagger
 * /addons/{karter}/install:
 *   post:
 *     summary: Install an addon either by uploading a file or providing a URL.
 *     description: >
 *       This endpoint allows you to install an addon by uploading a file or by providing a URL. 
 *       The file can be uploaded as multipart/form-data, or the URL to the file can be sent in the request body.
 *     tags:
 *       - addons
 *     parameters:
 *       - name: karter
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The karter identifier.
 *       - name: x-access-token
 *         in: header
 *         required: true
 *         type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to be uploaded (required if URL is not provided).
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: url
 *                 description: URL to download the addon from (required if file is not provided).
 *     responses:
 *       '200':
 *         description: Addon successfully added.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: added
 *                 result:
 *                   type: object
 *                   properties:
 *                     addon:
 *                       type: string
 *                       example: "addonfile_basename.pk3"
 *                     state:
 *                       type: string
 *                       example: "installed"
 *       '400':
 *         description: Bad request, missing input (no file or URL provided).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: missing_input
 *                 error:
 *                   type: string
 *                   example: No file or URL provided
 *       '401':
 *         description: Unauthorized or token-related errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: auth_error
 *                 error:
 *                   type: string
 *                   example: Authentication error
 *       '403':
 *         description: Forbidden, token required but not provided.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: forbidden
 *                 error:
 *                   type: string
 *                   example: A token is required to authenticate
 *       '440':
 *         description: File too heavy to download from the provided URL.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: file_too_heavy
 *       '441':
 *         description: File has a bad MIME type.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: file_bad_mimetype
 *       '442':
 *         description: File has a bad extension.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: file_bad_extension
 *       '500':
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: internal_error
 *       '513':
 *         description: Failed to download the addon from the provided URL.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: addon_download_failed
*/
app.post("/addons/:karter/install", karterReqCheck, API_verifyTokenFromPOSTBody,
            API_addons_install,
            (req, res, next) => {
                if(req.file) {
                    res.status(200).send({
                        status: 'added',
                        result: {
                            addon: req.file.filename,
                            state: path.basename(req.file.destination)
                        }
                    })
                }
                else if (req.body.url) {
                    API_addons_download(req,res,next)
                }
                else{
                    return res.status(400).json({ status: "missing_input", error: 'No file or URL provided' });
                }
            }
);

/**
 * @swagger
 * /addons/{karter}/info:
 *     get:
 *       tags:
 *         - addons
 *       description: fetch info about an addon file
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
 *       tags:
 *         - addons
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
 *       tags:
 *         - addons
 *       description: prepare given racer for given addon disablement
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
 *       tags:
 *         - addons
 *       description: prepare given racer for given addon removal/uninstall
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

/**
 * @swagger
 * /addons/{karter}/load_order:
 *     get:
 *       tags:
 *         - addons
 *       description: get the addon load order config file for given racer
 *       parameters:
 *         - name: karter
 *           in: path
 *           required: true
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
 *           description: resource not found (bad 'karter' param? no addon order config set yet?)
 *         500:
 *           description: error occured server side
*/
app.get("/addons/:karter/load_order", karterReqCheck,
            API_addons_get_load_order
)


/**
 * @swagger
 * /addons/{karter}/load_order:
 *  put:
 *    summary: Upload or download an addon load order file
 *    description: |
 *      This endpoint allows either to upload a YAML file or to provide a URL to download the file for the specified karter.
 *      - If a file is uploaded, it must be sent as a form-data field named `file`.
 *      - If a URL is provided in the request body, the file will be downloaded from that URL, subject to size and type restrictions.
 *    tags:
 *      - addons
 *    parameters:
 *      - in: path
 *        name: karter
 *        schema:
 *          type: string
 *        required: true
 *        description: The karter identifier.
 *      - name: x-access-token
 *        in: header
 *        required: true
 *        type: string
 *    requestBody:
 *      required: true
 *      content:
 *        multipart/form-data:
 *          schema:
 *            type: object
 *            properties:
 *              file:
 *                type: string
 *                format: binary
 *                description: The file to be uploaded.
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              url:
 *                type: string
 *                format: uri
 *                description: The URL of the file to be downloaded.
 *    responses:
 *      '200':
 *        description: The addon load order file was successfully updated.
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                status:
 *                  type: string
 *                  example: updated
 *                result:
 *                  type: object
 *                  properties:
 *                    addon_order_file:
 *                      type: string
 *                      example: load_order.yaml
 *      '400':
 *        description: Error during the file upload process.
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                status:
 *                  type: string
 *                  example: file_error
 *                error:
 *                  type: string
 *      '401':
 *        description: Authentification error - bad, invalid, or expired token?
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                status:
 *                  type: string
 *                  example: bad_auth_token
 *                error:
 *                  type: string
 *      '403':
 *        description: Forbidden acces - token needed.
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                status:
 *                  type: string
 *                  example: forbidden
 *                error:
 *                  type: string
 *      '440':
 *        description: The file at the provided URL exceeds the size limit.
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                status:
 *                  type: string
 *                  example: file_too_heavy
 *      '441':
 *        description: The file at the provided URL has an invalid MIME type.
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                status:
 *                  type: string
 *                  example: file_bad_mimetype
 *      '442':
 *        description: The file at the provided URL has an invalid extension.
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                status:
 *                  type: string
 *                  example: file_bad_extension
 *      '500':
 *        description: Internal server error.
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                status:
 *                  type: string
 *                  example: internal_error
 *      '513':
 *        description: Failed to download the addon from the provided URL.
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                status:
 *                  type: string
 *                  example: addon_download_failed
 */
app.put("/addons/:karter/load_order", karterReqCheck, API_verifyTokenFromPOSTBody,
            API_addons_load_order_install,
            (req, res, next) => {
                if(req.file) { next(); }
                else if (req.body.url) {
                    API_addons_load_order_download(req,res,next)
                }
                else{
                    return res.status(400).json({ status: "missing_input", error: 'No file or URL provided' });
                }
            },
            API_addons_set_load_order
)
