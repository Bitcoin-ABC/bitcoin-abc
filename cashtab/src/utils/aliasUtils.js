import { currency } from 'components/Common/Ticker';

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
 * Example `/alias/<alias>` response:
 *     {
 *        alias: 'twelvechar12',
 *        address:'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
 *        txid:'166b21d4631e2a6ec6110061f351c9c3bfb3a8d4e6919684df7e2824b42b0ffe',
 *        blockheight:792419,
 *        isRegistered:true
 *     }
 */
export const queryAliasServer = async (endPoint, aliasParam) => {
    let aliasServerResp;
    try {
        aliasServerResp = await fetch(
            currency.aliasSettings.aliasServerBaseUrl +
                '/' +
                endPoint +
                '/' +
                aliasParam,
        );
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
        console.log(
            `queryAliasServer(): Error retrieving alias data from alias-server`,
            err,
        );
        console.log(
            `/${endPoint}/ endpoint output: ${JSON.stringify(aliasServerResp)}`,
        );
        throw err;
    }
};

/*
 @response:
 {
    processedBlockheight: 785354,
    processedConfirmedTxs: 718,
    registeredAliasCount: 426,
    registrationAddress: 'ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8',
 }
*/
export const getAliasServerState = async () => {
    let aliasServerResp, aliasServerRespJson;
    try {
        aliasServerResp = await fetch(
            currency.aliasSettings.aliasServerBaseUrl + '/state',
        );
        aliasServerRespJson = aliasServerResp.json();
    } catch (err) {
        console.log(
            `getAliasServerState(): Error retrieving server state from alias-server`,
            err,
        );
        return false;
    }

    return aliasServerRespJson;
};

/*
 @response:
  [
    {alias: 'foo', address: 'ecash:qwert...', txid: 'as12d1f324asdf'},
    {alias: 'foo2', address: 'ecash:qwert...' txid: 'as12d1f324asdf'},
    {alias: 'foo3', address: 'ecash:qwert...' txid: 'as12d1f324asdf'},
  ]
*/
export const getPendingAliases = async () => {
    let pendingAliasesResp, pendingAliasesRespJson;
    try {
        pendingAliasesResp = await fetch(
            currency.aliasSettings.aliasServerBaseUrl + '/pending',
        );
        pendingAliasesRespJson = pendingAliasesResp.json();
    } catch (err) {
        console.log(
            `getPendingAliases(): Error retrieving pending aliases from alias-server`,
            err,
        );
        return false;
    }

    return pendingAliasesRespJson;
};
