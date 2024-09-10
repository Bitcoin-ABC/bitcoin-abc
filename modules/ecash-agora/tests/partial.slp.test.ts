// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import { Ecc, initWasm, OP_RETURN, Script } from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';

use(chaiAsPromised);

// This test needs a lot of sats
const NUM_COINS = 500;
const COIN_VALUE = 1100000000;

describe('AgoraPartial SLP', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;
    let ecc: Ecc;

    before(async () => {
        await initWasm();
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        ecc = runner.ecc;
        await runner.setupCoins(NUM_COINS, COIN_VALUE);
    });

    after(() => {
        runner.stop();
    });

    it('Can get a big UTXO', async () => {
        // TODO: this will be filled in by actual tests later
        const txid = await runner.sendToScript(
            [10000, 1010000000],
            Script.fromAddress(
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
            ),
        );
        const tx = await chronik.tx(txid);
        expect(tx.outputs[1].value).to.equal(1010000000);
    });
});
