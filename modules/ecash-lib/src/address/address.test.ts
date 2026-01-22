// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { Address, DEFAULT_PREFIX, toLegacyAddress } from './address.js';
import { Script } from '../script';
import { fromHex } from '../io/hex';
import { encodeCashAddress, VALID_PREFIXES } from 'ecashaddrjs';

const TEST_HASHES = [
    new Uint8Array([
        118, 160, 64, 83, 189, 160, 168, 139, 218, 81, 119, 184, 106, 21, 195,
        178, 159, 85, 152, 115,
    ]),
    new Uint8Array([
        203, 72, 18, 50, 41, 156, 213, 116, 49, 81, 172, 75, 45, 99, 174, 25,
        142, 123, 176, 169,
    ]),
    new Uint8Array([
        1, 31, 40, 228, 115, 201, 95, 64, 19, 215, 213, 62, 197, 251, 195, 180,
        45, 248, 237, 16,
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

const EXPECTED_P2PKH_OUTPUTS_TESTNET_LEGACY = [
    'mrLC19Je2BuWQDkWSTriGYPyQJXKkkBmCx',
    'mz3ooahhEEzjbXR2VUKP3XACBCwF5zhQBy',
    'mfctJGAVEWkZgfxV9zy1AjNFuXsKi2VXB8',
];

const EXPECTED_P2SH_OUTPUTS_TESTNET = [
    'ectest:ppm2qsznhks23z7629mms6s4cwef74vcwvvfavkjyx',
    'ectest:pr95sy3j9xwd2ap32xkykttr4cvcu7as4y8rmacazl',
    'ectest:pqq3728yw0y47sqn6l2na30mcw6zm78dzqt6jt705c',
];

const EXPECTED_P2PKH_OUTPUTS_LEGACY = [
    '1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu',
    '1KXrWXciRDZUpQwQmuM1DbwsKDLYAYsVLR',
    '16w1D5WRVKJuZUsSRzdLp9w3YGcgoxDXb',
];

const EXPECTED_P2SH_OUTPUTS_LEGACY = [
    '3CWFddi6m4ndiGyKqzYvsFYagqDLPVMTzC',
    '3LDsS579y7sruadqu11beEJoTjdFiFCdX4',
    '31nwvkZwyPdgzjBJZXfDmSWsC4ZLKpYyUw',
];

const EXPECTED_P2SH_OUTPUTS_TESTNET_LEGACY = [
    '2N44ThNe8NXHyv4bsX8AoVCXquBRW94Ls7W',
    '2NBn5Vp3BaaPD7NGPa8dUGBJ4g5qRXq92wG',
    '2MsM9zVVyar93CWorEfH6PPW8QQmW3s1uh6',
];

const validTestHashUint8Array = TEST_HASHES[0];
const validTestHashString = TEST_HASHES_STRINGS[0];
const validCashaddrP2pkh = EXPECTED_P2PKH_OUTPUTS[0];
const validPrefixlessCashaddrP2pkh = validCashaddrP2pkh.split(':')[1];
const validCashaddrP2sh = EXPECTED_P2SH_OUTPUTS[0];
const validPrefixlessCashaddrP2sh = validCashaddrP2sh.split(':')[1];
const validLegacyAddressP2pkh = EXPECTED_P2PKH_OUTPUTS_LEGACY[0];
const validLegacyAddressP2sh = EXPECTED_P2SH_OUTPUTS_LEGACY[0];
const validLegacyAddressP2pkhTestnet = EXPECTED_P2PKH_OUTPUTS_TESTNET_LEGACY[0];
const validLegacyAddressP2shTestnet = EXPECTED_P2SH_OUTPUTS_TESTNET_LEGACY[0];
const validP2pkhOutputScriptHex = TEST_P2PKH_OUTPUTSCRIPTS[0];
const validP2pkhOutputScript = new Script(fromHex(validP2pkhOutputScriptHex));
const validP2shOutputScriptHex = TEST_P2SH_OUTPUTSCRIPTS[0];
const validP2shOutputScript = new Script(fromHex(validP2shOutputScriptHex));

describe('Address', () => {
    context('parse constructor', () => {
        it('Can instantiate with a valid cashaddr address', () => {
            const address = Address.parse(validCashaddrP2pkh);
            expect(address.toString()).to.equal(validCashaddrP2pkh);
        });
        it('Can instantiate with a valid legacy address', () => {
            const address = Address.parse(validLegacyAddressP2pkh);
            expect(address.toString()).to.equal(validLegacyAddressP2pkh);
        });
        it('Throws an error for an invalid cashaddr address', () => {
            const invalidCashAddress = `${validCashaddrP2pkh}11`;
            expect(() => Address.parse(invalidCashAddress)).to.throw(
                `Invalid cashaddr or legacy address`,
            );
        });
        it('Throws an error for an invalid legacy address', () => {
            const invalidLegacyAddress = `${validLegacyAddressP2pkh}11`;
            expect(() => Address.parse(invalidLegacyAddress)).to.throw(
                `Invalid cashaddr or legacy address`,
            );
        });
    });
    context('p2pkh constructor', () => {
        it('Can instantiate with valid hash as Uint8Array', () => {
            const thisAddress = Address.p2pkh(validTestHashUint8Array);
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.prefix).to.equal(DEFAULT_PREFIX);
            expect(thisAddress.type).to.equal('p2pkh');
            expect(thisAddress.address).to.equal(
                encodeCashAddress('ecash', 'p2pkh', validTestHashString),
            );
            expect(thisAddress.encoding).to.equal('cashaddr');
        });
        it('We throw an error if instantiated with hash of invalid size as Uint8Array', () => {
            expect(() => Address.p2pkh(new Uint8Array())).to.throw(
                `Invalid hash size: 0`,
            );
        });
        it('Can instantiate with valid hash as string', () => {
            const thisAddress = Address.p2pkh(validTestHashString);
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.prefix).to.equal(DEFAULT_PREFIX);
            expect(thisAddress.type).to.equal('p2pkh');
            expect(thisAddress.address).to.equal(
                encodeCashAddress('ecash', 'p2pkh', validTestHashString),
            );
            expect(thisAddress.encoding).to.equal('cashaddr');
        });
        it('We throw an error if instantiated with hash as a hex string of off-spec byte count', () => {
            const invalidHash = 'deadbeef';
            expect(() => Address.p2pkh(invalidHash)).to.throw(
                `Invalid hash size: 4.`,
            );
        });
        it('Can instantiate with valid hash as Uint8Array and prefix', () => {
            const thisAddress = Address.p2pkh(
                validTestHashUint8Array,
                'ectest',
            );
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.prefix).to.equal('ectest');
            expect(thisAddress.type).to.equal('p2pkh');
            expect(thisAddress.address).to.equal(
                encodeCashAddress('ectest', 'p2pkh', validTestHashString),
            );
        });
        it('Can instantiate with valid hash as string and prefix', () => {
            const thisAddress = Address.p2pkh(validTestHashString, 'ectest');
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.prefix).to.equal('ectest');
            expect(thisAddress.type).to.equal('p2pkh');
            expect(thisAddress.address).to.equal(
                encodeCashAddress('ectest', 'p2pkh', validTestHashString),
            );
        });
    });
    context('p2sh constructor', () => {
        it('Can instantiate with valid hash as Uint8Array', () => {
            const thisAddress = Address.p2sh(validTestHashUint8Array);
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.prefix).to.equal(DEFAULT_PREFIX);
            expect(thisAddress.type).to.equal('p2sh');
            expect(thisAddress.address).to.equal(
                encodeCashAddress('ecash', 'p2sh', validTestHashString),
            );
            expect(thisAddress.encoding).to.equal('cashaddr');
        });
        it('We throw an error if instantiated with hash of invalid size as Uint8Array', () => {
            expect(() => Address.p2sh(new Uint8Array())).to.throw(
                `Invalid hash size: 0`,
            );
        });
        it('Can instantiate with valid hash as string', () => {
            const thisAddress = Address.p2sh(validTestHashString);
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.prefix).to.equal(DEFAULT_PREFIX);
            expect(thisAddress.type).to.equal('p2sh');
            expect(thisAddress.address).to.equal(
                encodeCashAddress('ecash', 'p2sh', validTestHashString),
            );
            expect(thisAddress.encoding).to.equal('cashaddr');
        });
        it('We throw an error if instantiated with hash as a hex string of off-spec byte count', () => {
            const invalidHash = 'deadbeef';
            expect(() => Address.p2sh(invalidHash)).to.throw(
                `Invalid hash size: 4.`,
            );
        });
        it('Can instantiate with valid hash as Uint8Array and prefix', () => {
            const thisAddress = Address.p2sh(validTestHashUint8Array, 'ectest');
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.prefix).to.equal('ectest');
            expect(thisAddress.type).to.equal('p2sh');
            expect(thisAddress.address).to.equal(
                encodeCashAddress('ectest', 'p2sh', validTestHashString),
            );
        });
        it('Can instantiate with valid hash as string and prefix', () => {
            const thisAddress = Address.p2sh(validTestHashString, 'ectest');
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.prefix).to.equal('ectest');
            expect(thisAddress.type).to.equal('p2sh');
            expect(thisAddress.address).to.equal(
                encodeCashAddress('ectest', 'p2sh', validTestHashString),
            );
        });
    });
    context('fromCashAddress constructor', () => {
        it('ecash-prefixed p2pkh cashaddr', () => {
            // Standard prefix "ecash"
            const newAddressFromP2pkhCashaddr =
                Address.fromCashAddress(validCashaddrP2pkh);

            expect(newAddressFromP2pkhCashaddr.hash).to.equal(
                validTestHashString,
            );
            expect(newAddressFromP2pkhCashaddr.prefix).to.equal(DEFAULT_PREFIX);
            expect(newAddressFromP2pkhCashaddr.type).to.equal('p2pkh');
            expect(newAddressFromP2pkhCashaddr.address).to.equal(
                validCashaddrP2pkh,
            );
            expect(newAddressFromP2pkhCashaddr.encoding).to.equal('cashaddr');
        });
        it('We can accept a prefixless address that checksums to the default prefix', () => {
            // Prefixless with "ecash" checksum
            const newAddressFromValidPrefixlessCashaddrP2pkh =
                Address.fromCashAddress(validPrefixlessCashaddrP2pkh);
            expect(newAddressFromValidPrefixlessCashaddrP2pkh.hash).to.equal(
                validTestHashString,
            );
            expect(newAddressFromValidPrefixlessCashaddrP2pkh.prefix).to.equal(
                DEFAULT_PREFIX,
            );
            expect(newAddressFromValidPrefixlessCashaddrP2pkh.type).to.equal(
                'p2pkh',
            );
            expect(newAddressFromValidPrefixlessCashaddrP2pkh.address).to.equal(
                validPrefixlessCashaddrP2pkh,
            );
            expect(
                newAddressFromValidPrefixlessCashaddrP2pkh.encoding,
            ).to.equal('cashaddr');
        });
        it('We can accept a nonstandard prefixed p2pkh address', () => {
            // Non-standard specified prefix
            const nonstandardPrefix = 'nonstandardprefix';
            const validNonstandardAddress = encodeCashAddress(
                nonstandardPrefix,
                'p2pkh',
                validTestHashString,
            );
            const newAddressFromValidNonstandardAddress =
                Address.fromCashAddress(validNonstandardAddress);
            expect(newAddressFromValidNonstandardAddress.hash).to.equal(
                validTestHashString,
            );
            expect(newAddressFromValidNonstandardAddress.prefix).to.equal(
                nonstandardPrefix,
            );
            expect(newAddressFromValidNonstandardAddress.type).to.equal(
                'p2pkh',
            );
            expect(newAddressFromValidNonstandardAddress.address).to.equal(
                validNonstandardAddress,
            );
            expect(newAddressFromValidNonstandardAddress.encoding).to.equal(
                'cashaddr',
            );
        });
        it('ecash-prefixed p2sh cashaddr', () => {
            const newAddressFromDefaultPrefixedCashaddr =
                Address.fromCashAddress(validCashaddrP2sh);
            expect(newAddressFromDefaultPrefixedCashaddr.hash).to.equal(
                validTestHashString,
            );
            expect(newAddressFromDefaultPrefixedCashaddr.prefix).to.equal(
                DEFAULT_PREFIX,
            );
            expect(newAddressFromDefaultPrefixedCashaddr.type).to.equal('p2sh');
            expect(newAddressFromDefaultPrefixedCashaddr.address).to.equal(
                validCashaddrP2sh,
            );
            expect(newAddressFromDefaultPrefixedCashaddr.encoding).to.equal(
                'cashaddr',
            );
        });
        it('We can accept a prefixless p2sh address if it checksums to ecash prefix', () => {
            const newAddressFromValidPrefixlessCashaddrP2sh =
                Address.fromCashAddress(validPrefixlessCashaddrP2sh);
            expect(newAddressFromValidPrefixlessCashaddrP2sh.hash).to.equal(
                validTestHashString,
            );
            expect(newAddressFromValidPrefixlessCashaddrP2sh.prefix).to.equal(
                DEFAULT_PREFIX,
            );
            expect(newAddressFromValidPrefixlessCashaddrP2sh.type).to.equal(
                'p2sh',
            );
            expect(newAddressFromValidPrefixlessCashaddrP2sh.address).to.equal(
                validPrefixlessCashaddrP2sh,
            );
            expect(newAddressFromValidPrefixlessCashaddrP2sh.encoding).to.equal(
                'cashaddr',
            );
        });
        it('We can accept a non-standard prefix on a p2sh address but it must be specified', () => {
            // Non-standard specified prefix
            const nonstandardPrefix = 'nonstandardprefix';
            const validNonstandardAddress = encodeCashAddress(
                nonstandardPrefix,
                'p2sh',
                validTestHashString,
            );
            const newAddressFromNonstandardAddress = Address.fromCashAddress(
                validNonstandardAddress,
            );
            expect(newAddressFromNonstandardAddress.hash).to.equal(
                validTestHashString,
            );
            expect(newAddressFromNonstandardAddress.prefix).to.equal(
                nonstandardPrefix,
            );
            expect(newAddressFromNonstandardAddress.type).to.equal('p2sh');
            expect(newAddressFromNonstandardAddress.address).to.equal(
                validNonstandardAddress,
            );
            expect(newAddressFromNonstandardAddress.encoding).to.equal(
                'cashaddr',
            );
        });
        it('We throw an error if instantiated with an valid cashaddress of nonstandard prefix if the prefix is not specified (we cannot guess arbitrary prefixes)', () => {
            // Non-standard specified prefix
            const nonstandardPrefix = 'nonstandardprefix';
            const validNonstandardAddress = encodeCashAddress(
                nonstandardPrefix,
                'p2sh',
                validTestHashString,
            );
            const validNonstandardPrefixlessAddress =
                validNonstandardAddress.split(':')[1];
            expect(() =>
                Address.fromCashAddress(validNonstandardPrefixlessAddress),
            ).to.throw(
                `Prefixless address ${validNonstandardPrefixlessAddress} does not have valid checksum for any valid prefix (${VALID_PREFIXES.join(
                    ', ',
                )})`,
            );
        });
        it('We throw an error if instantiated with an invalid cashaddress', () => {
            const invalidCashAddress = `${validCashaddrP2pkh}11`;
            expect(() => Address.fromCashAddress(invalidCashAddress)).to.throw(
                `Invalid value: 1`,
            );
        });
    });
    context('fromLegacyAddress constructor', () => {
        it('valid p2pkh legacy address', () => {
            const thisAddress = Address.fromLegacyAddress(
                validLegacyAddressP2pkh,
            );
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.type).to.equal('p2pkh');
            expect(thisAddress.address).to.equal(validLegacyAddressP2pkh);
            expect(thisAddress.encoding).to.equal('legacy');
        });
        it('valid p2sh legacy address', () => {
            const thisAddress = Address.fromLegacyAddress(
                validLegacyAddressP2sh,
            );
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.type).to.equal('p2sh');
            expect(thisAddress.address).to.equal(validLegacyAddressP2sh);
            expect(thisAddress.encoding).to.equal('legacy');
        });
        it('We throw an error instantiating Address with an invalid legacy address', () => {
            const invalidLegacyAddress = `${validLegacyAddressP2pkh}11`;
            expect(() =>
                Address.fromLegacyAddress(invalidLegacyAddress),
            ).to.throw(`Invalid legacy address`);
        });
        it('valid p2pkh legacy address on testnet', () => {
            const thisAddress = Address.fromLegacyAddress(
                validLegacyAddressP2pkhTestnet,
            );
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.type).to.equal('p2pkh');
            expect(thisAddress.address).to.equal(
                validLegacyAddressP2pkhTestnet,
            );
            expect(thisAddress.encoding).to.equal('legacy');
        });
        it('valid p2sh legacy address on testnet', () => {
            const thisAddress = Address.fromLegacyAddress(
                validLegacyAddressP2shTestnet,
            );
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.type).to.equal('p2sh');
            expect(thisAddress.address).to.equal(validLegacyAddressP2shTestnet);
            expect(thisAddress.encoding).to.equal('legacy');
        });
    });
    context('fromScript constructor', () => {
        it('p2pkh fromScript', () => {
            const thisAddress = Address.fromScript(validP2pkhOutputScript);
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.prefix).to.equal(DEFAULT_PREFIX);
            expect(thisAddress.type).to.equal('p2pkh');
            expect(thisAddress.address).to.equal(
                encodeCashAddress(DEFAULT_PREFIX, 'p2pkh', validTestHashString),
            );
            expect(thisAddress.encoding).to.equal('cashaddr');
        });
        it('p2sh fromScript', () => {
            const thisAddress = Address.fromScript(validP2shOutputScript);
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.prefix).to.equal(DEFAULT_PREFIX);
            expect(thisAddress.type).to.equal('p2sh');
            expect(thisAddress.address).to.equal(
                encodeCashAddress(DEFAULT_PREFIX, 'p2sh', validTestHashString),
            );
            expect(thisAddress.encoding).to.equal('cashaddr');
        });
        it('We throw an error if instantiated with an invalid script', () => {
            const invalidOutputScript = new Script(
                new Uint8Array([...validP2pkhOutputScript.bytecode, 1]),
            );
            expect(() => Address.fromScript(invalidOutputScript)).to.throw(
                `Unsupported outputScript: 76a91476a04053bda0a88bda5177b86a15c3b29f55987388ac01`,
            );
        });
        it('p2pkh fromScript with prefix', () => {
            const thisAddress = Address.fromScript(
                validP2pkhOutputScript,
                'ectest',
            );
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.prefix).to.equal('ectest');
            expect(thisAddress.type).to.equal('p2pkh');
            expect(thisAddress.address).to.equal(
                encodeCashAddress('ectest', 'p2pkh', validTestHashString),
            );
            expect(thisAddress.encoding).to.equal('cashaddr');
        });
        it('p2sh fromScript with prefix', () => {
            const thisAddress = Address.fromScript(
                validP2shOutputScript,
                'ectest',
            );
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.prefix).to.equal('ectest');
            expect(thisAddress.type).to.equal('p2sh');
            expect(thisAddress.address).to.equal(
                encodeCashAddress('ectest', 'p2sh', validTestHashString),
            );
            expect(thisAddress.encoding).to.equal('cashaddr');
        });
    });
    context('fromScriptHex constructor', () => {
        it('p2pkh fromScriptHex', () => {
            const thisAddress = Address.fromScriptHex(
                validP2pkhOutputScriptHex,
            );
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.prefix).to.equal(DEFAULT_PREFIX);
            expect(thisAddress.type).to.equal('p2pkh');
            expect(thisAddress.address).to.equal(
                encodeCashAddress(DEFAULT_PREFIX, 'p2pkh', validTestHashString),
            );
            expect(thisAddress.encoding).to.equal('cashaddr');
        });
        it('p2sh fromScriptHex', () => {
            const thisAddress = Address.fromScriptHex(validP2shOutputScriptHex);
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.prefix).to.equal(DEFAULT_PREFIX);
            expect(thisAddress.type).to.equal('p2sh');
            expect(thisAddress.address).to.equal(
                encodeCashAddress(DEFAULT_PREFIX, 'p2sh', validTestHashString),
            );
            expect(thisAddress.encoding).to.equal('cashaddr');
        });
        it('We throw an error if instantiated with an invalid scriptHex', () => {
            const invalidOutputScript = `${validP2pkhOutputScriptHex}11`;
            expect(() => Address.fromScriptHex(invalidOutputScript)).to.throw(
                `Unsupported outputScript: 76a91476a04053bda0a88bda5177b86a15c3b29f55987388ac1`,
            );
        });
        it('p2pkh fromScriptHex with prefix', () => {
            const thisAddress = Address.fromScriptHex(
                validP2pkhOutputScriptHex,
                'ectest',
            );
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.prefix).to.equal('ectest');
            expect(thisAddress.type).to.equal('p2pkh');
            expect(thisAddress.address).to.equal(
                encodeCashAddress('ectest', 'p2pkh', validTestHashString),
            );
            expect(thisAddress.encoding).to.equal('cashaddr');
        });
        it('p2sh fromScriptHex with prefix', () => {
            const thisAddress = Address.fromScriptHex(
                validP2shOutputScriptHex,
                'ectest',
            );
            expect(thisAddress.hash).to.equal(validTestHashString);
            expect(thisAddress.prefix).to.equal('ectest');
            expect(thisAddress.type).to.equal('p2sh');
            expect(thisAddress.address).to.equal(
                encodeCashAddress('ectest', 'p2sh', validTestHashString),
            );
            expect(thisAddress.encoding).to.equal('cashaddr');
        });
    });
    context('legacy() public method', () => {
        it('We can convert a p2pkh cashaddr to legacy', () => {
            const thisAddress = Address.fromCashAddress(validCashaddrP2pkh);
            // Encoding is cashaddr
            expect(thisAddress.encoding).to.equal('cashaddr');
            // Prefix is default
            expect(thisAddress.prefix).to.equal(DEFAULT_PREFIX);

            // Convert to legacy with legacy()
            const convertedLegacyAddress = thisAddress.legacy();

            // Encoding is now legacy
            expect(convertedLegacyAddress.encoding).to.equal('legacy');
            // Prefix is undefined
            expect(convertedLegacyAddress.prefix).to.equal(undefined);
            // We can get the expected legacy address
            expect(convertedLegacyAddress.toString()).to.equal(
                validLegacyAddressP2pkh,
            );
        });
        it('We can convert a p2sh cashaddr to legacy', () => {
            expect(
                Address.fromCashAddress(validCashaddrP2sh).legacy().toString(),
            ).to.equal(validLegacyAddressP2sh);
        });
        it('We can convert a p2pkh outputScript to legacy', () => {
            expect(
                Address.fromScriptHex(validP2pkhOutputScriptHex)
                    .legacy()
                    .toString(),
            ).to.equal(validLegacyAddressP2pkh);
            expect(
                Address.fromScript(validP2pkhOutputScript).legacy().toString(),
            ).to.equal(validLegacyAddressP2pkh);
        });
        it('We can convert a p2sh outputScript to legacy', () => {
            expect(
                Address.fromScriptHex(validP2shOutputScriptHex)
                    .legacy()
                    .toString(),
            ).to.equal(validLegacyAddressP2sh);
            expect(
                Address.fromScript(validP2shOutputScript).legacy().toString(),
            ).to.equal(validLegacyAddressP2sh);
        });
        it('legacy() no-op if called on a valid legacy address', () => {
            expect(
                Address.fromLegacyAddress(validLegacyAddressP2pkh)
                    .legacy()
                    .toString(),
            ).to.equal(validLegacyAddressP2pkh);
        });
    });
    context('cash() public method', () => {
        it('We can convert a p2pkh legacy to cashaddr', () => {
            expect(
                Address.fromLegacyAddress(validLegacyAddressP2pkh)
                    .cash()
                    .toString(),
            ).to.equal(validCashaddrP2pkh);
        });
        it('We can convert a p2pkh legacy to cashaddr with custom prefix', () => {
            expect(
                Address.fromLegacyAddress(validLegacyAddressP2pkh)
                    .cash()
                    .withPrefix('customprefix')
                    .toString(),
            ).to.equal(
                'customprefix:qpm2qsznhks23z7629mms6s4cwef74vcwvhpd6mlkg',
            );
        });
        it('We can convert a p2sh legacy to cashaddr', () => {
            expect(
                Address.fromLegacyAddress(validLegacyAddressP2sh)
                    .cash()
                    .toString(),
            ).to.equal(validCashaddrP2sh);
        });
        it('We can convert a p2sh legacy to cashaddr of the same type and custom prefix', () => {
            // Type need not be specified if we are not changing it
            expect(
                Address.fromLegacyAddress(validLegacyAddressP2sh)
                    .cash()
                    .withPrefix('customprefix')
                    .toString(),
            ).to.equal(
                'customprefix:ppm2qsznhks23z7629mms6s4cwef74vcwvqys4uud4',
            );
        });
        it('cash() does not update a valid cashaddr', () => {
            expect(
                Address.fromCashAddress(validCashaddrP2pkh).cash().toString(),
            ).to.equal(validCashaddrP2pkh);
        });
        it('if prefix is unspecified, cash() returns the prefix specified by the checksum', () => {
            expect(
                Address.fromCashAddress(validPrefixlessCashaddrP2pkh)
                    .cash()
                    .toString(),
            ).to.equal(validCashaddrP2pkh);
        });
        it('if prefix is unspecified, cash() returns the set cashaddr of Address, if it has a nonstandard prefix', () => {
            const weirdPrefixCashaddr =
                'anyarbitraryprefix:qpm2qsznhks23z7629mms6s4cwef74vcwvj0w7w6ua';
            expect(
                Address.fromCashAddress(weirdPrefixCashaddr).cash().toString(),
            ).to.equal(weirdPrefixCashaddr);
        });
        it('we can convert a p2pkh cashaddr to p2sh, if we want to do this for some reason', () => {
            const p2pkhAddr = Address.fromCashAddress(validCashaddrP2pkh);
            const hash = p2pkhAddr.hash;
            expect(Address.p2sh(hash).toString()).to.equal(validCashaddrP2sh);
        });
        it('we can convert a p2sh cashaddr to p2pkh, if we want to do this for some reason', () => {
            const p2shAddr = Address.fromCashAddress(validCashaddrP2sh);
            const hash = p2shAddr.hash;
            expect(Address.p2pkh(hash).toString()).to.equal(validCashaddrP2pkh);
        });
        it('we can convert a p2pkh outputscript to cashaddr', () => {
            expect(
                Address.fromScriptHex(validP2pkhOutputScriptHex).toString(),
            ).to.equal(validCashaddrP2pkh);
        });
        it('we can convert a p2pkh outputscript to cashaddr of arbitrary prefix', () => {
            expect(
                Address.fromScriptHex(validP2pkhOutputScriptHex)
                    .withPrefix('customprefix')
                    .toString(),
            ).to.equal(
                'customprefix:qpm2qsznhks23z7629mms6s4cwef74vcwvhpd6mlkg',
            );
        });
        it('we can convert a p2sh outputscript to cashaddr of the same type', () => {
            expect(
                Address.fromScriptHex(validP2shOutputScriptHex).toString(),
            ).to.equal(validCashaddrP2sh);
        });
        it('we can convert a p2sh outputscript to cashaddr of arbitrary prefix', () => {
            expect(
                Address.fromScriptHex(validP2shOutputScriptHex)
                    .withPrefix('customprefix')
                    .toString(),
            ).to.equal(
                'customprefix:ppm2qsznhks23z7629mms6s4cwef74vcwvqys4uud4',
            );
        });
    });
    context('withPrefix()', () => {
        it('we can convert a cashaddr prefix', () => {
            expect(
                Address.fromCashAddress(validCashaddrP2pkh)
                    .withPrefix('anyarbitraryprefix')
                    .toString(),
            ).to.equal(
                'anyarbitraryprefix:qpm2qsznhks23z7629mms6s4cwef74vcwvj0w7w6ua',
            );
        });
        it('We throw an error if user attempts to withPrefix() a legacy address', () => {
            expect(() =>
                Address.fromLegacyAddress(validLegacyAddressP2sh).withPrefix(
                    'ecash',
                ),
            ).to.throw(`withPrefix does not support legacy address types`);
        });
        it('We return the address unchanged if user requests the existing prefix', () => {
            expect(
                Address.fromCashAddress(validCashaddrP2pkh)
                    .withPrefix('ecash')
                    .toString(),
            ).to.equal(validCashaddrP2pkh);
        });
    });
    context('toScript() public method', () => {
        it('We can get a p2pkh outputScriptfrom a p2pkh cashaddress', () => {
            const thisAddress = Address.p2pkh(validTestHashString);
            expect(thisAddress.toScript()).to.deep.equal(
                validP2pkhOutputScript,
            );
        });
        it('We get a p2sh outputScript from a p2sh cash address', () => {
            const thisAddress = Address.p2sh(validTestHashString);
            expect(thisAddress.toScript()).to.deep.equal(validP2shOutputScript);
        });
        it('We get a p2pkh outputScript from a p2pkh cash address', () => {
            const thisAddress = Address.p2pkh(validTestHashString);
            expect(thisAddress.toScript()).to.deep.equal(
                validP2pkhOutputScript,
            );
        });
        it('We get a p2sh outputScript from a p2sh legacy address', () => {
            expect(
                Address.fromLegacyAddress(validLegacyAddressP2sh).toScript(),
            ).to.deep.equal(validP2shOutputScript);
        });
        it('toScript() returns construction called string', () => {
            expect(
                Address.fromScript(validP2pkhOutputScript).toScript(),
            ).to.deep.equal(validP2pkhOutputScript);
        });
    });
    context('toScriptHex() public methods', () => {
        it('We can get a p2pkh outputScriptfrom a p2pkh cashaddress', () => {
            const thisAddress = Address.p2pkh(validTestHashString);
            expect(thisAddress.toScriptHex()).to.equal(
                validP2pkhOutputScriptHex,
            );
        });
        it('We get a p2sh outputScript from a p2sh cash address', () => {
            const thisAddress = Address.p2sh(validTestHashString);
            expect(thisAddress.toScriptHex()).to.equal(
                validP2shOutputScriptHex,
            );
        });
        it('We get a p2pkh outputScript from a p2pkh cash address', () => {
            const thisAddress = Address.p2pkh(validTestHashString);
            expect(thisAddress.toScriptHex()).to.equal(
                validP2pkhOutputScriptHex,
            );
        });
        it('We get a p2sh outputScript from a p2sh legacy address', () => {
            expect(
                Address.fromLegacyAddress(validLegacyAddressP2sh).toScriptHex(),
            ).to.equal(validP2shOutputScriptHex);
        });
        it('toScriptHex() returns construction called string', () => {
            expect(
                Address.fromScriptHex(validP2pkhOutputScriptHex).toScriptHex(),
            ).to.equal(validP2pkhOutputScriptHex);
        });
    });
});

describe('toLegacyAddress function', () => {
    it('throws error when the version byte is invalid ', () => {
        expect(() =>
            toLegacyAddress('ecash:zpm2qsznhks23z7629mms6s4cwef74vcwv6ddac6re'),
        ).to.throw('Invalid address type in version byte: 16');
    });
    it('No-op if called with a legacy address', () => {
        const legacyAddr = '1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu';
        expect(toLegacyAddress(legacyAddr)).to.equal(legacyAddr);
    });
    it('converts mainnet p2pkh ecash addresses to expected legacy format', () => {
        for (const index in EXPECTED_P2PKH_OUTPUTS) {
            expect(toLegacyAddress(EXPECTED_P2PKH_OUTPUTS[index])).to.equal(
                EXPECTED_P2PKH_OUTPUTS_LEGACY[index],
            );
        }
    });
    it('converts testnet p2pkh ecash addresses to expected legacy format', () => {
        for (const index in EXPECTED_P2PKH_OUTPUTS_TESTNET) {
            expect(
                toLegacyAddress(EXPECTED_P2PKH_OUTPUTS_TESTNET[index]),
            ).to.equal(EXPECTED_P2PKH_OUTPUTS_TESTNET_LEGACY[index]);
        }
    });
    it('converts mainnet p2sh ecash addresses to expected legacy format', () => {
        for (const index in EXPECTED_P2SH_OUTPUTS) {
            expect(toLegacyAddress(EXPECTED_P2SH_OUTPUTS[index])).to.equal(
                EXPECTED_P2SH_OUTPUTS_LEGACY[index],
            );
        }
    });
    it('converts testnet p2sh ecash addresses to expected legacy format', () => {
        for (const index in EXPECTED_P2SH_OUTPUTS_TESTNET) {
            expect(
                toLegacyAddress(EXPECTED_P2SH_OUTPUTS_TESTNET[index]),
            ).to.equal(EXPECTED_P2SH_OUTPUTS_TESTNET_LEGACY[index]);
        }
    });
});
