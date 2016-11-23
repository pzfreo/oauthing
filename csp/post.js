var https = require('https');

exports.post = function (options, body, callback) {

   var req = https.request(options, (res) => {
	 console.log(`STATUS: ${res.statusCode}`);
	 console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
	 res.setEncoding('utf8');
	 var body = "";
	 res.on('data', (chunk) => {
	   console.log("CHUNK: ", chunk);
	   body += chunk;
	 });
	 res.on('end', () => {
		return callback(null, body);
	 });
   });

   req.on('error', (e) => {
	 console.log(`problem with request: ${e.message}`);
	 return callback(e, null);
   });

	console.log(req);

   // write data to request body
   req.write(body);
   req.end();
};