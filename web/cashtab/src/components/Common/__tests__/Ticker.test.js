import { ValidationError } from 'ecashaddrjs';
import {
    isValidCashPrefix,
    isValidTokenPrefix,
    toLegacy,
    toLegacyArray,
    isCashtabOutput,
    isEtokenOutput,
    extractCashtabMessage,
    extractExternalMessage,
    getETokenEncodingSubstring,
    getCashtabEncodingSubstring,
} from '../Ticker';
import {
    validAddressArrayInput,
    validAddressArrayOutput,
    validLargeAddressArrayInput,
    validLargeAddressArrayOutput,
    invalidAddressArrayInput,
} from '../__mocks__/mockAddressArray';

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

test('toLegacyArray throws error if the addressArray input is null', async () => {
    const result = toLegacyArray(null);

    expect(result).toStrictEqual(new Error('Invalid addressArray input'));
});

test('toLegacyArray throws error if the addressArray input is empty', async () => {
    const result = toLegacyArray([]);

    expect(result).toStrictEqual(new Error('Invalid addressArray input'));
});

test('toLegacyArray throws error if the addressArray input is a number', async () => {
    const result = toLegacyArray(12345);

    expect(result).toStrictEqual(new Error('Invalid addressArray input'));
});

test('toLegacyArray throws error if the addressArray input is undefined', async () => {
    const result = toLegacyArray(undefined);

    expect(result).toStrictEqual(new Error('Invalid addressArray input'));
});

test('toLegacyArray successfully converts a standard sized valid addressArray input', async () => {
    const result = toLegacyArray(validAddressArrayInput);

    expect(result).toStrictEqual(validAddressArrayOutput);
});

test('toLegacyArray successfully converts a large valid addressArray input', async () => {
    const result = toLegacyArray(validLargeAddressArrayInput);

    expect(result).toStrictEqual(validLargeAddressArrayOutput);
});

test('toLegacyArray throws an error on an addressArray with invalid addresses', async () => {
    const result = toLegacyArray(invalidAddressArrayInput);

    expect(result).toStrictEqual(
        new ValidationError(
            'Invalid checksum: ecash:qrqgwxrrrrrrrrrrrrrrrrrrrrrrrrr7zsvk.',
        ),
    );
});

test('getCashtabEncodingSubstring() returns the appropriate substring for cashtab message outputs', async () => {
    const result = getCashtabEncodingSubstring();
    expect(result).toStrictEqual('6a0400746162');
});

test('getETokenEncodingSubstring() returns the appropriate substring for eToken outputs', async () => {
    const result = getETokenEncodingSubstring();
    expect(result).toStrictEqual('6a04534c5000');
});

test('isCashtabOutput() correctly validates a cashtab message output hex', async () => {
    const result = isCashtabOutput('6a04007461620b63617368746162756c6172');
    expect(result).toStrictEqual(true);
});

test('isCashtabOutput() correctly invalidates an external message output hex', async () => {
    const result = isCashtabOutput('6a0c7069616e6f74656e6e697332');
    expect(result).toStrictEqual(false);
});

test('isCashtabOutput() correctly handles null input', async () => {
    const result = isCashtabOutput(null);
    expect(result).toStrictEqual(false);
});

test('isCashtabOutput() correctly handles non-string input', async () => {
    const result = isCashtabOutput(7623723323);
    expect(result).toStrictEqual(false);
});

test('isCashtabOutput() correctly invalidates an external message output hex', async () => {
    const result = isCashtabOutput(
        '6a202731afddf3b83747943f0e650b938ea0670dcae2e08c415f53bd4c6acfd15e09',
    );
    expect(result).toStrictEqual(false);
});

test('isEtokenOutput() correctly validates an eToken output hex', async () => {
    const result = isEtokenOutput(
        '6a04534c500001010453454e442069b8431ddecf775393b1b36aa1d0ddcd7b342f1157b9671a03747378ed35ea0d08000000000000012c080000000000002008',
    );
    expect(result).toStrictEqual(true);
});

test('isEtokenOutput() correctly invalidates an eToken output hex', async () => {
    const result = isEtokenOutput(
        '5434c500001010453454e442069b8431ddecf775393b1b36aa1d0ddcd7b342f1157b9671a03747378ed35ea0d08000000000000012c080000000000002008',
    );
    expect(result).toStrictEqual(false);
});

test('isEtokenOutput() correctly handles null input', async () => {
    const result = isEtokenOutput(null);
    expect(result).toStrictEqual(false);
});

test('isEtokenOutput() correctly handles non-string input', async () => {
    const result = isEtokenOutput(7623723323);
    expect(result).toStrictEqual(false);
});

test('extractCashtabMessage() correctly extracts a Cashtab message', async () => {
    const result = extractCashtabMessage(
        '6a04007461620b63617368746162756c6172',
    );
    expect(result).toStrictEqual('63617368746162756c6172');
});

test('extractExternalMessage() correctly extracts an external message', async () => {
    const result = extractExternalMessage('6a0d62696e676f656c65637472756d');
    expect(result).toStrictEqual('62696e676f656c65637472756d');
});
