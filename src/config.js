var path = require('path')

var base_config
var user_config
var final_config

load_base_config()
load_user_config()
generate_final_config()

function load_base_config() {
	if (global.base_config) {
		base_config = global.base_config
		return
	}

	// load base config file first
	// if failed, application can not start up
	try {
		base_config = load_config(relative_current_dir('./base.json'))
	}
	catch (err) {
		// print info and exit the application
		console.log('[config] load base config file failed: base.json')
		process.exit(1)
	}
}

function load_user_config() {
	if (global.user_config) {
		user_config = global.user_config
		return
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
		user_config = load_config(user_config_file)
	}
	catch (err) {
		// print info and exit the application
		console.log('[config] load config file failed: ' + user_config_file)
		process.exit(1)
	}	
}

function generate_final_config() {
	// we user prototype link to implement overriding,
	// override relationship (left override right) is:
	// final_config --> user_config --> base_config

	final_config = combine(base_config, user_config)
	print_config(final_config)
	check_config(final_config)
}

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
function check_config(config) {
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

function combine(base_config, user_config) {
	var o = {}
	copy(base_config, o)
	copy(user_config, o)
	return o

	function copy(src, dst) {
		for (var name in src) {
			if (src.hasOwnProperty(name)) {
				dst[name] = src[name]
			}
		}
	}
}

function print_config(final_config) {
	// dump property list
	var property_list = []
	for (var name in final_config) {
		if (final_config.hasOwnProperty(name)) {
			property_list.push({
				name: name,
				value: final_config[name]
			})
		}
	}
	// align property name in property list
	property_list = align(property_list)
	// output
	property_list.forEach(function(property) {
		console.log(property.name + ' = ' + property.value)
	})
	console.log('--------------------------------')

	function align(property_list) {
		var max_len = 0
		// which name is the longest ?
		property_list.forEach(function(property) {
			if (property.name.length > max_len) max_len = property.name.length
		})
		// padding every name as the longgest name
		new_property_list = property_list.map(function(property) {
			return {
				name: padding(property.name, max_len),
				value: property.value
			}
		})
		// return result
		return new_property_list

		function padding(name, to_length) {
			var rest = to_length - name.length
			if (rest <= 0) return name
			else return name + sp(rest)

			function sp(count) {
				var t = ''
				while (count-- > 0) {
					t += ' '
				}
				return t
			}
		}
	}
}