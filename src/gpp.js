var config = require('./config')

// 几个常量
var semicolon = 0x3b
var equal_sign = 0x3d
var max_size = config.get('gpp.header.max_size')

// 导出
exports.HeaderParser = HeaderParser

// 这个类用于持续的完成头部解析
// 由于解析是一个分块处理的过程，因此使用这个类会很方便
function HeaderParser() {
	this.status = 0				// 状态编号 0 头部尚未解析，1 头部正在解析中，2 头部已经成功解析，-1 头部解析失败
	this.header = null			// 解析成功后这里会保存解析好的 header
	this.header_chunk = null	// 需要时会把 chunk 合并起来暂存到这里
	this.tail_chunk = null		// 解析成功后这里会包含余下的 chunk
}

// 投递新的块给当前解析器，继续完成解析
HeaderParser.prototype.eat = function(chunk) {
	var self = this

	// 头部尚未解析过，这是第一块数据
	if (self.status === 0) {
		process(chunk)
	}
	// 上次数据不足，这次继续解析
	else if (self.status === 1) {
		// 先把新数据块与之前的合并
		self.header_chunk = Buffer.concat([self.header_chunk, chunk])
		// 然后处理
		process(self.header_chunk)
	}
	else {
		// 无效状态，抛出异常
		throw new Error('HeaderParser.eat() invalid status, status=' + self.status)
	}

	function process(chunk) {
		var end = detect_header_end(chunk)
		if (end < 0) {
			// 头部非法，没有找到结尾（越界）
			self.status = -1
		}
		else if (end === chunk.length) {
			// 需要更多的块
			// 我们把这一块先暂存起来
			self.status = 1
			self.header_chunk = chunk
		}
		else {
			// 解析一下
			parse(chunk, end)
		}
	}

	function parse(chunk, end) {
		// 如果真的存在 tail_chunk 就分割一下
		// 否则不需要（也不能，因为 split_chunk 的参数要求比较严格）
		if (chunk.length >= 2 && end <= chunk.length-2) {
			var tmp = split_chunk(chunk, end)
			self.header_chunk = tmp[0]
			self.tail_chunk = tmp[1]
		}
		else {
			self.header_chunk = chunk
		}
		// 转换为字符串进行解析
		var header_text = self.header_chunk.toString('utf8')
		self.header = parse_header_text(header_text)
		// 成功了
		self.status = 2
	}
}

HeaderParser.prototype.is_finished = function() {
	// 不管成功或失败都算结束
	return this.status === -1 || this.status === 2
}

HeaderParser.prototype.is_successful = function() {
	return this.status === 2
}

HeaderParser.prototype.get_header = function() {
	return this.header
}

HeaderParser.prototype.exists_tail_chunk = function() {
	return this.tail_chunk !== null
}

HeaderParser.prototype.get_tail_chunk = function() {
	return this.tail_chunk
}

// 这个函数用于解析 header 文本为对象
// 参数 text 必须以 ;; 结尾
function parse_header_text(text) {
	if (text.length < 2 || !(text[text.length-1] === ';' && text[text.length-2] === ';')) {
		throw new Error('parse_header_text(): invalid text, text=' + text)
	}

	// 以分号 ; 进行分割
	var pairs = text.split(';')
	// 移除空串
	pairs = pairs.filter(function(p) {
		return p.length > 0
	})
	// 映射成对
	pairs = pairs.map(function(p) {
		// 根据等号进行分割
		// 注意只从第一个等号出现的位置进行分割
		// 因此如果有多个等号，那么后续的等号会作为 value 部分
		var i = p.indexOf('=')
		if (i === -1) {
			// 可以没有等号
			return {
				name: p,
				value: ''
			}
		}
		else {
			return {
				name: p.substring(0, i),
				value: p.substring(i+1)
			}
		}
	})
	// 组成 object
	var header = {}
	pairs.forEach(function(p) {
		// name 统一转成小写便于处理
		header[p.name.toLowerCase()] = p.value
	})
	// 返回结果
	return header
}

// 将一个 chunk 从指定位置 i 处分为两个 chunk
// 其中 i 处的字节属于前一个 chunk
// 注意 chunk 至少要有 2 个字节
// 另外 i 的范围为 [0, chunk.length-2]
function split_chunk(chunk, i) {
	if (chunk.length < 2) {
		throw new Error('split_chunk(): can not split cause chunk.length < 2. chunk.length=' + chunk.length)
	}

	if (i < 0 || i > chunk.length-2) {
		throw new Error('split_chunk(): invalid range, i must be [0, chunk.length-2]. chunk.length=' + chunk.length + ', i=' + i)
	}
	var head = new Buffer(i+1)
	var tail = new Buffer(chunk.length - (i+1))
	chunk.copy(head, 0, 0, head.length)
	chunk.copy(tail, 0, i+1, tail.length)
	return [head, tail]
}

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