#!/usr/bin/env node
var app = require('./app');
var config = require('../config')
var log = require('../log')

var obzvr_config = config.get('obzvr')

app.set('port', obzvr_config.port);
app.set('host', obzvr_config.host);

var server = app.listen(app.get('port'), app.get('host'), function() {
	log.info('#obzvr# web server listening on host ${0} port ${1} ', [server.address().address ,server.address().port]);
});
