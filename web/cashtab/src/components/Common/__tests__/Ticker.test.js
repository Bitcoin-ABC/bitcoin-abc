import { ValidationError } from 'ecashaddrjs';
import { isValidCashPrefix, isValidTokenPrefix, toLegacy } from '../Ticker';

test('Rejects cash address with bitcoincash: prefix', async () => {
    const result = isValidCashPrefix(
        'bitcoincash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gjykk3wa0',
    );
    expect(result).toStrictEqual(false);
});

test('Correctly validates cash address with bitcoincash: checksum but no prefix', async () => {
    const result = isValidCashPrefix(
        'qphpmfj0qn7znklqhrfn5dq7qh36l3vxavu346vqcl',
    );
    expect(result).toStrictEqual(true);
});

test('Correctly validates cash address with ecash: checksum but no prefix', async () => {
    const result = isValidCashPrefix(
        'qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25mc',
    );
    expect(result).toStrictEqual(true);
});

test('Correctly validates cash address with ecash: prefix', async () => {
    const result = isValidCashPrefix(
        'ecash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25mc',
    );
    expect(result).toStrictEqual(true);
});

test('Rejects token address with simpleledger: prefix', async () => {
    const result = isValidTokenPrefix(
        'simpleledger:qpmytrdsakt0axrrlswvaj069nat3p9s7c8w5tu8gm',
    );
    expect(result).toStrictEqual(false);
});

test('Does not accept a valid token address without a prefix', async () => {
    const result = isValidTokenPrefix(
        'qpmytrdsakt0axrrlswvaj069nat3p9s7c8w5tu8gm',
    );
    expect(result).toStrictEqual(false);
});

test('Correctly validates token address with etoken: prefix (prefix only, not checksum)', async () => {
    const result = isValidTokenPrefix(
        'etoken:qpmytrdsakt0axrrlswvaj069nat3p9s7c8w5tu8gm',
    );
    expect(result).toStrictEqual(true);
});

test('Recognizes unaccepted token prefix (prefix only, not checksum)', async () => {
    const result = isValidTokenPrefix(
        'wtftoken:qpmytrdsakt0axrrlswvaj069nat3p9s7c8w5tu8gm',
    );
    expect(result).toStrictEqual(false);
});

test('Knows that acceptable cash prefixes are not tokens', async () => {
    const result = isValidTokenPrefix(
        'ecash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25mc',
    );
    expect(result).toStrictEqual(false);
});

test('Address with unlisted prefix is invalid', async () => {
    const result = isValidCashPrefix(
        'ecashdoge:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25mc',
    );
    expect(result).toStrictEqual(false);
});

test('toLegacy() converts a valid ecash: prefix address to a valid bitcoincash: prefix address', async () => {
    const result = toLegacy('ecash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25mc');
    expect(result).toStrictEqual(
        'bitcoincash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gjykk3wa0',
    );
});

test('toLegacy() accepts a valid BCH address with no prefix and returns with prefix', async () => {
    const result = toLegacy('qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gjykk3wa0');
    expect(result).toStrictEqual(
        'bitcoincash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gjykk3wa0',
    );
});

test('toLegacy throws error if input address has invalid checksum', async () => {
    const result = toLegacy('ecash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25m');

    expect(result).toStrictEqual(
        new ValidationError(
            'Invalid checksum: ecash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25m.',
        ),
    );
});

test('toLegacy throws error if input address has invalid prefix', async () => {
    const result = toLegacy(
        'notecash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25mc',
    );

    expect(result).toStrictEqual(
        new Error(
            'Address prefix is not a valid cash address with a prefix from the Ticker.prefixes array',
        ),
    );
});
