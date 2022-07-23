const express= require('express');
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUI = require('swagger-ui-express');

const { process_kart_info_args, about_kart_service }= require("./src/serv_works")

const { API_requestClipById }= require("./src/clip/serv_clips")

const config= require("./config/config.json");


const app= express();

app.listen(config.PORT, ()=>console.log(`listening on ${config.PORT}`));

const swaggerOptions= {
    swaggerDefinition: {
        info: {
            title: 'kart_api',
            version: '0.1.1'
        },
        host: config.api.HOST,
        basePath: config.api.BASE_PATH
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
 *          400:
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
        console.error(`[GET /info - ERROR] ${err}`)
        res.status(400).send(err)
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
 *          400:
 *              description: an unexpected error has occured
 *              
 * */
app.get("/service", (req, res) => {
    about_kart_service().then(about => {
        res.send(about);
    })
    .catch(err => {
        res.status(400).send({status: "ERROR"});
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
 *          204:
 *              description: clip lookup succeded but no clip matching this id was found
 *          400:
 *              description: an error occured during clip lookup
 */
app.get("/clip/:clipId", API_requestClipById);
