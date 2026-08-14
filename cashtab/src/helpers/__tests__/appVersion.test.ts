// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    compareAppVersions,
    isAppVersionOutdated,
    parseAppVersionSegments,
} from 'helpers/appVersion';

describe('parseAppVersionSegments', () => {
    it('parses dotted numeric versions', () => {
        expect(parseAppVersionSegments('5.25.0')).toEqual([5, 25, 0]);
    });

    it('strips a pre-release suffix', () => {
        expect(parseAppVersionSegments('1.2.3-beta.1')).toEqual([1, 2, 3]);
    });

    it('returns empty for invalid input', () => {
        expect(parseAppVersionSegments('')).toEqual([]);
        expect(parseAppVersionSegments('  ')).toEqual([]);
        expect(parseAppVersionSegments('latest')).toEqual([]);
        expect(parseAppVersionSegments('1.2.x')).toEqual([]);
    });
});

describe('compareAppVersions', () => {
    it('orders patch, minor, and major differences', () => {
        expect(compareAppVersions('5.24.0', '5.25.0')).toBeLessThan(0);
        expect(compareAppVersions('5.25.0', '5.24.0')).toBeGreaterThan(0);
        expect(compareAppVersions('5.25.0', '5.26.0')).toBeLessThan(0);
        expect(compareAppVersions('6.0.0', '5.99.99')).toBeGreaterThan(0);
    });

    it('treats missing trailing segments as zero', () => {
        expect(compareAppVersions('1.0', '1.0.0')).toBe(0);
        expect(compareAppVersions('1.2', '1.2.1')).toBeLessThan(0);
    });

    it('returns 0 for equal or invalid versions', () => {
        expect(compareAppVersions('5.25.0', '5.25.0')).toBe(0);
        expect(compareAppVersions('', '5.25.0')).toBe(0);
        expect(compareAppVersions('5.25.0', 'nope')).toBe(0);
    });
});

describe('isAppVersionOutdated', () => {
    it('is true only when installed is strictly older', () => {
        expect(isAppVersionOutdated('5.24.0', '5.25.0')).toBe(true);
        expect(isAppVersionOutdated('5.25.0', '5.25.0')).toBe(false);
        expect(isAppVersionOutdated('5.25.1', '5.25.0')).toBe(false);
        expect(isAppVersionOutdated('bad', '5.25.0')).toBe(false);
    });
});
