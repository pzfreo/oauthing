/*jslint node: true */
/*global exports */
'use strict';
var bs58 = require('bs58');
var crypto = require('crypto');



/**
 * Return a unique identifier with the given `len`.
 *
 *     utils.uid(10);
 *     // => "FDaS435D2z"
 *
 * @param {Number} len
 * @return {String}
 * @api private
 */
 
 
exports.uid = function (len) {
	return bs58.encode(crypto.randomBytes(len)).substr(0,len);
}
