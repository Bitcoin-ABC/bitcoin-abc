// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { fromHex, toHex } from './io/hex.js';
import { WriterBytes } from './io/writerbytes.js';
import { Script } from './script.js';
import {
    OP_0,
    OP_0NOTEQUAL,
    OP_1,
    OP_CHECKSIG,
    OP_CODESEPARATOR,
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
});
