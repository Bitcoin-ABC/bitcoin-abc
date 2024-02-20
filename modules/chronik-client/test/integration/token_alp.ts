// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import { ChronikClientNode, Tx_InNode } from '../../index';
import initializeTestRunner from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Get blocktxs, txs, and history for ALP token txs', () => {
    let testRunner: ChildProcess;
    let chronik_url: Promise<Array<string>>;
    let get_alp_genesis_txid: Promise<string>;
    let get_alp_mint_txid: Promise<string>;
    let get_alp_send_txid: Promise<string>;
    let get_alp_genesis2_txid: Promise<string>;
    let get_alp_multi_txid: Promise<string>;
    let get_alp_mega_txid: Promise<string>;
    const statusEvent = new EventEmitter();

    before(async () => {
        testRunner = initializeTestRunner('chronik-client_token_alp');

        testRunner.on('message', function (message: any) {
            if (message && message.chronik) {
                console.log('Setting chronik url to ', message.chronik);
                chronik_url = new Promise(resolve => {
                    resolve([message.chronik]);
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

            if (message && message.status) {
                statusEvent.emit(message.status);
            }
        });
    });

    after(() => {
        testRunner.send('stop');
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
        spentBy: undefined,
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

    let alpGenesis: Tx_InNode;
    let alpMint: Tx_InNode;
    let alpSend: Tx_InNode;
    let alpNextGenesis: Tx_InNode;
    let alpMulti: Tx_InNode;
    let alpMega: Tx_InNode;

    it('Gets an ALP genesis tx from the mempool', async () => {
        const chronikUrl = await chronik_url;
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
        expect(alpGenesis.outputs).to.deep.equal([
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
        ]);

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
    });
    it('Gets an ALP mint tx from the mempool', async () => {
        const chronikUrl = await chronik_url;
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
    });
    it('Gets an ALP send tx from the mempool', async () => {
        const chronikUrl = await chronik_url;
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
        const chronikUrl = await chronik_url;
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
        const chronikUrl = await chronik_url;
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
    });
    it('Can get all of the above txs, and a wild mega-tx, from the blockTxs endpoint after they are mined in a block', async () => {
        const chronikUrl = await chronik_url;
        const chronik = new ChronikClientNode(chronikUrl);

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

        // The token fields of Tx_InNode(s) from blockTxs match the Tx_InNode(s) from tx]
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
    });
});
