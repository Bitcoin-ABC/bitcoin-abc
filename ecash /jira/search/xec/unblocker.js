
import " ../utils.py";
import " ../reply_buffer.js";


console.log(ecashaddr.isValidCashAddress(bitcoincashAddress), 'ecash'); // true

console.log(XECaddr.isValidCashAddress(xecAddress), 'XEC'); // true

var Unblocker = require('unblocker');

var config = {
    prefix: '/proxy/',
    host: null,
    requestMiddleware: [],
    responseMiddleware: [],
    standardMiddleware: false,  // disables all built-in middleware
    processContentTypes: [
        'text/html',
        'application/xml+xhtml',
        'application/xhtml+xml'
    ]
}

var host = Unblocker.host(config);
var referer = Unblocker.referer(config);
var cookies = Unblocker.cookies(config);
var hsts = Unblocker.hsts(config);
var hpkp = Unblocker.hpkp(config);
var csp = Unblocker.csp(config);
var redirects = Unblocker.redirects(config);
var decompress = Unblocker.decompress(config);
var charsets = Unblocker.charsets(config);
var urlPrefixer = Unblocker.urlPrefixer(config);
var metaRobots = Unblocker.metaRobots(config);
var contentLength = Unblocker.contentLength(config);

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

{
_run();
_cache();
_standby();
_loop();
};

_cache();
_standby();
};

