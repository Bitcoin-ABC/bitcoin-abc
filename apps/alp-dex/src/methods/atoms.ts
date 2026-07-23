// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/** ALP genesis decimals are an integer in 0..9 inclusive. */
export const assertDecimals = (decimals: number): void => {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 9) {
        throw new Error(
            `decimals must be an integer in [0, 9] (got ${decimals})`,
        );
    }
};

/** Trim and reject empty / scientific-notation decimalized quantity strings. */
const normalizeDecimalizedQty = (decimalizedQty: string): string => {
    const trimmed = decimalizedQty.trim();
    if (trimmed === '') {
        throw new Error('decimalizedQty must be a non-empty string');
    }
    if (/e/i.test(trimmed)) {
        throw new Error('decimalizedQty must not use scientific notation');
    }
    return trimmed;
};

/**
 * Convert a decimalized (human) quantity string to base atoms.
 *
 * Uses integer/`bigint` arithmetic only. Exact for inputs such as `"1.50"`;
 * fractional digits beyond `decimals` must be zeros or the call throws.
 */
export const decimalizedQtyToAtoms = (
    decimalizedQty: string,
    decimals: number,
): bigint => {
    assertDecimals(decimals);
    const s = normalizeDecimalizedQty(decimalizedQty);
    if (!/^-?\d+(\.\d+)?$/.test(s)) {
        throw new Error(`decimalizedQty is not a valid decimal: ${s}`);
    }

    const negative = s.startsWith('-');
    const unsigned = negative ? s.slice(1) : s;
    const [wholeRaw, fracRaw = ''] = unsigned.split('.');

    if (fracRaw.length > decimals) {
        const extra = fracRaw.slice(decimals);
        if (!/^0*$/.test(extra)) {
            throw new Error(
                `decimalizedQty ${s} exceeds ${decimals} decimal places`,
            );
        }
    }

    const wholeDigits = wholeRaw === '' ? '0' : wholeRaw;
    const fracPadded = (fracRaw + '0'.repeat(decimals)).slice(0, decimals);
    const scale = 10n ** BigInt(decimals);
    const atoms =
        BigInt(wholeDigits) * scale +
        (decimals === 0 ? 0n : BigInt(fracPadded));
    return negative ? -atoms : atoms;
};

/**
 * Convert base atoms to a decimalized (human) quantity string.
 *
 * Exact `bigint` division; trims trailing fractional zeros.
 */
export const atomsToDecimalizedQty = (
    atoms: bigint,
    decimals: number,
): string => {
    assertDecimals(decimals);
    const negative = atoms < 0n;
    const abs = negative ? -atoms : atoms;

    if (decimals === 0) {
        return `${negative ? '-' : ''}${abs.toString()}`;
    }

    const scale = 10n ** BigInt(decimals);
    const whole = abs / scale;
    const frac = abs % scale;
    const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
    const body =
        fracStr.length === 0
            ? whole.toString()
            : `${whole.toString()}.${fracStr}`;
    return negative ? `-${body}` : body;
};
