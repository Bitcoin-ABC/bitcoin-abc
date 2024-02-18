// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import { ChronikClientNode } from '../../index';
import initializeTestRunner from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Get blocktxs and tx', () => {
    let testRunner: ChildProcess;
    let chronik_url: Promise<Array<string>>;
    let chronik_txs_and_rawtxs: Promise<{ [key: string]: string }>;
    const statusEvent = new EventEmitter();

    before(async () => {
        testRunner = initializeTestRunner(
            'chronik-client_blocktxs_and_tx_and_rawtx',
        );

        testRunner.on('message', function (message: any) {
            if (message && message.chronik) {
                console.log('Setting chronik url to ', message.chronik);
                chronik_url = new Promise(resolve => {
                    resolve([message.chronik]);
                });
            }
            if (message && message.txs_and_rawtxs) {
                chronik_txs_and_rawtxs = new Promise(resolve => {
                    resolve(message.txs_and_rawtxs);
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

    const REGTEST_CHAIN_INIT_HEIGHT = 200;

    // Populate in step where setup script broadcasts txs
    let txsAndRawTxsBroadcastInTest: { [key: string]: string } = {};
    let broadcastTxids: string[] = [];

    it('New regtest chain', async () => {
        const chronikUrl = await chronik_url;
        const chronik = new ChronikClientNode(chronikUrl);

        // Gets the block by height (need the block hash)
        const blockFromHeight = await chronik.block(REGTEST_CHAIN_INIT_HEIGHT);

        // Get the blocktxs by height
        const blockTxsByHeight = await chronik.blockTxs(
            REGTEST_CHAIN_INIT_HEIGHT,
        );
        // Get the blocktxs by hash
        const blockTxsByHash = await chronik.blockTxs(
            blockFromHeight.blockInfo.hash,
        );
        // Same result in each case
        expect(blockTxsByHeight).to.deep.equal(blockTxsByHash);

        // Verify the first tx is the coinbase tx
        const coinbaseTx = blockTxsByHeight.txs[0];
        expect(coinbaseTx.isCoinbase).to.eql(true);

        // A coinbase tx has timeFirstSeen of 0
        expect(coinbaseTx.timeFirstSeen).to.eql(0);

        // The txid for a Coinbase tx prevout is all 0s
        expect(coinbaseTx.inputs[0].prevOut.txid).to.eql(
            '0000000000000000000000000000000000000000000000000000000000000000',
        );

        // The block key returned by chronik.tx matches the calling block
        expect(coinbaseTx.block?.hash).to.eql(blockFromHeight.blockInfo.hash);

        // Gives us a tx by txid
        const tx = await chronik.tx(coinbaseTx.txid);

        // It's the same as getting it from blockTxs
        expect(coinbaseTx).to.deep.equal(tx);

        // Gives us a coinbase rawTx by txid
        const rawTx = await chronik.rawTx(coinbaseTx.txid);
        expect(typeof rawTx.rawTx).to.eql('string');

        // Calling for a tx with an invalid txid throws expected error
        const notTxid = 'thisIsNotATxid';
        await expect(chronik.tx(notTxid)).to.be.rejectedWith(
            Error,
            `Failed getting /tx/${notTxid} (): 400: Not a txid: ${notTxid}`,
        );

        // Calling for a rawTx with an invalid txid throws expected error
        await expect(chronik.rawTx(notTxid)).to.be.rejectedWith(
            Error,
            `Failed getting /raw-tx/${notTxid} (): 400: Not a txid: ${notTxid}`,
        );

        // Calling for a tx with a txid that does not exist throws expected error
        const nonExistentTxid =
            'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
        await expect(chronik.tx(nonExistentTxid)).to.be.rejectedWith(
            Error,
            `Failed getting /tx/${nonExistentTxid} (): 404: Transaction ${nonExistentTxid} not found in the index`,
        );

        // Calling for a rawTx with a txid that does not exist throws expected error
        await expect(chronik.rawTx(nonExistentTxid)).to.be.rejectedWith(
            Error,
            `Failed getting /raw-tx/${nonExistentTxid} (): 404: Transaction ${nonExistentTxid} not found in the index`,
        );
    });
    it('After some txs have been broadcast', async () => {
        const chronikUrl = await chronik_url;
        const chronik = new ChronikClientNode(chronikUrl);
        txsAndRawTxsBroadcastInTest = await chronik_txs_and_rawtxs;
        broadcastTxids = Object.keys(txsAndRawTxsBroadcastInTest);

        // Gives us a tx by txid, and gets the corresponding rawtx
        for (const txid of broadcastTxids) {
            const tx = await chronik.tx(txid);
            // For unconfirmed txs, the block key is undefined
            expect(typeof tx.block).to.eql('undefined');
            // We get the tx we called
            expect(tx.txid).to.eql(txid);
            // Gets the rawTx
            const rawTx = await chronik.rawTx(txid);
            expect(rawTx.rawTx).to.eql(txsAndRawTxsBroadcastInTest[txid]);
        }
    });
    it('After these txs are mined', async () => {
        const chronikUrl = await chronik_url;
        const chronik = new ChronikClientNode(chronikUrl);

        // We have another block
        const blockFromHeight = await chronik.block(
            REGTEST_CHAIN_INIT_HEIGHT + 1,
        );
        expect(blockFromHeight.blockInfo.height).to.eql(
            REGTEST_CHAIN_INIT_HEIGHT + 1,
        );

        // Gives us a tx by txid
        for (const txid of broadcastTxids) {
            const tx = await chronik.tx(txid);
            // For confirmed txs, we have a block key
            expect(tx.block?.height).to.eql(blockFromHeight.blockInfo.height);
            // We get the tx we called
            expect(tx.txid).to.eql(txid);
            // Gets the rawTx
            const rawTx = await chronik.rawTx(txid);
            expect(rawTx.rawTx).to.eql(txsAndRawTxsBroadcastInTest[txid]);
        }

        // These txs are in the just-mined block
        const blockTxsByHeight = await chronik.blockTxs(
            blockFromHeight.blockInfo.height,
        );

        // Now we have a coinbase tx and the broadcast txs

        // The first tx is the coinbase tx
        const coinbaseTx = blockTxsByHeight.txs.shift();
        expect(coinbaseTx?.isCoinbase).to.eql(true);

        // And the other txs are the same as what the node broadcast
        expect(
            blockTxsByHeight.txs.map(thisTx => {
                return thisTx.txid;
            }),
        ).to.have.all.members(broadcastTxids);

        // We can customize pageSize for blockTxs
        const customPageSize = 3;
        const blockTxsCustomPageSize = await chronik.blockTxs(
            blockFromHeight.blockInfo.height,
            0,
            customPageSize,
        );
        expect(blockTxsCustomPageSize.txs.length).to.eql(customPageSize);

        // This block should have 11 txs, coinbase + the 10 broadcasted by the node
        expect(blockTxsCustomPageSize.numTxs).to.eql(11);

        // We can get the last page. In this case, we expect length = 2 (11 % 3)

        // Note, the first page is page 0
        // The last page is numPages - 1
        const lastPage = blockTxsCustomPageSize.numPages - 1;
        const blockTxsLastPage = await chronik.blockTxs(
            blockFromHeight.blockInfo.height,
            lastPage,
            customPageSize,
        );
        expect(blockTxsLastPage.txs.length).to.eql(11 % customPageSize);

        // If we ask for a page number higher than numPages, we get an empty array at txs
        const emptyPage = await chronik.blockTxs(
            blockFromHeight.blockInfo.height,
            lastPage + 1,
            customPageSize,
        );
        expect(emptyPage.txs.length).to.eql(0);
    });
    it('After this mined block has been parked', async () => {
        const chronikUrl = await chronik_url;
        const chronik = new ChronikClientNode(chronikUrl);

        // We can't get blockTxs for the now-parked block
        await expect(
            chronik.blockTxs(REGTEST_CHAIN_INIT_HEIGHT + 1),
        ).to.be.rejectedWith(
            Error,
            'Failed getting /block-txs/201?page=0&page_size=25 (): 404: Block not found: 201',
        );

        // Gives us a tx by txid
        for (const txid of broadcastTxids) {
            const tx = await chronik.tx(txid);
            // Txs are back in the mempool and no longer have a block key
            expect(typeof tx.block).to.eql('undefined');
            // We get the tx we called
            expect(tx.txid).to.eql(txid);
            // Gets the rawTx
            const rawTx = await chronik.rawTx(txid);
            expect(rawTx.rawTx).to.eql(txsAndRawTxsBroadcastInTest[txid]);
        }
    });
});
