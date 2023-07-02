import { currency } from 'components/Common/Ticker';

/**
 * Fetches aliases for a given eCash address via the alias-server
 *
 * @param {string} address an eCash address
 * @returns {array} aliasServerResp array of alias objects
 * @throws {error} err server fetch errors from alias-server
 * @response:
 *   [
 *       {alias: 'foo', address: 'ecash:qpmyt....', txid: 'ec927447...', blockheight: '792417'},
 *       {alias: 'foo2', address: 'ecash:qpmyt....', txid: 'ec927447...', blockheight: '792417'},
 *   ]
 */
export const getAliasesForAddress = async address => {
    let aliasServerResp;
    try {
        aliasServerResp = await fetch(
            currency.aliasSettings.aliasServerBaseUrl + '/address/' + address,
        );
        if (aliasServerResp && aliasServerResp.error) {
            throw new Error(aliasServerResp.error);
        }
        return aliasServerResp;
    } catch (err) {
        console.log(
            `getAliasesForAddress(): Error retrieving aliases from alias-server`,
            err,
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

/**
 * Fetches details for an alias via the alias-server
 *
 * @param {string} alias the alias being queried
 * @returns {object} aliasServerResp an alias object
 * @throws {error} err server fetch errors from alias-server
 * Example successful response:
 *     {
 *        alias: 'twelvechar12',
 *        address:'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
 *        txid:'166b21d4631e2a6ec6110061f351c9c3bfb3a8d4e6919684df7e2824b42b0ffe',
 *        blockheight:792419,
 *        isRegistered:true
 *     }
 */
export const getAliasDetails = async alias => {
    try {
        const aliasServerResp = await fetch(
            currency.aliasSettings.aliasServerBaseUrl + '/alias/' + alias,
        );
        if (aliasServerResp && aliasServerResp.error) {
            throw new Error(aliasServerResp.error);
        }
        return aliasServerResp;
    } catch (err) {
        console.log(
            `getAliasDetails(): Error retrieving alias details from alias-server`,
            err,
        );
        throw err;
    }
};

/*
 @response:
  [
    {alias: 'foo', address: 'ecash:qwert...'},
    {alias: 'foo2', address: 'ecash:qwert...'},
    {alias: 'foo3', address: 'ecash:qwert...'},
  ]
*/
export const getAliasServerHistory = async () => {
    let aliasServerResp, aliasServerRespJson;
    try {
        aliasServerResp = await fetch(
            currency.aliasSettings.aliasServerBaseUrl + '/aliases',
        );
        aliasServerRespJson = aliasServerResp.json();
    } catch (err) {
        console.log(
            `getAliasServerHistory(): Error retrieving aliases from alias-server`,
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
