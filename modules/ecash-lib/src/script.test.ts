// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { fromHex, toHex } from './io/hex.js';
import { WriterBytes } from './io/writerbytes.js';
import { MAX_PUBKEYS_PER_MULTISIG } from './consts.js';
import { pushBytesOp } from './op.js';
import { Script } from './script.js';
import {
    OP_0,
    OP_0NOTEQUAL,
    OP_1,
    OP_3,
    OP_CHECKSIG,
    OP_CHECKMULTISIG,
    OP_CODESEPARATOR,
    OP_NOP,
    OP_ENDIF,
    OP_IF,
    OP_PUSHDATA4,
} from './opcode.js';

const wrote = (size: number, fn: (writer: WriterBytes) => void) => {
    const writer = new WriterBytes(size);
    fn(writer);
    return writer.data;
};

describe('Script', () => {
    it('Script.writeWithSize', () => {
        expect(
            wrote(1, writer => new Script().writeWithSize(writer)),
        ).to.deep.equal(fromHex('00'));

        expect(
            wrote(2, writer =>
                new Script(new Uint8Array([0x42])).writeWithSize(writer),
            ),
        ).to.deep.equal(fromHex('0142'));

        expect(
            wrote(5, writer =>
                new Script(fromHex('deadbeef')).writeWithSize(writer),
            ),
        ).to.deep.equal(fromHex('04deadbeef'));

        expect(
            wrote(9, writer =>
                new Script(fromHex('deadbeef0badcafe')).writeWithSize(writer),
            ),
        ).to.deep.equal(fromHex('08deadbeef0badcafe'));

        expect(
            wrote(26, writer =>
                new Script(
                    fromHex(
                        '76a914222222222222222222222222222222222222222288ac',
                    ),
                ).writeWithSize(writer),
            ),
        ).to.deep.equal(
            fromHex('1976a914222222222222222222222222222222222222222288ac'),
        );

        expect(
            wrote(24, writer =>
                new Script(
                    fromHex('a914333333333333333333333333333333333333333387'),
                ).writeWithSize(writer),
            ),
        ).to.deep.equal(
            fromHex('17a914333333333333333333333333333333333333333387'),
        );

        expect(
            wrote(0xfc + 1, writer =>
                new Script(new Uint8Array(0xfc)).writeWithSize(writer),
            ),
        ).to.deep.equal(fromHex('fc' + '00'.repeat(0xfc)));

        expect(
            toHex(
                wrote(0xfd + 3, writer =>
                    new Script(new Uint8Array(0xfd)).writeWithSize(writer),
                ),
            ),
        ).to.deep.equal('fdfd00' + '00'.repeat(0xfd));
    });

    it('Script.fromOps', () => {
        expect(
            toHex(
                Script.fromOps([
                    OP_0,
                    OP_CHECKSIG,
                    { opcode: OP_PUSHDATA4, data: fromHex('cafeb0ba') },
                    OP_IF,
                    { opcode: 2, data: fromHex('7654') },
                    OP_ENDIF,
                ]).bytecode,
            ),
        ).to.deep.equal('00ac4e04000000cafeb0ba6302765468');
    });

    it('Script.fromAddress() can convert a p2pkh address to ecash-lib Script', () => {
        expect(
            Script.fromAddress(
                'ecash:qzppgpav9xfls6zzyuqy7syxpqhnlqqa5u68m4qw6l',
            ).bytecode,
        ).to.deep.equal(
            Script.p2pkh(fromHex('821407ac2993f8684227004f4086082f3f801da7'))
                .bytecode,
        );
    });

    it('Script.fromAddress() can convert a p2sh address to ecash-lib Script', () => {
        expect(
            Script.fromAddress(
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
            ).bytecode,
        ).to.deep.equal(
            Script.p2sh(fromHex('d37c4c809fe9840e7bfa77b86bd47163f6fb6c60'))
                .bytecode,
        );
    });

    it('Script.fromAddress() throws expected decode error', () => {
        expect(() => {
            Script.fromAddress(
                '41047fa64f6874fb7213776b24c40bc915451b57ef7f17ad7b982561f99f7cdc7010d141b856a092ee169c5405323895e1962c6b0d7c101120d360164c9e4b3997bdac',
            );
        }).to.throw('Invalid value: 1.');
    });

    it('Script.ops', () => {
        const script = new Script(fromHex('00ac4e04000000cafeb0ba6302765468'));
        const ops = script.ops();
        expect(ops.next()).to.equal(OP_0);
        expect(ops.next()).to.equal(OP_CHECKSIG);
        expect(ops.next()).to.deep.equal({
            opcode: OP_PUSHDATA4,
            data: fromHex('cafeb0ba'),
        });
        expect(ops.next()).to.equal(OP_IF);
        expect(ops.next()).to.deep.equal({ opcode: 2, data: fromHex('7654') });
        expect(ops.next()).to.equal(OP_ENDIF);
        expect(ops.next()).to.equal(undefined);
    });

    it('Script.ops failure', () => {
        expect(() => new Script(fromHex('4e')).ops().next()).to.throw(
            'Not enough bytes: Tried reading 4 byte(s), but there are only 0 byte(s) left',
        );
    });

    it('Script.cutOutCodesep', () => {
        const script = Script.fromOps([
            OP_1,
            OP_IF,
            OP_CODESEPARATOR,
            OP_0,
            { opcode: 2, data: new Uint8Array(2) },
            OP_CODESEPARATOR,
            OP_CODESEPARATOR,
            OP_0NOTEQUAL,
            OP_CODESEPARATOR,
        ]);
        expect(toHex(script.cutOutCodesep(0).bytecode)).to.equal(
            '00020000abab92ab',
        );
        expect(toHex(script.cutOutCodesep(1).bytecode)).to.equal('ab92ab');
        expect(toHex(script.cutOutCodesep(2).bytecode)).to.equal('92ab');
        expect(toHex(script.cutOutCodesep(3).bytecode)).to.equal('');
        expect(() => script.cutOutCodesep(4)).to.throw(
            'OP_CODESEPARATOR not found',
        );

        expect(() => new Script().cutOutCodesep(0)).to.throw(
            'OP_CODESEPARATOR not found',
        );
    });

    it('Script.isP2sh', () => {
        expect(new Script().isP2sh()).to.equal(false);
        expect(Script.p2sh(new Uint8Array(20)).isP2sh()).to.equal(true);
        expect(
            new Script(
                fromHex('a914012345678901234567890123456789012345678987'),
            ).isP2sh(),
        ).to.equal(true);

        // Wrong push opcode for script hash
        expect(
            new Script(
                fromHex('a94c14012345678901234567890123456789012345678987'),
            ).isP2sh(),
        ).to.equal(false);
        expect(
            new Script(
                fromHex('a94d1400012345678901234567890123456789012345678987'),
            ).isP2sh(),
        ).to.equal(false);

        // wrong OP_EQUALVERIFY (should be OP_EQUAL)
        expect(
            new Script(
                fromHex('a914012345678901234567890123456789012345678988'),
            ).isP2sh(),
        ).to.equal(false);
    });

    it('Script.p2sh', () => {
        expect(
            toHex(
                Script.p2sh(fromHex('0123456789012345678901234567890123456789'))
                    .bytecode,
            ),
        ).to.equal('a914012345678901234567890123456789012345678987');
        expect(() => Script.p2sh(new Uint8Array(0))).to.throw(
            'scriptHash length must be 20, got 0',
        );
        expect(() => Script.p2sh(new Uint8Array(10))).to.throw(
            'scriptHash length must be 20, got 10',
        );
    });

    it('Script.p2pkh', () => {
        expect(
            toHex(
                Script.p2pkh(
                    fromHex('0123456789012345678901234567890123456789'),
                ).bytecode,
            ),
        ).to.equal('76a914012345678901234567890123456789012345678988ac');
        expect(() => Script.p2pkh(new Uint8Array(0))).to.throw(
            'pkh length must be 20, got 0',
        );
        expect(() => Script.p2pkh(new Uint8Array(10))).to.throw(
            'pkh length must be 20, got 10',
        );
    });

    it('Script.toHex', () => {
        expect(new Script(new Uint8Array([0x42])).toHex()).to.equal('42');
        expect(new Script(fromHex('deadbeef')).toHex()).to.equal('deadbeef');
        expect(new Script(fromHex('deadbeef0badcafe')).toHex()).to.equal(
            'deadbeef0badcafe',
        );
    });

    it('Script.p2pkhSpend', () => {
        expect(
            toHex(
                Script.p2pkhSpend(
                    fromHex('03'.repeat(33)),
                    fromHex('77'.repeat(64)),
                ).bytecode,
            ),
        ).to.equal(
            '407777777777777777777777777777777777777777777777777777777777777777' +
                '7777777777777777777777777777777777777777777777777777777777777777' +
                '21030303030303030303030303030303030303030303030303030303030303030303',
        );
    });

    it('Script.multisig accepts up to MAX_PUBKEYS_PER_MULTISIG pubkeys', () => {
        const pks = Array.from({ length: MAX_PUBKEYS_PER_MULTISIG }, (_, i) =>
            fromHex((0x02 + (i % 2)).toString(16).padStart(2, '0').repeat(33)),
        );
        expect(() => Script.multisig(2, pks)).to.not.throw();
    });

    it('Script.multisig throws for invalid params', () => {
        const pk1 = fromHex('02'.repeat(33));
        const pk2 = fromHex('03'.repeat(33));
        expect(() => Script.multisig(0, [pk1, pk2])).to.throw(
            /minNumPks must be >= 1/,
        );
        expect(() => Script.multisig(3, [pk1, pk2])).to.throw(
            /minNumPks must be <= numPubkeys/,
        );
        const pks = Array.from({ length: MAX_PUBKEYS_PER_MULTISIG }, (_, i) =>
            fromHex((0x02 + (i % 2)).toString(16).padStart(2, '0').repeat(33)),
        );
        const oneMore = [...pks, fromHex('04'.repeat(33))];
        expect(() => Script.multisig(2, oneMore)).to.throw(
            /numPubkeys must be <= 20/,
        );
    });

    it('Script.multisigSpend throws when pubkeyIndices without redeemScript or numPubkeys', () => {
        const sig = fromHex('40'.repeat(64));
        expect(() =>
            Script.multisigSpend({
                signatures: [sig],
                pubkeyIndices: new Set([0]),
            }),
        ).to.throw(
            'pubkeyIndices requires redeemScript or numPubkeys to derive checkbits',
        );
    });

    it('Script.multisigSpend throws when pubkeyIndices size does not match m', () => {
        const redeemScript = Script.multisig(2, [
            fromHex('02'.repeat(33)),
            fromHex('03'.repeat(33)),
            fromHex('04'.repeat(33)),
        ]);
        const sig1 = fromHex('40'.repeat(64));
        const sig2 = fromHex('41'.repeat(64));
        expect(() =>
            Script.multisigSpend({
                signatures: [sig1, sig2],
                redeemScript,
                pubkeyIndices: new Set([0]),
            }),
        ).to.throw('pubkeyIndices must have 2 elements for 2-of-3');
    });

    it('Script.multisigSpend throws when pubkeyIndices index out of range', () => {
        const redeemScript = Script.multisig(2, [
            fromHex('02'.repeat(33)),
            fromHex('03'.repeat(33)),
            fromHex('04'.repeat(33)),
        ]);
        const sig1 = fromHex('40'.repeat(64));
        const sig2 = fromHex('41'.repeat(64));
        expect(() =>
            Script.multisigSpend({
                signatures: [sig1, sig2],
                redeemScript,
                pubkeyIndices: new Set([0, 3]),
            }),
        ).to.throw('pubkeyIndices index 3 out of range [0, 3)');
    });

    it('Script.multisig and multisigSpend round-trip', () => {
        const pk1 = fromHex('02'.repeat(33));
        const pk2 = fromHex('03'.repeat(33));
        const pk3 = fromHex('04'.repeat(33));
        const redeemScript = Script.multisig(2, [pk1, pk2, pk3]);
        expect(redeemScript.toHex()).to.equal(
            '5221020202020202020202020202020202020202020202020202020202020202020202' +
                '21030303030303030303030303030303030303030303030303030303030303030303' +
                '2104040404040404040404040404040404040404040404040404040404040404040453ae',
        );

        const sig1 = fromHex('30'.repeat(71));
        const scriptSig = Script.multisigSpend({
            signatures: [sig1, undefined],
            redeemScript,
        });
        const parsed = scriptSig.parseP2shMultisigSpend();
        expect(parsed).to.deep.equal({
            signatures: [sig1, undefined],
            redeemScript,
            numSignatures: 2,
            numPubkeys: 3,
            pubkeys: [pk1, pk2, pk3],
            isSchnorr: false,
        });
    });

    it('Script.multisigSpend with pubkeyIndices (Schnorr checkbits)', () => {
        const pk1 = fromHex('02'.repeat(33));
        const pk2 = fromHex('03'.repeat(33));
        const pk3 = fromHex('04'.repeat(33));
        const redeemScript = Script.multisig(2, [pk1, pk2, pk3]);
        const sig1 = fromHex('30'.repeat(64));
        const sig2 = fromHex('31'.repeat(64));
        const scriptSig = Script.multisigSpend({
            signatures: [sig1, sig2],
            redeemScript,
            pubkeyIndices: new Set([0, 2]),
        });
        expect(scriptSig.bytecode[0]).to.not.equal(OP_0);
        expect(scriptSig.toHex()).to.equal(
            '55403030303030303030303030303030303030303030303030303030303030303030303030303030' +
                '30303030303030303030303030303030303030303030303030304031313131313131313131313131' +
                '31313131313131313131313131313131313131313131313131313131313131313131313131313131' +
                '31313131313131313131314c69522102020202020202020202020202020202020202020202020202' +
                '02020202020202022103030303030303030303030303030303030303030303030303030303030303' +
                '03032104040404040404040404040404040404040404040404040404040404040404040453ae',
        );
        const parsed = scriptSig.parseP2shMultisigSpend();
        expect(parsed).to.deep.equal({
            signatures: [sig1, sig2],
            redeemScript,
            numSignatures: 2,
            numPubkeys: 3,
            pubkeys: [pk1, pk2, pk3],
            isSchnorr: true,
            pubkeyIndices: new Set([0, 2]),
        });
    });

    it('Script.multisig and multisigSpend round-trip (7-of-11)', () => {
        const pubkeys = [];
        for (let i = 0; i < 11; i++) {
            const b = (0x02 + i).toString(16).padStart(2, '0');
            pubkeys.push(fromHex(b.repeat(33)));
        }
        const redeemScript = Script.multisig(7, pubkeys);
        expect(redeemScript.toHex()).to.equal(
            '57210202020202020202020202020202020202020202020202020202020202020202022103030303' +
                '03030303030303030303030303030303030303030303030303030303032104040404040404040404' +
                '04040404040404040404040404040404040404040404042105050505050505050505050505050505' +
                '05050505050505050505050505050505052106060606060606060606060606060606060606060606' +
                '06060606060606060606062107070707070707070707070707070707070707070707070707070707' +
                '07070707072108080808080808080808080808080808080808080808080808080808080808080821' +
                '090909090909090909090909090909090909090909090909090909090909090909210a0a0a0a0a0a' +
                '0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a210b0b0b0b0b0b0b0b0b0b0b0b' +
                '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b210c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c' +
                '0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c5bae',
        );
        const sigs = [];
        for (let i = 0; i < 6; i++) {
            sigs.push(fromHex((0x30 + i).toString(16).repeat(71)));
        }
        sigs.push(undefined);
        const scriptSig = Script.multisigSpend({
            signatures: sigs,
            redeemScript,
        });
        expect(scriptSig.toHex()).to.equal(
            '00473030303030303030303030303030303030303030303030303030303030303030303030303030' +
                '30303030303030303030303030303030303030303030303030303030303030303047313131313131' +
                '31313131313131313131313131313131313131313131313131313131313131313131313131313131' +
                '31313131313131313131313131313131313131313131313131473232323232323232323232323232' +
                '32323232323232323232323232323232323232323232323232323232323232323232323232323232' +
                '32323232323232323232323232323232324733333333333333333333333333333333333333333333' +
                '33333333333333333333333333333333333333333333333333333333333333333333333333333333' +
                '33333333333333333347343434343434343434343434343434343434343434343434343434343434' +
                '34343434343434343434343434343434343434343434343434343434343434343434343434343434' +
                '34473535353535353535353535353535353535353535353535353535353535353535353535353535' +
                '353535353535353535353535353535353535353535353535353535353535353535514d7901572102' +
                '02020202020202020202020202020202020202020202020202020202020202022103030303030303' +
                '03030303030303030303030303030303030303030303030303032104040404040404040404040404' +
                '04040404040404040404040404040404040404042105050505050505050505050505050505050505' +
                '05050505050505050505050505052106060606060606060606060606060606060606060606060606' +
                '06060606060606062107070707070707070707070707070707070707070707070707070707070707' +
                '07072108080808080808080808080808080808080808080808080808080808080808080821090909' +
                '090909090909090909090909090909090909090909090909090909090909210a0a0a0a0a0a0a0a0a' +
                '0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a210b0b0b0b0b0b0b0b0b0b0b0b0b0b0b' +
                '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b210c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c' +
                '0c0c0c0c0c0c0c0c0c0c0c0c5bae',
        );
        const parsed = scriptSig.parseP2shMultisigSpend();
        expect(parsed.signatures.length).to.equal(7);
        expect(parsed.numSignatures).to.equal(7);
        expect(parsed.numPubkeys).to.equal(11);
        expect(parsed.redeemScript.bytecode).to.deep.equal(
            redeemScript.bytecode,
        );
    });

    it('Script.multisigSpend with pubkeyIndices (Schnorr checkbits, 7-of-11)', () => {
        const pubkeys = [];
        for (let i = 0; i < 11; i++) {
            const b = (0x02 + i).toString(16).padStart(2, '0');
            pubkeys.push(fromHex(b.repeat(33)));
        }
        const redeemScript = Script.multisig(7, pubkeys);
        const sigs = [];
        for (let i = 0; i < 7; i++) {
            sigs.push(fromHex((0x30 + i).toString(16).repeat(64)));
        }
        const scriptSig = Script.multisigSpend({
            signatures: sigs,
            redeemScript,
            pubkeyIndices: new Set([0, 1, 2, 4, 6, 8, 10]),
        });
        expect(scriptSig.bytecode[0]).to.not.equal(OP_0);
        expect(scriptSig.toHex()).to.equal(
            '02570540303030303030303030303030303030303030303030303030303030303030303030303030' +
                '30303030303030303030303030303030303030303030303030303030403131313131313131313131' +
                '31313131313131313131313131313131313131313131313131313131313131313131313131313131' +
                '31313131313131313131313131403232323232323232323232323232323232323232323232323232' +
                '32323232323232323232323232323232323232323232323232323232323232323232323232324033' +
                '33333333333333333333333333333333333333333333333333333333333333333333333333333333' +
                '33333333333333333333333333333333333333333333334034343434343434343434343434343434' +
                '34343434343434343434343434343434343434343434343434343434343434343434343434343434' +
                '34343434343434344035353535353535353535353535353535353535353535353535353535353535' +
                '35353535353535353535353535353535353535353535353535353535353535353540363636363636' +
                '36363636363636363636363636363636363636363636363636363636363636363636363636363636' +
                '3636363636363636363636363636363636364d790157210202020202020202020202020202020202' +
                '02020202020202020202020202020202210303030303030303030303030303030303030303030303' +
                '03030303030303030303210404040404040404040404040404040404040404040404040404040404' +
                '04040404210505050505050505050505050505050505050505050505050505050505050505052106' +
                '06060606060606060606060606060606060606060606060606060606060606062107070707070707' +
                '07070707070707070707070707070707070707070707070707072108080808080808080808080808' +
                '08080808080808080808080808080808080808082109090909090909090909090909090909090909' +
                '0909090909090909090909090909210a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a' +
                '0a0a0a0a0a0a0a0a210b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b' +
                '0b0b210c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c5bae',
        );
        const parsed = scriptSig.parseP2shMultisigSpend();
        expect(parsed.isSchnorr).to.equal(true);
        expect(parsed.pubkeyIndices).to.deep.equal(
            new Set([0, 1, 2, 4, 6, 8, 10]),
        );
        expect(parsed.signatures.length).to.equal(7);
        expect(parsed.numSignatures).to.equal(7);
        expect(parsed.numPubkeys).to.equal(11);
    });

    it('parseP2shMultisigSpend returns isSchnorr false for ECDSA format', () => {
        const pk1 = fromHex('02'.repeat(33));
        const pk2 = fromHex('03'.repeat(33));
        const pk3 = fromHex('04'.repeat(33));
        const redeemScript = Script.multisig(2, [pk1, pk2, pk3]);
        const sig1 = fromHex('30'.repeat(71));
        const scriptSig = Script.multisigSpend({
            signatures: [sig1, undefined],
            redeemScript,
        });
        const parsed = scriptSig.parseP2shMultisigSpend();
        expect(parsed.isSchnorr).to.equal(false);
        expect(parsed.pubkeyIndices).to.equal(undefined);
    });

    it('parseP2shMultisigSpend throws for too few ops', () => {
        const scriptSig = Script.fromOps([OP_0]);
        expect(() => scriptSig.parseP2shMultisigSpend()).to.throw(
            'Invalid multisig scriptSig: too few ops',
        );

        const scriptSig2 = Script.fromOps([
            OP_0,
            pushBytesOp(fromHex('30'.repeat(71))),
        ]);
        expect(() => scriptSig2.parseP2shMultisigSpend()).to.throw(
            'Invalid multisig scriptSig: too few ops',
        );
    });

    it('parseP2shMultisigSpend throws when redeem script is not final push', () => {
        const scriptSig = Script.fromOps([
            OP_0,
            pushBytesOp(fromHex('30'.repeat(71))),
            pushBytesOp(fromHex('31'.repeat(71))),
            OP_NOP,
        ]);
        expect(() => scriptSig.parseP2shMultisigSpend()).to.throw(
            'Invalid multisig scriptSig: redeem script must be final push',
        );
    });

    it('parseP2shMultisigSpend throws for invalid redeem script', () => {
        const invalidRedeemScript = Script.fromOps([OP_0, OP_0, OP_0]);
        const scriptSig = Script.fromOps([
            OP_0,
            pushBytesOp(fromHex('30'.repeat(71))),
            pushBytesOp(fromHex('31'.repeat(71))),
            pushBytesOp(invalidRedeemScript.bytecode),
        ]);
        expect(() => scriptSig.parseP2shMultisigSpend()).to.throw(
            'Invalid multisig redeem script',
        );
    });

    it('parseP2shMultisigSpend throws for redeem script pubkey count mismatch', () => {
        const pk1 = fromHex('02'.repeat(33));
        const invalidRedeemScript = Script.fromOps([
            OP_1,
            pushBytesOp(pk1),
            OP_3,
            OP_CHECKMULTISIG,
        ]);
        const scriptSig = Script.fromOps([
            OP_0,
            pushBytesOp(fromHex('30'.repeat(71))),
            pushBytesOp(invalidRedeemScript.bytecode),
        ]);
        expect(() => scriptSig.parseP2shMultisigSpend()).to.throw(
            'Invalid multisig redeem script: expected 3 pubkeys, got 1',
        );
    });

    it('parseP2shMultisigSpend throws when scriptSig ops do not match redeem script', () => {
        const redeemScript = Script.multisig(2, [
            fromHex('02'.repeat(33)),
            fromHex('03'.repeat(33)),
            fromHex('04'.repeat(33)),
        ]);
        const scriptSig = Script.fromOps([
            OP_0,
            pushBytesOp(fromHex('30'.repeat(71))),
            pushBytesOp(redeemScript.bytecode),
        ]);
        expect(() => scriptSig.parseP2shMultisigSpend()).to.throw(
            'Invalid multisig scriptSig: expected 3 ops (dummy + 2 sigs), got 2',
        );
    });

    it('parseP2shMultisigSpend throws when scriptSig has too many sig ops', () => {
        const redeemScript = Script.multisig(2, [
            fromHex('02'.repeat(33)),
            fromHex('03'.repeat(33)),
            fromHex('04'.repeat(33)),
        ]);
        const sig = fromHex('30'.repeat(71));
        const scriptSig = Script.fromOps([
            OP_0,
            pushBytesOp(sig),
            pushBytesOp(sig),
            pushBytesOp(sig),
            pushBytesOp(redeemScript.bytecode),
        ]);
        expect(() => scriptSig.parseP2shMultisigSpend()).to.throw(
            'Invalid multisig scriptSig: expected 3 ops (dummy + 2 sigs), got 4',
        );
    });

    it('parseP2shMultisigSpend throws for invalid first op', () => {
        const redeemScript = Script.multisig(2, [
            fromHex('02'.repeat(33)),
            fromHex('03'.repeat(33)),
            fromHex('04'.repeat(33)),
        ]);
        const sig = fromHex('30'.repeat(71));
        const scriptSig = Script.fromOps([
            OP_NOP,
            pushBytesOp(sig),
            pushBytesOp(sig),
            pushBytesOp(redeemScript.bytecode),
        ]);
        expect(() => scriptSig.parseP2shMultisigSpend()).to.throw(
            'Invalid multisig scriptSig: must start with OP_0 (ECDSA) or checkbits push (Schnorr)',
        );
    });

    it('parseP2shMultisigSpend throws for Schnorr checkbits wrong length', () => {
        const redeemScript = Script.multisig(2, [
            fromHex('02'.repeat(33)),
            fromHex('03'.repeat(33)),
            fromHex('04'.repeat(33)),
        ]);
        const sig = fromHex('40'.repeat(64));
        const scriptSig = Script.fromOps([
            pushBytesOp(fromHex('0506')),
            pushBytesOp(sig),
            pushBytesOp(sig),
            pushBytesOp(redeemScript.bytecode),
        ]);
        expect(() => scriptSig.parseP2shMultisigSpend()).to.throw(
            'Invalid Schnorr multisig: checkbits length 2 != expected 1 for numPubkeys=3',
        );
    });

    it('parseBareMultisigSpend parses ECDSA bare multisig scriptSig', () => {
        const pk1 = fromHex('02'.repeat(33));
        const pk2 = fromHex('03'.repeat(33));
        const pk3 = fromHex('04'.repeat(33));
        const outputScript = Script.multisig(2, [pk1, pk2, pk3]);
        const sig1 = fromHex('30'.repeat(71));
        const sig2 = fromHex('31'.repeat(71));
        const scriptSig = Script.multisigSpend({ signatures: [sig1, sig2] });
        const parsed = scriptSig.parseBareMultisigSpend(outputScript);
        expect(parsed).to.deep.equal({
            signatures: [sig1, sig2],
            numSignatures: 2,
            numPubkeys: 3,
            pubkeys: [pk1, pk2, pk3],
            isSchnorr: false,
        });
    });

    it('parseBareMultisigSpend parses scriptSig with placeholder', () => {
        const pk1 = fromHex('02'.repeat(33));
        const pk2 = fromHex('03'.repeat(33));
        const pk3 = fromHex('04'.repeat(33));
        const outputScript = Script.multisig(2, [pk1, pk2, pk3]);
        const sig1 = fromHex('30'.repeat(71));
        const scriptSig = Script.multisigSpend({
            signatures: [sig1, undefined],
        });
        const parsed = scriptSig.parseBareMultisigSpend(outputScript);
        expect(parsed.signatures[0]).to.deep.equal(sig1);
        expect(parsed.signatures[1]).to.equal(undefined);
    });

    it('parseBareMultisigSpend throws for invalid output script', () => {
        const invalidOutputScript = Script.fromOps([OP_0, OP_0, OP_0]);
        const scriptSig = Script.multisigSpend({
            signatures: [fromHex('30'.repeat(71)), fromHex('31'.repeat(71))],
        });
        expect(() =>
            scriptSig.parseBareMultisigSpend(invalidOutputScript),
        ).to.throw('Invalid multisig redeem script');
    });

    it('parseBareMultisigSpend throws when scriptSig does not match output script', () => {
        const outputScript = Script.multisig(2, [
            fromHex('02'.repeat(33)),
            fromHex('03'.repeat(33)),
            fromHex('04'.repeat(33)),
        ]);
        const scriptSig = Script.multisigSpend({
            signatures: [fromHex('30'.repeat(71))],
        });
        expect(() => scriptSig.parseBareMultisigSpend(outputScript)).to.throw(
            'Invalid multisig scriptSig: expected 3 ops (dummy + 2 sigs), got 2',
        );
    });
});
