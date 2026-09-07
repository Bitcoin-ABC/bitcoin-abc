// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { parseTx } from './parseTx';
import { XecTxType } from './types';

const WALLET_HASH = 'ebc488744ea4b0ca90fd93f06765a4973e918aaa';

const minimalReceivedTx = (opReturnScript: string) => ({
    txid: '00'.repeat(32),
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: '11'.repeat(32),
                outIdx: 0,
            },
            inputScript: '00',
            sats: 1000n,
            sequenceNo: 4294967295,
            outputScript: '76a914aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa88ac',
        },
    ],
    outputs: [
        {
            sats: 0n,
            outputScript: opReturnScript,
        },
        {
            sats: 546n,
            outputScript: `76a914${WALLET_HASH}88ac`,
        },
    ],
    lockTime: 0,
    timeFirstSeen: 0,
    size: 100,
    isCoinbase: false,
    tokenEntries: [],
    tokenFailedParsings: [],
    tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    isFinal: true,
});

describe('parseTx EMPP/DICE short OP_RETURN guards', () => {
    it('does not throw on OP_RETURN + OP_RESERVED + OP_1 (6a5051)', () => {
        const tx = minimalReceivedTx('6a5051');
        const parsed = parseTx(tx, [WALLET_HASH]);
        assert.strictEqual(parsed.xecTxType, XecTxType.Received);
        assert.strictEqual(parsed.satoshisSent, 546);
        assert.deepStrictEqual(parsed.appActions, []);
    });

    it('does not throw on OP_RETURN + push DICE (6a0444494345)', () => {
        const tx = minimalReceivedTx('6a0444494345');
        const parsed = parseTx(tx, [WALLET_HASH]);
        assert.strictEqual(parsed.xecTxType, XecTxType.Received);
        assert.strictEqual(parsed.satoshisSent, 546);
        assert.deepStrictEqual(parsed.appActions, []);
    });
});
