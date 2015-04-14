var net = require('net');
var util = require ("util");
var events = require ('events');

function tcpm (client_socket, remote_socket, udpm) {

    var self = this;

    self.client_socket = client_socket;
    self.remote_socket = remote_socket;
    self.udpm = udpm;

    self.client_socket.on('error', function (error) {});
    self.remote_socket.on('error', function (error) {});

    self.client_socket.on('close', function (had_error) {
        self.close();
    });
    self.remote_socket.on('close', function (had_error) {
        self.close();
    });

    self.client_socket.on('data', function (buffer) {
        self.udpm.request(buffer);
        self.remote_socket.write(buffer);
    });
    self.remote_socket.on('data', function (buffer) {
        self.udpm.reply(buffer, function () {
            self.client_socket.write(buffer);
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

    self.client_socket.end();
    self.remote_socket.end();
    self.udpm.close();
    self.emit('close');
}

module.exports = tcpm;