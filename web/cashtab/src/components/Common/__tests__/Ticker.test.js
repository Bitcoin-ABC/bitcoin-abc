import { ValidationError } from 'ecashaddrjs';
import {
    isValidCashPrefix,
    isValidTokenPrefix,
    toLegacy,
    toLegacyArray,
    parseOpReturn,
    currency,
} from '../Ticker';
import {
    validAddressArrayInput,
    validAddressArrayOutput,
    validLargeAddressArrayInput,
    validLargeAddressArrayOutput,
    invalidAddressArrayInput,
} from '../__mocks__/mockAddressArray';
import {
    shortCashtabMessageInputHex,
    longCashtabMessageInputHex,
    shortExternalMessageInputHex,
    longExternalMessageInputHex,
    shortSegmentedExternalMessageInputHex,
    longSegmentedExternalMessageInputHex,
    mixedSegmentedExternalMessageInputHex,
    mockParsedShortCashtabMessageArray,
    mockParsedLongCashtabMessageArray,
    mockParsedShortExternalMessageArray,
    mockParsedLongExternalMessageArray,
    mockParsedShortSegmentedExternalMessageArray,
    mockParsedLongSegmentedExternalMessageArray,
    mockParsedMixedSegmentedExternalMessageArray,
    eTokenInputHex,
    mockParsedETokenOutputArray,
} from '../__mocks__/mockOpReturnParsedArray';

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

test('parseOpReturn() successfully parses a short cashtab message', async () => {
    const result = parseOpReturn(shortCashtabMessageInputHex);
    expect(result).toStrictEqual(mockParsedShortCashtabMessageArray);
});

test('parseOpReturn() successfully parses a long cashtab message where an additional PUSHDATA1 is present', async () => {
    const result = parseOpReturn(longCashtabMessageInputHex);
    expect(result).toStrictEqual(mockParsedLongCashtabMessageArray);
});

test('parseOpReturn() successfully parses a short external message', async () => {
    const result = parseOpReturn(shortExternalMessageInputHex);
    expect(result).toStrictEqual(mockParsedShortExternalMessageArray);
});

test('parseOpReturn() successfully parses a long external message where an additional PUSHDATA1 is present', async () => {
    const result = parseOpReturn(longExternalMessageInputHex);
    expect(result).toStrictEqual(mockParsedLongExternalMessageArray);
});

test('parseOpReturn() successfully parses an external message that is segmented into separate short parts', async () => {
    const result = parseOpReturn(shortSegmentedExternalMessageInputHex);
    expect(result).toStrictEqual(mockParsedShortSegmentedExternalMessageArray);
});

test('parseOpReturn() successfully parses an external message that is segmented into separate long parts', async () => {
    const result = parseOpReturn(longSegmentedExternalMessageInputHex);
    expect(result).toStrictEqual(mockParsedLongSegmentedExternalMessageArray);
});

test('parseOpReturn() successfully parses an external message that is segmented into separate long and short parts', async () => {
    const result = parseOpReturn(mixedSegmentedExternalMessageInputHex);
    expect(result).toStrictEqual(mockParsedMixedSegmentedExternalMessageArray);
});

test('parseOpReturn() successfully parses an eToken output', async () => {
    const result = parseOpReturn(eTokenInputHex);
    expect(result).toStrictEqual(mockParsedETokenOutputArray);
});
