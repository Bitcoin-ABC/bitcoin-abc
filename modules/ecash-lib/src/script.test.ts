// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { fromHex, toHex } from './io/hex.js';
import { WriterBytes } from './io/writerbytes.js';
import { Script } from './script.js';

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
});
