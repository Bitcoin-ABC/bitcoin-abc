import BigNumber from 'bignumber.js';

export const walletWithBalancesMock = {
    wallet: {
        Path245: {
            slpAddress:
                'simpleledger:qryupy05jz7tlhtda2xth8vyvdqksyqh5cp5kf5vth',
        },
        Path145: {
            cashAddress:
                'bitcoincash:qrn4er57cvr5fulyl4hduef6czgu6u2yu522f4gv6f',
        },
    },
    balances: {
        totalBalance: 0.000546,
    },
};

export const walletWithoutBalancesMock = {
    wallet: {
        Path245: {
            slpAddress:
                'simpleledger:qryupy05jz7tlhtda2xth8vyvdqksyqh5cp5kf5vth',
        },
        Path145: {
            cashAddress:
                'bitcoincash:qrn4er57cvr5fulyl4hduef6czgu6u2yu522f4gv6f',
        },
    },
    tokens: [],
    balances: {
        totalBalance: 0,
    },
};

export const walletWithBalancesAndTokens = {
    wallet: {
        Path245: {
            slpAddress:
                'simpleledger:qryupy05jz7tlhtda2xth8vyvdqksyqh5cp5kf5vth',
        },
        Path145: {
            cashAddress:
                'bitcoincash:qrn4er57cvr5fulyl4hduef6czgu6u2yu522f4gv6f',
        },
    },
    balances: {
        totalBalances: 0.0000546,
    },
    tokens: [
        {
            info: {
                height: 659843,
                tx_hash:
                    '88b7dac07cb30566a6264f330bedda690c8dff151c2307692c79e13dc59ca2ba',
                tx_pos: 2,
                value: 546,
                address:
                    'bitcoincash:qphazxf3vhe4qchvzz2pjempdhplaxcj957xqq8mg2',
                satoshis: 546,
                txid:
                    '88b7dac07cb30566a6264f330bedda690c8dff151c2307692c79e13dc59ca2ba',
                vout: 2,
                utxoType: 'token',
                transactionType: 'send',
                tokenId:
                    '2aef6e63edfded1a299e78b529286deea2a6dd5299b6911778c25632d78a9479',
                tokenTicker: 'PTC',
                tokenName: 'pitico',
                tokenDocumentUrl: 'bitcoinabc.org',
                tokenDocumentHash: '',
                decimals: 5,
                tokenType: 1,
                tokenQty: 99.35,
                isValid: true,
            },
            tokenId:
                '2aef6e63edfded1a299e78b529286deea2a6dd5299b6911778c25632d78a9479',
            balance: new BigNumber(99),
            hasBaton: false,
        },
    ],
};
