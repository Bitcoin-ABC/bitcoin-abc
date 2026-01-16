// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
    generateMnemonic,
    validateMnemonic,
    storeMnemonic,
    loadMnemonic,
} from '../src/mnemonic';
import * as sinon from 'sinon';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('mnemonic.ts', function () {
    describe('generateMnemonic', function () {
        it('Should generate a valid mnemonic', function () {
            const mnemonic = generateMnemonic();
            expect(mnemonic).to.be.a('string');
            expect(mnemonic.split(' ').length).to.equal(12); // 128 bits = 12 words
            expect(validateMnemonic(mnemonic)).to.be.equal(true);
        });

        it('Should generate different mnemonics each time', function () {
            const mnemonic1 = generateMnemonic();
            const mnemonic2 = generateMnemonic();
            expect(mnemonic1).to.not.equal(mnemonic2);
        });
    });

    describe('validateMnemonic', function () {
        it('Should validate correct BIP39 mnemonics', function () {
            const validMnemonic =
                'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
            expect(validateMnemonic(validMnemonic)).to.be.equal(true);
        });

        it('Should reject invalid mnemonics', function () {
            expect(validateMnemonic('invalid mnemonic phrase')).to.be.equal(
                false,
            );
            expect(validateMnemonic('abandon abandon')).to.be.equal(false);
            expect(validateMnemonic('')).to.be.equal(false);
        });

        it('Should handle whitespace correctly', function () {
            const validMnemonic =
                'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
            expect(validateMnemonic(validMnemonic)).to.be.equal(true);
            expect(validateMnemonic(`  ${validMnemonic}  `)).to.be.equal(true); // With extra spaces
        });
    });

    describe('storeMnemonic', function () {
        let localStorageStub: sinon.SinonStub;
        let postMessageStub: sinon.SinonStub;
        let mockLocalStorage: any;

        beforeEach(function () {
            // Create a mock localStorage object
            mockLocalStorage = {
                setItem: sinon.stub(),
                getItem: sinon.stub(),
                removeItem: sinon.stub(),
                clear: sinon.stub(),
            };
            // Mock localStorage on global/window
            (global as any).localStorage = mockLocalStorage;
            (global as any).window = {
                localStorage: mockLocalStorage,
                ReactNativeWebView: undefined,
            };
            localStorageStub = mockLocalStorage.setItem;
            // Mock window.ReactNativeWebView.postMessage
            postMessageStub = sinon.stub();
        });

        afterEach(function () {
            delete (global as any).localStorage;
            if ((global as any).window) {
                delete (global as any).window.localStorage;
            }
        });

        it('Should store mnemonic in localStorage when not in React Native', function () {
            const mnemonic = 'test mnemonic phrase';
            storeMnemonic(mnemonic);

            expect(localStorageStub.calledOnce).to.be.equal(true);
            expect(localStorageStub.firstCall.args[0]).to.equal(
                'ecash_wallet_mnemonic',
            );
            expect(localStorageStub.firstCall.args[1]).to.equal(mnemonic);
        });

        it('Should use React Native WebView when available', function () {
            const mnemonic = 'test mnemonic phrase';
            (global as any).window.ReactNativeWebView = {
                postMessage: postMessageStub,
            };

            storeMnemonic(mnemonic);

            expect(postMessageStub.calledOnce).to.be.equal(true);
            const message = JSON.parse(postMessageStub.firstCall.args[0]);
            expect(message.type).to.equal('STORE_MNEMONIC');
            expect(message.data).to.equal(mnemonic);
        });
    });

    describe('loadMnemonic', function () {
        let localStorageStub: sinon.SinonStub;
        let postMessageStub: sinon.SinonStub;
        let mockLocalStorage: any;

        beforeEach(function () {
            // Create a mock localStorage object
            mockLocalStorage = {
                setItem: sinon.stub(),
                getItem: sinon.stub(),
                removeItem: sinon.stub(),
                clear: sinon.stub(),
            };
            // Mock document for addEventListener (must be a real function to be stubbed)
            (global as any).document = {
                addEventListener: function () {},
                removeEventListener: function () {},
            };
            // Mock localStorage on global/window
            (global as any).localStorage = mockLocalStorage;
            (global as any).window = {
                localStorage: mockLocalStorage,
                ReactNativeWebView: undefined,
                addEventListener: function () {},
                removeEventListener: function () {},
            };
            localStorageStub = mockLocalStorage.getItem;
            postMessageStub = sinon.stub();
        });

        afterEach(function () {
            delete (global as any).localStorage;
            delete (global as any).document;
            if ((global as any).window) {
                delete (global as any).window.localStorage;
            }
        });

        it('Should load mnemonic from localStorage when not in React Native', async function () {
            const mnemonic = 'test mnemonic phrase';
            localStorageStub.returns(mnemonic);

            const result = await loadMnemonic();

            expect(localStorageStub.calledOnce).to.be.equal(true);
            expect(localStorageStub.firstCall.args[0]).to.equal(
                'ecash_wallet_mnemonic',
            );
            expect(result).to.equal(mnemonic);
        });

        it('Should return null when mnemonic not found in localStorage', async function () {
            localStorageStub.returns(null);

            const result = await loadMnemonic();

            expect(result).to.be.equal(null);
        });

        it('Should handle React Native WebView message response', async function () {
            const mnemonic = 'test mnemonic phrase';
            (global as any).window.ReactNativeWebView = {
                postMessage: postMessageStub,
            };

            // Set up event listener simulation
            let messageHandler: ((event: MessageEvent) => void) | null = null;
            const addEventListenerStub = sinon.stub(
                document,
                'addEventListener',
            );
            const windowAddEventListenerStub = sinon.stub(
                window,
                'addEventListener',
            );

            addEventListenerStub.callsFake((event, handler) => {
                if (event === 'message') {
                    messageHandler = handler as (event: MessageEvent) => void;
                }
            });

            windowAddEventListenerStub.callsFake((event, handler) => {
                if (event === 'message') {
                    messageHandler = handler as (event: MessageEvent) => void;
                }
            });

            const loadPromise = loadMnemonic();

            // Simulate response message
            if (messageHandler) {
                messageHandler({
                    data: JSON.stringify({
                        type: 'MNEMONIC_RESPONSE',
                        data: mnemonic,
                    }),
                } as MessageEvent);
            }

            const result = await loadPromise;

            expect(result).to.equal(mnemonic);

            addEventListenerStub.restore();
            windowAddEventListenerStub.restore();
        });

        it('Should timeout after 30 seconds in React Native', async function () {
            (global as any).window.ReactNativeWebView = {
                postMessage: postMessageStub,
            };

            const addEventListenerStub = sinon.stub(
                document,
                'addEventListener',
            );
            const windowAddEventListenerStub = sinon.stub(
                window,
                'addEventListener',
            );

            // Don't trigger the message handler, let it timeout
            const clock = sinon.useFakeTimers();
            const loadPromise = loadMnemonic();

            clock.tick(30000);

            await expect(loadPromise).to.be.rejectedWith(
                'Timeout loading mnemonic',
            );

            clock.restore();
            addEventListenerStub.restore();
            windowAddEventListenerStub.restore();
        });
    });
});
