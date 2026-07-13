// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { GenesisInfo } from 'chronik-client';

/**
 * High-volume tokens hard-coded so push copy does not wait on chronik.token
 * for every notification. IDs/metadata match Cashtab fixtures
 * (`cashtab/src/constants/tokens.ts`, Agora/App mocks).
 *
 * FIRMA uses Cashtab display overrides (Firma Alpha), not raw on-chain names.
 */
export const CACHET_TOKEN_ID =
    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1';

export const FIRMA_ALPHA_TOKEN_ID =
    '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0';

export const XECX_TOKEN_ID =
    'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4';

export const HOT_TOKEN_GENESIS_INFO: ReadonlyMap<string, GenesisInfo> = new Map(
    [
        [
            CACHET_TOKEN_ID,
            {
                tokenTicker: 'CACHET',
                tokenName: 'Cachet',
                url: 'https://cashtab.com/',
                decimals: 2,
                hash: '',
            },
        ],
        [
            FIRMA_ALPHA_TOKEN_ID,
            {
                tokenTicker: 'FIRMA ALPHA',
                tokenName: 'Firma Alpha',
                url: 'firmaprotocol.com',
                decimals: 4,
                data: '',
                authPubkey:
                    '03fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
            },
        ],
        [
            XECX_TOKEN_ID,
            {
                tokenTicker: 'XECX',
                tokenName: 'Staked XEC',
                url: 'stakedXec.com',
                decimals: 2,
                data: '',
                authPubkey:
                    '03e4d137b0fd6d8cfbb6aeb1d83c6cb33b19143e7faeacc1d79cf6f052dc56f650',
            },
        ],
    ],
);
