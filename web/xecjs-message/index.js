const bufferEquals = require('buffer-equals');
const createHash = require('create-hash');
const secp256k1 = require('secp256k1');
const varuint = require('varuint-bitcoin');
const ecashaddr = require('ecashaddrjs');

function sha256(b) {
    return createHash('sha256').update(b).digest();
}
function hash256(buffer) {
    return sha256(sha256(buffer));
}
function hash160(buffer) {
    return createHash('ripemd160').update(sha256(buffer)).digest();
}

function encodeSignature(signature, recovery, compressed) {
    if (compressed) recovery += 4;

    return Buffer.concat([Buffer.alloc(1, recovery + 27), signature]);
}

function decodeSignature(buffer) {
    if (buffer.length !== 65) throw new Error('Invalid signature length');

    const flagByte = buffer.readUInt8(0) - 27;
    if (flagByte > 15 || flagByte < 0) {
        throw new Error('Invalid signature parameter');
    }

    return {
        compressed: !!(flagByte & 12),
        recovery: flagByte & 3,
        signature: buffer.slice(1),
    };
}

function magicHash(message, messagePrefix) {
    messagePrefix = messagePrefix || '\u0016eCash Signed Message:\n';
    if (!Buffer.isBuffer(messagePrefix)) {
        messagePrefix = Buffer.from(messagePrefix, 'utf8');
    }
    if (!Buffer.isBuffer(message)) {
        message = Buffer.from(message, 'utf8');
    }
    const messageVISize = varuint.encodingLength(message.length);
    const buffer = Buffer.allocUnsafe(
        messagePrefix.length + messageVISize + message.length,
    );
    messagePrefix.copy(buffer, 0);
    varuint.encode(message.length, buffer, messagePrefix.length);
    message.copy(buffer, messagePrefix.length + messageVISize);
    return hash256(buffer);
}

function prepareSign(messagePrefixArg, sigOptions) {
    if (typeof messagePrefixArg === 'object' && sigOptions === undefined) {
        sigOptions = messagePrefixArg;
        messagePrefixArg = undefined;
    }
    let { extraEntropy } = sigOptions || {};

    return {
        messagePrefixArg,
        extraEntropy,
    };
}

function isSigner(obj) {
    return obj && typeof obj.sign === 'function';
}

function sign(message, privateKey, compressed, messagePrefix, sigOptions) {
    const { messagePrefixArg, extraEntropy } = prepareSign(
        messagePrefix,
        sigOptions,
    );
    const hash = magicHash(message, messagePrefixArg);
    const sigObj = isSigner(privateKey)
        ? privateKey.sign(hash, extraEntropy)
        : secp256k1.sign(hash, privateKey, { data: extraEntropy });
    return encodeSignature(sigObj.signature, sigObj.recovery, compressed);
}

function signAsync(message, privateKey, compressed, messagePrefix, sigOptions) {
    let messagePrefixArg, extraEntropy;
    return Promise.resolve()
        .then(() => {
            ({ messagePrefixArg, extraEntropy } = prepareSign(
                messagePrefix,
                sigOptions,
            ));
            const hash = magicHash(message, messagePrefixArg);
            return isSigner(privateKey)
                ? privateKey.sign(hash, extraEntropy)
                : secp256k1.sign(hash, privateKey, { data: extraEntropy });
        })
        .then(sigObj => {
            return encodeSignature(
                sigObj.signature,
                sigObj.recovery,
                compressed,
            );
        });
}

function verify(message, xecAddress, signature, messagePrefix) {
    if (!Buffer.isBuffer(signature))
        signature = Buffer.from(signature, 'base64');

    const parsed = decodeSignature(signature);

    // Since Electrum ABC supports bitcoin signed messages, test for them by default
    const hashBitcoinSigned = magicHash(
        message,
        '\u0018Bitcoin Signed Message:\n',
    );
    const publicKeyBitcoinSigned = secp256k1.recover(
        hashBitcoinSigned,
        parsed.signature,
        parsed.recovery,
        parsed.compressed,
    );
    const publicKeyHashBitcoinSigned = hash160(publicKeyBitcoinSigned);

    // Test for default eCash prefix or user specified prefix
    const hashEcashSigned = magicHash(message, messagePrefix);
    const publicKeyEcashSigned = secp256k1.recover(
        hashEcashSigned,
        parsed.signature,
        parsed.recovery,
        parsed.compressed,
    );
    const publicKeyHashEcashSigned = hash160(publicKeyEcashSigned);

    let actualBitcoinSigned, actualEcashSigned, expected;

    actualBitcoinSigned = publicKeyHashBitcoinSigned;
    actualEcashSigned = publicKeyHashEcashSigned;

    // Decode from XEC address instead of bs58 legacy format
    const decodedAddress = ecashaddr.decode(xecAddress);

    expected = Buffer.alloc(decodedAddress.hash.length);
    expected.set(decodedAddress.hash);

    if (bufferEquals(actualEcashSigned, expected)) {
        console.log(`eCash signed message`);
    }

    return (
        bufferEquals(actualEcashSigned, expected) ||
        bufferEquals(actualBitcoinSigned, expected)
    );
}

module.exports = {
    magicHash: magicHash,
    sign: sign,
    signAsync: signAsync,
    verify: verify,
};
