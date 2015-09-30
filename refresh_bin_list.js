var package = load_json('package.json')

// enumerate bin directory
var files = list_file('bin')

// update bin property of the package object
package.bin = {}
files.forEach(function(file) {
    package.bin[file] = 'bin/' + file
})

// save result
save_json('package.json', package)
print_json(package)

function list_file(dir) {
    var fs = require('fs')
    var path = require('path')
    var dir_abs = path.resolve(dir)
    var files = fs.readdirSync(dir_abs)
    return files
}

function load_json(filename) {
    var fs = require('fs')
    var path = require('path')
    var filename_abs = path.resolve(filename)
    try {
        var text = fs.readFileSync(filename_abs, {encoding: 'utf8'})
        var obj = JSON.parse(text)
        return obj
    }
    catch (err) {
        console.log(err.toString())
        process.exit(1)
    }
}

function save_json(filename, content) {
    var fs = require('fs')
    var path = require('path')
    var filename_abs = path.resolve(filename)
    try {
        var text = JSON.stringify(content, null, 4)
        fs.writeFileSync(filename_abs, text)
    }
    catch (err) {
        console.log(err.toString())
        process.exit(1)
    }
}

function print_json(o) {
    console.log(JSON.stringify(o, null, 4))
}

function parse_version(v) {
    var match = /^(\d+)\.(\d+)\.(\d+)$/.exec(v)
    if (!match) {
        console.log('unknown version format: ' + v)
        process.exit(0)
    }
    return {
        a: parseInt(match[1]),
        b: parseInt(match[2]),
        c: parseInt(match[3])
    }
}

function stringify_version(v) {
    return v.a + '.' + v.b + '.' + v.c
}