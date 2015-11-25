var config = require('./config')
var log = require('./log')
var fsync = require('./fsync')

var fsync_target_name = 'user'
var online_reporter = new OnlineReporter()
setTimeout(function() {
	online_reporter.start()
}, 0)

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
	if (auth_enabled && ok) {
		online_reporter.add_auth(header_auth)
	}

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

function OnlineReporter() {
	this.enabled = config.get('user.auth.online_report.enabled')
	this.url = config.get('user.auth.online_report.url')
	this.interval = config.get('user.auth.online_report.interval')
	if (this.enabled) {
		this.interval = parse_interval(this.interval)
	}
	this.auth_cache_list = []
}

OnlineReporter.prototype.start = function() {
	var self = this
	if (!self.enabled) return
	var request = require('request')

	do_request()

	function do_request() {
		// 记录下起始时间
		var begin_timestamp = new Date()

		var url = self.url
		var server_id = config.get('id')
		var user_list = make_server_list()

		log.info('[user] online report begin server_id=${0}, user_list=${1|json}, url=${2}', [server_id, user_list, url])

		request({
			method: 'POST',
			uri: url,
			body: {
				server_id: server_id,
				user_list: user_list
			},
			json: true
		}, cb)

		function cb(err, res, body) {
			var end_timestamp = new Date()
			var delta = Math.max(end_timestamp - begin_timestamp, 0)
			var rest_interval = Math.max(self.interval - delta, 0)

			if (err) {
				log.warning('[user] online report end delta=${0}, rest_interval=${1}, failed error=${2}', [delta, rest_interval, err.message])
			}
			else {
				log.info('[user] online report end ok delta=${0}, rest_interval=${1}', [delta, rest_interval])
			}

			setTimeout(do_request, rest_interval)
		}

		function make_server_list() {
			return self.auth_cache_list.map(function(item) {
				return {
					auth: item.auth
				}
			})
		}
	}
}

OnlineReporter.prototype.add_auth = function(auth) {

	for (var i = 0, len = this.auth_cache_list.length; i < len; ++i) {
		var cache_item = this.auth_cache_list[i]
		// 已经存在？更新时间戳即可
		if (cache_item.auth === auth) {
			cache_item.stamp = new Date()
			return
		}
	}

	// 没找到，创建一个新的
	var cache_item = {
		auth: auth,
		stamp: new Date()
	}
	this.auth_cache_list.push(cache_item)
}

function parse_interval(value) {
	var match = /^(\d+(\.\d+)?)([smh])$/i.exec(value)
	if (!match) {
		throw new Error('invalid interval value')
	}
	var num = match[1]
	var postfix = match[3].toLowerCase()

	switch(postfix) {
		case 's':
			return num * 1000
		case 'm':
			return num * 1000 * 60
		case 'h':
			return num * 1000 * 60 * 60
		default:
			throw new Error('invalid state')
	}
}