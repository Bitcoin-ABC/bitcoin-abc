import { ValidationError } from 'ecashaddrjs';
import {
    fromSmallestDenomination,
    batchArray,
    flattenBatchedHydratedUtxos,
    loadStoredWallet,
    isValidStoredWallet,
    fromLegacyDecimals,
    convertToEcashPrefix,
    checkNullUtxosForTokenStatus,
    confirmNonEtokenUtxos,
    isLegacyMigrationRequired,
    toLegacyCash,
    toLegacyToken,
    toLegacyCashArray,
    convertEtokenToEcashAddr,
    parseOpReturn,
    isExcludedUtxo,
    whichUtxosWereAdded,
    whichUtxosWereConsumed,
    addNewHydratedUtxos,
    removeConsumedUtxos,
    getUtxoCount,
    areAllUtxosIncludedInIncrementallyHydratedUtxos,
    convertEcashtoEtokenAddr,
} from 'utils/cashMethods';
import {
    unbatchedArray,
    arrayBatchedByThree,
} from '../__mocks__/mockBatchedArrays';
import {
    validAddressArrayInput,
    validAddressArrayInputMixedPrefixes,
    validAddressArrayOutput,
    validLargeAddressArrayInput,
    validLargeAddressArrayOutput,
    invalidAddressArrayInput,
} from '../__mocks__/mockAddressArray';

import {
    unflattenedHydrateUtxosResponse,
    flattenedHydrateUtxosResponse,
} from '../__mocks__/flattenBatchedHydratedUtxosMocks';
import {
    cachedUtxos,
    utxosLoadedFromCache,
} from '../__mocks__/mockCachedUtxos';
import {
    validStoredWallet,
    invalidStoredWallet,
} from '../__mocks__/mockStoredWallets';

import {
    mockTxDataResults,
    mockNonEtokenUtxos,
    mockTxDataResultsWithEtoken,
    mockHydratedUtxosWithNullValues,
    mockHydratedUtxosWithNullValuesSetToFalse,
} from '../__mocks__/nullUtxoMocks';

import {
    missingPath1899Wallet,
    missingPublicKeyInPath1899Wallet,
    missingPublicKeyInPath145Wallet,
    missingPublicKeyInPath245Wallet,
    notLegacyWallet,
} from '../__mocks__/mockLegacyWalletsUtils';

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

import {
    excludedUtxoAlpha,
    excludedUtxoBeta,
    includedUtxoAlpha,
    includedUtxoBeta,
    previousUtxosObjUtxoArray,
    previousUtxosTemplate,
    currentUtxosAfterSingleXecReceiveTxTemplate,
    utxosAddedBySingleXecReceiveTxTemplate,
    previousUtxosBeforeSingleXecReceiveTx,
    currentUtxosAfterSingleXecReceiveTx,
    utxosAddedBySingleXecReceiveTx,
    currentUtxosAfterMultiXecReceiveTxTemplate,
    utxosAddedByMultiXecReceiveTxTemplate,
    previousUtxosBeforeMultiXecReceiveTx,
    currentUtxosAfterMultiXecReceiveTx,
    utxosAddedByMultiXecReceiveTx,
    currentUtxosAfterEtokenReceiveTxTemplate,
    utxosAddedByEtokenReceiveTxTemplate,
    previousUtxosBeforeEtokenReceiveTx,
    currentUtxosAfterEtokenReceiveTx,
    utxosAddedByEtokenReceiveTx,
    previousUtxosBeforeSendAllTxTemplate,
    currentUtxosAfterSendAllTxTemplate,
    previousUtxosBeforeSendAllTx,
    currentUtxosAfterSendAllTx,
    previousUtxosBeforeSingleXecSendTx,
    currentUtxosAfterSingleXecSendTx,
    utxosAddedBySingleXecSendTx,
    currentUtxosAfterSingleXecSendTxTemplate,
    utxosAddedBySingleXecSendTxTemplate,
    currentUtxosAfterEtokenSendTxTemplate,
    utxosAddedByEtokenSendTxTemplate,
    previousUtxosBeforeEtokenSendTx,
    currentUtxosAfterEtokenSendTx,
    utxosAddedByEtokenSendTx,
    utxosConsumedByEtokenSendTx,
    utxosConsumedByEtokenSendTxTemplate,
    utxosConsumedBySingleXecSendTx,
    utxosConsumedBySingleXecSendTxTemplate,
    utxosConsumedBySendAllTx,
    utxosConsumedBySendAllTxTemplate,
    hydratedUtxoDetailsBeforeAddingTemplate,
    hydratedUtxoDetailsAfterAddingSingleUtxoTemplate,
    newHydratedUtxosSingleTemplate,
    addedHydratedUtxosOverTwenty,
    existingHydratedUtxoDetails,
    existingHydratedUtxoDetailsAfterAdd,
    hydratedUtxoDetailsBeforeConsumedTemplate,
    consumedUtxoTemplate,
    hydratedUtxoDetailsAfterRemovingConsumedUtxoTemplate,
    consumedUtxos,
    hydratedUtxoDetailsBeforeRemovingConsumedUtxos,
    hydratedUtxoDetailsAfterRemovingConsumedUtxos,
    consumedUtxosMoreThanTwenty,
    hydratedUtxoDetailsAfterRemovingMoreThanTwentyConsumedUtxos,
    consumedUtxosMoreThanTwentyInRandomObjects,
    utxoCountMultiTemplate,
    utxoCountSingleTemplate,
    incrementalUtxosTemplate,
    incrementallyHydratedUtxosTemplate,
    incrementallyHydratedUtxosTemplateMissing,
    utxosAfterSentTxIncremental,
    incrementallyHydratedUtxosAfterProcessing,
    incrementallyHydratedUtxosAfterProcessingOneMissing,
} from '../__mocks__/incrementalUtxoMocks';

describe('Correctly executes cash utility functions', () => {
    it(`Correctly converts smallest base unit to smallest decimal for cashDecimals = 2`, () => {
        expect(fromSmallestDenomination(1, 2)).toBe(0.01);
    });
    it(`Correctly converts largest base unit to smallest decimal for cashDecimals = 2`, () => {
        expect(fromSmallestDenomination(1000000012345678, 2)).toBe(
            10000000123456.78,
        );
    });
    it(`Correctly converts smallest base unit to smallest decimal for cashDecimals = 8`, () => {
        expect(fromSmallestDenomination(1, 8)).toBe(0.00000001);
    });
    it(`Correctly converts largest base unit to smallest decimal for cashDecimals = 8`, () => {
        expect(fromSmallestDenomination(1000000012345678, 8)).toBe(
            10000000.12345678,
        );
    });
    it(`Correctly converts an array of length 10 to an array of 4 arrays, each with max length 3`, () => {
        expect(batchArray(unbatchedArray, 3)).toStrictEqual(
            arrayBatchedByThree,
        );
    });
    it(`If array length is less than batch size, return original array as first and only element of new array`, () => {
        expect(batchArray(unbatchedArray, 20)).toStrictEqual([unbatchedArray]);
    });
    it(`Flattens hydrateUtxos from Promise.all() response into array that can be parsed by getSlpBalancesAndUtxos`, () => {
        expect(
            flattenBatchedHydratedUtxos(unflattenedHydrateUtxosResponse),
        ).toStrictEqual(flattenedHydrateUtxosResponse);
    });
    it(`Accepts a cachedWalletState that has not preserved BigNumber object types, and returns the same wallet state with BigNumber type re-instituted`, () => {
        expect(loadStoredWallet(cachedUtxos)).toStrictEqual(
            utxosLoadedFromCache,
        );
    });
    it(`Recognizes a stored wallet as valid if it has all required fields`, () => {
        expect(isValidStoredWallet(validStoredWallet)).toBe(true);
    });
    it(`Recognizes a stored wallet as invalid if it is missing required fields`, () => {
        expect(isValidStoredWallet(invalidStoredWallet)).toBe(false);
    });
    it(`Converts a legacy BCH amount to an XEC amount`, () => {
        expect(fromLegacyDecimals(0.00000546, 2)).toStrictEqual(5.46);
    });
    it(`Leaves a legacy BCH amount unchanged if currency.cashDecimals is 8`, () => {
        expect(fromLegacyDecimals(0.00000546, 8)).toStrictEqual(0.00000546);
    });
    it(`convertToEcashPrefix converts a bitcoincash: prefixed address to an ecash: prefixed address`, () => {
        expect(
            convertToEcashPrefix(
                'bitcoincash:qz2708636snqhsxu8wnlka78h6fdp77ar5ulhz04hr',
            ),
        ).toBe('ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035');
    });
    it(`convertToEcashPrefix returns an ecash: prefix address unchanged`, () => {
        expect(
            convertToEcashPrefix(
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            ),
        ).toBe('ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035');
    });
    it(`toLegacyToken returns an etoken: prefix address as simpleledger:`, () => {
        expect(
            toLegacyToken('etoken:qz2708636snqhsxu8wnlka78h6fdp77ar5tv2tzg4r'),
        ).toBe('simpleledger:qz2708636snqhsxu8wnlka78h6fdp77ar5syue64fa');
    });
    it(`toLegacyToken returns an prefixless valid etoken address in simpleledger: format with prefix`, () => {
        expect(
            toLegacyToken('qz2708636snqhsxu8wnlka78h6fdp77ar5tv2tzg4r'),
        ).toBe('simpleledger:qz2708636snqhsxu8wnlka78h6fdp77ar5syue64fa');
    });
    it(`Correctly parses utxo vout tx data to confirm the transactions are not eToken txs`, () => {
        expect(checkNullUtxosForTokenStatus(mockTxDataResults)).toStrictEqual(
            mockNonEtokenUtxos,
        );
    });
    it(`Correctly parses utxo vout tx data and screens out an eToken by asm field`, () => {
        expect(
            checkNullUtxosForTokenStatus(mockTxDataResultsWithEtoken),
        ).toStrictEqual([]);
    });
    it(`Changes isValid from 'null' to 'false' for confirmed nonEtokenUtxos`, () => {
        expect(
            confirmNonEtokenUtxos(
                mockHydratedUtxosWithNullValues,
                mockNonEtokenUtxos,
            ),
        ).toStrictEqual(mockHydratedUtxosWithNullValuesSetToFalse);
    });
    it(`Recognizes a wallet with missing Path1889 is a Legacy Wallet and requires migration`, () => {
        expect(isLegacyMigrationRequired(missingPath1899Wallet)).toBe(true);
    });
    it(`Recognizes a wallet with missing PublicKey in Path1889 is a Legacy Wallet and requires migration`, () => {
        expect(
            isLegacyMigrationRequired(missingPublicKeyInPath1899Wallet),
        ).toBe(true);
    });
    it(`Recognizes a wallet with missing PublicKey in Path145 is a Legacy Wallet and requires migration`, () => {
        expect(isLegacyMigrationRequired(missingPublicKeyInPath145Wallet)).toBe(
            true,
        );
    });
    it(`Recognizes a wallet with missing PublicKey in Path245 is a Legacy Wallet and requires migration`, () => {
        expect(isLegacyMigrationRequired(missingPublicKeyInPath245Wallet)).toBe(
            true,
        );
    });
    it(`Recognizes a latest, current wallet that does not require migration`, () => {
        expect(isLegacyMigrationRequired(notLegacyWallet)).toBe(false);
    });

    test('toLegacyCash() converts a valid ecash: prefix address to a valid bitcoincash: prefix address', async () => {
        const result = toLegacyCash(
            'ecash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25mc',
        );
        expect(result).toStrictEqual(
            'bitcoincash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gjykk3wa0',
        );
    });

    test('toLegacyCash() converts a valid ecash: prefixless address to a valid bitcoincash: prefix address', async () => {
        const result = toLegacyCash(
            'qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25mc',
        );
        expect(result).toStrictEqual(
            'bitcoincash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gjykk3wa0',
        );
    });

    test('toLegacyCash throws error if input address has invalid checksum', async () => {
        const result = toLegacyCash(
            'ecash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25m',
        );
        expect(result).toStrictEqual(
            new Error(
                'ecash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25m is not a valid ecash address',
            ),
        );
    });

    test('toLegacyCash() throws error with input of etoken: address', async () => {
        const result = toLegacyCash(
            'etoken:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4g9htlunl0',
        );
        expect(result).toStrictEqual(
            new Error(
                'etoken:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4g9htlunl0 is not a valid ecash address',
            ),
        );
    });

    test('toLegacyCash() throws error with input of legacy address', async () => {
        const result = toLegacyCash('13U6nDrkRsC3Eb1pxPhNY8XJ5W9zdp6rNk');
        expect(result).toStrictEqual(
            new Error(
                '13U6nDrkRsC3Eb1pxPhNY8XJ5W9zdp6rNk is not a valid ecash address',
            ),
        );
    });

    test('toLegacyCash() throws error with input of bitcoincash: address', async () => {
        const result = toLegacyCash(
            'bitcoincash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gjykk3wa0',
        );
        expect(result).toStrictEqual(
            new Error(
                'bitcoincash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gjykk3wa0 is not a valid ecash address',
            ),
        );
    });

    test('toLegacyCashArray throws error if the addressArray input is null', async () => {
        const result = toLegacyCashArray(null);

        expect(result).toStrictEqual(new Error('Invalid addressArray input'));
    });

    test('toLegacyCashArray throws error if the addressArray input is empty', async () => {
        const result = toLegacyCashArray([]);

        expect(result).toStrictEqual(new Error('Invalid addressArray input'));
    });

    test('toLegacyCashArray throws error if the addressArray input is a number', async () => {
        const result = toLegacyCashArray(12345);

        expect(result).toStrictEqual(new Error('Invalid addressArray input'));
    });

    test('toLegacyCashArray throws error if the addressArray input is undefined', async () => {
        const result = toLegacyCashArray(undefined);

        expect(result).toStrictEqual(new Error('Invalid addressArray input'));
    });

    test('toLegacyCashArray successfully converts a standard sized valid addressArray input', async () => {
        const result = toLegacyCashArray(validAddressArrayInput);

        expect(result).toStrictEqual(validAddressArrayOutput);
    });

    test('toLegacyCashArray successfully converts a standard sized valid addressArray input including prefixless ecash addresses', async () => {
        const result = toLegacyCashArray(validAddressArrayInputMixedPrefixes);

        expect(result).toStrictEqual(validAddressArrayOutput);
    });

    test('toLegacyCashArray successfully converts a large valid addressArray input', async () => {
        const result = toLegacyCashArray(validLargeAddressArrayInput);

        expect(result).toStrictEqual(validLargeAddressArrayOutput);
    });

    test('toLegacyCashArray throws an error on an addressArray with invalid addresses', async () => {
        const result = toLegacyCashArray(invalidAddressArrayInput);

        expect(result).toStrictEqual(
            new Error(
                'ecash:qrqgwxrrrrrrrrrrrrrrrrrrrrrrrrr7zsvk is not a valid ecash address',
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
        expect(result).toStrictEqual(
            mockParsedShortSegmentedExternalMessageArray,
        );
    });

    test('parseOpReturn() successfully parses an external message that is segmented into separate long parts', async () => {
        const result = parseOpReturn(longSegmentedExternalMessageInputHex);
        expect(result).toStrictEqual(
            mockParsedLongSegmentedExternalMessageArray,
        );
    });

    test('parseOpReturn() successfully parses an external message that is segmented into separate long and short parts', async () => {
        const result = parseOpReturn(mixedSegmentedExternalMessageInputHex);
        expect(result).toStrictEqual(
            mockParsedMixedSegmentedExternalMessageArray,
        );
    });

    test('parseOpReturn() successfully parses an eToken output', async () => {
        const result = parseOpReturn(eTokenInputHex);
        expect(result).toStrictEqual(mockParsedETokenOutputArray);
    });

    test('isExcludedUtxo returns true for a utxo with different tx_pos and same txid as an existing utxo in the set', async () => {
        expect(
            isExcludedUtxo(excludedUtxoAlpha, previousUtxosObjUtxoArray),
        ).toBe(true);
    });
    test('isExcludedUtxo returns true for a utxo with different value and same txid as an existing utxo in the set', async () => {
        expect(
            isExcludedUtxo(excludedUtxoBeta, previousUtxosObjUtxoArray),
        ).toBe(true);
    });
    test('isExcludedUtxo returns false for a utxo with different tx_pos and same txid', async () => {
        expect(
            isExcludedUtxo(includedUtxoAlpha, previousUtxosObjUtxoArray),
        ).toBe(false);
    });
    test('isExcludedUtxo returns false for a utxo with different value and same txid', async () => {
        expect(
            isExcludedUtxo(includedUtxoBeta, previousUtxosObjUtxoArray),
        ).toBe(false);
    });
    test('whichUtxosWereAdded correctly identifies a single added utxo after a received XEC tx [template]', async () => {
        expect(
            whichUtxosWereAdded(
                previousUtxosTemplate,
                currentUtxosAfterSingleXecReceiveTxTemplate,
            ),
        ).toStrictEqual(utxosAddedBySingleXecReceiveTxTemplate);
    });
    test('whichUtxosWereAdded correctly identifies a single added utxo after a received XEC tx', async () => {
        expect(
            whichUtxosWereAdded(
                previousUtxosBeforeSingleXecReceiveTx,
                currentUtxosAfterSingleXecReceiveTx,
            ),
        ).toStrictEqual(utxosAddedBySingleXecReceiveTx);
    });
    test('whichUtxosWereAdded correctly identifies multiple added utxos with the same txid [template]', async () => {
        expect(
            whichUtxosWereAdded(
                previousUtxosTemplate,
                currentUtxosAfterMultiXecReceiveTxTemplate,
            ),
        ).toStrictEqual(utxosAddedByMultiXecReceiveTxTemplate);
    });
    test('whichUtxosWereAdded correctly identifies multiple added utxos with the same txid', async () => {
        expect(
            whichUtxosWereAdded(
                previousUtxosBeforeMultiXecReceiveTx,
                currentUtxosAfterMultiXecReceiveTx,
            ),
        ).toStrictEqual(utxosAddedByMultiXecReceiveTx);
    });
    test('whichUtxosWereAdded correctly identifies an added utxos from received eToken tx [template]', async () => {
        expect(
            whichUtxosWereAdded(
                previousUtxosTemplate,
                currentUtxosAfterEtokenReceiveTxTemplate,
            ),
        ).toStrictEqual(utxosAddedByEtokenReceiveTxTemplate);
    });
    test('whichUtxosWereAdded correctly identifies an added utxos from received eToken tx', async () => {
        expect(
            whichUtxosWereAdded(
                previousUtxosBeforeEtokenReceiveTx,
                currentUtxosAfterEtokenReceiveTx,
            ),
        ).toStrictEqual(utxosAddedByEtokenReceiveTx);
    });
    test('whichUtxosWereAdded correctly identifies no utxos were added in a send all XEC tx (no change) [template]', async () => {
        expect(
            whichUtxosWereAdded(
                previousUtxosBeforeSendAllTxTemplate,
                currentUtxosAfterSendAllTxTemplate,
            ),
        ).toStrictEqual(false);
    });
    test('whichUtxosWereAdded correctly identifies no utxos were added in a send all XEC tx (no change)', async () => {
        expect(
            whichUtxosWereAdded(
                previousUtxosBeforeSendAllTx,
                currentUtxosAfterSendAllTx,
            ),
        ).toStrictEqual(false);
    });
    test('whichUtxosWereAdded correctly identifies an added utxo from a single send XEC tx', async () => {
        expect(
            whichUtxosWereAdded(
                previousUtxosBeforeSingleXecSendTx,
                currentUtxosAfterSingleXecSendTx,
            ),
        ).toStrictEqual(utxosAddedBySingleXecSendTx);
    });
    test('whichUtxosWereAdded correctly identifies an added utxo from a single send XEC tx [template]', async () => {
        expect(
            whichUtxosWereAdded(
                previousUtxosTemplate,
                currentUtxosAfterSingleXecSendTxTemplate,
            ),
        ).toStrictEqual(utxosAddedBySingleXecSendTxTemplate);
    });
    test('whichUtxosWereAdded correctly identifies added change utxos from a send eToken tx [template]', async () => {
        expect(
            whichUtxosWereAdded(
                previousUtxosTemplate,
                currentUtxosAfterEtokenSendTxTemplate,
            ),
        ).toStrictEqual(utxosAddedByEtokenSendTxTemplate);
    });
    test('whichUtxosWereAdded correctly identifies added change utxos from a send eToken tx', async () => {
        expect(
            whichUtxosWereAdded(
                previousUtxosBeforeEtokenSendTx,
                currentUtxosAfterEtokenSendTx,
            ),
        ).toStrictEqual(utxosAddedByEtokenSendTx);
    });
    test('whichUtxosWereConsumed correctly identifies no utxos consumed after a received XEC tx [template]', async () => {
        expect(
            whichUtxosWereConsumed(
                previousUtxosTemplate,
                currentUtxosAfterSingleXecReceiveTxTemplate,
            ),
        ).toStrictEqual(false);
    });
    test('whichUtxosWereConsumed correctly identifies no utxos consumed a received XEC tx', async () => {
        expect(
            whichUtxosWereConsumed(
                previousUtxosBeforeSingleXecReceiveTx,
                currentUtxosAfterSingleXecReceiveTx,
            ),
        ).toStrictEqual(false);
    });
    test('whichUtxosWereConsumed correctly identifies no consumed utxos after receiving an XEC multi-send tx [template]', async () => {
        expect(
            whichUtxosWereConsumed(
                previousUtxosTemplate,
                currentUtxosAfterMultiXecReceiveTxTemplate,
            ),
        ).toStrictEqual(false);
    });
    test('whichUtxosWereConsumed correctly identifies no consumed utxos after receiving an XEC multi-send tx', async () => {
        expect(
            whichUtxosWereConsumed(
                previousUtxosBeforeMultiXecReceiveTx,
                currentUtxosAfterMultiXecReceiveTx,
            ),
        ).toStrictEqual(false);
    });
    test('whichUtxosWereConsumed correctly identifies consumed utxos from a single send XEC tx', async () => {
        expect(
            whichUtxosWereConsumed(
                previousUtxosBeforeSingleXecSendTx,
                currentUtxosAfterSingleXecSendTx,
            ),
        ).toStrictEqual(utxosConsumedBySingleXecSendTx);
    });
    test('whichUtxosWereConsumed correctly identifies consumed utxos from a send all XEC tx [template]', async () => {
        expect(
            whichUtxosWereConsumed(
                previousUtxosBeforeSendAllTxTemplate,
                currentUtxosAfterSendAllTxTemplate,
            ),
        ).toStrictEqual(utxosConsumedBySendAllTxTemplate);
    });
    test('whichUtxosWereConsumed correctly identifies consumed utxos from a send all XEC tx', async () => {
        expect(
            whichUtxosWereConsumed(
                previousUtxosBeforeSendAllTx,
                currentUtxosAfterSendAllTx,
            ),
        ).toStrictEqual(utxosConsumedBySendAllTx);
    });
    test('whichUtxosWereConsumed correctly identifies consumed utxos from a single send XEC tx [template]', async () => {
        expect(
            whichUtxosWereConsumed(
                previousUtxosTemplate,
                currentUtxosAfterSingleXecSendTxTemplate,
            ),
        ).toStrictEqual(utxosConsumedBySingleXecSendTxTemplate);
    });
    test('whichUtxosWereConsumed correctly identifies consumed utxos from a send eToken tx [template]', async () => {
        expect(
            whichUtxosWereConsumed(
                previousUtxosTemplate,
                currentUtxosAfterEtokenSendTxTemplate,
            ),
        ).toStrictEqual(utxosConsumedByEtokenSendTxTemplate);
    });
    test('whichUtxosWereConsumed correctly identifies consumed utxos from a send eToken tx', async () => {
        expect(
            whichUtxosWereConsumed(
                previousUtxosBeforeEtokenSendTx,
                currentUtxosAfterEtokenSendTx,
            ),
        ).toStrictEqual(utxosConsumedByEtokenSendTx);
    });
    test('addNewHydratedUtxos correctly adds new utxos object to existing hydratedUtxoDetails object', async () => {
        expect(
            addNewHydratedUtxos(
                newHydratedUtxosSingleTemplate,
                hydratedUtxoDetailsBeforeAddingTemplate,
            ),
        ).toStrictEqual(hydratedUtxoDetailsAfterAddingSingleUtxoTemplate);
    });
    test('addNewHydratedUtxos correctly adds more than 20 new hydrated utxos to existing hydratedUtxoDetails object', async () => {
        expect(
            addNewHydratedUtxos(
                addedHydratedUtxosOverTwenty,
                existingHydratedUtxoDetails,
            ),
        ).toStrictEqual(existingHydratedUtxoDetailsAfterAdd);
    });
    test('removeConsumedUtxos correctly removes a single utxo from hydratedUtxoDetails - template', async () => {
        expect(
            removeConsumedUtxos(
                consumedUtxoTemplate,
                hydratedUtxoDetailsBeforeConsumedTemplate,
            ),
        ).toStrictEqual(hydratedUtxoDetailsAfterRemovingConsumedUtxoTemplate);
    });
    test('removeConsumedUtxos correctly removes a single utxo from hydratedUtxoDetails', async () => {
        expect(
            removeConsumedUtxos(
                consumedUtxos,
                hydratedUtxoDetailsBeforeRemovingConsumedUtxos,
            ),
        ).toStrictEqual(hydratedUtxoDetailsAfterRemovingConsumedUtxos);
    });
    test('removeConsumedUtxos correctly removes more than twenty utxos from hydratedUtxoDetails', async () => {
        expect(
            removeConsumedUtxos(
                consumedUtxosMoreThanTwenty,
                hydratedUtxoDetailsBeforeRemovingConsumedUtxos,
            ),
        ).toStrictEqual(
            hydratedUtxoDetailsAfterRemovingMoreThanTwentyConsumedUtxos,
        );
    });
    test('removeConsumedUtxos correctly removes more than twenty utxos from multiple utxo objects from hydratedUtxoDetails', async () => {
        expect(
            removeConsumedUtxos(
                consumedUtxosMoreThanTwentyInRandomObjects,
                hydratedUtxoDetailsBeforeRemovingConsumedUtxos,
            ),
        ).toStrictEqual(
            hydratedUtxoDetailsAfterRemovingMoreThanTwentyConsumedUtxos,
        );
    });
    test('getUtxoCount correctly calculates the total for a utxo object with empty addresses [template]', async () => {
        expect(getUtxoCount(utxoCountSingleTemplate)).toStrictEqual(1);
    });
    test('getUtxoCount correctly calculates the total for multiple utxos [template]', async () => {
        expect(getUtxoCount(utxoCountMultiTemplate)).toStrictEqual(12);
    });
    test('areAllUtxosIncludedInIncrementallyHydratedUtxos correctly identifies all utxos are in incrementally hydrated utxos [template]', async () => {
        expect(
            areAllUtxosIncludedInIncrementallyHydratedUtxos(
                incrementalUtxosTemplate,
                incrementallyHydratedUtxosTemplate,
            ),
        ).toBe(true);
    });
    test('areAllUtxosIncludedInIncrementallyHydratedUtxos returns false if a utxo in the utxo set is not in incrementally hydrated utxos [template]', async () => {
        expect(
            areAllUtxosIncludedInIncrementallyHydratedUtxos(
                incrementalUtxosTemplate,
                incrementallyHydratedUtxosTemplateMissing,
            ),
        ).toBe(false);
    });
    test('areAllUtxosIncludedInIncrementallyHydratedUtxos correctly identifies all utxos are in incrementally hydrated utxos', async () => {
        expect(
            areAllUtxosIncludedInIncrementallyHydratedUtxos(
                utxosAfterSentTxIncremental,
                incrementallyHydratedUtxosAfterProcessing,
            ),
        ).toBe(true);
    });
    test('areAllUtxosIncludedInIncrementallyHydratedUtxos returns false if a utxo in the utxo set is not in incrementally hydrated utxos', async () => {
        expect(
            areAllUtxosIncludedInIncrementallyHydratedUtxos(
                utxosAfterSentTxIncremental,
                incrementallyHydratedUtxosAfterProcessingOneMissing,
            ),
        ).toBe(false);
    });
    test('areAllUtxosIncludedInIncrementallyHydratedUtxos returns false if utxo set is invalid', async () => {
        expect(
            areAllUtxosIncludedInIncrementallyHydratedUtxos(
                {},
                incrementallyHydratedUtxosAfterProcessing,
            ),
        ).toBe(false);
    });
    test('convertEtokenToEcashAddr successfully converts a valid eToken address to eCash', async () => {
        const result = convertEtokenToEcashAddr(
            'etoken:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gcldpffcs',
        );
        expect(result).toStrictEqual(
            'ecash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8',
        );
    });

    test('convertEtokenToEcashAddr successfully converts prefixless eToken address as input', async () => {
        const result = convertEtokenToEcashAddr(
            'qpatql05s9jfavnu0tv6lkjjk25n6tmj9gcldpffcs',
        );
        expect(result).toStrictEqual(
            'ecash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8',
        );
    });

    test('convertEtokenToEcashAddr throws error with an invalid eToken address as input', async () => {
        const result = convertEtokenToEcashAddr('etoken:qpj9gcldpffcs');
        expect(result).toStrictEqual(
            new Error(
                'cashMethods.convertToEcashAddr() error: etoken:qpj9gcldpffcs is not a valid etoken address',
            ),
        );
    });

    test('convertEtokenToEcashAddr throws error with an ecash address as input', async () => {
        const result = convertEtokenToEcashAddr(
            'ecash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8',
        );
        expect(result).toStrictEqual(
            new Error(
                'cashMethods.convertToEcashAddr() error: ecash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8 is not a valid etoken address',
            ),
        );
    });

    test('convertEtokenToEcashAddr throws error with null input', async () => {
        const result = convertEtokenToEcashAddr(null);
        expect(result).toStrictEqual(
            new Error(
                'cashMethods.convertToEcashAddr() error: No etoken address provided',
            ),
        );
    });

    test('convertEtokenToEcashAddr throws error with empty string input', async () => {
        const result = convertEtokenToEcashAddr('');
        expect(result).toStrictEqual(
            new Error(
                'cashMethods.convertToEcashAddr() error: No etoken address provided',
            ),
        );
    });

    test('convertEcashtoEtokenAddr successfully converts a valid ecash address into an etoken address', async () => {
        const eCashAddress = 'ecash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8';
        const eTokenAddress =
            'etoken:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gcldpffcs';
        const result = convertEcashtoEtokenAddr(eCashAddress);
        expect(result).toStrictEqual(eTokenAddress);
    });

    test('convertEcashtoEtokenAddr successfully converts a valid prefix-less ecash address into an etoken address', async () => {
        const eCashAddress = 'qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8';
        const eTokenAddress =
            'etoken:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gcldpffcs';
        const result = convertEcashtoEtokenAddr(eCashAddress);
        expect(result).toStrictEqual(eTokenAddress);
    });

    test('convertEcashtoEtokenAddr throws error with invalid ecash address input', async () => {
        const eCashAddress = 'ecash:qpaNOTVALIDADDRESSwu8';
        const result = convertEcashtoEtokenAddr(eCashAddress);
        expect(result).toStrictEqual(
            new Error(eCashAddress + ' is not a valid ecash address'),
        );
    });

    test('convertEcashtoEtokenAddr throws error with a valid etoken address input', async () => {
        const eTokenAddress =
            'etoken:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gcldpffcs';
        const result = convertEcashtoEtokenAddr(eTokenAddress);
        expect(result).toStrictEqual(
            new Error(eTokenAddress + ' is not a valid ecash address'),
        );
    });

    test('convertEcashtoEtokenAddr throws error with a valid bitcoincash address input', async () => {
        const bchAddress =
            'bitcoincash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9g0vsgy56s';
        const result = convertEcashtoEtokenAddr(bchAddress);
        expect(result).toStrictEqual(
            new Error(bchAddress + ' is not a valid ecash address'),
        );
    });

    test('convertEcashtoEtokenPrefix throws error with null ecash address input', async () => {
        const eCashAddress = null;
        const result = convertEcashtoEtokenAddr(eCashAddress);
        expect(result).toStrictEqual(
            new Error(eCashAddress + ' is not a valid ecash address'),
        );
    });
});
