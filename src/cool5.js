// [config]
// local  -> {host: <string>, port: <number>}
// remote -> {host: <string>, port: <number>}

var net = require('net');
var os = require('os');
var config = require('./config.js');
var log = require('./log.js');
var tcpm = require('./tcpm.js');
var udpm = require('./udpm.js');
var pool = require('./pool.js');

start();

// 【函数】启动
function start () {

    // create tcp connection manager
    var new_tcpm_manager = new tcpm_manager();
    // create server
    var local_config = config.get('local');
    net.createServer(function(c) {
        new_tcpm_manager.add(c);
    }).on('error', function () {

    }).on('close', function () {
        new_tcpm_manager.close();
    }).listen(local_config, function() {

    });
}

// tcp连接管理类
function tcpm_manager () {
    var self = this;

    self.pool = new pool();
    self.mappings = {}
}
tcpm_manager.prototype.add = function (client_socket) {
    var self = this;

    var key = client_socket.remoteAddress + ':' + client_socket.remotePort;
    if(self.mappings[key]) {
        self.mappings[key].close();
    }
    // create tcp mapping
    var remote_socket = self.pool.get();
    var new_udpm = new udpm();
    self.mappings[key] = new tcpm(client_socket, remote_socket, new_udpm);
    self.mappings[key].on('close', function () {
        delete self.mappings[key];
    });
}
tcpm_manager.prototype.close = function () {
    var self = this;
    for(var key in self.mappings) {
        self.mappings[key].close();
    }
}