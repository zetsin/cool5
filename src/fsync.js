var config = require('./config')
var log = require('./log')

if (!config.get('fsync.enabled')) {
	// not enabled? do nothing
	exports.sync = function(name, change_cb) {}
}
else {
	var mode = config.get('fsync.mode')
	if (mode !== 'poll') {
		// only poll mode is supported yet
		log.error('unknown fsync.mode: ' + mode)
		process.exit(1)
	}

	var poll_interval = config.get('fsync.poll.interval')
	// support: second, minute, hour
	// eg.
	// 15.5s
	// 0.75m
	// 3.2h
	if (!/^\d+(\.\d+)[s|m|h]$/i.test(poll_interval)) {
		log.error('invalid fsync.poll_interval: ' + poll_interval)
		process.exit(1)
	}

	var poll_url
	// TODO
}