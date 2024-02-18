// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
    BlockDetails,
    BlockInfo,
    ChronikClient,
    SlpTokenTxData,
    SubscribeMsg,
    Tx,
    Utxo,
    UtxoState,
} from '../index';
import { FailoverProxy } from '../src/failoverProxy';

const expect = chai.expect;
const assert = chai.assert;
chai.use(chaiAsPromised);

const LIVE_URL_ONE = 'https://chronik.fabien.cash';

const GENESIS_PK =
    '04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc' +
    '3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f';
const GENESIS_BLOCK_INFO: BlockInfo = {
    hash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
    prevHash:
        '0000000000000000000000000000000000000000000000000000000000000000',
    height: 0,
    nBits: 0x1d00ffff,
    timestamp: '1231006505',
    blockSize: '285',
    numTxs: '1',
    numInputs: '1',
    numOutputs: '1',
    sumInputSats: '0',
    sumCoinbaseOutputSats: '5000000000',
    sumNormalOutputSats: '0',
    sumBurnedSats: '0',
};
const GENESIS_BLOCK_DETAILS: BlockDetails = {
    version: 1,
    merkleRoot:
        '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
    nonce: '2083236893',
    medianTimestamp: '1231006505',
};
const GENESIS_TX: Tx = {
    txid: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
    version: 1,
    inputs: [
        {
            prevOut: {
                txid: '0000000000000000000000000000000000000000000000000000000000000000',
                outIdx: 0xffffffff,
            },
            inputScript:
                '04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e' +
                '63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420' +
                '666f722062616e6b73',
            outputScript: undefined,
            value: '0',
            sequenceNo: 0xffffffff,
            slpBurn: undefined,
            slpToken: undefined,
        },
    ],
    outputs: [
        {
            value: '5000000000',
            outputScript: '41' + GENESIS_PK + 'ac',
            slpToken: undefined,
            spentBy: undefined,
        },
    ],
    lockTime: 0,
    slpTxData: undefined,
    slpErrorMsg: undefined,
    block: {
        hash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
        height: 0,
        timestamp: '1231006505',
    },
    size: 204,
    isCoinbase: true,
    timeFirstSeen: '0',
    network: 'XEC',
};
const GENESIS_UTXO: Utxo = {
    outpoint: { txid: GENESIS_TX.txid, outIdx: 0 },
    blockHeight: 0,
    isCoinbase: true,
    value: '5000000000',
    slpMeta: undefined,
    slpToken: undefined,
    network: 'XEC',
};

describe('new ChronikClient', () => {
    it('throws if a singular url ends with a slash', () => {
        expect(
            () => new ChronikClient('https://chronik.be.cash/xec/'),
        ).to.throw(
            "`url` cannot end with '/', got: https://chronik.be.cash/xec/",
        );
    });
    it('throws if singular url has wrong schema', () => {
        expect(() => new ChronikClient('soap://chronik.be.cash/xec')).to.throw(
            "`url` must start with 'https://' or 'http://', got: " +
                'soap://chronik.be.cash/xec',
        );
    });
    it('throws if an array contains a url that ends with a slash', () => {
        expect(
            () => new ChronikClient(['https://chronik.be.cash/xec/']),
        ).to.throw(
            "`url` cannot end with '/', got: https://chronik.be.cash/xec/",
        );
    });
    it('throws if an array is empty', () => {
        expect(() => new ChronikClient([])).to.throw(
            'Url array must not be empty',
        );
    });
    it('throws if array url has wrong schema', () => {
        expect(
            () => new ChronikClient(['soap://chronik.be.cash/xec']),
        ).to.throw(
            "`url` must start with 'https://' or 'http://', got: " +
                'soap://chronik.be.cash/xec',
        );
    });
});

describe('/broadcast-tx', () => {
    const chronik = new ChronikClient(LIVE_URL_ONE);
    it('throws a decode error', async () => {
        assert.isRejected(
            chronik.broadcastTx('00000000'),
            Error,
            'Failed getting /broadcast-tx (invalid-tx-encoding): Invalid tx ' +
                'encoding: Bytes error: Index 1 is out of bounds for array with ' +
                'length 0',
        );
    });
});

describe('/blockchain-info', () => {
    const chronik = new ChronikClient(LIVE_URL_ONE);
    it('gives us the blockchain info', async () => {
        const blockchainInfo = await chronik.blockchainInfo();
        expect(blockchainInfo.tipHash.length).to.eql(64);
        expect(blockchainInfo.tipHeight).to.gte(739039);
    });

    const oneNonresponsiveUrl = [
        'https://chronikaaaa.be.cash/xec',
        'https://chronik.be.cash/xec',
    ];
    const brokenChronik = new ChronikClient(oneNonresponsiveUrl);
    it('gives us the blockchain info after encountering an outage with one of the supplied Chronik instances', async () => {
        const blockchainInfo = await brokenChronik.blockchainInfo();
        expect(blockchainInfo.tipHeight).to.gte(739039);
    });

    const allNonresponsiveUrl = [
        'https://chronikaaaa.be.cash/xec',
        'https://chronikzzzz.be.cash/xec',
        'https://chronikfffff.be.cash/xec',
    ];
    const permaBrokenChronik = new ChronikClient(allNonresponsiveUrl);
    it('throws error for the blockchain info call after cycling through all invalid Chronik urls', async () => {
        await expect(permaBrokenChronik.blockchainInfo()).to.be.rejectedWith(
            'Error connecting to known Chronik instances',
        );
    });
});

describe('/block/:hash', () => {
    const chronik = new ChronikClient(LIVE_URL_ONE);
    it('gives us the Genesis block by hash', async () => {
        const block = await chronik.block(
            '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
        );
        expect(block.blockInfo).to.eql(GENESIS_BLOCK_INFO);
        expect(block.blockDetails).to.eql(GENESIS_BLOCK_DETAILS);
        expect(block.txs).to.eql([GENESIS_TX]);
    });
    it('gives us the Genesis block by height', async () => {
        const block = await chronik.block(0);
        expect(block.blockInfo).to.eql(GENESIS_BLOCK_INFO);
        expect(block.blockDetails).to.eql(GENESIS_BLOCK_DETAILS);
        expect(block.txs).to.eql([GENESIS_TX]);
    });
});

describe('/blocks/:start/:end', () => {
    const chronik = new ChronikClient(LIVE_URL_ONE);
    it('gives us the first few blocks', async () => {
        const blocks = await chronik.blocks(0, 10);
        expect(blocks.length).to.equal(11);
        const block0: BlockInfo = GENESIS_BLOCK_INFO;
        expect(blocks[0]).to.eql(block0);
        const block1: BlockInfo = {
            ...block0,
            hash: '00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048',
            prevHash: block0.hash,
            height: 1,
            timestamp: '1231469665',
            blockSize: '215',
        };
        expect(blocks[1]).to.eql(block1);
        const block2: BlockInfo = {
            ...block1,
            hash: '000000006a625f06636b8bb6ac7b960a8d03705d1ace08b1a19da3fdcc99ddbd',
            prevHash: block1.hash,
            height: 2,
            timestamp: '1231469744',
        };
        expect(blocks[2]).to.eql(block2);
        const block3: BlockInfo = {
            ...block2,
            hash: '0000000082b5015589a3fdf2d4baff403e6f0be035a5d9742c1cae6295464449',
            prevHash: block2.hash,
            height: 3,
            timestamp: '1231470173',
        };
        expect(blocks[3]).to.eql(block3);
    });
});

describe('/tx/:txid', () => {
    const chronik = new ChronikClient(LIVE_URL_ONE);
    it('results in Not Found', async () => {
        assert.isRejected(
            chronik.tx(
                '0000000000000000000000000000000000000000000000000000000000000000',
            ),
            Error,
            'Failed getting tx ' +
                '0000000000000000000000000000000000000000000000000000000000000000: ' +
                'Txid not found: ' +
                '0000000000000000000000000000000000000000000000000000000000000000',
        );
    });
    it('results in the right tx', async () => {
        const tx = await chronik.tx(
            '0f3c3908a2ddec8dea91d2fe1f77295bbbb158af869bff345d44ae800f0a5498',
        );
        expect(tx.txid).to.eql(
            '0f3c3908a2ddec8dea91d2fe1f77295bbbb158af869bff345d44ae800f0a5498',
        );
        expect(tx.version).to.eql(2);
        expect(tx.inputs).to.eql([
            {
                inputScript:
                    '473044022042349e5e9e58c4c7b1fc9cbcdd1a1c9774b2ae95b7704ce40c7058ef' +
                    '14ba2854022022ba0cd4ead86982e7fc090ad06569a72c165efa3634feac4e722e' +
                    'ee405b92674121022d577b731fb05971d54951e4cb8bd11120327eba3e0fdd5a4d' +
                    '18f74a882df1a4',
                outputScript:
                    '76a914d15b9793d6af77663f8acf7e2c884f114ef901da88ac',
                prevOut: {
                    txid: 'fbe9a326ea525013e11e3f6341b3e03d6ad189bac30f94d5ceaf24ef4388e069',
                    outIdx: 1,
                },
                sequenceNo: 4294967295,
                slpBurn: undefined,
                slpToken: {
                    amount: '50000000',
                    isMintBaton: false,
                },
                value: '546',
            },
            {
                inputScript:
                    '473044022076e0c764b7d5a5f738304fec1df97db4ba6fc35f8ccb2438de8aabff' +
                    '781edb5c022002016344d4432a5837569b9c764b88aa71f98dbfb76c48cbd0ad9f' +
                    '18dc15be0e4121022d577b731fb05971d54951e4cb8bd11120327eba3e0fdd5a4d' +
                    '18f74a882df1a4',
                outputScript:
                    '76a914d15b9793d6af77663f8acf7e2c884f114ef901da88ac',
                prevOut: {
                    txid: '7ded3b52bbe20fc40d147a4e799fda91e589d29e017789ab6361e462dc972094',
                    outIdx: 0,
                },
                sequenceNo: 4294967295,
                slpBurn: undefined,
                slpToken: undefined,
                value: '100000',
            },
        ]);
        expect(tx.outputs).to.eql([
            {
                outputScript:
                    '6a04534c500001010453454e44200daf200e3418f2df1158efef36fbb507f12928' +
                    'f1fdcf3543703e64e75a4a90730800000000004c4b40080000000002aea540',
                slpToken: undefined,
                spentBy: undefined,
                value: '0',
            },
            {
                outputScript:
                    '76a9149c371def7e7cf89b30a62d658147937e679a965388ac',
                slpToken: {
                    amount: '5000000',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: '962ace9db1a36d06c129dffbe9a92bcf2eafe37d1a44aedfc6f957d2be69f149',
                    outIdx: 0,
                },
                value: '546',
            },
            {
                outputScript:
                    '76a914e7b4f63ec550ada1aed74960ddc4e0e107cd6cd188ac',
                slpToken: {
                    amount: '45000000',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: '11ce5e4249c5b43927810129d887ce0df3bbde46d036998dff0180f94d2df6f8',
                    outIdx: 0,
                },
                value: '546',
            },
            {
                outputScript:
                    '76a914d15b9793d6af77663f8acf7e2c884f114ef901da88ac',
                slpToken: undefined,
                spentBy: {
                    txid: '11ce5e4249c5b43927810129d887ce0df3bbde46d036998dff0180f94d2df6f8',
                    outIdx: 1,
                },
                value: '98938',
            },
        ]);
        expect(tx.lockTime).to.eql(0);
        expect(tx.slpTxData).to.eql({
            genesisInfo: undefined,
            slpMeta: {
                tokenId:
                    '0daf200e3418f2df1158efef36fbb507f12928f1fdcf3543703e64e75a4a9073',
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
                groupTokenId: undefined,
            },
        });
        expect(tx.slpErrorMsg).to.eql(undefined);
        expect(tx.block).to.eql({
            hash: '0000000000000000452f19532a6297ea194eaacac6d3bbcbf7c08a74cad84b44',
            height: 697728,
            timestamp: '1627790415',
        });
        expect(tx.timeFirstSeen).to.eql('0');
        expect(tx.network).to.eql('XEC');
    });
});

describe('/token/:tokenId', () => {
    const chronik = new ChronikClient(LIVE_URL_ONE);
    it('results in Not Found', async () => {
        assert.isRejected(
            chronik.token(
                '0000000000000000000000000000000000000000000000000000000000000000',
            ),
            Error,
        );
    });
    it('results in Not Found', async () => {
        assert.isRejected(
            chronik.token(
                '0f3c3908a2ddec8dea91d2fe1f77295bbbb158af869bff345d44ae800f0a5498',
            ),
            Error,
        );
    });
    it('gives us a token', async () => {
        const token = await chronik.token(
            '0daf200e3418f2df1158efef36fbb507f12928f1fdcf3543703e64e75a4a9073',
        );
        expect(token.slpTxData).to.eql({
            genesisInfo: {
                decimals: 4,
                tokenDocumentHash: '',
                tokenDocumentUrl: 'https://www.raiusd.co/etoken',
                tokenName: 'RaiUSD',
                tokenTicker: 'USDR',
            },
            slpMeta: {
                groupTokenId: undefined,
                tokenId:
                    '0daf200e3418f2df1158efef36fbb507f12928f1fdcf3543703e64e75a4a9073',
                tokenType: 'FUNGIBLE',
                txType: 'GENESIS',
            },
        } as SlpTokenTxData);
        expect(token.block).to.eql({
            hash: '00000000000000002686aa5ffa8401c7ed67338fb9475561b2fa9817d6571da8',
            height: 697721,
            timestamp: '1627783243',
        });
        expect(token.timeFirstSeen).to.eql('0');
        expect(token.initialTokenQuantity).to.eql('0');
        expect(token.containsBaton).to.eql(true);
        expect(token.network).to.eql('XEC');
    });
});

describe('/validate-utxos', () => {
    const chronik = new ChronikClient(LIVE_URL_ONE);
    it('validates the UTXOs', async () => {
        const validationResult = await chronik.validateUtxos([
            {
                txid: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
                outIdx: 0,
            },
            {
                txid: '0f3c3908a2ddec8dea91d2fe1f77295bbbb158af869bff345d44ae800f0a5498',
                outIdx: 1,
            },
            {
                txid: '0f3c3908a2ddec8dea91d2fe1f77295bbbb158af869bff345d44ae800f0a5498',
                outIdx: 100,
            },
            {
                txid: '0000000000000000000000000000000000000000000000000000000000000000',
                outIdx: 100,
            },
        ]);
        const expectedResult: UtxoState[] = [
            {
                height: 0,
                isConfirmed: true,
                state: 'UNSPENT',
            },
            {
                height: 697728,
                isConfirmed: true,
                state: 'SPENT',
            },
            {
                height: 697728,
                isConfirmed: true,
                state: 'NO_SUCH_OUTPUT',
            },
            {
                height: -1,
                isConfirmed: false,
                state: 'NO_SUCH_TX',
            },
        ];
        expect(validationResult).to.eql(expectedResult);
    });
});

describe('/script/:type/:payload/history', () => {
    const chronik = new ChronikClient(LIVE_URL_ONE);
    it('gives us the first page', async () => {
        const script = chronik.script('p2pk', GENESIS_PK);
        const history = await script.history();
        expect(history.numPages).to.equal(1);
        expect(history.txs[history.txs.length - 1]).to.eql(GENESIS_TX);
    });
    it('gives us an empty page for ?page=1', async () => {
        const script = chronik.script('p2pk', GENESIS_PK);
        const history = await script.history(1);
        expect(history.numPages).to.equal(1);
        expect(history.txs).to.eql([]);
    });
    it('gives us just one tx for ?page_size=1', async () => {
        const script = chronik.script('p2pk', GENESIS_PK);
        const history = await script.history(undefined, 1);
        expect(history.numPages).to.equal(2);
        expect(history.txs.length).to.equal(1);
    });
    it('gives us the Genesis tx for ?page=1&page_size=1', async () => {
        const script = chronik.script('p2pk', GENESIS_PK);
        const history = await script.history(1, 1);
        expect(history.numPages).to.equal(2);
        expect(history.txs).to.eql([GENESIS_TX]);
    });
});

describe('/script/:type/:payload/utxos', () => {
    const chronik = new ChronikClient(LIVE_URL_ONE);
    it('gives us the UTXOs', async () => {
        const script = chronik.script('p2pk', GENESIS_PK);
        const utxos = await script.utxos();
        expect(utxos.length).to.equal(1);
        expect(utxos[0].outputScript).to.eql('41' + GENESIS_PK + 'ac');
        expect(utxos[0].utxos[0]).to.eql(GENESIS_UTXO);
    });
});

describe('/ws', () => {
    const chronik = new ChronikClient(LIVE_URL_ONE);
    xit('gives us a confirmation', async () => {
        const promise = new Promise((resolve: (msg: SubscribeMsg) => void) => {
            const ws = chronik.ws({
                onMessage: msg => {
                    resolve(msg);
                    ws.close();
                },
            });
            ws.subscribe('p2pkh', 'b8ae1c47effb58f72f7bca819fe7fc252f9e852e');
        });
        const msg = await promise;
        expect(msg.type).to.eql('Confirmed');
    });
    it('connects to the ws', async () => {
        const promise = new Promise((resolve, rejects) => {
            const ws = chronik.ws({});
            ws.waitForOpen()
                .then(() => {
                    resolve({});
                    ws.close();
                })
                .catch(err => rejects(err));
        });
        await promise;
    });
    it('connects to a working ws in an array of broken ws', async () => {
        const halfBrokenChronik = new ChronikClient([
            'https://chronikaaaa.be.cash/xec',
            'https://chronikzzzz.be.cash/xec',
            'https://chroniktttt.be.cash/xec',
            LIVE_URL_ONE, // working
        ]);
        const promise = new Promise((resolve, rejects) => {
            const ws = halfBrokenChronik.ws({});
            ws.waitForOpen()
                .then(() => {
                    resolve({});
                    ws.close();
                })
                .catch(err => rejects(err));
        });
        await promise;
    });

    it('throws expected error if no websockets will connect', async () => {
        const brokenChronikUrls = new ChronikClient([
            'https://chronikaaaa.be.cash/xec',
            'https://chronikzzzz.be.cash/xec',
            'https://chroniktttt.be.cash/xec',
        ]);
        const promise = new Promise((resolve, rejects) => {
            const ws = brokenChronikUrls.ws({});
            ws.waitForOpen()
                .then(() => {
                    resolve({});
                    ws.close();
                })
                .catch(err => rejects(err));
        });

        await expect(promise).to.be.rejectedWith(
            'Error connecting to known Chronik websockets',
        );
    });
});

describe('FailoverProxy', () => {
    it('appendWsUrls combines an object array of valid urls with wsUrls', () => {
        const urls = [
            'https://chronik.be.cash/xec',
            'https://chronik.fabien.cash',
            'https://chronik2.fabien.cash',
        ];
        const proxyInterface = new FailoverProxy(urls);
        const expectedResult = [
            {
                url: 'https://chronik.be.cash/xec',
                wsUrl: 'wss://chronik.be.cash/xec/ws',
            },
            {
                url: 'https://chronik.fabien.cash',
                wsUrl: 'wss://chronik.fabien.cash/ws',
            },
            {
                url: 'https://chronik2.fabien.cash',
                wsUrl: 'wss://chronik2.fabien.cash/ws',
            },
        ];
        expect(proxyInterface.appendWsUrls(urls)).to.eql(expectedResult);
    });
    it('appendWsUrls combines an array of mixed valid https and http urls with wsUrls', () => {
        const urls = [
            'https://chronik.be.cash/xec',
            'http://chronik.fabien.cash',
            'https://chronik2.fabien.cash',
        ];
        const proxyInterface = new FailoverProxy(urls);
        const expectedResult = [
            {
                url: 'https://chronik.be.cash/xec',
                wsUrl: 'wss://chronik.be.cash/xec/ws',
            },
            {
                url: 'http://chronik.fabien.cash',
                wsUrl: 'ws://chronik.fabien.cash/ws',
            },
            {
                url: 'https://chronik2.fabien.cash',
                wsUrl: 'wss://chronik2.fabien.cash/ws',
            },
        ];
        expect(proxyInterface.appendWsUrls(urls)).to.eql(expectedResult);
    });
    it('appendWsUrls returns an empty array for an empty input', () => {
        const urls = [
            'https://chronik.be.cash/xec',
            'http://chronik.fabien.cash',
            'https://chronik2.fabien.cash',
        ];
        const proxyInterface = new FailoverProxy(urls);
        expect(proxyInterface.appendWsUrls([])).to.eql([]);
    });
    it('appendWsUrls throws error on an invalid regular endpoint', () => {
        const urls = [
            LIVE_URL_ONE,
            'http://chronik.fabien.cash',
            'https://chronik2.fabien.cash',
        ];
        const proxyInterface = new FailoverProxy(urls);
        const oneBrokenUrl = [
            'https://chronik.fabien.cash',
            'not-a-valid-url',
            'https://chronik2.fabien.cash',
        ];
        expect(() => proxyInterface.appendWsUrls(oneBrokenUrl)).to.throw(
            `Invalid url found in array: ${oneBrokenUrl[1]}`,
        );
    });
    it('FailoverProxy instantiates with a valid url array', () => {
        const urls = [
            'https://chronik.be.cash/xec',
            'http://chronik.fabien.cash',
            'https://chronik2.fabien.cash',
        ];
        const proxyInterface = new FailoverProxy(urls);
        const expectedProxyArray = [
            {
                url: 'https://chronik.be.cash/xec',
                wsUrl: 'wss://chronik.be.cash/xec/ws',
            },
            {
                url: 'http://chronik.fabien.cash',
                wsUrl: 'ws://chronik.fabien.cash/ws',
            },
            {
                url: 'https://chronik2.fabien.cash',
                wsUrl: 'wss://chronik2.fabien.cash/ws',
            },
        ];
        expect(proxyInterface.getEndpointArray()).to.eql(expectedProxyArray);
    });
    it('FailoverProxy constructor throws error on an invalid regular endpoint', () => {
        const oneBrokenUrl = [
            'https://chronik.fabien.cash',
            'not-a-valid-url',
            'https://chronik2.fabien.cash',
        ];
        expect(() => new FailoverProxy(oneBrokenUrl)).to.throw(
            "`url` must start with 'https://' or 'http://', got: " +
                oneBrokenUrl[1],
        );
    });
});

describe('deriveEndpointIndex', () => {
    it('deriveEndpointIndex iterates through a four element array with default working index', () => {
        const testArray = [
            'https://chronik.be.cash/xec',
            'http://chronik.fabien.cash',
            'https://chronik2.fabien.cash',
            'https://chronik3.fabien.cash',
        ];
        const proxyInterface = new FailoverProxy(testArray);

        const indexOrder = [];
        for (let i = 0; i < testArray.length; i += 1) {
            indexOrder.push(proxyInterface.deriveEndpointIndex(i));
        }
        expect(indexOrder).to.eql([0, 1, 2, 3]);
    });
    it('deriveEndpointIndex iterates through a four element array with working index set to 3', () => {
        const testArray = [
            'https://chronik.be.cash/xec',
            'http://chronik.fabien.cash',
            'https://chronik2.fabien.cash',
            'https://chronik3.fabien.cash',
        ];
        const proxyInterface = new FailoverProxy(testArray);

        // Override the working index to 3
        proxyInterface.setWorkingIndex(3);

        const indexOrder = [];
        for (let i = 0; i < testArray.length; i += 1) {
            indexOrder.push(proxyInterface.deriveEndpointIndex(i));
        }
        expect(indexOrder).to.eql([3, 0, 1, 2]);
    });
});
