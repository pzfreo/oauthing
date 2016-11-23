var db = require('./db.js');
var cl = db.client;
var ks = db.keyspace;

const EXPIRY_TIME = 5*60; // 5 minutes

const createQuery = 'CREATE TABLE IF NOT EXISTS '+ks+'.accesstokens '+
					'( bearer text PRIMARY KEY,'+
					'  client_id text, '+ 
					'  user_id text, '+ 
					'  scope text,'+
					'  expiry timestamp)';

exports.create = function (done) {			
	 cl.execute(createQuery, [], {prepare:true}, function (err, result) {
		 if (err) throw err;
		 return done();
	 });
};

// I guess we could rely on cassandra to do our token expiry but instead I've built
// in expiry and then cassandra is only used for cleanup.



// var crypto = require('crypto');

const insertQuery = 'INSERT INTO accesstokens '+
					'(bearer, client_id, user_id, scope, expiry) '+
					'VALUES (?,?,?,?,?) USING TTL ?';

const findQuery = 'SELECT * FROM accesstokens WHERE bearer=?';

exports.save = function(bearer, expiry,  user_id, client_id, scope, done) {
// 	console.log("savinf scope to accesstokens", scope);
	var seconds_to_expiry = (expiry - Date.now())/1000;
	
	// use cassandra ttl to kill these 60 seconds after dead
	cl.execute(insertQuery, [bearer, client_id, user_id, scope, expiry, (seconds_to_expiry+60) ], { prepare: true }, function(err) {
		if (err) {
			console.log(err);
			return done(err);
		} else {
			return done(null);
		}
	});
};

exports.removeExpired = function (done) {
	// nothing to do
	return done();
}



exports.find = function(bearer, done) {
	cl.execute(findQuery, [bearer], { prepare: true }, function(err, result) {
		if (err) {
			return done(err, null);
		} else
		if (result.rows[0]==null) 
		{
			return done(null,null);
		} else {
			res = result.rows[0];
			if (res.expiry < Date.now()) {
				return done(null, null); // timedout
			} else {
// 				console.log("retrieving scope from access tokens", res.scope);	
				return done (null, {
					bearer: bearer,
					clientID: res.client_id,
					userID: res.user_id,
					scope: res.scope,
					expirationDate: res.expiry
				});
					
			}
		}
    });
};


