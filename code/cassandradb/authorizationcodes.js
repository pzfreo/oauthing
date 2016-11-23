var db = require('./db.js');
var cl = db.client;
var ks = db.keyspace;

const createQuery = 'CREATE TABLE IF NOT EXISTS '+ks+'.authcodes '+
					'( code text,  client_id text , '+  
					'redirect_uri text, user_id text, scope text, PRIMARY KEY (code)); ';
					
exports.create = function (done) {			
	 cl.execute(createQuery, [], {prepare:true}, function (err, result) {
		 if (err) throw err;
		 return done();
	 });
};
// var crypto = require('crypto');

const insertQuery = 'INSERT INTO authcodes '+
					'(code, client_id, redirect_uri, user_id, scope) '+
					'VALUES (?,?,?,?,?)';

const findQuery = 'SELECT * FROM authcodes WHERE code=?';

const deleteQuery =  ' DELETE FROM authcodes WHERE code=?';

	
	

exports.save = function(code, client_id, redirect_uri, user_id, scope, done) {
// 	console.log("saving code scope", scope);
	cl.execute(insertQuery, [code, client_id, redirect_uri, user_id, scope], { prepare: true }, function(err) {
		if (err) {
			done(err)
		} else {
			done(null);
		}
	});
};



exports.find = function(code, done) {
	cl.execute(findQuery, [code], { prepare: true }, function(err, result) {
		if (err) {
			done(err, null);
		} else
		if (result.rows[0]==null) 
		{
			done(null,null);
		} else {
			res = result.rows[0];
// 			 console.log("retrieving code scope", res.scope);
			 done (null, {
				code: code,
				clientID: res.client_id,
				redirectURI: res.redirect_uri,
				userID: res.user_id,
				scope: res.scope
			});
		}
    });
};

exports.delete = function(code, done) {
	cl.execute(deleteQuery, [code], { prepare: true }, function(err, result) {
		done(err, result);
		});
		};
		

