// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { MockChronikClient, MockAgora } from './index';
import mocks from './mocks';
import * as cashaddr from 'ecashaddrjs';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('MockAgora', () => {
    let mockAgora: MockAgora;
    const agoraError = new Error('some agora error');
    beforeEach(() => {
        mockAgora = new MockAgora();
    });
    it('We can set and get offeredGroupTokenIds', async () => {
        const tokenIds = ['a', 'b', 'c'];
        mockAgora.setOfferedGroupTokenIds(tokenIds);
        expect(await mockAgora.offeredGroupTokenIds()).to.deep.equal(tokenIds);
        // And force a thrown error
        mockAgora.setOfferedGroupTokenIds(agoraError);
        await expect(mockAgora.offeredGroupTokenIds()).to.be.rejectedWith(
            agoraError,
        );
    });
    it('We can set and get offeredFungibleTokenIds', async () => {
        const tokenIds = ['a', 'b', 'c'];
        mockAgora.setOfferedFungibleTokenIds(tokenIds);
        expect(await mockAgora.offeredFungibleTokenIds()).to.deep.equal(
            tokenIds,
        );
        // And force a thrown error
        mockAgora.setOfferedFungibleTokenIds(agoraError);
        await expect(mockAgora.offeredFungibleTokenIds()).to.be.rejectedWith(
            agoraError,
        );
    });
    it('We can set and get activeOffersByPubKey', async () => {
        const pk = 'pk';
        const mockOffers = [{ test: 'a' }];
        mockAgora.setActiveOffersByPubKey(pk, mockOffers);
        expect(await mockAgora.activeOffersByPubKey(pk)).to.deep.equal(
            mockOffers,
        );
        // And force a thrown error
        mockAgora.setActiveOffersByPubKey(pk, agoraError);
        await expect(mockAgora.activeOffersByPubKey(pk)).to.be.rejectedWith(
            agoraError,
        );
    });
    it('We can set and get activeOffersByGroupTokenId', async () => {
        const groupTokenId = '00'.repeat(32);
        const mockOffers = [{ test: 'a' }];
        mockAgora.setActiveOffersByGroupTokenId(groupTokenId, mockOffers);
        expect(
            await mockAgora.activeOffersByGroupTokenId(groupTokenId),
        ).to.deep.equal(mockOffers);
        // And force a thrown error
        mockAgora.setActiveOffersByGroupTokenId(groupTokenId, agoraError);
        await expect(
            mockAgora.activeOffersByGroupTokenId(groupTokenId),
        ).to.be.rejectedWith(agoraError);
    });
    it('We can set and get activeOffersByTokenId', async () => {
        const tokenId = '00'.repeat(32);
        const mockOffers = [{ test: 'a' }];
        mockAgora.setActiveOffersByTokenId(tokenId, mockOffers);
        expect(await mockAgora.activeOffersByTokenId(tokenId)).to.deep.equal(
            mockOffers,
        );
        // And force a thrown error
        mockAgora.setActiveOffersByTokenId(tokenId, agoraError);
        await expect(
            mockAgora.activeOffersByTokenId(tokenId),
        ).to.be.rejectedWith(agoraError);
    });
});
describe('MockChronikClient', () => {
    let mockChronik: MockChronikClient;
    const chronikError = new Error('some chronik error');
    beforeEach(() => {
        mockChronik = new MockChronikClient();
    });
    it('We can set and get a Block by height', async () => {
        const { tipHeight, block } = mocks;
        mockChronik.setBlock(tipHeight, block);
        expect(await mockChronik.block(tipHeight)).to.deep.equal(block);
        // And force a thrown error
        mockChronik.setBlock(tipHeight, chronikError);
        await expect(mockChronik.block(tipHeight)).to.be.rejectedWith(
            chronikError,
        );
    });
    it('We can set and get a Block by hash', async () => {
        const { tipHash, block } = mocks;
        mockChronik.setBlock(tipHash, block);
        expect(await mockChronik.block(tipHash)).to.deep.equal(block);
        // And force a thrown error
        mockChronik.setBlock(tipHash, chronikError);
        await expect(mockChronik.block(tipHash)).to.be.rejectedWith(
            chronikError,
        );
    });
    it('We can set and get BlockchainInfo', async () => {
        mockChronik.setBlockchainInfo(mocks.blockchainInfo);
        expect(await mockChronik.blockchainInfo()).to.deep.equal(
            mocks.blockchainInfo,
        );
        // And force a thrown error
        mockChronik.setBlockchainInfo(chronikError);
        await expect(mockChronik.blockchainInfo()).to.be.rejectedWith(
            chronikError,
        );
    });
    it('We can set and get chronikInfo', async () => {
        const versionInfo = { version: '1.0.0' };
        mockChronik.setChronikInfo(versionInfo);
        expect(await mockChronik.chronikInfo()).to.deep.equal(versionInfo);
        // And force a thrown error
        mockChronik.setChronikInfo(chronikError);
        await expect(mockChronik.chronikInfo()).to.be.rejectedWith(
            chronikError,
        );
    });
    it('We can set and get a Tx by txid', async () => {
        const { txid, tx } = mocks;
        mockChronik.setTx(txid, tx);
        expect(await mockChronik.tx(txid)).to.deep.equal(tx);
        // And force a thrown error
        mockChronik.setTx(txid, chronikError);
        await expect(mockChronik.tx(txid)).to.be.rejectedWith(chronikError);
    });
    it('We can set and get a Token by tokenId', async () => {
        const { tokenId, token } = mocks;
        mockChronik.setToken(tokenId, token);
        expect(await mockChronik.token(tokenId)).to.deep.equal(token);
        // And force a thrown error
        mockChronik.setToken(tokenId, chronikError);
        await expect(mockChronik.token(tokenId)).to.be.rejectedWith(
            chronikError,
        );
    });
    it('We can mock broadcasting a rawTx and getting its txid', async () => {
        const { txid, rawTx } = mocks;
        mockChronik.setBroadcastTx(rawTx, txid);
        expect(await mockChronik.broadcastTx(rawTx)).to.deep.equal({ txid });

        // And force a thrown error
        mockChronik.setBroadcastTx(rawTx, chronikError);
        await expect(mockChronik.broadcastTx(rawTx)).to.be.rejectedWith(
            chronikError,
        );
    });
    it('We can mock broadcasting an array of rawTxs and getting txids', async () => {
        const { txid, rawTx } = mocks;
        // We still set them one at a time
        mockChronik.setBroadcastTx(rawTx, txid);
        expect(
            await mockChronik.broadcastTxs([rawTx, rawTx, rawTx]),
        ).to.deep.equal([{ txid }, { txid }, { txid }]);

        // And force a thrown error
        mockChronik.setBroadcastTx(rawTx, chronikError);
        await expect(mockChronik.broadcastTxs([rawTx])).to.be.rejectedWith(
            chronikError,
        );
    });
    it('We can test websocket methods', async () => {
        // Create websocket subscription to listen to confirmations on txid
        const ws = mockChronik.ws({
            onMessage: msg => {
                console.log(`msg`, msg);
            },
        });

        // Wait for WS to be connected:
        await ws.waitForOpen();
        expect(ws.waitForOpenCalled).to.equal(true);

        // We can test if a websocket was closed by calling wsClose() (aka "manually closed")
        ws.close();
        expect(ws.manuallyClosed).to.equal(true);

        // We can subscribe to blocks
        ws.subscribeToBlocks();
        expect(ws.subs.blocks).to.equal(true);

        // We can unsubscribe from blocks
        ws.unsubscribeFromBlocks();
        expect(ws.subs.blocks).to.equal(false);

        // We can subscribe to a script
        const scriptType = 'p2pkh';
        const payload = '00'.repeat(20);
        ws.subscribeToScript(scriptType, payload);
        expect(ws.subs.scripts).to.deep.equal([{ scriptType, payload }]);

        // We can unsubscribe from a script
        ws.unsubscribeFromScript(scriptType, payload);
        expect(ws.subs.scripts).to.deep.equal([]);

        // We can subscribe to an address
        const addr = cashaddr.encode('ecash', scriptType, payload);
        ws.subscribeToAddress(addr);
        expect(ws.subs.scripts).to.deep.equal([{ scriptType, payload }]);

        // We can unsubscribe from an address
        ws.unsubscribeFromAddress(addr);
        expect(ws.subs.scripts).to.deep.equal([]);

        const tokenId = '00'.repeat(32);

        // We can subscribe to a token by tokenId
        ws.subscribeToTokenId(tokenId);
        expect(ws.subs.tokens).to.deep.equal([tokenId]);

        // We can unsubscribe from a tokenid
        ws.unsubscribeFromTokenId(tokenId);
        expect(ws.subs.tokens).to.deep.equal([]);

        const lokadId = '00'.repeat(2);

        // We can subscribe to a token by lokadId
        ws.subscribeToLokadId(lokadId);
        expect(ws.subs.lokadIds).to.deep.equal([lokadId]);

        // We can unsubscribe from a lokadId
        ws.unsubscribeFromLokadId(lokadId);
        expect(ws.subs.lokadIds).to.deep.equal([]);

        // We can subscribe to a plugin
        ws.subscribeToPlugin('name', 'group');
        expect(ws.subs.plugins).to.deep.equal([
            { group: 'group', pluginName: 'name' },
        ]);

        // We can unsubscribe from a plugin
        ws.unsubscribeFromPlugin('name', 'group');
        expect(ws.subs.plugins).to.deep.equal([]);
    });
    it('We can set and get tx history by script', async () => {
        const { tx } = mocks;
        const type = 'p2pkh';
        const hash = '00'.repeat(20);
        mockChronik.setTxHistoryByScript(type, hash, [tx]);
        expect(await mockChronik.script(type, hash).history()).to.deep.equal({
            txs: [tx],
            numPages: 1,
            numTxs: 1,
        });
        mockChronik.setTxHistoryByScript(type, hash, chronikError);
        await expect(
            mockChronik.script(type, hash).history(),
        ).to.be.rejectedWith(chronikError);
    });
    it('We can set and get utxos by script', async () => {
        const { utxo } = mocks;
        const type = 'p2pkh';
        const hash = '00'.repeat(20);
        mockChronik.setUtxosByScript(type, hash, [utxo]);
        expect(await mockChronik.script(type, hash).utxos()).to.deep.equal({
            outputScript: `76a914${hash}88ac`,
            utxos: [utxo],
        });
        mockChronik.setUtxosByScript(type, hash, chronikError);
        await expect(mockChronik.script(type, hash).utxos()).to.be.rejectedWith(
            chronikError,
        );
    });
    it('We can set and get tx history by address', async () => {
        const { tx } = mocks;
        const type = 'p2pkh';
        const hash = '00'.repeat(20);
        const address = cashaddr.encode('ecash', type, hash);
        mockChronik.setTxHistoryByAddress(address, [tx]);
        expect(await mockChronik.address(address).history()).to.deep.equal({
            txs: [tx],
            numPages: 1,
            numTxs: 1,
        });
        mockChronik.setTxHistoryByAddress(address, chronikError);
        await expect(mockChronik.address(address).history()).to.be.rejectedWith(
            chronikError,
        );
    });
    it('We can set and get utxos by address', async () => {
        const { utxo, scriptUtxo } = mocks;
        const type = 'p2pkh';
        const hash = '00'.repeat(20);
        const address = cashaddr.encode('ecash', type, hash);
        mockChronik.setUtxosByAddress(address, [utxo]);
        expect(await mockChronik.address(address).utxos()).to.deep.equal({
            outputScript: `76a914${hash}88ac`,
            utxos: [utxo],
        });
        mockChronik.setUtxosByAddress(address, chronikError);
        await expect(mockChronik.address(address).utxos()).to.be.rejectedWith(
            chronikError,
        );
    });
    it('We can set and get tx history by tokenId', async () => {
        const { tx } = mocks;
        const tokenId = '00'.repeat(32);
        mockChronik.setTxHistoryByTokenId(tokenId, [tx]);
        expect(await mockChronik.tokenId(tokenId).history()).to.deep.equal({
            txs: [tx],
            numPages: 1,
            numTxs: 1,
        });
        mockChronik.setTxHistoryByTokenId(tokenId, chronikError);
        await expect(mockChronik.tokenId(tokenId).history()).to.be.rejectedWith(
            chronikError,
        );
    });
    it('We can set and get utxos by tokenId', async () => {
        const { utxo } = mocks;
        const tokenId = '00'.repeat(32);
        mockChronik.setUtxosByTokenId(tokenId, [utxo]);
        expect(await mockChronik.tokenId(tokenId).utxos()).to.deep.equal({
            tokenId,
            utxos: [utxo],
        });
        mockChronik.setUtxosByTokenId(tokenId, chronikError);
        await expect(mockChronik.tokenId(tokenId).utxos()).to.be.rejectedWith(
            chronikError,
        );
    });
    it('We can set and get tx history by lokadId', async () => {
        // NB we cannot set and get utxos by lokadId, this is not available in chronik-client
        const { tx } = mocks;
        const lokadId = '00'.repeat(2);
        mockChronik.setTxHistoryByLokadId(lokadId, [tx]);
        expect(await mockChronik.lokadId(lokadId).history()).to.deep.equal({
            txs: [tx],
            numPages: 1,
            numTxs: 1,
        });
        mockChronik.setTxHistoryByLokadId(lokadId, chronikError);
        await expect(mockChronik.lokadId(lokadId).history()).to.be.rejectedWith(
            chronikError,
        );
    });
    context('Integration tests', () => {
        it('We can set utxos and then tx history at the same address without overwriting the utxos', async () => {
            const { utxo, scriptUtxo } = mocks;
            const type = 'p2pkh';
            const hash = '00'.repeat(20);
            const address = cashaddr.encode('ecash', type, hash);
            mockChronik.setUtxosByAddress(address, [utxo]);
            expect(await mockChronik.address(address).utxos()).to.deep.equal({
                outputScript: `76a914${hash}88ac`,
                utxos: [utxo],
            });

            const { tx } = mocks;
            const tokenId = '00'.repeat(32);
            mockChronik.setTxHistoryByTokenId(tokenId, [tx]);
            expect(await mockChronik.tokenId(tokenId).history()).to.deep.equal({
                txs: [tx],
                numPages: 1,
                numTxs: 1,
            });

            // Setting the tx history did not overwrite the utxos
            expect(await mockChronik.address(address).utxos()).to.deep.equal({
                outputScript: `76a914${hash}88ac`,
                utxos: [utxo],
            });
        });
    });
});
