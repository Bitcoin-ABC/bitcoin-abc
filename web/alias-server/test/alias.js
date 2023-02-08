const assert = require('assert');
const config = require('../config');
const { parseAliasTx, getAliases } = require('../alias');
const { aliases20230207 } = require('./mocks/aliasMocks');

describe('alias-server alias.js', function () {
    it('Correctly parses a 5-character alias transaction', function () {
        assert.deepEqual(
            parseAliasTx(
                aliases20230207.txHistory[
                    aliases20230207.txHistory.findIndex(
                        i =>
                            i.txid ===
                            '9d9fd465f56a7946c48b2e214386b51d7968a3a40d46cc697036e4fc1cc644df',
                    )
                ],
                config.aliasConstants,
            ),
            {
                address: 'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed',
                alias: 'foo10',
                txid: '9d9fd465f56a7946c48b2e214386b51d7968a3a40d46cc697036e4fc1cc644df',
            },
        );
    });
    it('Correctly parses a 6-character alias transaction', function () {
        assert.deepEqual(
            parseAliasTx(
                aliases20230207.txHistory[
                    aliases20230207.txHistory.findIndex(
                        i =>
                            i.txid ===
                            '36fdab59d25625b6ff3661aa5ab22a4893698fa5618e5e958e1d75bf921e6107',
                    )
                ],
                config.aliasConstants,
            ),
            {
                address: 'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed',
                alias: 'django',
                txid: '36fdab59d25625b6ff3661aa5ab22a4893698fa5618e5e958e1d75bf921e6107',
            },
        );
    });
    it('Returns false for an eToken transaction', function () {
        assert.deepEqual(
            parseAliasTx(
                aliases20230207.txHistory[
                    aliases20230207.txHistory.findIndex(
                        i =>
                            i.txid ===
                            'feafd053d4166601d42949a768b9c3e8ee1f27912fc84b6190aeb022fba7fa39',
                    )
                ],
                config.aliasConstants,
            ),
            false,
        );
    });
    it('Correctly parses all aliases through 84 transactions at test address ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8', function () {
        assert.deepEqual(
            getAliases(aliases20230207.txHistory, config.aliasConstants),
            aliases20230207.aliases,
        );
    });
});
