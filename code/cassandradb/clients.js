
var db = require('./db.js');
var cl = db.client;
var ks = db.keyspace;

const createQuery = 'CREATE TABLE IF NOT EXISTS '+ks+'.clients '+
					'( client_id text PRIMARY KEY,  client_name text, '+  
					'client_secret_hash text, iterations int, salt text );';
					
exports.create = function (done) {cl.execute(createQuery, [], {prepare:true}, function (err, result) {
	if (err) throw err;
	return done();
	});
};

var crypto = require('crypto');

const insertQuery = 'INSERT INTO CLIENTS '+
					'(client_id, client_secret_hash, client_name, salt, iterations) '+
					'VALUES (?,?,?,?,?);'

const findQuery = 'SELECT client_id, client_secret_hash, client_name, salt, iterations from clients where client_id = ?';




exports.findByClientId = function(id, done) {
// 	console.log ("clients.fbci" + id);
	cl.execute(findQuery, [id], { prepare: true }, function(err, result) {
// 		console.log(result);
		if (err) done(err, null);
		else 
		{
			if (!result.rows[0]) return null;
			res = result.rows[0];
			var c = { id: res.client_id, clientId : res.client_id, name : res.client_name}; //, scope : "offline_access" };
//			console.log(c);
			return done (null, c);
		}
    });
  
};

exports.find = exports.findByClientId;

exports.validateSecret = function(id, secret, done) {
// 	console.log("validateSecret");
// 	console.log(id + " : " + secret);
	cl.execute(findQuery, [id], { prepare: true }, function(err, result) {
		if (err) return done(err, null);
		var client = result.rows[0];
		if (!client) return done(null, false);

	   pk = "";
	   crypto.pbkdf2(secret, client.salt, client.iterations, 512, 'sha512', (err, key) => {
			if (err) return  done(err, null);
			pk = key.toString('hex');
			if (pk == client.client_secret_hash) {
				var c = { id: client.client_id, clientId: client.client_id, name: client.client_name};
// 				console.log("success validation ");
// 				console.log(c);
				return done(null,c);
			}
			return done(null, false);
		});
	});
}
	
	
exports.save = function(id, name, secret, salt, iterations, done) {

	pk = "";
	crypto.pbkdf2(secret, salt, iterations, 512, 'sha512', (err, key) => {
		 if (err) throw err;
		 pk = key.toString('hex');
		 var params = [id, pk, name, salt, iterations];
		 //Set the prepare flag in the query options
		 cl.execute(insertQuery, params, { prepare: true }, function(err) {
			 if (err) {
				 done(err)
			 } else {
				 done();
			 }
		 });
	 });
};
