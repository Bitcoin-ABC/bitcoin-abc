module.exports = {
    chronik: 'https://chronik.fabien.cash', // URL of chronik instance
    blockExplorer: 'https://explorer.e.cash',
    ifpHash160: 'd37c4c809fe9840e7bfa77b86bd47163f6fb6c60',
    tgMsgOptions: {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    },
    knownMiners: [
        {
            coinbaseScript: '566961425443',
            miner: 'ViaBTC',
        },
        {
            coinbaseScript: '4d696e696e672d4475746368',
            miner: 'Mining-Dutch',
        },
    ],
    opReturn: {
        opReturnPrefix: '6a',
        opReturnAppPrefixLength: '04',
        opPushDataOne: '4c',
    },
};
