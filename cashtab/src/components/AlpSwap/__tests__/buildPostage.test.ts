// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikClient } from 'chronik-client';
import { fromHex, toHex } from 'ecash-lib';
import { Wallet } from 'ecash-wallet';
import { MockChronikClient } from '../../../../../modules/mock-chronik-client';
import { buildAlpSwapPostageTx } from 'components/AlpSwap/buildPostage';
import { SwapOutput } from 'services/alpSwapService';

const TOKEN_A =
    '488fb8fb66ce0a0a3800b83720d45b7d5acd5337b4aba71d63590708bfb4688c';
const TOKEN_B =
    '4b7ac96d8348e48d7935bddb5d3cd1352f5e8f02a1ce4b6091cb63473b27056c';

const DUMMY_SK = fromHex('22'.repeat(32));

describe('buildAlpSwapPostageTx', () => {
    it('builds a postage tx from a maker template', async () => {
        const mockChronik = new MockChronikClient();
        const wallet = Wallet.fromSk(
            DUMMY_SK,
            mockChronik as unknown as ChronikClient,
        );

        mockChronik.setBlockchainInfo({
            tipHash: '00'.repeat(32),
            tipHeight: 800000,
        });
        mockChronik.setUtxosByAddress(wallet.address, [
            {
                outpoint: {
                    txid: 'aa'.repeat(32),
                    outIdx: 0,
                },
                blockHeight: 800000,
                isCoinbase: false,
                sats: 546n,
                isFinal: true,
                token: {
                    tokenId: TOKEN_A,
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 1_000_000n,
                    isMintBaton: false,
                },
            },
            // Sats UTXO present but NO_SATS strategy should ignore needing fee sats
            {
                outpoint: {
                    txid: 'bb'.repeat(32),
                    outIdx: 0,
                },
                blockHeight: 800000,
                isCoinbase: false,
                sats: 100_000n,
                isFinal: true,
            },
        ]);
        await wallet.sync();

        const outputs: SwapOutput[] = [
            {
                tokenId: TOKEN_A,
                atoms: '9990',
                script: '76a9149ee291ccce035e375060873f38d848a3cc6a09d288ac',
            },
            {
                tokenId: TOKEN_A,
                atoms: '10',
                script: '76a9142de858cfe16bd61aa29b93250c8ca943f9a127a588ac',
            },
            {
                tokenId: TOKEN_B,
                atoms: '99',
            },
        ];

        const built = buildAlpSwapPostageTx({
            wallet,
            outputs,
            receivingTokenId: TOKEN_B,
            receivingDecimals: 2,
            receivingUtxoQty: 1,
            slushScriptHex:
                '76a9149ee291ccce035e375060873f38d848a3cc6a09d288ac',
        });

        expect(built.receivingTokenId).toBe(TOKEN_B);
        expect(built.receivingTokenAtoms).toBe(99n);
        expect(built.prePostageInputSats).toBe(546n);
        expect(built.serializedTxHex.length).toBeGreaterThan(100);
        expect(toHex(built.postageTx.partiallySignedTx.ser())).toBe(
            built.serializedTxHex,
        );
    });

    it('throws when the receiving output is missing', async () => {
        const mockChronik = new MockChronikClient();
        const wallet = Wallet.fromSk(
            DUMMY_SK,
            mockChronik as unknown as ChronikClient,
        );
        mockChronik.setBlockchainInfo({
            tipHash: '00'.repeat(32),
            tipHeight: 800000,
        });
        mockChronik.setUtxosByAddress(wallet.address, []);
        await wallet.sync();

        expect(() =>
            buildAlpSwapPostageTx({
                wallet,
                outputs: [
                    {
                        tokenId: TOKEN_A,
                        atoms: '10000',
                        script: '76a9149ee291ccce035e375060873f38d848a3cc6a09d288ac',
                    },
                ],
                receivingTokenId: TOKEN_B,
                receivingDecimals: 2,
                receivingUtxoQty: 1,
            }),
        ).toThrow('Missing receiving token output');
    });

    it('throws when receiving-token change is required but slush script is missing', async () => {
        const mockChronik = new MockChronikClient();
        const wallet = Wallet.fromSk(
            DUMMY_SK,
            mockChronik as unknown as ChronikClient,
        );
        mockChronik.setBlockchainInfo({
            tipHash: '00'.repeat(32),
            tipHeight: 800000,
        });
        mockChronik.setUtxosByAddress(wallet.address, []);
        await wallet.sync();

        expect(() =>
            buildAlpSwapPostageTx({
                wallet,
                outputs: [
                    {
                        tokenId: TOKEN_A,
                        atoms: '9990',
                        script: '76a9149ee291ccce035e375060873f38d848a3cc6a09d288ac',
                    },
                    {
                        tokenId: TOKEN_B,
                        atoms: '99',
                    },
                ],
                receivingTokenId: TOKEN_B,
                receivingDecimals: 2,
                receivingUtxoQty: 1,
            }),
        ).toThrow('Missing slush script for receiving token change');
    });
});
