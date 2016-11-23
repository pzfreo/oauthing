// third party app

// phase 1. call DCR and get a client id / cs

// phase 2. customer comes along. redirect to oauthing 

// phase 3. start up client side mqtt with websockets



var http = require('http');
var qs = require('querystring');
var oauth2token = require('./oauth2token.js');
var dcr = require('./dcr');



var client_id; 
var client_secret; 
var refresh_token;
var access_token;
	
	
var redirect_uri = "http://localhost:8081/callback";

var express = require('express');
var app = express();
app.use('/', express.static(__dirname + '/static'));


app.get('/', function (req, res) {
  res.redirect('/gettoken');
});


app.get('/gettoken', function (req,res) {
  encoded = qs.stringify({
    client_id : client_id,
    scope : "mqsd mqpc mqsc mqpd",
    redirect_uri : redirect_uri,
    response_type : "code"
  });
  red_url = "https://oauthing.io/dialog/authorize"
  res.redirect(red_url+"?"+encoded);
});

app.get('/callback', function (req, res) {
  var code = req.query.code;
  var post_options = {
  	code: code,
  	cid: client_id,
  	cs: client_secret,
  	red_uri: redirect_uri,
  	host: "oauthing.io",
  	port: 443,
  	path: "/oauth/token"
  }
  oauth2token.getToken(post_options, function (err, token_response) {
 	  refresh_token = token_response.refresh_token;
 	  access_token = token_response.access_token; 
      res.redirect('/mqtt.html?access_token='+access_token);
  });
});

console.log("about to register");

var options = { client_name: 'sampleTPA', 
				redirect_uris: [redirect_uri],
				host:'oauthing.io',
     			port: '443',
				path: '/register'
};


dcr.register(options, function (err, result) {
	if (err) {
		process.exit(1);
	}
	
	client_id = result.client_id;
	client_secret = result.client_secret;
	
	console.log("client_id", client_id);
	
	app.listen(8081, function () {
	  console.log('Example third party app listening on port 8081!');
	  require("openurl").open("http://localhost:8081/")
	});	
	
});

