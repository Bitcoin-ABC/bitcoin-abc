// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    isMobile,
    isAndroidMobileWebUserAgent,
    getUserLocale,
    cashtabCacheToJSON,
    storedCashtabCacheToMap,
    previewAddress,
    previewTokenId,
    previewSolAddr,
    getMultisendTargetOutputs,
    parseTokenMultisendRows,
} from 'helpers';
import vectors from 'helpers/fixtures/vectors';

describe('Cashtab helper functions', () => {
    describe('Detect mobile or desktop devices', () => {
        const { expectedReturns } = vectors.isMobile;

        expectedReturns.forEach(expectedReturn => {
            const { description, navigator, result } = expectedReturn;
            it(`isMobile: ${description}`, () => {
                expect(isMobile(navigator)).toBe(result);
            });
        });
    });
    describe('Detect Android phone browser (Cashtab Web app promo)', () => {
        const { expectedReturns } = vectors.isAndroidMobileWebUserAgent;

        expectedReturns.forEach(expectedReturn => {
            const { description, navigator, result } = expectedReturn;
            it(`isAndroidMobileWebUserAgent: ${description}`, () => {
                expect(isAndroidMobileWebUserAgent(navigator)).toBe(result);
            });
        });
    });
    describe('Get user locale', () => {
        const { expectedReturns } = vectors.getUserLocale;

        expectedReturns.forEach(expectedReturn => {
            const { description, navigator, result } = expectedReturn;
            it(`getUserLocale: ${description}`, () => {
                expect(getUserLocale(navigator)).toBe(result);
            });
        });
    });
    describe('Converts cashtabCache to and from JSON for storage and in-app use', () => {
        const { expectedReturns } = vectors.cashtabCacheToJSON;

        expectedReturns.forEach(expectedReturn => {
            const { description, cashtabCache, cashtabCacheJson } =
                expectedReturn;
            it(`cashtabCacheToJSON and storedCashtabCacheToMap: ${description}`, () => {
                expect(cashtabCacheToJSON(cashtabCache)).toEqual(
                    cashtabCacheJson,
                );
                expect(storedCashtabCacheToMap(cashtabCacheJson)).toEqual(
                    cashtabCache,
                );
            });
        });
    });
    describe('Address and token ID preview functions', () => {
        it('previewAddress: should format ecash addresses correctly', () => {
            const address = 'ecash:qzs4zzxs0gvfrc6e2wqhkmvj4dmmh332cvfpd7yjep';
            expect(previewAddress(address)).toBe('qzs...jep');
        });

        it('previewAddress: should handle addresses without prefix', () => {
            const address = 'qzs4zzxs0gvfrc6e2wqhkmvj4dmmh332cvfpd7yjep';
            expect(previewAddress(address)).toBe('qzs...jep');
        });

        it('previewTokenId: should format token IDs correctly', () => {
            const tokenId =
                '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e';
            expect(previewTokenId(tokenId)).toBe('50d...10e');
        });

        it('previewTokenId: should handle short token IDs', () => {
            const tokenId = 'abc123';
            expect(previewTokenId(tokenId)).toBe('abc...123');
        });

        it('previewSolAddr: should format Sol addresses correctly', () => {
            const solAddr = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            expect(previewSolAddr(solAddr)).toBe('9Wz...WWM');
        });

        it('previewSolAddr: should handle short Sol addresses', () => {
            const solAddr = 'abc123';
            expect(previewSolAddr(solAddr)).toBe('abc...123');
        });
    });

    describe('getMultisendTargetOutputs', () => {
        // Unit test for each vector in fixtures for the getMultisendTargetOutputs case
        const { expectedReturns } = vectors.getMultisendTargetOutputs;

        // Successfully built and broadcast txs
        expectedReturns.forEach(expectedReturn => {
            const { description, userMultisendInput, targetOutputs } =
                expectedReturn;
            it(`getMultisendTargetOutputs: ${description}`, () => {
                expect(
                    getMultisendTargetOutputs(userMultisendInput),
                ).toStrictEqual(targetOutputs);
            });
        });
    });

    describe('parseTokenMultisendRows', () => {
        it('parses two CSV lines into address and decimalized qty', () => {
            const input = `ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 1.5\necash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6,2`;
            expect(parseTokenMultisendRows(input)).toStrictEqual([
                {
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    decimalizedQty: '1.5',
                },
                {
                    address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    decimalizedQty: '2',
                },
            ]);
        });

        it('rejects empty lines with the same message as isValidTokenMultiSendUserInput', () => {
            expect(() =>
                parseTokenMultisendRows(
                    'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035,1\n',
                ),
            ).toThrow('Remove empty row at line 2');
            expect(() =>
                parseTokenMultisendRows(
                    'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035,1\n\necash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6,2',
                ),
            ).toThrow('Remove empty row at line 2');
        });
    });
});
