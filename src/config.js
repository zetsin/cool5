var path = require('path')

// load base config file first
// if failed, application can not start up
try {
	var base_config = load_config(relative_current_dir('./base.json'))
}
catch (err) {
	// print info and exit the application
	console.log('[config] load base config file failed: base.json')
	process.exit(1)
}

var yargs = require('yargs')
var argv = yargs
				.usage('Usage: $0 [options]')
				.demand('c').alias('c', 'config').describe('c', 'config file name')
				.help('h').alias('h', 'help')
				.argv

// load user config file
// if failed, application can not start up
try {
	var user_config_file = path.resolve(argv.c)
	var user_config = load_config(user_config_file)
}
catch (err) {
	// print info and exit the application
	console.log('[config] load config file failed: ' + user_config_file)
	process.exit(1)
}

// we user prototype link to implement overriding,
// override relationship (left override right) is:
// final_config --> user_config --> base_config

var final_config = {}
final_config.__proto__ = user_config
user_config.__proto__ = base_config

checkConfig(final_config)

// ok, we can export the final_config via our 'get' function on this module
// we don't expose the final_config object to outside because we don't permit any module
// to modify final_config object, and it helps us to hidden the details about
// how we orgnize the config info internally

exports.get = function(name) {

	// name must be provided and type of it must be string
	// and not empty
	if (typeof name !== 'string' || name === '') {
		console.log('[config] invalid arguments, name=' + name)
		process.exit(1)
	}

	var value = final_config[name]

	if (value === undefined || value === null) {
		console.log('[config] warning, value of ' + name + ' is ' + value)
	}

	return value
}

// we need to check the config object
// to make sure that every config value has been setted properly
// [notice]
// if check failed, this function will print info and exit current application
function checkConfig(config) {
	// TODO
	return true
}

// load config file, JSON format
function load_config(file) {
	var fs = require('fs')
	var content = fs.readFileSync(file, {encoding: 'utf8'})
	var obj = JSON.parse(content)
	return obj
}

// calulate full path relative to current directory
function relative_current_dir(path) {
	return require('path').resolve(__dirname, path)
}