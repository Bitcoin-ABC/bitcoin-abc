// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export type SlpDecimals = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const SATOSHIS_PER_XEC = 100;
const STRINGIFIED_INTEGER_REGEX = /^[0-9]+$/;
const SCI_REGEX_POSTIIVE = /^(\d*\.?\d+)e([+-]?\d+)$/i;

const sciToDecimal = (sciNotation: string): string => {
    let [, mantissa] = sciNotation.match(SCI_REGEX_POSTIIVE) || [];
    const exponent = (sciNotation.match(SCI_REGEX_POSTIIVE) || [])[2];
    if (typeof mantissa === 'undefined' || typeof exponent === 'undefined') {
        return sciNotation;
    }
    const exp = parseInt(exponent, 10);
    if (mantissa.includes('.')) {
        const [intPart, fracPart] = mantissa.split('.');
        if (exp >= 0) {
            mantissa = intPart + fracPart.padEnd(exp, '0');
        } else {
            mantissa = `0.${'0'.repeat(Math.abs(exp) - intPart.length)}${intPart}${fracPart}`;
        }
    } else if (exp >= 0) {
        mantissa = mantissa + '0'.repeat(exp);
    } else {
        mantissa = `0.${'0'.repeat(Math.abs(exp) - mantissa.length)}${mantissa}`;
    }
    return mantissa;
};

export const toXec = (satoshis: bigint | number): number => {
    if (typeof satoshis === 'bigint') {
        satoshis = parseInt(satoshis.toString(), 10);
    }
    if (!Number.isInteger(satoshis)) {
        throw new Error('Input param satoshis must be an integer');
    }
    return satoshis / SATOSHIS_PER_XEC;
};

export const decimalizeTokenAmount = (
    amount: string,
    decimals: SlpDecimals,
): string => {
    if (typeof amount !== 'string') {
        throw new Error('amount must be a string');
    }

    if (SCI_REGEX_POSTIIVE.test(amount)) {
        amount = sciToDecimal(amount);
    }

    if (!STRINGIFIED_INTEGER_REGEX.test(amount)) {
        throw new Error('amount must be a stringified integer');
    }
    if (!Number.isInteger(decimals)) {
        throw new Error('decimals must be an integer');
    }
    if (decimals === 0) {
        return amount;
    }

    if (decimals > amount.length) {
        amount = `${new Array(decimals - amount.length + 1)
            .fill(0)
            .join('')}${amount}`;
    }

    const stringAfterDecimalPoint = amount.slice(-1 * decimals);
    const stringBeforeDecimalPoint = amount.slice(0, amount.length - decimals);
    return `${stringBeforeDecimalPoint}.${stringAfterDecimalPoint}`;
};
