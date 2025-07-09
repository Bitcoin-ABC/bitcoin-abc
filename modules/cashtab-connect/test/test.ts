// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import {
    CashtabConnect,
    CashtabAddressDeniedError,
    CashtabTransactionDeniedError,
    CashtabTimeoutError,
} from '../src/index';

// Simple mock for browser environment
const mockWindow: any = {
    addEventListener: () => {},
    postMessage: () => {},
};

// Mock global objects
(globalThis as any).window = mockWindow;

describe('CashtabConnect', () => {
    let cashtabConnect: CashtabConnect;
    let messageListeners: Array<(event: any) => void> = [];
    let postMessageCalls: Array<any> = [];

    beforeEach(() => {
        // Reset mocks
        messageListeners = [];
        postMessageCalls = [];

        // Mock window.addEventListener
        mockWindow.addEventListener = (event: string, listener: any) => {
            if (event === 'message') {
                messageListeners.push(listener);
            }
        };

        // Mock window.postMessage
        mockWindow.postMessage = (message: any) => {
            postMessageCalls.push(message);
        };

        cashtabConnect = new CashtabConnect();
    });

    afterEach(() => {
        cashtabConnect.destroy();
    });

    describe('constructor', () => {
        it('should create a new instance with default parameters', () => {
            expect(cashtabConnect).to.be.instanceOf(CashtabConnect);
        });

        it('should create a new instance with custom parameters', () => {
            const customConnect = new CashtabConnect(5000);
            expect(customConnect).to.be.instanceOf(CashtabConnect);
            customConnect.destroy();
        });
    });

    describe('requestAddress', () => {
        it('should request address successfully', async () => {
            const addressPromise = cashtabConnect.requestAddress();

            // Simulate extension response
            setTimeout(() => {
                const listener = messageListeners[0];
                if (listener) {
                    listener({
                        source: window,
                        data: {
                            type: 'FROM_CASHTAB',
                            success: true,
                            address:
                                'ecash:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76vn0',
                        },
                    });
                }
            }, 10);

            const address = await addressPromise;
            expect(address).to.equal(
                'ecash:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76vn0',
            );
        });

        it('should handle address request denial', async () => {
            const addressPromise = cashtabConnect.requestAddress();

            // Simulate extension response
            setTimeout(() => {
                const listener = messageListeners[0];
                if (listener) {
                    listener({
                        source: window,
                        data: {
                            type: 'FROM_CASHTAB',
                            success: false,
                            reason: 'User denied the request',
                        },
                    });
                }
            }, 10);

            try {
                await addressPromise;
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).to.be.instanceOf(CashtabAddressDeniedError);
                expect((error as CashtabAddressDeniedError).message).to.include(
                    'User denied the request',
                );
            }
        });

        it('should handle old format address request approval', async () => {
            const addressPromise = cashtabConnect.requestAddress();

            // Simulate old format extension response
            setTimeout(() => {
                const listener = messageListeners[0];
                if (listener) {
                    listener({
                        source: window,
                        data: {
                            type: 'FROM_CASHTAB',
                            address:
                                'ecash:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76vn0',
                        },
                    });
                }
            }, 10);

            const address = await addressPromise;
            expect(address).to.equal(
                'ecash:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76vn0',
            );
        });

        it('should handle old format address request denial', async () => {
            const addressPromise = cashtabConnect.requestAddress();

            // Simulate old format extension response
            setTimeout(() => {
                const listener = messageListeners[0];
                if (listener) {
                    listener({
                        source: window,
                        data: {
                            type: 'FROM_CASHTAB',
                            address: 'Address request denied by user',
                        },
                    });
                }
            }, 10);

            try {
                await addressPromise;
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).to.be.instanceOf(CashtabAddressDeniedError);
                expect((error as CashtabAddressDeniedError).message).to.include(
                    'User denied the address request',
                );
            }
        });

        it('should handle timeout', async () => {
            const shortTimeoutConnect = new CashtabConnect(100);
            const addressPromise = shortTimeoutConnect.requestAddress();

            try {
                await addressPromise;
                expect.fail('Should have thrown a timeout error');
            } catch (error) {
                expect(error).to.be.instanceOf(CashtabTimeoutError);
            }

            shortTimeoutConnect.destroy();
        });
    });

    describe('sendXec', () => {
        it('should send XEC successfully with approval', async () => {
            const txPromise = cashtabConnect.sendXec(
                'ecash:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76vn0',
                '0.001',
            );

            // Simulate extension response with approval
            setTimeout(() => {
                const listener = messageListeners[0];
                if (listener) {
                    listener({
                        source: window,
                        data: {
                            type: 'FROM_CASHTAB',
                            txResponse: {
                                approved: true,
                                txid: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                            },
                        },
                    });
                }
            }, 10);

            const response = await txPromise;
            expect(response.success).to.equal(true);
            expect(response.txid).to.equal(
                '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            );
            expect(response.reason).to.equal(undefined);
        });

        it('should handle XEC transaction rejection', async () => {
            const txPromise = cashtabConnect.sendXec(
                'ecash:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76vn0',
                '0.001',
            );

            // Simulate extension response with rejection
            setTimeout(() => {
                const listener = messageListeners[0];
                if (listener) {
                    listener({
                        source: window,
                        data: {
                            type: 'FROM_CASHTAB',
                            txResponse: {
                                approved: false,
                                reason: 'User rejected the transaction',
                            },
                        },
                    });
                }
            }, 10);

            try {
                await txPromise;
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).to.be.instanceOf(CashtabTransactionDeniedError);
                expect(
                    (error as CashtabTransactionDeniedError).message,
                ).to.include('User rejected the transaction');
            }
        });

        it('should handle XEC transaction timeout', async () => {
            const shortTimeoutConnect = new CashtabConnect(100);
            const txPromise = shortTimeoutConnect.sendXec(
                'ecash:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76vn0',
                '0.001',
            );

            try {
                await txPromise;
                expect.fail('Should have thrown a timeout error');
            } catch (error) {
                expect(error).to.be.instanceOf(CashtabTimeoutError);
            }

            shortTimeoutConnect.destroy();
        });
    });

    describe('sendToken', () => {
        it('should send token successfully with approval', async () => {
            const txPromise = cashtabConnect.sendToken(
                'ecash:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76vn0',
                '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                '1.0',
            );

            // Simulate extension response with approval
            setTimeout(() => {
                const listener = messageListeners[0];
                if (listener) {
                    listener({
                        source: window,
                        data: {
                            type: 'FROM_CASHTAB',
                            txResponse: {
                                approved: true,
                                txid: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                            },
                        },
                    });
                }
            }, 10);

            const response = await txPromise;
            expect(response.success).to.equal(true);
            expect(response.txid).to.equal(
                'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            );
            expect(response.reason).to.equal(undefined);
        });

        it('should handle token transaction rejection', async () => {
            const txPromise = cashtabConnect.sendToken(
                'ecash:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76vn0',
                '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                '1.0',
            );

            // Simulate extension response with rejection
            setTimeout(() => {
                const listener = messageListeners[0];
                if (listener) {
                    listener({
                        source: window,
                        data: {
                            type: 'FROM_CASHTAB',
                            txResponse: {
                                approved: false,
                                reason: 'User rejected the token transaction',
                            },
                        },
                    });
                }
            }, 10);

            try {
                await txPromise;
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).to.be.instanceOf(CashtabTransactionDeniedError);
                expect(
                    (error as CashtabTransactionDeniedError).message,
                ).to.include('User rejected the token transaction');
            }
        });
    });

    describe('sendBip21', () => {
        it('should send BIP21 successfully with approval', async () => {
            const txPromise = cashtabConnect.sendBip21(
                'ecash:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76vn0?amount=0.001&memo=Test',
            );

            // Simulate extension response with approval
            setTimeout(() => {
                const listener = messageListeners[0];
                if (listener) {
                    listener({
                        source: window,
                        data: {
                            type: 'FROM_CASHTAB',
                            txResponse: {
                                approved: true,
                                txid: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
                            },
                        },
                    });
                }
            }, 10);

            const response = await txPromise;
            expect(response.success).to.equal(true);
            expect(response.txid).to.equal(
                'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
            );
            expect(response.reason).to.equal(undefined);
        });

        it('should handle BIP21 transaction rejection', async () => {
            const txPromise = cashtabConnect.sendBip21(
                'ecash:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76vn0?amount=0.001&memo=Test',
            );

            // Simulate extension response with rejection
            setTimeout(() => {
                const listener = messageListeners[0];
                if (listener) {
                    listener({
                        source: window,
                        data: {
                            type: 'FROM_CASHTAB',
                            txResponse: {
                                approved: false,
                                reason: 'User rejected the BIP21 transaction',
                            },
                        },
                    });
                }
            }, 10);

            try {
                await txPromise;
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).to.be.instanceOf(CashtabTransactionDeniedError);
                expect(
                    (error as CashtabTransactionDeniedError).message,
                ).to.include('User rejected the BIP21 transaction');
            }
        });
    });

    describe('destroy', () => {
        it('should clean up resources', () => {
            expect(() => cashtabConnect.destroy()).to.not.throw();
        });
    });
});
