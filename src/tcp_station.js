var config = require('./config')
var net = require('net')
var log = require('./log')
var gpp = require('./gpp')

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
	var queue = {
		left_to_right: [],
		right_to_left: []
	}

	log.info('[tcp_station] tunnel[${0}] created, tcp_no_delay=${1}', [id, config.get('optimize.tcp_no_delay')])
    left_socket.setNoDelay(config.get('optimize.tcp_no_delay'))

    // 根据当前 config 里的 mode 不同，我们将采用不同的
    // 代理流程
    if (config.get('mode') === 'gpp_to_tcpudp') {
    	context = {
    		parser: new gpp.HeaderParser()
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
    	log.info('[tcp_station] tunnel[${0}] left error ${1}', [id, err.toString()])
    })

    left_socket.on('close', function() {
    	log.info('[tcp_station] tunnel[${0}] left close', [id])
    	if (right_socket) {
    		right_socket.end()
    	}
    })

    // 在 gpp_to_tcpudp 模式下使用这个函数来处理
    function gpp_to_tcpudp_data_handler(chunk) {
    	log.info('[tcp_station] tunnel[${0}] left data length=${1}', [id, chunk.length])
    	//console.log(chunk.toString('utf8'))
    	var parser = context.parser
    	// 头部解析还没完成吗？
    	if (!parser.is_finished()) {
    		// 是的，继续吃 chunk 来解析
    		parser.eat(chunk)
    		// 完成了？
    		if (parser.is_finished()) {
    			// 成功了？
    			if (parser.is_successful()) {
    				var header = parser.get_header()
    				// 可以进行代理中转了
			    	log.info('[tcp_station] tunnel[${0}] left header parsed ${1|json}', [id, header])
			    	create_right_socket(header)
			    	// 如果有余块，要记得发送
			    	if (parser.exists_tail_chunk()) {
				    	//console.log('<tail>' + parser.get_tail_chunk().toString('utf8'))
			    		queue.left_to_right.push(parser.get_tail_chunk())
			    	}
    			}
    			else {
    				// 头部错误，强行断开连接
			    	log.info('[tcp_station] tunnel[${0}] left header parsed failed', [id])
			    	left_socket.destroy()
    			}
    		}
    	}
    	else if (parser.is_successful()) {
    		// 完成了并且已经成功了，那么直接转发数据即可
	    	//console.log('<write>' + chunk.toString('utf8'))
    		queue.left_to_right.push(chunk)
    	}
    	else {
    		// 失败了，但竟然还收到数据？忽略即可
    	}

    	function create_right_socket(header) {
    		// 开始连接
    		right_socket = net.connect(header.port, header.ip)
    		// TODO 设置 tcp_no_delay

    		right_socket.on('connect', function() {
		    	log.info('[tcp_station] tunnel[${0}] right connect', [id])
    		})

    		right_socket.on('drain', function() {
		    	log.info('[tcp_station] tunnel[${0}] right drain', [id])    			
    		})

    		right_socket.on('data', function(chunk) {
		    	log.info('[tcp_station] tunnel[${0}] right data length=${1}', [id, chunk.length])
		    	//console.log(chunk.toString('utf8'))
    			queue.right_to_left.write(chunk)
    		})

    		right_socket.on('error', function(err) {
		    	log.info('[tcp_station] tunnel[${0}] right error ${1}', [id, err.toString()])
    		})

    		right_socket.on('close', function() {
    			log.info('[tcp_station] tunnel[${0}] right close', [id])
    			if (left_socket) {
    				left_socket.end()
    			}
    		})
    	}
    }

    // 在 tcpudp_to_tcpudp 模式下使用这个函数来处理
    function gpp_to_gpp_data_handler(chunk) {
    	log.info('[tcp_station] tunnel[${0}] data length=${1}', [id, chunk.length])
    	// TODO
    }
}