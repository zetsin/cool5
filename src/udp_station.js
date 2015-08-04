var config = require('./config')
var dgram = require('dgram')
var log = require('./log')
var gpp = require('./gpp')
var router = require('./router')

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
			// 我们需要问询 router 应该如何转发这个包
			var r = router.select_route_for('gppudp', rinfo.address, rinfo.port, header)
			// router 可别告诉我一个我不支持的协议，那我就不高兴了
			if (r.protocol !== 'udp' && r.protocol !== 'gppudp') {
				throw new Error('invalid protocol' + r.protocol)
			}
			// 我们需要一个 shadow_socket 来完成数据转发
			var shadow_socket = find_or_create_shadow_socket_for(r.protocol, rinfo.address, rinfo.port)
			shadow_socket.forward(message_without_header, header.ip, header.port)
		}
	})
}

// 尝试从 shadow_socket_map 中找到与 protocol、 ip 和 port 匹配的 shadow_socket
// 如果找不到，就创建一个，并把它加入到 shadow_socket_map 中
// 其中 protocol 可能为 udp 或 gppudp
function find_or_create_shadow_socket_for(protocol, ip, port) {
	var key = protocol + ' ' + ip + ' ' + port
	var shadow_socket = shadow_socket_map[key]
	if (!shadow_socket) {
		shadow_socket = new ShadowSocket(protocol, ip, port)
		shadow_socket_map[key] = shadow_socket
	}
	return shadow_socket
}

function ShadowSocket(protocol, ip, port) {
	this.id = next_shadow_socket_id++
	this.protocol = protocol
	this.ip = ip
	this.port = port
	this.socket = dgram.createSocket('udp4')
	this.socket.on('listening', this.on_listening.bind(this))
	this.socket.on('message', this.on_message.bind(this))
	this.socket.on('error', this.on_error.bind(this))
	this.socket.on('close', this.on_close.bind(this))
	this.next_forward_id = 1
	this.next_backward_id = 1

	this.log_info('created ip=${0}, port=${1}', [this.ip, this.port])
}

ShadowSocket.prototype.log_info = function() {
	var args = [].__proto__.slice.apply(arguments)
	args[0] = '[udp_station] shadow_socket[' + this.id + ']<' + this.protocol + '> ' + args[0]
	this.log('info', args)
}

ShadowSocket.prototype.log_warning = function() {
	var args = [].__proto__.slice.apply(arguments)
	args[0] = '[udp_station] shadow_socket[' + this.id + ']<' + this.protocol + '> ' + args[0]
	this.log('warning', args)
}

ShadowSocket.prototype.log = function(type, args) {
	log[type].apply(log, args)
}

ShadowSocket.prototype.forward = function(chunk, to_ip, to_port) {
	var self = this
	var forward_id = self.next_forward_id++
	// 第一次调用 send 时将会自动绑定到 0.0.0.0 的一个随机端口
	if (self.protocol === 'udp') {
		self.log_info('forward[${0}] begin length=${1} to ip=${2}, port=${3}', [forward_id, chunk.length, to_ip, to_port])
		this.socket.send(chunk, 0, chunk.length, to_port, to_ip, send_cb)
	}
	else if (self.protocol === 'gppudp') {
		// 附加包头
		var header = {pv: 1, ip: to_ip, port: to_port}
		var new_chunk = gpp.prepend_header([{PV: header.pv}, {IP: header.ip}, {PORT: header.port}], chunk)
		self.log_info('forward[${0}] begin length=${1} to ip=${2}, port=${3} with header ${4|json}', [forward_id, chunk.length, to_ip, to_port, header])
		this.socket.send(new_chunk, 0, new_chunk.length, to_port, to_ip, send_cb)
	}
	else {
		throw new Error('stupid programmer')
	}
	
	function send_cb(err) {
		if (err) {
			self.log_warning('forward[${0}] failed ${1}', [forward_id, err.toString()])
		}
		else {
			self.log_info('forward[${0}] ok', [forward_id])
		}
	}
}

ShadowSocket.prototype.on_listening = function() {
	var ip = this.socket.address().address
	var port = this.socket.address().port
	this.log_info('listening ip=${0}, port=${1}', [ip, port])
}

ShadowSocket.prototype.on_message = function(chunk, rinfo) {
	var self = this
	var backward_id = self.next_backward_id++
	var backward_chunk

	self.log_info('message length=${0} from ip=${1}, port=${2}', [chunk.length, rinfo.address, rinfo.port])

	if (self.protocol === 'udp') {
		// 添加头部
		backward_chunk = gpp.prepend_header([{PV: '1'}, {IP: rinfo.address}, {PORT: rinfo.port}], chunk)
	}
	else if (self.protocol === 'gppudp') {
		// 解析头部
		var parser = new gpp.HeaderParser()
		parser.eat(chunk)
		if (!parser.is_finished() || !parser.is_successful()) {
			self.log_warning('header parsed failed, content=${0}', [chunk.toString('hex')])
			// 丢弃包
			return
		}
		var header = parser.get_header()
		self.log_info('header parsed ${0|json}', [header])
		// 获取尾块，这才是真正的数据主体
		var chunk_without_header = parser.exists_tail_chunk() ? parser.get_tail_chunk() : new Buffer(0)
		// 准备回发前要添加头部
		backward_chunk = gpp.prepend_header([{PV: '1'}, {IP: rinfo.address}, {PORT: rinfo.port}], chunk_without_header)
	}
	else {
		throw new Error('stupid programmer')
	}

	// 回发要使用全局的 server 套接字来完成
	self.log_info('backward[${0}] begin length=${1} to ip=${2}, port=${3}', [backward_id, backward_chunk.length, self.ip, self.port])
	server.send(backward_chunk, 0, backward_chunk.length, self.port, self.ip, send_cb)

	function send_cb(err) {
		if (err) {
			self.log_warning('backward[${0}] failed ${1}', [backward_id, err.toString()])
		}
		else {
			self.log_info('backward[${0}] ok', [backward_id])
		}		
	}
}

ShadowSocket.prototype.on_error = function(err) {
    self.log_warning('error ${0}', [err.toString()])	
}

ShadowSocket.prototype.on_close = function() {
	self.log_info('close')
}