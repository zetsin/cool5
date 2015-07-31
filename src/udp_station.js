var config = require('./config')
var dgram = require('dgram')
var log = require('./log')
var gpp = require('./gpp')

var server = null
var shadow_socket_map = {}
var next_shadow_socket_id = 1

exports.start = function() {
	var host = config.get('local.udp.host')
	var port = config.get('local.udp.port')
	server = dgram.createSocket('udp4')
	server.bind(port, host)
	
	server.on('listening', function() {
	    log.info('[udp_station] server listening ip=${address}, port=${port}', server.address())
	})

	server.on('error', function(err) {
	    log.error('[udp_station] server error ${0}', [err.toString()])
	})

	server.on('close', function() {
	    log.info('[udp_station] server close')
	})

	server.on('message', function(message, rinfo) {
		// 解析头部
		var parser = new gpp.HeaderParser()
		parser.eat(message)
		if (!parser.is_finished() || !parser.is_successful()) {
			// 解析失败，输出警告信息
			log.warning('[udp_station] server message length=${0} from ip=${1}, port=${2} header parsed failed, content=${3}', [message.length, rinfo.address, rinfo.port, message.toString('hex')])
		}
		else {
			// 解析成功
			var header = parser.get_header()
			var message_without_header = parser.exists_tail_chunk() ? parser.get_tail_chunk() : new Buffer(0)
			log.info('[udp_station] server message length=${0} from ip=${1}, port=${2} header parsed ${3|json}', [message.length, rinfo.address, rinfo.port, header])
			// 我们需要一个 shadow_socket 来完成数据转发
			var shadow_socket = find_or_create_shadow_socket_for(rinfo.address, rinfo.port)
			shadow_socket.forward(message_without_header, header.ip, header.port)
		}
	})
}

// 尝试从 shadow_socket_map 中找到与 ip 和 port 匹配的 shadow_socket
// 如果找不到，就创建一个，并把它加入到 shadow_socket_map 中
function find_or_create_shadow_socket_for(ip, port) {
	var key = ip + ' ' + port
	var shadow_socket = shadow_socket_map[key]
	if (!shadow_socket) {
		shadow_socket = new ShadowSocket(ip, port)
		shadow_socket_map[key] = shadow_socket
	}
	return shadow_socket
}

function ShadowSocket(ip, port) {debugger
	this.id = next_shadow_socket_id++
	log.info('[udp_station] shadow_socket[${0}] created', [this.id])

	this.ip = ip
	this.port = port
	this.socket = dgram.createSocket('udp4')
	this.socket.on('listening', this.on_listening.bind(this))
	this.socket.on('message', this.on_message.bind(this))
	this.socket.on('error', this.on_error.bind(this))
	this.socket.on('close', this.on_close.bind(this))
	this.next_forward_id = 1
	this.next_backward_id = 1
}

ShadowSocket.prototype.forward = function(chunk, to_ip, to_port) {
	var self = this
	var forward_id = self.next_forward_id++
	// 第一次调用时将会自动绑定到 0.0.0.0 的一个随机端口
	log.info('[udp_station] shadow_socket[${0}] forward[${1}] begin length=${2} to ip=${3}, port=${4}', [self.id, forward_id, chunk.length, to_ip, to_port])
	this.socket.send(chunk, 0, chunk.length, to_port, to_ip, function(err) {
		if (err) {
			log.warning('[udp_station] shadow_socket[${0}] forward[${1}] failed length=${2} to ip=${3}, port=${4} ${5}', [self.id, forward_id, chunk.length, to_ip, to_port, err.toString()])
		}
		else {
			log.info('[udp_station] shadow_socket[${0}] forward[${1}] ok length=${2} to ip=${3}, port=${4}', [self.id, forward_id, chunk.length, to_ip, to_port])
		}
	})
}

ShadowSocket.prototype.on_listening = function() {
	var ip = this.socket.address().address
	var port = this.socket.address().port
	log.info('[udp_station] shadow_socket[${0}] listening ip=${1}, port=${2}', [this.id, ip, port])
}

ShadowSocket.prototype.on_message = function(chunk, rinfo) {
	var self = this
	var backward_id = self.next_backward_id++
	log.info('[udp_station] shadow_socket[${0}] message length=${1} from ip=${2}, port=${3}', [self.id, chunk.length, rinfo.address, rinfo.port])
	// 回发要使用全局的 server 套接字来完成
	log.info('[udp_station] shadow_socket[${0}] backward[${1}] begin length=${2} to ip=${3}, port=${4}', [self.id, backward_id, chunk.length, self.ip, self.port])
	debugger
	server.send(chunk, 0, chunk.length, self.port, self.ip, function(err) {
		if (err) {
			log.warning('[udp_station] shadow_socket[${0}] backward[${1}] failed length=${2} to ip=${3}, port=${4} ${5}', [self.id, backward_id, chunk.length, self.ip, self.port, err.toString()])
		}
		else {
			log.info('[udp_station] shadow_socket[${0}] backward[${1}] ok length=${2} to ip=${3}, port=${4}', [self.id, backward_id, chunk.length, self.ip, self.port])
		}
	})
}

ShadowSocket.prototype.on_error = function(err) {
    log.warning('[udp_station] shadow_socket[${0}] error ${1}', [this.id, err.toString()])	
}

ShadowSocket.prototype.on_close = function() {
	log.info('[udp_station] shadow_socket[${0}] close', [this.id])
}