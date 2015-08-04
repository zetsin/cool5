var config = require('./config')

var mode = config.get('mode')

// protocol: 'gpptcp' or 'gppudp'
exports.select_route_for = function(protocol, from_ip, from_port, header) {
	if (protocol !== 'gpptcp' && protocol !== 'gppudp') {
		throw new Error('invalid arguments, protocol must be gpptcp or gppudp')
	}

	// 如果当前模式为 gpp_to_tcpudp 那么就直接转发好了
	if (mode === 'gpp_to_tcpudp') {
		return {
			protocol: protocol === 'gpptcp' ? 'tcp' : 'udp',
			remote_host: header.ip,
			remote_port: header.port
		}
	}
	// 如果当前模式为 gpp_to_gpp 则需要指明下一跳的地址
	else if (mode === 'gpp_to_gpp') {
		if (protocol === 'gpptcp') {
			return {
				protocol: protocol, // 协议保持不变
				remote_host: config.get('remote.tcp.host'),
				remote_port: config.get('remote.tcp.port')
			}
		}
		else if (protocol === 'gppudp') {
			return {
				protocol: protocol, // 协议保持不变
				remote_host: config.get('remote.udp.host'),
				remote_port: config.get('remote.udp.port')
			}
		}
		else {
			// impossible
			throw new Error('stupid programmer!')
		}
	}
	// 如果当前模式为 gpp_to_dynamic 则需要根据各项参数动态决定
	else if (mode === 'gpp_to_dynamic') {
		// 在这里我们可以根据各种信息动态决定
		throw new Error('TODO')
	}
}