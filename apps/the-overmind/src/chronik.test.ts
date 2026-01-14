// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import * as sinon from 'sinon';
import { Tx } from 'chronik-client';
import { ChronikClient } from 'chronik-client';
import { MockChronikClient } from '../../../modules/mock-chronik-client';
import { getOutputScriptFromAddress } from 'ecashaddrjs';
import {
    toHex,
    DEFAULT_DUST_SATS,
    emppScript,
    ALP_TOKEN_TYPE_STANDARD,
} from 'ecash-lib';
import { getOvermindEmpp, EmppAction } from './empp';
import { REWARDS_TOKEN_ID } from './constants';
import { hasWithdrawnInLast24Hours } from './chronik';

const expect = chai.expect;

describe('chronik', () => {
    describe('hasWithdrawnInLast24Hours', () => {
        let mockChronik: MockChronikClient;
        const USER_ADDRESS = 'ecash:qrfm48gr3zdgph6dt593hzlp587002ec4ysl59mavw';
        const OTHER_ADDRESS =
            'ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2';

        beforeEach(() => {
            mockChronik = new MockChronikClient();
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should return false when user has no transaction history', async () => {
            mockChronik.setTxHistoryByAddress(USER_ADDRESS, []);

            const result = await hasWithdrawnInLast24Hours(
                USER_ADDRESS,
                mockChronik as unknown as ChronikClient,
            );

            expect(result).to.equal(false);
        });

        it('should return false when user has no WITHDRAW transactions', async () => {
            const timeOfRequest = Math.ceil(Date.now() / 1000);
            const txTimestamp = timeOfRequest - 3600; // 1 hour ago

            const userOutputScript = getOutputScriptFromAddress(USER_ADDRESS);

            // Create a transaction with LIKE action (not WITHDRAW)
            const likeEmppData = getOvermindEmpp(EmppAction.LIKE, 12345);
            const opReturnScript = emppScript([likeEmppData]);

            const mockTx: Tx = {
                txid: '0000000000000000000000000000000000000000000000000000000000000001',
                version: 2,
                inputs: [
                    {
                        outputScript: userOutputScript,
                        prevOut: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000002',
                            outIdx: 0,
                        },
                        inputScript: '',
                        sats: 1000n,
                        sequenceNo: 0,
                    },
                ],
                outputs: [
                    {
                        outputScript: toHex(opReturnScript.bytecode),
                        sats: 0n,
                    },
                    {
                        outputScript: getOutputScriptFromAddress(OTHER_ADDRESS),
                        sats: DEFAULT_DUST_SATS,
                        token: {
                            tokenId: REWARDS_TOKEN_ID,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                            atoms: 10n,
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: txTimestamp,
                size: 200,
                isCoinbase: false,
                isFinal: true,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
            };

            mockChronik.setTxHistoryByAddress(USER_ADDRESS, [mockTx]);

            const result = await hasWithdrawnInLast24Hours(
                USER_ADDRESS,
                mockChronik as unknown as ChronikClient,
            );

            expect(result).to.equal(false);
        });

        it('should return true when user has WITHDRAW transaction in last 24 hours', async () => {
            const timeOfRequest = Math.ceil(Date.now() / 1000);
            const txTimestamp = timeOfRequest - 3600; // 1 hour ago

            const userOutputScript = getOutputScriptFromAddress(USER_ADDRESS);

            // Create a transaction with WITHDRAW action
            const withdrawEmppData = getOvermindEmpp(EmppAction.WITHDRAW);
            const opReturnScript = emppScript([withdrawEmppData]);

            const mockTx: Tx = {
                txid: '0000000000000000000000000000000000000000000000000000000000000001',
                version: 2,
                inputs: [
                    {
                        outputScript: userOutputScript,
                        prevOut: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000002',
                            outIdx: 0,
                        },
                        inputScript: '',
                        sats: 1000n,
                        sequenceNo: 0,
                    },
                ],
                outputs: [
                    {
                        outputScript: toHex(opReturnScript.bytecode),
                        sats: 0n,
                    },
                    {
                        outputScript: getOutputScriptFromAddress(OTHER_ADDRESS),
                        sats: DEFAULT_DUST_SATS,
                        token: {
                            tokenId: REWARDS_TOKEN_ID,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                            atoms: 50n,
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: txTimestamp,
                size: 200,
                isCoinbase: false,
                isFinal: true,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
            };

            mockChronik.setTxHistoryByAddress(USER_ADDRESS, [mockTx]);

            const result = await hasWithdrawnInLast24Hours(
                USER_ADDRESS,
                mockChronik as unknown as ChronikClient,
            );

            expect(result).to.equal(true);
        });

        it('should return false when WITHDRAW transaction is older than 24 hours', async () => {
            const timeOfRequest = Math.ceil(Date.now() / 1000);
            const txTimestamp = timeOfRequest - 90000; // 25 hours ago (older than 24 hours)

            const userOutputScript = getOutputScriptFromAddress(USER_ADDRESS);

            // Create a transaction with WITHDRAW action
            const withdrawEmppData = getOvermindEmpp(EmppAction.WITHDRAW);
            const opReturnScript = emppScript([withdrawEmppData]);

            const mockTx: Tx = {
                txid: '0000000000000000000000000000000000000000000000000000000000000001',
                version: 2,
                inputs: [
                    {
                        outputScript: userOutputScript,
                        prevOut: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000002',
                            outIdx: 0,
                        },
                        inputScript: '',
                        sats: 1000n,
                        sequenceNo: 0,
                    },
                ],
                outputs: [
                    {
                        outputScript: toHex(opReturnScript.bytecode),
                        sats: 0n,
                    },
                    {
                        outputScript: getOutputScriptFromAddress(OTHER_ADDRESS),
                        sats: DEFAULT_DUST_SATS,
                        token: {
                            tokenId: REWARDS_TOKEN_ID,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                            atoms: 50n,
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: txTimestamp,
                size: 200,
                isCoinbase: false,
                isFinal: true,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
            };

            mockChronik.setTxHistoryByAddress(USER_ADDRESS, [mockTx]);

            const result = await hasWithdrawnInLast24Hours(
                USER_ADDRESS,
                mockChronik as unknown as ChronikClient,
            );

            expect(result).to.equal(false);
        });

        it('should return false when transaction is not sent by user', async () => {
            const timeOfRequest = Math.ceil(Date.now() / 1000);
            const txTimestamp = timeOfRequest - 3600; // 1 hour ago

            const otherOutputScript = getOutputScriptFromAddress(OTHER_ADDRESS);

            // Create a transaction where OTHER_ADDRESS is the sender (not USER_ADDRESS)
            const withdrawEmppData = getOvermindEmpp(EmppAction.WITHDRAW);
            const opReturnScript = emppScript([withdrawEmppData]);

            const mockTx: Tx = {
                txid: '0000000000000000000000000000000000000000000000000000000000000001',
                version: 2,
                inputs: [
                    {
                        outputScript: otherOutputScript, // Not user's address
                        prevOut: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000002',
                            outIdx: 0,
                        },
                        inputScript: '',
                        sats: 1000n,
                        sequenceNo: 0,
                    },
                ],
                outputs: [
                    {
                        outputScript: toHex(opReturnScript.bytecode),
                        sats: 0n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: txTimestamp,
                size: 200,
                isCoinbase: false,
                isFinal: true,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
            };

            mockChronik.setTxHistoryByAddress(USER_ADDRESS, [mockTx]);

            const result = await hasWithdrawnInLast24Hours(
                USER_ADDRESS,
                mockChronik as unknown as ChronikClient,
            );

            expect(result).to.equal(false);
        });

        it('should return false when transaction has no OP_RETURN output', async () => {
            const timeOfRequest = Math.ceil(Date.now() / 1000);
            const txTimestamp = timeOfRequest - 3600; // 1 hour ago

            const userOutputScript = getOutputScriptFromAddress(USER_ADDRESS);

            const mockTx: Tx = {
                txid: '0000000000000000000000000000000000000000000000000000000000000001',
                version: 2,
                inputs: [
                    {
                        outputScript: userOutputScript,
                        prevOut: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000002',
                            outIdx: 0,
                        },
                        inputScript: '',
                        sats: 1000n,
                        sequenceNo: 0,
                    },
                ],
                outputs: [
                    {
                        outputScript: getOutputScriptFromAddress(OTHER_ADDRESS),
                        sats: DEFAULT_DUST_SATS,
                        token: {
                            tokenId: REWARDS_TOKEN_ID,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                            atoms: 50n,
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: txTimestamp,
                size: 200,
                isCoinbase: false,
                isFinal: true,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
            };

            mockChronik.setTxHistoryByAddress(USER_ADDRESS, [mockTx]);

            const result = await hasWithdrawnInLast24Hours(
                USER_ADDRESS,
                mockChronik as unknown as ChronikClient,
            );

            expect(result).to.equal(false);
        });

        it('should handle pagination correctly', async () => {
            const timeOfRequest = Math.ceil(Date.now() / 1000);
            const txTimestamp = timeOfRequest - 3600; // 1 hour ago

            const userOutputScript = getOutputScriptFromAddress(USER_ADDRESS);

            // Create a WITHDRAW transaction
            const withdrawEmppData = getOvermindEmpp(EmppAction.WITHDRAW);
            const opReturnScript = emppScript([withdrawEmppData]);

            // Create 30 transactions (more than one page of 25)
            // First 25 will be on page 0, the WITHDRAW tx will be on page 1
            const txs: Tx[] = [];

            // Add 25 non-WITHDRAW transactions (page 0)
            for (let i = 0; i < 25; i++) {
                const likeEmppData = getOvermindEmpp(EmppAction.LIKE, i);
                const likeOpReturnScript = emppScript([likeEmppData]);

                txs.push({
                    txid: `00000000000000000000000000000000000000000000000000000000000000${i.toString(16).padStart(2, '0')}`,
                    version: 2,
                    inputs: [
                        {
                            outputScript: userOutputScript,
                            prevOut: {
                                txid: '0000000000000000000000000000000000000000000000000000000000000002',
                                outIdx: 0,
                            },
                            inputScript: '',
                            sats: 1000n,
                            sequenceNo: 0,
                        },
                    ],
                    outputs: [
                        {
                            outputScript: toHex(likeOpReturnScript.bytecode),
                            sats: 0n,
                        },
                    ],
                    lockTime: 0,
                    timeFirstSeen: txTimestamp,
                    size: 200,
                    isCoinbase: false,
                    isFinal: true,
                    tokenEntries: [],
                    tokenFailedParsings: [],
                    tokenStatus: 'TOKEN_STATUS_NORMAL',
                });
            }

            // Add WITHDRAW transaction (will be on page 1)
            txs.push({
                txid: '000000000000000000000000000000000000000000000000000000000000001a',
                version: 2,
                inputs: [
                    {
                        outputScript: userOutputScript,
                        prevOut: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000002',
                            outIdx: 0,
                        },
                        inputScript: '',
                        sats: 1000n,
                        sequenceNo: 0,
                    },
                ],
                outputs: [
                    {
                        outputScript: toHex(opReturnScript.bytecode),
                        sats: 0n,
                    },
                    {
                        outputScript: getOutputScriptFromAddress(OTHER_ADDRESS),
                        sats: DEFAULT_DUST_SATS,
                        token: {
                            tokenId: REWARDS_TOKEN_ID,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                            atoms: 50n,
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: txTimestamp,
                size: 200,
                isCoinbase: false,
                isFinal: true,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
            });

            mockChronik.setTxHistoryByAddress(USER_ADDRESS, txs);

            const result = await hasWithdrawnInLast24Hours(
                USER_ADDRESS,
                mockChronik as unknown as ChronikClient,
            );

            expect(result).to.equal(true);
        });

        it('should return false on chronik error (fail open)', async () => {
            // Create a mock chronik that throws an error
            const errorChronik = {
                address: () => ({
                    history: () => Promise.reject(new Error('Chronik error')),
                }),
            } as unknown as ChronikClient;

            const result = await hasWithdrawnInLast24Hours(
                USER_ADDRESS,
                errorChronik,
            );

            expect(result).to.equal(false);
        });
    });
});
