// native module
var chp = require('child_process')
var path = require('path')

// global varialble of current child process
var child

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