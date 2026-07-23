// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import {
    atomsToDecimalizedQty,
    decimalizedQtyToAtoms,
} from '../src/methods/atoms';

/** ALP mint/send amounts are 6-byte LE integers (max 2^48 - 1 atoms). */
const ALP_MAX_ATOMS_PER_AMOUNT = (1n << 48n) - 1n;

describe('atoms', () => {
    describe('decimalizedQtyToAtoms', () => {
        it('converts exact decimal strings with bigint arithmetic', () => {
            assert.strictEqual(decimalizedQtyToAtoms('20', 0), 20n);
            assert.strictEqual(decimalizedQtyToAtoms('1', 2), 100n);
            assert.strictEqual(decimalizedQtyToAtoms('1.5', 2), 150n);
            assert.strictEqual(decimalizedQtyToAtoms('1.50', 2), 150n);
            assert.strictEqual(decimalizedQtyToAtoms('0.01', 2), 1n);
            assert.strictEqual(decimalizedQtyToAtoms('0', 8), 0n);
            assert.strictEqual(
                decimalizedQtyToAtoms('123456789.123456789', 9),
                123456789123456789n,
            );
        });

        it('allows trailing zeros beyond decimals', () => {
            assert.strictEqual(decimalizedQtyToAtoms('1.5000', 2), 150n);
        });

        it('supports negative quantities', () => {
            assert.strictEqual(decimalizedQtyToAtoms('-1.5', 2), -150n);
            assert.strictEqual(decimalizedQtyToAtoms('-2', 0), -2n);
        });

        it('handles ALP max per-amount atoms and multi-mint supplies', () => {
            // Single ALP amount field max (6-byte): still within safe integer,
            // but must round-trip as string/bigint, not via Number.
            assert.strictEqual(
                decimalizedQtyToAtoms(ALP_MAX_ATOMS_PER_AMOUNT.toString(), 0),
                ALP_MAX_ATOMS_PER_AMOUNT,
            );
            assert.strictEqual(
                atomsToDecimalizedQty(ALP_MAX_ATOMS_PER_AMOUNT, 0),
                '281474976710655',
            );
            assert.strictEqual(
                decimalizedQtyToAtoms('281474976710.655', 3),
                ALP_MAX_ATOMS_PER_AMOUNT,
            );

            // Aggregate supply across mint batons can exceed 2^48 and
            // Number.MAX_SAFE_INTEGER; string/bigint stay exact.
            const hugeSupply = '999999999999999999999999999';
            const hugeAtoms = decimalizedQtyToAtoms(hugeSupply, 0);
            assert.strictEqual(hugeAtoms, 999999999999999999999999999n);
            assert.strictEqual(atomsToDecimalizedQty(hugeAtoms, 0), hugeSupply);
            assert.ok(hugeAtoms > BigInt(Number.MAX_SAFE_INTEGER));
        });

        it('stays exact past Number.MAX_SAFE_INTEGER where Number would lie', () => {
            // 2^53 + 1 cannot be represented as a JS number (literal or parse).
            const unsafeInt = '9007199254740993';
            assert.strictEqual(Number(unsafeInt), 9007199254740992);
            assert.notStrictEqual(String(Number(unsafeInt)), unsafeInt);

            assert.strictEqual(
                decimalizedQtyToAtoms(unsafeInt, 0),
                9007199254740993n,
            );
            assert.strictEqual(
                atomsToDecimalizedQty(9007199254740993n, 0),
                unsafeInt,
            );

            // Fractional decimalized qty past the safe-integer boundary.
            const qty = '9007199254740993.000000001';
            assert.strictEqual(
                decimalizedQtyToAtoms(qty, 9),
                9007199254740993000000001n,
            );
            assert.strictEqual(
                atomsToDecimalizedQty(9007199254740993000000001n, 9),
                qty,
            );
        });

        it('rejects excess precision and invalid input', () => {
            assert.throws(
                () => decimalizedQtyToAtoms('1.001', 2),
                /exceeds 2 decimal places/,
            );
            assert.throws(
                () => decimalizedQtyToAtoms('1e2', 0),
                /scientific notation/,
            );
            assert.throws(() => decimalizedQtyToAtoms('', 2), /non-empty/);
            assert.throws(
                () => decimalizedQtyToAtoms('abc', 2),
                /not a valid decimal/,
            );
            assert.throws(
                () => decimalizedQtyToAtoms('1', -1),
                /decimals must be an integer in \[0, 9\]/,
            );
            assert.throws(
                () => decimalizedQtyToAtoms('1', 10),
                /decimals must be an integer in \[0, 9\]/,
            );
            assert.throws(
                () => atomsToDecimalizedQty(1n, 18),
                /decimals must be an integer in \[0, 9\]/,
            );
        });
    });

    describe('atomsToDecimalizedQty', () => {
        it('converts atoms to trimmed decimal strings', () => {
            assert.strictEqual(atomsToDecimalizedQty(20n, 0), '20');
            assert.strictEqual(atomsToDecimalizedQty(100n, 2), '1');
            assert.strictEqual(atomsToDecimalizedQty(150n, 2), '1.5');
            assert.strictEqual(atomsToDecimalizedQty(1n, 2), '0.01');
            assert.strictEqual(atomsToDecimalizedQty(0n, 8), '0');
            assert.strictEqual(
                atomsToDecimalizedQty(123456789123456789n, 9),
                '123456789.123456789',
            );
        });

        it('supports negative atoms', () => {
            assert.strictEqual(atomsToDecimalizedQty(-150n, 2), '-1.5');
        });
    });

    describe('round trip', () => {
        const cases: Array<{ qty: string; decimals: number }> = [
            { qty: '0', decimals: 0 },
            { qty: '0', decimals: 8 },
            { qty: '1', decimals: 0 },
            { qty: '1.5', decimals: 2 },
            { qty: '0.00000001', decimals: 8 },
            { qty: '999999999999999999', decimals: 0 },
            { qty: '-12.34', decimals: 2 },
            { qty: '123456789.123456789', decimals: 9 },
            { qty: '281474976710655', decimals: 0 },
            { qty: '281474976710.655', decimals: 3 },
            { qty: '9007199254740993', decimals: 0 },
            { qty: '999999999999999999999999999.123456789', decimals: 9 },
        ];

        for (const { qty, decimals } of cases) {
            it(`${qty} @ ${decimals} decimals`, () => {
                const atoms = decimalizedQtyToAtoms(qty, decimals);
                const back = atomsToDecimalizedQty(atoms, decimals);
                // Canonical form may drop trailing zeros after the point.
                assert.strictEqual(
                    decimalizedQtyToAtoms(back, decimals),
                    atoms,
                );
                assert.strictEqual(decimalizedQtyToAtoms(qty, decimals), atoms);
            });
        }
    });
});
