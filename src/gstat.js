var config = require('./config')
var log = require('./log')

var state = {
	// 'gid1': {
	// 	tcp_in: 0,
	// 	tcp_out: 0,
	// 	udp_in: 0,
	// 	udp_out: 0
	// }
}

exports.query = function(gid) {
	return state
}

exports.remove = function(gid) {
	delete state[gid]
}

exports.tcp_out = function(gid, len) {
	if (!state.hasOwnProperty(gid)) {
		state[gid] = new_item()
	}

	state[gid].tcp_out += len
}

exports.tcp_in = function(gid, len) {
	if (!state.hasOwnProperty(gid)) {
		state[gid] = new_item()
	}

	state[gid].tcp_in += len
}

exports.udp_out = function(gid, len) {
	if (!state.hasOwnProperty(gid)) {
		state[gid] = new_item()
	}

	state[gid].udp_out += len
}

exports.udp_in = function(gid, len) {
	if (!state.hasOwnProperty(gid)) {
		state[gid] = new_item()
	}

	state[gid].udp_in += len
}

function new_item() {
	return {
		tcp_in: 0,
		tcp_out: 0,
		udp_in: 0,
		udp_out: 0
	}
}