// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/* generateMocks.js
 *
 * npm run generateMocks
 * - generate a timestamped mock blocks file in test/mocks/generated/
 *
 * npm run generateMocks true
 * Overwrite test/mocks/blocks.js, used by unit tests
 */

'use strict';
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { ChronikClient } = require('chronik-client');
const chronik = new ChronikClient(config.chronik);
const { handleBlockConnected } = require('../src/events');
const { jsonReplacer } = require('../src/utils');
const unrevivedBlocks = require('../test/mocks/blocks');
const { jsonReviver } = require('../src/utils');
const savedBlocks = JSON.parse(JSON.stringify(unrevivedBlocks), jsonReviver);
// Mock all price API calls
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const { MockChronikClient } = require('../test/mocks/chronikMock');
const cashaddr = require('ecashaddrjs');
// Look for specified flag variable
let overwriteMocks = false;
if (process.argv && typeof process.argv[2] !== 'undefined') {
    // user input if available
    overwriteMocks = process.argv[2] === 'true';
}

// Mock telegram bot
const {
    MockTelegramBot,
    mockChannelId,
} = require('../test/mocks/telegramBotMock');
const telegramBot = new MockTelegramBot();

// Define array of blockhashes of blocks you want to get blockDetails for
const mocksToGenerate = [
    // genesis block
    {
        blockhash:
            '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
        blockname: 'genesisBlock',
    },
    // block with BUX txs
    {
        blockhash:
            '000000000000000003a43161c1d963b1df57f639a4621f56d3dbf69d5a8d0561',
        blockname: 'buxTxs',
    },
    // block with multiple Cashtab Msgs
    {
        blockhash:
            '00000000000000000609f6bcbbf5169ae25142ad7f119b541adad5789faa28e4',
        blockname: 'cashtabMsgMulti',
    },
    // block with a Cash Fusion tx
    {
        blockhash:
            '000000000000000000ecda3dc336cd44ddf32eac28cebdee3c4a0abda75471e0',
        blockname: 'fusion',
    },
];

function returnHandleBlockConnectedPromise(
    chronik,
    telegramBot,
    channelId,
    blockHash,
    returnMocks = false,
    blockName,
) {
    return new Promise((resolve, reject) => {
        handleBlockConnected(
            chronik,
            telegramBot,
            channelId,
            blockHash,
            returnMocks,
        ).then(
            result => {
                result.blockName = blockName;
                resolve(result);
            },
            err => {
                reject(err);
            },
        );
    });
}

/**
 *
 * @param {bool} overwriteMocks If true, overwrites test/mocks/blocks.js with output of this script
 * @param {array} savedBlocks Array of mocks currently stored by the app, i.e. in blocks.js,
 *                            revived so that objects are not stored in JSON
 * @param {array} mocksToGenerate Array of blocks to generate mocks for, [{blockhash, blockname}...]
 */
async function generateMocks(overwriteMocks, savedBlocks, mocksToGenerate) {
    let mocksDir, mocksFileName;
    if (overwriteMocks) {
        console.log(`Overwriting existing blocks.js mock`);
        // Directory for mocks. Relative to /scripts, ../test/mocks/
        mocksDir = path.join(__dirname, '..', 'test', 'mocks');
        mocksFileName = `blocks.js`;
    } else {
        // Directory for mocks. Relative to /scripts, ../test/mocks/generated/
        mocksDir = path.join(__dirname, '..', 'test', 'mocks', 'generated');
        mocksFileName = `blocks_${Date.now()}.json`;
    }

    // Create directory if it does not exist
    if (!fs.existsSync(mocksDir)) {
        fs.mkdirSync(mocksDir);
    }

    // Iterate over blockhashArray making an array of promises for getting block details
    const handleBlockConnectedPromises = [];
    for (let i = 0; i < mocksToGenerate.length; i += 1) {
        // If you already have mocks saved for this block, then call handleBlockConnected with mocks
        const thisBlock = mocksToGenerate[i];
        const { blockhash, blockname } = thisBlock;
        // If this blockhash exists in savedBlocks, call with mocks
        const thisSavedBlock = savedBlocks.filter(
            savedBlocks =>
                savedBlocks.blockDetails.blockInfo.hash === blockhash,
        );
        let chronikUsedInPromise = chronik;
        if (thisSavedBlock.length > 0) {
            // Prep your mocks
            // Initialize new chronik mock for each block
            const mockedChronik = new MockChronikClient();

            // Tell mockedChronik what response we expect for chronik.script(type, hash).utxos
            const {
                blockDetails,
                outputScriptInfoMap,
                parsedBlock,
                tokenInfoMap,
                coingeckoResponse,
            } = thisSavedBlock[0];
            outputScriptInfoMap.forEach((info, outputScript) => {
                let { type, hash } =
                    cashaddr.getTypeAndHashFromOutputScript(outputScript);
                type = type.toLowerCase();
                const { utxos } = info;
                mockedChronik.setScript(type, hash);
                mockedChronik.setUtxos(type, hash, utxos);
            });

            // Tell mockedChronik what response we expect for chronik.block(thisBlockHash)
            mockedChronik.setMock('block', {
                input: blockhash,
                output: blockDetails,
            });

            // Tell mockedChronik what response we expect for chronik.tx
            const { tokenIds } = parsedBlock;
            // Will only have chronik call if the set is not empty
            if (tokenIds.size > 0) {
                // Instead of saving all the chronik responses as mocks, which would be very large
                // Just set them as mocks based on tokenInfoMap, which contains the info we need
                tokenIds.forEach(tokenId => {
                    mockedChronik.setMock('tx', {
                        input: tokenId,
                        output: {
                            slpTxData: {
                                genesisInfo: tokenInfoMap.get(tokenId),
                            },
                        },
                    });
                });
            }

            // Mock coingecko price response
            // onNoMatch: 'throwException' helps to debug if mock is not being used
            const mock = new MockAdapter(axios, {
                onNoMatch: 'throwException',
            });

            // Mock a successful API request
            mock.onGet().reply(200, coingeckoResponse);

            chronikUsedInPromise = mockedChronik;
        }
        handleBlockConnectedPromises.push(
            returnHandleBlockConnectedPromise(
                chronikUsedInPromise,
                telegramBot,
                mockChannelId,
                blockhash,
                true,
                blockname,
            ),
        );
    }

    let blocksMock;
    try {
        blocksMock = await Promise.all(handleBlockConnectedPromises);
    } catch (err) {
        console.log(
            `Error in Promise.all(handleBlockConnectedPromisesResponse)`,
            err,
        );
    }

    let mocksWrite;
    // We want this string to appear in the generated blocks.js file,
    // but not in this file, as we want this file to show up in phab diffs
    let phabGeneratedString = '@';
    phabGeneratedString += 'generated';
    if (overwriteMocks) {
        mocksWrite = `// Copyright (c) 2023 The Bitcoin developers\n// Distributed under the MIT software license, see the accompanying\n// file COPYING or http://www.opensource.org/licenses/mit-license.php.\n// ${phabGeneratedString} \n\n'use strict'\n\nmodule.exports=${JSON.stringify(
            blocksMock,
            jsonReplacer,
            2,
        )}`;
    } else {
        mocksWrite = JSON.stringify(blocksMock, jsonReplacer, 2);
    }

    fs.writeFileSync(`${mocksDir}/${mocksFileName}`, mocksWrite, 'utf-8');
}

generateMocks(overwriteMocks, savedBlocks, mocksToGenerate);
