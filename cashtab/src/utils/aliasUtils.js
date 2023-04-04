import { currency } from 'components/Common/Ticker';

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
