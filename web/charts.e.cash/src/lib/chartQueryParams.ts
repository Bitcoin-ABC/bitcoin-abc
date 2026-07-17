// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Parse a query param as a bounded integer. Rejects partial parses like
 * "10junk" or "1.9" (unlike parseInt). Empty/missing uses fallback.
 */
export function parseBoundedInt(
    value: string | null,
    fallback: number,
    min: number,
    max: number,
): number | null {
    if (value === null || value === '') {
        return fallback;
    }
    if (!/^[+-]?\d+$/.test(value)) {
        return null;
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
        return null;
    }
    return Math.min(max, Math.max(min, parsed));
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True for real calendar days only (rejects 2025-02-30, etc.). */
function isValidIsoDate(value: string): boolean {
    if (!ISO_DATE_RE.test(value)) {
        return false;
    }
    return (
        new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
    );
}

/**
 * Optional start_date / end_date query params (YYYY-MM-DD). Both or neither.
 * Rejects malformed / impossible dates and end before start.
 */
export function parseOptionalDateRange(
    startDate: string | null,
    endDate: string | null,
):
    | { ok: true; startDate?: string; endDate?: string }
    | { ok: false; error: string } {
    const hasStart = startDate !== null && startDate !== '';
    const hasEnd = endDate !== null && endDate !== '';

    if (!hasStart && !hasEnd) {
        return { ok: true };
    }
    if (!hasStart || !hasEnd) {
        return {
            ok: false,
            error: 'start_date and end_date must both be provided',
        };
    }
    if (!isValidIsoDate(startDate!) || !isValidIsoDate(endDate!)) {
        return {
            ok: false,
            error: 'start_date and end_date must be valid YYYY-MM-DD calendar dates',
        };
    }
    if (endDate! < startDate!) {
        return {
            ok: false,
            error: 'end_date must not precede start_date',
        };
    }
    return { ok: true, startDate: startDate!, endDate: endDate! };
}
