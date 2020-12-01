import mainLogo from '../../assets/12-bitcoin-cash-square-crop.svg';
import tokenLogo from '../../assets/simple-ledger-protocol-logo.png';

export const currency = {
    name: 'Bitcoin ABC',
    ticker: 'BCHA',
    logo: mainLogo,
    prefix: 'bitcoincash:',
    coingeckoId: 'bitcoin-cash-abc-2',
    defaultFee: 5.01,
    blockExplorerUrl: 'https://explorer.bitcoinabc.org',
    blockExplorerUrlTestnet: 'https://texplorer.bitcoinabc.org',
    tokenName: 'Bitcoin ABC SLP',
    tokenTicker: 'SLPA',
    tokenLogo: tokenLogo,
    tokenPrefix: 'simpleledger:',
    tokenIconsUrl: '', //https://tokens.bitcoin.com/32 for BCH SLP
    useBlockchainWs: false,
};
