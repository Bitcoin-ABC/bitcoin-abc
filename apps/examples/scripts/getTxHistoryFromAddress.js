// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const ecashaddr = require('ecashaddrjs');

/*
  Returns transaction history corresponding to a given address
  
  @param {object} Chronik client instance
  @param {string} eCash address
  @param {number} tx history page index
  @param {number} number of txs per page
  @return {object} tx history JSON response from chronik
  @throws {error} on chronik error
  @usage:
      const { ChronikClient } = require('chronik-client');
      const chronik = new ChronikClient('https://chronik.fabien.cash');
      const txHistory = await getTxHistoryFromAddress(
          chronik,
          'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
          0,
          10,
      );
*/
async function getTxHistoryFromAddress(chronik, address, page, pageSize) {
    // decode address for hash160 key
    const decodedAddress = ecashaddr.decode(address, true); // true flag returns hash in chronik friendly format
    const hash160 = decodedAddress.hash;

    // retrieve tx history for this address
    const txHistory = await chronik
        .script('p2pkh', hash160)
        .history(page, pageSize);

    return txHistory;
}

// Executed via 'npm run getTxHistoryFromAddress <chronik url> <address> <page> <pageSize>'
(async () => {
    // extract args provided at CLI
    const argsFromCli = process.argv.slice(2);
    const address = argsFromCli[0];
    const page = argsFromCli[1];
    const pageSize = argsFromCli[2];

    // instantiate chronik-client
    const { ChronikClient } = require('chronik-client');
    const chronik = new ChronikClient('https://chronik.fabien.cash');

    const txHistory = await getTxHistoryFromAddress(
        chronik,
        address,
        page,
        pageSize,
    );

    console.log(txHistory);
})();

module.exports.getTxHistoryFromAddress = getTxHistoryFromAddress;
