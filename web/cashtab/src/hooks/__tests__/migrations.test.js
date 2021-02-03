import { currency } from '../../components/Common/Ticker';
import BigNumber from 'bignumber.js';
import BCHJS from '@psf/bch-js';
import useBCH from '../useBCH';

describe('Testing functions for upgrading Cashtab', () => {
    it('Replacement currency.dust parameter parsing matches legacy DUST parameter', () => {
        expect(parseFloat(new BigNumber(currency.dust).toFixed(8))).toBe(
            0.00000546,
        );
    });
    it('toSmallestDenomination() returns false if input is not a BigNumber', () => {
        const { toSmallestDenomination } = useBCH();
        const testInput = 132.12345678;
        expect(toSmallestDenomination(testInput)).toBe(false);
    });
    it(`toSmallestDenomination() returns false if input is a BigNumber with more decimals than specified by cashDecimals parameter`, () => {
        const { toSmallestDenomination } = useBCH();
        const testInput = new BigNumber('132.123456789');
        expect(toSmallestDenomination(testInput, 8)).toBe(false);
    });
    it(`toSmallestDenomination() returns expected value if input is a BigNumber with 8 decimal places`, () => {
        const { toSmallestDenomination } = useBCH();

        const testInput = new BigNumber('100.12345678');
        expect(toSmallestDenomination(testInput, 8)).toStrictEqual(
            new BigNumber('10012345678'),
        );
    });
    it(`toSmallestDenomination() returns expected value if input is a BigNumber with 2 decimal places`, () => {
        const { toSmallestDenomination } = useBCH();

        const testInput = new BigNumber('100.12');
        expect(toSmallestDenomination(testInput, 2)).toStrictEqual(
            new BigNumber('10012'),
        );
    });
    it(`toSmallestDenomination() returns expected value if input is a BigNumber with 1 decimal place`, () => {
        const { toSmallestDenomination } = useBCH();

        const testInput = new BigNumber('100.1');
        expect(toSmallestDenomination(testInput, 8)).toStrictEqual(
            new BigNumber('10010000000'),
        );
    });
    it('toSmallestDenomination() returns exact result as toSatoshi but in BigNumber format', () => {
        const BCH = new BCHJS();
        const { toSmallestDenomination } = useBCH();

        const testAmount = new BigNumber('0.12345678');

        // Match legacy implementation, inputting a BigNumber converted to a string by .toFixed(8)
        const testAmountInSatoshis = BCH.BitcoinCash.toSatoshi(
            testAmount.toFixed(8),
        );

        const testAmountInCashDecimals = toSmallestDenomination(testAmount);

        expect(testAmountInSatoshis).toStrictEqual(12345678);
        expect(testAmountInCashDecimals).toStrictEqual(
            new BigNumber(testAmountInSatoshis),
        );
    });
});
