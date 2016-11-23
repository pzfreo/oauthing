var db = require('./db.js');
var cl = db.client;
var ks = db.keyspace;

var bs58 = require('base-58');
var crypto = require('crypto');

const createQuery1 = 'CREATE TABLE IF NOT EXISTS '+ks+'.users '+
					'( uid text,  '+  
					'server_hash_id text, '+
					'PRIMARY KEY (server_hash_id));';

const createQuery2 = 'CREATE TABLE IF NOT EXISTS '+ks+'.users_reverse '+
					'( uid text,  '+  
					'server_hash_id text, '+
					'PRIMARY KEY (uid));';
					

exports.create = function (done) {			
	 cl.execute(createQuery1, [], {prepare:true}, function (err, result) {
		 if (err) throw err;
		 cl.execute(createQuery2, [], {prepare:true}, function (err, result) {
			if (err) throw err;
			return (done());
		});

	 });
};
					

const insertQuery = 'INSERT INTO USERS '+
					'(uid, server_hash_id) '+
					'VALUES (?,?);'
					
const insertQuery2 = 'INSERT INTO USERS_REVERSE '+
					'(uid, server_hash_id) '+
					'VALUES (?,?);'
					

const findQuery = 'SELECT uid, server_hash_id from users where server_hash_id = ?';
const findQuery2 = 'SELECT uid, server_hash_id from users_reverse where uid = ?';




findByServerID = function(server_id, provider,  done) {
	 var server_hash_id = hash(server_id, provider);
// 	 console.log(server_hash_id);
	 cl.execute(findQuery, [server_hash_id], { prepare: true }, function(err, result) {
		if (err) return done(err, null);
		else {
			res = result.rows[0];
			if (!res) return done (null, null);		
			user = { id: res.uid, name: res.server_hash_id };
			return done (null, user);
		}
     });
};

exports.findByServerID = findByServerID;

exports.find = function(id, done) {
	 cl.execute(findQuery2, [id], { prepare: true }, function(err, result) {
		if (err) return done(err, null);
		else {
			res = result.rows[0];
			if (!res) return done (null, null);		
			user = { id: res.uid, name: res.server_hash_id };
			return done (null, user);
		}
     });
};
	
exports.findOrCreate = function(id, provider, done) {
	findByServerID(id, provider, function (err, user) {
		if (err) return done(err,null);
		if (user) return done(null, user);
		// no user found
		local_id = randomid();
		server_hash_id = hash(id, provider);
// 		console.log(server_hash_id);
		
		cl.execute(insertQuery, [local_id,server_hash_id], { prepare: true }, function(err) {
			if (err) {
				return done(err, null);
			} else {
				cl.execute(insertQuery2, [local_id,server_hash_id], { prepare: true }, function(err) {
					if (err) return done(err, null);
					return done(null, { id: local_id, name: server_hash_id });
				});
			}
		});
	});
};

hash = function(id, provider) {
	var hsh = crypto.createHash('sha256');
	hsh.update(provider+'/'+id);
  	var h = bs58.encode(hsh.digest());
  	if (h.startsWith('B58')) {
		// no f***ing clue where this comes from.... its not there in the randomid below
  		return(h.substr(3));
  	}
  	return h;
}

exports.hash = hash;

randomid = function() {
	return bs58.encode(crypto.randomBytes(20)).substr(0,20); // 20 byte random id
}
