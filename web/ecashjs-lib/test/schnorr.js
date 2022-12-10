/* global describe, it */

var assert = require('assert');
var bcrypto = require('../src/crypto');
var schnorr = require('../src/schnorr');
var sinon = require('sinon');

var BigInteger = require('bigi');
var ECSignature = require('../src/ecsignature');

var curve = schnorr.__curve;

var fixtures = require('./fixtures/schnorr.json');

describe('schnorr', function () {
    schnorr.__useRFC6979(false);

    describe('sign', function () {
        fixtures.sign.forEach(function (d) {
            it(
                'produces a deterministic signature for "' + d.m + '"',
                function () {
                    var x = BigInteger.fromHex(d.x);
                    var m = Buffer.from(d.m, 'hex');
                    var signature = schnorr.sign(m, x).toRSBuffer();

                    assert.strictEqual(
                        signature.toString('hex'),
                        d.sig.toLowerCase(),
                    );
                },
            );
        });
    });

    describe('verify', function () {
        fixtures.sign.forEach(function (d) {
            it('verifies own signature for "' + d.m + '"', function () {
                var x = BigInteger.fromHex(d.x);
                var P = curve.G.multiply(x);
                var m = Buffer.from(d.m, 'hex');
                var signature = schnorr.sign(m, x);

                assert(schnorr.verify(m, signature, P));
            });
        });

        fixtures.valid.forEach(function (d) {
            it('verifies a valid signature for "' + d.m + '"', function () {
                var P = schnorr.fromCompressedPoint(Buffer.from(d.P, 'hex'));
                var m = Buffer.from(d.m, 'hex');
                var signature = ECSignature.fromRSBuffer(
                    Buffer.from(d.sig, 'hex'),
                );

                assert(schnorr.verify(m, signature, P));
            });
        });

        fixtures.invalid.forEach(function (d) {
            it('fails to verify with "' + d.m + '"', function () {
                var P = schnorr.fromCompressedPoint(Buffer.from(d.P, 'hex'));
                var m = Buffer.from(d.m, 'hex');
                var signature = ECSignature.fromRSBuffer(
                    Buffer.from(d.sig, 'hex'),
                );

                assert.strictEqual(schnorr.verify(m, signature, P), false);
            });
        });
    });

    schnorr.__useRFC6979(false);
});
