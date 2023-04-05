'use strict'
const assert = require('assert');
const { returnAddressPreview } = require('../src/utils');
const { addressPreviews } = require('./mocks/templates');

describe('ecash-telegram-bot utils.js functions', function () {
    it('returnAddressPreview converts a valid ecash: address into an abbreviated preview at various slice sizes', function () {
        for (let i = 0; i < addressPreviews.length; i += 1) {
            const { address, preview, sliceSize } = addressPreviews[i];
            assert.strictEqual(
                returnAddressPreview(address, sliceSize),
                preview,
            );
        }
    });
});
