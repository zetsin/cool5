var net = require('net');
var config = require('./config');
var log = require('./log');
var tcp_station = require('./tcp_station')
var udp_station = require('./udp_station')

exports.start = function() {
	tcp_station.start()
	udp_station.start()
}