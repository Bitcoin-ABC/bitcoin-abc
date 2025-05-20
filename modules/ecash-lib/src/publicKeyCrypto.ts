// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/** Algorithm instance for public key cryptography */
export class PkcAlgo {
    public algoOid: string;
    public params: string | undefined;

    private constructor(params: {
        algoOid: string;
        params: string | undefined;
    }) {
        this.algoOid = params.algoOid;
        this.params = params.params;
    }

    /**
     * Return a PkcAlgo instance for the given algorithm OID and
     * elliptic curve params (undefined for RSA).
     * Throw an exception if the given algo is not supported, otherwise do nothing.
     */
    public static fromOid(algoOid: string, params?: string): PkcAlgo {
        try {
            PKC.algoSupported!(algoOid, params);
        } catch (ex) {
            throw new Error(ex as string);
        }
        return new PkcAlgo({ algoOid, params });
    }

    /**
     * Verify a signature for the given cryptographic algorithm.
     * Intended to be used in X509 certificate verification.
     * Throw an exception if the algorithm is not supported.
     */
    public verify(sig: Uint8Array, msg: Uint8Array, pk: Uint8Array) {
        try {
            PKC.verify!(this.algoOid, this.params, sig, msg, pk);
        } catch (ex) {
            throw new Error(ex as string);
        }
    }
}

interface EcashLibPkc {
    verify?: (
        algoOid: string,
        params: string | undefined,
        sig: Uint8Array,
        msg: Uint8Array,
        pk: Uint8Array,
    ) => void;
    algoSupported?: (algoOid: string, params?: string) => void;
}

const PKC: EcashLibPkc = {};

export function __setPkc(pkc: EcashLibPkc) {
    PKC.verify = pkc.verify;
    PKC.algoSupported = pkc.algoSupported;
}
