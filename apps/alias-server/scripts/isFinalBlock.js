// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/* 
Make the isFinalBlock rpc call to determine if a block has been finalized by avalanche

Usage

Call from the command line in the top level directory of alias-server with
"npm run isFinalBlock"

To specify a particular blockhash, add this to the end of the command, e.g.
"npm run isFinalBlock 00000000000000000753144f1e8d9f02bd7539543d73dc9fd45355de5b99f504"
*/

'use strict';
const { isFinalBlock } = require('../src/rpc');
const secrets = require('../secrets');
const { avalancheRpc } = secrets;

let blockhash;
if (process.argv.length < 3) {
    // default
    blockhash =
        '00000000000000000d92510871d9677ea0cb8341f06e8fae9a5e0c365ce81fa6';
} else {
    // user input if available
    // e.g.
    // npm run rpc 00000000000000000753144f1e8d9f02bd7539543d73dc9fd45355de5b99f504
    // ✔ Block 00000000000000000753144f1e8d9f02bd7539543d73dc9fd45355de5b99f504 has been finalized by avalanche
    blockhash = process.argv[2];
}

// Wrapper function to provide good console feedback of alias-server function "isFinalBlock"
async function getIsFinalBlock(avalancheRpc, blockhash) {
    // isFinalBlock is currently the only supported RPC call
    let finalizedByAvalanche = await isFinalBlock(avalancheRpc, blockhash);
    if (finalizedByAvalanche) {
        console.log(
            '\x1b[32m%s\x1b[0m',
            `✔ Block ${blockhash} has been finalized by avalanche`,
        );
        process.exit(0);
    } else {
        console.log(
            '\x1b[31m%s\x1b[0m',
            `Block ${blockhash} has NOT been finalized by avalanche`,
        );
        process.exit(1);
    }
}

getIsFinalBlock(avalancheRpc, blockhash);
