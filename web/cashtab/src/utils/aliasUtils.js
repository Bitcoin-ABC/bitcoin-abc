import { currency } from 'components/Common/Ticker';

/*
 alias-server response:
  [
    {alias: 'foo', address: 'ecash:qwert...'},
    {alias: 'foo2', address: 'ecash:qwert...'},
    {alias: 'foo3', address: 'ecash:qwert...'},
  ]
*/
export const getAliasServerHistory = async () => {
    let aliasServerResp, aliasServerRespJson;
    try {
        aliasServerResp = await fetch(currency.aliasSettings.aliasServerUrl);
        aliasServerRespJson = aliasServerResp.json();
    } catch (err) {
        console.log(
            `getAliasServerHistory(): Error retrieving aliases from alias-server`,
            err,
        );
    }

    return aliasServerRespJson;
};
