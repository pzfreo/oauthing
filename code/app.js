/*jslint node: true */
'use strict';

var config = require('./config');
var express = require('express');
var passport = require('passport');
var site = require('./site');
var oauth2 = require('./oauth2');
var user = require('./user');
var client = require('./client');
var token = require('./token');
var https = require('https');
var http = require('http');
var cookieParser = require('cookie-parser');
var qs = require('querystring');
var bodyParser = require('body-parser');
var fs = require('fs');
var expressSession = require("express-session");
var path = require('path');
// var login = require('connect-ensure-login');
// var GitHubStrategy = require('passport-github2').Strategy;
var dcr = require('./dcr');
var intro = require('./intro');


var SECURE_KEY = '/home/root/keys/privkey.pem';
var SECURE_CERT = '/home/root/keys/cert.pem';

var aedes = require('aedes');
var aedesinst = aedes();
var mqp = require('mqtt-packet');
var fs = require('fs');
var tls = require('tls');
var mqport = 8883;


var mqoptions = {
    key: fs.readFileSync(SECURE_KEY),
    cert: fs.readFileSync(SECURE_CERT),
//     ca: fs.readFileSync(SECURE_CA),
    requestCert: false,
//     ciphers: "TLSv1.2",
    rejectUnauthorized: false};




//Pull in the mongo store if we're configured to use it
//else pull in MemoryStore for the session configuration
var sessionStorage;
if (config.session.type === 'MongoStore') {
  var MongoStore = require('connect-mongo')({session: expressSession});
  console.log('Using MongoDB for the Session');
  sessionStorage = new MongoStore({
    db: config.session.dbName
  });
} else if (config.session.type === 'MemoryStore') {
  var MemoryStore = expressSession.MemoryStore;
  console.log('Using MemoryStore for the Session');
  sessionStorage = new MemoryStore();
} else {
  //We have no idea here
  throw new Error("Within config/index.js the session.type is unknown: " + config.session.type);
}

//Pull in the mongo store if we're configured to use it
//else pull in MemoryStore for the database configuration
var db = require('./' + config.db.type);
if (config.db.type === 'mongodb') {
  console.log('Using MongoDB for the data store');
} else if (config.db.type === 'db') {
  console.log('Using MemoryStore for the data store');
} else if (config.db.type === 'cassandradb') {
  console.log('Using MemoryStore for the data store');
} else {
  //We have no idea here
  throw new Error("Within config/index.js the db.type is unknown: " + config.db.type);
}

// Express configuration
var app = express();
app.set('view engine', 'ejs');
app.use(cookieParser());

//Session Configuration
app.use(expressSession({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
//
// app.use(expressSession({
//   saveUninitialized: true,
//   resave: true,
//   secret: config.session.secret,
//   store: sessionStorage,
//   key: "authorization.sid",
//   cookie: {maxAge: config.session.maxAge}
// }));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

var clienthandler = new Array();
var connectedclients = new Array();




var call_token = function(cid, cs, code, done) {
	// call this site with the token api - could potentially optimise later
// 	console.log("call_token");
    var data = { grant_type: "authorization_code",
             code : code,
             client_id : cid,
             client_secret : cs,
             redirect_uri : "https://oauthing.io/callback"
           }
    var encoded = qs.stringify(data);
//     console.log("call_token sending");
//     console.log(data);
    
    var post_options = {
        host: "oauthing.io",
//         port: 443,
        path: "/oauth/token",
        method: 'POST',
        rejectUnauthorized: false,
	    requestCert: false,
      	agent: false,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    var post_req = https.request(post_options, function(r) {
        var body = ""
        r.setEncoding('utf8');
        r.on('data', function (chunk) {
            body += chunk;
        });
        r.on('end', function() {
          try {
//             console.log(body);
            var response = JSON.parse(body);
          } catch (e) {}

          if (response) {
            done(response);
          }
          else
          {
            done(null);
          }
        });
    });
    // post the data
    post_req.write(encoded);
    post_req.end();
//     console.log("sent data");
};

var call_refresh = function(cid, cs, refresh, done) {
	// call this site with the token api - could potentially optimise later
// 	console.log("call_refresh");
    var data = { grant_type: "refresh_token",
             refresh_token : refresh,
             client_id : cid,
             client_secret : cs
           }
    var encoded = qs.stringify(data);
    
    var post_options = {
        host: "oauthing.io",
//         port: 443,
        path: "/oauth/token",
        method: 'POST',
        rejectUnauthorized: false,
	    requestCert: false,
      	agent: false,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    var post_req = https.request(post_options, function(r) {
        var body = ""
        r.setEncoding('utf8');
        r.on('data', function (chunk) {
            body += chunk;
        });
        r.on('end', function() {
          try {
//             console.log(body);
            var response = JSON.parse(body);
          } catch (e) {}

          if (response) {
            done(response);
          }
          else
          {
            done(null);
          }
        });
    });
    // post the data
    post_req.write(encoded);
    post_req.end();
//     console.log("sent data");
};



// mqttclient.on('connect', function () {
// 
//   mqttclient.subscribe("/pres");
//   mqttclient.subscribe("/token");
//   mqttclient.subscribe("/ready");
// });


app.get('/', function (req,res) {
	var hello = { hello: "world" };
	res.json(hello);
});

app.get('/r', function (req, res) {
	var cid = req.query.cid;
	if (!cid) {
		res.send('invalid QR code');
		return;
	}
	if (cid in connectedclients && connectedclients[cid]) {
		var redirect_uri = "https://oauthing.io/callback";
		return res.redirect('dialog/authorize?client_id='+cid+'&scope=mqpd%20mqsc&redirect_uri='+redirect_uri+"&state="+cid+"&response_type=code");
	}
	else {
		return res.send('client not connected - please switch on');
	}
});
		
		
app.get('/callback', function (req, res) {
  var code = req.query.code;
  var client_id = req.query.state;
  var message = JSON.stringify({authcode:code});

  clienthandler[client_id] = function() {
  	res.send('success in registering device '+client_id);
  	delete clienthandler[client_id];
  };
  publish("/cid/"+client_id+"/cb", message);  
});


// Passport configuration
require('./auth');

// app.get('/', site.index);
// app.get('/login', passport.authenticate('github', { scope: [ 'user:email' ] })); //site.loginForm);

app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }),
  function(req, res){
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  });
  
  app.get('/auth/github/callback', 
  passport.authenticate('github' , {  failureRedirect: '/login' }),
  function(req, res) {
    if (req.session && req.session.returnTo) {
      res.redirect(req.session.returnTo);
    }
    else {
      res.redirect('/');
    }
  });
  
app.get('/auth/google',
passport.authenticate('google', { scope: [ 'email' ] }),
function(req, res){
  // The request will be redirected to GitHub for authentication, so this
  // function will not be called.
});

app.get('/auth/google/callback', 
  passport.authenticate( 'google', {  failureRedirect: '/login' }),
  function(req, res) {
    if (req.session && req.session.returnTo) {
      res.redirect(req.session.returnTo);
    }
    else {
      res.redirect('/');
    }
  });

app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: [ 'email' ] }),
  function(req, res){
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  });
  
  app.get('/auth/facebook/callback', 
  passport.authenticate( 'facebook', {  failureRedirect: '/login' }),
  function(req, res) {
    if (req.session && req.session.returnTo) {
      res.redirect(req.session.returnTo);
    }
    else {
      res.redirect('/');
    }
  });
  
app.get('/auth/twitter',
  passport.authenticate('twitter', { scope: [ 'email' ] }),
  function(req, res){
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  });
  
  app.get('/auth/twitter/callback', 
	  passport.authenticate('twitter', {  failureRedirect: '/login' }),
  function(req, res) {
    if (req.session && req.session.returnTo) {
      res.redirect(req.session.returnTo);
    }
    else {
      res.redirect('/');
    }
  });

app.get('/login', site.loginForm);
app.post('/login', site.login);
app.get('/logout', site.logout);
app.get('/account', site.account);

app.get('/dialog/authorize', oauth2.authorization);
app.post('/dialog/authorize/decision', oauth2.decision);
app.post('/oauth/token', oauth2.token);
app.post('/introspect', intro.introspection);

app.get('/api/userinfo', user.info);
app.get('/api/clientinfo', client.info);

app.post('/register', bodyParser.json(), dcr.registration);

// Mimicking google's token info endpoint from
// https://developers.google.com/accounts/docs/OAuth2UserAgent#validatetoken
app.get('/api/tokeninfo', token.info);
app.post('/api/token', token.add);

	


// app.get('/callback', 
//   passport.authenticate(['github', 'google', 'twitter', 'facebook'], {  failureRedirect: '/login' }),
//   function(req, res) {
//     if (req.session && req.session.returnTo) {
//       res.redirect(req.session.returnTo);
//     }
//     else {
//       res.redirect('/');
//     }
//   });

//static resources for stylesheets, images, javascript files
app.use(express.static(path.join(__dirname, 'public')));


//From time to time we need to clean up any expired tokens
//in the database
setInterval(function () {
  db.accessTokens.removeExpired(function (err) {
    if (err) {
      console.error("Error removing expired tokens");
    }
  });
}, config.db.timeToCheckExpiredTokens * 1000);

var options = {
    key: fs.readFileSync('/home/root/keys/privkey.pem'),
    cert: fs.readFileSync('/home/root/keys/cert.pem'),
    ca: fs.readFileSync('/home/root/keys/fullchain.pem'),
    requestCert: false,
    ciphers: "TLSv1.2",
    passphrase: "password",
    rejectUnauthorized: false};

// Create our HTTPS server listening on port 3000.
// https.createServer(options, app).listen(3000);
var httpsServer = https.createServer(options, app);
httpsServer.listen(443);
console.log("OAuth 2.0 Authorization Server started on port 443");


// set up MQTT handling

// simple publish function
var publish = function(topic, message, done) {

// 	console.log("attempting publish", topic, message);
	
	var packet = {
       topic: topic,
       payload: message
    };
    return aedesinst.publish(packet, done);
}


// Accepts the connection if the username and password are valid
aedesinst.authenticate = function(client, username, password, callback) {
//   console.log(username, password.toString());
  // todo look up in the client database
  var authorized = true;
  if (authorized) 
  { 
  	client.user = username;
	client.clientSecret = password.toString(); // fix this later 
									// for now we'll just save the clientSecret 
  }
  callback(null, authorized);
}


// anyone can publish
aedesinst.authorizePublish = function(client, packet, callback) {
  // console.log("user: "+client.user);
  // console.log("authpub ");
  var topic = packet.topic;
//   console.log(packet);
//   console.log(topic)
//   console.log(topic.split('/')[2]);
  
  callback(null, true);
}


// only a device can subscribe and that must be logged in as the client and 
// subscribing to /cid/{userid} where the userid is the oauth2 clientid
aedesinst.authorizeSubscribe = function(client, sub, callback) {
  	
  var topic = sub.topic;
//   console.log("topic", topic);
  if (topic.startsWith("/cid/")) {
	  if (client && client.user == topic.split('/')[2]) {
		  return callback(null, sub);
  	  }
  	  else
  	  {
  	      return callback(new Error("invalid subscription"),null);
  	  }
   }
//    else if (topic.startsWith("/USER")) {
//    	return callback(null, sub);
//    } 
   else return callback(new Error(), null);
}





aedesinst.on('client', function(client) {
    console.log('client connected', client.id);     
    console.log('client user', client.user); 
    connectedclients[client.user] = true;
});

aedesinst.on('clientDisconnect', function(client) {
	console.log('Client Disconnected:', client.id);
	delete connectedclients[client.user];
});

// fired when a message is received
aedesinst.on('publish', function(packet, client) {
	var topic = packet.topic;
	var message = packet.payload.toString();
// 	console.log('topic', topic);
// 	console.log('message', message);	
	if (topic.startsWith("/token")) {
// 		console.log("token");
		var m = JSON.parse(message);
		var client_id = client.user;
		var client_secret = client.clientSecret;
		var refresh = m.refresh_token;
		var grant_type = m.grant_type;
		if (grant_type == "refresh_token") {
			call_refresh(client_id, client_secret, refresh, function(result) {
			  if (!result) throw new Error();
			  var r = {};
			  r.access_token = result.access_token;
			  r.refresh_token = result.refresh_token;
			  return publish("/cid/"+client_id+"/token_response", JSON.stringify(r), new function() { return; });
			});
		}
		else if (grant_type == "authorization_code") {
// 		  console.log("cid/cs", client_id, client_secret);
		  var authcode = m.authcode;
		  // call registration here on behalf of the client
		  call_token(client_id, client_secret, authcode, function (result) {
			  if (!result) throw new Error("failed authorization code grant");
			  var r = {};
			  r.access_token = result.access_token;
			  r.refresh_token = result.refresh_token;
			  return publish("/cid/"+client_id+"/token_response", JSON.stringify(r), new function() {return;});

		  });
		}			
	}
	else if (topic.startsWith("/ready")) {
// 		console.log("handling ready");
//		var m = JSON.parse(message);
		var client_id = client.user;
		if (clienthandler[client_id]) clienthandler[client_id]();
	}
	
});

var server = tls.createServer(mqoptions, aedesinst.handle);
server.listen(mqport, function () {
  console.log('server listening on port', mqport)
})




