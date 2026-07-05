// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { parseTx } from './parseTx';

describe('Blitz EMPP parseTx', () => {
    it('DICE bet transaction with EMPP data', () => {
        const diceBetTx = {
            txid: '921a2efe13b9df07c94d654786bb46fd400c8d89ad94e26df6d17429054c25e4',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '42fa96a83b681f35d30c11b2a5f8b7a14b18289a5a383efed9d05242a5b4e93a',
                        outIdx: 1,
                    },
                    inputScript:
                        '419a79a15367b632ec4708e87d8fc9639f5c5a5cdfe595ca5474bfb9edbb6e5d4ff0ee13796cb89b3c944a53eb4d6287ee5fc8ee8dac0c54b7bec7caa65cbe8f9241210263252562c7599628121abf30184728fd9be91a070ee4867e02eb21e8cd17d03d',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 111n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a914ebc488744ea4b0ca90fd93f06765a4973e918aaa88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a5037534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f948703022c0100000000a857010000000d44494345003e5e0602f904ea02',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914fc7250a211deddc70ee5a2738de5f07817351cef88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 300n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1770253388,
            size: 723,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                    burnsMintBatons: false,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            isFinal: true,
        };

        const walletHash = 'ebc488744ea4b0ca90fd93f06765a4973e918aaa';
        const parsed = parseTx(diceBetTx, [walletHash]);
        const diceAction = parsed.appActions.find(
            action => action.app === 'DICE Bet',
        );

        assert.ok(diceAction);
        assert.strictEqual(diceAction.isValid, true);
        assert.strictEqual(diceAction.action.minValue, 33971774);
        assert.strictEqual(diceAction.action.maxValue, 48891129);
    });

    it('ROLL payout transaction with EMPP data', () => {
        const rollPayoutTx = {
            txid: '3422888679d408db36e0232212f78dcb9177a90699c2290b39aa8068656bab80',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '4eae238c0c20c428f1d1834d6719c0c5fc08bc74c82a3f7b14f590ff52c39468',
                        outIdx: 1,
                    },
                    inputScript:
                        '4128362d7511d2185513ee818e6c2b352d9d6790ee219c859d5d4ba445b3ddb3b4a0c902a1f73e02d1a70533b1d5d706c771a277c605b4a02007249ce4bdf5ea04412102030e81163c1d05aa12992723ff5446fd9c81b4a27710859579d1f7a1df68b9cd',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 30n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a914fc7250a211deddc70ee5a2738de5f07817351cef88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a5037534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f948703021f00000000004fc3000000004a524f4c4c004eae238c0c20c428f1d1834d6719c0c5fc08bc74c82a3f7b14f590ff52c394685974350535d448c6ff39081db76b9b75be0266dfa5a75eef6ea9c56062d31f5010b6e35657',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914ebc488744ea4b0ca90fd93f06765a4973e918aaa88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 31n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1770250899,
            size: 677,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                    burnsMintBatons: false,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            isFinal: true,
            block: {
                height: 934991,
                hash: '000000000000000004db20a8b4346252ac50eb2e87edbb55a9c3cd21e4f81073',
                timestamp: 1770251247,
            },
        };

        const walletHash = 'ebc488744ea4b0ca90fd93f06765a4973e918aaa';
        const parsed = parseTx(rollPayoutTx, [walletHash]);
        const rollAction = parsed.appActions.find(
            action => action.app === 'ROLL Payout',
        );

        assert.ok(rollAction);
        assert.strictEqual(rollAction.isValid, true);
        assert.strictEqual(
            rollAction.action.betTxid,
            '4eae238c0c20c428f1d1834d6719c0c5fc08bc74c82a3f7b14f590ff52c39468',
        );
        assert.strictEqual(rollAction.action.roll, 87389273);
        assert.strictEqual(rollAction.action.result, 'W');
    });

    it('ROLL payout transaction with standalone OP_RETURN (XEC payout)', () => {
        const rollPayoutTx = {
            txid: 'f46f7395a8fc0a5ca94d41f5f3bcce21946a7ab38415f2fb7526179de7922a31',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '8ed99528a0442d87a047827a9593cfec5e196bc94ef90e937add92111dc40eef',
                        outIdx: 1,
                    },
                    inputScript:
                        '414e9d3e3e62cd835454dd8d19ff65cb3119cdaac1298ba9d44588b91189d97942ad18da696d2a9adfa5bccd0d50c18be05243d61b48448cacdbde2730272bbda1412103c0dd6557e064d59c93eed1e7930de34f1bff01946c12a9d38f4d74cd6ffc0672',
                    sats: 1100n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142d817e4eda9d327dbefeca6a5e56cb142d53606e88ac',
                },
                {
                    prevOut: {
                        txid: '61b2819585ad02457e6c15d7ec2b5f44d88c728f669551f750a84a7828c8c16b',
                        outIdx: 3,
                    },
                    inputScript:
                        '41040adca20cd57985fc43b74214347a0e057e008a61f2fb22a99db42ef9404b69119a3e4544005bda2eca094e30bd534d5c3b1398736c5faf98187a8a8392e1ed412103c0dd6557e064d59c93eed1e7930de34f1bff01946c12a9d38f4d74cd6ffc0672',
                    sats: 401392n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142d817e4eda9d327dbefeca6a5e56cb142d53606e88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04524f4c4c0100208ed99528a0442d87a047827a9593cfec5e196bc94ef90e937add92111dc40eef04b6574d0320abcebcc827f16a55afc825c7f2948cf95cfedc56eea0d4cc31988c59948d45560157',
                },
                {
                    sats: 1173n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
                {
                    sats: 400869n,
                    outputScript:
                        '76a9142d817e4eda9d327dbefeca6a5e56cb142d53606e88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1783139863,
            size: 450,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            isFinal: true,
        };
        const walletHash = '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d';
        const parsed = parseTx(rollPayoutTx, [walletHash]);
        const rollAction = parsed.appActions.find(
            action => action.app === 'ROLL Payout',
        );

        assert.ok(rollAction);
        assert.strictEqual(rollAction.isValid, true);
        assert.strictEqual(
            rollAction.action.betTxid,
            '8ed99528a0442d87a047827a9593cfec5e196bc94ef90e937add92111dc40eef',
        );
        assert.strictEqual(rollAction.action.roll, 55400374);
        assert.strictEqual(rollAction.action.result, 'W');
        assert.strictEqual(parsed.xecTxType, 'Received');
        assert.strictEqual(parsed.satoshisSent, 1173);
    });
});
