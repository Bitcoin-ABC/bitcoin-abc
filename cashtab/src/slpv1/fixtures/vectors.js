// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Test vectors for slpv1 functions

import {
    generateSendOpReturnMockUtxos,
    covidUtxosChange,
    covidUtxosNoChange,
} from './mocks';

export const slpv1Vectors = {
    genesisTxs: {
        expectedReturns: [
            {
                description: 'Fixed supply eToken mint for token with decimals',
                genesisConfig: {
                    name: 'ethantest',
                    ticker: 'ETN',
                    documentUrl: 'https://cashtab.com/',
                    decimals: '3',
                    initialQty: '5000',
                    documentHash: '',
                    mintBatonVout: null,
                },
                outputScriptHex:
                    '6a04534c500001010747454e455349530345544e09657468616e746573741468747470733a2f2f636173687461622e636f6d2f4c0001034c000800000000004c4b40',
            },
            {
                description:
                    'Fixed supply eToken mint for tokenId 50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                genesisConfig: {
                    name: 'tabcash',
                    ticker: 'TBC',
                    documentUrl: 'https://cashtabapp.com/',
                    decimals: '0',
                    initialQty: '100',
                    documentHash: '',
                    mintBatonVout: 2,
                },
                outputScriptHex:
                    '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c0001000102080000000000000064',
            },
        ],
        expectedErrors: [
            {
                description: 'Invalid document hash',
                genesisConfig: {
                    name: 'tabcash',
                    ticker: 'TBC',
                    documentUrl: 'https://cashtabapp.com/',
                    decimals: '0',
                    initialQty: '100',
                    documentHash: 'not hex and not the right length',
                    mintBatonVout: 2,
                },
                errorMsg: 'documentHash must be either 0 or 32 hex bytes',
            },
            {
                description: 'Missing decimals',
                genesisConfig: {
                    name: 'some token name',
                    ticker: 'some ticker',
                    documentUrl: 'https://cashtab.com/',
                    initialQty: '100',
                    documentHash: '',
                    mintBatonVout: null,
                },
                errorMsg: 'bn not an integer',
            },
            {
                description: 'Non-string name',
                genesisConfig: {
                    name: { tokenName: 'theName' },
                    ticker: 'some ticker',
                    documentUrl: 'https://cashtab.com/',
                    initialQty: '100',
                    documentHash: '',
                    mintBatonVout: null,
                },
                errorMsg:
                    'The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of Object',
            },
        ],
    },
    sendTxs: {
        expectedReturns: [
            {
                // https://explorer.e.cash/tx/727eddeaea7fb52333f91f38491e027cd150f86ea8dbdc9b04deaf819231e79b
                description:
                    'Legacy unit test of deprecated function generateSendOpReturn',
                tokenUtxos: generateSendOpReturnMockUtxos,
                sendQty: '50',
                outputScriptHex:
                    '6a04534c500001010453454e4420961ad8759908e7c8923f3c918e3c3d61ee67723c8f7b4664b7fe0ebcc17bbe4808000000000000c350080000000002fa19a8',
            },
            {
                // https://explorer.e.cash/tx/0d943c72c3cbfaf7d1a5b889e62a6ef6e11a3df3a64792bea4499515e884b80a
                description: 'Token send with change output',
                tokenUtxos: covidUtxosChange,
                sendQty: '189',
                outputScriptHex:
                    '6a04534c500001010453454e44207bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b0800000000000000bd0800000002540be20c',
            },
            {
                // https://explorer.e.cash/tx/c83ba773641a05170b28bbea57a32945ba0df1f05aff48be606703d04be84368
                description: 'Token send with change output',
                tokenUtxos: covidUtxosNoChange,
                sendQty: '9999999500',
                outputScriptHex:
                    '6a04534c500001010453454e44207bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b0800000002540be20c',
            },
        ],
        expectedErrors: [
            {
                // https://explorer.e.cash/tx/c83ba773641a05170b28bbea57a32945ba0df1f05aff48be606703d04be84368
                description: 'sendQty is not a string',
                tokenUtxos: covidUtxosNoChange,
                sendQty: 9999999500,
                errorMsg: 'sendQty must be a string',
            },
            {
                // https://explorer.e.cash/tx/c83ba773641a05170b28bbea57a32945ba0df1f05aff48be606703d04be84368
                description: 'tokenUtxos insufficient to cover sendQty',
                tokenUtxos: covidUtxosNoChange,
                sendQty: '9999999501',
                errorMsg:
                    'tokenUtxos have insufficient balance 9999999500 to send 9999999501',
            },
        ],
    },
};
