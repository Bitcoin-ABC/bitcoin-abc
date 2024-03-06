// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const {
    sendXec,
    deriveWallet,
    convertXecToSatoshis,
} = require('../scripts/sendXec');
const ecashaddr = require('ecashaddrjs');
const bip39 = require('bip39');
const {
    mockSimpleP2pkhUtxos,
    mockSendXecRawTxHex,
    mockSendXecNoChangeRawTxHex,
} = require('../../../modules/mock-chronik-client/mocks/mockChronikResponses');

// Mock chronik
const { MockChronikClient } = require('../../../modules/mock-chronik-client');

// Throw away test wallet
const throwAwayMnemonic =
    'donor decade during room sell stay shield comfort because old mushroom wedding';
const throwAwayAddress = 'ecash:qptmq7rzmrq6rtzw30xv2gf5gwtfcfjwmys0tksgev';
const derivationPath = "m/44'/1899'/0'/0/0";

describe('App dev example code: sendXec.js', function () {
    it('sendXec() successfully broadcasts a standard one to one XEC tx with change', async function () {
        // Initialize chronik mock with a mocked utxo set
        const mockedChronik = new MockChronikClient();

        // Set the .script() call that preceedes the .utxo() call
        const { type, hash } = ecashaddr.decode(throwAwayAddress, true);
        mockedChronik.setScript(type, hash);

        // Set the mock utxos
        mockedChronik.setUtxos(type, hash, mockSimpleP2pkhUtxos);

        // Tell mockedChronik what response we expect
        const txid =
            'b0838f03afc1d27ce747eab93262d3ed2f94504976eff9444c91f4885dbcb748';
        mockedChronik.setMock('broadcastTx', {
            input: mockSendXecRawTxHex,
            output: { txid: txid },
        });

        // Generate mock send XEC parameters
        const destinationAddress =
            'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx';
        const sendAmount = 5.7; // 5.7 XEC
        const wallet = await deriveWallet(
            throwAwayMnemonic,
            derivationPath,
            throwAwayAddress,
        );
        // Execute mock broadcast of this send XEC tx
        const broadcastTxResp = await sendXec(
            mockedChronik,
            destinationAddress,
            sendAmount,
            wallet,
        );
        assert.deepEqual(broadcastTxResp, {
            hex: mockSendXecRawTxHex,
            response: { txid },
        });
    });

    it('sendXec() successfully broadcasts a standard one to one XEC tx with no change', async function () {
        // Initialize chronik mock with a mocked utxo set
        const mockedChronik = new MockChronikClient();

        // Set the .script() call that preceedes the .utxo() call
        const { type, hash } = ecashaddr.decode(throwAwayAddress, true);
        mockedChronik.setScript(type, hash);

        // Set the mock utxos
        mockedChronik.setUtxos(type, hash, mockSimpleP2pkhUtxos);

        // Tell mockedChronik what response we expect
        const txid =
            'b0838f03afc1d27ce747eab93262d3ed2f94504976eff9444c91f4885dbcb748';
        mockedChronik.setMock('broadcastTx', {
            input: mockSendXecNoChangeRawTxHex,
            output: { txid: txid },
        });

        // Generate mock send XEC parameters
        const destinationAddress =
            'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx';
        const sendAmount = 45; // 45 XEC
        const wallet = await deriveWallet(
            throwAwayMnemonic,
            derivationPath,
            throwAwayAddress,
        );
        // Execute mock broadcast of this send XEC tx
        const broadcastTxResp = await sendXec(
            mockedChronik,
            destinationAddress,
            sendAmount,
            wallet,
        );
        assert.deepEqual(broadcastTxResp, {
            hex: mockSendXecNoChangeRawTxHex,
            response: { txid },
        });
    });

    it('deriveWallet() creates a valid wallet object based on mnemonic', async function () {
        const wallet = await deriveWallet(
            throwAwayMnemonic,
            derivationPath,
            throwAwayAddress,
        );

        // Validate wallet keys
        let hasAllKeys = true;
        if (
            !wallet.address ||
            !wallet.mnemonic ||
            !wallet.fundingWif ||
            !wallet.derivationPath
        ) {
            hasAllKeys = false;
        }
        assert.strictEqual(hasAllKeys, true);

        // Verify valid eCash address
        const isValidAddress = ecashaddr.isValidCashAddress(wallet.address);
        assert.strictEqual(isValidAddress, true);

        // Verify valid mnemonic
        const isValidMnemonic = bip39.validateMnemonic(wallet.mnemonic);
        assert.strictEqual(isValidMnemonic, true);

        // Verify valid derivation path
        assert.strictEqual(wallet.derivationPath, derivationPath);
    });

    it('convertXecToSatoshis() converts an XEC amount to satoshis', function () {
        const xecAmount = 50;
        const satoshiAmount = convertXecToSatoshis(xecAmount);

        // Verify byte count
        assert.equal(satoshiAmount, 5000);
    });

    it('convertXecToSatoshis() converts an XEC amount to satoshis involving a number close to the XEC circulating supply', function () {
        // Circulating supply as at July 2023
        const xecAmount = 19433467173293;
        const satoshiAmount = convertXecToSatoshis(xecAmount);

        // Verify byte count
        assert.equal(satoshiAmount, 1943346717329300);
    });

    it('convertXecToSatoshis() converts an XEC amount to satoshis involving a number greater than the XEC circulating supply', function () {
        // Greater than the circulating supply as at July 2023
        const xecAmount = 219433467173293;
        const satoshiAmount = convertXecToSatoshis(xecAmount);

        // Verify byte count
        assert.equal(satoshiAmount, 21943346717329300);
    });

    it('convertXecToSatoshis() converts an XEC amount to satoshis involving a number with two decimals and greater than the XEC circulating supply', function () {
        // Greater than the circulating supply as at July 2023
        const xecAmount = 219433467173293.55;
        const satoshiAmount = convertXecToSatoshis(xecAmount);

        // Verify byte count
        assert.equal(satoshiAmount, 21943346717329355);
    });
});
