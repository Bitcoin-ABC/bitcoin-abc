// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const { isHexString, swapEndianness } = require('../src/utils');
const { Random, MersenneTwister19937 } = require('random-js');

describe('utils.js', function () {
    it('isHexString returns true for a valid lowercase hex string', function () {
        assert.strictEqual(
            isHexString(
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
            ),
            true,
        );
    });
    it('isHexString returns true for a valid upper case hex string', function () {
        assert.strictEqual(
            isHexString(
                '6A042E78656300154361706974616C4C6574746572735F416E645F2B21150076458DB0ED96FE9863FC1CCEC9FA2CFAB884B0F6',
            ),
            true,
        );
    });
    it('isHexString returns true for a hex string including all valid characters', function () {
        assert.strictEqual(isHexString('0123456789abcdef'), true);
    });
    it('isHexString returns false if an invalid character is present', function () {
        assert.strictEqual(isHexString('0123456789abcdefg'), false);
    });
    it('swapEndianness leaves a 1-byte hex string unmodified', function () {
        assert.strictEqual(swapEndianness('04'), '04');
    });
    it('swapEndianness converts a 2-byte little-endian string to big-endian', function () {
        assert.strictEqual(swapEndianness('2211'), '1122');
    });
    it('swapEndianness converts a 4-byte little-endian string to big-endian', function () {
        assert.strictEqual(swapEndianness('44332211'), '11223344');
    });
    it('swapEndianness converts a 9-byte little-endian string to big-endian', function () {
        assert.strictEqual(
            swapEndianness('998877665544332211'),
            '112233445566778899',
        );
    });
    it('swapEndianness throws an error if input hexString has odd length', function () {
        const hexString = '300';
        assert.throws(() => {
            swapEndianness(hexString);
        }, Error(`Invalid input length ${hexString.length}: hexString must be divisible by bytes, i.e. have an even length.`));
    });
    it('swapEndianness throws an error if input hexString contains non-hexadecimal characters', function () {
        const hexString = '0123456789abcdefgh';
        assert.throws(() => {
            swapEndianness(hexString);
        }, Error(`Invalid input. ${hexString} contains non-hexadecimal characters.`));
    });
    it('swapEndianness converts random hex strings to and from swapped endian-ness', function () {
        const random = new Random(MersenneTwister19937.seed(42));

        // Test random hex strings between 2 and 20 characters in length
        for (let strLength = 2; strLength <= 20; strLength += 2) {
            const randomHexString = random.hex(strLength);

            assert.strictEqual(
                swapEndianness(swapEndianness(randomHexString)),
                randomHexString,
            );
        }
    });
});
