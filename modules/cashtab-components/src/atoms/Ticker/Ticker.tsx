import mainLogo from '../../images/logo_primary.png';
import tokenLogo from '../../images/logo_secondary.png';

const Ticker = {
    installLink:
        'https://chrome.google.com/webstore/detail/cashtab/obldfcmebhllhjlhjbnghaipekcppeag',
    coinName: 'eCash',
    coinDecimals: 2,
    coinSymbol: 'XEC',
    logo: mainLogo,
    prefix: 'ecash:',
    coingeckoId: 'bitcoin-cash-abc-2',
    defaultFee: 5.01,
    blockExplorerUrl: 'https://explorer.bitcoinabc.org',
    blockExplorerUrlTestnet: 'https://texplorer.bitcoinabc.org',
    tokenName: 'eToken',"XEC",
    tokenTicker: 'eToken',"XEC",
    tokenLogo: tokenLogo,
    tokenPrefix: 'etoken:',"XEC",
    tokenIconsUrl: '', //https://tokens.bitcoin.com/32 for BCH SLP, "https://www.bing.com/images/search?view=detailV2&ccid=JJwuBt0j&id=E74C937EE45404B2D9D4E38FB21CE1DDB443A321&thid=OIP.JJwuBt0j7SSA0ciEoEwfCQAAAA&mediaurl=https%3a%2f%2fcoindataflow.com%2fuploads%2fcoins%2fecash.png%3fts%3d1628240434&exph=250&expw=250&q=ecash+token+logo&simid=607992238053725924&FORM=IRPRST&ck=8C5B4834689D91CCA55D759DDD38BDB7&selectedIndex=0&ajaxhist=0&ajaxserp=0"
    useBlockchainWs: True,
};

export default Ticker;
