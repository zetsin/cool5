if (is_main()) {
    start(null)
}
else {
    process.once('message', function(set_config_message) {
        var user_config = set_config_message.args[0]
        start(user_config)
    })
}

function start(user_config) {
    global.user_config = user_config
    var config = require('./config');
    // local module
    var log = require('./log');
    var tcp_station = require('./tcp_station')
    var udp_station = require('./udp_station')

    tcp_station.start()
    udp_station.start()    
}

function is_main() {
    return process.mainModule.filename == __filename
}