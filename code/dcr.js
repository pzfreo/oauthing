var crypto = require('crypto');
var clients = require('./cassandradb/clients.js');
var random = require('./random.js');

// Express configuration
  

exports.registration = function (req, res) {
// 	console.log("DCR: ",req.body);
   if (!req.body) return res.sendStatus(400);
   if (!req.body.redirect_uris) return res.sendStatus(400);
   if (!req.body.client_name) return res.sendStatus(400);
   

   
   var redirect_uris = req.body.redirect_uris;
   var client_name = req.body.client_name;
   var token_endpoint_auth_method = "client_secret_basic"
   if (req.body.token_endpoint_auth_method) {
   	 	token_endpoint_auth_method = req.body.token_endpoint_auth_method;
   	 	// TODO need to validate this is a valid supplied method
	}
   grant_types = ["authorization_code", "refresh_token"]; // only ones we support
   client_id = random.getString(20); // 20 bytes on the thing should be fine
   client_secret = random.getString(30); // 30 bytes on the IoT thing should be ok
   salt = random.getString(32); // nice big salt works fine because we don't need the client to store this
   iterations = Math.floor(Math.random() * (10000) + 20000); // iterations between 20k-30k


   clients.save(client_id, client_name, client_secret, salt, iterations, function (err) {
   		if (err) throw err;
   					
		response = {};
		response.client_id = client_id;
		response.client_secret = client_secret;
		response.client_name = client_name;
		response.token_endpoint_auth_method = token_endpoint_auth_method;
		response.grant_types = grant_types;
		response.client_secret_expires_at = 0;
		// todo add client update url + token
		res.status(201).json(response);
			

	});


}
