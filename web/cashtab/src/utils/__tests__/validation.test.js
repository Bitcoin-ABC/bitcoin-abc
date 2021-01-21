import { shouldRejectAmountInput } from '../validation';
import { currency } from '@components/Common/Ticker.js';

describe('Validation utils', () => {
    it(`Returns 'false' if ${currency.ticker} send amount is a valid send amount`, () => {
        expect(shouldRejectAmountInput('10', currency.ticker, 20.0, 300)).toBe(
            false,
        );
    });
    it(`Returns 'false' if ${currency.ticker} send amount is a valid send amount in USD`, () => {
        // Here, user is trying to send $170 USD, where 1 BCHA = $20 USD, and the user has a balance of 15 BCHA or $300
        expect(shouldRejectAmountInput('170', 'USD', 20.0, 15)).toBe(false);
    });
    it(`Returns not a number if ${currency.ticker} send amount is not a number`, () => {
        const expectedValidationError = `Amount must be a number`;
        expect(
            shouldRejectAmountInput('Not a number', currency.ticker, 20.0, 3),
        ).toBe(expectedValidationError);
    });
    it(`Returns amount must be greater than 0 if ${currency.ticker} send amount is 0`, () => {
        const expectedValidationError = `Amount must be greater than 0`;
        expect(shouldRejectAmountInput('0', currency.ticker, 20.0, 3)).toBe(
            expectedValidationError,
        );
    });
    it(`Returns amount must be greater than 0 if ${currency.ticker} send amount is less than 0`, () => {
        const expectedValidationError = `Amount must be greater than 0`;
        expect(
            shouldRejectAmountInput('-0.031', currency.ticker, 20.0, 3),
        ).toBe(expectedValidationError);
    });
    it(`Returns balance error if ${currency.ticker} send amount is greater than user balance`, () => {
        const expectedValidationError = `Amount cannot exceed your ${currency.ticker} balance`;
        expect(shouldRejectAmountInput('17', currency.ticker, 20.0, 3)).toBe(
            expectedValidationError,
        );
    });
    it(`Returns balance error if ${currency.ticker} send amount is greater than user balance`, () => {
        const expectedValidationError = `Amount cannot exceed your ${currency.ticker} balance`;
        expect(shouldRejectAmountInput('17', currency.ticker, 20.0, 3)).toBe(
            expectedValidationError,
        );
    });
    it(`Returns error if ${currency.ticker} send amount is less than ${currency.dust} minimum`, () => {
        const expectedValidationError = `Send amount must be at least ${currency.dust} ${currency.ticker}`;
        expect(
            shouldRejectAmountInput(
                (currency.dust - 0.00000001).toString(),
                currency.ticker,
                20.0,
                3,
            ),
        ).toBe(expectedValidationError);
    });
    it(`Returns error if ${currency.ticker} send amount is less than ${currency.dust} minimum in fiat currency`, () => {
        const expectedValidationError = `Send amount must be at least ${currency.dust} ${currency.ticker}`;
        expect(
            shouldRejectAmountInput('0.0000005', 'USD', 14.63, 0.52574662),
        ).toBe(expectedValidationError);
    });
    it(`Returns balance error if ${currency.ticker} send amount is greater than user balance with fiat currency selected`, () => {
        const expectedValidationError = `Amount cannot exceed your ${currency.ticker} balance`;
        // Here, user is trying to send $170 USD, where 1 BCHA = $20 USD, and the user has a balance of 5 BCHA or $100
        expect(shouldRejectAmountInput('170', 'USD', 20.0, 5)).toBe(
            expectedValidationError,
        );
    });
    it(`Returns precision error if ${currency.ticker} send amount has more than 8 decimal places`, () => {
        const expectedValidationError = `${currency.ticker} transactions do not support more than 8 decimal places`;
        expect(
            shouldRejectAmountInput('17.123456789', currency.ticker, 20.0, 35),
        ).toBe(expectedValidationError);
    });
});
