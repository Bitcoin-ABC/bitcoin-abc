// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const { createWallet } = require('../scripts/createWallet');
const ecashaddr = require('ecashaddrjs');
const bip39 = require('bip39');

describe('App dev example code: createWallet.js', function () {
    it('createWallet() creates a valid wallet', async function () {
        const wallet = await createWallet();

        // verify valid eCash address
        const isValidAddress = ecashaddr.isValidCashAddress(wallet.address);
        assert.strictEqual(isValidAddress, true);

        // verify valid mnemonic
        const isValidMnemonic = bip39.validateMnemonic(wallet.mnemonic);
        assert.strictEqual(isValidMnemonic, true);

        // verify valid derivation path
        assert.strictEqual(wallet.derivationPath, "m/44'/1899'/0'/0/0");

        // verify wallet keys
        const expectedWalletKeys = [
            'address',
            'publicKey',
            'privateKey',
            'publicKeyHash',
            'mnemonic',
            'derivationPath',
        ];
        let missingKey = false;
        for (let i = 0; i < expectedWalletKeys.length; i += 1) {
            if (!(expectedWalletKeys[i] in wallet)) {
                missingKey = true;
            }
        }
        assert.strictEqual(missingKey, false);
    });
});
