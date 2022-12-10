var typeforce = require('typeforce');
var types = require('./types');

var BigInteger = require('bigi');
var ECSignature = require('./ecsignature');
var crypto = require('./crypto');

var ecurve = require('ecurve');
var secp256k1 = ecurve.getCurveByName('secp256k1');

var deterministicGenerateK = require('./rfc6979').deterministicGenerateK;

var USE_RFC6979 = true;
function sign(h, x) {
    typeforce(types.tuple(types.BufferN(32), types.BigInt), arguments);

    var n = secp256k1.n;
    var G = secp256k1.G;

    if (x.compareTo(BigInteger.ZERO) <= 0 || x.compareTo(n) >= 0) {
        throw new Error('Private key x not in range');
    }

    var P = G.multiply(x);

    var r, s;
    function signWithK(k) {
        var R = G.multiply(k);

        // sign chosen so that the Y coordinate of R has Jacobi symbol 1
        if (jacobi(R.affineY, secp256k1.p) != 1) {
            k = n.subtract(k);
            R = G.multiply(k);
        }

        r = R.affineX.mod(n);

        var BP = toCompressedPoint(P);
        var Br = r.toBuffer(32);

        var eh = crypto.sha256(Buffer.concat([Br, BP, h]));
        var e = BigInteger.fromBuffer(eh).mod(n);

        s = k.add(e.multiply(x)).mod(n);

        return true;
    }

    if (USE_RFC6979) {
        deterministicGenerateK(
            h,
            x.toBuffer(32),
            signWithK,
            Buffer.from('Schnorr+SHA256  ', 'ascii'),
        );
    } else {
        var kh = crypto.sha256(Buffer.concat([x.toBuffer(32), h]));
        var k = BigInteger.fromBuffer(kh).mod(n);
        signWithK(k);
    }

    return new ECSignature(r, s);
}

// https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/2019-05-15-schnorr.md#signature-verification-algorithm
function verify(h, signature, P) {
    typeforce(
        types.tuple(types.BufferN(32), types.ECSignature, types.ECPoint),
        arguments,
    );

    var n = secp256k1.n;
    var G = secp256k1.G;

    var r = signature.r;
    var s = signature.s;

    // 1. Fail if point P is not actually on the curve, or if it is the point at infinity.
    if (!secp256k1.isOnCurve(P)) return false;
    if (secp256k1.isInfinity(P)) return false;

    // 2. Fail if r >= p, where p is the field size used in secp256k1.
    if (r.compareTo(secp256k1.p) >= 0) return false;

    // 3. Fail if s >= n, where n is the order of the secp256k1 curve.
    if (s.compareTo(n) >= 0) return false;

    // 4. Let BP be the 33-byte encoding of P as a compressed point.
    var BP = toCompressedPoint(P);

    // 5. Let Br be the 32-byte encoding of r as an unsigned big-endian 256-bit integer.
    var Br = r.toBuffer(32);

    // 6. Compute integer e = H(Br | BP | h) mod n.
    var h = crypto.sha256(Buffer.concat([Br, BP, h]));
    var e = BigInteger.fromBuffer(h).mod(n);

    // 7. Compute elliptic curve point R' = sG + (-e)P, where G is the secp256k1 generator point.
    var R = G.multiply(s).add(P.multiply(n.subtract(e)));

    // 8. Fail if R' is the point at infinity.
    if (secp256k1.isInfinity(R)) return false;

    // 9. Fail if the X coordinate of R' is not equal to r.
    if (R.affineX.compareTo(r) != 0) return false;

    // 10. Fail if the Jacobi symbol of the Y coordinate of R' is not 1.
    if (jacobi(R.affineY, secp256k1.p) != 1) return false;

    // 11. Otherwise, the signature is valid
    return true;
}

function jacobi(a, p) {
    return a
        .modPow(p.subtract(BigInteger.ONE).divide(BigInteger.valueOf(2)), p)
        .intValue();
}

function toCompressedPoint(P) {
    typeforce(types.tuple(types.ECPoint), arguments);

    return Buffer.concat([
        Buffer.from([P.affineY.isEven() ? 0x02 : 0x03]),
        P.affineX.toBuffer(32),
    ]);
}

function fromCompressedPoint(buffer) {
    typeforce(types.tuple(types.BufferN(33)), arguments);

    if (buffer.length !== 33) throw new Error('Invalid length of buffer');
    if (buffer[0] !== 0x2 && buffer[0] !== 0x3)
        throw new Error('Invalid signum byte');

    var isOdd = buffer[0] === 0x3;
    var x = BigInteger.fromBuffer(buffer.slice(1, 33));

    return secp256k1.pointFromX(isOdd, x);
}

module.exports = {
    deterministicGenerateK: deterministicGenerateK,
    sign: sign,
    verify: verify,

    jacobi: jacobi,
    toCompressedPoint: toCompressedPoint,
    fromCompressedPoint: fromCompressedPoint,

    // TODO: remove
    __curve: secp256k1,
    __useRFC6979: function (use) {
        USE_RFC6979 = use;
    },
};
