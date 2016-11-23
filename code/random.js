var bs58 = require('bs58');
var crypto = require('crypto');

exports.getString = function (n) {
	return bs58.encode(crypto.randomBytes(n)).substr(0,n);
}