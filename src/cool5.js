// [config]
// local  -> {host: <string>, port: <number>}
// remote -> {host: <string>, port: <number>}

var net = require('net');
var config = require('./config.js');
var log = require('./log.js');
var tcpm = require('./tcpm.js');
var udpm = require('./udpm.js');
var pool = require('./pool.js');

// 【函数】启动
exports.start = function () {

    // create tcp connection manager
    var new_tcpm_manager;
    // create server
    var local_config = config.get('local');
    var server = net.createServer(function(client) {
        log.info('#cool# client connected from ${remoteAddress}:${remotePort}', client);
        if(new_tcpm_manager) {
            new_tcpm_manager.add(client);
        }
    });
    server.on('error', function (err) {
        log.error('#cool# server had error: ${syscall} ${errno} ${address}:${port}', err);
        server.close();
    })
    server.on('close', function () {
        log.info('#cool# server closed');
        process.exit(1)
    });
    server.listen(local_config, function() {
        log.info('#cool# server opened on ${address}:${port}', server.address());
        new_tcpm_manager = new tcpm_manager();
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

exports.start = start
