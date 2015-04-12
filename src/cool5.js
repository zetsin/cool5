var net = require('net');
var os = require('os');
var tcpm = require('./tcpm.js');
var udpm = require('./udpm.js');

prepare();

// 【函数】预处理用户参数
function prepare() {
    var eh = get_external_host();
    var options_default = {
        lh: eh,
        lp: '1080',
        rh: 'localhost',
        rp: '1080',
        eh: eh
    };
    var argv = process.argv.splice(2);
    for(var key in argv) {
        var kv = argv[key].split('=');
        if(kv.length === 2) {
            options_default[kv[0]] = kv[1];
        }
    }
    console.log(options_default);
    start({
        host: options_default.lh,
        port: parseInt(options_default.lp)
    }, {
        host: options_default.rh,
        port: parseInt(options_default.rp)
    }, options_default.eh);


    function get_external_host () {
        var list = os.networkInterfaces()
        for(var key1 in list) {
            for(var key2 in list[key1]) {
                var info = list[key1][key2];
                if(info.family === 'IPv4' && info.internal === false && info.address !== '127.0.0.1') {
                    return info.address;
                }
            }
        }
        return '0.0.0.0';
    }
}

// 【函数】启动
function start (local_options, remote_options, external_host) {

    // create tcp connection manager
    var tcm = new tcpm_manager(remote_options, external_host);
    // create server
    var server = net.createServer(function(c) {
        tcm.add(c);
    });
    server.listen(local_options, function() {});
    server.on('error', function () {});
    server.on('close', function () {
        tcm.close();
    });
}

// tcp连接管理类
function tcpm_manager (remote_options, external_host) {
    var self = this;

    self.remote_options = remote_options;
    self.external_host = external_host;
    self.mappings = {}
}
tcpm_manager.prototype.add = function (c) {
    var self = this;

    var key = c.remoteAddress + ':' + c.remotePort;
    if(self.mappings[key]) {
        self.mappings[key].close();
    }
    // create tcp mapping
    var remote_socket = net.connect(self.remote_options, function () {});
    var _udpm = new udpm(self.remote_options.host, self.external_host);
    self.mappings[key] = new tcpm(c, remote_socket, _udpm);
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