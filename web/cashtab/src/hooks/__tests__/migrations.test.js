import { currency } from '../../components/Common/Ticker';
import BigNumber from 'bignumber.js';

describe('Testing functions for upgrading Cashtab', () => {
    it('Replacement currency.dust parameter parsing matches legacy DUST parameter', () => {
        expect(parseFloat(new BigNumber(currency.dust).toFixed(8))).toBe(
            0.00000546,
        );
    });
});
