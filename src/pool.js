var net = require('net');
function pool (option, max) {
	var self = this;

	self.option = option;
	self.max = max || 10;
	self.pool = [];

	for(var count = 0; count < self.max; count++) {
		self.add();
	}
}
pool.prototype.add = function () {
	var self = this;

	var socket = net.connect(self.option, function () {
		socket.connected = true;
		self.pool.push(socket);
	});
	socket.on('error', function (err) {});
	socket.on('close', function () {
		var index = self.pool.indexOf(socket);
		if(index >= 0) {
			self.pool.splice(index, 1);
			self.add();
		} else if (!socket.connected) {
			setTimeout(function () {
				self.add();
			}, 1000 * 60);
		}
	});

}
pool.prototype.get = function () {
	var self = this;
	console.log('get: ' + self.pool.length);

	if(!self.pool.length) {
		return net.connect(self.option, function () {});
	}

	self.add();
	return self.pool.shift();
}

module.exports = pool;