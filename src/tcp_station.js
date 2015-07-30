var config = require('./config')
var net = require('net')
var log = require('./log')

var next_tunnel_id = 1

exports.start = function() {

	var server = net.createServer()

	server.on('listening', function() {
	    log.info('[tcp_station] server.listening ip=${address}, port=${port}', server.address())
	})

	server.on('connection', function (client) {
	    log.info('[tcp_station] server.connection ip=${remoteAddress}, port=${remotePort}', client)
	    create_tunnel(client)
	})

	server.on('error', function (err) {
	    log.error('[tcp_station] server.error ${0}', [err.toString()])
	})

	server.on('close', function () {
	    log.info('[tcp_station] server.close')
	})

	server.listen(config.get("local.tcp.port"), config.get("local.tcp.host"));
	
}

function create_tunnel(left_socket) {
	var id = next_tunnel_id++
	var left_socket = left_socket
	var right_socket = null
	var context = null

	log.info('[tcp_station] tunnel[${0}] created, tcp_no_delay=${1}', [id, config.get('optimize.tcp_no_delay')])
    left_socket.setNoDelay(config.get('optimize.tcp_no_delay'))

    // 根据当前 config 里的 mode 不同，我们将采用不同的
    // 代理流程
    if (config.get('mode') === 'gpp_to_tcpudp') {
    	context = {
    		status: 0,			// 0 头部尚未解析，1 头部正在解析中，2 头部已经成功解析，-1 头部解析失败
    		header: null,
    		header_chunk: null
    	}
    	left_socket.on('data', gpp_to_tcpudp_data_handler)
    }
    else if (config.get('mode') === 'gpp_to_gpp') {
    	throw new Error('TODO')
    }
    else {
    	throw new Error('Unknown mode')
    }

    left_socket.on('error', function(err) {
    	log.info('[tcp_station] tunnel[${0}] error ${1}', [id, err.toString()])
    })

    left_socket.on('close', function() {
    	log.info('[tcp_station] tunnel[${0}] close', [id])
    })

    // 在 gpp_to_tcpudp 模式下使用这个函数来处理
    function gpp_to_tcpudp_data_handler(chunk) {
    	log.info('[tcp_station] tunnel[${0}] data length=${1}', [id, chunk.length])
    	// 第一块数据？
    	if () {

    	}
    }

    // 在 tcpudp_to_tcpudp 模式下使用这个函数来处理
    function gpp_to_gpp_data_handler(chunk) {
    	log.info('[tcp_station] tunnel[${0}] data length=${1}', [id, chunk.length])
    	// TODO
    }
}