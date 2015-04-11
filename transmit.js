var net = require('net');
var dgram = require('dgram');
var util = require ("util");
var events = require ('events');
var os = require('os');

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
}

// 【函数】启动
function start (local_options, remote_options, external_host) {

    // create tcp connection manager
    var tcm = new tcp_connection_manager(remote_options, external_host);
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

// 【函数】获取外部地址
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
}

// tcp连接管理类
function tcp_connection_manager (remote_options, external_host) {
    var self = this;

    self.remote_options = remote_options;
    self.external_host = external_host;
    self.connections = {}
}
tcp_connection_manager.prototype.add = function (c) {
    var self = this;

    var key = c.remoteAddress + ':' + c.remotePort;
    if(self.connections[key]) {
        self.connections[key].close();
    }
    // create tcp connection
    self.connections[key] = new tcp_connection(c, self.remote_options, self.external_host);
    self.connections[key].on('close', function () {
        delete self.connections[key];
    });
}
tcp_connection_manager.prototype.close = function () {
    var self = this;
    for(var key in self.connections) {
        self.connections[key].close();
    }
}

// tcp连接类
function tcp_connection (local_socket, remote_options, external_host) {

    var self = this;

    self.udp_associate_manager = new udp_associate_manager(remote_options.host, external_host);

    self.local_socket = local_socket;
    self.remote_socket = net.connect(remote_options, function () {});

    self.local_socket.on('error', function (error) {});
    self.remote_socket.on('error', function (error) {});

    self.local_socket.on('close', function (had_error) {
        self.close();
    });
    self.remote_socket.on('close', function (had_error) {
        self.close();
    });

    self.local_socket.on('data', function (buffer) {
        self.udp_associate_manager.request(buffer);
        self.remote_socket.write(buffer);
    });
    self.remote_socket.on('data', function (buffer) {
        self.udp_associate_manager.reply(buffer, function () {
            self.local_socket.write(buffer);
        });
    });
}
util.inherits(tcp_connection, events.EventEmitter);
tcp_connection.prototype.close = function () {
    var self = this;

    if(self.closed) {
        return;
    }
    self.closed = true;

    self.local_socket.end();
    self.remote_socket.end();
    self.udp_associate_manager.close();
    self.emit('close');
}

// udp管理类
function udp_associate_manager (remote_addr, external_host) {
    var self = this;

    self.cmd = 0;
    self.bind = false;
    self.associate = undefined;
    self.local_port = 0;
    self.local_addr = '';
    self.remote_port = 0;
    self.remote_addr = remote_addr;
    self.external_host = external_host;
}
// +----+-----+-------+------+----------+----------+
// |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
// +----+-----+-------+------+----------+----------+
// | 1  |  1  | X'00' |  1   | Variable |    2     |
// +----+-----+-------+------+----------+----------+
udp_associate_manager.prototype.request = function (buffer) {
    var self = this;

    if(self.cmd) {
        return;
    }
    if(buffer.length < 4 + 0 + 2) {
        return;
    }
    if(buffer[0] !== 0x05 || buffer[2] !== 0x00) {
        return;
    }
    if(buffer[1] !== 0x01 && buffer[1] !== 0x02 && buffer[1] !== 0x03) {
        return;
    }
    if ((buffer[3] === 0x01 && buffer.length === 4 + 4 + 2) || 
        (buffer[3] === 0x04 && buffer.length === 4 + 16 + 2) ||
        (buffer[3] === 0x03 && buffer.length === 4 + 1 + buffer[4] + 2)) {
        self.cmd = buffer[1];
        if(self.cmd === 0x03) {
            console.log('udp request');
            console.log(buffer);
            buffer.fill(0, 4);
        }
    }

}
// +----+-----+-------+------+----------+----------+
// |VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
// +----+-----+-------+------+----------+----------+
// | 1  |  1  | X'00' |  1   | Variable |    2     |
// +----+-----+-------+------+----------+----------+
udp_associate_manager.prototype.reply = function (buffer, callback) {
    var self = this;
    if (self.bind ||
        self.cmd !== 0x03 ||
        buffer.length < 4 + 0 + 2 ||
        buffer[0] !== 0x05 || buffer[1] !== 0x00 || buffer[2] !== 0x00) {
        callback();
        return;
    }
    if(buffer[3] === 0x01 && buffer.length === 4 + 4 + 2) {
        if(buffer.readUIntBE(4, 4) !== 0x00) {
            self.remote_addr = buffer[4] + '.' + buffer[5] + '.' + buffer[6] + '.' + buffer[7];
        }
        self.remote_port = buffer.readUIntBE(4 + 4, 2);
        var addr = self.external_host.split('.');
        if(addr.length !== 4) {
            callback();
            return;
        }
        console.log(buffer);
        console.log(self.remote_addr + ':' + self.remote_port + ' / ' + buffer.readUIntLE(4 + 4, 2));
        
        buffer[4] = addr[0];
        buffer[5] = addr[1];
        buffer[6] = addr[2];
        buffer[7] = addr[3];
        
    } else {
        callback();
        return;
    }

    self.associate = dgram.createSocket("udp4");

    self.associate.on("error", function (err) {
        console.log("associate error:\n" + err.stack);
    });

    self.associate.on("message", function (msg, rinfo) {
        console.log(rinfo)
        if(rinfo.port === self.remote_port && rinfo.address === self.remote_addr) {
            console.log('receive')
            self.associate.send(msg, 0, msg.length, self.local_port, self.local_addr);
        } else {
            if(!self.local_port || !self.local_addr) {
                self.local_port = rinfo.port;
                self.local_addr = rinfo.address;
                console.log('no local addr')
            }
            console.log('send')
            if(rinfo.port === self.local_port && rinfo.address === self.local_addr) {
                self.associate.send(msg, 0, msg.length, self.remote_port, self.remote_addr);
            } else {
                console.log("associate msg from unknown addr!");
            }
        }
    });

    self.associate.bind(self.remote_port, function () {
        console.log('bind');
        self.bind = true;
        callback();
    });

}
udp_associate_manager.prototype.close = function () {
    var self = this;
    if(self.associate) {
        self.associate.close();
    }
}