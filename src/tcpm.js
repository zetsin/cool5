var net = require('net');
var util = require ("util");
var events = require ('events');

function tcpm (local_socket, remote_socket, udpm) {

    var self = this;

    self.local_socket = local_socket;
    self.remote_socket = remote_socket;
    self.udpm = udpm;

    self.local_socket.on('error', function (error) {});
    self.remote_socket.on('error', function (error) {});

    self.local_socket.on('close', function (had_error) {
        self.close();
    });
    self.remote_socket.on('close', function (had_error) {
        self.close();
    });

    self.local_socket.on('data', function (buffer) {
        self.udpm.request(buffer);
        self.remote_socket.write(buffer);
    });
    self.remote_socket.on('data', function (buffer) {
        self.udpm.reply(buffer, function () {
            self.local_socket.write(buffer);
        });
    });
}
util.inherits(tcpm, events.EventEmitter);
tcpm.prototype.close = function () {
    var self = this;

    if(self.closed) {
        return;
    }
    self.closed = true;

    self.local_socket.end();
    self.remote_socket.end();
    self.udpm.close();
    self.emit('close');
}

module.exports = tcpm;