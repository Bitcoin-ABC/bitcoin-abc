import {
    fromSmallestDenomination,
    formatBalance,
    batchArray,
    flattenBatchedHydratedUtxos,
    loadStoredWallet,
    isValidStoredWallet,
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
    it(`Formats a large number to add spaces as thousands separator`, () => {
        expect(formatBalance(1000000012345678)).toBe('1 000 000 012 345 678');
    });
    it(`Formats a large number with 2 decimal places to add as thousands separator`, () => {
        expect(formatBalance(10000000123456.78)).toBe('10 000 000 123 456.78');
    });
    it(`Formats a large number with 9 decimal places to add as thousands separator without adding them to decimals`, () => {
        expect(formatBalance('10000000123456.789123456')).toBe(
            '10 000 000 123 456.789123456',
        );
    });
    it(`formatBalance handles an input of 0`, () => {
        expect(formatBalance('0')).toBe('0');
    });
    it(`formatBalance handles an input of undefined`, () => {
        expect(formatBalance(undefined)).toBe(undefined);
    });
    it(`formatBalance handles an input of null`, () => {
        expect(formatBalance(null)).toBe(null);
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
});
