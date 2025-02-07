// Copyright (c) 2023-2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import config from '../config';
import fs from 'fs';
import path from 'path';
import { ChronikClient, ScriptUtxo, TokenInfo, Tx } from 'chronik-client';
import { MockChronikClient } from '../../../modules/mock-chronik-client';
import { jsonReplacer, getCoingeckoApiUrl } from '../src/utils';
import unrevivedBlockMocks from '../test/mocks/block';
import { jsonReviver } from '../src/utils';
import { handleBlockFinalized, StoredMock } from '../src/events';
import { parseBlockTxs } from '../src/parse';
import { sendBlockSummary } from '../src/telegram';
import { getTypeAndHashFromOutputScript } from 'ecashaddrjs';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { caching } from 'cache-manager';
import { MockTelegramBot } from '../test/mocks/telegramBotMock';
import secrets from '../secrets';
import TelegramBot from 'node-telegram-bot-api';
import mockStakers from '../test/mocks/stakers';

const mockedChronik = new MockChronikClient();
const chronik = new ChronikClient(config.chronik);
const mockedTelegramBot = new MockTelegramBot();
const { dev } = secrets;
const { botId, channelId } = dev.telegram;

const blockMocks = JSON.parse(JSON.stringify(unrevivedBlockMocks), jsonReviver);

// Initialize telegram bot to send msgs to dev channel
const telegramBotDev = new TelegramBot(botId, { polling: true });

/**
 * generateMock
 *
 * This script takes an array of txids and builds a fake block with them
 * In this way we can still use ecash-herald's block-parsing functionality
 * while showcasing all of its features, without needing to duplicate txids
 * that are already tested
 */

const MOCK_HASH =
    '0000000000000000000000000000000000000000000000000000000000000000';
const MOCK_HEIGHT = 819346;

// Test vectors
// Add txids to this array related to new features as new diffs are added
const txids = [
    // Coinbase tx
    '0bf6e9cd974cd5fc6fbbf739a42447d41a301890e2db242295c64df63dc3ee7e', // Coinbase tx with staking rwds

    // eToken mint tx
    '010114b9bbe776def1a512ad1e96a4a06ec4c34fc79bcb5d908845f5102f6b0f', // etoken genesis txs

    // Cashtab CACHET rewards
    '004e018dd98520aa722ee76c608771dd578a044f38103a8298f25e6ffbc7c3ba',
    '0110cd886ecd2d9570e98b7501cd039f4e5352d69659a46f1a49cc19c1869701',
    '327101f6f3b740280a6e9fbd8edc41f4f0500633672975a5974a4147c94016a5',

    // Cashtab CACHET send tx that is not a Cashtab Reward
    'aa13c6f214ff58f36ed5e108a7f36d8f98729c50186b27a53b989c7f36fbf517',

    // Cashtab XEC rewards
    'd8fe456c89357c23ac6d240fe9319ce9ba393c9c3833631046a265ca7c8349e6',
    '083b7862bae48e78549ccf63833896f5f4f5bdef5c380a108fa99cdb64261fa3',

    // eToken send txs
    '6ffcc83e76226bd32821cc6862ce9b363b22594247a4e73ccf3701b0023592b2', // etoken send tx, 0 decimals
    'fb70df00c07749082756054522d3f08691fd9caccd0e0abf736df23d22845a6e', // etoken send tx, 7 decimals
    '25345b0bf921a2a9080c647768ba440bbe84499f4c7773fba8a1b03e88ae7fe7', // etoken send locale string formatting
    '0167e881fcb359cdfc82af5fc6c0821daf55f40767694eea2f23c0d42a9b1c17', // etoken self-send tx, BUX

    // ALP send txs
    'b2c9c056339d41ec59341541dda8bd6e570730beba485e14eb54d0a073700c22', // etoken send tx, CRD
    '45ec66bc2440d2f94fa2c645e20a44f6fab7c397053ce77a95484c6053104cdc', // EMPP SLPv2 send
    '413b57617d2c497b137d31c53151fee595415ec273ef7a111160da8093147ed8', // EMPP SLPv2 mint

    // eToken burn tx
    '6b139007a0649f99a1a099c7c924716ee1920f74ea83111f6426854d4c3c3c79', // etoken burn tx

    // App txs
    'd5be7a4b483f9fdbbe3bf46cfafdd0100d5dbeee0b972f4dabc8ae9d9962fa55', // Cash fusion tx
    'd02d94a1a520877c60d1e3026c3e85f8995d48d7b90140f83e24ede592c30306', // Cashtab msg
    '1083da7ead4779fbab5c5e8291bb7a37abaf4f97f5ff99ee654759b2eaee445b', // Encrypted cashtab msg
    'ad44bf5e214ab71bb60a2eee165f368c139cd49c2380c3352f0a4fffc746b36a', // SWaP SLP Atomic Swap Signal
    'a8c348539a1470b28b9f99693994b918b475634352994dddce80ad544e871b3a', // memo | reply to memo
    '7a0d6ae3384e293183478f681f51a77ef4c71f29957199364bb9ba4d8e1938be', // Airdrop
    '22135bb69435023a84c80b1b93b31fc8898c3507eaa70569ed038f32d59599a9', // alias beta
    '9094e1aab7ac73c680bf66e78cc8311831b3d813e608bff1e07b1854855fc0f1', // Unknown app tx, parsable
    'b5782d3a3b55e5ee9e4330a969c2891042ae05fafab7dc05cd14da63e7242f8e', // Unknown app tx, likely hex

    // XEC send txs
    '4f33c81d95641eb0f80e793dc96c58a2438f9bb1f18750d8fb3b56c28cd25035', // 🐋, Address in directory, self-send XEC tx
    'f5d4c112cfd22701226ba050cacfacc3aff570964c6196f67e326fc3224300a2', // 🦀 recipient
];

async function generateMock(
    chronik: ChronikClient,
    mockedChronik: MockChronikClient,
    telegramBot: TelegramBot,
    mockedTelegramBot: MockTelegramBot,
    channelId: string,
    block: StoredMock,
    txids: string[],
) {
    const { outputScriptInfoMap, tokenInfoMap, coingeckoResponse } = block;
    // Get txids from your saved block
    const savedTxids = block.blockTxs.map(tx => {
        return tx.txid;
    });

    // Determine which, if any, txids need to be added to savedBlock
    const newTxids: string[] = [];
    for (const i in txids) {
        if (!savedTxids.includes(txids[i])) {
            newTxids.push(txids[i]);
        }
    }

    // Build array of promises to get txid info from chronik
    const chronikTxidPromises = [];
    for (const i in newTxids) {
        chronikTxidPromises.push(
            new Promise<Tx>((resolve, reject) => {
                chronik.tx(newTxids[i]).then(
                    result => {
                        resolve(result as Tx);
                    },
                    err => {
                        reject(err);
                    },
                );
            }),
        );
    }
    let newChronikTxs: Tx[];
    try {
        newChronikTxs = await Promise.all(chronikTxidPromises);
    } catch (err) {
        console.log(
            '\x1b[31m%s\x1b[0m',
            `Error in Promise.all(chronikTxidPromises)`,
            err,
        );
        // Exit in error condition
        process.exit(1);
    }
    // Add these new chronik tx objects to the txs: key of your savedBlock
    const blockTxs = block.blockTxs.concat(newChronikTxs);

    // Mock chronik response for chronik.blockTxs
    mockedChronik.setTxHistoryByBlock(MOCK_HEIGHT, blockTxs);

    // Get parsedBlock
    const parsedBlock = parseBlockTxs(MOCK_HASH, MOCK_HEIGHT, blockTxs);

    // Tell mockedChronik what response we expect for chronik.tx
    const { tokenIds, outputScripts } = parsedBlock;

    // Instead of saving all the chronik responses as mocks, which would be very large
    // Just set them as mocks based on tokenInfoMap, which contains the info we need
    tokenIds.forEach(tokenId => {
        mockedChronik.setToken(tokenId, {
            genesisInfo: tokenInfoMap.has(tokenId)
                ? tokenInfoMap.get(tokenId)
                : {
                      tokenTicker: 'STUB',
                      tokenName: 'Placeholder Token Name',
                      decimals: 0,
                  },
        } as TokenInfo);
    });

    outputScripts.forEach(outputScript => {
        const { type, hash } = getTypeAndHashFromOutputScript(outputScript);

        const outputScriptInfo = outputScriptInfoMap.get(outputScript);
        if (typeof outputScriptInfo !== 'undefined') {
            const { utxos } = outputScriptInfo;
            mockedChronik.setUtxosByScript(
                type as 'p2pkh' | 'p2sh',
                hash,
                utxos,
            );
        } else {
            // If you don't have a mock for this particular outputScript in block.js,
            // mock it as an address with a single utxo for 100 XEC
            mockedChronik.setUtxosByScript(type as 'p2pkh' | 'p2sh', hash, [
                { sats: 10000n } as ScriptUtxo,
            ]);
        }
    });

    // Mock coingecko price response
    // onNoMatch: 'throwException' helps to debug if mock is not being used
    const mock = new MockAdapter(axios, {
        onNoMatch: 'throwException',
    });

    // Mock a successful API request
    mock.onGet(getCoingeckoApiUrl(config)).reply(200, coingeckoResponse);

    // Mock successful staker info request
    mock.onGet(
        `https://coin.dance/api/stakers/${secrets.prod.stakerApiKey}`,
    ).reply(200, mockStakers);

    // Generate app mocks using this block
    // TODO need to mock all the calls here
    // so need to manually build outputscriptinfomap, tokeninfomap
    const CACHE_TTL = 2 * config.cacheTtlMsecs;
    const memoryCache = await caching('memory', {
        max: 100,
        ttl: CACHE_TTL,
    });
    const returnedMocks = (await handleBlockFinalized(
        mockedChronik as unknown as ChronikClient,
        mockedTelegramBot,
        channelId,
        MOCK_HASH,
        MOCK_HEIGHT,
        memoryCache,
        true,
    )) as StoredMock;

    // Save it to a file
    // Directory for mocks. Relative to /scripts, ../test/mocks/generated/
    //const mocksDir = path.join(__dirname, '..', 'test', 'mocks', 'generated');
    //const mocksFileName = `uber_block_${Date.now()}.json`;

    const mocksDir = path.join(__dirname, '..', 'test', 'mocks');
    const mocksFileName = 'block.ts';

    // Create directory if it does not exist
    if (!fs.existsSync(mocksDir)) {
        fs.mkdirSync(mocksDir);
    }
    // We want this string to appear in the generated blocks.js file,
    // but not in this file, as we want this file to show up in phab diffs

    const mocksWrite = `// Copyright (c) 2023-2025 The Bitcoin developers\n// Distributed under the MIT software license, see the accompanying\n// file COPYING or http://www.opensource.org/licenses/mit-license.php.\n\n// eslint-disable-next-line @typescript-eslint/no-explicit-any\nconst mockedBlock: any =${JSON.stringify(
        returnedMocks,
        jsonReplacer,
        2,
    )};\n\nexport default mockedBlock;\n`;

    fs.writeFileSync(`${mocksDir}/${mocksFileName}`, mocksWrite, 'utf-8');

    // Send msg(s) to Telegram

    const { blockSummaryTgMsgs, blockSummaryTgMsgsApiFailure } = returnedMocks;

    // Send msg with successful price API call
    await sendBlockSummary(blockSummaryTgMsgs, telegramBot, channelId);

    // Send msg with failed price API call
    await sendBlockSummary(
        blockSummaryTgMsgsApiFailure,
        telegramBot,
        channelId,
    );

    console.log(
        '\x1b[32m%s\x1b[0m',
        `✔ Built mocks and sent msgs for ecash-herald mock block.`,
    );

    process.exit(0);
}

generateMock(
    chronik,
    mockedChronik,
    telegramBotDev,
    mockedTelegramBot,
    channelId,
    blockMocks,
    txids,
);
