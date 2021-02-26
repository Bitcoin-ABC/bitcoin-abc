import { currency } from '../../components/Common/Ticker';
import BigNumber from 'bignumber.js';
import BCHJS from '@psf/bch-js';
import useBCH from '../useBCH';
import {
    fromSmallestDenomination,
    toSmallestDenomination,
} from '@utils/cashMethods';

describe('Testing functions for upgrading Cashtab', () => {
    it('Replacement currency.dust parameter parsing matches legacy DUST parameter', () => {
        expect(parseFloat(new BigNumber(currency.dust).toFixed(8))).toBe(
            0.00000546,
        );
    });
    it('Replicate 8-decimal return value from instance of toSatoshi in TransactionBuilder with toSmallestDenomination', () => {
        const BCH = new BCHJS();
        const testSendAmount = '0.12345678';
        expect(
            parseInt(toSmallestDenomination(new BigNumber(testSendAmount), 8)),
        ).toBe(BCH.BitcoinCash.toSatoshi(Number(testSendAmount).toFixed(8)));
    });
    it('Replicate 2-decimal return value from instance of toSatoshi in TransactionBuilder with toSmallestDenomination', () => {
        const BCH = new BCHJS();
        const testSendAmount = '0.12';
        expect(
            parseInt(toSmallestDenomination(new BigNumber(testSendAmount), 8)),
        ).toBe(BCH.BitcoinCash.toSatoshi(Number(testSendAmount).toFixed(8)));
    });
    it('Replicate 8-decimal return value from instance of toSatoshi in remainder comparison with toSmallestDenomination', () => {
        const BCH = new BCHJS();
        // note: do not specify 8 decimals as this test SHOULD fail when currency.dust changes or cashDecimals changes if not updated
        expect(
            parseFloat(toSmallestDenomination(new BigNumber(currency.dust))),
        ).toBe(
            BCH.BitcoinCash.toSatoshi(
                parseFloat(new BigNumber(currency.dust).toFixed(8)),
            ),
        );
    });
    it('toSmallestDenomination() returns false if input is not a BigNumber', () => {
        const testInput = 132.12345678;
        expect(toSmallestDenomination(testInput)).toBe(false);
    });
    it(`toSmallestDenomination() returns false if input is a BigNumber with more decimals than specified by cashDecimals parameter`, () => {
        const testInput = new BigNumber('132.123456789');
        expect(toSmallestDenomination(testInput, 8)).toBe(false);
    });
    it(`toSmallestDenomination() returns expected value if input is a BigNumber with 8 decimal places`, () => {
        const testInput = new BigNumber('100.12345678');
        expect(toSmallestDenomination(testInput, 8)).toStrictEqual(
            new BigNumber('10012345678'),
        );
    });
    it(`toSmallestDenomination() returns expected value if input is a BigNumber with 2 decimal places`, () => {
        const testInput = new BigNumber('100.12');
        expect(toSmallestDenomination(testInput, 2)).toStrictEqual(
            new BigNumber('10012'),
        );
    });
    it(`toSmallestDenomination() returns expected value if input is a BigNumber with 1 decimal place`, () => {
        const testInput = new BigNumber('100.1');
        expect(toSmallestDenomination(testInput, 8)).toStrictEqual(
            new BigNumber('10010000000'),
        );
    });
    it('toSmallestDenomination() returns exact result as toSatoshi but in BigNumber format', () => {
        const BCH = new BCHJS();
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
    it(`BigNumber version of remainder variable is equivalent to Math.floor version`, () => {
        // Test case for sending 0.12345678 BCHA
        let satoshisToSendTest = toSmallestDenomination(
            new BigNumber('0.12345678'),
        );
        // Assume total BCHA available in utxos is 500 sats higher than 0.123456578 BCHA
        let originalAmountTest = satoshisToSendTest.plus(500);
        // Assume 229 byte tx fee
        let txFeeTest = 229;

        expect(
            Math.floor(
                originalAmountTest.minus(satoshisToSendTest).minus(txFeeTest),
            ),
        ).toStrictEqual(
            parseInt(
                originalAmountTest.minus(satoshisToSendTest).minus(txFeeTest),
            ),
        );
    });
    it(`Using parseInt on a BigNumber returns output type required for Transaction Builder`, () => {
        const remainder = new BigNumber('12345678');
        expect(parseInt(remainder)).toStrictEqual(12345678);
    });
    it('Replicates return value from instance of toBitcoinCash with fromSmallestDenomination and cashDecimals = 8', () => {
        const BCH = new BCHJS();
        const testSendAmount = '12345678';
        expect(fromSmallestDenomination(testSendAmount, 8)).toBe(
            BCH.BitcoinCash.toBitcoinCash(testSendAmount),
        );
    });
    it('Replicates largest possible digits return value from instance of toBitcoinCash with fromSmallestDenomination and cashDecimals = 8', () => {
        const BCH = new BCHJS();
        const testSendAmount = '1000000012345678';
        expect(fromSmallestDenomination(testSendAmount, 8)).toBe(
            BCH.BitcoinCash.toBitcoinCash(testSendAmount),
        );
    });

    it('Replicates smallest unit value return value from instance of toBitcoinCash with fromSmallestDenomination and cashDecimals = 8', () => {
        const BCH = new BCHJS();
        const testSendAmount = '1';
        expect(fromSmallestDenomination(testSendAmount, 8)).toBe(
            BCH.BitcoinCash.toBitcoinCash(testSendAmount),
        );
    });
});
