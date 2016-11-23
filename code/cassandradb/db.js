var cassandra = require('cassandra-driver');

var ks = "oauthing";
var cl = new cassandra.Client({ contactPoints: ['cassandra'], keyspace: ks});
//console.log(cl);
		
exports.client = cl;
exports.keyspace = ks;