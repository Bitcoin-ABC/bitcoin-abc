// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Parse a dotted app version into numeric segments (ignores pre-release suffix).
 * Invalid or empty input returns an empty array.
 */
export const parseAppVersionSegments = (version: string): number[] => {
    const trimmed = version.trim();
    if (trimmed === '') {
        return [];
    }
    const core = trimmed.split('-')[0];
    if (typeof core === 'undefined' || core === '') {
        return [];
    }
    const segments = core.split('.').map(part => {
        if (part === '' || !/^\d+$/.test(part)) {
            return NaN;
        }
        return Number.parseInt(part, 10);
    });
    if (segments.some(segment => Number.isNaN(segment))) {
        return [];
    }
    return segments;
};

/**
 * Compare dotted app versions (e.g. 5.24.0 vs 5.25.0).
 * @returns Negative if `left` is older, positive if newer, 0 if equal.
 * Invalid versions compare as 0 (not outdated).
 */
export const compareAppVersions = (left: string, right: string): number => {
    const leftSegments = parseAppVersionSegments(left);
    const rightSegments = parseAppVersionSegments(right);
    if (leftSegments.length === 0 || rightSegments.length === 0) {
        return 0;
    }
    const length = Math.max(leftSegments.length, rightSegments.length);
    for (let i = 0; i < length; i += 1) {
        const leftValue = leftSegments[i] ?? 0;
        const rightValue = rightSegments[i] ?? 0;
        if (leftValue !== rightValue) {
            return leftValue - rightValue;
        }
    }
    return 0;
};

/**
 * True when `installedVersion` is a valid version strictly older than `latestVersion`.
 */
export const isAppVersionOutdated = (
    installedVersion: string,
    latestVersion: string,
): boolean => compareAppVersions(installedVersion, latestVersion) < 0;
