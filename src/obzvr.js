var config = require('./config')

var data = {
	summary: {
		startDateTime: new Date().toString()
	}
}

var obzvr_config = config.get('obzvr')
if (obzvr_config.enabled) {
	var web = require('./obzvr/web')
	var obzvr_data = require('./obzvr/obzvr_data')
	obzvr_data.get = function(name) {
		return data[name]
	}
}

// cts -> client tcp socket
// sts -> server tcp socket
// us -> udp socket

function tunnel() {

}

// client tcp socket

tunnel.prototype.cts_connect = function(info) {
	
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

}

tunnel.prototype.cts_close = function() {

}

// server tcp socket

tunnel.prototype.sts_create = function() {

}

tunnel.prototype.sts_connect = function(info) {

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

}

tunnel.prototype.sts_close = function() {

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