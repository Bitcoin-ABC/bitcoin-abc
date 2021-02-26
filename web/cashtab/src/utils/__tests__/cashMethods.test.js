import { fromSmallestDenomination } from '@utils/cashMethods';

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
});
