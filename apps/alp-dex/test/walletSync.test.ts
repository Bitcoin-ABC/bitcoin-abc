// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import type { ChronikClient } from 'chronik-client';
import { MockChronikClient } from 'mock-chronik-client';
import { createLpWallets } from '../src/wallet/accounts';

const MNEMONIC =
    'shift satisfy hammer fit plunge swear athlete gentle tragic sorry blush cheap';
const FEE = 'ecash:qrwzys2q6xq98vwz0kjn6ulu5m6yljr5fyc909kalg';

describe('wallet sync', () => {
    it('syncs seller and slush against MockChronik', async () => {
        const mock = new MockChronikClient();
        mock.setBlockchainInfo({
            tipHash: '00'.repeat(32),
            tipHeight: 800_000,
        });
        const chronik = mock as unknown as ChronikClient;
        const { seller, slush } = createLpWallets(MNEMONIC, chronik, FEE);

        mock.setUtxosByAddress(seller.address, []);
        mock.setUtxosByAddress(slush.address, []);

        await Promise.all([seller.sync(), slush.sync()]);
        assert.strictEqual(seller.tipHeight, 800_000);
        assert.strictEqual(slush.tipHeight, 800_000);
        assert.deepStrictEqual(seller.utxos, []);
        assert.deepStrictEqual(slush.utxos, []);
    });
});
