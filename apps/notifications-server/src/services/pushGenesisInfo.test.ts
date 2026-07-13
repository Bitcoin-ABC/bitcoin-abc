// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { ChronikClient, type GenesisInfo } from 'chronik-client';
import {
    CACHET_TOKEN_ID,
    FIRMA_ALPHA_TOKEN_ID,
    XECX_TOKEN_ID,
} from '../constants/hotTokenGenesisInfo';
import { buildGenesisInfoMapForTokenIds } from './pushGenesisInfo';

const UNKNOWN_TOKEN_ID =
    '96704added2310ba79cddecc7e192c56a8aa29542b7187539fc0327acddc8ac6';

const mockGenesisInfo: GenesisInfo = {
    tokenTicker: 'BVE',
    tokenName: 'Beaver',
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
            UNKNOWN_TOKEN_ID,
            UNKNOWN_TOKEN_ID,
        ]);

        assert.strictEqual(map.get(UNKNOWN_TOKEN_ID)?.tokenTicker, 'BVE');
        assert.strictEqual(tokenCalls, 1);
    });

    it('serves CACHET, Firma Alpha, and XECX from the hot map without chronik', async () => {
        let tokenCalls = 0;
        const chronik = {
            token: async () => {
                tokenCalls += 1;
                throw new Error('chronik should not be called for hot tokens');
            },
        } as unknown as ChronikClient;

        const map = await buildGenesisInfoMapForTokenIds(chronik, [
            CACHET_TOKEN_ID,
            FIRMA_ALPHA_TOKEN_ID,
            XECX_TOKEN_ID,
            CACHET_TOKEN_ID,
        ]);

        assert.strictEqual(tokenCalls, 0);
        assert.strictEqual(map.get(CACHET_TOKEN_ID)?.tokenTicker, 'CACHET');
        assert.strictEqual(map.get(CACHET_TOKEN_ID)?.decimals, 2);
        assert.strictEqual(map.get(FIRMA_ALPHA_TOKEN_ID)?.tokenTicker, 'FIRMA ALPHA');
        assert.strictEqual(map.get(FIRMA_ALPHA_TOKEN_ID)?.tokenName, 'Firma Alpha');
        assert.strictEqual(map.get(FIRMA_ALPHA_TOKEN_ID)?.decimals, 4);
        assert.strictEqual(map.get(XECX_TOKEN_ID)?.tokenTicker, 'XECX');
        assert.strictEqual(map.get(XECX_TOKEN_ID)?.decimals, 2);
        assert.strictEqual(map.size, 3);
    });

    it('uses hot map for known ids and chronik only for unknown ids', async () => {
        let tokenCalls = 0;
        const chronik = {
            token: async (tokenId: string) => {
                tokenCalls += 1;
                assert.strictEqual(tokenId, UNKNOWN_TOKEN_ID);
                return { genesisInfo: mockGenesisInfo };
            },
        } as unknown as ChronikClient;

        const map = await buildGenesisInfoMapForTokenIds(chronik, [
            CACHET_TOKEN_ID,
            UNKNOWN_TOKEN_ID,
            XECX_TOKEN_ID,
        ]);

        assert.strictEqual(tokenCalls, 1);
        assert.strictEqual(map.get(CACHET_TOKEN_ID)?.tokenTicker, 'CACHET');
        assert.strictEqual(map.get(UNKNOWN_TOKEN_ID)?.tokenTicker, 'BVE');
        assert.strictEqual(map.get(XECX_TOKEN_ID)?.tokenTicker, 'XECX');
    });
});
