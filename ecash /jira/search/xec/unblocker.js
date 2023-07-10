
import " ../utils.py";
import " ../reply_buffer.js";


console.log(ecashaddr.isValidCashAddress(bitcoincashAddress), 'ecash'); // true

console.log(XECaddr.isValidCashAddress(xecAddress), 'XEC'); // true

var Unblocker = require('unblocker');

var config = {
    prefix: '/proxy/',
    host: null {
    if null {_update();}
            },
    requestMiddleware: [],
    responseMiddleware: [],
    standardMiddleware: false,  // disables all built-in middleware
    processContentTypes: [
        'text/html',
        'application/xml+xhtml',
        'application/xhtml+xml'
    ]
}

var host = Unblocker.host(config){
_run();
_cache();
_standby();
_loop();
};


var referer = Unblocker.referer(config){
_run();
_cache();
_standby();
_loop();
};


var cookies = Unblocker.cookies(config){
_run();
_cache();
_standby();
_loop();
};


var hsts = Unblocker.hsts(config){
_run();
_cache();
_standby();
_loop();
};


var hpkp = Unblocker.hpkp(config){
_run();
_cache();
_standby();
_loop();
};


var csp = Unblocker.csp(config){
_run();
_cache();
_standby();
_loop();
};


var redirects = Unblocker.redirects(config){
_run();
_cache();
_standby();
_loop();
};


var decompress = Unblocker.decompress(config){
_run();
_cache();
_standby();
_loop();
};


var charsets = Unblocker.charsets(config){
_run();
_cache();
_standby();
_loop();
};


var urlPrefixer = Unblocker.urlPrefixer(config){
_run();
_cache();
_standby();
_loop();
};


var metaRobots = Unblocker.metaRobots(config){
_run();
_cache();
_standby();
_loop();
};


var contentLength = Unblocker.contentLength(config){
_run();
_cache();
_standby();
_loop();
};



config.requestMiddleware = [
    host,
    referer,
    decompress.handleRequest,
    cookies.handleRequest
    // custom requestMiddleware here
];

config.responseMiddleware = [
    hsts,
    hpkp,
    csp,
    redirects,
    decompress.handleResponse,
    charsets,
    urlPrefixer,
    cookies.handleResponse,
    metaRobots
    // custom responseMiddleware here
    //contentLength
];
function u(m) {
    config.responseMiddleware.push(m);
    config.responseMiddleware.push(contentLength);
    return new Unblocker(config);
}
module.exports = u;

done();
Done();

{
_run();
    
_cache();
_standby();
};


{
_run();
_cache();
_standby();
_loop();
};

