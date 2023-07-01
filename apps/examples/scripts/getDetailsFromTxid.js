// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';

/*
  Returns transaction details corresponding to a given transaction ID
  
  @param {object} Chronik client instance
  @param {string} Transaction ID
  @return {object} tx JSON response from chronik
  @throws {error} on chronik error
  @usage:
      const { ChronikClient } = require('chronik-client');
      const chronik = new ChronikClient('https://chronik.fabien.cash');
      const txDetails = await getDetailsFromTxid(chronik, 'fd9a775...fce0e');
*/
async function getDetailsFromTxid(chronik, txid) {
    const txDetails = await chronik.tx(txid);
    return txDetails;
}

// Executed via 'npm run getDetailsFromTxid <txid>'
(async () => {
    // extract args provided at CLI
    const argsFromCli = process.argv.slice(2);
    const txid = argsFromCli[0];

    // instantiate chronik-client
    const { ChronikClient } = require('chronik-client');
    const chronik = new ChronikClient('https://chronik.fabien.cash');

    const txidDetails = await getDetailsFromTxid(chronik, txid);

    console.log(txidDetails);
})();

module.exports.getDetailsFromTxid = getDetailsFromTxid;
