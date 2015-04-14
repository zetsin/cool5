var net = require('net');
var util = require ("util");
var events = require ('events');
var log = require('./log.js');

function tcpm (client_socket, remote_socket, udpm) {

    var self = this;

    self.client_socket = client_socket;
    self.client_socket.init_address = {
    	port: self.client_socket.remotePort,
    	address: self.client_socket.remoteAddress,
    	family: self.client_socket.remoteFamily
    }
    self.remote_socket = remote_socket;
    self.remote_socket.init_address = {
    	port: self.remote_socket.remotePort,
    	address: self.remote_socket.remoteAddress,
    	family: self.remote_socket.remoteFamily
    }
    self.udpm = udpm;

    self.client_socket.on('error', function (err) {
    	log.error('#tcpm# client socket error: ${syscall} ${errno}', err);
    });
    self.remote_socket.on('error', function (err) {
    	log.error('#tcpm# remote socket error: ${syscall} ${errno}', err);
    });

    self.client_socket.on('close', function (had_error) {
    	log.info('#tcpm# client socket close: ${address}:${port}', self.client_socket.init_address);
        self.close();
    });
    self.remote_socket.on('close', function (had_error) {
    	log.info('#tcpm# remote socket close: ${address}:${port}', self.remote_socket.init_address);
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