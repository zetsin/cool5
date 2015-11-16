var config = require('./config')
var log = require('./log')

var stat_by_gmid = {
	// 'gmid1': {
	// 	tcp_forward: 0,
	// 	tcp_backward: 0,
	// 	tcp_forward_via_proxy: 0,
	// 	tcp_backward_via_proxy: 0,
	// 	udp_forward: 0,
	// 	udp_backward: 0,
	// 	udp_forward_via_proxy: 0,
	// 	udp_backward_via_proxy: 0
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
	this.right_in_via_proxy = 0
	this.right_out_via_proxy = 0
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
	add_tcp_forward(this.gmid, this.right_out)
	add_tcp_backward(this.gmid, this.right_in)
}

TunnelStat.prototype.add_left_in = function(len) {
	this.left_in += len
}

TunnelStat.prototype.add_left_out = function(len) {
	this.left_out += len
}

TunnelStat.prototype.add_right_in = function(len, via_proxy) {
	this.right_in += len
	if (via_proxy) {
		this.right_in_via_proxy += len
	}
	if (this.gmid === undefined) return
	add_tcp_backward(this.gmid, len, via_proxy)
}

TunnelStat.prototype.add_right_out = function(len, via_proxy) {
	this.right_out += len
	if (via_proxy) {
		this.right_out_via_proxy += len
	}
	if (this.gmid === undefined) return
	add_tcp_forward(this.gmid, len, via_proxy)
}

// UDP 的统计比较简单，不需要建立 TunnelStat 这样的类级抽象
// 直接提供两个接口即可，如下

function ShadowSocketStat(gmid, via_proxy) {

}

ShadowSocketStat.prototype.add_left_in = function(len) {

}

exports.udp_forward = function(header, len, via_proxy) {
	// 没有 gmid 头的不统计
	if (typeof header.gmid !== 'string') return

	udp_forward(header.gmid, len, via_proxy)
}

exports.udp_backward = function(header, len, via_proxy) {
	// 没有 gmid 头的不统计	
	if (typeof header.gmid !== 'string') return

	udp_backward(header.gmid, len, via_proxy)
}

exports.query_all = function() {
	return stat_by_gmid
}

function add_tcp_backward(gmid, len, via_proxy) {
	if (!stat_by_gmid.hasOwnProperty(gmid)) {
		stat_by_gmid[gmid] = new_item()
	}

	stat_by_gmid[gmid].tcp_backward += len
	if (via_proxy) {
		stat_by_gmid[gmid].tcp_backward_via_proxy += len
	}
}

function add_tcp_forward(gmid, len, via_proxy) {
	if (!stat_by_gmid.hasOwnProperty(gmid)) {
		stat_by_gmid[gmid] = new_item()
	}

	stat_by_gmid[gmid].tcp_forward += len
	if (via_proxy) {
		stat_by_gmid[gmid].tcp_forward_via_proxy += len
	}
}

function add_udp_backward(gmid, len, via_proxy) {
	if (!stat_by_gmid.hasOwnProperty(gmid)) {
		stat_by_gmid[gmid] = new_item()
	}

	stat_by_gmid[gmid].udp_backward += len
	if (via_proxy) {
		stat_by_gmid[gmid].udp_backward_via_proxy += len
	}
}

function add_udp_forward(gmid, len, via_proxy) {
	if (!stat_by_gmid.hasOwnProperty(gmid)) {
		stat_by_gmid[gmid] = new_item()
	}

	stat_by_gmid[gmid].udp_forward += len
	if (via_proxy) {
		stat_by_gmid[gmid].udp_forward_via_proxy += len
	}
}

function new_item() {
	return {
		tcp_forward: 0,
		tcp_backward: 0,
		tcp_forward_via_proxy: 0,
		tcp_backward_via_proxy: 0,
		udp_forward: 0,
		udp_backward: 0,
		udp_forward_via_proxy: 0,
		udp_backward_via_proxy: 0
	}
}
