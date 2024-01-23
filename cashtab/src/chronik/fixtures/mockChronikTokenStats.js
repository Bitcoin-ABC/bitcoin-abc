export const mockChronikTokenResponse = {
    slpTxData: {
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'GENESIS',
            tokenId:
                '3c14fcdc3fce9738d213c1ab9d9ff18234fecab9d1ad5a77d3f7b95964269f4a',
        },
        genesisInfo: {
            tokenTicker: 'VVS',
            tokenName: 'ethantest',
            tokenDocumentUrl: 'https://cashtab.com/',
            tokenDocumentHash: '',
            decimals: 3,
        },
    },
    tokenStats: {
        totalMinted: '21000000000',
        totalBurned: '3056',
    },
    block: {
        height: 758409,
        hash: '00000000000000000f305eafc05bffd14de4acf52787596b5927199c9cab37da',
        timestamp: '1663859004',
    },
    timeFirstSeen: '1663858438',
    initialTokenQuantity: '21000000000',
    containsBaton: false,
    network: 'XEC',
};

export const mockGetTokenStatsReturn = {
    slpTxData: {
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'GENESIS',
            tokenId:
                '3c14fcdc3fce9738d213c1ab9d9ff18234fecab9d1ad5a77d3f7b95964269f4a',
        },
        genesisInfo: {
            tokenTicker: 'VVS',
            tokenName: 'ethantest',
            tokenDocumentUrl: 'https://cashtab.com/',
            tokenDocumentHash: '',
            decimals: 3,
        },
    },
    tokenStats: {
        totalMinted: '21000000',
        totalBurned: '3.056',
    },
    block: {
        height: 758409,
        hash: '00000000000000000f305eafc05bffd14de4acf52787596b5927199c9cab37da',
        timestamp: '1663859004',
    },
    timeFirstSeen: '1663858438',
    initialTokenQuantity: '21000000',
    containsBaton: false,
    network: 'XEC',
    circulatingSupply: '20999996.944',
};
