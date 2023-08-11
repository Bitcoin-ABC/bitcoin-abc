import BigNumber from 'bignumber.js';
import { fromSatoshisToXec, fromXecToSatoshis } from 'utils/cashMethods';
import appConfig from 'config/app';

describe('Testing functions for upgrading Cashtab', () => {
    it('Replacement appConfig.dustSats parameter parsing matches legacy DUST parameter', () => {
        expect(fromSatoshisToXec(appConfig.dustSats, 8).toNumber()).toBe(
            0.0000055,
        );
    });
    it('Replicate 8-decimal return value from instance of toSatoshi in TransactionBuilder with fromXecToSatoshis', () => {
        const testSendAmount = '0.12345678';
        expect(
            parseInt(fromXecToSatoshis(new BigNumber(testSendAmount), 8)),
        ).toBe(12345678);
    });
    it('Replicate 2-decimal return value from instance of toSatoshi in TransactionBuilder with fromXecToSatoshis', () => {
        const testSendAmount = '0.12';
        expect(
            parseInt(fromXecToSatoshis(new BigNumber(testSendAmount), 8)),
        ).toBe(12000000);
    });
    it('Replicate 8-decimal return value from instance of toSatoshi in remainder comparison with fromXecToSatoshis', () => {
        expect(
            parseFloat(fromXecToSatoshis(new BigNumber('0.00000546'), 8)),
        ).toBe(546);
    });
    it('fromXecToSatoshis() returns false if input is not a BigNumber', () => {
        const testInput = 132.12345678;
        expect(fromXecToSatoshis(testInput)).toBe(false);
    });
    it(`fromXecToSatoshis() returns false if input is a BigNumber with more decimals than specified by cashDecimals parameter`, () => {
        const testInput = new BigNumber('132.123456789');
        expect(fromXecToSatoshis(testInput, 8)).toBe(false);
    });
    it(`fromXecToSatoshis() returns expected value if input is a BigNumber with 8 decimal places`, () => {
        const testInput = new BigNumber('100.12345678');
        expect(fromXecToSatoshis(testInput, 8)).toStrictEqual(
            new BigNumber('10012345678'),
        );
    });
    it(`fromXecToSatoshis() returns expected value if input is a BigNumber with 2 decimal places`, () => {
        const testInput = new BigNumber('100.12');
        expect(fromXecToSatoshis(testInput, 2)).toStrictEqual(
            new BigNumber('10012'),
        );
    });
    it(`fromXecToSatoshis() returns expected value if input is a BigNumber with 1 decimal place`, () => {
        const testInput = new BigNumber('100.1');
        expect(fromXecToSatoshis(testInput, 8)).toStrictEqual(
            new BigNumber('10010000000'),
        );
    });
    it('fromXecToSatoshis() returns exact result as toSatoshi but in BigNumber format', () => {
        const testAmount = new BigNumber('0.12345678');

        // Match legacy implementation, inputting a BigNumber converted to a string by .toFixed(8)
        const testAmountInSatoshis = 12345678;

        const testAmountInCashDecimals = fromXecToSatoshis(testAmount, 8);

        expect(testAmountInSatoshis).toStrictEqual(12345678);
        expect(testAmountInCashDecimals).toStrictEqual(
            new BigNumber(testAmountInSatoshis),
        );
    });
    it(`BigNumber version of remainder variable is equivalent to Math.floor version`, () => {
        // Test case for sending 0.12345678 BCHA
        let satoshisToSendTest = fromXecToSatoshis(
            new BigNumber('0.12345678'),
            8,
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
    it('Replicates return value from instance of toBitcoinCash with fromSatoshisToXec and cashDecimals = 8', () => {
        const testSendAmount = '12345678';
        expect(fromSatoshisToXec(testSendAmount, 8).toNumber()).toBe(
            0.12345678,
        );
    });
    it('Replicates largest possible digits return value from instance of toBitcoinCash with fromSatoshisToXec and cashDecimals = 8', () => {
        const testSendAmount = '1000000012345678';
        expect(fromSatoshisToXec(testSendAmount, 8).toNumber()).toBe(
            10000000.12345678,
        );
    });

    it('Replicates smallest unit value return value from instance of toBitcoinCash with fromSatoshisToXec and cashDecimals = 8', () => {
        const testSendAmount = '1';
        expect(fromSatoshisToXec(testSendAmount, 8).toNumber()).toBe(1e-8);
    });

    it(`Converts dust limit in satoshis to dust limit in current app setting`, () => {
        expect(fromSatoshisToXec(appConfig.dustSats, 8).toString()).toBe(
            '0.0000055',
        );
    });
});
