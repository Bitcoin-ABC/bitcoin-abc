import mainLogo from '../../images/12-bitcoin-cash-square-crop.svg';
import tokenLogo from '../../images/simple-ledger-protocol-logo.png';

const Ticker = {
    installLink:
        'https://chrome.google.com/webstore/detail/cashtab/obldfcmebhllhjlhjbnghaipekcppeag',
    coinName: 'Bitcoin ABC',
    coinDecimals: 8,
    coinSymbol: 'BCHA',
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

export default Ticker;
