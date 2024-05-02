// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import path from 'path';
import {
    ChronikClientNode,
    TokenInfo,
    Token_InNode,
    TxHistoryPage_InNode,
    Tx_InNode,
} from '../../index';
import initializeTestRunner, {
    cleanupMochaRegtest,
    setMochaTimeout,
    TestInfo,
} from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Get blocktxs, txs, and history for ALP token txs', () => {
    // Define variables used in scope of this test
    const testName = path.basename(__filename);
    let testRunner: ChildProcess;
    let get_alp_genesis_txid: Promise<string>;
    let get_alp_mint_txid: Promise<string>;
    let get_alp_send_txid: Promise<string>;
    let get_alp_genesis2_txid: Promise<string>;
    let get_alp_multi_txid: Promise<string>;
    let get_alp_mega_txid: Promise<string>;
    let get_alp_mint_two_txid: Promise<string>;
    let get_alp_nonutf8_genesis_txid: Promise<string>;
    const statusEvent = new EventEmitter();
    let get_test_info: Promise<TestInfo>;
    let chronikUrl: string[];
    let setupScriptTermination: ReturnType<typeof setTimeout>;

    before(async function () {
        // Initialize testRunner before mocha tests
        testRunner = initializeTestRunner(testName, statusEvent);

        // Handle IPC messages from the setup script
        testRunner.on('message', function (message: any) {
            if (message && message.test_info) {
                get_test_info = new Promise(resolve => {
                    resolve(message.test_info);
                });
            }
            if (message && message.alp_genesis_txid) {
                get_alp_genesis_txid = new Promise(resolve => {
                    resolve(message.alp_genesis_txid);
                });
            }

            if (message && message.alp_mint_txid) {
                get_alp_mint_txid = new Promise(resolve => {
                    resolve(message.alp_mint_txid);
                });
            }

            if (message && message.alp_send_txid) {
                get_alp_send_txid = new Promise(resolve => {
                    resolve(message.alp_send_txid);
                });
            }

            if (message && message.alp_genesis2_txid) {
                get_alp_genesis2_txid = new Promise(resolve => {
                    resolve(message.alp_genesis2_txid);
                });
            }

            if (message && message.alp_multi_txid) {
                get_alp_multi_txid = new Promise(resolve => {
                    resolve(message.alp_multi_txid);
                });
            }

            if (message && message.alp_mega_txid) {
                get_alp_mega_txid = new Promise(resolve => {
                    resolve(message.alp_mega_txid);
                });
            }

            if (message && message.alp_mint_two_txid) {
                get_alp_mint_two_txid = new Promise(resolve => {
                    resolve(message.alp_mint_two_txid);
                });
            }

            if (message && message.alp_nonutf8_genesis_txid) {
                get_alp_nonutf8_genesis_txid = new Promise(resolve => {
                    resolve(message.alp_nonutf8_genesis_txid);
                });
            }
        });

        await once(statusEvent, 'ready');

        const testInfo = await get_test_info;

        chronikUrl = [testInfo.chronik];
        console.log(`chronikUrl set to ${JSON.stringify(chronikUrl)}`);

        setupScriptTermination = setMochaTimeout(
            this,
            testName,
            testInfo,
            testRunner,
        );

        testRunner.send('next');
    });

    after(async () => {
        await cleanupMochaRegtest(
            testName,
            testRunner,
            setupScriptTermination,
            statusEvent,
        );
    });

    beforeEach(async () => {
        await once(statusEvent, 'ready');
    });

    afterEach(() => {
        testRunner.send('next');
    });

    const CHAIN_INIT_HEIGHT = 100;
    const SCRIPTSIG_OP_TRUE_PAYLOAD =
        'da1745e9b549bd0bfa1a569971c77eba30cd5a4b';
    const BASE_TX_INPUT = {
        inputScript: '0151',
        outputScript: 'a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87',
        value: 5000,
        sequenceNo: 0,
    };
    const BASE_TX_OUTPUT = {
        value: 546,
        outputScript: 'a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87',
    };
    const BASE_TX_TOKEN_INFO_ALP = {
        tokenType: {
            protocol: 'ALP',
            type: 'ALP_TOKEN_TYPE_STANDARD',
            number: 0,
        },
        entryIdx: 0,
        amount: '0',
        isMintBaton: false,
    };
    const BASE_TOKEN_ENTRY = {
        // omit tokenId, txType, and tokenType as these should always be tested
        isInvalid: false,
        burnSummary: '',
        failedColorings: [],
        actualBurnAmount: '0',
        intentionalBurn: '0',
        burnsMintBatons: false,
    };
    let alpGenesisTxid = '';
    let alpMintTxid = '';
    let alpSendTxid = '';
    let alpNextGenesisTxid = '';
    let alpMultiTxid = '';
    let alpMegaTxid = '';
    let alpMintTwoTxid = '';
    let alpNonUtf8GenesisTxid = '';

    let alpGenesis: Tx_InNode;
    let alpMint: Tx_InNode;
    let alpSend: Tx_InNode;
    let alpNextGenesis: Tx_InNode;
    let alpMulti: Tx_InNode;
    let alpMega: Tx_InNode;
    let alpMintTwo: Tx_InNode;
    let alpSendTwo: Tx_InNode;

    const alpTokenInfo: TokenInfo = {
        tokenId:
            '1111111111111111111111111111111111111111111111111111111111111111',
        timeFirstSeen: 1300000000,
        tokenType: {
            protocol: 'ALP',
            type: 'ALP_TOKEN_TYPE_STANDARD',
            number: 0,
        },
        // We do not get hash in GenesisInfo for ALP
        // We get data and authPubkey keys in GenesisInfo for ALP
        // We do not get mintVaultScripthash for non-SLP_MINT_VAULT
        genesisInfo: {
            tokenTicker: 'TEST',
            tokenName: 'Test Token',
            url: 'http://example.com',
            data: new Uint8Array([84, 111, 107, 101, 110, 32, 68, 97, 116, 97]),
            authPubkey: '546f6b656e205075626b6579',
            decimals: 4,
        },
    };

    let confirmedTxsForAlpGenesisTxid: TxHistoryPage_InNode;

    it('Gets an ALP genesis tx from the mempool', async () => {
        const chronik = new ChronikClientNode(chronikUrl);

        alpGenesisTxid = await get_alp_genesis_txid;

        // We can get an alp genesis tx from the mempool
        alpGenesis = await chronik.tx(alpGenesisTxid);

        // We get expected inputs including expected Token data
        // We get no token info in tx inputs
        expect(alpGenesis.inputs).to.deep.equal([
            {
                ...BASE_TX_INPUT,
                prevOut: {
                    txid: '3fa435fca55edf447ef7539ecba141a6585fa71ac4062cdcc61f1235c40f4613',
                    outIdx: 0,
                },
                value: 5000000000,
            },
        ]);

        // We get expected outputs including expected Token data
        const expectedOutputs = [
            {
                ...BASE_TX_OUTPUT,
                value: 0,
                outputScript:
                    '6a504c63534c5032000747454e4553495304544553540a5465737420546f6b656e12687474703a2f2f6578616d706c652e636f6d0a546f6b656e20446174610c546f6b656e205075626b657904040a00000000001400000000001e000000000000000000000002',
            },
            {
                ...BASE_TX_OUTPUT,
                value: 10000,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    amount: '10',
                },
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    amount: '20',
                },
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    amount: '30',
                },
            },
            {
                ...BASE_TX_OUTPUT,
                value: 4999900000,
            },
            {
                ...BASE_TX_OUTPUT,
                value: 5000,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    isMintBaton: true,
                },
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    isMintBaton: true,
                },
            },
        ];
        expect(alpGenesis.outputs).to.deep.equal(expectedOutputs);

        // We get a Entries of expected shape, with tokenId the txid for a genesis tx
        expect(alpGenesis.tokenEntries).to.deep.equal([
            {
                ...BASE_TOKEN_ENTRY,
                tokenId: alpGenesisTxid,
                txType: 'GENESIS',
                tokenType: {
                    number: 0,
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                },
            },
        ]);

        // The token did not fail parsings
        expect(alpGenesis.tokenFailedParsings).to.deep.equal([]);

        // Normal status
        expect(alpGenesis.tokenStatus).to.eql('TOKEN_STATUS_NORMAL');

        // We can get the same token info from calling chronik.tokenId.utxos() on this genesis txid
        const utxosByTokenId = await chronik.tokenId(alpGenesisTxid).utxos();

        // We get the calling tokenId returned
        expect(utxosByTokenId.tokenId).to.eql(alpGenesisTxid);

        // Utxos returned by token id include Token object matching the outputs, except they have no entryIdx

        // Get only the outputs that are token utxos for alpGenesisTxid
        const outputsWithTokenKey = expectedOutputs.filter(
            output => 'token' in output,
        );

        const utxoTokenKeysFromOutputs: Token_InNode[] = [];
        for (const output of outputsWithTokenKey) {
            if ('token' in output) {
                const { token } = output;
                // Remove the entryIdx key from these outputs, as we do not expect to see it in tokenId.utxos() output
                delete (token as Token_InNode).entryIdx;
                utxoTokenKeysFromOutputs.push(output.token as Token_InNode);
            }
        }

        // We have as many utxosByTokenId as we do outputs with token key
        expect(utxosByTokenId.utxos.length).to.eql(
            utxoTokenKeysFromOutputs.length,
        );

        // They match and are in the same order
        for (let i = 0; i < utxosByTokenId.utxos.length; i += 1) {
            expect(utxosByTokenId.utxos[i].token).to.deep.equal(
                utxoTokenKeysFromOutputs[i],
            );
        }

        // Utxos called by tokenId return expected script
        for (const utxo of utxosByTokenId.utxos) {
            expect(utxo.script).to.eql(`a914${SCRIPTSIG_OP_TRUE_PAYLOAD}87`);
        }

        // We get the same tx info for this tx from calling chronik.tokenId().unconfirmedTxs()
        const unconfirmedTxsForThisTokenId = await chronik
            .tokenId(alpGenesisTxid)
            .unconfirmedTxs();
        expect(unconfirmedTxsForThisTokenId.txs.length).to.eql(1);
        expect(unconfirmedTxsForThisTokenId.txs[0]).to.deep.equal(alpGenesis);

        // We get nothing from confirmedTxs() as none are confirmed
        const confirmedTxsForThisTokenId = await chronik
            .tokenId(alpGenesisTxid)
            .confirmedTxs();
        expect(confirmedTxsForThisTokenId.txs.length).to.eql(0);

        // History returns the output of confirmed + unconfirmed (in this case, just unconfirmed)
        const historyForThisTokenId = await chronik
            .tokenId(alpGenesisTxid)
            .history();
        expect(historyForThisTokenId.txs.length).to.eql(1);
        expect(historyForThisTokenId.txs[0]).to.deep.equal(alpGenesis);

        // We can get token info of an alp token from the mempool
        const alpGenesisMempoolInfo = await chronik.token(alpGenesisTxid);
        expect(alpGenesisMempoolInfo).to.deep.equal({
            ...alpTokenInfo,
            tokenId: alpGenesisTxid,
        });
        // Invalid tokenId is rejected
        await expect(chronik.token('somestring')).to.be.rejectedWith(
            Error,
            `Failed getting /token/somestring (): 400: Not a txid: somestring`,
        );
        // We get expected error for a txid that is not in the mempool
        await expect(
            chronik.token(
                '0dab1008db30343a4f771983e9fd96cbc15f0c6efc73f5249c9bae311ef1e92f',
            ),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /token/0dab1008db30343a4f771983e9fd96cbc15f0c6efc73f5249c9bae311ef1e92f (): 404: Token 0dab1008db30343a4f771983e9fd96cbc15f0c6efc73f5249c9bae311ef1e92f not found in the index`,
        );
    });
    it('Gets an ALP mint tx from the mempool', async () => {
        const chronik = new ChronikClientNode(chronikUrl);

        // We can get an alp mint tx from the mempool
        alpMintTxid = await get_alp_mint_txid;

        alpMint = await chronik.tx(alpMintTxid);

        // We get expected inputs including expected Token data
        expect(alpMint.inputs).to.deep.equal([
            {
                ...BASE_TX_INPUT,
                prevOut: {
                    txid: alpGenesisTxid,
                    outIdx: 5,
                },
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    amount: '0',
                    isMintBaton: true,
                },
            },
        ]);

        // We get expected outputs including expected Token data
        expect(alpMint.outputs).to.deep.equal([
            {
                ...BASE_TX_OUTPUT,
                value: 0,
                outputScript:
                    '6a5038534c503200044d494e54e2c68fa87324d048fbb0b72ca7d386ad757967f20244854f14920a6caa714dbb0205000000000000000000000001',
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    amount: '5',
                },
            },
            {
                ...BASE_TX_OUTPUT,
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    amount: '0',
                    isMintBaton: true,
                },
            },
        ]);

        // We get a Entries of expected shape, with tokenId the txid of the genesis tx
        expect(alpMint.tokenEntries).to.deep.equal([
            {
                ...BASE_TOKEN_ENTRY,
                tokenId: alpGenesisTxid,
                txType: 'MINT',
                tokenType: {
                    number: 0,
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                },
            },
        ]);

        // The token did not fail parsings
        expect(alpMint.tokenFailedParsings).to.deep.equal([]);

        // Normal status
        expect(alpMint.tokenStatus).to.eql('TOKEN_STATUS_NORMAL');

        // Error is thrown for a txid that is in the mempool but is not a tokenId
        await expect(chronik.token(alpMintTxid)).to.be.rejectedWith(
            Error,
            `Failed getting /token/0dab1008db30343a4f771983e9fd96cbc15f0c6efc73f5249c9bae311ef1e92f (): 404: Token 0dab1008db30343a4f771983e9fd96cbc15f0c6efc73f5249c9bae311ef1e92f not found in the index`,
        );
    });
    it('Gets an ALP send tx from the mempool', async () => {
        const chronik = new ChronikClientNode(chronikUrl);

        // We can get an alp send tx from the mempool
        alpSendTxid = await get_alp_send_txid;

        alpSend = await chronik.tx(alpSendTxid);

        // We get expected inputs including expected Token data
        expect(alpSend.inputs).to.deep.equal([
            {
                ...BASE_TX_INPUT,
                prevOut: {
                    txid: alpGenesisTxid,
                    outIdx: 1,
                },
                value: 10000,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    amount: '10',
                },
            },
            {
                ...BASE_TX_INPUT,
                prevOut: {
                    txid: '0dab1008db30343a4f771983e9fd96cbc15f0c6efc73f5249c9bae311ef1e92f',
                    outIdx: 1,
                },
                value: 546,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    amount: '5',
                },
            },
        ]);

        // We get expected outputs including expected Token data
        expect(alpSend.outputs).to.deep.equal([
            {
                ...BASE_TX_OUTPUT,
                value: 0,
                outputScript:
                    '6a5037534c5032000453454e44e2c68fa87324d048fbb0b72ca7d386ad757967f20244854f14920a6caa714dbb020300000000000c0000000000',
            },
            {
                ...BASE_TX_OUTPUT,
                value: 5000,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    amount: '3',
                },
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    amount: '12',
                },
            },
        ]);

        // We get a Entries of expected shape, with tokenId the txid of the genesis tx
        expect(alpSend.tokenEntries).to.deep.equal([
            {
                ...BASE_TOKEN_ENTRY,
                tokenId: alpGenesisTxid,
                txType: 'SEND',
                tokenType: {
                    number: 0,
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                },
            },
        ]);

        // The token did not fail parsings
        expect(alpSend.tokenFailedParsings).to.deep.equal([]);

        // Normal status
        expect(alpSend.tokenStatus).to.eql('TOKEN_STATUS_NORMAL');
    });
    it('Gets another ALP genesis tx from the mempool', async () => {
        const chronik = new ChronikClientNode(chronikUrl);

        // We can get another alp genesis tx from the mempool
        alpNextGenesisTxid = await get_alp_genesis2_txid;

        alpNextGenesis = await chronik.tx(alpNextGenesisTxid);

        // We get expected inputs including expected Token data
        expect(alpNextGenesis.inputs).to.deep.equal([
            {
                ...BASE_TX_INPUT,
                prevOut: {
                    txid: alpGenesisTxid,
                    outIdx: 4,
                },
                value: 4999900000,
            },
        ]);

        // We get expected outputs including expected Token data
        expect(alpNextGenesis.outputs).to.deep.equal([
            {
                ...BASE_TX_OUTPUT,
                value: 0,
                outputScript:
                    '6a501b534c5032000747454e455349530000000000000164000000000002',
            },
            {
                ...BASE_TX_OUTPUT,
                value: 5000,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpNextGenesisTxid,
                    amount: '100',
                },
            },
            {
                ...BASE_TX_OUTPUT,
                value: 5000,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpNextGenesisTxid,
                    isMintBaton: true,
                },
            },
            {
                ...BASE_TX_OUTPUT,
                value: 5000,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpNextGenesisTxid,
                    isMintBaton: true,
                },
            },
            {
                ...BASE_TX_OUTPUT,
                value: 4999800000,
            },
        ]);

        // We get a Entries of expected shape, with tokenId the txid of this new genesis tx
        expect(alpNextGenesis.tokenEntries).to.deep.equal([
            {
                ...BASE_TOKEN_ENTRY,
                tokenId: alpNextGenesisTxid,
                txType: 'GENESIS',
                tokenType: {
                    number: 0,
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                },
            },
        ]);

        // The token did not fail parsings
        expect(alpNextGenesis.tokenFailedParsings).to.deep.equal([]);

        // Normal status
        expect(alpNextGenesis.tokenStatus).to.eql('TOKEN_STATUS_NORMAL');
    });
    it('Gets an ALP genesis, mint, and send (also a burn) combo tx from the mempool', async () => {
        const chronik = new ChronikClientNode(chronikUrl);

        // We can get an ALP GENESIS + MINT + SEND all in one tx from the mempool
        alpMultiTxid = await get_alp_multi_txid;

        alpMulti = await chronik.tx(alpMultiTxid);

        // We get expected inputs including expected Token data
        expect(alpMulti.inputs).to.deep.equal([
            {
                ...BASE_TX_INPUT,
                prevOut: {
                    txid: 'e623ab8971c93fa1a831a4310da65554c8dfd811c16cd5d41c6612268cb5dd5f',
                    outIdx: 1,
                },
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    entryIdx: 2,
                    amount: '3',
                },
            },
            {
                ...BASE_TX_INPUT,
                prevOut: {
                    txid: alpNextGenesisTxid,
                    outIdx: 2,
                },
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpNextGenesisTxid,
                    entryIdx: 1,
                    isMintBaton: true,
                },
            },
        ]);

        // We get expected outputs including expected Token data
        expect(alpMulti.outputs).to.deep.equal([
            {
                ...BASE_TX_OUTPUT,
                value: 0,
                outputScript:
                    '6a5026534c5032000747454e45534953054d554c5449000000000002ffffffffffff0000000000000138534c503200044d494e542c787e508ba86115c7fb13cc582d97a6f3b7d60dad070dcf49e19d0aec12df72020000000000000500000000000030534c503200044255524ee2c68fa87324d048fbb0b72ca7d386ad757967f20244854f14920a6caa714dbb01000000000049534c5032000453454e44e2c68fa87324d048fbb0b72ca7d386ad757967f20244854f14920a6caa714dbb05000000000000000000000000000000000000000000000000020000000000',
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpMultiTxid,
                    amount: '281474976710655',
                },
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpNextGenesisTxid,
                    entryIdx: 1,
                    amount: '5',
                },
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpMultiTxid,
                    isMintBaton: true,
                },
            },
            {
                ...BASE_TX_OUTPUT,
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    entryIdx: 2,
                    amount: '2',
                },
            },
            {
                ...BASE_TX_OUTPUT,
            },
        ]);

        // We get a Entries of expected shape, with genesis tokenId the txid of this new genesis tx
        // and other tokenIds corresponding to the tokens burned or sent
        expect(alpMulti.tokenEntries).to.deep.equal([
            {
                ...BASE_TOKEN_ENTRY,
                tokenId: alpMultiTxid,
                txType: 'GENESIS',
                tokenType: {
                    number: 0,
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                },
            },
            {
                ...BASE_TOKEN_ENTRY,
                tokenId: alpNextGenesisTxid,
                txType: 'MINT',
                tokenType: {
                    number: 0,
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                },
            },
            {
                ...BASE_TOKEN_ENTRY,
                tokenId: alpGenesisTxid,
                txType: 'SEND',
                actualBurnAmount: '1',
                intentionalBurn: '1',
                tokenType: {
                    number: 0,
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                },
            },
        ]);

        // The token did not fail parsings
        expect(alpMulti.tokenFailedParsings).to.deep.equal([]);

        // Normal status
        expect(alpMulti.tokenStatus).to.eql('TOKEN_STATUS_NORMAL');

        // Test order of tokenId.history()
        const unconfirmedTxs = await chronik
            .tokenId(alpGenesisTxid)
            .unconfirmedTxs();

        const alphabeticalBroadcastAlpGenesisMempoolTxs = [
            alpGenesisTxid,
            alpMintTxid,
            alpSendTxid,
            alpMultiTxid,
        ].sort();

        // Unconfirmed txs come in alphabetical order by txid
        // Note that the genesis tx was broadcast first but is alphabetically 2nd
        for (let i = 0; i < unconfirmedTxs.txs.length; i += 1) {
            expect(unconfirmedTxs.txs[i].txid).to.eql(
                alphabeticalBroadcastAlpGenesisMempoolTxs[i],
            );
        }

        // Test order of tokenId.history()
        const historyTxs = await chronik.tokenId(alpGenesisTxid).history();

        // History txs are sorted by blockheight, then timeFirstSeen, then reverse alphabetical by txid
        // These txs all have the same blockheight and timeFirstSeen, so we see them in reverse alphabetical order
        const reverseAlphabeticalBroadcastAlpGenesisMempoolTxs = [
            alpGenesisTxid,
            alpMintTxid,
            alpSendTxid,
            alpMultiTxid,
        ]
            .sort()
            .reverse();
        for (let i = 0; i < historyTxs.txs.length; i += 1) {
            expect(historyTxs.txs[i].txid).to.eql(
                reverseAlphabeticalBroadcastAlpGenesisMempoolTxs[i],
            );
        }
    });
    it('Can get all of the above txs, and a wild mega-tx, from the blockTxs endpoint after they are mined in a block', async () => {
        const chronik = new ChronikClientNode(chronikUrl);

        // Now that we have a block, we get a block key from token info
        const alpGenesisConfirmedInfo = await chronik.token(alpGenesisTxid);
        expect(alpGenesisConfirmedInfo).to.deep.equal({
            ...alpTokenInfo,
            tokenId: alpGenesisTxid,
            block: {
                hash: '5e75fc2b2b101c4cf8beec2a68303fcdc5e6d0e3684cc8fbe5ebea60d781b1bb',
                height: 102,
                timestamp: 1300000500,
            },
        });

        alpMegaTxid = await get_alp_mega_txid;

        // Can this one from the tx endpoint
        alpMega = await chronik.tx(alpMegaTxid);

        // We get expected inputs including expected Token data
        expect(alpMega.inputs).to.deep.equal([
            {
                ...BASE_TX_INPUT,
                prevOut: {
                    txid: alpNextGenesisTxid,
                    outIdx: 3,
                },
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpNextGenesisTxid,
                    entryIdx: 1,
                    isMintBaton: true,
                },
            },
            {
                ...BASE_TX_INPUT,
                prevOut: {
                    txid: alpGenesisTxid,
                    outIdx: 6,
                },
                value: 546,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    entryIdx: 2,
                    isMintBaton: true,
                },
            },
            {
                ...BASE_TX_INPUT,
                prevOut: {
                    txid: alpMultiTxid,
                    outIdx: 1,
                },
                value: 546,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpMultiTxid,
                    entryIdx: 3,
                    amount: '281474976710655',
                },
            },
        ]);

        // We get expected outputs including expected Token data
        expect(alpMega.outputs).to.deep.equal([
            {
                ...BASE_TX_OUTPUT,
                value: 0,
                outputScript:
                    '6a5036534c5032000747454e4553495303414c4c0000000000050000000000000700000000000000000000000000000000000100000000000215534c5032000747454e4553495300000000000000004c56534c503200044d494e54e2c68fa87324d048fbb0b72ca7d386ad757967f20244854f14920a6caa714dbb070000000000000000000000000000000000000000000000000000000000000000000000000000000000006338534c503200044d494e54e2c68fa87324d048fbb0b72ca7d386ad757967f20244854f14920a6caa714dbb02000000000000ffffffffffff0032534c503200044d494e54e2c68fa87324d048fbb0b72ca7d386ad757967f20244854f14920a6caa714dbb010000000000000130534c503200044255524ee2c68fa87324d048fbb0b72ca7d386ad757967f20244854f14920a6caa714dbb02000000000038534c503200044d494e542c787e508ba86115c7fb13cc582d97a6f3b7d60dad070dcf49e19d0aec12df7202030000000000000000000000014c56534c503200044d494e54e2c68fa87324d048fbb0b72ca7d386ad757967f20244854f14920a6caa714dbb07000000000000000000000000000000000000020000000000000000000000000000000000000000000000012c534c503200044d494e54e2c68fa87324d048fbb0b72ca7d386ad757967f20244854f14920a6caa714dbb000030534c503200044255524ee2c68fa87324d048fbb0b72ca7d386ad757967f20244854f14920a6caa714dbb0000000000004c73534c5032000453454e44ba2ea53336d07ab7bab5eb95f53a6dd041acfca80f2af3a6b93abad7147fc4e30c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b00000000004c67534c5032000453454e44ba2ea53336d07ab7bab5eb95f53a6dd041acfca80f2af3a6b93abad7147fc4e30a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffff2c534c503200044d494e54ba2ea53336d07ab7bab5eb95f53a6dd041acfca80f2af3a6b93abad7147fc4e3000005534c50328930534c503200044255524eba2ea53336d07ab7bab5eb95f53a6dd041acfca80f2af3a6b93abad7147fc4e300000000000005534c50329a',
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpNextGenesisTxid,
                    entryIdx: 1,
                    amount: '3',
                },
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpMegaTxid,
                    amount: '7',
                },
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpNextGenesisTxid,
                    entryIdx: 1,
                    isMintBaton: true,
                },
            },
            {
                ...BASE_TX_OUTPUT,
                value: 1000,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    entryIdx: 2,
                    amount: '2',
                },
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpMegaTxid,
                    amount: '1',
                },
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpMegaTxid,
                    isMintBaton: true,
                },
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpMegaTxid,
                    isMintBaton: true,
                },
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpGenesisTxid,
                    entryIdx: 2,
                    isMintBaton: true,
                },
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_UNKNOWN',
                        number: 137,
                    },
                    entryIdx: 4,
                },
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_ALP,
                    tokenId: alpMultiTxid,
                    entryIdx: 3,
                    amount: '281474976710655',
                },
            },
        ]);

        // We get the mega token entries
        expect(alpMega.tokenEntries).to.deep.equal([
            {
                ...BASE_TOKEN_ENTRY,
                tokenId:
                    '72101f535470e0a6de7db9ba0ba115845566f738cc5124255b472347b5927565',
                txType: 'GENESIS',
                burnSummary:
                    'Invalid coloring at pushdata idx 1: GENESIS must be the first pushdata',
                failedColorings: [
                    {
                        pushdataIdx: 1,
                        error: 'GENESIS must be the first pushdata',
                    },
                ],
                tokenType: {
                    number: 0,
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                },
            },
            {
                ...BASE_TOKEN_ENTRY,
                tokenId:
                    '72df12ec0a9de149cf0d07ad0dd6b7f3a6972d58cc13fbc71561a88b507e782c',
                txType: 'MINT',
                tokenType: {
                    number: 0,
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                },
            },
            {
                ...BASE_TOKEN_ENTRY,
                tokenId:
                    'bb4d71aa6c0a92144f854402f2677975ad86d3a72cb7b0fb48d02473a88fc6e2',
                txType: 'MINT',
                burnSummary:
                    'Invalid coloring at pushdata idx 2: Too few outputs, expected 107 but got 11. Invalid coloring at pushdata idx 3: Overlapping amount when trying to color 281474976710655 at index 2, output is already colored with 7 of 72101f535470e0a6de7db9ba0ba115845566f738cc5124255b472347b5927565 (ALP STANDARD (V0)). Invalid coloring at pushdata idx 4: Overlapping mint baton when trying to color mint baton at index 2, output is already colored with 7 of 72101f535470e0a6de7db9ba0ba115845566f738cc5124255b472347b5927565 (ALP STANDARD (V0)). Invalid coloring at pushdata idx 8: Duplicate token_id bb4d71aa6c0a92144f854402f2677975ad86d3a72cb7b0fb48d02473a88fc6e2, found in section 2. Invalid coloring at pushdata idx 9: Duplicate intentional burn token_id bb4d71aa6c0a92144f854402f2677975ad86d3a72cb7b0fb48d02473a88fc6e2, found in burn #0 and #1',
                failedColorings: [
                    {
                        pushdataIdx: 2,
                        error: 'Too few outputs, expected 107 but got 11',
                    },
                    {
                        pushdataIdx: 3,
                        error: 'Overlapping amount when trying to color 281474976710655 at index 2, output is already colored with 7 of 72101f535470e0a6de7db9ba0ba115845566f738cc5124255b472347b5927565 (ALP STANDARD (V0))',
                    },
                    {
                        pushdataIdx: 4,
                        error: 'Overlapping mint baton when trying to color mint baton at index 2, output is already colored with 7 of 72101f535470e0a6de7db9ba0ba115845566f738cc5124255b472347b5927565 (ALP STANDARD (V0))',
                    },
                    {
                        pushdataIdx: 8,
                        error: 'Duplicate token_id bb4d71aa6c0a92144f854402f2677975ad86d3a72cb7b0fb48d02473a88fc6e2, found in section 2',
                    },
                    {
                        pushdataIdx: 9,
                        error: 'Duplicate intentional burn token_id bb4d71aa6c0a92144f854402f2677975ad86d3a72cb7b0fb48d02473a88fc6e2, found in burn #0 and #1',
                    },
                ],
                intentionalBurn: '2',
                tokenType: {
                    number: 0,
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                },
            },
            {
                ...BASE_TOKEN_ENTRY,
                tokenId: alpMultiTxid,
                txType: 'SEND',
                burnSummary:
                    'Invalid coloring at pushdata idx 10: Too few outputs, expected 13 but got 11. Invalid coloring at pushdata idx 12: Duplicate token_id e3c47f14d7ba3ab9a6f32a0fa8fcac41d06d3af595ebb5bab77ad03633a52eba, found in section 3. Invalid coloring at pushdata idx 14: Descending token type: 137 > 0, token types must be in ascending order',
                failedColorings: [
                    {
                        pushdataIdx: 10,
                        error: 'Too few outputs, expected 13 but got 11',
                    },
                    {
                        pushdataIdx: 12,
                        error: 'Duplicate token_id e3c47f14d7ba3ab9a6f32a0fa8fcac41d06d3af595ebb5bab77ad03633a52eba, found in section 3',
                    },
                    {
                        pushdataIdx: 14,
                        error: 'Descending token type: 137 > 0, token types must be in ascending order',
                    },
                ],
                tokenType: {
                    number: 0,
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                },
            },
            {
                ...BASE_TOKEN_ENTRY,
                tokenId:
                    '0000000000000000000000000000000000000000000000000000000000000000',
                txType: 'UNKNOWN',
                tokenType: {
                    number: 137,
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_UNKNOWN',
                },
            },
            {
                ...BASE_TOKEN_ENTRY,
                tokenId:
                    '0000000000000000000000000000000000000000000000000000000000000000',
                txType: 'UNKNOWN',
                tokenType: {
                    number: 154,
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_UNKNOWN',
                },
            },
        ]);

        const blockTxs = await chronik.blockTxs(CHAIN_INIT_HEIGHT + 2);

        // Clone as we will use blockTxs.txs later
        const txsFromBlock = JSON.parse(JSON.stringify(blockTxs.txs));

        // The first tx is the coinbase tx, which is not a token
        const coinbaseTx = txsFromBlock.shift()!;

        expect(coinbaseTx.tokenEntries).to.deep.equal([]);
        expect(coinbaseTx.tokenFailedParsings).to.deep.equal([]);
        expect(coinbaseTx.tokenStatus).to.equal('TOKEN_STATUS_NON_TOKEN');

        // The next txs are alphabetical by txid
        const broadcastAlpTxs = [
            alpGenesis,
            alpMint,
            alpSend,
            alpNextGenesis,
            alpMulti,
            alpMega,
        ].sort((a, b) => a.txid.localeCompare(b.txid));

        // The token fields of Tx_InNode(s) from blockTxs match the Tx_InNode(s) from tx
        // Note the txs are not expected to fully match bc now we have block key and spentBy,
        // expected after confirmation
        // This type of functionality is tested in blocktxs_and_tx_and_rawtx.ts
        for (const tx of broadcastAlpTxs) {
            const nextTxFromBlock = txsFromBlock.shift()!;
            expect(tx.tokenEntries).to.deep.equal(nextTxFromBlock.tokenEntries);
            expect(tx.tokenFailedParsings).to.deep.equal(
                nextTxFromBlock.tokenFailedParsings,
            );
            expect(tx.tokenStatus).to.deep.equal(nextTxFromBlock.tokenStatus);
        }
        // These are the only txs in from blockTxs
        expect(txsFromBlock.length).to.eql(0);
        // i.e., the coinbase tx + the six ALP txs broadcast
        expect(blockTxs.numTxs).to.eql(7);

        // We can also get the expected Tx shape by calling the script.history()
        const history = await chronik
            .script('p2sh', SCRIPTSIG_OP_TRUE_PAYLOAD)
            .history();

        // Same as blockTxs, except different coinbase tx
        // Remove coinbase tx from both to compare
        // For blockTxs, it's the first tx
        blockTxs.txs.shift();

        // For historyTxs, it's the last (oldest in time)
        history.txs.pop();

        // We are not exhaustively testing the script endpoint here, see script_endpoints.ts
        expect(history.txs).to.have.deep.members(blockTxs.txs);

        // Same tx count as blockTxs
        expect(history.numTxs).to.eql(7);

        // Now we have no unconfirmed txs for the alpGenesisTxid
        const unconfirmedTxsForThisTokenId = await chronik
            .tokenId(alpGenesisTxid)
            .unconfirmedTxs();
        expect(unconfirmedTxsForThisTokenId.txs.length).to.eql(0);

        // We can get all the confirmedTxs for alpGenesisTxid
        // Note: they are in alphabetical order by txid (at least, in this block)
        const broadcastAlpTxsOfAlpGenesisTokenId = [
            alpGenesis,
            alpMint,
            alpSend,
            alpMulti,
            alpMega,
        ].sort((a, b) => a.txid.localeCompare(b.txid));

        confirmedTxsForAlpGenesisTxid = await chronik
            .tokenId(alpGenesisTxid)
            .confirmedTxs();

        expect(confirmedTxsForAlpGenesisTxid.txs.length).to.eql(
            broadcastAlpTxsOfAlpGenesisTokenId.length,
        );

        // They are sorted by blockheight, then alphabetical by txid
        // In this case, they all have the same blockheight -- so we see alphabetical by txid
        // Note that timeFirstSeen is not considered from this endpoint, as alpMega has timeFirstSeen of 0
        // But it appears second here
        for (let i = 0; i < confirmedTxsForAlpGenesisTxid.txs.length; i += 1) {
            // in practice, everything matches except for the 'block' and 'output.spentBy' keys
            // these are expected to have changed since we stored the txs when they were in the mempool
            // now we are comparing result to confirmed txs
            expect(confirmedTxsForAlpGenesisTxid.txs[i].txid).to.eql(
                broadcastAlpTxsOfAlpGenesisTokenId[i].txid,
            );
            expect(confirmedTxsForAlpGenesisTxid.txs[i].inputs).to.deep.equal(
                broadcastAlpTxsOfAlpGenesisTokenId[i].inputs,
            );
            expect(
                confirmedTxsForAlpGenesisTxid.txs[i].tokenEntries,
            ).to.deep.equal(broadcastAlpTxsOfAlpGenesisTokenId[i].tokenEntries);
        }
    });
    it('Can get confirmed and unconfirmed txs from tokenId.history()', async () => {
        const chronik = new ChronikClientNode(chronikUrl);

        alpNonUtf8GenesisTxid = await get_alp_nonutf8_genesis_txid;
        alpMintTwoTxid = await get_alp_mint_two_txid;

        // Can get the tx object from the tx endpoint
        alpMintTwo = await chronik.tx(alpMintTwoTxid);
        alpSendTwo = await chronik.tx(alpNonUtf8GenesisTxid);

        // We can get genesis info even if utf8 expected fields are not utf8
        // In practice we do not expect this to ever happen, but someone could do this
        // We confirm it doesn't break anything
        const thisTokenInfo = await chronik.token(alpNonUtf8GenesisTxid);

        // hex 0304b60c048de8d9650881002834d6490000
        // A user of chronik-client would see output of '\x03\x04�\f\x04���e\b�\x00(4�I\x00\x00' for tokenInfo.genesisInfo.tokenName
        expect(thisTokenInfo.genesisInfo?.tokenName).to.eql(
            '\x03\x04\uFFFD\f\x04\uFFFD\uFFFD\uFFFDe\b\uFFFD\x00(4\uFFFDI\x00\x00',
        );
        // hex 00fabe6d6d6f5486f62c703086014607f5bed91d093b092a8faf5ac882a0ccf462682a22f002
        // A user of chronik-client would see output of '\x00��mmoT��,p0�\x01F\x07���\x1D\t;\t*��ZȂ���bh*"�\x02' for thisTokenInfo.genesisInfo.url
        expect(thisTokenInfo.genesisInfo?.url).to.eql(
            '\x00\uFFFD\uFFFDmmoT\uFFFD\uFFFD,p0\uFFFD\x01F\x07\uFFFD\uFFFD\uFFFD\x1D\t;\t*\uFFFD\uFFFDZȂ\uFFFD\uFFFD\uFFFDbh*"\uFFFD\x02',
        );

        // alpNonUtf8GenesisTxid 65c63c950ec88a723cd37fc40f2e6f7732508a3703febed620b91d8b0c423eea (broadcast 1st, alphabetically 2nd)
        // alpMintTwoTxid 163ebdbd2b915d090d602970b2e2737abf631a1ce31345c90d656e98b60e2b8c (broadcast 2nd, alphabetically 1st)
        const alphabeticalUnconfirmedAlpGenesisTxs = [
            alpMintTwo,
            alpSendTwo,
        ].sort((a, b) => a.txid.localeCompare(b.txid));

        // Can get these from unconfirmed txs
        const unconfirmedTxs = await chronik
            .tokenId(alpGenesisTxid)
            .unconfirmedTxs();

        // unconfirmedTxs returns them in alphabetical order
        for (let i = 0; i < unconfirmedTxs.txs.length; i += 1) {
            expect(unconfirmedTxs.txs[i]).to.deep.equal(
                alphabeticalUnconfirmedAlpGenesisTxs[i],
            );
        }

        // They are the only unconfirmed txs
        expect(unconfirmedTxs.txs.length).to.eql(2);

        // Calling chronik.tokenId.history() returns all confirmed and unconfirmed txs

        const allTokenTxsForAlpGenesisTxid = await chronik
            .tokenId(alpGenesisTxid)
            .history();

        // We get all expected txs, confirmed and unconfirmed
        expect(allTokenTxsForAlpGenesisTxid.txs.length).to.eql(
            confirmedTxsForAlpGenesisTxid.txs.length +
                unconfirmedTxs.txs.length,
        );

        // Txs from history are sorted by blockheight, then timeFirstSeen, then txid
        // In this case, timeFirstSeen is a mock time, so it is the same for each
        // So we expect reverse alphabetical order by txid
        const unconfirmedInHistory = allTokenTxsForAlpGenesisTxid.txs.splice(
            0,
            2,
        );

        const reverseAlphabeticalUnconfirmedAlpGenesisTxs = [
            alpMintTwo,
            alpSendTwo,
        ].sort((b, a) => a.txid.localeCompare(b.txid));
        expect(unconfirmedInHistory).to.deep.equal(
            reverseAlphabeticalUnconfirmedAlpGenesisTxs,
        );

        // We get the rest of the txs in expected order
        // Sorted by blockheight, then timeFirstSeen, then txid
        // In this case, all txs have the same blockheight
        // alpMegaTxid has timeFirstSeen of 0 since it was manually mined
        // All other txs have the same timeFirstSeen so are sorted in reverse alphabetical order

        // Confirm the order of txs from .history()
        const confirmedAlpTxs = [
            alpMegaTxid, // timeFirstSeen 0             | 72101f535470e0a6de7db9ba0ba115845566f738cc5124255b472347b5927565
            alpSendTxid, // timeFirstSeen 1300000000    | e623ab8971c93fa1a831a4310da65554c8dfd811c16cd5d41c6612268cb5dd5f
            alpMultiTxid, // timeFirstSeen 1300000000   | e3c47f14d7ba3ab9a6f32a0fa8fcac41d06d3af595ebb5bab77ad03633a52eba
            alpGenesisTxid, // timeFirstSeen 1300000000 | bb4d71aa6c0a92144f854402f2677975ad86d3a72cb7b0fb48d02473a88fc6e2
            alpMintTxid, // timeFirstSeen 1300000000    | 0dab1008db30343a4f771983e9fd96cbc15f0c6efc73f5249c9bae311ef1e92f
        ];

        for (let i = 0; i < allTokenTxsForAlpGenesisTxid.txs.length; i += 1) {
            expect(confirmedAlpTxs[i]).to.eql(
                allTokenTxsForAlpGenesisTxid.txs[i].txid,
            );
        }

        // Make sure other parts of returned tx objects are as expected
        // Since one of the utxos from confirmedTxsForAlpGenesisTxid was spent to create
        // the second mint tx, this spentBy key has changed

        // We spent the mint baton
        const newConfirmedMintTxIndex =
            allTokenTxsForAlpGenesisTxid.txs.findIndex(
                tx => tx.txid === alpMintTxid,
            );

        const newMintTx = allTokenTxsForAlpGenesisTxid.txs.splice(
            newConfirmedMintTxIndex,
            1,
        )[0];
        const confirmedMintTxIndex =
            confirmedTxsForAlpGenesisTxid.txs.findIndex(
                tx => tx.txid === alpMintTxid,
            );
        const oldMintTx = confirmedTxsForAlpGenesisTxid.txs.splice(
            confirmedMintTxIndex,
            1,
        )[0];

        // We have removed this tx from both histories
        expect(allTokenTxsForAlpGenesisTxid.txs.length).to.eql(
            confirmedTxsForAlpGenesisTxid.txs.length,
        );

        // They are the same except for outputs, as expected
        expect(oldMintTx.inputs).to.deep.equal(newMintTx.inputs);
        expect(oldMintTx.tokenEntries).to.deep.equal(newMintTx.tokenEntries);

        // Since one of the utxos from confirmedTxsForAlpGenesisTxid was spent to create
        // the second send tx, this spentBy key has changed
        const newConfirmedSendTxIndex =
            allTokenTxsForAlpGenesisTxid.txs.findIndex(
                tx => tx.txid === alpSendTxid,
            );

        const newSendTx = allTokenTxsForAlpGenesisTxid.txs.splice(
            newConfirmedSendTxIndex,
            1,
        )[0];
        const confirmedSendTxIndex =
            confirmedTxsForAlpGenesisTxid.txs.findIndex(
                tx => tx.txid === alpSendTxid,
            );
        const oldSendTx = confirmedTxsForAlpGenesisTxid.txs.splice(
            confirmedSendTxIndex,
            1,
        )[0];

        // We have removed this tx from both histories
        expect(allTokenTxsForAlpGenesisTxid.txs.length).to.eql(
            confirmedTxsForAlpGenesisTxid.txs.length,
        );

        // They are the same except for outputs, as expected
        expect(oldSendTx.inputs).to.deep.equal(newSendTx.inputs);
        expect(oldSendTx.tokenEntries).to.deep.equal(newSendTx.tokenEntries);

        // The other txs are the same, though the order is not the same
        // allTokenTxsForAlpGenesisTxid is sorted by blockheight, then timeFirstSeen, then reverse alphabetical by txid
        // confirmedTxsForAlpGenesisTxid is sorted by blockheight, then alphabetical by txid

        // These respective orderings are already tested above, here we test they have the same content
        expect(
            allTokenTxsForAlpGenesisTxid.txs.sort((a, b) =>
                a.txid.localeCompare(b.txid),
            ),
        ).to.deep.equal(
            confirmedTxsForAlpGenesisTxid.txs.sort((a, b) =>
                a.txid.localeCompare(b.txid),
            ),
        );
    });
    it('We get tx history in expected order from both tokenId().history() and tokenId.confirmedTxs()', async () => {
        const chronik = new ChronikClientNode(chronikUrl);

        // Can get all confirmed token txs for alpGenesisTxid
        const confirmedTxs = await chronik
            .tokenId(alpGenesisTxid)
            .confirmedTxs();

        // Confirmed txs are sorted by blockheight, then alphabetically by txid
        // timeFirstSeen is not considered, demonstrated by alpMegaTxid not being first
        const confirmedAlpTxids = [
            alpMintTxid, // blockheight 102, timeFirstSeen 1300000000    | 0dab1008db30343a4f771983e9fd96cbc15f0c6efc73f5249c9bae311ef1e92f
            alpMegaTxid, // blockheight 102, timeFirstSeen 0             | 72101f535470e0a6de7db9ba0ba115845566f738cc5124255b472347b5927565
            alpGenesisTxid, // blockheight 102, timeFirstSeen 1300000000 | bb4d71aa6c0a92144f854402f2677975ad86d3a72cb7b0fb48d02473a88fc6e2
            alpMultiTxid, // blockheight 102, timeFirstSeen 1300000000   | e3c47f14d7ba3ab9a6f32a0fa8fcac41d06d3af595ebb5bab77ad03633a52eba
            alpSendTxid, //blockheight 102, timeFirstSeen 1300000000     | e623ab8971c93fa1a831a4310da65554c8dfd811c16cd5d41c6612268cb5dd5f
            alpMintTwoTxid, // blockheight 103, timeFirstSeen 1300000000 | 163ebdbd2b915d090d602970b2e2737abf631a1ce31345c90d656e98b60e2b8c
            alpNonUtf8GenesisTxid, // blockheight 103, timeFirstSeen 1300000000 | 65c63c950ec88a723cd37fc40f2e6f7732508a3703febed620b91d8b0c423eea
        ];

        // Same amount of txs in each
        expect(confirmedTxs.txs.length).to.eql(confirmedAlpTxids.length);

        // Txs are in expected order
        for (let i = 0; i < confirmedTxs.txs.length; i += 1) {
            expect(confirmedTxs.txs[i].txid).to.eql(confirmedAlpTxids[i]);
        }

        // Can get all confirmed token txs for alpGenesisTxid
        const history = await chronik.tokenId(alpGenesisTxid).history();

        // Txs from history are ordered by blockheight, then timeFirstSeen, then reverse alphabetical by txid
        // In this case, alpSendTwoTxid and alpMintTwoTxid are from the highest blockheight.
        // alpMegaTxid has timeFirstSeen of 0 because it had to be manually mined in block. So, it comes first in the next block
        // The other txids in the alpMegaTxid block all have the same timeFirstSeen, so they are sorted reverse alphabetically
        const historyAlpTxids = [
            alpNonUtf8GenesisTxid, // timeFirstSeen 1300000000, blockheight 103 | 65c63c950ec88a723cd37fc40f2e6f7732508a3703febed620b91d8b0c423eea
            alpMintTwoTxid, // timeFirstSeen 1300000000, blockheight 103 | 163ebdbd2b915d090d602970b2e2737abf631a1ce31345c90d656e98b60e2b8c
            alpMegaTxid, // timeFirstSeen 0, blockheight 102             | 72101f535470e0a6de7db9ba0ba115845566f738cc5124255b472347b5927565
            alpSendTxid, // timeFirstSeen 1300000000, blockheight 102    | e623ab8971c93fa1a831a4310da65554c8dfd811c16cd5d41c6612268cb5dd5f
            alpMultiTxid, // timeFirstSeen 1300000000, blockheight 102   | e3c47f14d7ba3ab9a6f32a0fa8fcac41d06d3af595ebb5bab77ad03633a52eba
            alpGenesisTxid, // timeFirstSeen 1300000000, blockheight 102 | bb4d71aa6c0a92144f854402f2677975ad86d3a72cb7b0fb48d02473a88fc6e2
            alpMintTxid, // timeFirstSeen 1300000000, blockheight 102    | 0dab1008db30343a4f771983e9fd96cbc15f0c6efc73f5249c9bae311ef1e92f
        ];

        // Same amount of txs in each
        expect(history.txs.length).to.eql(historyAlpTxids.length);

        // Txs in expected order
        for (let i = 0; i < confirmedTxs.txs.length; i += 1) {
            expect(history.txs[i].txid).to.eql(historyAlpTxids[i]);
        }
    });
});
