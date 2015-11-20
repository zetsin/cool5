var config = require('./config')
var log = require('./log')
var fsync = require('./fsync')

var fsync_target_name = 'user'

if (config.get('user.auth.enabled')) {
	var fsync_url = config.get('user.auth.fsync.url')
	if (!fsync_url) {
		log.error('[user] "user.auth.fsync.url" must be provided cause "user.auth.enabled" is true')
		process.exit(1)
	}
	fsync.add_target(fsync_target_name, fsync_url, fsync_map)
}

function fsync_map(input) {
	check_input()
	// add user_by_auth field
	input.user_by_auth = {}
	input.user_list.forEach(function(user) {
		input.user_by_auth[user.auth] = user
	})
	return input

	function check_input() {
		if (typeof input.auth_verify !== 'boolean') {
			throw new Error('[user] invalid data from fsync, "auth_verify" fieled must be boolean, not ' + typeof input.auth_verify)
		}
		if (!Array.isArray(input.user_list)) {
			throw new Error('[user] invalid data from fsync, "user_list" fieled must be array, not ' + typeof input.user_list)
		}
		input.user_list.forEach(function(user) {
			if (typeof user.auth !== 'string') {
				throw new Error('[user] invalid data from fsync, "user_list[i].auth" fieled must be string, not ' + typeof user.auth)
			}
		})
	}
}

// return: {ok: <boolean>, forward: <gpp-header>}
exports.exec_auth = function(header) {
	var header_auth = typeof header.auth === 'string' ? header.auth : ''

	var auth_enabled = config.get('user.auth.enabled')
	var auth_forward = config.get('user.auth.forward')

	// if auth is disabled, we will pass all proxy requests
	var ok = !auth_enabled ? true : verify_auth(header_auth)

	var forward = null
	if (ok && auth_forward && header_auth) {
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
	var data = fsync.get(fsync_target_name)
	if (!data) {
		// not synced yet? pass all temporary
		return true
	}
	else {
		//log.info('[user] data.auth_verify=${0}, auth=${1}, data.user_by_auth[auth]=${2}', [data.auth_verify, auth, data.user_by_auth.hasOwnProperty(auth)])
		if (!data.auth_verify) {
			return true
		}
		else {
			return data.user_by_auth.hasOwnProperty(auth)
		}
	}
}