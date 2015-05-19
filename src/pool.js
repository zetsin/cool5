var config = require('./config.js');
var log = require('./log.js');
var connection = require('./connection.js');
var net = require('net');


function pool () {
	var self = this;

	self.remote_config = config.get('remote');
	self.pool_config = config.get('pool');
	self.connections = [];
	log.info('#pool# config: enabled=${enabled}, capacity=${capacity}, expiration=${expiration}', self.pool_config);

	if(!self.pool_config.enabled) {
		return;
	}

	for(var count = 0; count < self.pool_config.capacity; count++) {
		self.inject();
	}
}
pool.prototype.inject = function () {
	var self = this;

	var new_connection = new connection();
	self.connections.push(new_connection);
	var remote_socket = net.connect(self.remote_config, function () {
		remote_socket.connected = true;
	});
	remote_socket.setNoDelay(config.tcpNoDelay);
	new_connection.set_remote(remote_socket);
	remote_socket.emit('create', self.remote_config);
	remote_socket.on('error', function (err) {
		log.error('#pool# remote_socket error: ${syscall} ${errno}', err);
	});
	remote_socket.on('close', function () {
		log.info('#pool# remote_socket close');
		
		if (remote_socket.connected) {
			var index = self.connections.indexOf(remote_socket);
			if(index >= 0) {
				self.connections.splice(index, 1);
				self.inject();
			}
		} else {
			setTimeout(function () {
				self.inject();
			}, 1000 * self.pool_config.expiration);
		}
	});
}
pool.prototype.fetch = function (client_socket) {
	var self = this;
	log.info('#pool# get a connection, total: ' + self.connections.length);

	var new_connection;
	if(!self.connections.length) {
		new_connection = new connection();
		var remote_socket = net.connect(self.remote_config);
		remote_socket.setNoDelay(config.tcpNoDelay);
		new_connection.set_remote(remote_socket);
		remote_socket.emit('create', self.remote_config);
	} else {
		self.inject();
		new_connection = self.connections.shift();
	}
	new_connection.set_client(client_socket);
	new_connection.go();
}

module.exports = pool;