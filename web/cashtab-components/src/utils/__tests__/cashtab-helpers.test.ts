import { buildPriceEndpoint } from '../cashtab-helpers';

describe('Component helper functions', () => {
    it('Uses expected price endpoint', () => {
        expect(buildPriceEndpoint('USD')).toBe(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash-abc-2&vs_currencies=USD&include_last_updated_at=true',
        );
    });
});
