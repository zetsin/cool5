var config = require('./config')

var data = {
	startDateTime: new Date().toString(),
	// tunnel - {id: '', type: '', createDateTime: '', client: {} || null, server: {} || null}
	// tunnel.type - 'unknown' | 'tcp' | 'udp'
	// tunnel.client - {host: '', port: 123, eventHistory: []}
	// tunnel.client.eventHistory[i] - {type: ''}
	tunnelList: []
}

var obzvr_config = config.get('obzvr')
if (obzvr_config.enabled) {
	var web = require('./obzvr/web')
	var obzvr_data = require('./obzvr/obzvr_data')
	obzvr_data.get = function() {
		return data
	}
}

// cts -> client tcp socket
// sts -> server tcp socket
// us -> udp socket

function tunnel() {
	this.data = {
		id: data.tunnelList.length,
		createDateTime: new Date().toString(),
		type: 'unknown',
		client: {
			status: undefined,				// connect|close
			error: undefined,
			connectDateTime: undefined,
			remoteAddress: undefined,
			remotePort: undefined,
			localAddress: undefined,
			localPort: undefined,
		},
		server: {
			status: undefined,				// connect|close
			error: undefined,
			connectDateTime: undefined,
			remoteAddress: undefined,
			remotePort: undefined,
			localAddress: undefined,
			localPort: undefined,
		}
	}

	data.tunnelList.push(this.data)
}

// client tcp socket

tunnel.prototype.cts_connect = function(info) {
	this.data.client.status = 'connect'
	this.data.client.connectDateTime = new Date().toString()
	this.data.client.remoteAddress = info.remoteAddress,
	this.data.client.remotePort = info.remotePort
	this.data.client.localAddress = info.localAddress
	this.data.client.localPort = info.localPort
}

tunnel.prototype.cts_data = function(buff) {

}

tunnel.prototype.cts_write = function(buff) {

}

tunnel.prototype.cts_drain = function() {

}

tunnel.prototype.cts_timeout = function() {

}

tunnel.prototype.cts_error = function(err) {
	this.data.client.error = err.toString()
}

tunnel.prototype.cts_close = function() {
	this.data.client.status = 'close'
}

// server tcp socket

tunnel.prototype.sts_create = function() {
	// TODO not invoked
}

tunnel.prototype.sts_connect = function(info) {
	this.data.server.status = 'connect'
	this.data.server.connectDateTime = new Date().toString()
	this.data.server.remoteAddress = info.remoteAddress,
	this.data.server.remotePort = info.remotePort
	this.data.server.localAddress = info.localAddress
	this.data.server.localPort = info.localPort
}

tunnel.prototype.sts_write = function(buff) {

}

tunnel.prototype.sts_drain = function() {

}

tunnel.prototype.sts_timeout = function() {

}

tunnel.prototype.sts_data = function(buff) {

}

tunnel.prototype.sts_error = function(err) {
	this.data.server.error = err.toString()
}

tunnel.prototype.sts_close = function() {
	this.data.server.status = 'close'
}

// client+server udp socket

tunnel.prototype.csus_create = function() {
	
}

tunnel.prototype.csus_listening = function(info) {
	
}

tunnel.prototype.csus_send = function(buf, offset, length, port, host) {
	
}

tunnel.prototype.csus_message = function(buff, rinfo) {
	
}

tunnel.prototype.csus_error = function(err) {
	
}

tunnel.prototype.csus_close = function() {
	
}

exports.tunnel = tunnel