// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { fromHex, Script, SLP_NFT1_CHILD, slpSend } from 'ecash-lib';
import {
    assertSafeOneshotNftEnforcedOutputs,
    isSafeOneshotNftEnforcedOutputs,
    UNSAFE_ONESHOT_ENFORCED_OUTPUTS_MSG,
} from './oneshotValidate.js';

const TOKEN_ID = '11'.repeat(32);
const makerScript = Script.p2pkh(fromHex('11'.repeat(20)));
const redirectScript = Script.p2pkh(fromHex('22'.repeat(20)));

describe('oneshotValidate', () => {
    it('Accepts the standard NFT sale shape', () => {
        expect(
            isSafeOneshotNftEnforcedOutputs([
                {
                    sats: 0n,
                    script: slpSend(TOKEN_ID, SLP_NFT1_CHILD, [0n, 1n]),
                },
                { sats: 80000n, script: makerScript },
            ]),
        ).to.equal(true);
        expect(() =>
            assertSafeOneshotNftEnforcedOutputs([
                {
                    sats: 0n,
                    script: slpSend(TOKEN_ID, SLP_NFT1_CHILD, [0n, 1n]),
                },
                { sats: 80000n, script: makerScript },
            ]),
        ).not.to.throw();
    });

    it('Rejects an extra maker-controlled redirect output', () => {
        const malicious = [
            {
                sats: 0n,
                script: slpSend(TOKEN_ID, SLP_NFT1_CHILD, [0n, 1n]),
            },
            { sats: 99454n, script: makerScript },
            { sats: 546n, script: redirectScript },
        ];
        expect(isSafeOneshotNftEnforcedOutputs(malicious)).to.equal(false);
        expect(() => assertSafeOneshotNftEnforcedOutputs(malicious)).to.throw(
            UNSAFE_ONESHOT_ENFORCED_OUTPUTS_MSG,
        );
    });

    it('Rejects SEND amounts that assign the token to the maker payment', () => {
        expect(
            isSafeOneshotNftEnforcedOutputs([
                {
                    sats: 0n,
                    script: slpSend(TOKEN_ID, SLP_NFT1_CHILD, [1n]),
                },
                { sats: 80000n, script: makerScript },
            ]),
        ).to.equal(false);
    });

    it('Rejects SEND amounts that leave a gap before the buyer output', () => {
        expect(
            isSafeOneshotNftEnforcedOutputs([
                {
                    sats: 0n,
                    script: slpSend(TOKEN_ID, SLP_NFT1_CHILD, [0n, 0n, 1n]),
                },
                { sats: 80000n, script: makerScript },
            ]),
        ).to.equal(false);
    });

    it('Rejects non-zero OP_RETURN sats or missing SEND', () => {
        expect(
            isSafeOneshotNftEnforcedOutputs([
                {
                    sats: 1n,
                    script: slpSend(TOKEN_ID, SLP_NFT1_CHILD, [0n, 1n]),
                },
                { sats: 80000n, script: makerScript },
            ]),
        ).to.equal(false);
        expect(
            isSafeOneshotNftEnforcedOutputs([
                { sats: 0n, script: new Script() },
                { sats: 80000n, script: makerScript },
            ]),
        ).to.equal(false);
    });
});
