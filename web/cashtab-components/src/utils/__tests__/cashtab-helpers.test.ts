import {
    buildPriceEndpoint,
    priceToSatoshis,
    adjustAmount,
} from '../cashtab-helpers';

describe('Helper functions match expected performance', () => {
    it('Component uses expected price endpoint', () => {
        expect(buildPriceEndpoint('USD')).toBe(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash-abc-2&vs_currencies=USD&include_last_updated_at=true',
        );
    });

    it('Correctly returns BCHA amount in satoshis given (1) fiat price of BCHA and (2) fiat amount of requested satoshis', () => {
        expect(priceToSatoshis(20, 10)).toBe(50000000);
    });

    it('Converts amount in satoshis as number to amount in BCHA as string', () => {
        expect(adjustAmount(50000000, 8, true)).toBe('0.5');
    });

    it('Converts amount in BCHA as number to amount in satoshis as string', () => {
        expect(adjustAmount(0.5, 8, false)).toBe('50000000');
    });

    it('Converts amount in base unit of arbitrary decimal places as number to amount in as string', () => {
        expect(adjustAmount(50000000, 10, true)).toBe('0.005');
    });

    it('Converts amount with arbitrary decimal places as number to amount as base unit (no decimal places) as string', () => {
        expect(adjustAmount(0.005, 10, false)).toBe('50000000');
    });
});
