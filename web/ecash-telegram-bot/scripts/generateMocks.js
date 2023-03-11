const fs = require('fs');
const path = require('path');
const config = require('../config');
const { ChronikClient } = require('chronik-client');
const chronik = new ChronikClient(config.chronik);
const { returnLabeledChronikBlockPromise } = require('../utils');
const { parseBlock, getBlockTgMessage } = require('../parse');

async function generateMocks() {
    // Directory for mocks. Relative to /scripts, ../test/mocks/generated/
    const mocksDir = path.join(__dirname, '..', 'test', 'mocks', 'generated');

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
    ];

    // Iterate over blockhashArray making an array of promises for getting block details
    const blockDetailsPromises = [];
    for (let i = 0; i < blockArray.length; i += 1) {
        const thisBlock = blockArray[i];
        const { blockhash, blockname } = thisBlock;
        blockDetailsPromises.push(
            returnLabeledChronikBlockPromise(chronik, blockhash, blockname),
        );
    }
    let blockDetails;
    try {
        blockDetails = await Promise.all(blockDetailsPromises);
    } catch (err) {
        log(`Error determining blockDetails in generateMocks()`, err);
    }

    // Convert blockDetails array of objects to one object
    const blocksMock = {};
    for (let i = 0; i < blockDetails.length; i += 1) {
        const thisBlock = blockDetails[i];
        const { blockname, result } = thisBlock;
        blocksMock[blockname] = { chronikData: result };
    }

    // Add parsed block results to blocksMock
    const blockNames = Object.keys(blocksMock);
    for (let i = 0; i < blockNames.length; i += 1) {
        const thisBlockName = blockNames[i];
        blocksMock[thisBlockName].parsed = parseBlock(
            blocksMock[thisBlockName].chronikData,
        );
        blocksMock[thisBlockName].tgHtml = getBlockTgMessage(
            blocksMock[thisBlockName].parsed,
        );
    }

    fs.writeFileSync(
        `${mocksDir}/blocks_${Date.now()}.json`,
        JSON.stringify(blocksMock, null, 2),
        'utf-8',
    );
}

generateMocks();
