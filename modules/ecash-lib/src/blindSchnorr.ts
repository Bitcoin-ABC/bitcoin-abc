// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Schnorr blind signatures (CashFusion / Electrum ABC).
 * Port of electrumabc/schnorr.py BlindSigner + BlindSignatureRequest.
 *
 * Secret scalars are Uint8Array values combined with wasm ECC
 * (`seckeyAdd` / `seckeyMul` / `seckeyNegate`), which reduce mod n.
 */
import { Ecc } from './ecc.js';
import {
    modCurveOrder,
    randomScalarBytes,
    scalarToBytes,
} from './eccScalar.js';
import { sha256 } from './hash.js';
import { bytesToScalar, concatBytes, zeroBytes } from './io/array.js';

const ecc = new Ecc();

const FIELD_SIZE =
    0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;

/** Jacobi symbol — port of electrumabc/schnorr.py jacobi(). Public inputs only. */
function jacobi(a: bigint, n: bigint): number {
    let x = ((a % n) + n) % n;
    if (n < 3n || (n & 1n) === 0n) {
        throw new Error('jacobi: bad n');
    }
    let s = 1;
    while (x > 1n) {
        let a1 = x;
        let e = 0;
        while ((a1 & 1n) === 0n) {
            a1 >>= 1n;
            e++;
        }
        if (e % 2 === 1 && n % 8n !== 1n && n % 8n !== 7n) {
            s = -s;
        }
        if (a1 === 1n) {
            return s;
        }
        if (n % 4n === 3n && a1 % 4n === 3n) {
            s = -s;
        }
        x = n % a1;
        n = a1;
    }
    if (x === 0n) {
        return 0;
    }
    if (x === 1n) {
        return s;
    }
    return 0;
}

function assertCompressedPoint(name: string, pk: Uint8Array): void {
    if (pk.length !== 33 || (pk[0] !== 0x02 && pk[0] !== 0x03)) {
        throw new Error(`${name} must be a 33-byte compressed secp256k1 point`);
    }
    try {
        ecc.uncompressPk(pk);
    } catch {
        throw new Error(`${name} is not a valid secp256k1 point`);
    }
}

/** Server-side: one nonce R per component slot; signs once. */
export class BlindSigner {
    private k: Uint8Array | undefined;
    private readonly rPoint: Uint8Array;

    constructor() {
        this.k = randomScalarBytes();
        this.rPoint = ecc.derivePubkey(this.k);
    }

    /** Compressed nonce point R = k*G (defensive copy). */
    getR(): Uint8Array {
        return new Uint8Array(this.rPoint);
    }

    sign(roundSeckey: Uint8Array, ebytes: Uint8Array): Uint8Array {
        if (ebytes.length !== 32 || roundSeckey.length !== 32) {
            throw new Error('BlindSigner: expected 32-byte key and challenge');
        }
        const k = this.k;
        if (k === undefined) {
            throw new Error('BlindSigner: attempted to sign twice');
        }
        this.k = undefined;
        try {
            // s = (k + e*x) mod n
            const ex = ecc.seckeyMul(roundSeckey, ebytes);
            try {
                return ecc.seckeyAdd(k, ex);
            } finally {
                zeroBytes(ex);
            }
        } finally {
            zeroBytes(k);
        }
    }
}

/** Client-side: blinds component hash; unblinds server scalar to Schnorr sig. */
export class BlindSignatureRequest {
    private a: Uint8Array | undefined;
    private readonly c: number;
    private readonly Rxnew: Uint8Array;
    private readonly pubkeyCompressed: Uint8Array;
    private readonly messageHash: Uint8Array;
    private readonly e: Uint8Array;

    constructor(pubkey: Uint8Array, R: Uint8Array, messageHash: Uint8Array) {
        if (messageHash.length !== 32) {
            throw new Error('message_hash must be 32 bytes');
        }
        // Fail fast on bad inputs; the retry loop only covers rare EC degeneracy
        // / jacobi-0 (inputs already validated).
        assertCompressedPoint('pubkey', pubkey);
        assertCompressedPoint('R', R);
        this.messageHash = new Uint8Array(messageHash);
        this.pubkeyCompressed = new Uint8Array(pubkey);

        // R' = R + a*G + b*P; c = jacobi(R'.y) ∈ {±1}.
        for (let attempt = 0; attempt < 32; attempt++) {
            const a = randomScalarBytes();
            const b = randomScalarBytes();
            try {
                const bP = ecc.pubkeyMul(pubkey, b);
                const RplusBP = ecc.pubkeyCombine(R, bP);
                const combined = ecc.pubkeyAdd(RplusBP, a);
                const uncompressed = ecc.uncompressPk(combined);
                const Rxnew = uncompressed.subarray(1, 33);
                const y = bytesToScalar(uncompressed.subarray(33));
                const c = jacobi(y, FIELD_SIZE);
                if (c !== 1 && c !== -1) {
                    zeroBytes(a);
                    zeroBytes(b);
                    continue;
                }
                // ehash is public; reduce with bigint then combine with secret b via wasm.
                const ehash = sha256(
                    concatBytes(Rxnew, this.pubkeyCompressed, this.messageHash),
                );
                const ehashMod = modCurveOrder(bytesToScalar(ehash));
                const ehashTweak = scalarToBytes(
                    c === 1 ? ehashMod : modCurveOrder(-ehashMod),
                );
                // e = (b + c*ehash) mod n
                const e = ecc.seckeyAdd(b, ehashTweak);
                this.a = new Uint8Array(a);
                this.c = c;
                this.Rxnew = new Uint8Array(Rxnew);
                this.e = e;
                zeroBytes(a);
                zeroBytes(b);
                return;
            } catch {
                // Point at infinity or other rare EC failure (~2^-256) — retry.
                zeroBytes(a);
                zeroBytes(b);
            }
        }
        throw new Error(
            "BlindSignatureRequest: failed to find valid R' after retries",
        );
    }

    getRequest(): Uint8Array {
        return new Uint8Array(this.e);
    }

    finalize(sbytes: Uint8Array, check = true): Uint8Array {
        if (sbytes.length !== 32) {
            throw new Error('s must be 32 bytes');
        }
        const a = this.a;
        if (a === undefined) {
            throw new Error('BlindSignatureRequest: already finalized');
        }
        this.a = undefined;
        try {
            // s' = c*(s + a) mod n for c ∈ {±1}:
            // always compute (s + a) mod n, then negate when c == -1.
            const sPlusA = ecc.seckeyAdd(sbytes, a);
            let sFinal: Uint8Array;
            if (this.c === -1) {
                sFinal = ecc.seckeyNegate(sPlusA);
                // Intermediate still mixes secret a; s' in the sig is public.
                zeroBytes(sPlusA);
            } else {
                sFinal = sPlusA;
            }
            const sig = concatBytes(this.Rxnew, sFinal);
            if (check) {
                ecc.schnorrVerify(sig, this.messageHash, this.pubkeyCompressed);
            }
            return sig;
        } finally {
            zeroBytes(a);
        }
    }
}

export function buildBlindSigRequests(
    roundPubkey: Uint8Array,
    blindNoncePoints: Uint8Array[],
    components: Uint8Array[],
): { requests: BlindSignatureRequest[]; eValues: Uint8Array[] } {
    if (components.length > blindNoncePoints.length) {
        throw new Error('not enough blind nonce points');
    }
    const requests = components.map(
        (comp, i) =>
            new BlindSignatureRequest(
                roundPubkey,
                blindNoncePoints[i],
                sha256(comp),
            ),
    );
    return {
        requests,
        eValues: requests.map(r => r.getRequest()),
    };
}

export function finalizeBlindSigs(
    requests: BlindSignatureRequest[],
    scalars: Uint8Array[],
): Uint8Array[] {
    if (requests.length !== scalars.length) {
        throw new Error('blind scalar count mismatch');
    }
    return requests.map((r, i) => r.finalize(scalars[i]));
}
