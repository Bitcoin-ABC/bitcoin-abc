import {
    fromSmallestDenomination,
    formatBalance,
    batchArray,
    flattenBatchedHydratedUtxos,
    loadStoredWallet,
    isValidStoredWallet,
    fromLegacyDecimals,
    convertToEcashPrefix,
    convertEtokenToSimpleledger,
} from '@utils/cashMethods';
import {
    unbatchedArray,
    arrayBatchedByThree,
} from '../__mocks__/mockBatchedArrays';

import {
    unflattenedHydrateUtxosResponse,
    flattenedHydrateUtxosResponse,
} from '../__mocks__/flattenBatchedHydratedUtxosMocks';
import {
    cachedUtxos,
    utxosLoadedFromCache,
} from '../__mocks__/mockCachedUtxos';
import {
    validStoredWallet,
    invalidStoredWallet,
} from '../__mocks__/mockStoredWallets';

describe('Correctly executes cash utility functions', () => {
    it(`Correctly converts smallest base unit to smallest decimal for cashDecimals = 2`, () => {
        expect(fromSmallestDenomination(1, 2)).toBe(0.01);
    });
    it(`Correctly converts largest base unit to smallest decimal for cashDecimals = 2`, () => {
        expect(fromSmallestDenomination(1000000012345678, 2)).toBe(
            10000000123456.78,
        );
    });
    it(`Correctly converts smallest base unit to smallest decimal for cashDecimals = 8`, () => {
        expect(fromSmallestDenomination(1, 8)).toBe(0.00000001);
    });
    it(`Correctly converts largest base unit to smallest decimal for cashDecimals = 8`, () => {
        expect(fromSmallestDenomination(1000000012345678, 8)).toBe(
            10000000.12345678,
        );
    });
    it(`Correctly converts an array of length 10 to an array of 4 arrays, each with max length 3`, () => {
        expect(batchArray(unbatchedArray, 3)).toStrictEqual(
            arrayBatchedByThree,
        );
    });
    it(`If array length is less than batch size, return original array as first and only element of new array`, () => {
        expect(batchArray(unbatchedArray, 20)).toStrictEqual([unbatchedArray]);
    });
    it(`Flattens hydrateUtxos from Promise.all() response into array that can be parsed by getSlpBalancesAndUtxos`, () => {
        expect(
            flattenBatchedHydratedUtxos(unflattenedHydrateUtxosResponse),
        ).toStrictEqual(flattenedHydrateUtxosResponse);
    });
    it(`Accepts a cachedWalletState that has not preserved BigNumber object types, and returns the same wallet state with BigNumber type re-instituted`, () => {
        expect(loadStoredWallet(cachedUtxos)).toStrictEqual(
            utxosLoadedFromCache,
        );
    });
    it(`Recognizes a stored wallet as valid if it has all required fields`, () => {
        expect(isValidStoredWallet(validStoredWallet)).toBe(true);
    });
    it(`Recognizes a stored wallet as invalid if it is missing required fields`, () => {
        expect(isValidStoredWallet(invalidStoredWallet)).toBe(false);
    });
    it(`Converts a legacy BCH amount to an XEC amount`, () => {
        expect(fromLegacyDecimals(0.00000546, 2)).toStrictEqual(5.46);
    });
    it(`Leaves a legacy BCH amount unchanged if currency.cashDecimals is 8`, () => {
        expect(fromLegacyDecimals(0.00000546, 8)).toStrictEqual(0.00000546);
    });
    it(`convertToEcashPrefix converts a bitcoincash: prefixed address to an ecash: prefixed address`, () => {
        expect(
            convertToEcashPrefix(
                'bitcoincash:qz2708636snqhsxu8wnlka78h6fdp77ar5ulhz04hr',
            ),
        ).toBe('ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035');
    });
    it(`convertToEcashPrefix returns an ecash: prefix address unchanged`, () => {
        expect(
            convertToEcashPrefix(
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            ),
        ).toBe('ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035');
    });
    it(`convertEtokenToSimpleledger returns an etoken: prefix address as simpleledger:`, () => {
        expect(
            convertEtokenToSimpleledger(
                'etoken:qz2708636snqhsxu8wnlka78h6fdp77ar5tv2tzg4r',
            ),
        ).toBe('simpleledger:qz2708636snqhsxu8wnlka78h6fdp77ar5syue64fa');
    });
    it(`convertEtokenToSimpleledger returns a simpleledger: prefix address unchanged`, () => {
        expect(
            convertEtokenToSimpleledger(
                'simpleledger:qz2708636snqhsxu8wnlka78h6fdp77ar5syue64fa',
            ),
        ).toBe('simpleledger:qz2708636snqhsxu8wnlka78h6fdp77ar5syue64fa');
    });
    it(`test formatBalance with an input of 0`, () => {
        expect(formatBalance('0')).toBe('0');
    });
    it(`test formatBalance with zero XEC balance input`, () => {
        expect(formatBalance('0', 'en-US')).toBe('0');
    });
    it(`test formatBalance with a small XEC balance input with 2+ decimal figures`, () => {
        expect(formatBalance('1574.5445', 'en-US')).toBe('1,574.54');
    });
    it(`test formatBalance with 1 Million XEC balance input`, () => {
        expect(formatBalance('1000000', 'en-US')).toBe('1,000,000');
    });
    it(`test formatBalance with 1 Billion XEC balance input`, () => {
        expect(formatBalance('1000000000', 'en-US')).toBe('1,000,000,000');
    });
    it(`test formatBalance with total supply as XEC balance input`, () => {
        expect(formatBalance('21000000000000', 'en-US')).toBe(
            '21,000,000,000,000',
        );
    });
    it(`test formatBalance with > total supply as XEC balance input`, () => {
        expect(formatBalance('31000000000000', 'en-US')).toBe(
            '31,000,000,000,000',
        );
    });
    it(`test formatBalance with no balance`, () => {
        expect(formatBalance('', 'en-US')).toBe('0');
    });
    it(`test formatBalance with null input`, () => {
        expect(formatBalance(null, 'en-US')).toBe('0');
    });
    it(`test formatBalance with undefined as input`, () => {
        expect(formatBalance(undefined, 'en-US')).toBe('NaN');
    });
    it(`test formatBalance with non-numeric input`, () => {
        expect(formatBalance('CainBCHA', 'en-US')).toBe('NaN');
    });
});
