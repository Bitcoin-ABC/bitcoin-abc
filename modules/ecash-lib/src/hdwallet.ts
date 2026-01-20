// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Ecc } from './ecc.js';
import { hmacSha512 } from './hmac.js';
import { shaRmd160, sha256d } from './hash.js';
import { Bytes } from './io/bytes.js';
import { strToBytes } from './io/str.js';
import { WriterBytes } from './io/writerbytes.js';
import { encodeBase58 } from 'b58-ts';
import { decodeBase58Check } from './address/legacyaddr.js';

// BIP32 extended public key version bytes
// These match the values defined in Electrum ABC's networks.py
const XPUB_VERSION_MAINNET = 0x0488b21e;
const XPUB_VERSION_TESTNET = 0x043587cf;

const HIGHEST_BIT = 0x80000000;

export class HdNode {
    private _ecc: Ecc;
    private _seckey: Uint8Array | undefined;
    private _pubkey: Uint8Array;
    private _chainCode: Uint8Array;
    private _depth: number;
    private _index: number;
    private _parentFingerprint: number;

    public constructor(params: {
        seckey: Uint8Array | undefined;
        pubkey: Uint8Array;
        chainCode: Uint8Array;
        depth: number;
        index: number;
        parentFingerprint: number;
    }) {
        this._ecc = new Ecc();
        this._seckey = params.seckey;
        this._pubkey = params.pubkey;
        this._chainCode = params.chainCode;
        this._depth = params.depth;
        this._index = params.index;
        this._parentFingerprint = params.parentFingerprint;
    }

    public seckey(): Uint8Array | undefined {
        return this._seckey;
    }

    public pubkey(): Uint8Array {
        return this._pubkey;
    }

    public pkh(): Uint8Array {
        return shaRmd160(this._pubkey);
    }

    public fingerprint(): Uint8Array {
        return this.pkh().slice(0, 4);
    }

    public index(): number {
        return this._index;
    }

    public depth(): number {
        return this._depth;
    }

    public parentFingerprint(): number {
        return this._parentFingerprint;
    }

    public chainCode(): Uint8Array {
        return this._chainCode;
    }

    /**
     * Encode this HdNode as an xpub (extended public key) string
     *
     * An xpub is a base58check-encoded string containing:
     * - 4 bytes: version (0x0488B21E for mainnet xpub, 0x043587CF for testnet xpub)
     * - 1 byte: depth
     * - 4 bytes: parent fingerprint
     * - 4 bytes: child index
     * - 32 bytes: chain code (needed to derive child keys)
     * - 33 bytes: public key (compressed)
     *
     * @param version - Version bytes (defaults to XPUB_VERSION_MAINNET)
     * @returns Base58check-encoded xpub string
     */
    public xpub(version: number = XPUB_VERSION_MAINNET): string {
        // Validate public key is compressed
        if (
            this._pubkey.length !== 33 ||
            (this._pubkey[0] !== 0x02 && this._pubkey[0] !== 0x03)
        ) {
            throw new Error(
                'Public key must be compressed (33 bytes, starts with 0x02 or 0x03)',
            );
        }

        // Write xpub data (78 bytes total)
        const writer = new WriterBytes(78);
        writer.putU32(version, 'BE');
        writer.putU8(this._depth);
        writer.putU32(this._parentFingerprint, 'BE');
        writer.putU32(this._index, 'BE');
        writer.putBytes(this._chainCode);
        writer.putBytes(this._pubkey);

        // Encode with base58check
        const checksum = sha256d(writer.data);
        const dataWithChecksum = new Uint8Array(78 + 4);
        dataWithChecksum.set(writer.data, 0);
        dataWithChecksum.set(checksum.subarray(0, 4), 78);
        return encodeBase58(dataWithChecksum);
    }

    public derive(index: number): HdNode {
        const isHardened = index >= HIGHEST_BIT;
        const data = new WriterBytes(1 + 32 + 4);
        if (isHardened) {
            if (this._seckey === undefined) {
                throw new Error('Missing private key for hardened child key');
            }
            data.putU8(0);
            data.putBytes(this._seckey);
        } else {
            data.putBytes(this._pubkey);
        }
        data.putU32(index, 'BE');
        const hashed = hmacSha512(this._chainCode, data.data);
        const hashedLeft = hashed.slice(0, 32);
        const hashedRight = hashed.slice(32);

        // In case the secret key doesn't lie on the curve, we proceed with the
        // next index. This is astronomically unlikely but part of the specification.
        if (!this._ecc.isValidSeckey(hashedLeft)) {
            return this.derive(index + 1);
        }

        let seckey: Uint8Array | undefined;
        let pubkey: Uint8Array;
        if (this._seckey !== undefined) {
            try {
                seckey = this._ecc.seckeyAdd(this._seckey, hashedLeft);
            } catch (ex) {
                console.log('Skipping index', index, ':', ex);
                return this.derive(index + 1);
            }
            pubkey = this._ecc.derivePubkey(seckey);
        } else {
            try {
                pubkey = this._ecc.pubkeyAdd(this._pubkey, hashedLeft);
            } catch (ex) {
                console.log('Skipping index', index, ':', ex);
                return this.derive(index + 1);
            }
            seckey = undefined;
        }
        return new HdNode({
            seckey: seckey,
            pubkey: pubkey,
            chainCode: hashedRight,
            depth: this._depth + 1,
            index,
            parentFingerprint: new Bytes(this.fingerprint()).readU32('BE'),
        });
    }

    public deriveHardened(index: number): HdNode {
        if (index < 0 || index >= HIGHEST_BIT) {
            throw new TypeError(
                `index must be between 0 and ${HIGHEST_BIT}, got ${index}`,
            );
        }
        return this.derive(index + HIGHEST_BIT);
    }

    public derivePath(path: string): HdNode {
        let splitPath = path.split('/');
        if (splitPath[0] === 'm') {
            if (this._parentFingerprint) {
                throw new TypeError('Expected master, got child');
            }
            splitPath = splitPath.slice(1);
        }

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let hd: HdNode = this;
        for (const step of splitPath) {
            if (step.slice(-1) === `'`) {
                hd = hd.deriveHardened(parseInt(step.slice(0, -1), 10));
            } else {
                hd = hd.derive(parseInt(step, 10));
            }
        }

        return hd;
    }

    public static fromPrivateKey(
        seckey: Uint8Array,
        chainCode: Uint8Array,
    ): HdNode {
        return new HdNode({
            seckey: seckey,
            pubkey: new Ecc().derivePubkey(seckey),
            chainCode,
            depth: 0,
            index: 0,
            parentFingerprint: 0,
        });
    }

    public static fromSeed(seed: Uint8Array): HdNode {
        if (seed.length < 16 || seed.length > 64) {
            throw new TypeError('Seed must be between 16 and 64 bytes long');
        }
        const hashed = hmacSha512(strToBytes('Bitcoin seed'), seed);
        const hashedLeft = hashed.slice(0, 32);
        const hashedRight = hashed.slice(32);
        return HdNode.fromPrivateKey(hashedLeft, hashedRight);
    }

    /**
     * Create an HdNode from an xpub (extended public key) string
     *
     * An xpub is a base58check-encoded string containing:
     * - 4 bytes: version (0x0488B21E for mainnet xpub, 0x043587CF for testnet xpub)
     * - 1 byte: depth
     * - 4 bytes: parent fingerprint
     * - 4 bytes: child index
     * - 32 bytes: chain code
     * - 33 bytes: public key (compressed)
     *
     * The resulting HdNode will not have a private key (watch-only).
     *
     * @param xpub - The extended public key string
     * @returns HdNode created from the xpub (without private key)
     */
    public static fromXpub(xpub: string): HdNode {
        const payload = decodeBase58Check(xpub);

        if (payload.length !== 78) {
            throw new Error(
                `Invalid xpub: expected 78 bytes, got ${payload.length}`,
            );
        }

        const bytes = new Bytes(payload);

        // Read version (4 bytes, big-endian)
        const version = bytes.readU32('BE');
        // Validate version (mainnet or testnet xpub)
        if (
            version !== XPUB_VERSION_MAINNET &&
            version !== XPUB_VERSION_TESTNET
        ) {
            throw new Error(
                `Invalid xpub version: expected 0x${XPUB_VERSION_MAINNET.toString(16).toUpperCase()} (mainnet) or 0x${XPUB_VERSION_TESTNET.toString(16).toUpperCase()} (testnet), got 0x${version.toString(16)}`,
            );
        }

        // Read depth (1 byte)
        const depth = bytes.readU8();

        // Read parent fingerprint (4 bytes, big-endian)
        const parentFingerprint = bytes.readU32('BE');

        // Read child index (4 bytes, big-endian)
        const index = bytes.readU32('BE');

        // Read chain code (32 bytes)
        const chainCode = bytes.readBytes(32);

        // Read public key (33 bytes, compressed)
        const pubkey = bytes.readBytes(33);

        // Validate public key format (should start with 0x02 or 0x03 for compressed)
        if (pubkey[0] !== 0x02 && pubkey[0] !== 0x03) {
            throw new Error(
                `Invalid xpub: public key must be compressed (start with 0x02 or 0x03), got 0x${pubkey[0].toString(16)}`,
            );
        }

        // Create HdNode without private key (watch-only)
        return new HdNode({
            seckey: undefined,
            pubkey,
            chainCode,
            depth,
            index,
            parentFingerprint,
        });
    }
}
