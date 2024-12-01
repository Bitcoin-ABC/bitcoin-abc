/**
 * @license
 * https://reviews.bitcoinabc.org
 * Copyright (c) 2017-2020 Emilio Almansi
 * Copyright (c) 2023 Bitcoin ABC
 * Distributed under the MIT software license, see the accompanying
 * file LICENSE or http://www.opensource.org/licenses/mit-license.php.
 */

import {
    encodeCashAddress,
    decodeCashAddress,
    uint8arrayToHexString,
    getTypeAndHashFromOutputScript,
    getOutputScriptFromAddress,
    isValidCashAddress,
    encodeOutputScript,
    getOutputScriptFromTypeAndHash,
} from '../src/cashaddr';
import { AddressType } from '../src/types';
import { assert } from 'chai';
import { Random, MersenneTwister19937 } from 'random-js';
import validation from '../src/validation';
const { ValidationError } = validation;

describe('cashaddr', () => {
    const NETWORKS = ['ecash', 'ectest', 'etoken'];

    const ADDRESS_TYPES: AddressType[] = ['p2pkh', 'p2sh'];

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

    const TEST_HASHES_STRINGS = [
        '76a04053bda0a88bda5177b86a15c3b29f559873',
        'cb481232299cd5743151ac4b2d63ae198e7bb0a9',
        '011f28e473c95f4013d7d53ec5fbc3b42df8ed10',
    ];

    const TEST_P2PKH_OUTPUTSCRIPTS = [
        '76a91476a04053bda0a88bda5177b86a15c3b29f55987388ac',
        '76a914cb481232299cd5743151ac4b2d63ae198e7bb0a988ac',
        '76a914011f28e473c95f4013d7d53ec5fbc3b42df8ed1088ac',
    ];

    const EXPECTED_P2PKH_OUTPUTS = [
        'ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2',
        'ecash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4ykdcjcn6n',
        'ecash:qqq3728yw0y47sqn6l2na30mcw6zm78dzq653y7pv5',
    ];

    const TEST_P2SH_OUTPUTSCRIPTS = [
        'a91476a04053bda0a88bda5177b86a15c3b29f55987387',
        'a914cb481232299cd5743151ac4b2d63ae198e7bb0a987',
        'a914011f28e473c95f4013d7d53ec5fbc3b42df8ed1087',
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

    const ALL_VALID_MAINNET_ADDRESSES = EXPECTED_P2PKH_OUTPUTS.concat(
        EXPECTED_P2SH_OUTPUTS,
    );

    const ALL_VALID_TESTNET_ADDRESSES = EXPECTED_P2PKH_OUTPUTS_TESTNET.concat(
        EXPECTED_P2SH_OUTPUTS_TESTNET,
    );

    const ALL_VALID_ADDRESSES = ALL_VALID_MAINNET_ADDRESSES.concat(
        ALL_VALID_TESTNET_ADDRESSES,
    );

    const random = new Random(MersenneTwister19937.seed(42));

    function getRandomHash(size: number): Uint8Array {
        const hash = new Uint8Array(size);
        for (let i = 0; i < size; ++i) {
            hash[i] = random.integer(0, 255);
        }
        return hash;
    }

    describe('#encodeCashAddress()', () => {
        it('should fail on an invalid prefix', () => {
            assert.throws(() => {
                encodeCashAddress(
                    'some invalid prefix because spaces',
                    ADDRESS_TYPES[0],
                    new Uint8Array([]),
                );
            }, ValidationError);
        });

        it('should fail on a prefix with mixed letter case', () => {
            assert.throws(() => {
                encodeCashAddress(
                    'EcAsH',
                    ADDRESS_TYPES[0],
                    new Uint8Array([]),
                );
            }, ValidationError);
        });

        it('should fail on an invalid type', () => {
            assert.throws(() => {
                encodeCashAddress(
                    NETWORKS[0],
                    'some invalid type' as unknown as AddressType,
                    new Uint8Array([]),
                );
            }, ValidationError);
        });

        it('should fail on hashes of invalid length', () => {
            for (const size of VALID_SIZES) {
                const hash = getRandomHash(size - 1);
                assert.throws(() => {
                    encodeCashAddress(NETWORKS[0], ADDRESS_TYPES[0], hash);
                }, ValidationError);
            }
        });

        it('should encode test hashes on mainnet correctly with uint8Array hash input', () => {
            for (const index in TEST_HASHES) {
                assert.equal(
                    encodeCashAddress('ecash', 'p2pkh', TEST_HASHES[index]),
                    EXPECTED_P2PKH_OUTPUTS[index],
                );
                assert.equal(
                    encodeCashAddress('ecash', 'p2sh', TEST_HASHES[index]),
                    EXPECTED_P2SH_OUTPUTS[index],
                );
            }
        });

        it('should encode test hashes on mainnet correctly with string input for hash', () => {
            for (const index in TEST_HASHES) {
                assert.equal(
                    encodeCashAddress(
                        'ecash',
                        'p2pkh',
                        TEST_HASHES_STRINGS[index],
                    ),
                    EXPECTED_P2PKH_OUTPUTS[index],
                );
                assert.equal(
                    encodeCashAddress(
                        'ecash',
                        'p2sh',
                        TEST_HASHES_STRINGS[index],
                    ),
                    EXPECTED_P2SH_OUTPUTS[index],
                );
            }
        });

        it('should encode test hashes on mainnet correctly with lower case for type', () => {
            for (const index in TEST_HASHES) {
                assert.equal(
                    encodeCashAddress('ecash', 'p2pkh', TEST_HASHES[index]),
                    EXPECTED_P2PKH_OUTPUTS[index],
                );
                assert.equal(
                    encodeCashAddress('ecash', 'p2sh', TEST_HASHES[index]),
                    EXPECTED_P2SH_OUTPUTS[index],
                );
            }
        });

        it('should encode test hashes on testnet correctly', () => {
            for (const index in TEST_HASHES) {
                assert.equal(
                    encodeCashAddress('ectest', 'p2pkh', TEST_HASHES[index]),
                    EXPECTED_P2PKH_OUTPUTS_TESTNET[index],
                );
                assert.equal(
                    encodeCashAddress('ectest', 'p2sh', TEST_HASHES[index]),
                    EXPECTED_P2SH_OUTPUTS_TESTNET[index],
                );
            }
        });
    });

    describe('#getTypeAndHashFromOutputScript() and #getOutputScriptFromTypeAndHash()', () => {
        it('should get type and hash from outputScripts on mainnet correctly', () => {
            for (const index in TEST_HASHES_STRINGS) {
                // outputScript => {type, hash}
                assert.deepEqual(
                    getTypeAndHashFromOutputScript(
                        TEST_P2PKH_OUTPUTSCRIPTS[index],
                    ),
                    { type: 'p2pkh', hash: TEST_HASHES_STRINGS[index] },
                );
                // {type, hash} => outputScript
                assert.deepEqual(
                    getOutputScriptFromTypeAndHash(
                        'p2pkh',
                        TEST_HASHES_STRINGS[index],
                    ),
                    TEST_P2PKH_OUTPUTSCRIPTS[index],
                );
                // outputScript => {type, hash}
                assert.deepEqual(
                    getTypeAndHashFromOutputScript(
                        TEST_P2SH_OUTPUTSCRIPTS[index],
                    ),
                    { type: 'p2sh', hash: TEST_HASHES_STRINGS[index] },
                );
                // {type, hash} => outputScript
                assert.deepEqual(
                    getOutputScriptFromTypeAndHash(
                        'p2sh',
                        TEST_HASHES_STRINGS[index],
                    ),
                    TEST_P2SH_OUTPUTSCRIPTS[index],
                );
            }
        });
        it('should fail on unsupported outputScripts', () => {
            assert.throws(() => {
                // Unsupported type
                getOutputScriptFromTypeAndHash(
                    'p2pksh' as unknown as AddressType,
                    '00'.repeat(20),
                );
            }, ValidationError);
            assert.throws(() => {
                // missing initial a
                getTypeAndHashFromOutputScript(
                    '91476a04053bda0a88bda5177b86a15c3b29f55987387',
                );
            }, ValidationError);
            assert.throws(() => {
                // p2pkh prefix and p2sh suffix
                getTypeAndHashFromOutputScript(
                    '76a91476a04053bda0a88bda5177b86a15c3b29f55987387',
                );
            }, ValidationError);
            assert.throws(() => {
                // some random string
                getTypeAndHashFromOutputScript('chronikWouldNeverReturnThis');
            }, ValidationError);
            assert.throws(() => {
                // Invalid hash length of 21 bytes (20 and 24 are valid)
                getTypeAndHashFromOutputScript(
                    'a91476a04053bda0a88bda5177b86a15c3b29f5598737387',
                );
            }, ValidationError);
        });
    });

    describe('#encodeOutputScript()', () => {
        it('should encode outputScripts on mainnet correctly', () => {
            for (const index in TEST_HASHES) {
                assert.equal(
                    encodeOutputScript(TEST_P2PKH_OUTPUTSCRIPTS[index]),
                    EXPECTED_P2PKH_OUTPUTS[index],
                );
                assert.equal(
                    encodeOutputScript(TEST_P2SH_OUTPUTSCRIPTS[index]),
                    EXPECTED_P2SH_OUTPUTS[index],
                );
            }
        });
        it('should encode outputScripts to testnet prefix correctly', () => {
            for (const index in TEST_HASHES) {
                assert.equal(
                    encodeOutputScript(
                        TEST_P2PKH_OUTPUTSCRIPTS[index],
                        'ectest',
                    ),
                    EXPECTED_P2PKH_OUTPUTS_TESTNET[index],
                );
                assert.equal(
                    encodeOutputScript(
                        TEST_P2SH_OUTPUTSCRIPTS[index],
                        'ectest',
                    ),
                    EXPECTED_P2SH_OUTPUTS_TESTNET[index],
                );
            }
        });
        it('should fail on unsupported outputScripts', () => {
            assert.throws(() => {
                // missing initial a
                encodeOutputScript(
                    '91476a04053bda0a88bda5177b86a15c3b29f55987387',
                );
            }, ValidationError);
            assert.throws(() => {
                // p2pkh prefix and p2sh suffix
                encodeOutputScript(
                    '76a91476a04053bda0a88bda5177b86a15c3b29f55987387',
                );
            }, ValidationError);
            assert.throws(() => {
                // some random string
                encodeOutputScript('chronikWouldNeverReturnThis');
            }, ValidationError);
            assert.throws(() => {
                // Invalid hash length of 21 bytes (20 and 24 are valid)
                encodeOutputScript(
                    'a91476a04053bda0a88bda5177b86a15c3b29f5598737387',
                );
            }, ValidationError);
        });
    });

    describe('#decodeCashAddress()', () => {
        it('should fail when the version byte is invalid', () => {
            assert.throws(() => {
                decodeCashAddress(
                    'ecash:zpm2qsznhks23z7629mms6s4cwef74vcwv6ddac6re',
                );
            }, ValidationError);
        });

        it('should fail when given an address with mixed letter case', () => {
            assert.throws(() => {
                decodeCashAddress(
                    'ecash:QPM2QSZNHKS23Z7629MMS6s4cwef74vcwvA87RKUU2',
                );
            }, ValidationError);
            assert.throws(() => {
                decodeCashAddress(
                    'eCASH:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2',
                );
            }, ValidationError);
            assert.throws(() => {
                decodeCashAddress(
                    'Ecash:QPM2QSZNHKS23Z7629MMS6s4cwef74vcwvA87RKUU2',
                );
            }, ValidationError);
        });

        it('should decodeCashAddress a valid address regardless of letter case', () => {
            assert.equal(
                decodeCashAddress(
                    'ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2',
                ).hash,
                decodeCashAddress(
                    'ECASH:QPM2QSZNHKS23Z7629MMS6S4CWEF74VCWVA87RKUU2',
                ).hash,
            );
        });

        it('should decodeCashAddress valid p2pkh addresses correctly', () => {
            for (const index in EXPECTED_P2PKH_OUTPUTS) {
                assert.equal(
                    decodeCashAddress(EXPECTED_P2PKH_OUTPUTS[index]).hash,
                    TEST_HASHES_STRINGS[index],
                );
            }
        });

        it('should decodeCashAddress valid p2sh addresses correctly', () => {
            for (const index in EXPECTED_P2SH_OUTPUTS) {
                assert.equal(
                    decodeCashAddress(EXPECTED_P2SH_OUTPUTS[index]).hash,
                    TEST_HASHES_STRINGS[index],
                );
            }
        });

        it('should accept prefixless input if checksum is valid', () => {
            assert.deepEqual(
                decodeCashAddress('qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2')
                    .hash,
                decodeCashAddress(
                    'ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2',
                ).hash,
            );
        });

        it('should reject prefixless input if checksum is invalid', () => {
            assert.throws(() => {
                decodeCashAddress(
                    'qpm2qsznhks23z7629mms6s4cwef74vcwvINVALIDCHECKSUM',
                );
            }, ValidationError);
        });

        it('should reject any input that has two prefixes for some reason', () => {
            assert.throws(() => {
                decodeCashAddress(
                    'ecash:bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2',
                );
            }, ValidationError);
        });

        it('should fail when decoding for a different network', () => {
            for (const network of NETWORKS) {
                for (const anotherNetwork of NETWORKS) {
                    if (network !== anotherNetwork) {
                        const hash = getRandomHash(20);
                        assert.throws(() => {
                            const address = encodeCashAddress(
                                network,
                                ADDRESS_TYPES[0],
                                hash,
                            );
                            const invalidAddress = [
                                anotherNetwork,
                                address.split(':')[1],
                            ].join(':');
                            decodeCashAddress(invalidAddress);
                        }, ValidationError);
                    }
                }
            }
        });
    });

    describe('#encodeCashAddress() #decodeCashAddress()', () => {
        it('should encode and decode all sizes correctly', () => {
            for (const size of VALID_SIZES) {
                const hash = getRandomHash(size);
                const address = encodeCashAddress(
                    NETWORKS[0],
                    ADDRESS_TYPES[0],
                    hash,
                );
                const {
                    prefix,
                    type,
                    hash: actualHash,
                } = decodeCashAddress(address);
                assert.equal(prefix, NETWORKS[0]);
                assert.equal(type, ADDRESS_TYPES[0]);
                assert.deepEqual(actualHash, uint8arrayToHexString(hash));
            }
        });

        it('should encode and decode all types and networks', () => {
            for (const type of ADDRESS_TYPES) {
                for (const network of NETWORKS) {
                    const hash = getRandomHash(20);
                    const address = encodeCashAddress(network, type, hash);
                    const {
                        prefix,
                        type: actualType,
                        hash: actualHash,
                    } = decodeCashAddress(address);
                    assert.equal(prefix, network);
                    assert.equal(actualType, type);
                    assert.deepEqual(actualHash, uint8arrayToHexString(hash));
                }
            }
        });

        it('should encode and decode many random hashes', () => {
            const NUM_TESTS = 1000;
            for (let i = 0; i < NUM_TESTS; ++i) {
                for (const type of ADDRESS_TYPES) {
                    const hash = getRandomHash(20);
                    const address = encodeCashAddress(NETWORKS[0], type, hash);
                    const {
                        prefix,
                        type: actualType,
                        hash: actualHash,
                    } = decodeCashAddress(address);
                    assert.equal(prefix, NETWORKS[0]);
                    assert.equal(actualType, type);
                    assert.deepEqual(actualHash, uint8arrayToHexString(hash));
                }
            }
        });
    });

    describe('#isValidCashAddress()', () => {
        it('returns false for address with invalid version byte', () => {
            assert.equal(
                isValidCashAddress(
                    'ecash:zpm2qsznhks23z7629mms6s4cwef74vcwv6ddac6re',
                ),
                false,
            );
        });
        it('returns false for a legacy address', () => {
            assert.equal(
                isValidCashAddress('mrLC19Je2BuWQDkWSTriGYPyQJXKkkBmCx'),
                false,
            );
        });
        it('returns true for mainnet and testnet p2pkh and p2sh cashaddresses', () => {
            for (const index in ALL_VALID_ADDRESSES) {
                assert.equal(
                    isValidCashAddress(ALL_VALID_ADDRESSES[index]),
                    true,
                );
            }
        });
        it('returns true for all mainnet and testnet p2pkh and p2sh cashaddresses if prefixless but with correct checksum', () => {
            for (const index in ALL_VALID_ADDRESSES) {
                const thisPrefixedAddress = ALL_VALID_ADDRESSES[index];
                const thisPrefixlessAddrress = thisPrefixedAddress.slice(
                    thisPrefixedAddress.indexOf(':') + 1,
                );
                assert.equal(isValidCashAddress(thisPrefixlessAddrress), true);
            }
        });
        it('returns true for prefixless ecash: checksummed addresses against specified ecash: prefix type', () => {
            for (const index in ALL_VALID_MAINNET_ADDRESSES) {
                const thisPrefixedAddress = ALL_VALID_MAINNET_ADDRESSES[index];
                const thisPrefixlessAddrress = thisPrefixedAddress.slice(
                    thisPrefixedAddress.indexOf(':') + 1,
                );
                assert.equal(
                    isValidCashAddress(thisPrefixlessAddrress, 'ecash'),
                    true,
                );
            }
        });
        it('returns true for mainnet p2pkh and p2sh cashaddresses if ecash prefix is specified', () => {
            for (const index in ALL_VALID_MAINNET_ADDRESSES) {
                assert.equal(
                    isValidCashAddress(
                        ALL_VALID_MAINNET_ADDRESSES[index],
                        'ecash',
                    ),
                    true,
                );
            }
        });
        it('returns true for testnet p2pkh cashaddresses if testnet prefix is specified', () => {
            for (const index in ALL_VALID_TESTNET_ADDRESSES) {
                assert.equal(
                    isValidCashAddress(
                        ALL_VALID_TESTNET_ADDRESSES[index],
                        'ectest',
                    ),
                    true,
                );
            }
        });
        it('returns false for testnet p2pkh cashaddresses if mainnet prefix is specified', () => {
            for (const index in ALL_VALID_TESTNET_ADDRESSES) {
                assert.equal(
                    isValidCashAddress(
                        ALL_VALID_TESTNET_ADDRESSES[index],
                        'ecash',
                    ),
                    false,
                );
            }
        });
        it('returns false for nonstring input', () => {
            // We keep these tests for JS users of this TS lib
            // The type coercions here are to allow ts compilation and running of tests
            assert.equal(
                isValidCashAddress(
                    { address: 'some invalid address' } as unknown as string,
                    'ecash',
                ),
                false,
            );
            assert.equal(
                isValidCashAddress(false as unknown as string, 'ecash'),
                false,
            );
            assert.equal(
                isValidCashAddress(null as unknown as string, 'ecash'),
                false,
            );
            assert.equal(
                isValidCashAddress(
                    [
                        'ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2',
                    ] as unknown as string,
                    'ecash',
                ),
                false,
            );
        });
    });
    describe('#getOutputScriptFromAddress()', () => {
        it('should get outputScripts from address on mainnet correctly', () => {
            for (const index in EXPECTED_P2PKH_OUTPUTS) {
                assert.equal(
                    getOutputScriptFromAddress(EXPECTED_P2PKH_OUTPUTS[index]),
                    TEST_P2PKH_OUTPUTSCRIPTS[index],
                );
                assert.equal(
                    getOutputScriptFromAddress(EXPECTED_P2SH_OUTPUTS[index]),
                    TEST_P2SH_OUTPUTSCRIPTS[index],
                );
            }
        });
        it('should get outputScripts from testnet addresses correctly', () => {
            for (const index in TEST_HASHES) {
                assert.equal(
                    getOutputScriptFromAddress(
                        EXPECTED_P2PKH_OUTPUTS_TESTNET[index],
                    ),
                    TEST_P2PKH_OUTPUTSCRIPTS[index],
                );
                assert.equal(
                    getOutputScriptFromAddress(
                        EXPECTED_P2SH_OUTPUTS_TESTNET[index],
                    ),
                    TEST_P2SH_OUTPUTSCRIPTS[index],
                );
            }
        });
        it('should fail on invalid addresses', () => {
            assert.throws(() => {
                getOutputScriptFromAddress('notAnAddress');
            }, ValidationError);
        });
    });
});
