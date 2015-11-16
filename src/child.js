if (is_main()) {
    start(null)
}
else {
    process.on('message', function(message) {
        if (message.action === 'set_config') {
            var set_config_message = message
            var user_config = set_config_message.args[0]
            start(user_config)
        }
        else if (message.action === 'query_stat') {
            var gstat = require('./gstat')
            var stat_by_gmid = gstat.query_all()
            process.send({
                res_action: 'query_stat',
                result: stat_by_gmid
            })
        }
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
    //return process.mainModule.filename == __filename
    return !process.send
}