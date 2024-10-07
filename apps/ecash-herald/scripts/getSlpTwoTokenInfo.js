// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

// Initialize chronik
const config = require('../config');
const { ChronikClient } = require('chronik-client');
const chronik = new ChronikClient(config.chronik);

const { consume, consumeNextPush, swapEndianness } = require('ecash-script');
const opReturn = require('../constants/op_return');

// Default to the commonly seen slp2 token
let tokenId =
    'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145';

// Look for blockheight specified from command line
if (process.argv && typeof process.argv[2] !== 'undefined') {
    // user input if available, commas removed
    tokenId = process.argv[2];
}

const getSlpTwoTokenInfo = async (chronik, tokenId) => {
    let txInfo;
    try {
        txInfo = await chronik.tx(tokenId);
    } catch (err) {
        console.log(
            '\x1b[31m%s\x1b[0m',
            `Error in chronik.tx(${tokenId})`,
            err,
        );
        // Exit in error condition
        process.exit(1);
    }
    // Because slp 2 tokens are not yet indexed, you will need to parse the EMPP OP_RETURN
    const { outputs } = txInfo;
    for (let i = 0; i < outputs.length; i += 1) {
        // For now, assume the first OP_RETURN field you find is what you are looking for
        // This is a manual script and does not need to handle edge cases like multiple OP_RETURNS in an slp2 genesis tx
        const { outputScript } = outputs[i];
        const testString = `${opReturn.opReturnPrefix}${opReturn.opReserved}`;
        let stack;
        if (outputScript.startsWith(testString)) {
            const emppPush = consumeNextPush({
                remainingHex: outputScript.slice(testString.length),
            }).data;
            stack = { remainingHex: emppPush };
        } else {
            // If this is not the outputScript you are looking for
            // keep looking
            continue;
        }
        // Parse for slp 2 genesis, per spec at
        // https://ecashbuilders.notion.site/SLPv2-a862a4130877448387373b9e6a93dd97

        console.log(`stack`, stack);

        const isSlpTwo =
            consume(stack, opReturn.knownApps.slp2.prefix.length / 2) ===
            opReturn.knownApps.slp2.prefix;
        if (!isSlpTwo) {
            console.log(
                '\x1b[31m%s\x1b[0m',
                `Error: Protocol identifier is not SLP2`,
            );
            // Exit in error condition
            process.exit(1);
        }
        const tokenType = consume(stack, 1);
        if (tokenType !== '00') {
            console.log('\x1b[31m%s\x1b[0m', `Error: Unknown SLP2 token type`);
            // Exit in error condition
            process.exit(1);
        }
        const txTypeBytes = parseInt(consume(stack, 1), 16);
        const txType = Buffer.from(consume(stack, txTypeBytes), 'hex').toString(
            'utf8',
        );
        if (txType !== 'GENESIS') {
            console.log(
                '\x1b[31m%s\x1b[0m',
                `Error: SLP2 tx is not an SLP2 Genesis tx`,
            );
            // Exit in error condition
            process.exit(1);
        }
        const tickerBytes = parseInt(consume(stack, 1), 16);
        const ticker = Buffer.from(consume(stack, tickerBytes), 'hex').toString(
            'utf8',
        );
        const nameBytes = parseInt(consume(stack, 1), 16);
        const name = Buffer.from(consume(stack, nameBytes), 'hex').toString(
            'utf8',
        );
        const urlBytes = parseInt(consume(stack, 1), 16);
        const url = Buffer.from(consume(stack, urlBytes), 'hex').toString(
            'utf8',
        );
        const dataBytes = parseInt(consume(stack, 1), 16);
        const data = Buffer.from(consume(stack, dataBytes), 'hex').toString(
            'utf8',
        );
        const authPubKeyBytes = parseInt(consume(stack, 1), 16);
        const authPubKey = consume(stack, authPubKeyBytes);

        const decimals = parseInt(consume(stack, 1), 16);
        const numMintAmounts = parseInt(consume(stack, 1), 16);
        let mintAmount = 0;
        for (let i = 0; i < numMintAmounts; i += 1) {
            mintAmount += parseInt(swapEndianness(consume(stack, 6)));
        }
        const numMintBatons = parseInt(consume(stack, 1), 16);

        console.log(`ticker`, ticker);
        console.log(`name`, name);
        console.log(`url`, url);
        console.log(`dataBytes`, dataBytes);
        console.log(`data`, data);
        console.log(`authPubKey`, authPubKey);
        console.log(`decimals`, decimals);
        console.log(`numMintAmounts`, numMintAmounts);
        console.log(`mintAmount`, mintAmount);
        console.log(`numMintBatons`, numMintBatons);
    }
};

getSlpTwoTokenInfo(chronik, tokenId);
