// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import ChronikService from '../chronik';

// No jest.mock needed for these tests

describe('ChronikService', () => {
    let chronikService: ChronikService;

    beforeEach(() => {
        chronikService = new ChronikService({
            urls: ['http://localhost:8080'],
            connectionStrategy: 'closestFirst',
        });
    });

    describe('calculateCoinbaseRewards', () => {
        it('should calculate rewards for block before IFP activation', () => {
            const height = 661647; // Before IFP activation
            const coinbaseOutputs = [
                {
                    sats: 625000000n,
                    outputScript: '76a914miner1234567890abcdef88ac',
                },
            ];

            const result = (chronikService as any).calculateCoinbaseRewards(
                height,
                coinbaseOutputs,
            );

            expect(result.sum_coinbase_output_sats).to.equal(625000000n);
            expect(result.miner_reward_sats).to.equal(625000000n);
            expect(result.staking_reward_sats).to.equal(0n);
            expect(result.ifp_reward_sats).to.equal(0n);
        });

        it('should calculate rewards for block with IFP (old script)', () => {
            const height = 700000; // After IFP activation, before script change
            const coinbaseOutputs = [
                {
                    sats: 500000000n,
                    outputScript: '76a914miner1234567890abcdef88ac',
                },
                {
                    sats: 125000000n,
                    outputScript:
                        'a914260617ebf668c9102f71ce24aba97fcaaf9c666a87',
                }, // Old IFP script
            ];

            const result = (chronikService as any).calculateCoinbaseRewards(
                height,
                coinbaseOutputs,
            );

            expect(result.sum_coinbase_output_sats).to.equal(625000000n);
            expect(result.miner_reward_sats).to.equal(500000000n);
            expect(result.staking_reward_sats).to.equal(0n);
            expect(result.ifp_reward_sats).to.equal(125000000n);
        });

        it('should calculate rewards for block with IFP (new script)', () => {
            const height = 750000; // After IFP script change
            const coinbaseOutputs = [
                {
                    sats: 500000000n,
                    outputScript: '76a914miner1234567890abcdef88ac',
                },
                {
                    sats: 125000000n,
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                }, // New IFP script
            ];

            const result = (chronikService as any).calculateCoinbaseRewards(
                height,
                coinbaseOutputs,
            );

            expect(result.sum_coinbase_output_sats).to.equal(625000000n);
            expect(result.miner_reward_sats).to.equal(500000000n);
            expect(result.staking_reward_sats).to.equal(0n);
            expect(result.ifp_reward_sats).to.equal(125000000n);
        });

        it('should calculate rewards for block with staking (after staking activation)', () => {
            const height = 820000; // After staking activation
            const coinbaseOutputs = [
                {
                    sats: 450000000n,
                    outputScript: '76a914miner1234567890abcdef88ac',
                },
                {
                    sats: 125000000n,
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                }, // IFP script
                {
                    sats: 65000000n,
                    outputScript: '76a914staker1234567890abcdef88ac',
                }, // ~10.2% of total
            ];

            const result = (chronikService as any).calculateCoinbaseRewards(
                height,
                coinbaseOutputs,
            );

            expect(result.sum_coinbase_output_sats).to.equal(640000000n);
            expect(result.miner_reward_sats).to.equal(450000000n);
            expect(result.staking_reward_sats).to.equal(65000000n);
            expect(result.ifp_reward_sats).to.equal(125000000n);
        });

        it('should handle edge case where staking reward is not found', () => {
            const height = 820000; // After staking activation
            const coinbaseOutputs = [
                {
                    sats: 500000000n,
                    outputScript: '76a914miner1234567890abcdef88ac',
                },
                {
                    sats: 125000000n,
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                }, // IFP script
                // No staking reward output
            ];

            const result = (chronikService as any).calculateCoinbaseRewards(
                height,
                coinbaseOutputs,
            );

            expect(result.sum_coinbase_output_sats).to.equal(625000000n);
            expect(result.miner_reward_sats).to.equal(500000000n);
            expect(result.staking_reward_sats).to.equal(0n);
            expect(result.ifp_reward_sats).to.equal(125000000n);
        });

        it('should handle multiple miner outputs correctly', () => {
            const height = 820000; // After staking activation
            const coinbaseOutputs = [
                {
                    sats: 400000000n,
                    outputScript: '76a914miner11234567890abcdef88ac',
                },
                {
                    sats: 100000000n,
                    outputScript: '76a914miner21234567890abcdef88ac',
                },
                {
                    sats: 125000000n,
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                }, // IFP script
                {
                    sats: 70000000n,
                    outputScript: '76a914staker1234567890abcdef88ac',
                }, // ~10.1% of total
            ];

            const result = (chronikService as any).calculateCoinbaseRewards(
                height,
                coinbaseOutputs,
            );

            expect(result.sum_coinbase_output_sats).to.equal(695000000n);
            expect(result.miner_reward_sats).to.equal(500000000n); // Both miner outputs combined
            expect(result.staking_reward_sats).to.equal(70000000n);
            expect(result.ifp_reward_sats).to.equal(125000000n);
        });
    });

    describe('claim and withdrawal counters', () => {
        let chronikService: ChronikService;
        beforeEach(() => {
            chronikService = new ChronikService({
                urls: ['http://localhost:8080'],
                connectionStrategy: 'closestFirst',
            });
        });

        it('identifies cachet_claims', () => {
            const blockTxs = [
                // Not a claim (wrong input script)
                {
                    isCoinbase: false,
                    inputs: [{ outputScript: 'deadbeef' }],
                    outputs: [],
                },
                // Not a claim (right input, wrong token)
                {
                    isCoinbase: false,
                    inputs: [
                        {
                            outputScript:
                                '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        },
                    ],
                    outputs: [
                        { token: { tokenId: 'notcachet', atoms: 10000n } },
                    ],
                },
                // Not a claim (right input, right token, wrong amount)
                {
                    isCoinbase: false,
                    inputs: [
                        {
                            outputScript:
                                '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        },
                    ],
                    outputs: [
                        {
                            token: {
                                tokenId:
                                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                                atoms: 9999n,
                            },
                        },
                    ],
                },
                // Valid claim
                {
                    isCoinbase: false,
                    inputs: [
                        {
                            outputScript:
                                '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        },
                    ],
                    outputs: [
                        {
                            token: {
                                tokenId:
                                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                                atoms: 10000n,
                            },
                        },
                    ],
                },
                // Valid claim, but two outputs (should only count once)
                {
                    isCoinbase: false,
                    inputs: [
                        {
                            outputScript:
                                '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        },
                    ],
                    outputs: [
                        {
                            token: {
                                tokenId:
                                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                                atoms: 10000n,
                            },
                        },
                        {
                            token: {
                                tokenId:
                                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                                atoms: 10000n,
                            },
                        },
                    ],
                },
                // Coinbase tx should be ignored
                {
                    isCoinbase: true,
                    inputs: [
                        {
                            outputScript:
                                '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        },
                    ],
                    outputs: [
                        {
                            token: {
                                tokenId:
                                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                                atoms: 10000n,
                            },
                        },
                    ],
                },
            ];
            const count = (chronikService as any).countCachetClaims(blockTxs);
            expect(count).to.equal(2);
        });

        it('identifies cashtab_faucet_claims', () => {
            const blockTxs = [
                // Not a claim (wrong input script)
                {
                    isCoinbase: false,
                    inputs: [{ outputScript: 'deadbeef' }],
                    outputs: [],
                },
                // Not a claim (right input, wrong amount)
                {
                    isCoinbase: false,
                    inputs: [
                        {
                            outputScript:
                                '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        },
                    ],
                    outputs: [{ sats: 4199n }],
                },
                // Valid claim
                {
                    isCoinbase: false,
                    inputs: [
                        {
                            outputScript:
                                '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        },
                    ],
                    outputs: [{ sats: 4200n }],
                },
                // Valid claim, two outputs (should only count once)
                {
                    isCoinbase: false,
                    inputs: [
                        {
                            outputScript:
                                '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        },
                    ],
                    outputs: [{ sats: 4200n }, { sats: 4200n }],
                },
                // Coinbase tx should be ignored
                {
                    isCoinbase: true,
                    inputs: [
                        {
                            outputScript:
                                '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        },
                    ],
                    outputs: [{ sats: 4200n }],
                },
            ];
            const count = (chronikService as any).countCashtabFaucetClaims(
                blockTxs,
            );
            expect(count).to.equal(2);
        });

        it('identifies and sums binance_withdrawals', () => {
            const blockTxs = [
                // Not a withdrawal (wrong input script)
                {
                    isCoinbase: false,
                    inputs: [{ outputScript: 'deadbeef' }],
                    outputs: [],
                },
                // Valid withdrawal, one output
                {
                    isCoinbase: false,
                    inputs: [
                        {
                            outputScript:
                                '76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac',
                        },
                    ],
                    outputs: [
                        {
                            outputScript:
                                '76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac',
                            sats: 100n,
                        }, // not counted
                        { outputScript: '76a914other', sats: 200n }, // counted
                        { outputScript: '76a914other2', sats: 300n }, // counted
                    ],
                },
                // Valid withdrawal, two outputs
                {
                    isCoinbase: false,
                    inputs: [
                        {
                            outputScript:
                                '76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac',
                        },
                    ],
                    outputs: [
                        {
                            outputScript:
                                '76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac',
                            sats: 400n,
                        }, // not counted
                        { outputScript: '76a914other3', sats: 500n }, // counted
                    ],
                },
                // Coinbase tx should be ignored
                {
                    isCoinbase: true,
                    inputs: [
                        {
                            outputScript:
                                '76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac',
                        },
                    ],
                    outputs: [{ outputScript: '76a914other', sats: 1000n }],
                },
            ];
            const result = (chronikService as any).countBinanceWithdrawals(
                blockTxs,
            );
            expect(result.count).to.equal(3); // 2 from first, 1 from second
            expect(result.totalSats).to.equal(200n + 300n + 500n);
        });
    });

    describe('Agora volume extraction', () => {
        let chronikService: ChronikService;
        beforeEach(() => {
            chronikService = new ChronikService({
                urls: ['http://localhost:8080'],
                connectionStrategy: 'closestFirst',
            });
        });

        it('extracts 100,000,000 sats from a real Agora BUY tx', () => {
            const tx = {
                txid: '2c18470e70371919ebe59a2ef411867b7e1d5c38e84c527783166e589337f0ae',
                version: 2,
                inputs: [
                    {
                        inputScript:
                            '21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b140f862f7adb5f3d1b78dba158edaba5c66dd6c28a064b01a46b1e5c0e3c33a0c69eb5babdcc89277c963dcb1e4b728d474d3f5815ec23bf92ca2cb0ff810b003fd4422020000000000001976a91443abd2bc9ad8b946958af03780768e15722aa4d088acc2f27fe1000000001976a91443abd2bc9ad8b946958af03780768e15722aa4d088ac4d1b0141e10c782008a2dad117bdcd2d186d30525be0b6331411d52529d8a5ce906c3502000000c27b63817b6ea269760365cd1da26976559700887d945279012a7f757892635358807e7855965667525868807e5279559655807e827c7e5379012a7f777c7e825980bc7c7e01007e7b5493559657807e041976a914707501577f77a97e0288ac7e7e6b7d02220258800317a9147e024c7872587d807e7e7e01ab7e537901257f7702c2007f5c7f7701207f547f750410258066886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501577f7768ac2202000000000000fffffffffd27354aa3be3d65c42e326db853230059752148b6a921c5e1c3240f9e76cb1c10258066c10000000365cd1d514d46014c78534c5032000453454e44d44ecf795494b063aa10be876868880df8ef822577c1a546fb1cd9b6c2f57bc66a504b41475230075041525449414c01010500000000000000050000000000000065cd1d00000000001025806603e4d137b0fd6d8cfbb6aeb1d83c6cb33b19143e7faeacc1d79cf6f052dc56f65008fad0fa3400000000ab7b63817b6ea269760365cd1da26976559700887d945279012a7f757892635358807e7855965667525868807e5279559655807e827c7e5379012a7f777c7e825980bc7c7e01007e7b5493559657807e041976a914707501577f77a97e0288ac7e7e6b7d02220258800317a9147e024c7872587d807e7e7e01ab7e537901257f7702c2007f5c7f7701207f547f750410258066886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501577f7768ac',
                        plugins: {
                            agora: {
                                groups: [
                                    '5003e4d137b0fd6d8cfbb6aeb1d83c6cb33b19143e7faeacc1d79cf6f052dc56f650',
                                    '54c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                                    '46c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                                ],
                                data: [
                                    '5041525449414c',
                                    '01',
                                    '01',
                                    '0500000000000000',
                                    '0500000000000000',
                                    '65cd1d0000000000',
                                    '10258066',
                                ],
                            },
                        },
                    },
                    {
                        inputScript:
                            '41095c14b7151e9337bb0206f55e645f8ef4b90b849f300d3bbffe17caf3da0e0ad7bd6cd8af391b50ca87534fbcfb40a1b102322f700c09f0e5c0483ef0d2af7c412102146c4c4c7ae66f6400ae5c0bbfb835bd74efd988702e648a4fdd2a686dbdcdc9',
                    },
                ],
                outputs: [
                    { sats: 0n },
                    { sats: 100000000n },
                    { sats: 546n },
                    { sats: 546n },
                    { sats: 3783258818n },
                ],
            };
            const volume = (chronikService as any).parseAgoraBuyVolume(tx);
            expect(volume).to.equal(100000000n);
        });
    });

    describe('token type tx counters', () => {
        let chronikService: ChronikService;
        beforeEach(() => {
            chronikService = new ChronikService({
                urls: ['http://localhost:8080'],
                connectionStrategy: 'closestFirst',
            });
        });

        it('counts ALP and SLP token type txs correctly', () => {
            const blockTxs = [
                // ALP standard
                {
                    tokenEntries: [
                        { tokenType: { type: 'ALP_TOKEN_TYPE_STANDARD' } },
                    ],
                },
                // SLP fungible
                {
                    tokenEntries: [
                        { tokenType: { type: 'SLP_TOKEN_TYPE_FUNGIBLE' } },
                    ],
                },
                // SLP mint vault
                {
                    tokenEntries: [
                        { tokenType: { type: 'SLP_TOKEN_TYPE_MINT_VAULT' } },
                    ],
                },
                // SLP NFT1 group
                {
                    tokenEntries: [
                        { tokenType: { type: 'SLP_TOKEN_TYPE_NFT1_GROUP' } },
                    ],
                },
                // SLP NFT1 child
                {
                    tokenEntries: [
                        { tokenType: { type: 'SLP_TOKEN_TYPE_NFT1_CHILD' } },
                    ],
                },
                // Not a token tx
                { tokenEntries: [] },
                // Not a token tx (no tokenEntries)
                {},
                // Not a token tx (tokenEntries[0] missing)
                { tokenEntries: [] },
            ];
            const result = (chronikService as any).countTokenTypeTxs(blockTxs);
            expect(result.tx_count_alp_token_type_standard).to.equal(1);
            expect(result.tx_count_slp_token_type_fungible).to.equal(1);
            expect(result.tx_count_slp_token_type_mint_vault).to.equal(1);
            expect(result.tx_count_slp_token_type_nft1_group).to.equal(1);
            expect(result.tx_count_slp_token_type_nft1_child).to.equal(1);
        });

        it('ignores txs with missing or malformed tokenEntries', () => {
            const blockTxs = [
                {},
                { tokenEntries: null },
                { tokenEntries: [null] },
                { tokenEntries: [{ tokenType: null }] },
                { tokenEntries: [{ tokenType: { type: null } }] },
            ];
            const result = (chronikService as any).countTokenTypeTxs(blockTxs);
            expect(result.tx_count_alp_token_type_standard).to.equal(0);
            expect(result.tx_count_slp_token_type_fungible).to.equal(0);
            expect(result.tx_count_slp_token_type_mint_vault).to.equal(0);
            expect(result.tx_count_slp_token_type_nft1_group).to.equal(0);
            expect(result.tx_count_slp_token_type_nft1_child).to.equal(0);
        });
    });

    describe('app tx counters', () => {
        let chronikService: ChronikService;
        beforeEach(() => {
            chronikService = new ChronikService({
                urls: ['http://localhost:8080'],
                connectionStrategy: 'closestFirst',
            });
        });

        it('counts app transactions correctly', () => {
            const blockTxs = [
                // Coinbase tx (should be skipped)
                {
                    isCoinbase: true,
                    tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                    outputs: [{ outputScript: '6a123456' }],
                },
                // App tx (non-token with OP_RETURN)
                {
                    isCoinbase: false,
                    tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                    outputs: [{ outputScript: '6a123456' }],
                },
                // App tx with hex outputScript
                {
                    isCoinbase: false,
                    tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                    outputs: [{ outputScript: Buffer.from('6a123456', 'hex') }],
                },
                // Non-app tx (token tx)
                {
                    isCoinbase: false,
                    tokenStatus: 'TOKEN_STATUS_NORMAL',
                    outputs: [{ outputScript: '6a123456' }],
                },
                // Non-app tx (no OP_RETURN)
                {
                    isCoinbase: false,
                    tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                    outputs: [{ outputScript: '76a914123456' }],
                },
                // Non-app tx (no outputs)
                {
                    isCoinbase: false,
                    tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                    outputs: [],
                },
            ];
            const result = (chronikService as any).countAppTxs(blockTxs);
            expect(result).to.equal(2);
        });

        it('handles edge cases correctly', () => {
            const blockTxs = [
                // Missing outputs
                { isCoinbase: false, tokenStatus: 'TOKEN_STATUS_NON_TOKEN' },
                // Missing outputScript
                {
                    isCoinbase: false,
                    tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                    outputs: [{}],
                },
                // Empty outputScript
                {
                    isCoinbase: false,
                    tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                    outputs: [{ outputScript: '' }],
                },
            ];
            const result = (chronikService as any).countAppTxs(blockTxs);
            expect(result).to.equal(0);
        });
    });
});
