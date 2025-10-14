// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import assert from 'assert';
import opReturn from '../constants/op_return';
import unrevivedBlock from './mocks/block';
import minersJson, { KnownMiners } from '../constants/miners';
import minerTestFixtures from './fixtures/miners';
import stakerTestFixtures from './fixtures/stakers';
import invalidatedBlocksTestFixtures from './fixtures/invalidatedBlocks';
import { jsonReviver } from '../src/utils';
import memoFixtures from './mocks/memo';
import { getStackArray } from 'ecash-lib';
import { MockChronikClient } from '../../../modules/mock-chronik-client';
import { Block, ChronikClient, TxOutput } from 'chronik-client';
import { caching } from 'cache-manager';
import { StoredMock } from '../src/events';
import {
    parseBlockTxs,
    getStakerFromCoinbaseTx,
    getMinerFromCoinbaseTx,
    parseMemoOutputScript,
    getBlockTgMessage,
    parseOpReturn,
    getSwapTgMsg,
    getAirdropTgMsg,
    getEncryptedCashtabMsg,
    parseMultipushStack,
    parseSlpTwo,
    guessRejectReason,
    summarizeTxHistory,
    getMinerOutputScript,
    IFP_OUTPUTSCRIPT,
    STAKING_ACTIVATION_HEIGHT,
} from '../src/parse';
import appTxSamples from './mocks/appTxSamples';
import { dailyTxs, tokenInfoMap } from './mocks/dailyTxs';

const {
    swaps,
    airdrops,
    encryptedCashtabMsgs,
    slp2PushVectors,
    slp2TxVectors,
    aliasRegistrations,
    cashtabMsgs,
    payButtonTxs,
    paywallTxs,
    authenticationTxs,
} = appTxSamples;

const block: StoredMock = JSON.parse(
    JSON.stringify(unrevivedBlock),
    jsonReviver,
);
const miners: KnownMiners = JSON.parse(JSON.stringify(minersJson), jsonReviver);

describe('parse.js functions', function () {
    it('Parses the master test block', function () {
        const thisBlock = block;
        const {
            blockTxs,
            parsedBlock,
            coingeckoPrices,
            activeStakers,
            tokenInfoMap,
            outputScriptInfoMap,
            blockSummaryTgMsgs,
        } = thisBlock;
        assert.deepEqual(
            parseBlockTxs(parsedBlock.hash, parsedBlock.height, blockTxs),
            parsedBlock,
        );
        assert.deepEqual(
            getBlockTgMessage(
                parsedBlock,
                coingeckoPrices,
                tokenInfoMap,
                outputScriptInfoMap,
                activeStakers,
            ),
            blockSummaryTgMsgs,
        );
    });
    it('parseOpReturn handles all types of SWaP txs', function () {
        for (let i = 0; i < swaps.length; i += 1) {
            const { hex, stackArray, tokenId } = swaps[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.swap.app,
                msg: '',
                stackArray,
                tokenId,
            });
        }
    });
    it('getSwapTgMsg handles all types of SWaP txs', function () {
        for (let i = 0; i < swaps.length; i += 1) {
            const { stackArray, msg, tokenInfo } = swaps[i];
            const result = getSwapTgMsg(stackArray, tokenInfo);
            assert.strictEqual(result, msg);
        }
    });
    it('parseOpReturn handles alias registration txs', function () {
        for (let i = 0; i < aliasRegistrations.length; i += 1) {
            const { hex, stackArray, msg } = aliasRegistrations[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.alias.app,
                msg,
                stackArray,
                tokenId: false,
            });
        }
    });
    it('parseOpReturn handles Cashtab Msgs', function () {
        for (let i = 0; i < cashtabMsgs.length; i += 1) {
            const { hex, stackArray, msg } = cashtabMsgs[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.cashtabMsg.app,
                msg,
                stackArray,
                tokenId: false,
            });
        }
    });
    it('parseOpReturn handles PayButton txs', function () {
        for (let i = 0; i < payButtonTxs.length; i += 1) {
            const { hex, stackArray, msg } = payButtonTxs[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.payButton.app,
                msg,
                stackArray,
                tokenId: false,
            });
        }
    });
    it('parseOpReturn handles airdrop txs with and without a cashtab msg', function () {
        for (let i = 0; i < airdrops.length; i += 1) {
            const { hex, stackArray, tokenId } = airdrops[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.airdrop.app,
                msg: '',
                stackArray,
                tokenId,
            });
        }
    });
    it('getAirdropMsg handles airdrop txs with and without a cashtab msg', function () {
        for (let i = 0; i < airdrops.length; i += 1) {
            const {
                stackArray,
                airdropSendingAddress,
                airdropRecipientsKeyValueArray,
                msg,
                msgApiFailure,
                tokenInfo,
                coingeckoPrices,
            } = airdrops[i];
            const xecReceivingOutputs = new Map(airdropRecipientsKeyValueArray);
            let totalSatsSent = 0n;
            for (const satoshis of xecReceivingOutputs.values()) {
                totalSatsSent += satoshis;
            }
            const result = getAirdropTgMsg(
                stackArray,
                airdropSendingAddress,
                xecReceivingOutputs,
                totalSatsSent,
                tokenInfo,
                coingeckoPrices[0].price,
            );
            const resultApiFailure = getAirdropTgMsg(
                stackArray,
                airdropSendingAddress,
                xecReceivingOutputs,
                totalSatsSent,
                false,
            );
            assert.strictEqual(result, msg);
            assert.strictEqual(resultApiFailure, msgApiFailure);
        }
    });
    it('parseOpReturn handles encrypted cashtab msg txs', function () {
        for (let i = 0; i < encryptedCashtabMsgs.length; i += 1) {
            const { hex, stackArray } = encryptedCashtabMsgs[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.cashtabMsgEncrypted.app,
                msg: '',
                stackArray,
                tokenId: false,
            });
        }
    });
    it('parseOpReturn handles paywall payment txs', function () {
        for (let i = 0; i < paywallTxs.length; i += 1) {
            const { hex, stackArray, msg } = paywallTxs[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.paywall.app,
                msg: msg,
                stackArray,
                tokenId: false,
            });
        }
    });
    it('getEncryptedCashtabMsg handles encrypted cashtab msg txs with and without price info', function () {
        for (let i = 0; i < encryptedCashtabMsgs.length; i += 1) {
            const {
                sendingAddress,
                xecReceivingOutputsKeyValueArray,
                msg,
                msgApiFailure,
                coingeckoPrices,
            } = encryptedCashtabMsgs[i];

            const xecReceivingOutputs = new Map(
                xecReceivingOutputsKeyValueArray,
            );
            let totalSatsSent = 0n;
            for (const satoshis of xecReceivingOutputs.values()) {
                totalSatsSent += satoshis;
            }
            const result = getEncryptedCashtabMsg(
                sendingAddress,
                xecReceivingOutputs,
                totalSatsSent,
                coingeckoPrices[0].price,
            );
            const resultApiFailure = getEncryptedCashtabMsg(
                sendingAddress,
                xecReceivingOutputs,
                totalSatsSent,
            );
            assert.strictEqual(result, msg);
            assert.strictEqual(resultApiFailure, msgApiFailure);
        }
    });
    it('parseOpReturn handles slp2 txs', function () {
        for (let i = 0; i < slp2TxVectors.length; i += 1) {
            const { hex, msg } = slp2TxVectors[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: 'EMPP',
                msg,
            });
        }
    });
    it('parseOpReturn handles authentication txs', function () {
        for (let i = 0; i < authenticationTxs.length; i += 1) {
            const { hex, stackArray, msg } = authenticationTxs[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.authentication.app,
                msg: msg,
                stackArray,
                tokenId: false,
            });
        }
    });
    it('parseMultipushStack handles a range of observed slp2 empp pushes', function () {
        for (let i = 0; i < slp2TxVectors.length; i += 1) {
            const { emppStackArray, msg } = slp2TxVectors[i];
            assert.deepEqual(parseMultipushStack(emppStackArray), {
                app: 'EMPP',
                msg,
            });
        }
    });
    it('parseSlpTwo handles a range of observed slp2 empp pushes', function () {
        for (let i = 0; i < slp2PushVectors.length; i += 1) {
            const { push, msg } = slp2PushVectors[i];

            assert.strictEqual(parseSlpTwo(push.slice(8)), msg);
        }
    });
    it('parseOpReturn recognizes legacy Cash Fusion prefix', function () {
        assert.deepEqual(
            parseOpReturn(
                '0446555a0020771c2fa0d402fe15ba0aa2e98660facf4a8ab6801b5baf3c0b08ced685dd85ed',
            ),
            {
                app: opReturn.knownApps.fusionLegacy.app,
                msg: '',
                tokenId: false,
                stackArray: [
                    '46555a00',
                    '771c2fa0d402fe15ba0aa2e98660facf4a8ab6801b5baf3c0b08ced685dd85ed',
                ],
            },
        );
    });
    it(`parseMemoOutputScript correctly parses all tested memo actions in memo.js`, function () {
        memoFixtures.map(memoTestObj => {
            const { outputScript, msg } = memoTestObj;
            // Get array of pushes using ecash-lib
            const stackArray = getStackArray(outputScript);
            assert.deepEqual(parseMemoOutputScript(stackArray), {
                app: opReturn.memo.app,
                msg,
            });
        });
    });
    it('getStakerFromCoinbaseTx parses miner for all test vectors', function () {
        for (let i = 0; i < stakerTestFixtures.length; i += 1) {
            const { coinbaseTx, staker } = stakerTestFixtures[i];

            assert.deepEqual(
                getStakerFromCoinbaseTx(
                    coinbaseTx.block.height,
                    coinbaseTx.outputs as TxOutput[],
                ),
                staker,
            );
        }
    });
    it('We can get the miner address from coinbase outputs', function () {
        const minerAddrVectors = [
            {
                desc: 'We will bestGuess the staker if there are no other options',
                blockHeight: STAKING_ACTIVATION_HEIGHT + 1,
                outputs: [
                    { outputScript: IFP_OUTPUTSCRIPT, sats: 2_800_000_00n },
                    { outputScript: 'staker', sats: 312_500_00n },
                ],
                result: 'staker',
            },
            {
                desc: 'We ignore the staker if there is another option',
                blockHeight: STAKING_ACTIVATION_HEIGHT + 1,
                outputs: [
                    { outputScript: IFP_OUTPUTSCRIPT, sats: 1_000_000_00n },
                    { outputScript: 'b', sats: 1_800_000_00n },
                    { outputScript: 'staker', sats: 312_500_00n },
                ],
                result: 'b',
            },
            {
                desc: 'We take the staker if blockheight precedes staking rewards',
                blockHeight: STAKING_ACTIVATION_HEIGHT - 1,
                outputs: [
                    { outputScript: IFP_OUTPUTSCRIPT, sats: 1_000_000_00n },
                    { outputScript: 'staker', sats: 312_500_00n },
                    { outputScript: 'b', sats: 1_800_000_00n },
                ],
                result: 'staker',
            },
            {
                desc: 'We can handle 4 outputs i.e. #888,849',
                blockHeight: STAKING_ACTIVATION_HEIGHT + 1,
                outputs: [
                    { outputScript: IFP_OUTPUTSCRIPT, sats: 1_000_018_60n },
                    {
                        outputScript:
                            '76a9143dea23dc27b199d34e2cbfced23341c2424b922588ac',
                        sats: 312_505_81n,
                    },
                    {
                        outputScript:
                            '76a9146657bcc784bfa56301962567c62feda9d1eb37ba88ac',
                        sats: 9_062_67n,
                    },
                    {
                        outputScript:
                            '76a914f4347696e02f6a0200760a01c116a3f07ebdab5088ac',
                        sats: 1_803_471_05n,
                    },
                ],
                // NB we get the first of the 2 miner outputs
                result: '76a9146657bcc784bfa56301962567c62feda9d1eb37ba88ac',
            },
        ];
        for (let i = 0; i < minerAddrVectors.length; i += 1) {
            const { blockHeight, outputs, result } = minerAddrVectors[i];

            assert.equal(
                getMinerOutputScript(
                    blockHeight,
                    outputs as unknown as TxOutput[],
                ),
                result,
            );
        }
    });
    it('getMinerFromCoinbaseTx parses miner for all test vectors', function () {
        for (let i = 0; i < minerTestFixtures.length; i += 1) {
            const { parsed, coinbaseHex, payoutOutputScript } =
                minerTestFixtures[i];
            // Minimally mock the coinbase tx
            const inputScript = coinbaseHex;
            const outputs = [
                { outputScript: payoutOutputScript, sats: 1_000_000_00n },
            ] as TxOutput[];

            const DEFAULT_BLOCKHEIGHT = 800000;

            assert.strictEqual(
                getMinerFromCoinbaseTx(
                    inputScript,
                    outputs,
                    miners,
                    DEFAULT_BLOCKHEIGHT,
                ),
                parsed,
            );
        }
    });
    it('guessRejectReason returns the expected guess for all test vectors', async function () {
        for (let i = 0; i < invalidatedBlocksTestFixtures.length; i += 1) {
            const {
                height,
                coinbaseData,
                expectedRejectReason,
                expectedCacheData,
                mockedBlock,
            } = invalidatedBlocksTestFixtures[i];

            const mockedChronik = new MockChronikClient();
            if (typeof mockedBlock.height !== 'undefined') {
                mockedChronik.setBlock(
                    mockedBlock.height,
                    mockedBlock.block as Block,
                );
            }

            const testMemoryCache = await caching('memory', {
                max: 100,
                ttl: 60,
            });
            testMemoryCache.set(`${height}`, expectedCacheData);

            assert.strictEqual(
                await guessRejectReason(
                    mockedChronik as unknown as ChronikClient,
                    height,
                    coinbaseData,
                    testMemoryCache,
                ),
                expectedRejectReason,
            );
        }
    });
    it('summarizeTxHistory summarizes a collection of txs across multiple blocks including fiat prices', function () {
        const mockUtcNewDayTimestampSeconds = 1728950400;
        assert.deepEqual(
            summarizeTxHistory(
                mockUtcNewDayTimestampSeconds,
                dailyTxs,
                tokenInfoMap,
                10, // show all tested agora tokens
                10, // show all tested non-agora tokens
                {
                    usd: 0.00003487,
                    usd_market_cap: 689047177.8128564,
                    usd_24h_vol: 5957332.9687223025,
                    usd_24h_change: -0.3973642442197056,
                },
                block.activeStakers,
            ),
            [
                '<b>14 Oct 2024</b>\n' +
                    '📦90,011 blocks\n' +
                    '➡️38 txs\n' +
                    `💧<i>0.00% capacity</i>\n` +
                    '\n' +
                    '📉<b>1 XEC = $0.00003487</b> <i>(-0.40%)</i>\n' +
                    'Trading volume: $5,957,333\n' +
                    'Market cap: $689,047,178\n' +
                    '\n' +
                    '<b><i>⛏️3 miners found blocks</i></b>\n' +
                    '<u>Top 3</u>\n' +
                    '1. Mining-Dutch, 1 <i>(0%)</i>\n' +
                    '2. solopool.org, 1 <i>(0%)</i>\n' +
                    '3. ViaBTC, 1 <i>(0%)</i>\n' +
                    '\n' +
                    '<b><i>💰3 stakers earned $33</i></b>\n' +
                    '<b><i>🧮 72 nodes staking <code>251,480,511,703.14</code> XEC ($8.77M)</i></b>\n' +
                    '<u>Top 3</u>\n' +
                    '1. <a href="https://explorer.e.cash/address/ecash:qzs8hq2pj4hu5j09fdr5uhha3986h2mthvfp7362nu">qzs...2nu</a>, 1 <i>(0% won, 1% expected)</i>\n' +
                    '2. <a href="https://explorer.e.cash/address/ecash:qr42c8c04tqndscfrdnl0rzterg0qdaegyjzt8egyg">qr4...gyg</a>, 1 <i>(0% won, 9% expected)</i>\n' +
                    '3. <a href="https://explorer.e.cash/address/ecash:qqvhatumna957qu0je78dnc9pc7c7hu89crkq6k0cd">qqv...0cd</a>, 1 <i>(0%)</i>\n' +
                    '\n' +
                    '<a href="https://cashtab.com/">Cashtab</a>\n' +
                    '🎁 <b>1</b> new user received <b>42 XEC</b>\n' +
                    '🎟 <b>1</b> <a href="https://cashtab.com/#/token/aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1">CACHET</a> reward\n' +
                    '\n' +
                    '🏛🪙 <b><i>7 Agora token txs from 4 tokens</i></b>\n' +
                    '🔊 <b><i>$0.004</i></b>\n' +
                    '💰Buy, 🏷List, ❌Cancel\n' +
                    '🗻<a href="https://cashtab.com/#/token/116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f">Tiberium</a> (TB): 💰x2 ($0.004)🏷❌\n' +
                    '<a href="https://cashtab.com/#/token/aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1">Cachet</a> (CACHET): 💰 ($0.0003)\n' +
                    '<a href="https://cashtab.com/#/token/20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8">Vespene Gas</a> (VSP): ❌\n' +
                    '<a href="https://cashtab.com/#/token/01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896">Bull</a> (BULL): 🏷\n' +
                    '\n🏛🖼 <b><i>3 Agora NFT txs from 2 NFTs in 2 collections</i></b>\n' +
                    '🔊 <b><i>$0.465</i></b>\n' +
                    '<a href="https://cashtab.com/#/token/78efa5177e99bf05b48948ac7e23e6cc2255764e52ccf7092afb979a766dee2c">xolosArmyPOP</a> (RMZPOP): 💰 ($0.465)\n' +
                    '<a href="https://cashtab.com/#/token/0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316">Flags</a> (FLAGS): 🏷❌\n' +
                    '\n' +
                    '🪙 <b><i>16 token txs from 4 tokens</i></b>\n' +
                    '<a href="https://cashtab.com/#/token/04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103">Perpetua</a> (PRP): 🧪➡️🔥🔨\n' +
                    '🗻<a href="https://cashtab.com/#/token/116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f">Tiberium</a> (TB): 🧪➡️🔥🔨\n' +
                    '🗻<a href="https://cashtab.com/#/token/cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145">Credo In Unum Deo</a> (CRD): ➡️\n' +
                    '<a href="https://cashtab.com/#/token/20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8">Vespene Gas</a> (VSP): ➡️\n' +
                    '\n' +
                    '🖼 <b><i>2 NFT txs from 2 NFTs in 2 collections</i></b>\n' +
                    '<a href="https://cashtab.com/#/token/8fd3f14abd2b176a1d4bd5136542cd2a7ba3df0e11947dd19326c9d1cd81ae09">Xoloitzcuintli NFT Cigar Collection.</a> (RMZsmoke): 🧪\n' +
                    '<a href="https://cashtab.com/#/token/78efa5177e99bf05b48948ac7e23e6cc2255764e52ccf7092afb979a766dee2c">xolosArmyPOP</a> (RMZPOP): ➡️\n' +
                    '\n' +
                    '🖼 <b><i>1 NFT mint</i></b>\n' +
                    '🔨 <b><i>2 new variable-supply tokens</i></b>\n' +
                    '🧩 <b><i>1 Mint Vault tx</i></b>\n' +
                    '\n' +
                    '📱 <b><i>8 app txs</i></b>\n' +
                    '🖋 <b>1</b> <a href="https://www.ecashchat.com/">Article/Reply tx</a>\n' +
                    '⚛️ <b>1</b> CashFusion\n' +
                    '🛒 <b>1</b> PayButton tx\n' +
                    '🪂 <b>1</b> Airdrop\n' +
                    '✏️ <b>1</b> Cashtab Msg\n' +
                    '💬 <b>1</b> <a href="https://www.ecashchat.com/">eCashChat tx</a>\n' +
                    '🔓 <b>1</b> eCashChat Auth\n' +
                    '💸 <b>1</b> Paywall tx\n' +
                    '\n' +
                    '🏦 <b><i>Binance</i></b>\n' +
                    '<b>1</b> withdrawal, $0.688\n' +
                    '🏦 <b><i>CoinEx</i></b>\n' +
                    '<b>1</b> withdrawal, $15.91k',
            ],
        );
    });
    it('summarizeTxHistory summarizes a collection of txs across multiple blocks including fiat prices with no token cache info', function () {
        const mockUtcNewDayTimestampSeconds = 1728950400;
        assert.deepEqual(
            summarizeTxHistory(
                mockUtcNewDayTimestampSeconds,
                dailyTxs,
                // we can't get any token cache info
                new Map(),
                10, // show all tested agora tokens
                10, // show all tested non-agora tokens
                {
                    usd: 0.00003487,
                    usd_market_cap: 689047177.8128564,
                    usd_24h_vol: 5957332.9687223025,
                    usd_24h_change: -0.3973642442197056,
                },
                block.activeStakers,
            ),
            [
                '<b>14 Oct 2024</b>\n' +
                    '📦90,011 blocks\n' +
                    '➡️38 txs\n' +
                    `💧<i>0.00% capacity</i>\n` +
                    '\n' +
                    '📉<b>1 XEC = $0.00003487</b> <i>(-0.40%)</i>\n' +
                    'Trading volume: $5,957,333\n' +
                    'Market cap: $689,047,178\n' +
                    '\n' +
                    '<b><i>⛏️3 miners found blocks</i></b>\n' +
                    '<u>Top 3</u>\n' +
                    '1. Mining-Dutch, 1 <i>(0%)</i>\n' +
                    '2. solopool.org, 1 <i>(0%)</i>\n' +
                    '3. ViaBTC, 1 <i>(0%)</i>\n' +
                    '\n' +
                    '<b><i>💰3 stakers earned $33</i></b>\n' +
                    '<b><i>🧮 72 nodes staking <code>251,480,511,703.14</code> XEC ($8.77M)</i></b>\n' +
                    '<u>Top 3</u>\n' +
                    '1. <a href="https://explorer.e.cash/address/ecash:qzs8hq2pj4hu5j09fdr5uhha3986h2mthvfp7362nu">qzs...2nu</a>, 1 <i>(0% won, 1% expected)</i>\n' +
                    '2. <a href="https://explorer.e.cash/address/ecash:qr42c8c04tqndscfrdnl0rzterg0qdaegyjzt8egyg">qr4...gyg</a>, 1 <i>(0% won, 9% expected)</i>\n' +
                    '3. <a href="https://explorer.e.cash/address/ecash:qqvhatumna957qu0je78dnc9pc7c7hu89crkq6k0cd">qqv...0cd</a>, 1 <i>(0%)</i>\n' +
                    '\n' +
                    '<a href="https://cashtab.com/">Cashtab</a>\n' +
                    '🎁 <b>1</b> new user received <b>42 XEC</b>\n' +
                    '🎟 <b>1</b> <a href="https://cashtab.com/#/token/aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1">CACHET</a> reward\n' +
                    '\n' +
                    '🏛🪙 <b><i>7 Agora token txs from 4 tokens</i></b>\n' +
                    '🔊 <b><i>$0.004</i></b>\n' +
                    '💰Buy, 🏷List, ❌Cancel\n' +
                    '🗻<a href="https://cashtab.com/#/token/116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f">116...33f</a>: 💰x2 ($0.004)🏷❌\n' +
                    '<a href="https://cashtab.com/#/token/aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1">aed...cb1</a>: 💰 ($0.0003)\n' +
                    '<a href="https://cashtab.com/#/token/20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8">20a...6f8</a>: ❌\n' +
                    '<a href="https://cashtab.com/#/token/01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896">01d...896</a>: 🏷\n' +
                    '\n🏛🖼 <b><i>3 Agora NFT txs from 2 NFTs in 2 collections</i></b>\n' +
                    '🔊 <b><i>$0.465</i></b>\n' +
                    '<a href="https://cashtab.com/#/token/78efa5177e99bf05b48948ac7e23e6cc2255764e52ccf7092afb979a766dee2c">78e...e2c</a>: 💰 ($0.465)\n' +
                    '<a href="https://cashtab.com/#/token/0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316">0fb...316</a>: 🏷❌\n' +
                    '\n' +
                    '🪙 <b><i>16 token txs from 4 tokens</i></b>\n' +
                    '<a href="https://cashtab.com/#/token/04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103">040...103</a>: 🧪➡️🔥🔨\n' +
                    '🗻<a href="https://cashtab.com/#/token/116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f">116...33f</a>: 🧪➡️🔥🔨\n' +
                    '🗻<a href="https://cashtab.com/#/token/cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145">cdc...145</a>: ➡️\n' +
                    '<a href="https://cashtab.com/#/token/20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8">20a...6f8</a>: ➡️\n' +
                    '\n' +
                    '🖼 <b><i>2 NFT txs from 2 NFTs in 2 collections</i></b>\n' +
                    '<a href="https://cashtab.com/#/token/8fd3f14abd2b176a1d4bd5136542cd2a7ba3df0e11947dd19326c9d1cd81ae09">8fd...e09</a>: 🧪\n' +
                    '<a href="https://cashtab.com/#/token/78efa5177e99bf05b48948ac7e23e6cc2255764e52ccf7092afb979a766dee2c">78e...e2c</a>: ➡️\n' +
                    '\n' +
                    '🖼 <b><i>1 NFT mint</i></b>\n' +
                    '🔨 <b><i>2 new variable-supply tokens</i></b>\n' +
                    '🧩 <b><i>1 Mint Vault tx</i></b>\n' +
                    '\n' +
                    '📱 <b><i>8 app txs</i></b>\n' +
                    '🖋 <b>1</b> <a href="https://www.ecashchat.com/">Article/Reply tx</a>\n' +
                    '⚛️ <b>1</b> CashFusion\n' +
                    '🛒 <b>1</b> PayButton tx\n' +
                    '🪂 <b>1</b> Airdrop\n' +
                    '✏️ <b>1</b> Cashtab Msg\n' +
                    '💬 <b>1</b> <a href="https://www.ecashchat.com/">eCashChat tx</a>\n' +
                    '🔓 <b>1</b> eCashChat Auth\n' +
                    '💸 <b>1</b> Paywall tx\n' +
                    '\n' +
                    '🏦 <b><i>Binance</i></b>\n' +
                    '<b>1</b> withdrawal, $0.688\n' +
                    '🏦 <b><i>CoinEx</i></b>\n' +
                    '<b>1</b> withdrawal, $15.91k',
            ],
        );
    });
    it('summarizeTxHistory summarizes a collection of txs across multiple blocks without fiat price or staker info', function () {
        const mockUtcNewDayTimestampSeconds = 1728950400;
        assert.deepEqual(
            summarizeTxHistory(
                mockUtcNewDayTimestampSeconds,
                dailyTxs,
                tokenInfoMap,
                10, // show all tested agora tokens
                10, // show all tested non-agora tokens
            ),
            [
                '<b>14 Oct 2024</b>\n' +
                    '📦90,011 blocks\n' +
                    '➡️38 txs\n' +
                    `💧<i>0.00% capacity</i>\n` +
                    '\n' +
                    '<b><i>⛏️3 miners found blocks</i></b>\n' +
                    '<u>Top 3</u>\n' +
                    '1. Mining-Dutch, 1 <i>(0%)</i>\n' +
                    '2. solopool.org, 1 <i>(0%)</i>\n' +
                    '3. ViaBTC, 1 <i>(0%)</i>\n' +
                    '\n' +
                    '<b><i>💰3 stakers earned 938k XEC</i></b>\n' +
                    '<u>Top 3</u>\n' +
                    '1. <a href="https://explorer.e.cash/address/ecash:qzs8hq2pj4hu5j09fdr5uhha3986h2mthvfp7362nu">qzs...2nu</a>, 1 <i>(0%)</i>\n' +
                    '2. <a href="https://explorer.e.cash/address/ecash:qr42c8c04tqndscfrdnl0rzterg0qdaegyjzt8egyg">qr4...gyg</a>, 1 <i>(0%)</i>\n' +
                    '3. <a href="https://explorer.e.cash/address/ecash:qqvhatumna957qu0je78dnc9pc7c7hu89crkq6k0cd">qqv...0cd</a>, 1 <i>(0%)</i>\n' +
                    '\n' +
                    '<a href="https://cashtab.com/">Cashtab</a>\n' +
                    '🎁 <b>1</b> new user received <b>42 XEC</b>\n' +
                    '🎟 <b>1</b> <a href="https://cashtab.com/#/token/aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1">CACHET</a> reward\n' +
                    '\n' +
                    '🏛🪙 <b><i>7 Agora token txs from 4 tokens</i></b>\n' +
                    '🔊 <b><i>120 XEC</i></b>\n' +
                    '💰Buy, 🏷List, ❌Cancel\n' +
                    '🗻<a href="https://cashtab.com/#/token/116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f">Tiberium</a> (TB): 💰x2 (110 XEC)🏷❌\n' +
                    '<a href="https://cashtab.com/#/token/aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1">Cachet</a> (CACHET): 💰 (10 XEC)\n' +
                    '<a href="https://cashtab.com/#/token/20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8">Vespene Gas</a> (VSP): ❌\n' +
                    '<a href="https://cashtab.com/#/token/01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896">Bull</a> (BULL): 🏷\n' +
                    '\n🏛🖼 <b><i>3 Agora NFT txs from 2 NFTs in 2 collections</i></b>\n' +
                    '🔊 <b><i>13k XEC</i></b>\n' +
                    '<a href="https://cashtab.com/#/token/78efa5177e99bf05b48948ac7e23e6cc2255764e52ccf7092afb979a766dee2c">xolosArmyPOP</a> (RMZPOP): 💰 (13k XEC)\n' +
                    '<a href="https://cashtab.com/#/token/0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316">Flags</a> (FLAGS): 🏷❌\n' +
                    '\n' +
                    '🪙 <b><i>16 token txs from 4 tokens</i></b>\n' +
                    '<a href="https://cashtab.com/#/token/04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103">Perpetua</a> (PRP): 🧪➡️🔥🔨\n' +
                    '🗻<a href="https://cashtab.com/#/token/116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f">Tiberium</a> (TB): 🧪➡️🔥🔨\n' +
                    '🗻<a href="https://cashtab.com/#/token/cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145">Credo In Unum Deo</a> (CRD): ➡️\n' +
                    '<a href="https://cashtab.com/#/token/20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8">Vespene Gas</a> (VSP): ➡️\n' +
                    '\n' +
                    '🖼 <b><i>2 NFT txs from 2 NFTs in 2 collections</i></b>\n' +
                    '<a href="https://cashtab.com/#/token/8fd3f14abd2b176a1d4bd5136542cd2a7ba3df0e11947dd19326c9d1cd81ae09">Xoloitzcuintli NFT Cigar Collection.</a> (RMZsmoke): 🧪\n' +
                    '<a href="https://cashtab.com/#/token/78efa5177e99bf05b48948ac7e23e6cc2255764e52ccf7092afb979a766dee2c">xolosArmyPOP</a> (RMZPOP): ➡️\n' +
                    '\n' +
                    '🖼 <b><i>1 NFT mint</i></b>\n' +
                    '🔨 <b><i>2 new variable-supply tokens</i></b>\n' +
                    '🧩 <b><i>1 Mint Vault tx</i></b>\n' +
                    '\n' +
                    '📱 <b><i>8 app txs</i></b>\n' +
                    '🖋 <b>1</b> <a href="https://www.ecashchat.com/">Article/Reply tx</a>\n' +
                    '⚛️ <b>1</b> CashFusion\n' +
                    '🛒 <b>1</b> PayButton tx\n' +
                    '🪂 <b>1</b> Airdrop\n' +
                    '✏️ <b>1</b> Cashtab Msg\n' +
                    '💬 <b>1</b> <a href="https://www.ecashchat.com/">eCashChat tx</a>\n' +
                    '🔓 <b>1</b> eCashChat Auth\n' +
                    '💸 <b>1</b> Paywall tx\n' +
                    '\n' +
                    '🏦 <b><i>Binance</i></b>\n' +
                    '<b>1</b> withdrawal, 20k XEC\n' +
                    '🏦 <b><i>CoinEx</i></b>\n' +
                    '<b>1</b> withdrawal, 456M XEC',
            ],
        );
    });
});
