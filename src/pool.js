var config = require('./config.js');
var net = require('net');
function pool () {
	var self = this;

	self.remote_config = config.get('remote');
	self.pool_config = config.get('pool');
	self.connections = [];

	if(!self.pool_config.enabled) {
		return;
	}

	for(var count = 0; count < self.pool_config.capacity; count++) {
		self.add();
	}
}
pool.prototype.add = function () {
	var self = this;

	var socket = net.connect(self.remote_config, function () {
		socket.connected = true;
		self.connections.push(socket);
	});
	socket.on('error', function (err) {});
	socket.on('close', function () {
		var index = self.connections.indexOf(socket);
		if(index >= 0) {
			self.connections.splice(index, 1);
			self.add();
		} else if (!socket.connected) {
			setTimeout(function () {
				self.add();
			}, 1000 * self.pool_config.expiration);
		}
	});

}
pool.prototype.get = function () {
	var self = this;
	console.log('get: ' + self.connections.length);

	if(!self.connections.length) {
		return net.connect(self.remote_config, function () {});
	}

	self.add();
	return self.connections.shift();
}

module.exports = pool;