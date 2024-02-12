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
                tokenId:
                    'e3c47f14d7ba3ab9a6f32a0fa8fcac41d06d3af595ebb5bab77ad03633a52eba',
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
