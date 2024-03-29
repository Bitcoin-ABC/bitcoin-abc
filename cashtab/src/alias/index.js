// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import aliasSettings from 'config/alias';

/**
 * Queries the alias-server for alias related data via Fetch
 *
 * @param {string} endPoint the alias-server endpoint for this query
 * @param {string} aliasParam a param to be passed to the endPoint
 * @returns {JSON} a JSON response from alias-server via Fetch
 * @throws {error} err server fetch errors from alias-server
 *
 * Example `/address/<address>` response
 *   [
 *       {alias: 'foo', address: 'ecash:qpmyt....', txid: 'ec927447...', blockheight: '792417'},
 *       {alias: 'foo2', address: 'ecash:qpmyt....', txid: 'ec927447...', blockheight: '792417'},
 *   ]
 * Example `/alias/<alias>` response for a registered alias:
 *   {
 *        alias: 'twelvechar12',
 *        address:'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
 *        txid:'166b21d4631e2a6ec6110061f351c9c3bfb3a8d4e6919684df7e2824b42b0ffe',
 *        blockheight:792419,
 *   }
 * Example `/alias/<alias>` response for an unregistered alias:
 *  {
 *        alias: 'asdfasdf',
 *        isRegistered: false,
 *        registrationFeeSats: 551,
 *        processedBlockheight: 802965,
 *  }
 */
export const queryAliasServer = async (endPoint, aliasParam = false) => {
    let aliasServerResp;
    const fetchUrl = !aliasParam
        ? `${aliasSettings.aliasServerBaseUrl}/${endPoint}`
        : `${aliasSettings.aliasServerBaseUrl}/${endPoint}/${aliasParam}`;
    try {
        aliasServerResp = await fetch(fetchUrl);
        // if alias-server is down, fetch returns undefined
        if (!aliasServerResp) {
            throw new Error('Network request failed');
        }
        // if alias-server returns a valid error message to the query e.g. address not found
        if (aliasServerResp.error) {
            throw new Error(aliasServerResp.error);
        }
        return await aliasServerResp.json();
    } catch (err) {
        console.error(
            `queryAliasServer(): Error retrieving alias data from alias-server`,
            err,
        );
        console.error(
            `/${endPoint}/ endpoint output: ${JSON.stringify(aliasServerResp)}`,
        );
        throw err;
    }
};
