var config = require('./config.js');
var log = require('./log.js');
var dgram = require('dgram');

function udpm () {
    var self = this;

    var remote_config = config.get('remote');

    self.cmd = 0;
    self.bind = false;
    self.associate = undefined;
    self.client = {
    	port: 0,
    	host: ''
    };
    self.remote = {
    	port: 0,
    	host: remote_config.host
    };
    self.external_host = get_external_host();

    function get_external_host () {
        var list = require('os').networkInterfaces()
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
// +----+-----+-------+------+----------+----------+
// |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
// +----+-----+-------+------+----------+----------+
// | 1  |  1  | X'00' |  1   | Variable |    2     |
// +----+-----+-------+------+----------+----------+
udpm.prototype.request = function (buffer) {
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
        log.info('#udpm# request cmd=' + self.cmd);
        if(self.cmd === 0x03) {
            buffer.fill(0, 4);
        }
    }

}
// +----+-----+-------+------+----------+----------+
// |VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
// +----+-----+-------+------+----------+----------+
// | 1  |  1  | X'00' |  1   | Variable |    2     |
// +----+-----+-------+------+----------+----------+
udpm.prototype.reply = function (buffer, callback) {
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
            self.remote.host = buffer[4] + '.' + buffer[5] + '.' + buffer[6] + '.' + buffer[7];
        }
        self.remote.port = buffer.readUIntBE(4 + 4, 2);
    } else {
        callback();
        return;
    }

    var addr = self.external_host.split('.');
    if(addr.length !== 4) {
        callback();
        return;
    }

    self.associate = dgram.createSocket("udp4");

    self.associate.on("error", function (err) {
        log.error('#udpm# socket error: ${syscall} ${errno} ${address}:${port}', err);
        if(err.syscall === 'bind') {
        	callback();
        }
    });

    self.associate.on("message", function (msg, rinfo) {
        if(rinfo.port === self.remote.port && rinfo.address === self.remote.host) {
            self.associate.send(msg, 0, msg.length, self.client.port, self.client.host);
        } else {
            if(!self.client.port || !self.client.host) {
                self.client.port = rinfo.port;
                self.client.host = rinfo.address;
            }
            if(rinfo.port === self.client.port && rinfo.address === self.client.host) {
                self.associate.send(msg, 0, msg.length, self.remote.port, self.remote.host);
            } else {
        		log.error('#udpm# receive msg from unknown addr: ${address}:${port}', rinfo);
            }
        }
    });

    self.associate.bind(function () {
        log.info('#udpm# socket bind: ${address}:${port}', self.associate.address());
        self.bind = true;

        buffer[4] = addr[0];
        buffer[5] = addr[1];
        buffer[6] = addr[2];
        buffer[7] = addr[3];
        buffer.writeUIntBE(self.associate.address().port, 4 + 4, 2);
        callback();
    });

}
udpm.prototype.close = function () {
    var self = this;
    if(self.associate) {
        self.associate.close();
    }
}

module.exports = udpm;