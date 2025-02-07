// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import path from 'path';
import { ChronikClient, Tx, WsEndpoint, WsMsgClient } from '../../index';
import initializeTestRunner, {
    cleanupMochaRegtest,
    expectWsMsgs,
    setMochaTimeout,
    TestInfo,
} from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Get blocktxs, txs, and history for SLP fungible token txs', () => {
    // Define variables used in scope of this test
    const testName = path.basename(__filename);
    let testRunner: ChildProcess;
    let get_slp_fungible_genesis_txid: Promise<string>;
    let get_slp_fungible_mint_txid: Promise<string>;
    let get_slp_fungible_send_txid: Promise<string>;
    let get_slp_fungible_genesis_empty_txid: Promise<string>;
    const statusEvent = new EventEmitter();
    let get_test_info: Promise<TestInfo>;
    let chronikUrl: string[];
    let setupScriptTermination: ReturnType<typeof setTimeout>;
    // Collect websocket msgs in an array for analysis in each step
    let msgCollector: Array<WsMsgClient> = [];

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
            if (message && message.slp_fungible_genesis_txid) {
                get_slp_fungible_genesis_txid = new Promise(resolve => {
                    resolve(message.slp_fungible_genesis_txid);
                });
            }

            if (message && message.slp_fungible_mint_txid) {
                get_slp_fungible_mint_txid = new Promise(resolve => {
                    resolve(message.slp_fungible_mint_txid);
                });
            }

            if (message && message.slp_fungible_send_txid) {
                get_slp_fungible_send_txid = new Promise(resolve => {
                    resolve(message.slp_fungible_send_txid);
                });
            }

            if (message && message.slp_fungible_genesis_empty_txid) {
                get_slp_fungible_genesis_empty_txid = new Promise(resolve => {
                    resolve(message.slp_fungible_genesis_empty_txid);
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
        // Reset msgCollector after each step
        msgCollector = [];

        testRunner.send('next');
    });

    const CHAIN_INIT_HEIGHT = 100;
    const SCRIPTSIG_OP_TRUE_PAYLOAD =
        'da1745e9b549bd0bfa1a569971c77eba30cd5a4b';
    const BASE_TX_INPUT = {
        inputScript: '0151',
        outputScript: 'a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87',
        sats: 5000000000n,
        sequenceNo: 0,
    };
    const BASE_TX_OUTPUT = {
        sats: 2000n,
        outputScript: 'a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87',
    };
    const BASE_TX_TOKEN_INFO_SLP_FUNGIBLE = {
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        entryIdx: 0,
        atoms: 0n,
        isMintBaton: false,
    };
    const BASE_TOKEN_ENTRY = {
        // omit tokenId, txType, and tokenType as these should always be tested
        isInvalid: false,
        burnSummary: '',
        failedColorings: [],
        actualBurnAtoms: 0n,
        intentionalBurnAtoms: 0n,
        burnsMintBatons: false,
    };
    let slpGenesisTxid = '';
    let slpMintTxid = '';
    let slpSendTxid = '';
    let slpEmptyGenesisTxid = '';

    let slpGenesis: Tx;
    let slpMint: Tx;
    let slpSend: Tx;
    let slpEmptyGenesis: Tx;

    let ws: WsEndpoint;

    const BASE_ADDEDTOMEMPOOL_WSMSG: WsMsgClient = {
        type: 'Tx',
        msgType: 'TX_ADDED_TO_MEMPOOL',
        txid: '1111111111111111111111111111111111111111111111111111111111111111',
    };
    const BASE_CONFIRMED_WSMSG: WsMsgClient = {
        type: 'Tx',
        msgType: 'TX_CONFIRMED',
        txid: '1111111111111111111111111111111111111111111111111111111111111111',
    };

    it('Gets an SLP genesis tx from the mempool', async () => {
        const chronik = new ChronikClient(chronikUrl);

        slpGenesisTxid = await get_slp_fungible_genesis_txid;

        slpGenesis = await chronik.tx(slpGenesisTxid);

        // We get expected inputs including expected Token data
        // We get no token info in tx inputs
        expect(slpGenesis.inputs).to.deep.equal([
            {
                ...BASE_TX_INPUT,
                prevOut: {
                    txid: '3fa435fca55edf447ef7539ecba141a6585fa71ac4062cdcc61f1235c40f4613',
                    outIdx: 0,
                },
            },
        ]);

        // We get expected outputs including expected Token data
        expect(slpGenesis.outputs).to.deep.equal([
            {
                ...BASE_TX_OUTPUT,
                sats: 0n,
                outputScript:
                    '6a04534c500001010747454e4553495307534c5054455354105465737420534c5020546f6b656e203312687474703a2f2f6578616d706c652f736c7020787878787878787878787878787878787878787878787878787878787878787801040102080000000000001388',
            },
            {
                ...BASE_TX_OUTPUT,
                sats: 10000n,
                token: {
                    ...BASE_TX_TOKEN_INFO_SLP_FUNGIBLE,
                    tokenId: slpGenesisTxid,
                    atoms: 5000n,
                },
            },
            {
                ...BASE_TX_OUTPUT,
                sats: 10000n,
                token: {
                    ...BASE_TX_TOKEN_INFO_SLP_FUNGIBLE,
                    tokenId: slpGenesisTxid,
                    isMintBaton: true,
                },
            },
            {
                ...BASE_TX_OUTPUT,
                sats: 4999600000n,
            },
        ]);

        // We get a Entries of expected shape, with tokenId the txid for a genesis tx
        expect(slpGenesis.tokenEntries).to.deep.equal([
            {
                ...BASE_TOKEN_ENTRY,
                tokenId: slpGenesisTxid,
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                txType: 'GENESIS',
            },
        ]);

        // The token did not fail parsings
        expect(slpGenesis.tokenFailedParsings).to.deep.equal([]);

        // Normal status
        expect(slpGenesis.tokenStatus).to.eql('TOKEN_STATUS_NORMAL');

        // We can get token info of an slp token from the mempool
        const slpGenesisMempoolInfo = await chronik.token(slpGenesisTxid);
        expect(slpGenesisMempoolInfo).to.deep.equal({
            tokenId: slpGenesisTxid,
            timeFirstSeen: 1300000000,
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            // We get hash in GenesisInfo for SLP
            // We do not get mintVaultScripthash for non-SLP_MINT_VAULT
            // We do not get data or authPubkey keys in GenesisInfo for non-ALP
            genesisInfo: {
                tokenTicker: 'SLPTEST',
                tokenName: 'Test SLP Token 3',
                url: 'http://example/slp',
                hash: '7878787878787878787878787878787878787878787878787878787878787878',
                decimals: 4,
            },
        });

        // Connect to the websocket with a testable onMessage handler
        ws = chronik.ws({
            onMessage: msg => {
                return msgCollector.push(msg);
            },
        });
        await ws.waitForOpen();

        // Subscribe to slpGenesisTxid
        ws.subscribeToTokenId(slpGenesisTxid);

        // Note: ws subs and unsubs tested in token_alp.ts
    });
    it('Gets an SLP fungible mint tx from the mempool', async () => {
        const chronik = new ChronikClient(chronikUrl);

        slpMintTxid = await get_slp_fungible_mint_txid;

        // We see slpMintTxid from our websocket subscription to slpGenesisTxid
        // Wait for expected ws msg
        await expectWsMsgs(1, msgCollector);
        expect(msgCollector).to.deep.equal([
            { ...BASE_ADDEDTOMEMPOOL_WSMSG, txid: slpMintTxid },
        ]);

        slpMint = await chronik.tx(slpMintTxid);

        // We get expected inputs including expected Token data
        expect(slpMint.inputs).to.deep.equal([
            {
                ...BASE_TX_INPUT,
                prevOut: {
                    txid: slpGenesisTxid,
                    outIdx: 2,
                },
                sats: 10000n,
                token: {
                    ...BASE_TX_TOKEN_INFO_SLP_FUNGIBLE,
                    tokenId: slpGenesisTxid,
                    isMintBaton: true,
                },
            },
        ]);

        // We get expected outputs including expected Token data
        expect(slpMint.outputs).to.deep.equal([
            {
                ...BASE_TX_OUTPUT,
                sats: 0n,
                outputScript:
                    '6a04534c50000101044d494e5420cd295e7eb883b5826e2d8872b1626a4af4ce7ec81c468f1bfdad14632036d20a0103080000000000000014',
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_SLP_FUNGIBLE,
                    tokenId: slpGenesisTxid,
                    atoms: 20n,
                },
            },
            {
                ...BASE_TX_OUTPUT,
            },
            {
                ...BASE_TX_OUTPUT,
                token: {
                    ...BASE_TX_TOKEN_INFO_SLP_FUNGIBLE,
                    tokenId: slpGenesisTxid,
                    isMintBaton: true,
                },
            },
        ]);

        // We get a Entries of expected shape, with tokenId the txid of the genesis tx
        expect(slpMint.tokenEntries).to.deep.equal([
            {
                ...BASE_TOKEN_ENTRY,
                tokenId: slpGenesisTxid,
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                txType: 'MINT',
            },
        ]);

        // The token did not fail parsings
        expect(slpMint.tokenFailedParsings).to.deep.equal([]);

        // Normal status
        expect(slpMint.tokenStatus).to.eql('TOKEN_STATUS_NORMAL');
    });
    it('Gets an SLP fungible send tx from the mempool', async () => {
        const chronik = new ChronikClient(chronikUrl);

        slpSendTxid = await get_slp_fungible_send_txid;

        // We see slpSendTxid from our websocket subscription to slpGenesisTxid
        // Wait for expected ws msg
        await expectWsMsgs(1, msgCollector);
        expect(msgCollector).to.deep.equal([
            { ...BASE_ADDEDTOMEMPOOL_WSMSG, txid: slpSendTxid },
        ]);

        slpSend = await chronik.tx(slpSendTxid);

        // We get expected inputs including expected Token data
        expect(slpSend.inputs).to.deep.equal([
            {
                ...BASE_TX_INPUT,
                prevOut: {
                    txid: slpGenesisTxid,
                    outIdx: 1,
                },
                sats: 10000n,
                token: {
                    ...BASE_TX_TOKEN_INFO_SLP_FUNGIBLE,
                    tokenId: slpGenesisTxid,
                    atoms: 5000n,
                },
            },
        ]);

        // We get expected outputs including expected Token data
        expect(slpSend.outputs).to.deep.equal([
            {
                ...BASE_TX_OUTPUT,
                sats: 0n,
                outputScript:
                    '6a04534c500001010453454e4420cd295e7eb883b5826e2d8872b1626a4af4ce7ec81c468f1bfdad14632036d20a0800000000000003e8080000000000000fa0',
            },
            {
                ...BASE_TX_OUTPUT,
                sats: 4000n,
                token: {
                    ...BASE_TX_TOKEN_INFO_SLP_FUNGIBLE,
                    tokenId: slpGenesisTxid,
                    atoms: 1000n,
                },
            },
            {
                ...BASE_TX_OUTPUT,
                sats: 4000n,
                token: {
                    ...BASE_TX_TOKEN_INFO_SLP_FUNGIBLE,
                    tokenId: slpGenesisTxid,
                    atoms: 4000n,
                },
            },
        ]);

        // We get a Entries of expected shape, with tokenId the txid of the genesis tx
        expect(slpSend.tokenEntries).to.deep.equal([
            {
                ...BASE_TOKEN_ENTRY,
                tokenId: slpGenesisTxid,
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                txType: 'SEND',
            },
        ]);

        // The token did not fail parsings
        expect(slpSend.tokenFailedParsings).to.deep.equal([]);

        // Normal status
        expect(slpSend.tokenStatus).to.eql('TOKEN_STATUS_NORMAL');
    });
    it('Gets an SLP fungible empty genesis tx from the mempool', async () => {
        const chronik = new ChronikClient(chronikUrl);

        slpEmptyGenesisTxid = await get_slp_fungible_genesis_empty_txid;

        // We DO NOT see slpEmptyGenesisTxid from our websocket subscription to slpGenesisTxid
        expect(msgCollector).to.deep.equal([]);

        slpEmptyGenesis = await chronik.tx(slpEmptyGenesisTxid);

        // We get expected inputs including expected Token data
        // We get no token info in tx inputs
        expect(slpEmptyGenesis.inputs).to.deep.equal([
            {
                ...BASE_TX_INPUT,
                prevOut: {
                    txid: slpGenesisTxid,
                    outIdx: 3,
                },
                sats: 4999600000n,
            },
        ]);

        // We get expected outputs including expected Token data
        // We get no token info in tx outputs
        expect(slpEmptyGenesis.outputs).to.deep.equal([
            {
                ...BASE_TX_OUTPUT,
                sats: 0n,
                outputScript:
                    '6a04534c500001010747454e455349534c004c004c004c0001004c00080000000000000000',
            },
            {
                ...BASE_TX_OUTPUT,
                sats: 4999500000n,
            },
        ]);

        // We get a Entries of expected shape, with slpEmptyGenesisTxid the tokenId
        expect(slpEmptyGenesis.tokenEntries).to.deep.equal([
            {
                ...BASE_TOKEN_ENTRY,
                tokenId: slpEmptyGenesisTxid,
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                txType: 'GENESIS',
            },
        ]);

        // The token did not fail parsings
        expect(slpEmptyGenesis.tokenFailedParsings).to.deep.equal([]);

        // Normal status
        expect(slpEmptyGenesis.tokenStatus).to.eql('TOKEN_STATUS_NORMAL');
    });
    it('Can get all of the above txs from the blockTxs endpoint after they are mined in a block', async () => {
        const chronik = new ChronikClient(chronikUrl);

        // Now that we have a block, we get a block key from token info
        const slpGenesisConfirmedInfo = await chronik.token(slpGenesisTxid);
        expect(typeof slpGenesisConfirmedInfo.block !== 'undefined').to.eql(
            true,
        );

        const blockTxs = await chronik.blockTxs(CHAIN_INIT_HEIGHT + 2);

        // Clone as we will use blockTxs.txs later
        const txsFromBlock = [...blockTxs.txs];

        // The first tx is the coinbase tx, which is not a token
        const coinbaseTx = txsFromBlock.shift()!;

        expect(coinbaseTx.tokenEntries).to.deep.equal([]);
        expect(coinbaseTx.tokenFailedParsings).to.deep.equal([]);
        expect(coinbaseTx.tokenStatus).to.eql('TOKEN_STATUS_NON_TOKEN');

        // The next txs are alphabetical by txid
        const broadcastTxs = [
            slpGenesis,
            slpMint,
            slpSend,
            slpEmptyGenesis,
        ].sort((a, b) => a.txid.localeCompare(b.txid));

        // The token fields of Tx(s) from blockTxs match the Tx(s) from tx
        // Note the txs are not expected to fully match bc now we have block and spentBy keys,
        // which are expected after confirmation
        // Full endpoint output is tested in blocktxs_and_tx_and_rawtx.ts
        for (const tx of broadcastTxs) {
            const nextTxFromBlock = txsFromBlock.shift()!;
            expect(tx.tokenEntries).to.deep.equal(nextTxFromBlock.tokenEntries);
            expect(tx.tokenFailedParsings).to.deep.equal(
                nextTxFromBlock.tokenFailedParsings,
            );
            expect(tx.tokenStatus).to.deep.equal(nextTxFromBlock.tokenStatus);
        }
        // These are the only txs in from blockTxs
        expect(txsFromBlock.length).to.eql(0);
        // i.e., the coinbase tx + the four SLP fungible txs broadcast
        expect(blockTxs.numTxs).to.eql(5);

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
        expect(history.numTxs).to.eql(5);

        // We see expected TX_CONFIRMED msg for txs related to slpGenesisTxid
        // Note they come in block order, i.e. alphabetical by txid
        // Wait for expected ws msg
        await expectWsMsgs(3, msgCollector);
        expect(msgCollector).to.deep.equal([
            { ...BASE_CONFIRMED_WSMSG, txid: slpMintTxid }, // 31417f7a8c8939d5b8da5e0d241e733fd698d5bce384d00f5f682b78dcff944d
            { ...BASE_CONFIRMED_WSMSG, txid: slpGenesisTxid }, // cd295e7eb883b5826e2d8872b1626a4af4ce7ec81c468f1bfdad14632036d20a
            { ...BASE_CONFIRMED_WSMSG, txid: slpSendTxid }, // cd72d45a162342d998cdff91de970ff43c821e61c1943d15fb87257de4256144
        ]);
    });
});
