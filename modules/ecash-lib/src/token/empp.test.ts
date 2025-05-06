// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { toHex } from '../io/hex';
import { OP_RESERVED, OP_RETURN } from '../opcode';
import { Script } from '../script';
import { alpSend, alpMint, ALP_STANDARD } from './alp';
import { emppScript, parseEmppScript } from './empp';

const CRD_TOKEN_ID =
    'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145';

describe('parseEmppScript', () => {
    it('Returns undefined for Script that does not begin with OP_RETURN', () => {
        expect(parseEmppScript(new Script(new Uint8Array([100])))).to.equal(
            undefined,
        );
    });
    it('Returns undefined for an OP_RETURN that does not begin with OP_RESERVED', () => {
        expect(
            parseEmppScript(new Script(new Uint8Array([OP_RETURN, 100]))),
        ).to.equal(undefined);
    });
    it('Returns an empty array if EMPP is specified correctly but there are no EMPP pushes in this OP_RETURN', () => {
        expect(
            parseEmppScript(
                new Script(new Uint8Array([OP_RETURN, OP_RESERVED])),
            ),
        ).to.deep.equal([]);
    });
    it('Returns a single EMPP push', () => {
        const alpSendParsedEmpp = parseEmppScript(
            emppScript([alpSend(CRD_TOKEN_ID, ALP_STANDARD, [1n])]),
        );
        expect(alpSendParsedEmpp).to.have.length(1);
        expect(toHex(alpSendParsedEmpp![0])).to.equal(
            `534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd01010000000000`,
        );
    });
    it('Returns multiple EMPP pushes', () => {
        const alpMultiParsedEmpp = parseEmppScript(
            emppScript([
                alpSend(CRD_TOKEN_ID, ALP_STANDARD, [1n]),
                alpMint('22'.repeat(32), ALP_STANDARD, {
                    atomsArray: [0n, 100n],
                    numBatons: 1,
                }),
            ]),
        );
        expect(alpMultiParsedEmpp).to.have.length(2);
        expect(toHex(alpMultiParsedEmpp![0])).to.equal(
            `534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd01010000000000`,
        );
        expect(toHex(alpMultiParsedEmpp![1])).to.equal(
            `534c503200044d494e5422222222222222222222222222222222222222222222222222222222222222220200000000000064000000000001`,
        );
    });
    it('Throws if an EMPP includes a non-push-op', () => {
        expect(() =>
            parseEmppScript(
                new Script(new Uint8Array([OP_RETURN, OP_RESERVED, 0])),
            ),
        ).to.throw(Error, `eMPP allows only push ops`);
    });
    it('Throws if an EMPP push is empty pushdata', () => {
        expect(() => parseEmppScript(emppScript([new Uint8Array()]))).to.throw(
            Error,
            `Pushdata cannot be empty`,
        );
    });
});
