// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    TokenTargetOutput,
    TOKEN_DUST_CHANGE_OUTPUT,
    TokenInputInfo,
} from 'token-protocols';
import {
    MAX_OUTPUT_AMOUNT_ALP_ATOMS,
    CashtabAlpGenesisInfo,
} from 'token-protocols/alp';
import { SlpDecimals, undecimalizeTokenAmount, DUMMY_KEYPAIR } from 'wallet';
import { Script, toHex, fromHex } from 'ecash-lib';
import { AgoraPartial } from 'ecash-agora';
import { agoraPartialAlpTiberium } from './mocks';

const MOCK_TOKEN_ID =
    '1111111111111111111111111111111111111111111111111111111111111111';

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
interface GetAlpGenesisTargetOutputsError extends Omit<
    GetAlpGenesisTargetOutputsReturn,
    'targetOutputs'
> {
    errorMsg: string;
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
interface GetAlpAgoraListTargetOutputsReturn {
    description: string;
    tokenInputInfo: TokenInputInfo;
    agoraPartial: AgoraPartial;
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
    getAlpBurnTargetOutputs: {
        expectedReturns: GetAlpBurnTargetOutputsReturn[];
    };
    getAlpMintTargetOutputs: {
        expectedReturns: GetAlpMintTargetOutputReturn[];
    };
    getAlpAgoraListTargetOutputs: {
        expectedReturns: GetAlpAgoraListTargetOutputsReturn[];
    };
}
const vectors: AlpVectors = {
    getMaxDecimalizedAlpQty: {
        expectedReturns: [
            {
                description: '0 decimals',
                decimals: 0,
                returned: MAX_OUTPUT_AMOUNT_ALP_ATOMS.toString(),
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
                        sats: 0n,
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
                        sats: 0n,
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
                        sats: 0n,
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
                        sats: 0n,
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
                initialQuantity: BigInt(MAX_OUTPUT_AMOUNT_ALP_ATOMS),
                includeMintBaton: true,
                targetOutputs: [
                    {
                        sats: 0n,
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
                initialQuantity: BigInt(`${MAX_OUTPUT_AMOUNT_ALP_ATOMS}1`),
                includeMintBaton: true,
                errorMsg: `Cannot fit 655359 into a u16`,
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
                        sats: 0n,
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
                        sats: 0n,
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
                mintQty: BigInt(MAX_OUTPUT_AMOUNT_ALP_ATOMS),
                returned: [
                    {
                        sats: 0n,
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
    getAlpAgoraListTargetOutputs: {
        expectedReturns: [
            {
                description:
                    'We can list an ALP token as an AgoraPartial with token change',
                tokenInputInfo: {
                    tokenId: '',
                    tokenInputs: [],
                    sendAmounts: [1024n, 99000n],
                },
                agoraPartial: agoraPartialAlpTiberium,
                returned: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a504b41475230075041525449414c000161ff1f0000000000737b02000000000061ff1f00000000008636ba26023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b117534c5032000453454e4402000400000000b88201000000',
                            ),
                        ),
                    },
                    {
                        ...TOKEN_DUST_CHANGE_OUTPUT,
                        script: new Script(
                            fromHex(
                                'a914ccd73a5da0f68ef5884daf7c7c5bee816c6cee3587',
                            ),
                        ),
                    },
                    TOKEN_DUST_CHANGE_OUTPUT,
                ],
            },
            {
                description:
                    'We can list an ALP token as an AgoraPartial without token change',
                tokenInputInfo: {
                    tokenId: '',
                    tokenInputs: [],
                    sendAmounts: [1024n],
                },
                agoraPartial: agoraPartialAlpTiberium,
                returned: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a504b41475230075041525449414c000161ff1f0000000000737b02000000000061ff1f00000000008636ba26023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b111534c5032000453454e4401000400000000',
                            ),
                        ),
                    },
                    {
                        ...TOKEN_DUST_CHANGE_OUTPUT,
                        script: new Script(
                            fromHex(
                                'a914ccd73a5da0f68ef5884daf7c7c5bee816c6cee3587',
                            ),
                        ),
                    },
                ],
            },
        ],
    },
};

export default vectors;
