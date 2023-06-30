// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const ecashaddr = require('ecashaddrjs');

/**
 *  Returns UTXOs (both XEC and eToken) corresponding to a given address
 *
 *  @param {object} Chronik client instance
 *  @param {string} eCash address
 *  @returns {object} utxo JSON response from chronik
 *  @throws {error} on chronik error
 *  @usage:
 *      const { ChronikClient } = require('chronik-client');
 *      const chronik = new ChronikClient('https://chronik.fabien.cash');
 *      const utxos = await getUtxosFromAddress(
 *          chronik,
 *          'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
 *      );
 */
async function getUtxosFromAddress(chronik, address) {
    // decode address for hash160 key
    const { type, hash } = ecashaddr.decode(address, true); // true flag returns hash in chronik-friendly format

    // retrieve utxos for this address
    // note: chronik.script().utxos() returns:
    //    a) an empty array if there are no utxos at the address; or
    //    b) an array of one object with the key 'utxos' if there are utxos
    const utxos = await chronik.script(type, hash).utxos();

    return utxos;
}

// Executed via 'npm run getUtxosFromAddress <address>'
(async () => {
    // extract args provided at CLI
    const argsFromCli = process.argv.slice(2);
    const address = argsFromCli[0];

    // instantiate chronik-client
    const { ChronikClient } = require('chronik-client');
    const chronik = new ChronikClient('https://chronik.fabien.cash');

    const utxos = await getUtxosFromAddress(chronik, address);

    console.log(JSON.stringify(utxos, null, 2));
})();

module.exports.getUtxosFromAddress = getUtxosFromAddress;
