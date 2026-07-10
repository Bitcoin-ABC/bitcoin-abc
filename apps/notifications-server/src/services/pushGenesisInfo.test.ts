// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { ChronikClient, type GenesisInfo } from 'chronik-client';
import { buildGenesisInfoMapForTokenIds } from './pushGenesisInfo';

const TOKEN_ID =
    '96704added2310ba79cddecc7e192c56a8aa29542b7187539fc0327acddc8ac6';

const mockGenesisInfo: GenesisInfo = {
    tokenTicker: 'CACHET',
    tokenName: 'Cachet',
    url: '',
    decimals: 0,
};

describe('pushGenesisInfo', () => {
    it('buildGenesisInfoMapForTokenIds deduplicates token ids per tx', async () => {
        let tokenCalls = 0;
        const chronik = {
            token: async () => {
                tokenCalls += 1;
                return { genesisInfo: mockGenesisInfo };
            },
        } as unknown as ChronikClient;

        const map = await buildGenesisInfoMapForTokenIds(chronik, [
            TOKEN_ID,
            TOKEN_ID,
        ]);

        assert.strictEqual(map.get(TOKEN_ID)?.tokenTicker, 'CACHET');
        assert.strictEqual(tokenCalls, 1);
    });
});
