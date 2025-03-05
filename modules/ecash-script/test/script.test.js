// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const { consume, consumeNextPush, getStackArray } = require('../src/script');
const opReturn = require('../constants/op_return');

describe('script.js', function () {
    it('consume gets the first byte from the stack of a hex string outputScript and removes the same from the input', function () {
        const testStack = {
            remainingHex: '6a',
        };
        assert.strictEqual(consume(testStack, 1), '6a');
        assert.deepEqual(testStack, {
            remainingHex: '',
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
    it('consumeNextPush returns expected pushdata for an OP_RETURN stack', function () {
        const expectedPushes = [
            '2e786563', // .xec
            '00', // version 0
            '4361706974616c4c6574746572735f416e645f2b21', // alias in hex
            '0076458db0ed96fe9863fc1ccec9fa2cfab884b0f6', // <addressType><addressHash>
        ];
        const pushdatas = {
            withOpZero: ['04', '', '15', '15'],
            oneByte: ['04', '01', '15', '15'],
            OP_PUSHDATA1: [
                `${opReturn.OP_PUSHDATA1}04`,
                `${opReturn.OP_PUSHDATA1}01`,
                `${opReturn.OP_PUSHDATA1}15`,
                `${opReturn.OP_PUSHDATA1}15`,
            ],
            OP_PUSHDATA2: [
                `${opReturn.OP_PUSHDATA2}0400`,
                `${opReturn.OP_PUSHDATA2}0100`,
                `${opReturn.OP_PUSHDATA2}1500`,
                `${opReturn.OP_PUSHDATA2}1500`,
            ],
            OP_PUSHDATA4: [
                `${opReturn.OP_PUSHDATA4}04000000`,
                `${opReturn.OP_PUSHDATA4}01000000`,
                `${opReturn.OP_PUSHDATA4}15000000`,
                `${opReturn.OP_PUSHDATA4}15000000`,
            ],
        };

        const pushdataTypes = Object.keys(pushdatas);

        // Test alias registration tx on all pushdatas
        for (let i = 0; i < pushdataTypes.length; i += 1) {
            const thesePushdatas = pushdatas[pushdataTypes[i]];
            const testStack = {
                remainingHex: `${thesePushdatas[0]}${expectedPushes[0]}${thesePushdatas[1]}${expectedPushes[1]}${thesePushdatas[2]}${expectedPushes[2]}${thesePushdatas[3]}${expectedPushes[3]}`,
            };
            // First push, prefix
            assert.deepEqual(consumeNextPush(testStack), {
                data: expectedPushes[0],
                pushedWith: thesePushdatas[0],
            });
            // Stack is modified so that push is removed
            assert.deepEqual(testStack, {
                remainingHex: `${thesePushdatas[1]}${expectedPushes[1]}${thesePushdatas[2]}${expectedPushes[2]}${thesePushdatas[3]}${expectedPushes[3]}`,
            });

            // Second push, alias registration tx version number
            assert.deepEqual(consumeNextPush(testStack), {
                data: expectedPushes[1],
                pushedWith:
                    thesePushdatas[1] === ''
                        ? expectedPushes[1]
                        : thesePushdatas[1],
            });
            // Stack is modified so that push is removed
            assert.deepEqual(testStack, {
                remainingHex: `${thesePushdatas[2]}${expectedPushes[2]}${thesePushdatas[3]}${expectedPushes[3]}`,
            });

            // Third push, alias
            assert.deepEqual(consumeNextPush(testStack), {
                data: expectedPushes[2],
                pushedWith: thesePushdatas[2],
            });
            // Stack is modified so that push is removed
            assert.deepEqual(testStack, {
                remainingHex: `${thesePushdatas[3]}${expectedPushes[3]}`,
            });

            // Fourth push, <addressType><addressHash>
            assert.deepEqual(consumeNextPush(testStack), {
                data: expectedPushes[3],
                pushedWith: thesePushdatas[3],
            });
            // Stack is modified so that push is removed
            assert.deepEqual(testStack, {
                remainingHex: '',
            });
        }
    });
    it('consumeNextPush throws an error if the next push on the stack has invalid pushdata', function () {
        const testStack = {
            remainingHex:
                'ff042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        };

        assert.throws(() => {
            consumeNextPush(testStack);
        }, Error('ff is invalid pushdata'));

        // The stack is not modified
        assert.deepEqual(testStack, {
            remainingHex:
                'ff042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        });
    });
    it('consumeNextPush throws an error if first byte is OP_RETURN', function () {
        const testStack = {
            remainingHex:
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        };

        assert.throws(() => {
            consumeNextPush(testStack);
        }, Error('6a is invalid pushdata'));

        // The stack is not modified
        assert.deepEqual(testStack, {
            remainingHex:
                '6a042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        });
    });
    it('consumeNextPush throws an error if pushdata exceeds length of remaining string', function () {
        const testStack = {
            remainingHex:
                '4e040404042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        };

        assert.throws(() => {
            consumeNextPush(testStack);
        }, Error('consume called with byteCount (67372036) greater than remaining bytes in outputScript (49)'));

        // The stack is not modified
        assert.deepEqual(testStack, {
            remainingHex:
                '4e040404042e78656300154361706974616c4c6574746572735f416e645f2b21150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        });
    });
    it('consumeNextPush returns all one byte pushes and empty string for associated pushdata', function () {
        for (let i = 0; i < opReturn.oneByteStackAdds.length; i += 1) {
            const testHexString = opReturn.oneByteStackAdds[i];
            const stack = { remainingHex: testHexString };

            const firstPush = consumeNextPush(stack); // alias registration prefix

            // consumeNextPush returns the push of testHexString
            assert.deepEqual(firstPush, {
                data: opReturn.oneByteStackAdds[i],
                pushedWith: opReturn.oneByteStackAdds[i],
            });
            // Verify stack has been modified in place
            assert.deepEqual(stack, {
                remainingHex: '',
            });
        }
    });
    it('consumeNextPush throws an error if pushdata bytes are incorrect', function () {
        const testStack = {
            remainingHex: '4d4274657374',
        };

        assert.throws(() => {
            consumeNextPush(testStack);
        }, Error('consume called with byteCount (29762) greater than remaining bytes in outputScript (3)'));

        // The stack is not modified
        assert.deepEqual(testStack, {
            remainingHex: '4d4274657374',
        });
    });
    it('consumeNextPush throws an error if given only pushdata', function () {
        const testStack = {
            remainingHex: '4d0400',
        };

        assert.throws(() => {
            consumeNextPush(testStack);
        }, Error('consume called with byteCount (4) greater than remaining bytes in outputScript (0)'));

        // The stack is not modified
        assert.deepEqual(testStack, {
            remainingHex: '4d0400',
        });
    });
    it('consumeNextPush throws an error if given only improperly formed pushdata', function () {
        const testStack = {
            remainingHex: '4d42',
        };

        assert.throws(() => {
            consumeNextPush(testStack);
        }, Error('consume called with byteCount (2) greater than remaining bytes in outputScript (1)'));

        // The stack is not modified
        assert.deepEqual(testStack, {
            remainingHex: '4d42',
        });
    });
    it('getStackArray throws an error if called with a non-string', function () {
        const outputScript = { remainingHex: '0401020304' };

        assert.throws(() => {
            getStackArray(outputScript);
        }, Error(`outputScript must be a string that starts with ${opReturn.OP_RETURN}`));
    });
    it('getStackArray throws an error if called with a string that is not an OP_RETURN outputScript', function () {
        const outputScript = '0401020304';

        assert.throws(() => {
            getStackArray(outputScript);
        }, Error(`outputScript must be a string that starts with ${opReturn.OP_RETURN}`));
    });
    it('getStackArray throws an error if called with a string that is too long to be a valid eCash OP_RETURN', function () {
        const outputScript =
            '6a042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6';

        assert.throws(() => {
            getStackArray(outputScript);
        }, Error(`Invalid eCash OP_RETURN size: ${outputScript.length / 2} bytes. eCash OP_RETURN outputs cannot exceed ${opReturn.maxBytes} bytes.`));
    });
    it('getStackArray throws an error if called with a string that has an odd number of characters', function () {
        const outputScript =
            '6a042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f';

        // Error from consumeNextPush validation
        assert.throws(() => {
            getStackArray(outputScript);
        }, Error(`Invalid input: stack.remainingHex must be divisible by bytes, i.e. have an even length.`));
    });
    it('getStackArray returns the expected stackArray from a valid OP_RETURN outputScript', function () {
        const outputScript =
            '6a042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6';

        // The stack is not modified
        assert.deepEqual(getStackArray(outputScript), [
            '2e786563',
            '00',
            '333333',
            '0076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        ]);
    });
    it('getStackArray returns the expected stackArray from a valid OP_RETURN outputScript of maximum valid bytes', function () {
        const outputScript =
            '6a04007461624cd754657374696e672074686520323535206c696d69742054657374696e672074686520323535206c696d69742054657374696e672074686520323535206c696d69742054657374696e672074686520323535206c696d69742054657374696e672074686520323535206c696d69742054657374696e672074686520323535206c696d69742054657374696e672074686520323535206c696d69742054657374696e672074686520323535206c696d69742054657374696e672074686520323535206c696d69742054657374696e672074686520323535206c';

        // The stack is not modified
        assert.deepEqual(getStackArray(outputScript), [
            '00746162',
            '54657374696e672074686520323535206c696d69742054657374696e672074686520323535206c696d69742054657374696e672074686520323535206c696d69742054657374696e672074686520323535206c696d69742054657374696e672074686520323535206c696d69742054657374696e672074686520323535206c696d69742054657374696e672074686520323535206c696d69742054657374696e672074686520323535206c696d69742054657374696e672074686520323535206c696d69742054657374696e672074686520323535206c',
        ]);
    });
});
