// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const { returnChronikTokenInfoPromise } = require('./utils');

module.exports = {
    getTokenInfoMap: async function (chronik, tokenIdSet) {
        let tokenInfoMap = new Map();
        const tokenInfoPromises = [];
        tokenIdSet.forEach(tokenId => {
            tokenInfoPromises.push(
                returnChronikTokenInfoPromise(chronik, tokenId, tokenInfoMap),
            );
        });

        try {
            await Promise.all(tokenInfoPromises);
        } catch (err) {
            console.log(`Error in await Promise.all(tokenInfoPromises)`, err);
            console.log(`tokenIdSet`, tokenIdSet);
            return false;
        }
        return tokenInfoMap;
    },
};
