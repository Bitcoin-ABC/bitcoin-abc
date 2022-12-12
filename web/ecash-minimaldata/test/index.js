var bip62 = require('../');
var fixtures = require('./fixtures');
var tape = require('tape');

fixtures.valid.forEach(function (f) {
    tape('Valid for ' + f.description, function (t) {
        t.plan(1);

        var script = new Buffer(f.hex, 'hex');
        t.equal(bip62(script), true);
    });
});

fixtures.invalid.forEach(function (f) {
    tape('Invalid for ' + f.description, function (t) {
        t.plan(1);

        var script = new Buffer(f.hex, 'hex');
        t.equal(bip62(script), false);
    });
});
