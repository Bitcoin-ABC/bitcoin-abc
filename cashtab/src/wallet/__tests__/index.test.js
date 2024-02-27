import { getBalanceSats, toXec, toSatoshis, hasEnoughToken } from 'wallet';
import vectors from '../fixtures/vectors';

describe('Calculates total balance in satoshis from a valid set of chronik utxos', () => {
    const { expectedReturns, expectedErrors } = vectors.getBalanceSatsVectors;
    expectedReturns.forEach(expectedReturn => {
        const { description, nonSlpUtxos, balanceSats } = expectedReturn;
        it(`getBalanceSats: ${description}`, () => {
            expect(getBalanceSats(nonSlpUtxos)).toBe(balanceSats);
        });
    });
    expectedErrors.forEach(expectedError => {
        const { description, nonSlpUtxos, errorMsg } = expectedError;
        it(`getBalanceSats throws error for: ${description}`, () => {
            expect(() => getBalanceSats(nonSlpUtxos)).toThrow(errorMsg);
        });
    });
});

describe('Converts satoshis to XEC and XEC to satoshis', () => {
    const { expectedReturns, expectedErrors } = vectors.toXec;
    expectedReturns.forEach(expectedReturn => {
        const { description, xec, satoshis } = expectedReturn;
        it(`Converts satoshis to xec: ${description}`, () => {
            const satsResult = toXec(satoshis);
            expect(satsResult).toBe(xec);
            // Check string equality as well as JS floating point comparisons
            // are unreliable for large numbers
            expect(satsResult.toString()).toBe(xec.toString());
        });
        it(`Converts xec to satoshis: ${description}`, () => {
            const xecResult = toSatoshis(xec);
            expect(xecResult).toBe(satoshis);
            // Check string equality as well as JS floating point comparisons
            // are unreliable for large numbers
            expect(xecResult.toString()).toBe(satoshis.toString());
        });
    });
    // toXec does not accept non-integer input
    expectedErrors.forEach(expectedError => {
        const { description, satoshis, errorMsg } = expectedError;
        it(`toXec throws error for: ${description}`, () => {
            expect(() => toXec(satoshis)).toThrow(errorMsg);
        });
    });
    // toSatoshis will not return non-integer input
    vectors.toSatoshis.expectedErrors.forEach(expectedError => {
        const { description, xec, errorMsg } = expectedError;
        it(`toSatoshis throws error for: ${description}`, () => {
            expect(() => toSatoshis(xec)).toThrow(errorMsg);
        });
    });
});

describe('Determines if the wallet has greater than or equal to a specified qty of a specified token', () => {
    const { expectedReturns } = vectors.hasEnoughToken;
    expectedReturns.forEach(expectedReturn => {
        const { description, tokens, tokenId, tokenQty, hasEnough } =
            expectedReturn;
        it(`hasEnoughToken: ${description}`, () => {
            expect(hasEnoughToken(tokens, tokenId, tokenQty)).toBe(hasEnough);
        });
    });
});
