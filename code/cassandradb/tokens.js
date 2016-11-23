var db = require('./db.js');
cl = db.client;


const createQuery = 'CREATE TABLE IF NOT EXISTS oauthing.bearers '+
					'( bearer text PRIMARY KEY,'+
					'  client_id text, '+ 
					'  user_id text, '+ 
					'  scope text,'+
					'  expiry timestamp)';
					
cl.execute(createQuery, [], {prepare:true}, function (err, result) {
	if (err) throw err;
});

// var crypto = require('crypto');

const insertQuery = 'INSERT INTO authcodes '+
					'(code, client_id, redirect_uri, user_id) '+
					'VALUES (?,?,?,?)';

const findQuery = 'SELECT * FROM authcodes WHERE code=?';

	
exports.add = function(code, client_id, redirect_uri, user_id,  done) {
	cl.execute(insertQuery, [code, client_id, redirect_uri, user_id], { prepare: true }, function(err) {
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
			 done (null, {
				code: code,
				client_id: res.client_id,
				redirect_uri: res.redirect_uri,
				user_id: res.user_id
			});
		}
    });
};

