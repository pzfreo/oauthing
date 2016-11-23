// implements the OAuth2 introspection API
var tokens = require('./cassandradb/accesstokens.js');


exports.introspection = function (req, res) {
	console.log("introspection");
   if (!req.body) return res.sendStatus(400);
   if (!req.body.token) return res.sendStatus(400);

   var bearer = req.body.token;
// 	console.log("bearer", bearer);

	tokens.find(bearer, function (err, result) {
		if (err || !result) {
			return res.status(200).json({active: false});
		}
		else
		{
			response = {};
			response.active = true;
			response.client_id = result.client_id;
			response.username = result.userID;
			response.scope = result.scope;
			response.exp = Math.floor(result.expirationDate.valueOf() / 1000);
			
			return (res.status(200).json(response));
		}
	});
}
