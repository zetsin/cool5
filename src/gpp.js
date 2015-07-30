var config = require('./config')

// 几个常量
var semicolon = 0x3b
var equal_sign = 0x3d
var max_size = config.get('gpp.header.max_size')

// 导出各个函数
exports.detect_header_end = detect_header_end
exports.test_detect_header_end = test_detect_header_end

// 这个函数用于判断 header 结尾位置
// 方法是寻找双分号 ;; 位置
// 搜寻时会遵循 config 中 gpp.header.max_size  中的限制
// 返回值：
// -1 代表已经越界，但仍然未找到结尾位置
// n < chunk.length 代表检测成功，n 为双分号中最后一个分号的下标位置
// n === chunk.length 代表未找到结尾位置，也许在结尾在后续块中
function detect_header_end(chunk) {
	for (var i = 0; i < chunk.length; ++i) {
		// 检查是否越界
		if (i >= max_size) {
			// 越界了
			return -1
		}
		// 判断是否有连分号
		if (chunk[i] === semicolon && (i+1) < chunk.length && chunk[i+1] === semicolon) {
			// 找到了
			return (i+1)
		}
	}
	// 未找到结尾位置，也许在后续块中
	return chunk.length
}

function test_detect_header_end() {
	assert(detect_header_end(new Buffer('')) === 0)
	assert(detect_header_end(new Buffer('a')) === 1)
	assert(detect_header_end(new Buffer('aaaaaaaaaaa')) === 'aaaaaaaaaaa'.length)
	assert(detect_header_end(new Buffer(';')) === 1)
	assert(detect_header_end(new Buffer(';;')) === 1)
	assert(detect_header_end(new Buffer('a;;')) === 2)
	assert(detect_header_end(new Buffer('a;;;')) === 2)
	assert(detect_header_end(new Buffer('a;;b')) === 2)
	assert(detect_header_end(new Buffer('a;;bbbbb')) === 2)
	return true
}

function assert(v) {
	if (!v) {
		throw new Error('assert failed')
	}
}

console.log('test_detect_header_end:', test_detect_header_end())