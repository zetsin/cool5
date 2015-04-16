// cts -> client tcp socket
// sts -> server tcp socket
// us -> udp socket

function tunnel_obzvr(c_host, c_port) {

}

// client tcp socket

tunnel_obzvr.prototype.cts_data = function(buff) {

}

tunnel_obzvr.prototype.cts_write = function(buff) {

}

tunnel_obzvr.prototype.cts_drain = function() {

}

tunnel_obzvr.prototype.cts_timeout = function() {

}

tunnel_obzvr.prototype.cts_error = function(err) {

}

tunnel_obzvr.prototype.cts_close = function() {

}

// server tcp socket

tunnel_obzvr.prototype.sts_create = function(s_host, s_port) {

}

tunnel_obzvr.prototype.sts_connect = function() {

}

tunnel_obzvr.prototype.sts_write = function(buff) {

}

tunnel_obzvr.prototype.sts_drain = function() {

}

tunnel_obzvr.prototype.sts_timeout = function() {

}

tunnel_obzvr.prototype.sts_data = function(buff) {

}

tunnel_obzvr.prototype.sts_error = function(err) {

}

tunnel_obzvr.prototype.sts_close = function() {

}

// client+server udp socket

tunnel_obzvr.prototype.csus_create = function(host, port) {
	
}

tunnel_obzvr.prototype.csus_listening = function() {
	
}

tunnel_obzvr.prototype.csus_send = function(buf, offset, length, port, host) {
	
}

tunnel_obzvr.prototype.csus_message = function(buff, rinfo) {
	
}

tunnel_obzvr.prototype.csus_error = function(err) {
	
}

tunnel_obzvr.prototype.csus_close = function() {
	
}

exports.tunnel_obzvr = tunnel_obzvr