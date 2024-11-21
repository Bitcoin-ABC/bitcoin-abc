/**
 * @license
 * https://reviews.bitcoinabc.org
 * Copyright (c) 2017-2020 Emilio Almansi
 * Copyright (c) 2023 Bitcoin ABC
 * Distributed under the MIT software license, see the accompanying
 * file LICENSE or http://www.opensource.org/licenses/mit-license.php.
 */

import { assert } from 'chai';
import convertBits from '../src/convertBits';
import { Random, MersenneTwister19937 } from 'random-js';
import validation from '../src/validation';
const { ValidationError } = validation;

describe('#convertBits()', () => {
    const random = new Random(MersenneTwister19937.seed(42));

    function getRandomData(size: number, max: number): Uint8Array {
        const data = new Uint8Array(size);
        for (let i = 0; i < size; ++i) {
            data[i] = random.integer(0, max);
        }
        return data;
    }

    it('should fail if it receives an invalid value', () => {
        assert.throws(() => {
            convertBits([100] as unknown as Uint8Array, 5, 8);
        }, ValidationError);
    });

    it('should fail in strict mode if padding is needed', () => {
        const data = getRandomData(10, 31);
        assert.throws(() => {
            convertBits(data, 5, 8, true);
        }, ValidationError);
    });

    it('should convert both ways successfully', () => {
        const data1 = getRandomData(80, 31);
        assert.deepEqual(convertBits(convertBits(data1, 5, 8), 8, 5), data1);
        const data2 = getRandomData(80, 255);
        assert.deepEqual(convertBits(convertBits(data2, 8, 5), 5, 8), data2);
    });
});
