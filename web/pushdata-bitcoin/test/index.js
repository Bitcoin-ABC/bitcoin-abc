var pushdata = require('../');
var fixtures = require('./fixtures');
var tape = require('tape');

fixtures.valid.forEach(function (f) {
    tape('Valid for ' + f.hex, function (t) {
        t.plan(5);
        var fopcode = parseInt(f.hex.substr(0, 2), 16);
        var size = pushdata.encodingLength(f.dec);
        t.strictEqual(size, f.hex.length / 2);

        var buffer = new Buffer(f.hex, 'hex');
        var d = pushdata.decode(buffer, 0);

        t.strictEqual(d.opcode, fopcode);
        t.strictEqual(d.number, f.dec);
        t.strictEqual(d.size, buffer.length);

        buffer.fill(0);
        var n = pushdata.encode(buffer, f.dec, 0);
        t.strictEqual(buffer.slice(0, n).toString('hex'), f.hex);
    });
});

fixtures.invalid.forEach(function (f) {
    tape('Invalid for ' + f.description, function (t) {
        t.plan(1);

        var buffer = new Buffer(f.hex, 'hex');
        var n = pushdata.decode(buffer, 0);
        t.strictEqual(n, null);
    });
});
