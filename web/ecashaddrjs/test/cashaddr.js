/**
 * https://github.com/ealmansi/cashaddrjs
 * Copyright (c) 2017-2020 Emilio Almansi
 * Distributed under the MIT software license, see the accompanying
 * file LICENSE or http://www.opensource.org/licenses/mit-license.php.
 */

/* global describe it */

const { assert } = require('chai');
const cashaddr = require('../src/cashaddr');
const { Random, MersenneTwister19937 } = require('random-js');

describe('cashaddr', () => {
    const NETWORKS = ['ecash', 'ectest', 'etoken'];

    const ADDRESS_TYPES = ['P2PKH', 'P2SH'];

    const VALID_SIZES = [20, 24, 28, 32, 40, 48, 56, 64];

    const TEST_HASHES = [
        new Uint8Array([
            118, 160, 64, 83, 189, 160, 168, 139, 218, 81, 119, 184, 106, 21,
            195, 178, 159, 85, 152, 115,
        ]),
        new Uint8Array([
            203, 72, 18, 50, 41, 156, 213, 116, 49, 81, 172, 75, 45, 99, 174,
            25, 142, 123, 176, 169,
        ]),
        new Uint8Array([
            1, 31, 40, 228, 115, 201, 95, 64, 19, 215, 213, 62, 197, 251, 195,
            180, 45, 248, 237, 16,
        ]),
    ];

    const EXPECTED_P2PKH_OUTPUTS = [
        'ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2',
        'ecash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4ykdcjcn6n',
        'ecash:qqq3728yw0y47sqn6l2na30mcw6zm78dzq653y7pv5',
    ];

    const EXPECTED_P2SH_OUTPUTS = [
        'ecash:ppm2qsznhks23z7629mms6s4cwef74vcwv2zrv3l8h',
        'ecash:pr95sy3j9xwd2ap32xkykttr4cvcu7as4ypg9alspw',
        'ecash:pqq3728yw0y47sqn6l2na30mcw6zm78dzqd3vtezhf',
    ];

    const EXPECTED_P2PKH_OUTPUTS_TESTNET = [
        'ectest:qpm2qsznhks23z7629mms6s4cwef74vcwvmvqr33lm',
        'ectest:qr95sy3j9xwd2ap32xkykttr4cvcu7as4ysxxjl7ez',
        'ectest:qqq3728yw0y47sqn6l2na30mcw6zm78dzqul0yev09',
    ];

    const EXPECTED_P2SH_OUTPUTS_TESTNET = [
        'ectest:ppm2qsznhks23z7629mms6s4cwef74vcwvvfavkjyx',
        'ectest:pr95sy3j9xwd2ap32xkykttr4cvcu7as4y8rmacazl',
        'ectest:pqq3728yw0y47sqn6l2na30mcw6zm78dzqt6jt705c',
    ];

    const random = new Random(MersenneTwister19937.seed(42));

    function getRandomHash(size) {
        const hash = new Uint8Array(size);
        for (let i = 0; i < size; ++i) {
            hash[i] = random.integer(0, 255);
        }
        return hash;
    }

    describe('#encode()', () => {
        it('should fail on an invalid prefix', () => {
            assert.throws(() => {
                cashaddr.encode(
                    'some invalid prefix',
                    ADDRESS_TYPES[0],
                    new Uint8Array([]),
                );
            }, cashaddr.ValidationError);
        });

        it('should fail on a prefix with mixed letter case', () => {
            assert.throws(() => {
                cashaddr.encode('EcAsH', ADDRESS_TYPES[0], new Uint8Array([]));
            }, cashaddr.ValidationError);
        });

        it('should fail on an invalid type', () => {
            assert.throws(() => {
                cashaddr.encode(
                    NETWORKS[0],
                    'some invalid type',
                    new Uint8Array([]),
                );
            }, cashaddr.ValidationError);
        });

        it('should fail on hashes of invalid length', () => {
            for (const size of VALID_SIZES) {
                const hash = getRandomHash(size - 1);
                assert.throws(() => {
                    cashaddr.encode(NETWORKS[0], ADDRESS_TYPES[0], hash);
                }, cashaddr.ValidationError);
            }
        });

        it('should encode test hashes on mainnet correctly', () => {
            for (const index in TEST_HASHES) {
                assert.equal(
                    cashaddr.encode('ecash', 'P2PKH', TEST_HASHES[index]),
                    EXPECTED_P2PKH_OUTPUTS[index],
                );
                assert.equal(
                    cashaddr.encode('ecash', 'P2SH', TEST_HASHES[index]),
                    EXPECTED_P2SH_OUTPUTS[index],
                );
            }
        });

        it('should encode test hashes on testnet correctly', () => {
            for (const index in TEST_HASHES) {
                assert.equal(
                    cashaddr.encode('ectest', 'P2PKH', TEST_HASHES[index]),
                    EXPECTED_P2PKH_OUTPUTS_TESTNET[index],
                );
                assert.equal(
                    cashaddr.encode('ectest', 'P2SH', TEST_HASHES[index]),
                    EXPECTED_P2SH_OUTPUTS_TESTNET[index],
                );
            }
        });
    });

    describe('#decode()', () => {
        it('should fail when the version byte is invalid', () => {
            assert.throws(() => {
                cashaddr.decode(
                    'ecash:zpm2qsznhks23z7629mms6s4cwef74vcwv6ddac6re',
                );
            }, cashaddr.ValidationError);
        });

        it('should fail when given an address with mixed letter case', () => {
            assert.throws(() => {
                cashaddr.decode(
                    'ecash:QPM2QSZNHKS23Z7629MMS6s4cwef74vcwvA87RKUU2',
                );
            }, cashaddr.ValidationError);
            assert.throws(() => {
                cashaddr.decode(
                    'eCASH:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2',
                );
            }, cashaddr.ValidationError);
            assert.throws(() => {
                cashaddr.decode(
                    'Ecash:QPM2QSZNHKS23Z7629MMS6s4cwef74vcwvA87RKUU2',
                );
            }, cashaddr.ValidationError);
        });

        it('should decode a valid address regardless of letter case', () => {
            assert.deepEqual(
                cashaddr.decode(
                    'ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2',
                ).hash,
                cashaddr.decode(
                    'ECASH:QPM2QSZNHKS23Z7629MMS6S4CWEF74VCWVA87RKUU2',
                ).hash,
            );
        });

        it('should accept prefixless input if checksum is valid', () => {
            assert.deepEqual(
                cashaddr.decode('qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2')
                    .hash,
                cashaddr.decode(
                    'ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2',
                ).hash,
            );
        });

        it('should reject prefixless input if checksum is invalid', () => {
            assert.throws(() => {
                cashaddr.decode(
                    'qpm2qsznhks23z7629mms6s4cwef74vcwvINVALIDCHECKSUM',
                );
            }, cashaddr.ValidationError);
        });

        it('should reject any input that has two prefixes for some reason', () => {
            assert.throws(() => {
                cashaddr.decode(
                    'ecash:bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2',
                );
            }, cashaddr.ValidationError);
        });

        it('should fail when decoding for a different network', () => {
            for (const network of NETWORKS) {
                for (const anotherNetwork of NETWORKS) {
                    if (network !== anotherNetwork) {
                        const hash = getRandomHash(20);
                        assert.throws(() => {
                            const address = cashaddr.encode(
                                network,
                                ADDRESS_TYPES[0],
                                hash,
                            );
                            const invalidAddress = [
                                anotherNetwork,
                                address.split(':')[1],
                            ].join(':');
                            cashaddr.decode(invalidAddress);
                        }, cashaddr.ValidationError);
                    }
                }
            }
        });
    });

    describe('#encode() #decode()', () => {
        it('should encode and decode all sizes correctly', () => {
            for (const size of VALID_SIZES) {
                const hash = getRandomHash(size);
                const address = cashaddr.encode(
                    NETWORKS[0],
                    ADDRESS_TYPES[0],
                    hash,
                );
                const {
                    prefix,
                    type,
                    hash: actualHash,
                } = cashaddr.decode(address);
                assert.equal(prefix, NETWORKS[0]);
                assert.equal(type, ADDRESS_TYPES[0]);
                assert.deepEqual(actualHash, hash);
            }
        });

        it('should encode and decode all types and networks', () => {
            for (const type of ADDRESS_TYPES) {
                for (const network of NETWORKS) {
                    const hash = getRandomHash(20);
                    const address = cashaddr.encode(network, type, hash);
                    const {
                        prefix,
                        type: actualType,
                        hash: actualHash,
                    } = cashaddr.decode(address);
                    assert.equal(prefix, network);
                    assert.equal(actualType, type);
                    assert.deepEqual(actualHash, hash);
                }
            }
        });

        it('should encode and decode many random hashes', () => {
            const NUM_TESTS = 1000;
            for (let i = 0; i < NUM_TESTS; ++i) {
                for (const type of ADDRESS_TYPES) {
                    const hash = getRandomHash(20);
                    const address = cashaddr.encode(NETWORKS[0], type, hash);
                    const {
                        prefix,
                        type: actualType,
                        hash: actualHash,
                    } = cashaddr.decode(address);
                    assert.equal(prefix, NETWORKS[0]);
                    assert.equal(actualType, type);
                    assert.deepEqual(actualHash, hash);
                }
            }
        });
    });
});
