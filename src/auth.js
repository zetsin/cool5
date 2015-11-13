var config = require('./config')

// return: {ok: <boolean>, forward: <gpp-header>}
exports.exec = function(header) {

	var ok = false
	if (!config.get('auth.verify')) {
		ok = true
	}
	else {
		// TODO
		ok = false
	}

	var forward = null
	if (ok && config.get('auth.forward')) {
		forward = {
			auth: header.auth
		}
	}

	var ret = {
		ok: ok,
		forward: forward
	}

	log.info('[auth] ok=${ok}, forward=${forward|json}', ret)

	return ret
}