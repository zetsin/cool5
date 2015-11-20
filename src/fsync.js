var config = require('./config')
var log = require('./log')
var assert = require('assert')

// global state
var sync_target_qml = new QuickMapList()

// config parameter
var poll_interval
var poll_url

if (config.get('fsync.enabled')) {
	var mode = config.get('fsync.mode')
	if (mode !== 'poll') {
		// only poll mode is supported yet
		log.error('unknown fsync.mode: ' + mode)
		process.exit(1)
	}

	poll_interval = config.get('fsync.poll.interval')
	// support: second, minute, hour
	// eg.
	// 15.5s
	// 0.75m
	// 3.2h
	if (!/^(\d+(\.\d+)?)[smh]$/i.test(poll_interval)) {
		log.error('invalid fsync.poll_interval: ' + poll_interval)
		process.exit(1)
	}
	poll_interval = parse_interval(poll_interval)

	poll_url = config.get('fsync.poll.url')
	if (typeof poll_url !== 'string') {
		log.error('invalid fsync.poll.url: ' + poll_url)
		process.exit(1)
	}
}

exports.add_target = function(name, url, map_cb) {
	assert(typeof name === 'string' && name.length > 0)
	assert(typeof url === 'string' && url.length > 0)
	assert(typeof map_cb === 'function' || map_cb === undefined || map_cb === null)

	if (sync_target_qml.exists(name)) {
		return false
	}
	else {
		var sync_target = new SyncTarget(name, url, map_cb)
		sync_target_qml.add(name, sync_target)
		sync_target.start()
		return true
	}
}

exports.remove_target = function(name) {
	assert(typeof name === 'string' && name.length > 0)
	if (!sync_target_qml.exists(name)) {
		return false
	}
	else {
		var sync_target = sync_target_qml.retrieve(name)
		sync_target.stop()
		sync_target_qml.remove(name)
		return true
	}
}

exports.get = function(name) {
	assert(typeof name === 'string' && name.length > 0)
	var ret = null
	if (sync_target_qml.exists(name)) {
		ret = sync_target_qml.retrieve(name).get_value_mapped()
	}
	return ret
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

// QuickMapList Class

function QuickMapList() {
	this.list = []
	this.map = {}
}

QuickMapList.prototype.add = function(name, value) {
	assert(typeof name === 'string')
	var key = 'qm:' + name
	var item = {
		name: name,
		value: value
	}
	this.list.push(item)
	this.map[key] = item
}

QuickMapList.prototype.remove = function(name) {
	assert(typeof name === 'string')
	var key = 'qm:' + name
	var item = this.map[key]
	if (!item) return
	delete this.map[key]
	this.list = this.list.filter(function(_item) {
		return _item !== item
	})
}

QuickMapList.prototype.exists = function(name) {
	assert(typeof name === 'string')
	var key = 'qm:' + name
	return this.map.hasOwnProperty(key)	
}

QuickMapList.prototype.retrieve = function(name) {
	assert(typeof name === 'string')
	var key = 'qm:' + name
	var item = this.map[key]
	if (!item) {
		return undefined
	}
	else {
		return item.value
	}
}

// SyncTarget Class

function SyncTarget(name, url, map_cb) {
	this.name = name
	this.url = url
	this.map_cb = map_cb || function() {}
	this.value = null
	this.value_mapped = null
	// copy from global...
	this.interval = poll_interval
	// stop hook
	this._stop_imp = null
}

SyncTarget.prototype.start = function() {
	try {
		this.value_mapped = this.map_cb({
			auth_verify: true,
			user_list: [{auth: '42143f31d43937e01b6fdb665c31a666'}]
		})
	}
	catch(err) {
		log.warning('[fsync] map function exception: ' + err.message)
	}
}

SyncTarget.prototype.stop = function() {

}

SyncTarget.prototype.get_value_mapped = function() {
	return this.value_mapped
}