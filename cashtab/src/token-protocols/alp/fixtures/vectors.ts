// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    TokenTargetOutput,
    TOKEN_DUST_CHANGE_OUTPUT,
    TokenInputInfo,
} from 'token-protocols';
import {
    MAX_OUTPUT_AMOUNT_ALP_TOKEN_SATOSHIS,
    CashtabAlpGenesisInfo,
} from 'token-protocols/alp';
import {
    CashtabUtxo,
    SlpDecimals,
    undecimalizeTokenAmount,
    DUMMY_KEYPAIR,
} from 'wallet';
import { Script, toHex, fromHex } from 'ecash-lib';
import { Token, TokenType, OutPoint } from 'chronik-client';

const MOCK_TOKEN_ID =
    '1111111111111111111111111111111111111111111111111111111111111111';
const DUMMY_ADDRESS = 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx';
const DUMMY_OUTPOINT: OutPoint = {
    txid: '0000000000000000000000000000000000000000000000000000000000000000',
    outIdx: 0,
};
const DUMMY_TOKEN_TYPE_ALP: TokenType = {
    protocol: 'ALP',
    type: 'ALP_TOKEN_TYPE_STANDARD',
    number: 1,
};
const DUMMY_TOKEN_ALP: Token = {
    tokenType: DUMMY_TOKEN_TYPE_ALP,
    tokenId: MOCK_TOKEN_ID,
    amount: '1000',
    isMintBaton: false,
};
const DUMMY_UTXO: CashtabUtxo = {
    outpoint: DUMMY_OUTPOINT,
    value: 546,
    blockHeight: 800000,
    isCoinbase: false,
    isFinal: true,
    path: 1899,
};

interface GetMaxDecimalizedAlpQtyReturn {
    description: string;
    decimals: SlpDecimals;
    returned: string;
}
interface GetAlpGenesisTargetOutputsReturn {
    description: string;
    genesisInfo: CashtabAlpGenesisInfo;
    initialQuantity: bigint;
    includeMintBaton: boolean;
    targetOutputs: TokenTargetOutput[];
}
interface GetAlpGenesisTargetOutputsError
    extends Omit<GetAlpGenesisTargetOutputsReturn, 'targetOutputs'> {
    errorMsg: string;
}
interface GetAlpSendTargetOutputsReturn {
    description: string;
    tokenInputInfo: TokenInputInfo;
    destinationAddress: string;
    returned: TokenTargetOutput[];
}
interface GetAlpBurnTargetOutputsReturn {
    description: string;
    tokenInputInfo: TokenInputInfo;
    returned: TokenTargetOutput[];
}
interface GetAlpMintTargetOutputReturn {
    description: string;
    tokenId: string;
    mintQty: bigint;
    returned: TokenTargetOutput[];
}
interface AlpVectors {
    getMaxDecimalizedAlpQty: {
        expectedReturns: GetMaxDecimalizedAlpQtyReturn[];
    };
    getAlpGenesisTargetOutputs: {
        expectedReturns: GetAlpGenesisTargetOutputsReturn[];
        expectedErrors: GetAlpGenesisTargetOutputsError[];
    };
    getAlpSendTargetOutputs: {
        expectedReturns: GetAlpSendTargetOutputsReturn[];
    };
    getAlpBurnTargetOutputs: {
        expectedReturns: GetAlpBurnTargetOutputsReturn[];
    };
    getAlpMintTargetOutputs: {
        expectedReturns: GetAlpMintTargetOutputReturn[];
    };
}
const vectors: AlpVectors = {
    getMaxDecimalizedAlpQty: {
        expectedReturns: [
            {
                description: '0 decimals',
                decimals: 0,
                returned: MAX_OUTPUT_AMOUNT_ALP_TOKEN_SATOSHIS,
            },
            {
                description: '1 decimals',
                decimals: 1,
                returned: '28147497671065.5',
            },
            {
                description: '2 decimals',
                decimals: 2,
                returned: '2814749767106.55',
            },
            {
                description: '3 decimals',
                decimals: 3,
                returned: '281474976710.655',
            },
            {
                description: '4 decimals',
                decimals: 4,
                returned: '28147497671.0655',
            },
            {
                description: '5 decimals',
                decimals: 5,
                returned: '2814749767.10655',
            },
            {
                description: '6 decimals',
                decimals: 6,
                returned: '281474976.710655',
            },
            {
                description: '7 decimals',
                decimals: 7,
                returned: '28147497.6710655',
            },
            {
                description: '8 decimals',
                decimals: 8,
                returned: '2814749.76710655',
            },
            {
                description: '9 decimals',
                decimals: 9,
                returned: '281474.976710655',
            },
        ],
    },
    getAlpGenesisTargetOutputs: {
        expectedReturns: [
            {
                description: 'Fixed supply eToken mint for token with decimals',
                genesisInfo: {
                    tokenName: 'ethantest',
                    tokenTicker: 'ETN',
                    url: 'https://cashtab.com/',
                    hash: '',
                    decimals: 3,
                    authPubkey: toHex(DUMMY_KEYPAIR.pk),
                },
                initialQuantity: BigInt(undecimalizeTokenAmount('5000', 3)),
                includeMintBaton: false,
                targetOutputs: [
                    {
                        value: 0,
                        script: new Script(
                            fromHex(
                                '6a504c5c534c5032000747454e455349530345544e09657468616e746573741468747470733a2f2f636173687461622e636f6d2f0021023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b10301404b4c00000000',
                            ),
                        ),
                    },
                    TOKEN_DUST_CHANGE_OUTPUT,
                ],
            },
            {
                description:
                    'Variable supply eToken mint for token with decimals',
                genesisInfo: {
                    tokenName: 'ethantest',
                    tokenTicker: 'ETN',
                    url: 'https://cashtab.com/',
                    hash: '',
                    decimals: 3,
                    authPubkey: toHex(DUMMY_KEYPAIR.pk),
                },
                initialQuantity: BigInt(undecimalizeTokenAmount('5000', 3)),
                includeMintBaton: true,
                targetOutputs: [
                    {
                        value: 0,
                        script: new Script(
                            fromHex(
                                '6a504c5c534c5032000747454e455349530345544e09657468616e746573741468747470733a2f2f636173687461622e636f6d2f0021023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b10301404b4c00000001',
                            ),
                        ),
                    },
                    TOKEN_DUST_CHANGE_OUTPUT,
                    TOKEN_DUST_CHANGE_OUTPUT,
                ],
            },
            {
                description:
                    'Variable supply eToken mint for tokenId 50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                genesisInfo: {
                    tokenName: 'tabcash',
                    tokenTicker: 'TBC',
                    url: 'https://cashtabapp.com/',
                    hash: '',
                    decimals: 0,
                    authPubkey: toHex(DUMMY_KEYPAIR.pk),
                },
                initialQuantity: BigInt('100'),
                includeMintBaton: true,
                targetOutputs: [
                    {
                        value: 0,
                        script: new Script(
                            fromHex(
                                '6a504c5d534c5032000747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f0021023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1000164000000000001',
                            ),
                        ),
                    },
                    TOKEN_DUST_CHANGE_OUTPUT,
                    TOKEN_DUST_CHANGE_OUTPUT,
                ],
            },
            {
                description:
                    'Fixed supply eToken mint at max supply for 9 decimal token',
                genesisInfo: {
                    tokenName: 'tabcash',
                    tokenTicker: 'TBC',
                    url: 'https://cashtabapp.com/',
                    hash: '',
                    decimals: 9,
                    authPubkey: toHex(DUMMY_KEYPAIR.pk),
                },
                initialQuantity: BigInt(
                    undecimalizeTokenAmount('281474.976710655', 9),
                ),
                includeMintBaton: true,
                targetOutputs: [
                    {
                        value: 0,
                        script: new Script(
                            fromHex(
                                '6a504c5d534c5032000747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f0021023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b10901ffffffffffff01',
                            ),
                        ),
                    },
                    TOKEN_DUST_CHANGE_OUTPUT,
                    TOKEN_DUST_CHANGE_OUTPUT,
                ],
            },
            {
                description:
                    'Variable supply eToken mint at max supply for 0 decimal token',
                genesisInfo: {
                    tokenName: 'tabcash',
                    tokenTicker: 'TBC',
                    url: 'https://cashtabapp.com/',
                    hash: '',
                    decimals: 0,
                    authPubkey: toHex(DUMMY_KEYPAIR.pk),
                },
                initialQuantity: BigInt(MAX_OUTPUT_AMOUNT_ALP_TOKEN_SATOSHIS),
                includeMintBaton: true,
                targetOutputs: [
                    {
                        value: 0,
                        script: new Script(
                            fromHex(
                                '6a504c5d534c5032000747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f0021023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b10001ffffffffffff01',
                            ),
                        ),
                    },
                    TOKEN_DUST_CHANGE_OUTPUT,
                    TOKEN_DUST_CHANGE_OUTPUT,
                ],
            },
        ],
        expectedErrors: [
            {
                description: 'Exceed 0xffffffffffffffff for genesis qty',
                genesisInfo: {
                    tokenName: 'ethantest',
                    tokenTicker: 'ETN',
                    url: 'https://cashtab.com/',
                    hash: '',
                    decimals: 0,
                    authPubkey: toHex(DUMMY_KEYPAIR.pk),
                },
                initialQuantity: BigInt(
                    `${MAX_OUTPUT_AMOUNT_ALP_TOKEN_SATOSHIS}1`,
                ),
                includeMintBaton: true,
                errorMsg: `Cannot fit 655359 into a u16`,
            },
        ],
    },
    getAlpSendTargetOutputs: {
        expectedReturns: [
            {
                description: 'We can send a max-qty ALP tx with change',
                tokenInputInfo: {
                    // Note that getAlpSendTargetOutputs does not use these
                    tokenInputs: [
                        {
                            ...DUMMY_UTXO,
                            token: {
                                ...DUMMY_TOKEN_ALP,
                                amount: MAX_OUTPUT_AMOUNT_ALP_TOKEN_SATOSHIS,
                            },
                        },
                        {
                            ...DUMMY_UTXO,
                            token: {
                                ...DUMMY_TOKEN_ALP,
                                amount: MAX_OUTPUT_AMOUNT_ALP_TOKEN_SATOSHIS,
                            },
                        },
                    ],
                    sendAmounts: [
                        BigInt(MAX_OUTPUT_AMOUNT_ALP_TOKEN_SATOSHIS),
                        1n,
                    ],
                    tokenId: MOCK_TOKEN_ID,
                },
                destinationAddress: DUMMY_ADDRESS,
                returned: [
                    {
                        value: 0,
                        script: new Script(
                            fromHex(
                                '6a5037534c5032000453454e44111111111111111111111111111111111111111111111111111111111111111102ffffffffffff010000000000',
                            ),
                        ),
                    },
                    // Recipient output
                    {
                        ...TOKEN_DUST_CHANGE_OUTPUT,
                        script: Script.fromAddress(DUMMY_ADDRESS),
                    },
                    // Change output has no script or address
                    TOKEN_DUST_CHANGE_OUTPUT,
                ],
            },
            {
                description: 'We can send a max-qty ALP tx with no change',
                tokenInputInfo: {
                    tokenInputs: [
                        {
                            ...DUMMY_UTXO,
                            token: {
                                ...DUMMY_TOKEN_ALP,
                                amount: MAX_OUTPUT_AMOUNT_ALP_TOKEN_SATOSHIS,
                            },
                        },
                        {
                            ...DUMMY_UTXO,
                            token: {
                                ...DUMMY_TOKEN_ALP,
                                amount: MAX_OUTPUT_AMOUNT_ALP_TOKEN_SATOSHIS,
                            },
                        },
                    ],
                    sendAmounts: [BigInt(MAX_OUTPUT_AMOUNT_ALP_TOKEN_SATOSHIS)],
                    tokenId: MOCK_TOKEN_ID,
                },
                destinationAddress: DUMMY_ADDRESS,
                returned: [
                    {
                        value: 0,
                        script: new Script(
                            fromHex(
                                '6a5031534c5032000453454e44111111111111111111111111111111111111111111111111111111111111111101ffffffffffff',
                            ),
                        ),
                    },
                    // Recipient output
                    {
                        ...TOKEN_DUST_CHANGE_OUTPUT,
                        script: Script.fromAddress(DUMMY_ADDRESS),
                    },
                    // No token change output
                ],
            },
        ],
    },
    getAlpBurnTargetOutputs: {
        expectedReturns: [
            {
                description: 'We can burn all input qty with no token change',
                tokenInputInfo: {
                    tokenId: MOCK_TOKEN_ID,
                    tokenInputs: [],
                    sendAmounts: [100n],
                },
                returned: [
                    {
                        value: 0,
                        script: new Script(
                            fromHex(
                                '6a5030534c503200044255524e1111111111111111111111111111111111111111111111111111111111111111640000000000',
                            ),
                        ),
                    },
                    // Self send dust output to make sure the tx has at least one output of at least dust
                    {
                        ...TOKEN_DUST_CHANGE_OUTPUT,
                    },
                ],
            },
            {
                description: 'We can burn some input qty with token change',
                tokenInputInfo: {
                    tokenId: MOCK_TOKEN_ID,
                    tokenInputs: [],
                    sendAmounts: [100n, 20n],
                },
                returned: [
                    {
                        value: 0,
                        script: new Script(
                            fromHex(
                                '6a5030534c503200044255524e111111111111111111111111111111111111111111111111111111111111111164000000000031534c5032000453454e44111111111111111111111111111111111111111111111111111111111111111101140000000000',
                            ),
                        ),
                    },
                    // Self send dust output -- in this case it is a token utxo holding change
                    {
                        ...TOKEN_DUST_CHANGE_OUTPUT,
                    },
                ],
            },
        ],
    },
    getAlpMintTargetOutputs: {
        expectedReturns: [
            {
                description:
                    'We can get target outputs for an ALP mint tx for highest 1-output qty',
                tokenId: MOCK_TOKEN_ID,
                mintQty: BigInt(MAX_OUTPUT_AMOUNT_ALP_TOKEN_SATOSHIS),
                returned: [
                    {
                        value: 0,
                        script: new Script(
                            fromHex(
                                '6a5032534c503200044d494e54111111111111111111111111111111111111111111111111111111111111111101ffffffffffff01',
                            ),
                        ),
                    },
                    TOKEN_DUST_CHANGE_OUTPUT,
                    TOKEN_DUST_CHANGE_OUTPUT,
                ],
            },
        ],
    },
};

export default vectors;
