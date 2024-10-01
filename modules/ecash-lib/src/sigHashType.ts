// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/** Type of sighash used to sign for an input for a OP_CHECKSIG operation. */
export class SigHashType {
    /** Variant of the sighash, e.g. LEGACY or BIP143 */
    public variant: SigHashTypeVariant;
    /** How inputs are signed, e.g. FIXED or ANYONECANPAY */
    public inputType: SigHashTypeInputs;
    /** How outputs are signed, e.g. ALL, NONE or SINGLE */
    public outputType: SigHashTypeOutputs;

    public constructor(params: {
        variant: SigHashTypeVariant;
        inputType: SigHashTypeInputs;
        outputType: SigHashTypeOutputs;
    }) {
        this.variant = params.variant;
        this.inputType = params.inputType;
        this.outputType = params.outputType;
    }

    /** Reconstruct a SigHashType from the flags */
    public static fromInt(flags: number): SigHashType | undefined {
        if (flags > 0xff || flags < 0) {
            return undefined;
        }
        // No bits may be set other than 0x80, 0x40, 0x02 and 0x01
        if ((flags & 0x3c) != 0) {
            return undefined;
        }
        const outputFlags = flags & 0x03;
        if (outputFlags == 0) {
            // 0 is not a valid output type
            return undefined;
        }
        return new SigHashType({
            variant:
                flags & 0x40
                    ? SigHashTypeVariant.BIP143
                    : SigHashTypeVariant.LEGACY,
            inputType:
                flags & 0x80
                    ? SigHashTypeInputs.ANYONECANPAY
                    : SigHashTypeInputs.FIXED,
            outputType:
                outputFlags == 1
                    ? SigHashTypeOutputs.ALL
                    : outputFlags == 2
                    ? SigHashTypeOutputs.NONE
                    : SigHashTypeOutputs.SINGLE,
        });
    }

    /** Get the sighash type as integer flags */
    public toInt(): number {
        return this.variant | this.inputType | this.outputType;
    }
}

/** Variant of the sighash */
export enum SigHashTypeVariant {
    /** Original Satoshi, pre-BIP143 sighash */
    LEGACY = 0,
    /** New BIP143 sighash introduced by UAHF */
    BIP143 = 0x40,
}

/** How tx inputs are signed */
export enum SigHashTypeInputs {
    /** Inputs are fixed, no other inputs can added/removeed */
    FIXED = 0,
    /** Inputs are arbitrary, other inputs can be added/removed */
    ANYONECANPAY = 0x80,
}

/** How tx outputs are signed */
export enum SigHashTypeOutputs {
    /** All outputs are signed, no outputs can be added/removed */
    ALL = 1,
    /** No outputs are signed, they can be anything */
    NONE = 2,
    /** The output with the identical index as this input is signed */
    SINGLE = 3,
}

/** ALL|BIP143 */
export const ALL_BIP143: SigHashType = new SigHashType({
    variant: SigHashTypeVariant.BIP143,
    inputType: SigHashTypeInputs.FIXED,
    outputType: SigHashTypeOutputs.ALL,
});

/** ALL|ANYONECANPAY|BIP143 */
export const ALL_ANYONECANPAY_BIP143: SigHashType = new SigHashType({
    variant: SigHashTypeVariant.BIP143,
    inputType: SigHashTypeInputs.ANYONECANPAY,
    outputType: SigHashTypeOutputs.ALL,
});

/** NONE|BIP143 */
export const NONE_BIP143: SigHashType = new SigHashType({
    variant: SigHashTypeVariant.BIP143,
    inputType: SigHashTypeInputs.FIXED,
    outputType: SigHashTypeOutputs.NONE,
});

/** NONE|ANYONECANPAY|BIP143 */
export const NONE_ANYONECANPAY_BIP143: SigHashType = new SigHashType({
    variant: SigHashTypeVariant.BIP143,
    inputType: SigHashTypeInputs.ANYONECANPAY,
    outputType: SigHashTypeOutputs.NONE,
});

/** SINGLE|BIP143 */
export const SINGLE_BIP143: SigHashType = new SigHashType({
    variant: SigHashTypeVariant.BIP143,
    inputType: SigHashTypeInputs.FIXED,
    outputType: SigHashTypeOutputs.SINGLE,
});

/** SINGLE|ANYONECANPAY|BIP143 */
export const SINGLE_ANYONECANPAY_BIP143: SigHashType = new SigHashType({
    variant: SigHashTypeVariant.BIP143,
    inputType: SigHashTypeInputs.ANYONECANPAY,
    outputType: SigHashTypeOutputs.SINGLE,
});

/** ALL|LEGACY */
export const ALL_LEGACY: SigHashType = new SigHashType({
    variant: SigHashTypeVariant.LEGACY,
    inputType: SigHashTypeInputs.FIXED,
    outputType: SigHashTypeOutputs.ALL,
});

/** ALL|ANYONECANPAY|LEGACY */
export const ALL_ANYONECANPAY_LEGACY: SigHashType = new SigHashType({
    variant: SigHashTypeVariant.LEGACY,
    inputType: SigHashTypeInputs.ANYONECANPAY,
    outputType: SigHashTypeOutputs.ALL,
});

/** NONE|LEGACY */
export const NONE_LEGACY: SigHashType = new SigHashType({
    variant: SigHashTypeVariant.LEGACY,
    inputType: SigHashTypeInputs.FIXED,
    outputType: SigHashTypeOutputs.NONE,
});

/** NONE|ANYONECANPAY|LEGACY */
export const NONE_ANYONECANPAY_LEGACY: SigHashType = new SigHashType({
    variant: SigHashTypeVariant.LEGACY,
    inputType: SigHashTypeInputs.ANYONECANPAY,
    outputType: SigHashTypeOutputs.NONE,
});

/** SINGLE|LEGACY */
export const SINGLE_LEGACY: SigHashType = new SigHashType({
    variant: SigHashTypeVariant.LEGACY,
    inputType: SigHashTypeInputs.FIXED,
    outputType: SigHashTypeOutputs.SINGLE,
});

/** SINGLE|ANYONECANPAY|LEGACY */
export const SINGLE_ANYONECANPAY_LEGACY: SigHashType = new SigHashType({
    variant: SigHashTypeVariant.LEGACY,
    inputType: SigHashTypeInputs.ANYONECANPAY,
    outputType: SigHashTypeOutputs.SINGLE,
});
