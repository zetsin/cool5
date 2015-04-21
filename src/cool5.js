// [config]
// local  -> {host: <string>, port: <number>}
// remote -> {host: <string>, port: <number>}

var net = require('net');
var config = require('./config.js');
var log = require('./log.js');
var pool = require('./pool.js');

// 【函数】启动
exports.start = function () {

    var new_pool = new pool();
    // create server
    var local_config = config.get('local');
    var server = net.createServer();
    server.on('connection', function (client) {
        log.info('#cool# client connected from ${remoteAddress}:${remotePort}', client);
        new_pool.fetch(client);
    });
    server.on('error', function (err) {
        log.error('#cool# server had error: ${syscall} ${errno} ${address}:${port}', err);
        server.close();
    });
    server.on('close', function () {
        log.info('#cool# server closed');
        process.exit(1)
    });
    server.listen(local_config.port, local_config.host, function() {
        log.info('#cool# server opened on ${address}:${port}', server.address());
    });
}