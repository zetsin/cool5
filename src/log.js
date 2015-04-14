// current module depend on config module
// to retrive some config value that could enable file log etc.

var config = require('./config')
var mkdirp = require('mkdirp')
var fs = require('fs')
var path = require('path')

// create the log directory
// if exists already, no error occurs

var logconfig = config.get('log')
if (logconfig.enabled) {
    mkdirp(logconfig.directory, function(err) {
        if (err) {
            log('error', tstr('create log directory failed: ${directory}', logconfig))
            process.exit(1)            
        }
    })
}

exports.info = function(str, v) {
	var text = tstr(str, v)
	log('info', text)
}

exports.warning = function(str, v) {
	var text = tstr(str, v)
	log('warning', text)
}

exports.error = function(str, v) {
	var text = tstr(str, v)
	log('error', text)
}

exports.debug = function(str, v) {
	var text = tstr(str, v)
	log('debug', text)
}

// this function is the core function of this module
// it implemented all the actually work to output the
// log info to screen or file
function log(level, text) {
    if (logconfig.enabled) {
        log_file(level, text)
        log_tty(level, text)
    }
    else {
        log_tty(level, text)
    }

    function log_tty(level, text) {
        var str = tstr('${dateTime} [${level|upper}] ${text}', {
            dateTime: dateTimeStr(new Date()),
            level: level,
            text: text
        })
        if (level === 'error') {
            console.error(str)
        }
        else {
            console.log(str)
        }
    }

    function log_file(level, text) {
        var str = tstr('${dateTime} ${text}\n', {
            dateTime: dateTimeStr(new Date()),
            text: text
        })
        var filename = tstr('${date} ${level|upper}.txt', {
            date: dateStr(new Date()),
            level: level
        })
        filename = path.resolve(logconfig.directory, filename)
        fs.appendFile(filename, str, function(err) {
            if (!err) return
            // well, we have to print this problem to tty
            var warning = tstr('log module append content to file failed, filename is ${filename}, and reason is ${reason}', {
                filename: filename, 
                reason: err.toString()
            })
            log_tty('warning', warning)
        })
    }
}

function dateTimeStr(dateTime, local) {
    return tstr('${date} ${time}', {
        date: dateStr(dateTime, local),
        time: timeStr(dateTime, local)
    })
}

function dateStr(dateTime, local) {
    var year = local ? dateTime.getFullYear() : dateTime.getUTCFullYear()
    var month = (local ? dateTime.getMonth() : dateTime.getUTCMonth()) + 1
    var date = local ? dateTime.getDate() : dateTime.getUTCDate()
    return tstr('${year}-${month}-${date}', {
        year: year.toString(),
        month: month.toString(),
        date: date.toString()
    })
}

function timeStr(dateTime, local) {
    var h = local ? dateTime.getHours() : dateTime.getUTCHours()
    var m = local ? dateTime.getMinutes() : dateTime.getUTCMinutes()
    var s = local ? dateTime.getSeconds() : dateTime.getUTCSeconds()
    return tstr('${h}:${m}:${s}', {
        h: h.toString(),
        m: m.toString(),
        s: s.toString()
    })
}

// template string function
// example:
//     tstr('http://${host}:${port}/index.html', {host: 'www.target.com', port: '8080'})
//     -> http://www.target.com:8080/index.html
function tstr(str, data, option) {

    checkArgs()
    init()
    return level_0(str, data2f(data))

    function checkArgs() {
        if (typeof str !== 'string') {
            throw new Error('[tstr] invalid argument, type of str must be string')
        }
        if (typeof data !== 'object' || data === null) {
            throw new Error('[tstr] invalid argument, type of data must be object')
        }
        // TODO check option
    }

    function level_0(str, f) {

        var pattern = /\${([^}]+)}/g
        return str.replace(pattern, function(g0, g1, pos, src) {
            var val = f(g1)
            if (val === undefined || val === null) {
                return ''
            }
            else if (typeof val !== 'string') {
                throw new Error('[level_0] type of value returned from f(' + g1 + ') is not string')
            }
            else {
                return val
            }
        })

        function checkArgs() {
            if (typeof str !== 'string') {
                throw new Error('[level_0] invalid argument, type of str must be string')
            }
            if (typeof f !== 'function') {
                throw new Error('[level_0] invalid argument, type of f must be function')
            }
        }
    }

    function data2f(data) {
        if (typeof data !== 'object' || data === null) {
            throw new Error('[data2f] invalid argument, typeof data must be object')
        }
        return queryValue
        
        function queryValue(expText) {
            filterExp = parseFilterExpression(expText)
            return executeFilterExpression(filterExp)

            function parseFilterExpression(expText) {
                // split by |
                var parts = expText.split('|')
                // clear useless whitespace of every part
                parts = parts.map(function(part) {
                    return part.trim()
                })
                // return result
                if (parts.length > 1) {
                    return {
                        name: parts[0],
                        filterNameList: parts.slice(1)
                    }
                }
                else {
                    return {
                        name: parts[0],
                        filterNameList: []
                    }
                }
            }

            function executeFilterExpression(filterExp) {
                // retrive the raw value
                var rawValue = getValue(data, filterExp.name)
                // invoke filter function on rawValue
                var value = rawValue
                filterExp.filterNameList.forEach(function(filterName) {
                    // ignore empty filterName
                    if (!filterName) {
                        return
                    }
                    var filterFun = tstr.filterMap[filterName]
                    if (typeof filterFun !== 'function') {
                        throw new Error('[executeFilterExpression] filter function not found: ' + filterName)
                    }
                    // try invoke the filterFun
                    try {
                        value = filterFun(value)
                    }
                    catch (err) {
                        throw new Error('[executeFilterExpression] error throwed from filter function ' + filterName + ', ' + err.toString())
                    }
                })

                // return result
                return value

                function getValue(obj, propLink) {
                    if (propLink.indexOf('.') === -1) {
                        return obj[propLink]
                    }
                    else {
                        var result = obj
                        propLink = propLink.split('.')
                        try {
                            propLink.forEach(function(prop) {
                                result = result[prop]
                            })
                        }
                        catch (err) {
                            // tolerate error
                            return ''
                        }
                        return result
                    }
                }
            }
        }

    }

    function init() {
        if (tstr.inited) {
            return
        }
        tstr.inited = true
        tstr.filterMap = {
            uri: encodeURI,
            uricom: encodeURIComponent,
            json: function(value) {
                // null is ok, but undefined is rejected
                if (value === undefined) {
                    throw new Error('[json filter] value can not be undefined')
                }
                return JSON.stringify(value)
            },
            query: function(value) {
                if (value === undefined || value === null) {
                    return ''
                }
                else if (typeof value !== 'object') {
                    throw new Error('[json filter] value is provided but it\'s type is not object')
                }
                else {
                    var obj = value
                    var list = []
                    for (var name in obj) {
                        if (typeof obj[name] === 'string') {
                            list.push(encodeURIComponent(name) + '=' + encodeURIComponent(obj[name]))
                        }
                    }
                    if (list.length > 0) {
                        return '?' + list.join('&')
                    }
                    else {
                        return ''
                    }
                }
            },
            upper: function(value) {
                if (value === undefined || value === null) {
                    return ''
                }
                else if (typeof value !== 'string') {
                    throw new Error('[upper filter] value is provided but it\'s type is not string')
                }
                else {
                    return value.toUpperCase()
                }
            },
            lower: function(value) {
                if (value === undefined || value === null) {
                    return ''
                }
                else if (typeof value !== 'string') {
                    throw new Error('[lower filter] value is provided but it\'s type is not string')
                }
                else {
                    return value.toLowerCase()
                }
            }
        }
    }
}