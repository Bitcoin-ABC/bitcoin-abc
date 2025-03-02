// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/** Interface to abstract over Elliptic Curve Cryptography */
export interface Ecc {
    /** Derive a public key from secret key. */
    derivePubkey(seckey: Uint8Array): Uint8Array;

    /** Sign an ECDSA signature. msg needs to be a 32-byte hash */
    ecdsaSign(seckey: Uint8Array, msg: Uint8Array): Uint8Array;

    /**
     * Verify an ECDSA signature. msg needs to be a 32-byte hash.
     * Throws an exception if the signature is invalid.
     **/
    ecdsaVerify(sig: Uint8Array, msg: Uint8Array, pk: Uint8Array): void;

    /** Sign a Schnorr signature. msg needs to be a 32-byte hash */
    schnorrSign(seckey: Uint8Array, msg: Uint8Array): Uint8Array;

    /**
     * Verify a Schnorr signature. msg needs to be a 32-byte hash.
     * Throws an exception if the signature is invalid.
     **/
    schnorrVerify(sig: Uint8Array, msg: Uint8Array, pk: Uint8Array): void;

    /**
     * Return whether the given secret key is valid, i.e. whether is of correct
     * length (32 bytes) and is on the curve.
     */
    isValidSeckey(seckey: Uint8Array): boolean;

    /** Add a scalar to a secret key */
    seckeyAdd(a: Uint8Array, b: Uint8Array): Uint8Array;

    /** Add a scalar to a public key (adding G*b) */
    pubkeyAdd(a: Uint8Array, b: Uint8Array): Uint8Array;

    /** Sign a ECDSA recoverable signature, includes the recovery ID */
    signRecoverable(seckey: Uint8Array, msg: Uint8Array): Uint8Array;

    /** Recover the public key of an ECDSA signed signature (with recovery ID) */
    recoverSig(sig: Uint8Array, msg: Uint8Array): Uint8Array;

    /** Compress an uncompressed public key (must start with 0x04) */
    compressPk(pk: Uint8Array): Uint8Array;
}

/** Dummy Ecc impl that always returns 0, useful for measuring tx size */
export class EccDummy implements Ecc {
    derivePubkey(_seckey: Uint8Array): Uint8Array {
        return new Uint8Array(33);
    }

    ecdsaSign(_seckey: Uint8Array, _msg: Uint8Array): Uint8Array {
        return new Uint8Array(73);
    }

    ecdsaVerify(_sig: Uint8Array, _msg: Uint8Array, _pk: Uint8Array): void {}

    schnorrSign(_seckey: Uint8Array, _msg: Uint8Array): Uint8Array {
        return new Uint8Array(64);
    }

    schnorrVerify(_sig: Uint8Array, _msg: Uint8Array, _pk: Uint8Array): void {}

    isValidSeckey(_seckey: Uint8Array): boolean {
        return false;
    }

    seckeyAdd(_a: Uint8Array, _b: Uint8Array): Uint8Array {
        return new Uint8Array(32);
    }

    pubkeyAdd(_a: Uint8Array, _b: Uint8Array): Uint8Array {
        return new Uint8Array(32);
    }

    signRecoverable(_seckey: Uint8Array, _msg: Uint8Array): Uint8Array {
        return new Uint8Array(65);
    }

    recoverSig(_sig: Uint8Array, _msg: Uint8Array): Uint8Array {
        return new Uint8Array(33);
    }

    compressPk(_pk: Uint8Array): Uint8Array {
        return new Uint8Array(33);
    }
}

type FfiEcc = Omit<Ecc, 'compressPk'>;
const ECC: { ecc?: FfiEcc } = {};

export function __setEcc(ecc: FfiEcc) {
    ECC.ecc = ecc;
}

export class Ecc implements Ecc {
    /** Derive a public key from secret key. */
    derivePubkey(seckey: Uint8Array): Uint8Array {
        return ECC.ecc!.derivePubkey(seckey);
    }

    /** Sign an ECDSA signature. msg needs to be a 32-byte hash */
    ecdsaSign(seckey: Uint8Array, msg: Uint8Array): Uint8Array {
        return ECC.ecc!.ecdsaSign(seckey, msg);
    }

    /**
     * Verify an ECDSA signature. msg needs to be a 32-byte hash.
     * Throws an exception if the signature is invalid.
     **/
    ecdsaVerify(sig: Uint8Array, msg: Uint8Array, pk: Uint8Array): void {
        ECC.ecc?.ecdsaVerify(sig, msg, pk);
    }

    /** Sign a Schnorr signature. msg needs to be a 32-byte hash */
    schnorrSign(seckey: Uint8Array, msg: Uint8Array): Uint8Array {
        return ECC.ecc!.schnorrSign(seckey, msg);
    }

    /**
     * Verify a Schnorr signature. msg needs to be a 32-byte hash.
     * Throws an exception if the signature is invalid.
     **/
    schnorrVerify(sig: Uint8Array, msg: Uint8Array, pk: Uint8Array): void {
        ECC.ecc?.schnorrVerify(sig, msg, pk);
    }

    /**
     * Return whether the given secret key is valid, i.e. whether is of correct
     * length (32 bytes) and is on the curve.
     */
    isValidSeckey(seckey: Uint8Array): boolean {
        return ECC.ecc!.isValidSeckey(seckey);
    }

    /** Add a scalar to a secret key */
    seckeyAdd(a: Uint8Array, b: Uint8Array): Uint8Array {
        return ECC.ecc!.seckeyAdd(a, b);
    }

    /** Add a scalar to a public key (adding G*b) */
    pubkeyAdd(a: Uint8Array, b: Uint8Array): Uint8Array {
        return ECC.ecc!.pubkeyAdd(a, b);
    }

    signRecoverable(seckey: Uint8Array, msg: Uint8Array): Uint8Array {
        return ECC.ecc!.signRecoverable(seckey, msg);
    }

    recoverSig(sig: Uint8Array, msg: Uint8Array): Uint8Array {
        return ECC.ecc!.recoverSig(sig, msg);
    }

    compressPk(pk: Uint8Array): Uint8Array {
        if (pk[0] != 0x04) {
            throw new Error('Uncompressed pubkey must start with 0x04');
        }
        const compressedPk = new Uint8Array(33);
        compressedPk[0] = 0x02 | (pk[64] & 0x01);
        compressedPk.set(pk.slice(1, 33), 1);
        return compressedPk;
    }
}
