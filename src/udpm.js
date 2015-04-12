var dgram = require('dgram');

function udpm (remote_addr, external_addr) {
    var self = this;

    self.cmd = 0;
    self.bind = false;
    self.associate = undefined;
    self.local_port = 0;
    self.local_addr = '';
    self.remote_port = 0;
    self.remote_addr = remote_addr;
    self.external_addr = external_addr;
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
            self.remote_addr = buffer[4] + '.' + buffer[5] + '.' + buffer[6] + '.' + buffer[7];
        }
        self.remote_port = buffer.readUIntBE(4 + 4, 2);
    } else {
        callback();
        return;
    }

    var addr = self.external_addr.split('.');
    if(addr.length !== 4) {
        callback();
        return;
    }

    self.associate = dgram.createSocket("udp4");

    self.associate.on("error", function (err) {
        console.log("associate error:\n" + err.stack);
        if(err.syscall === 'bind') {
        	callback();
        }
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

        buffer[4] = addr[0];
        buffer[5] = addr[1];
        buffer[6] = addr[2];
        buffer[7] = addr[3];
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