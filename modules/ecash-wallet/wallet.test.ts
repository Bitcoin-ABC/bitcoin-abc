// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
    Ecc,
    fromHex,
    shaRmd160,
    Script,
    Address,
    toHex,
    strToBytes,
} from 'ecash-lib';
import {
    OutPoint,
    ScriptUtxo,
    ChronikClient,
    Token,
    TokenType,
} from 'chronik-client';
import { MockChronikClient } from 'mock-chronik-client';
import Wallet, { COINBASE_MATURITY } from './wallet';

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
    blockHeight: DUMMY_TIPHEIGHT,
    isCoinbase: false,
    sats: 546n,
    isFinal: true,
};

/**
 * Coinbase utxo with blockheight of DUMMY_UTXO, i.e. DUMMY_TIPHEIGHT
 * Coinbase utxos require COINBASE_MATURITY
 * confirmations to become spendable
 */
const DUMMY_UNSPENDABLE_COINBASE_UTXO: ScriptUtxo = {
    ...DUMMY_UTXO,
    isCoinbase: true,
    sats: 31250000n,
};

/**
 * A coinbase utxo with (just) enough confirmations to be spendable
 */
const DUMMY_SPENDABLE_COINBASE_UTXO: ScriptUtxo = {
    ...DUMMY_UNSPENDABLE_COINBASE_UTXO,
    blockHeight: DUMMY_TIPHEIGHT - COINBASE_MATURITY,
};

// Dummy ALP STANDARD utxos (quantity and mintbaton)
const DUMMY_TOKENID_ALP = toHex(strToBytes('ALP0')).repeat(8);
const DUMMY_TOKEN_TYPE_ALP_FUNGIBLE: TokenType = {
    protocol: 'ALP',
    type: 'ALP_TOKEN_TYPE_STANDARD',
    number: 0,
};
const ALP_FUNGIBLE_ATOMS = 101n;
const DUMMY_TOKEN_ALP_STANDARD: Token = {
    tokenId: DUMMY_TOKENID_ALP,
    tokenType: DUMMY_TOKEN_TYPE_ALP_FUNGIBLE,
    atoms: ALP_FUNGIBLE_ATOMS,
    isMintBaton: false,
};
const DUMMY_TOKEN_UTXO_ALP_STANDARD: ScriptUtxo = {
    ...DUMMY_UTXO,
    token: DUMMY_TOKEN_ALP_STANDARD,
};
const DUMMY_TOKEN_UTXO_ALP_STANDARD_MINTBATON: ScriptUtxo = {
    ...DUMMY_TOKEN_UTXO_ALP_STANDARD,
    token: { ...DUMMY_TOKEN_ALP_STANDARD, isMintBaton: true, atoms: 0n },
};

const DUMMY_SPENDABLE_COINBASE_UTXO_TOKEN: ScriptUtxo = {
    ...DUMMY_SPENDABLE_COINBASE_UTXO,
    token: DUMMY_TOKEN_ALP_STANDARD,
};

// Utxo set used in testing to show all utxo types supported by ecash-wallet
const ALL_SUPPORTED_UTXOS: ScriptUtxo[] = [
    DUMMY_UTXO,
    DUMMY_UNSPENDABLE_COINBASE_UTXO,
    DUMMY_SPENDABLE_COINBASE_UTXO,
    DUMMY_TOKEN_UTXO_ALP_STANDARD,
    DUMMY_TOKEN_UTXO_ALP_STANDARD_MINTBATON,
    DUMMY_SPENDABLE_COINBASE_UTXO_TOKEN,
];

describe('wallet.ts', () => {
    it('We can initialize and sync a Wallet', async () => {
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

        // We have no spendableSatsOnlyUtxos before sync
        expect(testWallet.spendableSatsOnlyUtxos()).to.deep.equal([]);

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

        // We can get spendableSatsOnlyUtxos, which include spendable coinbase utxos
        expect(testWallet.spendableSatsOnlyUtxos()).to.deep.equal([
            DUMMY_UTXO,
            DUMMY_SPENDABLE_COINBASE_UTXO,
        ]);

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
