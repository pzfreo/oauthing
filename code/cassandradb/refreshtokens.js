var db = require('./db.js');
var cl = db.client;
var ks = db.keyspace;

const createQuery = 'CREATE TABLE IF NOT EXISTS '+ks+'.refreshtokens '+
					'( refresh text PRIMARY KEY,'+
					'  client_id text, '+ 
					'  user_id text, '+ 
					'  scope text)';
					

exports.create = function (done) {			
	 cl.execute(createQuery, [], {prepare:true}, function (err, result) {
		 if (err) throw err;
		 return done();
	 });
};					

// I guess we could rely on cassandra to do our token expiry but instead I've built
// in expiry and then cassandra is only used for cleanup.



// var crypto = require('crypto');

const insertQuery = 'INSERT INTO refreshtokens '+
					'(refresh, client_id, user_id, scope) '+
					'VALUES (?,?,?,?)';

const findQuery = 'SELECT * FROM refreshtokens WHERE refresh=?';

	

exports.save = function(refresh, user_id, client_id, scope, done) {
// 	console.log("scope", scope);
	cl.execute(insertQuery, [refresh, client_id, user_id, scope], { prepare: true }, function(err) {
		if (err) {
			done(err)
		} else {
			done(null);
		}
	});
};

exports.find = function(refresh, done) {
	cl.execute(findQuery, [refresh], { prepare: true }, function(err, result) {
		if (err) {
			done(err, null);
		} else
		if (result.rows[0]==null) 
		{
			done(null,null);
		} else {
			res = result.rows[0];
			if (res.expiry < Date.now()) {
				done(null, null); // timedout
			} else {
// 				console.log("scope",res.scope);
				done (null, {
					refresh: refresh,
					clientID: res.client_id,
					userID: res.user_id,
					scope: res.scope
				});
					
			}
		}
    });
};



