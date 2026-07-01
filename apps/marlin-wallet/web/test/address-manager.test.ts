// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import { Wallet } from 'ecash-wallet';
import { MockChronikClient } from 'mock-chronik-client';
import {
    AddressManager,
    isValidECashAddress,
    walletAddressWithPrefix,
} from '../src/address-manager';

const expect = chai.expect;

const TEST_MNEMONIC =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const TEST_ADDRESS_ECASH = 'ecash:qrwzys2q6xq98vwz0kjn6ulu5m6yljr5fyc909kalg';

describe('address-manager', function () {
    let mockChronik: MockChronikClient;
    let wallet: Wallet;

    beforeEach(function () {
        mockChronik = new MockChronikClient();
        wallet = Wallet.fromMnemonic(
            TEST_MNEMONIC,
            mockChronik as unknown as any,
        );
    });

    describe('walletAddressWithPrefix', function () {
        it('Should return address with correct prefix', function () {
            expect(walletAddressWithPrefix(wallet)).to.be.equal(
                TEST_ADDRESS_ECASH,
            );
        });

        it('Should return null for null wallet', function () {
            expect(walletAddressWithPrefix(null)).to.be.equal(null);
        });

        it('Should return null for wallet without address', function () {
            const walletWithoutAddress = {
                address: null,
            } as unknown as Wallet;

            expect(walletAddressWithPrefix(walletWithoutAddress)).to.be.equal(
                null,
            );
        });
    });

    describe('isValidECashAddress', function () {
        it('Should accept a valid eCash address', function () {
            expect(isValidECashAddress(TEST_ADDRESS_ECASH)).to.be.equal(true);
        });

        it('Should reject an invalid address', function () {
            expect(isValidECashAddress('not-an-address')).to.be.equal(false);
        });
    });

    describe('AddressManager', function () {
        it('Should expose single-address subscribe list', function () {
            const addressManager = new AddressManager(wallet);

            expect(addressManager.getCurrentReceiveAddress()).to.be.equal(
                TEST_ADDRESS_ECASH,
            );
            expect(addressManager.getSubscribeAddresses()).to.deep.equal([
                TEST_ADDRESS_ECASH,
            ]);
            expect(addressManager.getHistoryAddresses()).to.deep.equal([
                TEST_ADDRESS_ECASH,
            ]);
        });

        it('Should update wallet reference', function () {
            const addressManager = new AddressManager(null);
            expect(addressManager.wallet).to.be.equal(null);
            expect(addressManager.getCurrentReceiveAddress()).to.be.equal(null);
            expect(addressManager.getSubscribeAddresses()).to.deep.equal([]);
            expect(addressManager.getHistoryAddresses()).to.deep.equal([]);

            addressManager.updateWallet(wallet);
            expect(addressManager.wallet).to.be.equal(wallet);
            expect(addressManager.getCurrentReceiveAddress()).to.be.equal(
                TEST_ADDRESS_ECASH,
            );
            expect(addressManager.getSubscribeAddresses()).to.deep.equal([
                TEST_ADDRESS_ECASH,
            ]);

            addressManager.updateWallet(null);
            expect(addressManager.wallet).to.be.equal(null);
            expect(addressManager.getCurrentReceiveAddress()).to.be.equal(null);
            expect(addressManager.getSubscribeAddresses()).to.deep.equal([]);
            expect(addressManager.getHistoryAddresses()).to.deep.equal([]);
        });
    });
});
