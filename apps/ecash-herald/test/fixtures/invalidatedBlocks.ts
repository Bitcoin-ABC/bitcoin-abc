// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const invalidatedBlockFixture = [
    {
        hash: '00000000000000000692216bd4f235fc2cd98872640ba6a3bec0130cbfe59a13',
        height: 865428,
        timestamp: 1728229010,
        coinbaseData: {
            scriptsig:
                '0394340d0492ae026708fabe6d6daf60fc610807858663407096d0cb0b05229c70aa6c9618533929fc17e36632c6000100000000000000b1145b730000009d00122f4d696e696e672d44757463682f2d313236',
            outputs: [
                {
                    value: 181250772,
                    outputScript:
                        '76a914a24e2b67689c3753983d3b408bc7690d31b1b74d88ac',
                },
                {
                    value: 31250132,
                    outputScript:
                        '76a914b03bb6f8567bade53cc3a716e0414c1082a8530088ac',
                },
            ],
        },
        expectedCacheData: {
            address: 'ecash:qzcrhdhc2ea6mefucwn3dczpfsgg92znqqr4ymf609',
            scriptHex: '76a914b03bb6f8567bade53cc3a716e0414c1082a8530088ac',
        },
        mockedBlock: {},
        expectedRejectReason: 'missing miner fund output',
    },
    {
        hash: '00000000000000000692216bd4f235fc2cd98872640ba6a3bec0130cbfe59a13',
        height: 865428,
        timestamp: 1728229010,
        coinbaseData: {
            scriptsig:
                '0394340d0492ae026708fabe6d6daf60fc610807858663407096d0cb0b05229c70aa6c9618533929fc17e36632c6000100000000000000b1145b730000009d00122f4d696e696e672d44757463682f2d313236',
            outputs: [
                {
                    value: 181250772,
                    outputScript:
                        '76a914a24e2b67689c3753983d3b408bc7690d31b1b74d88ac',
                },
                {
                    value: 100000424,
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                },
            ],
        },
        expectedCacheData: {},
        mockedBlock: {},
        expectedRejectReason: 'missing staking reward output',
    },
    {
        hash: '00000000000000000692216bd4f235fc2cd98872640ba6a3bec0130cbfe59a13',
        height: 865428,
        timestamp: 1728229010,
        coinbaseData: {
            scriptsig:
                '0394340d0492ae026708fabe6d6daf60fc610807858663407096d0cb0b05229c70aa6c9618533929fc17e36632c6000100000000000000b1145b730000009d00122f4d696e696e672d44757463682f2d313236',
            outputs: [
                {
                    value: 181250772,
                    outputScript:
                        '76a914a24e2b67689c3753983d3b408bc7690d31b1b74d88ac',
                },
                {
                    value: 100000424,
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                },
                {
                    value: 31250132,
                    outputScript:
                        '76a914b03bb6f8567bade53cc3a716e0414c1082a8530088ac',
                },
            ],
        },
        expectedCacheData: {
            address: 'ecash:qpucqwxgj6239d6wsgfy4xnnvsvj3yerwynur52mwp',
            scriptHex: '76a914798038c8969512b74e82124a9a7364192893237188ac',
        },
        mockedBlock: {},
        expectedRejectReason:
            'wrong staking reward payout (ecash:qzcrhdhc2ea6mefucwn3dczpfsgg92znqqr4ymf609 instead of ecash:qpucqwxgj6239d6wsgfy4xnnvsvj3yerwynur52mwp)',
    },
    {
        hash: '00000000000000000692216bd4f235fc2cd98872640ba6a3bec0130cbfe59a13',
        height: 865428,
        timestamp: 1728229010,
        coinbaseData: {
            scriptsig:
                '0394340d0492ae026708fabe6d6daf60fc610807858663407096d0cb0b05229c70aa6c9618533929fc17e36632c6000100000000000000b1145b730000009d00122f4d696e696e672d44757463682f2d313236',
            outputs: [
                {
                    value: 181250772,
                    outputScript:
                        '76a914a24e2b67689c3753983d3b408bc7690d31b1b74d88ac',
                },
                {
                    value: 100000424,
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                },
                {
                    value: 31250132,
                    outputScript:
                        '76a914b03bb6f8567bade53cc3a716e0414c1082a8530088ac',
                },
            ],
        },
        expectedCacheData: {
            scriptHex: '76a914798038c8969512b74e82124a9a7364192893237188ac',
        },
        mockedBlock: {},
        expectedRejectReason:
            'wrong staking reward payout (76a914b03bb6f8567bade53cc3a716e0414c1082a8530088ac instead of 76a914798038c8969512b74e82124a9a7364192893237188ac)',
    },
    {
        hash: '00000000000000000692216bd4f235fc2cd98872640ba6a3bec0130cbfe59a13',
        height: 865428,
        timestamp: 1728229010,
        coinbaseData: {
            scriptsig:
                '0394340d0492ae026708fabe6d6daf60fc610807858663407096d0cb0b05229c70aa6c9618533929fc17e36632c6000100000000000000b1145b730000009d00122f4d696e696e672d44757463682f2d313236',
            outputs: [
                {
                    value: 181250772,
                    outputScript:
                        '76a914a24e2b67689c3753983d3b408bc7690d31b1b74d88ac',
                },
                {
                    value: 100000424,
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                },
                {
                    value: 31250132,
                    outputScript:
                        '76a914b03bb6f8567bade53cc3a716e0414c1082a8530088ac',
                },
            ],
        },
        expectedCacheData: {
            address: 'ecash:qzcrhdhc2ea6mefucwn3dczpfsgg92znqqr4ymf609',
            scriptHex: '76a914b03bb6f8567bade53cc3a716e0414c1082a8530088ac',
        },
        mockedBlock: {
            height: 865428,
            block: {
                blockInfo: {
                    hash: '00000000000000000692216bd4f235fc2cd98872640ba6a3bec0130cbfe59a14',
                },
            },
        },
        expectedRejectReason:
            'orphaned by block 00000000000000000692216bd4f235fc2cd98872640ba6a3bec0130cbfe59a14',
    },
    {
        hash: '00000000000000000692216bd4f235fc2cd98872640ba6a3bec0130cbfe59a13',
        height: 865428,
        timestamp: 1728229010,
        coinbaseData: {
            scriptsig:
                '0394340d0492ae026708fabe6d6daf60fc610807858663407096d0cb0b05229c70aa6c9618533929fc17e36632c6000100000000000000b1145b730000009d00122f4d696e696e672d44757463682f2d313236',
            outputs: [
                {
                    value: 181250772,
                    outputScript:
                        '76a914a24e2b67689c3753983d3b408bc7690d31b1b74d88ac',
                },
                {
                    value: 100000424,
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                },
                {
                    value: 31250132,
                    outputScript:
                        '76a914b03bb6f8567bade53cc3a716e0414c1082a8530088ac',
                },
            ],
        },
        expectedCacheData: {
            address: 'ecash:qzcrhdhc2ea6mefucwn3dczpfsgg92znqqr4ymf609',
            scriptHex: '76a914b03bb6f8567bade53cc3a716e0414c1082a8530088ac',
        },
        mockedBlock: {},
        expectedRejectReason: 'unknown',
    },
];

export default invalidatedBlockFixture;
