// native module
var chp = require('child_process')
var path = require('path')

// global varialble of current child process
var child

var on_message_callback_table = {
    'set_config': null,
    'query_stat': null
}

exports.start = function(user_config) {
    if (child) {
        throw new Error('You can not start an new instance before stop the old one!')
    }
    
    // fork an new process to start
    var module_path = path.resolve(__dirname, 'child.js')
    var child_argv = process.argv.slice(2)
    child = chp.fork(module_path, child_argv).on('error', function(err) {
        child = null
        console.error(err.toString())
    })
    child.on('exit', function(code, signal) {
        child = null
    })
    child.on('message', function(m) {
        var callback = on_message_callback_table[m.res_action]
        if (callback) callback(m)
    })
    // send an set config message to child
    var set_config_message = {
        action: 'set_config',
        args: [user_config]
    }
    child.send(set_config_message)
}

exports.stop = function() {
    if (child) {
        child.kill()
        child.removeAllListeners()
        child = null
    }
}

// # cb(stat_by_gmid)
exports.query_stat = function(cb) {
    cb = cb || function() {}
    if (!child) {
        cb({})
    }
    else {
        on_message_callback_table['query_stat'] = function(message) {
            var stat_by_gmid = message.result
            cb(stat_by_gmid)
        }
        child.send({
            action: 'query_stat',
            args: []
        })
    }
}