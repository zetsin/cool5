var net = require('net');
function rcpm (option, max) {
	var self = this;

	max = max || 10;

	self.option = option;
	self.max = max;
	self.pool = [];

	for(var count = 0; count < max; count++) {
		self.add();
	}
}
rcpm.prototype.add = function () {
	var self = this;

	var socket = net.connect(self.option, function () {});
	socket.on('error', function (err) {});
	socket.on('close', function () {
		console.log('close');
		var index = self.pool.indexOf(socket);
		if(index < 0) {
			return;
		}
		self.pool.slice(index, 1);
		self.add();
	});

	self.pool.push(socket);
}
rcpm.prototype.get = function () {
	console.log('get');
	var self = this;

	self.add();
	return self.pool.shift();
}

module.exports = rcpm;