export const mockGenesisOpReturnScript = {
    type: 'Buffer',
    data: [
        106, 4, 83, 76, 80, 0, 1, 1, 7, 71, 69, 78, 69, 83, 73, 83, 3, 69, 84,
        78, 9, 101, 116, 104, 97, 110, 116, 101, 115, 116, 20, 104, 116, 116,
        112, 115, 58, 47, 47, 99, 97, 115, 104, 116, 97, 98, 46, 99, 111, 109,
        47, 76, 0, 1, 3, 76, 0, 8, 0, 0, 0, 0, 0, 76, 75, 64,
    ],
};

export const mockSendOpReturnScript = {
    type: 'Buffer',
    data: [
        106, 4, 83, 76, 80, 0, 1, 1, 4, 83, 69, 78, 68, 32, 150, 26, 216, 117,
        153, 8, 231, 200, 146, 63, 60, 145, 142, 60, 61, 97, 238, 103, 114, 60,
        143, 123, 70, 100, 183, 254, 14, 188, 193, 123, 190, 72, 8, 0, 0, 0, 0,
        0, 0, 195, 80, 8, 0, 0, 0, 0, 2, 250, 25, 168,
    ],
};

export const mockSendOpReturnTokenUtxos = [
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

export const mockBurnOpReturnScript = {
    type: 'Buffer',
    data: [
        106, 4, 83, 76, 80, 0, 1, 1, 4, 83, 69, 78, 68, 32, 66, 9, 190, 107,
        212, 137, 55, 38, 62, 222, 249, 76, 234, 247, 122, 65, 122, 177, 179,
        91, 12, 105, 85, 156, 253, 244, 164, 53, 226, 191, 26, 136, 8, 0, 0, 0,
        0, 2, 224, 255, 224,
    ],
};

export const mockBurnOpReturnTokenUtxos = [
    {
        outpoint: {
            txid: 'e1f75fd838056396dbaaa5431ae1f7a471b1e1d63f5467b99411f32ba3a54968',
            outIdx: 1,
        },
        blockHeight: -1,
        isCoinbase: false,
        value: '546',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '4209be6bd48937263edef94ceaf77a417ab1b35b0c69559cfdf4a435e2bf1a88',
        },
        slpToken: {
            amount: '49000000',
            isMintBaton: false,
        },
        network: 'XEC',
        address: 'bitcoincash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqqkm80dnl6',
        tokenQty: '490000',
        tokenId:
            '4209be6bd48937263edef94ceaf77a417ab1b35b0c69559cfdf4a435e2bf1a88',
        decimals: 2,
    },
];
