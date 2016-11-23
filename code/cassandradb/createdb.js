var cassandra = require('cassandra-driver');
var sleep = require('sleep');
var cls = new cassandra.Client({ contactPoints: ['cassandra'], keyspace: 'system'});
var ks = "oauthing";
var query = "CREATE KEYSPACE IF NOT EXISTS "+ks+" WITH replication = { 'class': 'SimpleStrategy', 'replication_factor': 1}"


cls.execute(query, [], {prepare:true}, function (err, result) {

   if (err) throw err;
//   cls.shutdown();
   console.log("creating databases");
	
   users = require('./users');
   clients = require('./clients');
   accessTokens = require('./accesstokens');
   authorizationCodes = require('./authorizationcodes');
   refreshTokens = require('./refreshtokens');


   users.create( function () { 
// 		console.log("users created");
	    clients.create( function () {
//    			console.log("clients create");
    		//clients.save ('abc123', 'Sampler', 'ssh-secret', 'salt', 10000, function() { console.log("added client"); });
	
	 	    accessTokens.create(function () {
	 	    
			   authorizationCodes.create(function () {
				   refreshTokens.create(function () {
   						console.log("finished");
	
					
						process.exit(0);
				});
				});
				});
			});
			});
   
});


