import { checkForTokenById } from '../tokenMethods';
import { mockTokens } from '../__mocks__/mockTokenList';

describe('Correctly executes token parsing methods', () => {
    it(`checkForTokenById returns 'false' if token ID is not found in wallet token list`, () => {
        expect(checkForTokenById(mockTokens, 'not there')).toBe(false);
    });
    it(`checkForTokenById returns 'true' if token ID is found in wallet token list`, () => {
        expect(
            checkForTokenById(
                mockTokens,
                '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
            ),
        ).toBe(true);
    });
});
