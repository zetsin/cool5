var config = require('./config')
var net = require('net')
var log = require('./log')

exports.start = function() {

	var server = net.createServer()

	server.on('listening', function() {
	    log.info('[tcp_station] server.listening ip=${address}, port=${port}', server.address())
	})

	server.on('connection', function (client) {
	    log.info('[tcp_station] server.connection ip=${remoteAddress}, port=${remotePort}', client)
	    client.setNoDelay(config.get('optimize.tcp_no_delay'))
	})

	server.on('error', function (err) {
	    log.error('[tcp_station] server.error ${syscall} ${errno}', err)
	})

	server.on('close', function () {
	    log.info('[tcp_station] server.close')
	})

	server.listen(config.get("local.tcp.port"), config.get("local.tcp.host"));
	
}
