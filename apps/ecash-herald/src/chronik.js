// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const { getEmojiFromBalanceSats } = require('./utils');
const cashaddr = require('ecashaddrjs');

module.exports = {
    getTokenInfoMap: async function (chronik, tokenIdSet) {
        let tokenInfoMap = new Map();
        const tokenInfoPromises = [];
        tokenIdSet.forEach(tokenId => {
            tokenInfoPromises.push(
                new Promise((resolve, reject) => {
                    chronik.tx(tokenId).then(
                        txDetails => {
                            // Note: txDetails.slpTxData.genesisInfo only exists for token genesis txs
                            try {
                                const genesisInfo =
                                    txDetails.slpTxData.genesisInfo;
                                tokenInfoMap.set(tokenId, genesisInfo);
                                resolve(true);
                            } catch (err) {
                                console.log(
                                    `Error getting genesis info for ${tokenId}`,
                                    err,
                                );
                                reject(err);
                            }
                        },
                        err => {
                            reject(err);
                        },
                    );
                }),
            );
        });

        try {
            await Promise.all(tokenInfoPromises);
        } catch (err) {
            console.log(`Error in await Promise.all(tokenInfoPromises)`, err);
            // Print all tokenIds in event of error
            // Note: any 1 promise failing in Promise.all() will hit this
            // catch block
            console.log(`tokenIdSet:`);
            tokenIdSet.forEach(tokenId => {
                console.log(tokenId);
            });
            return false;
        }
        return tokenInfoMap;
    },
    /**
     * Build a reference map of outputScripts and their balance in satoshis
     * @param {object} chronik
     * @param {set} outputScripts
     * @returns {map} addressInfoMap, a map with key = address, value = {balanceSats, emoji, utxos}
     */
    getOutputscriptInfoMap: async function (chronik, outputScripts) {
        let outputScriptInfoMap = new Map();
        const outputScriptInfoPromises = [];

        // For each outputScript, create a promise to get its balance and add
        // info related to this balance to outputScriptInfoMap
        outputScripts.forEach(outputScript => {
            // Decode output script
            const { type, hash } =
                cashaddr.getTypeAndHashFromOutputScript(outputScript);
            outputScriptInfoPromises.push(
                new Promise((resolve, reject) => {
                    chronik
                        .script(type, hash)
                        .utxos()
                        .then(
                            utxos => {
                                // If this address has no utxos, then utxos.length is 0
                                // If this address has utxos, then utxos = [{utxos: []}]
                                const balanceSats =
                                    utxos.length === 0
                                        ? 0
                                        : utxos[0].utxos
                                              .map(utxo => parseInt(utxo.value))
                                              .reduce(
                                                  (prev, curr) => prev + curr,
                                                  0,
                                              );

                                // Set the map outputScript => emoji
                                outputScriptInfoMap.set(outputScript, {
                                    emoji: getEmojiFromBalanceSats(balanceSats),
                                    balanceSats,
                                    utxos,
                                });
                                resolve(true);
                            },
                            err => {
                                reject(err);
                            },
                        );
                }),
            );
        });
        try {
            await Promise.all(outputScriptInfoPromises);
        } catch (err) {
            console.log(
                `Error in await Promise.all(outputScriptInfoPromises)`,
                err,
            );
            // Print all outputScripts in event of error
            // Note: any 1 promise failing in Promise.all() will hit this
            // catch block
            console.log(`outputScripts:`);
            outputScripts.forEach(outputScript => {
                console.log(outputScript);
            });
            return false;
        }
        return outputScriptInfoMap;
    },
};
