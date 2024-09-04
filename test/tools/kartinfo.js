const {ServerInfo_Promise}= require('../../src/serv_info')



const myArgs = process.argv.slice(2);


ServerInfo_Promise( myArgs[0]?? 'localhost', Number(myArgs[1] ?? 5029) ).then(info => {
    console.log(`${JSON.stringify(info, null, 4)}`)
}).catch(err => {
    console.log(`AAAAAAARHG - ${err}`)
})
