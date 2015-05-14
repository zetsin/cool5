var express = require('express');
var router = express.Router();
var config = require('../../config')
var obzvr_data = require('../obzvr_data')

router.get('/', function(req, res) {
	res.render('index', obzvr_data.get());
})

module.exports = router;
