var config = require('./config')
var log = require('./log')

var stat_by_gmid = {
	// 'gmid1': {
	// 	tcp_forward: 0,
	// 	tcp_backward: 0,
	// 	udp_forward: 0,
	// 	udp_backward: 0
	// }
}

// DEBUG
// setInterval(function() {
// 	var fs = require('fs')
// 	fs.writeFileSync('gstat.json', JSON.stringify(stat_by_gmid, null, 4))
// 	console.log('write gstat.json done')
// }, 1000)

// TunnelStat 类是提供给 tcp_station 模块里的 Tunnel 类用的
// Tunnel 类的实例会创建 TunnelStat 类的实例来完成统计工作
// 在这个模型下 TunnelStat 类实际上是一个“桥梁”将单独的 Tunnel 统计信息
// 从 tcp_station 模块汇聚到了当前 gstat 模块

exports.TunnelStat = TunnelStat

function TunnelStat() {
	this.gmid = undefined
	this.left_in = 0
	this.left_out = 0
	this.right_in = 0
	this.right_out = 0
}

TunnelStat.prototype.set_header = function(header) {
	// 如果 header 中没有 gmid 就算了
	// 如果有必须是字符串，但可以是空字符串
	if (typeof header.gmid !== 'string') {
		return
		//throw new Error('TunnelStat.set_header() header.gmid must be string not ' + typeof header.gmid)
	}

	// 不允许重复设置
	if (this.gmid !== undefined) {
		throw new Error('TunnelStat.set_header() can not be invoked more than once')
	}

	this.gmid = header.gmid

	// 把当前统计值更新到 stat_by_gmid 里
	tcp_forward(this.gmid, this.right_out)
	tcp_backward(this.gmid, this.right_in)
}

TunnelStat.prototype.add_left_in = function(len) {
	this.left_in += len
}

TunnelStat.prototype.add_left_out = function(len) {
	this.left_out += len
}

TunnelStat.prototype.add_right_in = function(len) {
	this.right_in += len
	if (this.gmid !== undefined) {
		tcp_backward(this.gmid, this.right_in)
	}
}

TunnelStat.prototype.add_right_out = function(len) {
	this.right_out += len
	if (this.gmid !== undefined) {
		tcp_forward(this.gmid, this.right_out)
	}
}

exports.query_all = function() {
	return stat_by_gmid
}

function tcp_backward(gmid, len) {
	if (!stat_by_gmid.hasOwnProperty(gmid)) {
		stat_by_gmid[gmid] = new_item()
	}

	stat_by_gmid[gmid].tcp_backward += len
}

function tcp_forward(gmid, len) {
	if (!stat_by_gmid.hasOwnProperty(gmid)) {
		stat_by_gmid[gmid] = new_item()
	}

	stat_by_gmid[gmid].tcp_forward += len
}

function udp_backward(gmid, len) {
	if (!stat_by_gmid.hasOwnProperty(gmid)) {
		stat_by_gmid[gmid] = new_item()
	}

	stat_by_gmid[gmid].udp_backward += len
}

function udp_forward(gmid, len) {
	if (!stat_by_gmid.hasOwnProperty(gmid)) {
		stat_by_gmid[gmid] = new_item()
	}

	stat_by_gmid[gmid].udp_forward += len
}

function new_item() {
	return {
		tcp_forward: 0,
		tcp_backward: 0,
		udp_forward: 0,
		udp_backward: 0
	}
}
