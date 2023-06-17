// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
/**
 * Selection of OP codes for ecash currently supported by ecash-script
 * Ref https://en.bitcoin.it/wiki/Script
 */
'use strict';
module.exports = {
    /** https://github.com/Bitcoin-ABC/bitcoin-abc/blob/50e283e84303d17be0a22a0be303b8d9108e09a1/src/script/standard.h#L38
     * Default setting for nMaxDatacarrierBytes. 220 bytes of data, +1 for
     * OP_RETURN, +2 for the pushdata opcodes.
     * static const unsigned int MAX_OP_RETURN_RELAY = 223;
     */
    maxBytes: 223,
    /**
     * oneByteStackAdds
     * These bytes may be pushed to OP_RETURN msg in isolation
     * The alias registration version number must be pushed using one of these OP codes
     */
    oneByteStackAdds: [
        '00', // OP_0
        '4f', // OP_1NEGATE The number -1 is pushed onto the stack.
        '50', // OP_RESERVED Transaction is invalid unless occuring in an unexecuted OP_IF branch
        '51', // OP_1
        '52', // OP_2
        '53', // OP_3
        '54', // OP_4
        '55', // OP_5
        '56', // OP_6
        '57', // OP_7
        '58', // OP_8
        '59', // OP_9
        '5a', // OP_10
        '5b', // OP_11
        '5c', // OP_12
        '5d', // OP_13
        '5e', // OP_14
        '5f', // OP_15
        '60', // OP_16
    ],
    /**
     * oneBytePushdatas
     *
     * These bytes represent pushdata
     * Defined as an array of strings to avoid ambiguities with javascript parseInt('0x**', 16)
     * e.g. parseInt('4j', 16) = 4 ... but we don't want this to be valid
     * ... possibly impossible for this to ever get into an OP_RETURN string
     */
    oneBytePushdatas: [
        '01',
        '02',
        '03',
        '04',
        '05',
        '06',
        '07',
        '08',
        '09',
        '0a',
        '0b',
        '0c',
        '0d',
        '0e',
        '0f',
        '10',
        '11',
        '12',
        '13',
        '14',
        '15',
        '16',
        '17',
        '18',
        '19',
        '1a',
        '1b',
        '1c',
        '1d',
        '1e',
        '1f',
        '20',
        '21',
        '22',
        '23',
        '24',
        '25',
        '26',
        '27',
        '28',
        '29',
        '2a',
        '2b',
        '2c',
        '2d',
        '2e',
        '2f',
        '30',
        '31',
        '32',
        '33',
        '34',
        '35',
        '36',
        '37',
        '38',
        '39',
        '3a',
        '3b',
        '3c',
        '3d',
        '3e',
        '3f',
        '40',
        '41',
        '42',
        '43',
        '44',
        '45',
        '46',
        '47',
        '48',
        '49',
        '4a',
        '4b',
    ],
    OP_PUSHDATA1: '4c', // The next byte contains the number of bytes to be pushed onto the stack.
    OP_PUSHDATA2: '4d', // The next two bytes contain the number of bytes to be pushed onto the stack in little endian order.
    OP_PUSHDATA4: '4e', // The next four bytes contain the number of bytes to be pushed onto the stack in little endian order.
    OP_RETURN: '6a',
};
