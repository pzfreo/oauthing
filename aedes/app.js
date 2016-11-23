'use strict'
var fs = require('fs');
var tls = require('tls');
var https = require('https');
var aedes = require('aedes');
var aedesinst = aedes();

var options = {
    key: fs.readFileSync('/home/root/keys/privkey.pem'),
    cert: fs.readFileSync('/home/root/keys/cert.pem'),
    ca: fs.readFileSync('/home/root/keys/fullchain.pem'),
    requestCert: false,
    ciphers: "TLSv1.2",
    passphrase: "password",
    rejectUnauthorized: false};

var httpsServer = https.createServer(options);
httpsServer.listen(8443);


var websocket = require('websocket-stream');
var wss = websocket.createServer({server: httpsServer}, aedesinst.handle)

//var server = require('net').createServer(aedes.handle)
var port = 8888

var SECURE_KEY = '/home/root/keys/privkey.pem';
var SECURE_CERT = '/home/root/keys/cert.pem';


var mqoptions = {
    key: fs.readFileSync(SECURE_KEY),
    cert: fs.readFileSync(SECURE_CERT),
//     ca: fs.readFileSync(SECURE_CA),
    requestCert: false,
//     ciphers: "TLSv1.2",
    rejectUnauthorized: false
};


var server = tls.createServer(mqoptions, aedesinst.handle);
server.listen(port, function () {
  console.log('server listening on port', port)
})

aedesinst.on('clientError', function (client, err) {
  console.log('client error', client.id, err.message, err.stack)
})

aedesinst.on('publish', function (packet, client) {
  if (client) {
    console.log('message from client', client.id)
  }
})

aedesinst.on('client', function (client) {
  console.log('new client', client.id)
})