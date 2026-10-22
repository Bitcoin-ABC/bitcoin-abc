// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import * as sinon from 'sinon';
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
    let mockLocalStorage: {
        getItem: sinon.SinonStub;
        setItem: sinon.SinonStub;
    };

    beforeEach(function () {
        mockLocalStorage = {
            getItem: sinon.stub().returns(null),
            setItem: sinon.stub(),
        };
        (global as any).localStorage = mockLocalStorage;

        mockChronik = new MockChronikClient();
        wallet = Wallet.fromMnemonic(
            TEST_MNEMONIC,
            mockChronik as unknown as any,
        );
    });

    afterEach(function () {
        delete (global as any).localStorage;
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

        it('Should load HD indices from storage at startup', function () {
            mockLocalStorage.getItem.returns(
                JSON.stringify({ receiveIndex: 4, changeIndex: 2 }),
            );

            const addressManager = new AddressManager(wallet);

            expect(addressManager.getReceiveIndex()).to.be.equal(4);
            expect(addressManager.getChangeIndex()).to.be.equal(2);
        });

        it('Should persist updated HD indices', function () {
            const addressManager = new AddressManager(wallet);

            addressManager.setReceiveIndex(6);
            addressManager.setChangeIndex(3);

            expect(addressManager.getReceiveIndex()).to.be.equal(6);
            expect(addressManager.getChangeIndex()).to.be.equal(3);
            expect(mockLocalStorage.setItem.calledTwice).to.be.equal(true);
            expect(
                JSON.parse(mockLocalStorage.setItem.lastCall.args[1]),
            ).to.deep.equal({
                receiveIndex: 6,
                changeIndex: 3,
            });
        });

        it('Should keep previous indices when persistence fails', function () {
            const addressManager = new AddressManager(wallet);
            addressManager.setReceiveIndex(6);
            addressManager.setChangeIndex(3);

            mockLocalStorage.setItem.throws(new Error('QuotaExceededError'));

            expect(() => addressManager.setReceiveIndex(9)).to.throw(
                'QuotaExceededError',
            );
            expect(addressManager.getReceiveIndex()).to.be.equal(6);
            expect(addressManager.getChangeIndex()).to.be.equal(3);
        });

        it('Should reject invalid indices without mutating state', function () {
            const addressManager = new AddressManager(wallet);
            addressManager.setReceiveIndex(6);
            addressManager.setChangeIndex(3);

            expect(() => addressManager.setReceiveIndex(-1)).to.throw(
                'HD indices must be non-negative integers',
            );
            expect(() => addressManager.setChangeIndex(1.5)).to.throw(
                'HD indices must be non-negative integers',
            );
            expect(mockLocalStorage.setItem.callCount).to.be.equal(2);
            expect(addressManager.getReceiveIndex()).to.be.equal(6);
            expect(addressManager.getChangeIndex()).to.be.equal(3);
        });
    });
});
