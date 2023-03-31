'use strict';
const assert = require('assert');
const config = require('../config');
const {
    parseAliasTx,
    getAliasTxs,
    sortAliasTxsByTxidAndBlockheight,
    getValidAliasRegistrations,
} = require('../src/alias');
const {
    testAddressAliases,
    testAddressAliasesWithUnconfirmedTxs,
    aliases_fake_data,
} = require('./mocks/aliasMocks');

describe('alias-server alias.js', function () {
    it('Correctly parses a 5-character alias transaction', function () {
        assert.deepEqual(
            parseAliasTx(
                testAddressAliases.txHistory[
                    testAddressAliases.txHistory.findIndex(
                        i =>
                            i.txid ===
                            '9d9fd465f56a7946c48b2e214386b51d7968a3a40d46cc697036e4fc1cc644df',
                    )
                ],
                config.aliasConstants,
            ),
            testAddressAliases.allAliasTxs[
                testAddressAliases.allAliasTxs.findIndex(
                    i =>
                        i.txid ===
                        '9d9fd465f56a7946c48b2e214386b51d7968a3a40d46cc697036e4fc1cc644df',
                )
            ],
        );
    });
    it('Correctly parses a 6-character alias transaction', function () {
        assert.deepEqual(
            parseAliasTx(
                testAddressAliases.txHistory[
                    testAddressAliases.txHistory.findIndex(
                        i =>
                            i.txid ===
                            '36fdab59d25625b6ff3661aa5ab22a4893698fa5618e5e958e1d75bf921e6107',
                    )
                ],
                config.aliasConstants,
            ),
            testAddressAliases.allAliasTxs[
                testAddressAliases.allAliasTxs.findIndex(
                    i =>
                        i.txid ===
                        '36fdab59d25625b6ff3661aa5ab22a4893698fa5618e5e958e1d75bf921e6107',
                )
            ],
        );
    });
    it('Returns false for an eToken transaction', function () {
        assert.deepEqual(
            parseAliasTx(
                testAddressAliases.txHistory[
                    testAddressAliases.txHistory.findIndex(
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
    it('Returns false for a standard tx without an OP_RETURN', function () {
        assert.deepEqual(
            parseAliasTx(
                testAddressAliases.txHistory[
                    testAddressAliases.txHistory.findIndex(
                        i =>
                            i.txid ===
                            '7440fb8810610f29197701c53f4a29479a9aede8c66feabb44b049232f990791',
                    )
                ],
                config.aliasConstants,
            ),
            false,
        );
    });
    it('Correctly parses all aliases through transactions at test address ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8', function () {
        assert.deepEqual(
            getAliasTxs(testAddressAliases.txHistory, config.aliasConstants),
            testAddressAliases.allAliasTxs,
        );
    });
    it('Correctly parses all aliases through transactions at test address ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8 including unconfirmed txs', function () {
        assert.deepEqual(
            getAliasTxs(
                testAddressAliasesWithUnconfirmedTxs.txHistory,
                config.aliasConstants,
            ),
            testAddressAliasesWithUnconfirmedTxs.allAliasTxs,
        );
    });
    it('Correctly sorts simple template alias txs including unconfirmed alias txs by blockheight and txid', function () {
        assert.deepEqual(
            sortAliasTxsByTxidAndBlockheight(aliases_fake_data.unsortedSimple),
            aliases_fake_data.sortedSimple,
        );
    });
    it('Correctly sorts template alias txs including unconfirmed alias txs by blockheight and txid', function () {
        assert.deepEqual(
            sortAliasTxsByTxidAndBlockheight(aliases_fake_data.allAliasTxs),
            aliases_fake_data.allAliasTxsSortedByTxidAndBlockheight,
        );
    });
    it('Correctly sorts alias txs including unconfirmed alias txs by blockheight and txid', function () {
        assert.deepEqual(
            sortAliasTxsByTxidAndBlockheight(
                testAddressAliasesWithUnconfirmedTxs.allAliasTxs,
            ),
            testAddressAliasesWithUnconfirmedTxs.allAliasTxsSortedByTxidAndBlockheight,
        );
    });
    it('Correctly returns only valid alias registrations at test address ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8', function () {
        assert.deepEqual(
            getValidAliasRegistrations(testAddressAliases.allAliasTxs),
            {
                validAliasTxs: testAddressAliases.validAliasTxs,
                pendingAliasTxs: [],
            },
        );
    });
    it('Correctly returns valid and pending alias registrations at test address ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8', function () {
        assert.deepEqual(
            getValidAliasRegistrations(
                testAddressAliasesWithUnconfirmedTxs.allAliasTxs,
            ),
            {
                validAliasTxs:
                    testAddressAliasesWithUnconfirmedTxs.validAliasTxs,
                pendingAliasTxs:
                    testAddressAliasesWithUnconfirmedTxs.pendingAliasTxs,
            },
        );
    });
    it('getValidAliasRegistrations recognizes case variations of a taken alias as invalid', function () {
        assert.deepEqual(
            getValidAliasRegistrations(aliases_fake_data.allAliasTxsMixedCases),
            {
                validAliasTxs: aliases_fake_data.validAliasTxsMixedCases,
                pendingAliasTxs: [],
            },
        );
    });
});
