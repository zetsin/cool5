var config = require('./config')

var data = {
	startDateTime: currentDateTime(),
	// tunnel - {id: '', type: '', createDateTime: '', client: {} || null, server: {} || null}
	// tunnel.type - 'unknown' | 'tcp' | 'udp'
	// tunnel.client - {host: '', port: 123, eventHistory: []}
	// tunnel.client.eventHistory[i] - {type: ''}
	tunnelList: []
}

if (config.get('obzvr.enabled')) {
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
		createDateTime: currentDateTime(),
		type: 'unknown',
		client: {
			status: undefined,				// connect|close
			error: undefined,
			connectDateTime: undefined,
			remoteAddress: undefined,
			remotePort: undefined,
			localAddress: undefined,
			localPort: undefined,
			dataRead: 0,
			dataWrite: 0
		},
		server: {
			status: undefined,				// connect|close
			error: undefined,
			createDateTime: undefined,
			connectDateTime: undefined,
			connectDelay: undefined,
			remoteAddress: undefined,
			remotePort: undefined,
			localAddress: undefined,
			localPort: undefined,
			dataRead: 0,
			dataWrite: 0
		},
		udp: {
			createDateTime: undefined,
			status: undefined,				// listening|close
			error: undefined,
			localAddress: undefined,
			localPort: undefined,
			packetHistory: undefined,
			packetHistorySummary: undefined
		}
	}

	data.tunnelList.push(this.data)
}

// client tcp socket

tunnel.prototype.cts_connect = function(info) {
	this.data.client.status = 'connect'
	this.data.client.connectDateTime = currentDateTime()
	this.data.client.remoteAddress = info.remoteAddress,
	this.data.client.remotePort = info.remotePort
	this.data.client.localAddress = info.localAddress
	this.data.client.localPort = info.localPort
}

tunnel.prototype.cts_data = function(buff) {
	this.data.client.dataRead += buff.length
}

tunnel.prototype.cts_write = function(buff) {
	this.data.client.dataWrite += buff.length
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

tunnel.prototype.sts_create = function(info) {
	this.data.server.createDateTime = currentDateTime()
	this.data.server.remoteAddress = info.remoteAddress
	this.data.server.remotePort = info.remotePort
}

tunnel.prototype.sts_connect = function(info) {
	this.data.server.status = 'connect'
	this.data.server.connectDateTime = currentDateTime()
	this.data.server.remoteAddress = info.remoteAddress
	this.data.server.remotePort = info.remotePort
	this.data.server.localAddress = info.localAddress
	this.data.server.localPort = info.localPort

	var start = new Date(this.data.server.createDateTime)
	var end = new Date(this.data.server.connectDateTime)
	this.data.server.connectDelay = end - start
}

tunnel.prototype.sts_write = function(buff) {
	this.data.server.dataWrite += buff.length
}

tunnel.prototype.sts_drain = function() {

}

tunnel.prototype.sts_timeout = function() {

}

tunnel.prototype.sts_data = function(buff) {
	this.data.server.dataRead += buff.length
}

tunnel.prototype.sts_error = function(err) {
	this.data.server.error = err.toString()

	if (!this.data.server.createDateTime) debugger // BUG
	var start = new Date(this.data.server.createDateTime)
	var end = new Date(new Date().toISOString())
	this.data.server.connectDelay = end - start
}

tunnel.prototype.sts_close = function() {
	this.data.server.status = 'close'
}

// client+server udp socket

tunnel.prototype.csus_create = function() {
	this.data.udp.createDateTime = currentDateTime()
	this.data.type = 'udp'
}

tunnel.prototype.csus_listening = function(info) {
	this.data.udp.status = 'listening'
	this.data.udp.localAddress = info.address
	this.data.udp.localPort = info.port
}

tunnel.prototype.csus_send = function(buf, offset, length, port, host) {
	// TODO
}

tunnel.prototype.csus_message = function(buff, rinfo) {
	// TODO
}

tunnel.prototype.csus_error = function(err) {
	this.data.udp.error = err.toString()
}

tunnel.prototype.csus_close = function() {
	this.data.udp.status = 'close'
}

// utils

function currentDateTime() {
	return new Date().toISOString()
	//return new Date().toLocaleTimeString()
}

exports.tunnel = tunnel