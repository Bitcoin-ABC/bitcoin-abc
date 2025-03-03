// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Ecc, fromHex, shaRmd160, Script, Address } from 'ecash-lib';
import { OutPoint, ScriptUtxo, ChronikClient } from 'chronik-client';
import { MockChronikClient } from 'mock-chronik-client';
import Wallet from '.';

const expect = chai.expect;
chai.use(chaiAsPromised);

const DUMMY_TIPHEIGHT = 800000;
const DUMMY_TIPHASH =
    '0000000000000000115e051672e3d4a6c523598594825a1194862937941296fe';
const DUMMMY_TXID = '11'.repeat(32);
const DUMMY_SK = fromHex('22'.repeat(32));
const testEcc = new Ecc();
const DUMMY_PK = testEcc.derivePubkey(DUMMY_SK);
const DUMMY_HASH = shaRmd160(DUMMY_PK);
const DUMMY_ADDRESS = Address.p2pkh(DUMMY_HASH).toString();
const DUMMY_SCRIPT = Script.p2pkh(DUMMY_HASH);
const DUMMY_OUTPOINT: OutPoint = {
    txid: DUMMMY_TXID,
    outIdx: 0,
};
const DUMMY_UTXO: ScriptUtxo = {
    outpoint: DUMMY_OUTPOINT,
    blockHeight: 800000,
    isCoinbase: false,
    sats: 546n,
    isFinal: true,
};

// Utxo set used in testing to show all utxo types supported by ecash-wallet
const ALL_SUPPORTED_UTXOS: ScriptUtxo[] = [DUMMY_UTXO];

describe('wallet.ts', () => {
    it('We can initialize and sync an Wallet', async () => {
        const mockChronik = new MockChronikClient();

        // We can create a wallet
        const testWallet = Wallet.fromSk(
            DUMMY_SK,
            mockChronik as unknown as ChronikClient,
        );

        // sk and chronik are directly set by constructor
        expect(testWallet.sk).to.equal(DUMMY_SK);
        expect(testWallet.chronik).to.deep.equal(mockChronik);
        // ecc is initialized automatically
        expect(testWallet.ecc).to.not.equal(undefined);

        // pk, hash, script, and address are all derived from sk
        expect(testWallet.pk).to.deep.equal(DUMMY_PK);
        expect(testWallet.pkh).to.deep.equal(DUMMY_HASH);
        expect(testWallet.script).to.deep.equal(DUMMY_SCRIPT);
        expect(testWallet.address).to.equal(DUMMY_ADDRESS);

        // tipHeight is zero on creation
        expect(testWallet.tipHeight).to.equal(0);

        // utxo set is empty on creation
        expect(testWallet.utxos).to.deep.equal([]);

        // Mock a chaintip
        mockChronik.setBlockchainInfo({
            tipHash: DUMMY_TIPHASH,
            tipHeight: DUMMY_TIPHEIGHT,
        });

        // Mock a utxo set
        mockChronik.setUtxosByAddress(DUMMY_ADDRESS, ALL_SUPPORTED_UTXOS);

        // We can sync the wallet
        await testWallet.sync();

        // Now we have a chaintip
        expect(testWallet.tipHeight).to.equal(DUMMY_TIPHEIGHT);

        // Now we have utxos
        expect(testWallet.utxos).to.deep.equal(ALL_SUPPORTED_UTXOS);
    });
    it('Throw error on sync() fail', async () => {
        const mockChronik = new MockChronikClient();

        const errorWallet = Wallet.fromSk(
            DUMMY_SK,
            mockChronik as unknown as ChronikClient,
        );

        // Mock a chaintip with no error
        mockChronik.setBlockchainInfo({
            tipHash:
                '0000000000000000115e051672e3d4a6c523598594825a1194862937941296fe',
            tipHeight: DUMMY_TIPHEIGHT,
        });

        // Mock a chronik error getting utxos
        mockChronik.setUtxosByAddress(
            DUMMY_ADDRESS,
            new Error('some chronik query error'),
        );

        // utxos is empty on creation
        expect(errorWallet.utxos).to.deep.equal([]);

        // Throw error if sync wallet and chronik is unavailable
        await expect(errorWallet.sync()).to.be.rejectedWith(
            Error,
            'some chronik query error',
        );

        // tipHeight will still be zero as we do not set any sync()-related state fields unless we have no errors
        expect(errorWallet.tipHeight).to.equal(0);

        // utxos are still empty because there was an error in querying latest utxo set
        expect(errorWallet.utxos).to.deep.equal([]);
    });
});
