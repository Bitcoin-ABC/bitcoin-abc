// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { toHex, fromHex } from '../io/hex';
import {
    decodeCashAddress,
    getOutputScriptFromTypeAndHash,
    getTypeAndHashFromOutputScript,
    encodeCashAddress,
    isValidCashAddress,
} from 'ecashaddrjs';
import {
    decodeLegacyAddress,
    encodeBase58Check,
    LEGACY_VERSION_BYTES,
} from './legacyaddr';
import { Script } from '../script';

export type AddressType = 'p2pkh' | 'p2sh';
export type AddressEncoding = 'cashaddr' | 'legacy';

export const ECASH_PREFIXES_TESTNET = ['ectest', 'ecregtest'];

/**
 * Converts an ecash address in cashaddr format to legacy format
 * Throws if user attempts to convert a legacy address to a legacy address
 * Separated as its own function here for
 *
 * 1 - simpler unit testing
 * 2 - exported for users looking to convert string cashaddr to string legacy addr
 *     without using the Address class
 */
export const toLegacyAddress = (cashaddress: string): string => {
    try {
        // No-op if user is trying to convert legacy to legacy
        decodeLegacyAddress(cashaddress);
        return cashaddress;
    } catch {
        // Do nothing with this error since we expect it every time for the function's intended use case
        // Proceed to convert to legacy
    }
    const { prefix, type, hash } = decodeCashAddress(cashaddress);

    const isTestnet = ECASH_PREFIXES_TESTNET.includes(prefix);

    // Get correct version byte for legacy format
    let versionByte: number;
    switch (type) {
        case 'p2pkh':
            versionByte = isTestnet
                ? LEGACY_VERSION_BYTES.legacy.testnet.p2pkh
                : LEGACY_VERSION_BYTES.legacy.mainnet.p2pkh;
            break;
        case 'p2sh':
            versionByte = isTestnet
                ? LEGACY_VERSION_BYTES.legacy.testnet.p2sh
                : LEGACY_VERSION_BYTES.legacy.mainnet.p2sh;
            break;
        default:
            throw new Error('Unsupported address type: ' + type);
    }

    // Convert hash to Uint8Array
    const hashArray = fromHex(hash);

    // Create a new Uint8Array to hold the data
    const uint8Array = new Uint8Array(1 + hashArray.length);

    // Set the version byte
    uint8Array[0] = versionByte;

    // Set the hash
    uint8Array.set(hashArray, 1);

    // Encode to base58check
    return encodeBase58Check(uint8Array);
};

interface AddressInterface {
    /**
     * hash
     * The hash this address encodes as a hex string.
     * It's part of the Script this address represents.
     */
    hash: string;
    /**
     * p2pkh or p2sh
     * The type of address
     * Address supports p2pkh or p2sh address types
     */
    type: AddressType;
    /**
     * Defined for a cashaddr address, i.e. one with encoding === 'cashaddr'
     * This is distinct from the version byte. Common prefixes on ecash include
     * 'ecash', 'etoken', 'ectest', and 'ecregest'. But a prefix could be anything
     * so long as the address checksum matches.
     */
    prefix?: string;
    /**
     * encoded address as a string
     * cashaddr or legacy
     * type available in 'encoding' field
     */
    address: string;
    /**
     * How this address is encoded
     * cashaddr or legacy
     * If cashaddr, 'prefix' is defined and a string
     */
    encoding: AddressEncoding;
}

/**
 * Constructor params for private constructor method of the Address class
 */
interface AddressConstructorParams {
    hash: string;
    type: AddressType;
    prefix?: string;
    address: string;
    encoding: AddressEncoding;
}

export const DEFAULT_PREFIX = 'ecash';

/**
 * Address
 * Stores properties of supported crypto addresses
 * in standard typed structure. Provides methods for
 * easy access of address data in dev-friendly formats.
 * Provides methods for instantiating by type, encoding,
 * script, prefix, and address string of arbitrary encoding.
 *
 * Simplifies conversion between cashaddr prefixes and
 * address encoding types.
 *
 * Address is an ecash-first class. Legacy BTC format
 * is supported to simplify conversion to and from
 * ecash addresses.
 *
 * Address may be extended to support other crypto
 * address formats.
 */
export class Address implements AddressInterface {
    hash: string;
    type: AddressType;
    prefix?: string;
    address: string;
    encoding: AddressEncoding;

    private constructor(params: AddressConstructorParams) {
        const { hash, type, address, encoding } = params;
        this.hash = hash;
        this.type = type;
        this.address = address;
        this.encoding = encoding;
        if (typeof params.prefix !== 'undefined') {
            this.prefix = params.prefix;
        }
    }

    /**
     * Create a new p2pkh Address from hash
     * cashaddr encoding
     */
    static p2pkh = (
        hash: string | Uint8Array,
        prefix: string = DEFAULT_PREFIX,
    ) =>
        new Address({
            type: 'p2pkh',
            hash: hash instanceof Uint8Array ? toHex(hash) : hash,
            prefix: prefix,
            address: encodeCashAddress(prefix, 'p2pkh', hash),
            encoding: 'cashaddr',
        });

    /**
     * Create a new p2sh Address from hash
     * cashaddr encoding
     */
    static p2sh = (
        hash: string | Uint8Array,
        prefix: string = DEFAULT_PREFIX,
    ) =>
        new Address({
            type: 'p2sh',
            hash: hash instanceof Uint8Array ? toHex(hash) : hash,
            prefix: prefix,
            address: encodeCashAddress(prefix, 'p2sh', hash),
            encoding: 'cashaddr',
        });

    /**
     * Create a new Address from a given address string
     * address must be valid legacy or cashaddr address
     */
    static parse = (address: string) => {
        if (isValidCashAddress(address)) {
            const { type, hash, prefix } = decodeCashAddress(address);
            return new Address({
                type,
                hash,
                prefix,
                encoding: 'cashaddr',
                address,
            });
        }
        try {
            const { type, hash } = decodeLegacyAddress(address);
            return new Address({
                type,
                hash,
                encoding: 'legacy',
                address,
            });
        } catch {
            throw new Error('Invalid cashaddr or legacy address');
        }
    };

    /**
     * Create a new Address from a cashaddr
     * prefix, type, and hash from creating cashaddr
     */
    static fromCashAddress = (address: string) => {
        const { type, hash, prefix } = decodeCashAddress(address);
        return new Address({
            type,
            hash,
            address,
            encoding: 'cashaddr',
            prefix,
        });
    };

    /**
     * Create a new Address from legacy address
     * prefix, type and hash from legacy address
     */
    static fromLegacyAddress = (legacy: string) => {
        // Determine addr params from legacy address
        const { type, hash, network } = decodeLegacyAddress(legacy);
        return new Address({
            type,
            hash,
            address: legacy,
            encoding: 'legacy',
            prefix:
                network === 'testnet'
                    ? ECASH_PREFIXES_TESTNET[0]
                    : DEFAULT_PREFIX,
        });
    };

    /**
     * Create a new Address from an outputScript as Script
     * type and hash from outputScript
     * cashaddr encoding
     */
    static fromScript = (script: Script, prefix: string = DEFAULT_PREFIX) => {
        const scriptHex = toHex(script.bytecode);
        return Address.fromScriptHex(scriptHex, prefix);
    };

    /**
     * Create a new Address from an outputScript as hex string
     * type and hash from outputScript
     * cashaddr encoding
     */
    static fromScriptHex = (
        scriptHex: string,
        prefix: string = DEFAULT_PREFIX,
    ) => {
        const { type, hash } = getTypeAndHashFromOutputScript(scriptHex);

        // Default cashaddr encoding
        const address = encodeCashAddress(prefix, type, hash);

        return new Address({
            type,
            hash,
            prefix,
            address,
            encoding: 'cashaddr',
        });
    };

    toString = () => {
        return this.address;
    };

    legacy = () =>
        new Address({
            type: this.type,
            hash: this.hash,
            address: toLegacyAddress(this.address),
            encoding: 'legacy',
        });

    /**
     * Create an Address with cashaddr encoding
     * from an existing Address
     */
    cash = () =>
        new Address({
            type: this.type,
            hash: this.hash,
            address: encodeCashAddress(
                typeof this.prefix !== 'undefined'
                    ? this.prefix
                    : DEFAULT_PREFIX,
                this.type,
                this.hash,
            ),
            encoding: 'cashaddr',
            prefix:
                typeof this.prefix !== 'undefined'
                    ? this.prefix
                    : DEFAULT_PREFIX,
        });

    /**
     * Create address with specified prefix
     * from an existing cashaddr-encoding Address
     */
    withPrefix = (prefix: string) => {
        if (this.encoding === 'legacy') {
            // Take no action for legacy address types
            throw new Error('withPrefix does not support legacy address types');
        }
        if (this.prefix === prefix) {
            // Take no action if prefix is not changing
            return this;
        }
        return new Address({
            type: this.type,
            hash: this.hash,
            prefix,
            address: encodeCashAddress(prefix, this.type, this.hash),
            encoding: 'cashaddr',
        });
    };

    toScript = (): Script => {
        return new Script(
            fromHex(getOutputScriptFromTypeAndHash(this.type, this.hash)),
        );
    };

    toScriptHex = (): string => {
        return getOutputScriptFromTypeAndHash(this.type, this.hash);
    };
}
