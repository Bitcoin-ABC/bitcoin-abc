import { currency } from 'components/Common/Ticker';

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
