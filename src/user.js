var config = require('./config')
var log = require('./log')
var fsync = require('./fsync')

// fsync.add_target('auth', function(input) {
// 	try {
// 		// convert input into another format
// 		// so we can quickly check auth existence later
// 		var output = {}
// 		if (Array.isArray(input.auth_list)) {
// 			input.auth_list.forEach(function(auth) {
// 				if (typeof auth !== 'string' || auth.length < 1) {
// 					throw new Error('invalid auth value: ' + String(auth))
// 				}
// 				// why prefix? for security reason, don't forget JavaScript object has
// 				// it's own properties already
// 				output['auth_' + auth] = true
// 			})
// 		}
// 		return output
// 	}
// 	catch(err) {
// 		throw new Error('invalid auth data from remote')
// 	}
// })

// return: {ok: <boolean>, forward: <gpp-header>}
exports.exec_auth = function(header) {
	var header_auth = typeof header.auth === 'string' ? header.auth : ''

	var ok = false
	if (!config.get('auth.verify')) {
		ok = true
	}
	else {
		ok = verify_auth(header_auth)
	}

	var forward = null
	if (ok && config.get('auth.forward') && header_auth) {
		forward = {
			auth: header_auth
		}
	}

	var ret = {
		ok: ok,
		forward: forward
	}

	log.info('[user] auth=${0}, ok=${1}, forward=${2|json}', [header_auth, ok, forward])

	return ret
}

function verify_auth(auth) {
	return true
}