const test = require('tape').test;
const bitcoin = require('bitcoinjs-lib');
const BigInteger = require('bigi');
const secp256k1 = require('secp256k1');
const message = require('../');

const fixtures = require('./fixtures.json');

function getMessagePrefix(networkName) {
    return fixtures.networks[networkName];
}

fixtures.valid.magicHash.forEach(f => {
    test(
        'produces the magicHash for "' + f.message + '" (' + f.network + ')',
        t => {
            const actual = message.magicHash(
                f.message,
                getMessagePrefix(f.network),
            );
            t.same(actual.toString('hex'), f.magicHash);
            t.end();
        },
    );
});

fixtures.valid.sign.forEach(f => {
    test('sign: ' + f.description, async t => {
        const pk = new bitcoin.ECPair(new BigInteger(f.d)).d.toBuffer(32);
        const signer = (hash, ex) => secp256k1.sign(hash, pk, { data: ex });
        const signerAsync = async (hash, ex) =>
            secp256k1.sign(hash, pk, { data: ex });
        let signature = message.sign(
            f.message,
            pk,
            false,
            getMessagePrefix(f.network),
        );
        let signature2 = message.sign(
            f.message,
            { sign: signer },
            false,
            getMessagePrefix(f.network),
        );
        let signature3 = await message.signAsync(
            f.message,
            { sign: signerAsync },
            false,
            getMessagePrefix(f.network),
        );
        let signature4 = await message.signAsync(
            f.message,
            { sign: signer },
            false,
            getMessagePrefix(f.network),
        );
        let signature5 = await message.signAsync(
            f.message,
            pk,
            false,
            getMessagePrefix(f.network),
        );
        t.same(signature.toString('base64'), f.signature);
        t.same(signature2.toString('base64'), f.signature);
        t.same(signature3.toString('base64'), f.signature);
        t.same(signature4.toString('base64'), f.signature);
        t.same(signature5.toString('base64'), f.signature);

        if (f.compressed) {
            signature = message.sign(
                f.message,
                pk,
                true,
                getMessagePrefix(f.network),
            );
            t.same(signature.toString('base64'), f.compressed.signature);
        }

        t.end();
    });
});

fixtures.valid.verify.forEach(f => {
    test(
        'verifies a valid signature for "' +
            f.message +
            '" (' +
            f.network +
            ')',
        t => {
            t.true(
                message.verify(
                    f.message,
                    f.address,
                    f.signature,
                    getMessagePrefix(f.network),
                ),
            );

            if (f.network === 'bitcoin') {
                // defaults to bitcoin network
                t.true(message.verify(f.message, f.address, f.signature));
            }

            if (f.compressed) {
                t.true(
                    message.verify(
                        f.message,
                        f.compressed.address,
                        f.compressed.signature,
                        getMessagePrefix(f.network),
                    ),
                );
            }

            t.end();
        },
    );
});

fixtures.invalid.signature.forEach(f => {
    test('decode signature: throws on ' + f.hex, t => {
        t.throws(() => {
            message.verify(null, null, Buffer.from(f.hex, 'hex'), null);
        }, new RegExp('^Error: ' + f.exception + '$'));
        t.end();
    });
});

fixtures.invalid.verify.forEach(f => {
    test(f.description, t => {
        t.false(
            message.verify(
                f.message,
                f.address,
                f.signature,
                getMessagePrefix('bitcoin'),
            ),
        );
        t.end();
    });
});

fixtures.randomSig.forEach(f => {
    test(f.description, t => {
        const keyPair = bitcoin.ECPair.fromWIF(f.wif);
        const privateKey = keyPair.d.toBuffer(32);
        const address = keyPair.getAddress();
        f.signatures.forEach(s => {
            const signature = message.sign(
                f.message,
                privateKey,
                keyPair.compressed,
                { extraEntropy: Buffer.from(s.sigData, 'base64') },
            );
            t.true(message.verify(f.message, address, signature));
        });
        t.end();
    });
});

test('Check that Buffers and wrapped Strings are accepted', t => {
    const keyPair = bitcoin.ECPair.fromWIF(
        'L3n3e2LggPA5BuhXyBetWGhUfsEBTFe9Y6LhyAhY2mAXkA9jNE56',
    );
    const privateKey = keyPair.d.toBuffer(32);

    // eslint-disable-next-line no-new-wrappers
    const sig = message.sign(
        Buffer.from('Sign me', 'utf8'),
        privateKey,
        true,
        Buffer.from([1, 2, 3, 4]),
    );
    t.equals(
        sig.toString('hex'),
        '1f00e7f53fb54da299b981de40b15ffb7cb7e43842f95c04b07b2c08e7668ce5134d1fbacfb60e841cdcf0e6f5d9ca2bf7bd6820b2136aae79563f7d2d7975ee58',
    );

    t.end();
});
