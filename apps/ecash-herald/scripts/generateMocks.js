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

async function generateMocks(overwriteMocks) {
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
    // Define array of blockhashes of blocks you want to get blockDetails for
    const blockArray = [
        // genesis block
        {
            blockhash:
                '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
            blockname: 'genesisBlock',
        },
        // LVV etoken genesis tx
        {
            blockhash:
                '0000000000000000260ee4c3b4f4ddde127bc0105d685c0ef31775b612627222',
            blockname: 'etokenGenesisTx',
        },
        // block with multiple genesis txs
        {
            blockhash:
                '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
            blockname: 'multipleGenesis',
        },
        // block with BUX txs
        {
            blockhash:
                '000000000000000003a43161c1d963b1df57f639a4621f56d3dbf69d5a8d0561',
            blockname: 'buxTxs',
        },
        // block with op_return Cashtab msg
        {
            blockhash:
                '00000000000000000a528f0c4e4b4f214a72d9b34d84003df6150d5a4bcd0d32',
            blockname: 'cashtabMsg',
        },
        // block with Cashtab msgs and genesis tx feature html escape chars
        {
            blockhash:
                '0000000000000000000067d535eccdfaf5397541e948d87aa22e659d8417e497',
            blockname: 'htmlEscapeTest',
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

    // Iterate over blockhashArray making an array of promises for getting block details
    const handleBlockConnectedPromises = [];
    for (let i = 0; i < blockArray.length; i += 1) {
        const thisBlock = blockArray[i];
        const { blockhash, blockname } = thisBlock;
        handleBlockConnectedPromises.push(
            returnHandleBlockConnectedPromise(
                chronik,
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
    if (overwriteMocks) {
        mocksWrite = `// Copyright (c) 2023 The Bitcoin developers\n// Distributed under the MIT software license, see the accompanying\n// file COPYING or http://www.opensource.org/licenses/mit-license.php.\n// @generated\n\n'use strict'\n\nmodule.exports=${JSON.stringify(
            blocksMock,
            jsonReplacer,
            2,
        )}`;
    } else {
        mocksWrite = JSON.stringify(blocksMock, jsonReplacer, 2);
    }

    fs.writeFileSync(`${mocksDir}/${mocksFileName}`, mocksWrite, 'utf-8');
}

generateMocks(overwriteMocks);
