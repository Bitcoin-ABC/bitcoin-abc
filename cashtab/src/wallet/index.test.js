import { getBalanceSats } from 'wallet';
import vectors from './fixtures/vectors';

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
