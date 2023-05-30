// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const { consume } = require('../src/script');

describe('alias-server script.js', function () {
    it('consume gets the first byte from the stack of a hex string outputScript and removes the same from the input', function () {
        const testStack = {
            remainingHex:
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        };
        assert.strictEqual(consume(testStack, 1), '6a');
        assert.deepEqual(testStack, {
            remainingHex:
                '042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        });
    });
    it('consume throws an error if byteCount is not an integer and leaves input unmodified', function () {
        const testStack = {
            remainingHex:
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        };
        assert.throws(() => {
            consume(testStack, 1.5);
        }, Error('byteCount must be an integer, received 1.5'));

        // Ensure testStack is not modified
        assert.deepEqual(testStack, {
            remainingHex:
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        });
    });
    it('consume gets the full length of the stack of a hex string outputScript', function () {
        const testStack = {
            remainingHex:
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        };
        assert.strictEqual(
            consume(testStack, 51),

            '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        );
        assert.deepEqual(testStack, {
            remainingHex: '',
        });
    });
    it('consume throws an error if called with byteCount greater than outputScript', function () {
        const testStack = {
            remainingHex:
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        };
        assert.throws(() => {
            consume(testStack, 52);
        }, Error('consume called with byteCount (52) greater than remaining bytes in outputScript (51)'));
        // Ensure testStack is not modified
        assert.deepEqual(testStack, {
            remainingHex:
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        });
    });
    it('consume consumes nothing if called with 0', function () {
        const testStack = {
            remainingHex:
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        };
        assert.strictEqual(consume(testStack, 0), '');
        // Ensure testStack is not modified
        assert.deepEqual(testStack, {
            remainingHex:
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        });
    });
    it('consume throws an error if stack.remainingHex.length is odd', function () {
        const testStack = {
            remainingHex:
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f',
        };
        assert.throws(() => {
            consume(testStack, 1);
        }, Error('Invalid input: stack.remainingHex must be divisible by bytes, i.e. have an even length.'));
        // Ensure testStack is not modified
        assert.deepEqual(testStack, {
            remainingHex:
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f',
        });
    });
    it('consume throws an error if called with a bad key name', function () {
        const testStack = {
            remainingHexOpReturn:
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        };
        assert.throws(() => {
            consume(testStack, 1);
        }, Error('Invalid input. Stack must be an object with string stored at key remainingHex.'));

        // Ensure testStack is not modified
        assert.deepEqual(testStack, {
            remainingHexOpReturn:
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        });
    });
    it('consume throws an error if stack.remainingHex is an array', function () {
        const testStack = {
            remainingHex: [
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
            ],
        };
        assert.throws(() => {
            consume(testStack, 1);
        }, Error('Invalid input. Stack must be an object with string stored at key remainingHex.'));

        // Ensure testStack is not modified
        assert.deepEqual(testStack, {
            remainingHex: [
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
            ],
        });
    });
    it('consume throws an error if called with string', function () {
        const testStack =
            '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6';

        assert.throws(() => {
            consume(testStack, 1);
        }, Error('Invalid input. Stack must be an object with string stored at key remainingHex.'));

        // Ensure testStack is not modified
        assert.strictEqual(
            testStack,
            '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        );
    });
});
