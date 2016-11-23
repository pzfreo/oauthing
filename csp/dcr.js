// var https = require('https');
var post = require('./post.js');

exports.register = function (options, callback) {



	console.log("register", options);
    data = { redirect_uris: options.redirect_uris, 
    		 client_name: options.client_name, 
    		// token_endpoint_auth_method: "client_secret_post"
           }
    encoded = JSON.stringify(data);

    console.log(encoded);
	
    var post_options = {
        host: options.host,
        port: options.port,
        path: options.path,
        method: 'POST',
        rejectUnauthorized: false,
        requestCert: true,
        agent: false,
        headers: {
            'content-type': 'application/json'
        }
    };
    
    post.post(post_options, encoded, function(e,r) {
    	if (e) return(callback(e,null));
    	var response = JSON.parse(r);
    	return callback(null, response);
    });
}


// 
//     var post_req = https.request(post_options, function(r) {
//         var body = ""
//         r.setEncoding('utf8');
//         r.on('data', function (chunk) {
//         	console.log("data", chunk);
//             body += chunk;
//         });
//         r.on('error', function(err) {
//         	console.log(err);
//         });
//         r.on('end', function() {
//           try {
//             console.log(body);
//             var response = JSON.parse(body);
//           } catch (e) {}
// 
//           if (response) {
//             callback(null,response);
//           }
//           else
//           {
//             callback(new Error('failed to call DCR'), null);
//           }
//         });
// 
//     });
//     // post the data
//     console.log(post_req);
//     post_req.write(encoded);
//     post_req.end();
//     console.log("posted");	
// };
// 
// 
// 
