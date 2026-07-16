// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    bigintToU64Be,
    fromHex,
    fromHexRev,
    sha256,
    sha256Hasher,
    strToBytes,
    toHex,
    toHexRev,
    u32ToBe,
} from 'ecash-lib';

import { PROTOCOL_VERSION } from './constants.js';

const U64_MAX = 0xffffffffffffffffn;
const TOKEN_ID_HEX_RE = /^[0-9a-f]{64}$/;
const ATOM_TIER_DEC_RE = /^(0|[1-9]\d*)$/;

function assertTokenIdBytes(tokenId: Uint8Array): void {
    if (tokenId.length !== 32) {
        throw new Error(`tokenId must be 32 bytes, got ${tokenId.length}`);
    }
}

function assertAtomTier(atomTier: bigint): void {
    if (atomTier < 0n || atomTier > U64_MAX) {
        throw new Error(`atomTier must be in [0, 2^64-1], got ${atomTier}`);
    }
}

export function sha256Buf(data: Uint8Array): Uint8Array {
    return sha256(data);
}

export function listHash(items: Uint8Array[]): Uint8Array {
    const h = sha256Hasher();
    try {
        for (const item of items) {
            h.update(u32ToBe(item.length));
            h.update(item);
        }
        return h.finalize();
    } finally {
        h.free();
    }
}

export function calcSessionHash(
    tokenId: Uint8Array,
    atomTier: bigint,
    covertDomain: Uint8Array,
    covertPort: number,
    beginTime: number,
): Uint8Array {
    assertTokenIdBytes(tokenId);
    assertAtomTier(atomTier);
    return listHash([
        strToBytes('ALP Fusion Session'),
        PROTOCOL_VERSION,
        tokenId,
        bigintToU64Be(atomTier),
        covertDomain,
        u32ToBe(covertPort),
        bigintToU64Be(BigInt(Math.floor(beginTime))),
    ]);
}

export function calcRoundHash(
    lastHash: Uint8Array,
    roundPubkey: Uint8Array,
    roundTime: number,
    allCommitments: Uint8Array[],
    allComponents: Uint8Array[],
): Uint8Array {
    return listHash([
        strToBytes('ALP Fusion Round'),
        lastHash,
        roundPubkey,
        bigintToU64Be(BigInt(Math.floor(roundTime))),
        listHash(allCommitments),
        listHash(allComponents),
    ]);
}

/** Canonical pool key: `<32-byte-token-id-hex>:<atomTier-decimal>`. */
export function poolKey(tokenId: Uint8Array, atomTier: bigint): string {
    assertTokenIdBytes(tokenId);
    assertAtomTier(atomTier);
    return `${toHex(tokenId)}:${atomTier.toString()}`;
}

export function parsePoolKey(key: string): {
    tokenId: Uint8Array;
    atomTier: bigint;
} {
    const parts = key.split(':');
    if (parts.length !== 2) {
        throw new Error(
            `parsePoolKey: expected tokenHex:tier, got ${parts.length} fields`,
        );
    }
    const [hex, tierStr] = parts;
    if (!TOKEN_ID_HEX_RE.test(hex)) {
        throw new Error(
            'parsePoolKey: tokenId must be 64 lowercase hex characters',
        );
    }
    if (!ATOM_TIER_DEC_RE.test(tierStr)) {
        throw new Error(
            'parsePoolKey: atomTier must be canonical decimal (no leading zeros)',
        );
    }
    // Reject before BigInt() so huge digit strings cannot burn CPU/memory.
    const u64MaxDec = U64_MAX.toString();
    if (
        tierStr.length > u64MaxDec.length ||
        (tierStr.length === u64MaxDec.length && tierStr > u64MaxDec)
    ) {
        throw new Error('parsePoolKey: atomTier exceeds uint64 range');
    }
    const atomTier = BigInt(tierStr);
    return { tokenId: fromHex(hex), atomTier };
}

/** Chronik/txid hex (64 chars) → 32-byte tokenId (byte-reversed). */
export function tokenIdToBytes(tokenId: string): Uint8Array {
    const hex = tokenId.toLowerCase();
    if (!TOKEN_ID_HEX_RE.test(hex)) {
        throw new Error('tokenIdToBytes: expected 64 hex characters');
    }
    return fromHexRev(hex);
}

export function tokenIdFromBytes(bytes: Uint8Array): string {
    assertTokenIdBytes(bytes);
    return toHexRev(bytes);
}
