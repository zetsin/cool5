var config = require('./config')

// return: {ok: <boolean>, forward: <boolean>}
exports.exec = function(header) {
	return {
		ok: true,
		forward: false
	}
}