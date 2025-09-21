// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import {
    getStackArray,
    consume,
    consumeNextPush,
    swapEndianness,
} from './opreturn.js';

describe('parse/opreturn.ts', function () {
    context('getStackArray', function () {
        it('throws an error if called with a non-string', function () {
            const outputScript = { remainingHex: '0401020304' } as any;

            expect(() => {
                getStackArray(outputScript);
            }).to.throw('outputScript must be a string that starts with 6a');
        });

        it('throws an error if called with a string that is not an OP_RETURN outputScript', function () {
            const outputScript = '0401020304';

            expect(() => {
                getStackArray(outputScript);
            }).to.throw('outputScript must be a string that starts with 6a');
        });

        it('throws an error if called with a string that is too long to be a valid eCash OP_RETURN', function () {
            const outputScript = '6a' + '00'.repeat(224 * 2); // 224 bytes = 448 hex chars

            expect(() => {
                getStackArray(outputScript);
            }).to.throw(
                'Invalid eCash OP_RETURN size: 449 bytes. eCash OP_RETURN outputs cannot exceed 223 bytes.',
            );
        });

        it('throws an error if called with a string that has an odd number of characters', function () {
            const outputScript =
                '6a042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f';

            expect(() => {
                getStackArray(outputScript);
            }).to.throw(
                'Invalid input: stack.remainingHex must be divisible by bytes, i.e. have an even length.',
            );
        });

        it('returns the expected stackArray from a valid OP_RETURN outputScript', function () {
            const outputScript =
                '6a042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6';

            expect(getStackArray(outputScript)).to.deep.equal([
                '2e786563',
                '00',
                '333333',
                '0076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
            ]);
        });

        it('returns the expected stackArray from a valid OP_RETURN outputScript of maximum valid bytes', function () {
            const maxData = '00'.repeat(220); // 220 bytes of zeros
            const outputScript = '6a4cdc' + maxData; // 4c = OP_PUSHDATA1, dc = 220 in hex

            expect(getStackArray(outputScript)).to.deep.equal([maxData]);
        });

        it('handles one-byte stack additions correctly', function () {
            const outputScript = '6a0051525354'; // OP_0, OP_1, OP_2, OP_3, OP_4

            expect(getStackArray(outputScript)).to.deep.equal([
                '00', // OP_0
                '51', // OP_1
                '52', // OP_2
                '53', // OP_3
                '54', // OP_4
            ]);
        });

        it('handles OP_PUSHDATA1 correctly', function () {
            const outputScript = '6a4c04' + '12345678'; // OP_PUSHDATA1 with 4 bytes

            expect(getStackArray(outputScript)).to.deep.equal(['12345678']);
        });

        it('handles OP_PUSHDATA2 correctly', function () {
            const outputScript = '6a4d0400' + '12345678'; // OP_PUSHDATA2 with 4 bytes

            expect(getStackArray(outputScript)).to.deep.equal(['12345678']);
        });

        it('handles OP_PUSHDATA4 correctly', function () {
            const outputScript = '6a4e04000000' + '12345678'; // OP_PUSHDATA4 with 4 bytes

            expect(getStackArray(outputScript)).to.deep.equal(['12345678']);
        });

        it('handles mixed push types correctly', function () {
            const outputScript = '6a00514c0212344d0400567890ab'; // OP_0, OP_1, OP_PUSHDATA1(2 bytes), OP_PUSHDATA2(4 bytes)

            expect(getStackArray(outputScript)).to.deep.equal([
                '00', // OP_0
                '51', // OP_1
                '1234', // OP_PUSHDATA1 data
                '567890ab', // OP_PUSHDATA2 data
            ]);
        });

        it('handles empty OP_RETURN correctly', function () {
            const outputScript = '6a'; // Just OP_RETURN with no data

            expect(getStackArray(outputScript)).to.deep.equal([]);
        });

        it('returns the expected stackArray from a valid OP_RETURN outputScript with different pushdata encodings', function () {
            const expectedPushes = [
                '2e786563', // .xec
                '00', // version 0
                '4361706974616c4c6574746572735f416e645f2b21', // alias in hex
                '0076458db0ed96fe9863fc1ccec9fa2cfab884b0f6', // <addressType><addressHash>
            ];

            // Test with OP_0 encoding (empty pushdata for second push)
            const outputScriptWithOpZero = `6a04${expectedPushes[0]}${expectedPushes[1]}15${expectedPushes[2]}15${expectedPushes[3]}`;
            expect(getStackArray(outputScriptWithOpZero)).to.deep.equal(
                expectedPushes,
            );

            // Test with one-byte pushdata encoding
            const outputScriptOneByte = `6a04${expectedPushes[0]}01${expectedPushes[1]}15${expectedPushes[2]}15${expectedPushes[3]}`;
            expect(getStackArray(outputScriptOneByte)).to.deep.equal(
                expectedPushes,
            );

            // Test with OP_PUSHDATA1 encoding
            const outputScriptPushData1 = `6a4c04${expectedPushes[0]}4c01${expectedPushes[1]}4c15${expectedPushes[2]}4c15${expectedPushes[3]}`;
            expect(getStackArray(outputScriptPushData1)).to.deep.equal(
                expectedPushes,
            );

            // Test with OP_PUSHDATA2 encoding
            const outputScriptPushData2 = `6a4d0400${expectedPushes[0]}4d0100${expectedPushes[1]}4d1500${expectedPushes[2]}4d1500${expectedPushes[3]}`;
            expect(getStackArray(outputScriptPushData2)).to.deep.equal(
                expectedPushes,
            );

            // Test with OP_PUSHDATA4 encoding
            const outputScriptPushData4 = `6a4e04000000${expectedPushes[0]}4e01000000${expectedPushes[1]}4e15000000${expectedPushes[2]}4e15000000${expectedPushes[3]}`;
            expect(getStackArray(outputScriptPushData4)).to.deep.equal(
                expectedPushes,
            );
        });
    });

    context('swapEndianness', function () {
        it('swaps endianness correctly', function () {
            expect(swapEndianness('44332211')).to.equal('11223344');
            expect(swapEndianness('04000000')).to.equal('00000004');
            expect(swapEndianness('1234')).to.equal('3412');
            expect(swapEndianness('12')).to.equal('12');
        });

        it('throws error for odd length input', function () {
            expect(() => swapEndianness('123')).to.throw(
                'Invalid input length 3: hexString must be divisible by bytes, i.e. have an even length.',
            );
        });

        it('throws error for non-hex characters', function () {
            expect(() => swapEndianness('12g4')).to.throw(
                'Invalid input. 12g4 contains non-hexadecimal characters.',
            );
        });
    });

    context('consume', function () {
        it('consumes bytes correctly', function () {
            const stack = { remainingHex: '6a042e786563' };
            expect(consume(stack, 1)).to.equal('6a');
            expect(stack.remainingHex).to.equal('042e786563');

            expect(consume(stack, 2)).to.equal('042e');
            expect(stack.remainingHex).to.equal('786563');
        });

        it('throws error for invalid stack object', function () {
            expect(() => consume({ remainingHex: 123 } as any, 1)).to.throw(
                'Invalid input. Stack must be an object with string stored at key remainingHex.',
            );
        });

        it('throws error for odd length hex', function () {
            const stack = { remainingHex: '6a1' };
            expect(() => consume(stack, 1)).to.throw(
                'Invalid input: stack.remainingHex must be divisible by bytes, i.e. have an even length.',
            );
        });

        it('throws error for non-integer byteCount', function () {
            const stack = { remainingHex: '6a' };
            expect(() => consume(stack, 1.5)).to.throw(
                'byteCount must be an integer, received 1.5',
            );
        });

        it('throws error when byteCount exceeds remaining bytes', function () {
            const stack = { remainingHex: '6a' };
            expect(() => consume(stack, 2)).to.throw(
                'consume called with byteCount (2) greater than remaining bytes in outputScript (1)',
            );
        });
    });

    context('consumeNextPush', function () {
        it('handles one-byte stack additions', function () {
            const stack = { remainingHex: '00' };
            const result = consumeNextPush(stack);
            expect(result).to.deep.equal({ data: '00', pushedWith: '00' });
            expect(stack.remainingHex).to.equal('');

            const stack2 = { remainingHex: '51' };
            const result2 = consumeNextPush(stack2);
            expect(result2).to.deep.equal({ data: '51', pushedWith: '51' });
            expect(stack2.remainingHex).to.equal('');
        });

        it('handles one-byte pushdata', function () {
            const stack = { remainingHex: '042e786563' };
            const result = consumeNextPush(stack);
            expect(result).to.deep.equal({
                data: '2e786563',
                pushedWith: '04',
            });
            expect(stack.remainingHex).to.equal('');
        });

        it('handles OP_PUSHDATA1', function () {
            const stack = { remainingHex: '4c0412345678' };
            const result = consumeNextPush(stack);
            expect(result).to.deep.equal({
                data: '12345678',
                pushedWith: '4c04',
            });
            expect(stack.remainingHex).to.equal('');
        });

        it('handles OP_PUSHDATA2', function () {
            const stack = { remainingHex: '4d040012345678' };
            const result = consumeNextPush(stack);
            expect(result).to.deep.equal({
                data: '12345678',
                pushedWith: '4d0400',
            });
            expect(stack.remainingHex).to.equal('');
        });

        it('handles OP_PUSHDATA4', function () {
            const stack = { remainingHex: '4e0400000012345678' };
            const result = consumeNextPush(stack);
            expect(result).to.deep.equal({
                data: '12345678',
                pushedWith: '4e04000000',
            });
            expect(stack.remainingHex).to.equal('');
        });

        it('throws error for invalid pushdata', function () {
            const stack = { remainingHex: '61' }; // OP_NOP
            expect(() => consumeNextPush(stack)).to.throw(
                '61 is invalid pushdata',
            );
        });

        it('leaves stack unmodified on error', function () {
            const originalStack = { remainingHex: '61' };
            const stack = { remainingHex: '61' };
            expect(() => consumeNextPush(stack)).to.throw();
            expect(stack.remainingHex).to.equal(originalStack.remainingHex);
        });
    });
});
