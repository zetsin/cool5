var config = require('./config')
var net = require('net')
var log = require('./log')
var gpp = require('./gpp')
var router = require('./router')

var server = null
var next_tunnel_id = 1
var alive_tunnel_list = []

exports.start = function() {

	server = net.createServer()
    //var intv = null

	server.on('listening', function() {
	    log.info('[tcp_station] server listening ip=${address}, port=${port}', server.address())
        // 每隔一段时间自动清理无效 tunnel
        //intv = setInterval(clear_dead_tunnel, 10 * 1000)
	})

	server.on('connection', function (client) {
	    log.info('[tcp_station] server connection from ip=${remoteAddress}, port=${remotePort}', client)
	    var tunnel = new Tunnel(client, on_tunnel_close)
        alive_tunnel_list.push(tunnel)
	})

	server.on('error', function (err) {
	    log.error('[tcp_station] server error ${0}', [err.toString()])
	})

	server.on('close', function () {
	    log.info('[tcp_station] server close')
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
    this.parser = new gpp.HeaderParser()
    this.left_socket_data_handler = this.on_left_socket_data_parse_header // 从解析 header 开始

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
    this.parser = null
    // 通知外部订阅者
    this.on_close_listener(this)
}

Tunnel.prototype.on_left_socket_data = function(chunk) {
    log.info('[tcp_station] tunnel[${0}] left data length=${1}', [this.id, chunk.length])
    // 交给当前阶段的处理过程去处理
    if (this.left_socket_data_handler) {
        this.left_socket_data_handler(chunk)
    }
    // else {
    //     // 丢掉 chunk，忽略
    //     log.info('[tcp_station] tunnel[${0}] left data length=${1} dropped cause no handler', [this.id, chunk.length])
    // }
}

Tunnel.prototype.on_left_socket_data_parse_header = function(chunk) {
    var parser = this.parser
    var from_ip = this.left_socket.remoteAddress
    var from_port = this.left_socket.remotePort

    // 继续吃 chunk 来解析
    parser.eat(chunk)

    // 完成了？
    if (!parser.is_finished()) {
        // 还是没完成
        // 没关系，等待下一个数据块
        return
    }

    // 完成但却失败了？
    if (!parser.is_successful()) {
        // 头部错误，强行断开连接
        log.info('[tcp_station] tunnel[${0}] left header parsed failed', [this.id])
        this.left_socket.destroy()
        // 没有后续的处理流程了
        this.left_socket_data_handler = null
        return
    }

    // 头部解析完成了
    var header = parser.get_header()
    log.info('[tcp_station] tunnel[${0}] left header parsed ${1|json}', [this.id, header])
    // 不过我们得问问 router 该转发到哪里
    var r = router.select_route_for('gpptcp', from_ip, from_port, header)
    // 检查返回的 protocol 莫返回个不支持的幺蛾子
    if (r.protocol !== 'gpptcp' && r.protocol !== 'tcp') {
        throw new Error('invalid protocol: ' + r.protocol)
    }
    // 连接远端
    this.create_right_socket(r.remote_host, r.remote_port)
    // 如果是 gpptcp 协议我们需要发个 header 过去
    if (r.protocol === 'gpptcp') {
        var header_chunk = gpp.array_to_header_chunk([{PV: 1}, {IP: header.ip}, {PORT: header.port}])
        this.right_socket.write(header_chunk)
    }
    // 如果有尾块，要记得发送
    if (parser.exists_tail_chunk()) {
        this.right_socket.write(parser.get_tail_chunk())
    }
    // 设置后续处理流程，不管 gpptcp 还是 tcp 都一样
    // 不再对数据进行处理
    this.left_socket_data_handler = null
    // 左右开始相互 pipe
    this.left_socket.pipe(this.right_socket)
    this.right_socket.pipe(this.left_socket)
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
}