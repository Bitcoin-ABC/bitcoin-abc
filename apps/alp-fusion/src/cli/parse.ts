// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Env parsers shared by the coordinator and participant CLIs.
 * Callers pass `fail` so each CLI throws its own config error.
 */

/** Split a comma-separated env value, dropping empty entries. */
export function parseCsv(value: string | undefined): string[] {
    return (value ?? '')
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
}

/**
 * Parse a non-negative integer. `fail` must throw.
 *
 * @param name - Env var name, included in the error
 * @param raw - Already trimmed value
 * @param fail - Throws the caller's config error
 */
export function parseUint(
    name: string,
    raw: string,
    fail: (message: string) => never,
): number {
    if (!/^\d+$/.test(raw)) {
        return fail(`${name} must be an integer, got ${raw}`);
    }
    const n = Number(raw);
    if (!Number.isSafeInteger(n)) {
        return fail(`${name} out of range: ${raw}`);
    }
    return n;
}
