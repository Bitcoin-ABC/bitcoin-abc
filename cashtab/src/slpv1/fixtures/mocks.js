export const generateSendOpReturnMockUtxos = [
    {
        outpoint: {
            txid: '906f7dd233a4e0d5ca03f238fe1ab75c0346ebe9ebbd8421da37ec55cd957391',
            outIdx: 2,
        },
        blockHeight: -1,
        isCoinbase: false,
        value: '546',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '961ad8759908e7c8923f3c918e3c3d61ee67723c8f7b4664b7fe0ebcc17bbe48',
        },
        slpToken: {
            amount: '49995000',
            isMintBaton: false,
        },
        network: 'XEC',
        address: 'bitcoincash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqqkm80dnl6',
        tokenQty: '49995',
        tokenId:
            '961ad8759908e7c8923f3c918e3c3d61ee67723c8f7b4664b7fe0ebcc17bbe48',
        decimals: 3,
    },
];

export const covidUtxosChange = [
    {
        outpoint: {
            txid: '5c1e71223ee8b7064029f2add09c0b0a18e2695f09fea588821f608934d130ca',
            outIdx: 2,
        },
        blockHeight: 769077,
        isCoinbase: false,
        value: '546',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
        },
        slpToken: {
            amount: '1',
            isMintBaton: false,
        },
        network: 'XEC',
        address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        tokenQty: '1',
        tokenId:
            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
        decimals: 0,
    },
    {
        outpoint: {
            txid: '079728289a1db6ca0ff1d558891bf33efeb0667bc57e9ebe949c3cf40ce33568',
            outIdx: 2,
        },
        blockHeight: 782686,
        isCoinbase: false,
        value: '546',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
        },
        slpToken: {
            amount: '9999999688',
            isMintBaton: false,
        },
        network: 'XEC',
        address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        tokenQty: '9999999688',
        tokenId:
            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
        decimals: 0,
    },
];

export const covidUtxosNoChange = [
    {
        outpoint: {
            txid: '0d943c72c3cbfaf7d1a5b889e62a6ef6e11a3df3a64792bea4499515e884b80a',
            outIdx: 2,
        },
        blockHeight: -1,
        isCoinbase: false,
        value: '546',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
        },
        slpToken: {
            amount: '9999999500',
            isMintBaton: false,
        },
        network: 'XEC',
        address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        tokenQty: '9999999500',
        tokenId:
            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
        decimals: 0,
    },
];
