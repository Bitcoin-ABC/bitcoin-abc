var Buffer = require('safe-buffer').Buffer;
var createHmac = require('create-hmac');
var BigInteger = require('bigi');

var typeforce = require('typeforce');
var types = require('./types');

var ecurve = require('ecurve');
var secp256k1 = ecurve.getCurveByName('secp256k1');

var ZERO = Buffer.alloc(1, 0);
var ONE = Buffer.alloc(1, 1);

// https://tools.ietf.org/html/rfc6979#section-3.2
function deterministicGenerateK(hash, x, checkSig, algo16) {
    typeforce(
        types.tuple(types.Hash256bit, types.Buffer256bit, types.Function),
        arguments,
    );

    // Step A, ignored as hash already provided
    // Step B
    // Step C
    var k = Buffer.alloc(32, 0);
    var v = Buffer.alloc(32, 1);

    // Step D
    k = createHmac('sha256', k).update(v).update(ZERO).update(x).update(hash);

    if (algo16) {
        typeforce(typeforce.BufferN(16), algo16);

        k.update(algo16);
    }

    k = k.digest();

    // Step E
    v = createHmac('sha256', k).update(v).digest();

    // Step F
    k = createHmac('sha256', k)
        .update(v)
        .update(ONE)
        .update(x)
        .update(hash)
        .digest();

    // Step G
    v = createHmac('sha256', k).update(v).digest();

    // Step H1/H2a, ignored as tlen === qlen (256 bit)
    // Step H2b
    v = createHmac('sha256', k).update(v).digest();

    var T = BigInteger.fromBuffer(v);

    // Step H3, repeat until T is within the interval [1, n - 1] and is suitable for ECDSA
    while (T.signum() <= 0 || T.compareTo(secp256k1.n) >= 0 || !checkSig(T)) {
        k = createHmac('sha256', k).update(v).update(ZERO).digest();

        v = createHmac('sha256', k).update(v).digest();

        // Step H1/H2a, again, ignored as tlen === qlen (256 bit)
        // Step H2b again
        v = createHmac('sha256', k).update(v).digest();
        T = BigInteger.fromBuffer(v);
    }

    return T;
}

module.exports = {
    deterministicGenerateK: deterministicGenerateK,
};
