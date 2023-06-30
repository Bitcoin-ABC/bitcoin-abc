// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';

/*
  Returns genesis info and stats corresponding to a given eToken ID
  
  @param {object} Chronik client instance
  @param {string} eToken ID
  @returns {object} slpTxData and tokenStats JSON response from chronik
  @throws {error} on chronik error
  @usage:
      const { ChronikClient } = require('chronik-client');
      const chronik = new ChronikClient('https://chronik.fabien.cash');
      const tokenInfo = await getTokenDetails(chronik, 'fd9a775...fce0e');
*/
async function getTokenDetails(chronik, tokenId) {
    const tokenDetails = await chronik.token(tokenId);
    return tokenDetails;
}

// Executed via 'npm run getTokenDetails <token id>'
(async () => {
    // extract args provided at CLI
    const argsFromCli = process.argv.slice(2);
    const tokenId = argsFromCli[0];

    // instantiate chronik-client
    const { ChronikClient } = require('chronik-client');
    const chronik = new ChronikClient('https://chronik.fabien.cash');

    const tokenDetails = await getTokenDetails(chronik, tokenId);
    console.log(JSON.stringify(tokenDetails, null, 2));
})();

module.exports.getTokenDetails = getTokenDetails;
