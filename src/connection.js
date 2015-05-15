var udpm = require('./udpm.js');
var tcpm = require('./tcpm.js');
var obzvr = require('./obzvr.js');

function connection () {
	var self = this;

	self.tunnel = new obzvr.tunnel();
	self.udpm = new udpm();
	self.udpm.on('create', function () {
		self.tunnel.csus_create();
	});
	self.udpm.on('listening', function () {
		self.tunnel.csus_listening(self.udpm.associate.address());
	});
	self.udpm.on('send', function (buf, offset, length, port, host) {
		self.tunnel.csus_send(buf, offset, length, port, host);
	});
	self.udpm.on('message', function (buff, rinfo) {
		self.tunnel.csus_message(buff, rinfo);
	});
	self.udpm.on('error', function (err) {
		self.tunnel.csus_error(err);
	});
	self.udpm.on('close', function () {
		self.tunnel.csus_close();
	});
}
connection.prototype.set_client = function (socket) {
	var self = this;

	self.client_socket = socket;
	self.tunnel.cts_connect({
		remoteAddress: self.client_socket.remoteAddress, 
		remotePort: self.client_socket.remotePort,
		localAddress: self.client_socket.localAddress,
		localPort: self.client_socket.localPort
	});
	self.client_socket.on('data', function (buff) {
		self.tunnel.cts_data(buff);
	});
	self.client_socket.on('write', function (buff) {
		self.tunnel.cts_write(buff);
	});
	self.client_socket.on('drain', function () {
		self.tunnel.cts_drain();
	});
	self.client_socket.on('timeout', function () {
		self.tunnel.cts_timeout();
	});
	self.client_socket.on('error', function (err) {
		self.tunnel.cts_error(err);
	});
	self.client_socket.on('close', function () {
		self.tunnel.cts_close();
	});
}
connection.prototype.set_remote = function (socket) {
	var self = this;

	self.remote_socket = socket;
	self.remote_socket.on('connect', function () {
		self.tunnel.sts_connect({
			remoteAddress: self.remote_socket.remoteAddress, 
			remotePort: self.remote_socket.remotePort,
			localAddress: self.remote_socket.localAddress,
			localPort: self.remote_socket.localPort
		});
	});
	self.remote_socket.on('create', function (addr) {
		self.tunnel.sts_create(addr);
	});
	self.remote_socket.on('data', function (buff) {
		self.tunnel.sts_data(buff);
	});
	self.remote_socket.on('write', function (buff) {
		self.tunnel.sts_write(buff);
	});
	self.remote_socket.on('drain', function () {
		self.tunnel.sts_drain();
	});
	self.remote_socket.on('timeout', function () {
		self.tunnel.sts_timeout();
	});
	self.remote_socket.on('error', function (err) {
		self.tunnel.sts_error(err);
	});
	self.remote_socket.on('close', function () {
		self.tunnel.sts_close();
	});
}
connection.prototype.go = function () {
	var self = this;

	if(self.client_socket && self.remote_socket && self.udpm) {
		self.tcpm = new tcpm(self.client_socket, self.remote_socket, self.udpm);
	}
}

module.exports = connection;