
var post = require('./post.js');
var qs = require('querystring');

exports.getToken = function (options, callback) {



    data = { 
			 grant_type: "authorization_code",
             code : options.code,
             client_id : options.cid,
             client_secret : options.cs,
             redirect_uri : options.red_uri
           }
    encoded = qs.stringify(data);

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
            'content-type': 'application/x-www-form-urlencoded'
        }
    };
    
    post.post(post_options, encoded, function(e,r) {
    	if (e) return(callback(e,null));
    	var response = JSON.parse(r);
    	return callback(null, response);
    });
}

