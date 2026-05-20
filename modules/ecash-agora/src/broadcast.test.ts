// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { toBroadcastConfig } from './broadcast.js';

describe('toBroadcastConfig', () => {
    it('defaults to mempool-only broadcast', () => {
        expect(toBroadcastConfig({})).to.deep.equal({
            retryOnUtxoConflict: true,
        });
    });

    it('forwards finalizationTimeoutSecs to BuiltAction.broadcast', () => {
        expect(
            toBroadcastConfig({ finalizationTimeoutSecs: 60 }),
        ).to.deep.equal({
            finalizationTimeoutSecs: 60,
            retryOnUtxoConflict: true,
        });
    });
});
