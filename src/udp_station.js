var config = require('./config')
var dgram = require('dgram')
var log = require('./log')
var gpp = require('./gpp')

var server = null

exports.start = function() {
	var host = config.get('local.udp.host')
	var port = config.get('local.udp.port')
	server = dgram.createSocket('udp4')
	server.bind(port, host)
	
	server.on('listening', function() {
	    log.info('[udp_station] server.listening ip=${address}, port=${port}', server.address())
	})

	server.on('error', function(err) {
	    log.error('[udp_station] server.error ${0}', [err.toString()])
	})

	server.on('close', function() {
	    log.info('[udp_station] server.close')
	})

	server.on('message', function(message, rinfo) {
		// 解析头部
		var parser = new gpp.HeaderParser()
		parser.eat(message)
		if (!parser.is_finished() || !parser.is_successful()) {
			// 解析失败，输出警告信息
			log.warning('[udp_station] server.message length=${0} from ip=${1}, port=${2} header parsed failed, content=${3}', [message.length, rinfo.address, rinfo.port, message.toString('hex')])
		}
		else {
			// 解析成功
			var header = parser.get_header()
			log.info('[udp_station] server.message length=${0} from ip=${1}, port=${2} header parsed ${3|json}', [message.length, rinfo.address, rinfo.port, header])
		}
	})
}