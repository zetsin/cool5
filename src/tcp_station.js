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
    // 创建 tunnel 并加入列表
    var tunnel = {
    	id: next_tunnel_id++,
    	left_socket: left_socket,
    	right_socket: null,
    	context: null
    }

    var t = tunnel

	log.info('[tcp_station] tunnel[${0}] created, tcp_no_delay=${1}', [t.id, config.get('optimize.tcp_no_delay')])
    //t.left_socket.setNoDelay(config.get('optimize.tcp_no_delay'))

    // 根据当前 config 里的 mode 不同，我们将采用不同的
    // 代理流程
    if (config.get('mode') === 'gpp_to_tcpudp') {
    	t.context = {
    		parser: new gpp.HeaderParser()
    	}
    	t.left_socket.on('data', gpp_to_tcpudp_data_handler)
    }
    else if (config.get('mode') === 'gpp_to_gpp') {
    	throw new Error('TODO')
    }
    else {
    	throw new Error('Unknown mode')
    }

    t.left_socket.on('error', function(err) {
    	log.info('[tcp_station] tunnel[${0}] left error ${1}', [t.id, err.toString()])
        // error 之后将会引发 close 事件
    })

    t.left_socket.on('close', function() {
    	log.info('[tcp_station] tunnel[${0}] left close', [t.id])
        t.left_socket = null
    	if (t.right_socket) {
    		t.right_socket.end()
    	}
    })

    // 在 gpp_to_tcpudp 模式下使用这个函数来处理
    function gpp_to_tcpudp_data_handler(chunk) {
    	log.info('[tcp_station] tunnel[${0}] left data length=${1}', [t.id, chunk.length])
    	//console.log(chunk.toString('hex'))
    	var parser = t.context.parser
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
			    	log.info('[tcp_station] tunnel[${0}] left header parsed ${1|json}', [t.id, header])
			    	create_right_socket(header)
			    	// 如果有余块，要记得发送
			    	if (parser.exists_tail_chunk()) {
			    		deliver_chunk(parser.get_tail_chunk(), t.left_socket, t.right_socket)
			    	}
    			}
    			else {
    				// 头部错误，强行断开连接
			    	log.info('[tcp_station] tunnel[${0}] left header parsed failed', [t.id])
			    	t.left_socket.destroy()
    			}
    		}
    	}
    	else if (parser.is_successful()) {
    		// 完成了并且已经成功了，那么直接转发数据即可
    		deliver_chunk(chunk, t.left_socket, t.right_socket)
    	}
    	else {
    		// 失败了，但竟然还收到数据？忽略即可
    	}

    	function create_right_socket(header) {
    		// 开始连接
            t.right_socket = net.connect(header.port, header.ip)
            //t.right_socket = net.connect(80, 'localhost')
    		// TODO 设置 tcp_no_delay

    		t.right_socket.on('connect', function() {
		    	log.info('[tcp_station] tunnel[${0}] right connect', [t.id])
    		})

    		t.right_socket.on('data', function(chunk) {
		    	log.info('[tcp_station] tunnel[${0}] right data length=${1}', [t.id, chunk.length])
    			deliver_chunk(chunk, t.right_socket, t.left_socket)
    		})

    		t.right_socket.on('error', function(err) {
		    	log.info('[tcp_station] tunnel[${0}] right error ${1}', [t.id, err.toString()])
                // error 之后将引发 close 事件
    		})

    		t.right_socket.on('close', function() {
    			log.info('[tcp_station] tunnel[${0}] right close', [t.id])
                t.right_socket = null
    			if (t.left_socket) {
    				t.left_socket.end()
    			}
    		})
    	}

        function deliver_chunk(chunk, from_socket, to_socket) {
            // 因为资源释放的关系，to_socket 可能为 null
            // 但是 from_socket 在此刻是不可能为 null 的
            if (!to_socket) {
                return
            }

            if (!to_socket.write(chunk)) {
                from_socket.pause()
                to_socket.once('drain', function() {
                    from_socket.resume()
                })
            }
        }
    }

    // 在 tcpudp_to_tcpudp 模式下使用这个函数来处理
    function gpp_to_gpp_data_handler(chunk) {
    	log.info('[tcp_station] tunnel[${0}] data length=${1}', [t.id, chunk.length])
    	// TODO
    }
}