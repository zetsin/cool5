var config = require('./config')
var net = require('net')
var log = require('./log')
var gpp = require('./gpp')

var next_tunnel_id = 1
var alive_tunnel_list = []

exports.start = function() {

	var server = net.createServer()
    //var intv = null

	server.on('listening', function() {
	    log.info('[tcp_station] server.listening ip=${address}, port=${port}', server.address())
        // 每隔一段时间自动清理无效 tunnel
        //intv = setInterval(clear_dead_tunnel, 10 * 1000)
	})

	server.on('connection', function (client) {
	    log.info('[tcp_station] server.connection ip=${remoteAddress}, port=${remotePort}', client)
	    var tunnel = new Tunnel(client, on_tunnel_close)
        alive_tunnel_list.push(tunnel)
	})

	server.on('error', function (err) {
	    log.error('[tcp_station] server.error ${0}', [err.toString()])
	})

	server.on('close', function () {
	    log.info('[tcp_station] server.close')
        //clearInterval(intv)
	})

	server.listen(config.get("local.tcp.port"), config.get("local.tcp.host"));	
}

function clear_dead_tunnel() {
    var length_before = alive_tunnel_list.length
    alive_tunnel_list = alive_tunnel_list.filter(function(tunnel) {
        var is_dead = tunnel.left_socket_closed && (!tunnel.right_socket || tunnel.right_socket_closed)
        return !is_dead
    })
    var length_after = alive_tunnel_list.length
    log.info('[tcp_station] clear dead tunnel, before ${0} after ${1}', [length_before, length_after])
}

function on_tunnel_close(tunnel) {
    alive_tunnel_list = alive_tunnel_list.filter(function(_tunnel) {
        return _tunnel !== tunnel
    })
    log.info('[tcp_station] tunnel[${0}] close, rest tunnel ${1}', [tunnel.id, alive_tunnel_list.length])
}

// # on_close(tunnel)
function Tunnel(left_socket, on_close_listener) {
    this.id = next_tunnel_id++
    this.left_socket = left_socket
    this.right_socket = null
    this.left_socket_closed = false
    this.right_socket_closed = false
    this.on_close = this.on_close_handler.bind(this)
    this.on_close_listener = on_close_listener

    if (config.get('mode') === 'gpp_to_tcpudp') {
        this.context = {
            parser: new gpp.HeaderParser(),
            handler: this.on_left_socket_data_gpp_to_tcpudp_mode_handler.bind(this)
        }
    }
    else if (config.get('mode') === 'gpp_to_gpp') {
        throw new Error('TODO')
    }
    else {
        throw new Error('Unknown mode')
    }

    log.info('[tcp_station] tunnel[${0}] created, tcp_no_delay=${1}', [this.id, config.get('optimize.tcp_no_delay')])
    if (config.get('optimize.tcp_no_delay') === true) {
        this.left_socket.setNoDelay(true)
    }

    this.left_socket.on('data', this.on_left_socket_data.bind(this))
    this.left_socket.on('error', this.on_left_socket_error.bind(this))
    this.left_socket.on('end', this.on_left_socket_end.bind(this))
    this.left_socket.on('close', this.on_left_socket_close.bind(this))
}

Tunnel.prototype.on_close_handler = function() {
    log.info('[tcp_station] tunnel[${0}] close begin, clear resource', [this.id])
    // 释放资源
    if (this.left_socket) {
        this.left_socket.removeAllListeners()
        this.left_socket = null
    }
    if (this.right_socket) {
        this.right_socket.removeAllListeners()
        this.right_socket = null
    }
    this.context = null
    // 通知外部订阅者
    this.on_close_listener(this)
}

Tunnel.prototype.on_left_socket_data = function(chunk) {
    log.info('[tcp_station] tunnel[${0}] left data length=${1}', [this.id, chunk.length])
    this.context.handler(chunk)
}

Tunnel.prototype.on_left_socket_data_gpp_to_tcpudp_mode_handler = function(chunk) {debugger
    var parser = this.context.parser
    // 头部解析尚未完成吗？
    if (!parser.is_finished()) {
        // 是的，继续吃 chunk 来解析
        parser.eat(chunk)
        // 完成了？
        if (parser.is_finished()) {
            // 成功了？
            if (parser.is_successful()) {
                var header = parser.get_header()
                // 可以进行代理中转了
                log.info('[tcp_station] tunnel[${0}] left header parsed ${1|json}', [this.id, header])
                this.create_right_socket(header.ip, header.port)
                // 如果有尾块，要记得发送
                if (parser.exists_tail_chunk()) {
                    this.right_socket.write(parser.get_tail_chunk())
                }
            }
            // 失败了
            else {
                // 头部错误，强行断开连接
                log.info('[tcp_station] tunnel[${0}] left header parsed failed', [this.id])
                this.left_socket.destroy()
            }    
        }
        // 还是没完成
        else {
            // 没关系，等待下一个数据块
        }
    }
    // 头部解析已经完成了
    // 成功了吗？
    else if (parser.is_successful()) {
        // 是的，直接转发数据即可
        this.right_socket.write(chunk)
    }
    // 失败了，竟然还收到数据？忽略即可
    else {
        // 不需要做什么
    }
}

Tunnel.prototype.on_left_socket_error = function(err) {
    log.info('[tcp_station] tunnel[${0}] left error ${1}', [this.id, err.toString()])
}

Tunnel.prototype.on_left_socket_end = function() {
    log.info('[tcp_station] tunnel[${0}] left end', [this.id])
}

Tunnel.prototype.on_left_socket_close = function() {
    log.info('[tcp_station] tunnel[${0}] left close', [this.id])
    // 把 left_socket 标记为 closed
    this.left_socket_closed = true
    // 如果 right_socket 尚未建立，或者已经关闭
    // 那么我们应当触发 this.on_close 回调
    if (!this.right_socket || this.right_socket_closed) {
        //log.info('[tcp_station] tunnel[${0}] DEBUG-1 this.right_socket=${1} this.right_socket_closed=${2}', [this.id, (this.right_socket && true).toString(), this.right_socket_closed.toString()])
        this.on_close(this)
    }
    else {
        //log.info('[tcp_station] tunnel[${0}] DEBUG-2 this.right_socket=${1} this.right_socket_closed=${2}', [this.id, (this.right_socket && true).toString(), this.right_socket_closed.toString()])
        // 关闭 right_socket
        this.right_socket.end()
    }
}

Tunnel.prototype.create_right_socket = function(host, port) {
    // 开始连接
    this.right_socket = net.connect(port, host)
    if (config.get('optimize.tcp_no_delay') === true) {
        this.right_socket.setNoDelay(true)
    }
    //this.right_socket = net.connect(80)
    // 订阅各个事件
    this.right_socket.on('connect', this.on_right_socket_connect.bind(this))
    this.right_socket.on('data', this.on_right_socket_data.bind(this))
    this.right_socket.on('error', this.on_right_socket_error.bind(this))
    this.right_socket.on('end', this.on_right_socket_end.bind(this))
    this.right_socket.on('close', this.on_right_socket_close.bind(this))
}

Tunnel.prototype.on_right_socket_connect = function() {
    log.info('[tcp_station] tunnel[${0}] right connect', [this.id])
}

Tunnel.prototype.on_right_socket_data = function(chunk) {
    log.info('[tcp_station] tunnel[${0}] right data length=${1}', [this.id, chunk.length])
    // 转发数据
    this.left_socket.write(chunk)
}

Tunnel.prototype.on_right_socket_error = function(err) {
    log.info('[tcp_station] tunnel[${0}] right error ${1}', [this.id, err.toString()])
}

Tunnel.prototype.on_right_socket_end = function() {
    log.info('[tcp_station] tunnel[${0}] right end', [this.id])
}

Tunnel.prototype.on_right_socket_close = function() {
    log.info('[tcp_station] tunnel[${0}] right close', [this.id])
    this.right_socket_closed = true
    // 如果 left_socket 已经关闭
    // 那么我们应当触发 this.on_close 回调
    if (this.left_socket_closed) {
        this.on_close(this)
    }
    else {
        // 关闭 left_socket
        this.left_socket.end()
    }
}