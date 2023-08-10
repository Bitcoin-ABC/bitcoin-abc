import mainLogo from 'assets/logo_primary.png';
import tokenLogo from 'assets/logo_secondary.png';

export const currency = {
    name: 'eCash',
    ticker: 'XEC',
    logo: mainLogo,
    legacyPrefix: 'bitcoincash',
    // temporary parameters for pre-prod testing of alias feature
    aliasSettings: {
        aliasEnabled: false,
        aliasPaymentAddress: 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
        aliasServerBaseUrl: 'https://alias.etokens.cash',
        aliasMaxLength: 21, // max byte length, refer to the Alias spec at https://reviews.bitcoinabc.org/D12972
    },
    coingeckoId: 'ecash',
    defaultFee: 2.01,
    dustSats: 550,
    etokenSats: 546,
    cashDecimals: 2,
    tokenName: 'eToken',
    tokenTicker: 'eToken',
    tokenLogo: tokenLogo,
    notificationDurationShort: 3,
    notificationDurationLong: 5,
    localStorageMaxCharacters: 24,
};
