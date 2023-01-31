const assert = require('assert');
const { parseAliasTx } = require('../alias');
const { aliasTxHistory } = require('./mocks/aliasMocks');

describe('alias-server alias.js', function () {
    it('Correctly parses a 5-character alias transaction', function () {
        assert.deepEqual(parseAliasTx(aliasTxHistory[0]), {
            address: 'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed',
            alias: 'foo10',
            txid: '9d9fd465f56a7946c48b2e214386b51d7968a3a40d46cc697036e4fc1cc644df',
        });
    });
    it('Correctly parses a 6-character alias transaction', function () {
        assert.deepEqual(parseAliasTx(aliasTxHistory[1]), {
            address: 'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed',
            alias: 'django',
            txid: '36fdab59d25625b6ff3661aa5ab22a4893698fa5618e5e958e1d75bf921e6107',
        });
    });
});
