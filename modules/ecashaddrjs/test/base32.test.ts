/**
 * @license
 * https://reviews.bitcoinabc.org
 * Copyright (c) 2017-2020 Emilio Almansi
 * Copyright (c) 2023 Bitcoin ABC
 * Distributed under the MIT software license, see the accompanying
 * file LICENSE or http://www.opensource.org/licenses/mit-license.php.
 */

import { assert } from 'chai';
import base32, { CHARSET } from '../src/base32';
import { Random, MersenneTwister19937 } from 'random-js';
import validation from '../src/validation';
const { ValidationError } = validation;

describe('base32', () => {
    const random = new Random(MersenneTwister19937.seed(42));

    function getRandomData(size: number): Uint8Array {
        const data = new Uint8Array(size);
        for (let i = 0; i < size; ++i) {
            data[i] = random.integer(0, 31);
        }
        return data;
    }

    describe('#encode()', () => {
        it('should fail on invalid input', () => {
            const INVALID_INPUTS = [
                undefined,
                'some string',
                1234.567,
                new Uint8Array([100, 2, 3, 4]),
            ];
            for (const input of INVALID_INPUTS) {
                assert.throws(
                    () => base32.encode(input as unknown as Uint8Array),
                    ValidationError,
                );
            }
        });

        it('should encode single digits correctly', () => {
            for (let i = 0; i < CHARSET.length; ++i) {
                const testArray = new Uint8Array([i]);
                assert.equal(CHARSET[i], base32.encode(testArray));
            }
        });
    });

    describe('#decode()', () => {
        it('should fail on invalid input', () => {
            const INVALID_INPUTS = [undefined, 1234.567, [1, 2, 3, 4], 'b'];
            for (const input of INVALID_INPUTS) {
                assert.throws(
                    () => base32.decode(input as unknown as string),
                    ValidationError,
                );
            }
        });

        it('should decode single digits correctly', () => {
            for (let i = 0; i < CHARSET.length; ++i) {
                const decoded = base32.decode(CHARSET[i]);
                assert.equal(decoded.length, 1);
                assert.equal(i, decoded[0]);
            }
        });
    });

    describe('#encode() #decode()', () => {
        it('should encode and decode random data correctly', () => {
            const NUM_TESTS = 2000;
            for (let i = 0; i < NUM_TESTS; ++i) {
                const data = getRandomData(1000);
                const x = base32.encode(data);
                assert.deepEqual(base32.decode(x), data);
            }
        });
    });
});
