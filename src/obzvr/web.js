#!/usr/bin/env node
var app = require('./app');
var config = require('../config')
var log = require('../log')

app.set('port', config.get("obzvr.port"));
app.set('host', config.get("obzvr.host"));

var server = app.listen(app.get('port'), app.get('host'), function() {
	log.info('#obzvr# web server listening on host ${0} port ${1} ', [server.address().address ,server.address().port]);
});
