var config = require('./config')

// if auth is not enabled, return ok and forward nothing
if (!config.get('auth.enabled')) {
	exports.exec = function(header) {
		return {
			ok: true,
			forward: null
		}
	}
}
else if (config.get('auth.mode') === '') {


}


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
	if (config.get('auth.forward')) {
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