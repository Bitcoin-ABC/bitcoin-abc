// Copyright (c) 2017-2018 Emilio Almansi
// Copyright (c) 2017 Pieter Wuille
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';

var validate = require('./validation').validate;

/**
 * Converts an array of integers made up of 'from' bits into an
 * array of integers made up of 'to' bits. The output array is
 * zero-padded if necessary, unless strict mode is true.
 * Throws a {@link ValidationError} if input is invalid.
 * Original by Pieter Wuille: https://github.com/sipa/bech32.
 *
 * @param {Uint8Array} data Array of integers made up of 'from' bits.
 * @param {number} from Length in bits of elements in the input array.
 * @param {number} to Length in bits of elements in the output array.
 * @param {bool} strictMode Require the conversion to be completed without padding.
 * @returns {Uint8Array}
 */
module.exports = function (data, from, to, strictMode) {
    var length = strictMode
        ? Math.floor((data.length * from) / to)
        : Math.ceil((data.length * from) / to);
    var mask = (1 << to) - 1;
    var result = new Uint8Array(length);
    var index = 0;
    var accumulator = 0;
    var bits = 0;
    for (var i = 0; i < data.length; ++i) {
        var value = data[i];
        validate(
            0 <= value && value >> from === 0,
            'Invalid value: ' + value + '.',
        );
        accumulator = (accumulator << from) | value;
        bits += from;
        while (bits >= to) {
            bits -= to;
            result[index] = (accumulator >> bits) & mask;
            ++index;
        }
    }
    if (!strictMode) {
        if (bits > 0) {
            result[index] = (accumulator << (to - bits)) & mask;
            ++index;
        }
    } else {
        validate(
            bits < from && ((accumulator << (to - bits)) & mask) === 0,
            'Input cannot be converted to ' +
                to +
                ' bits without padding, but strict mode was used.',
        );
    }
    return result;
};
