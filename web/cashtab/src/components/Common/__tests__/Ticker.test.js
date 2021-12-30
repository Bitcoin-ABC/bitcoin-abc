import { parseOpReturn } from '../Ticker';

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
