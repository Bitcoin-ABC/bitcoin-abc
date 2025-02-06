// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Ecc } from './ecc.js';
import { hmacSha512 } from './hmac.js';
import { shaRmd160 } from './hash.js';
import { Bytes } from './io/bytes.js';
import { strToBytes } from './io/str.js';
import { WriterBytes } from './io/writerbytes.js';

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
}
