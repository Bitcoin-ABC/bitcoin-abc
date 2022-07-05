import { ValidationError } from 'ecashaddrjs';
import BigNumber from 'bignumber.js';
import {
    fromSmallestDenomination,
    batchArray,
    flattenContactList,
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
    getHashArrayFromWallet,
    parseChronikTx,
    checkWalletForTokenInfo,
    isActiveWebsocket,
    parseXecSendValue,
    getChangeAddressFromInputUtxos,
    generateOpReturnScript,
    generateTxInput,
    generateTxOutput,
    toSmallestDenomination,
} from 'utils/cashMethods';
import { currency } from 'components/Common/Ticker';
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
    missingHash160,
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
    mockAirdropHexOutput,
    mockParsedAirdropMessageArray,
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
import mockLegacyWallets from 'hooks/__mocks__/mockLegacyWallets';
import BCHJS from '@psf/bch-js';
import sendBCHMock from '../../hooks/__mocks__/sendBCH';
import {
    lambdaHash160s,
    lambdaIncomingXecTx,
    lambdaOutgoingXecTx,
    lambdaIncomingEtokenTx,
    lambdaOutgoingEtokenTx,
    activeWebsocketAlpha,
    disconnectedWebsocketAlpha,
    unsubscribedWebsocket,
} from '../__mocks__/chronikWs';
import mockReturnGetSlpBalancesAndUtxos from '../../hooks/__mocks__/mockReturnGetSlpBalancesAndUtxos';
import {
    mockOneToOneSendXecTxBuilderObj,
    mockOneToManySendXecTxBuilderObj,
} from '../__mocks__/mockTxBuilderObj';

it(`getChangeAddressFromInputUtxos() returns a correct change address from a valid inputUtxo`, () => {
    const BCH = new BCHJS();
    const { wallet } = sendBCHMock;
    const inputUtxo = [
        {
            height: 669639,
            tx_hash:
                '0da6d49cf95d4603958e53360ad1e90bfccef41bfb327d6b2e8a77e242fa2d58',
            tx_pos: 0,
            value: 1000,
            txid: '0da6d49cf95d4603958e53360ad1e90bfccef41bfb327d6b2e8a77e242fa2d58',
            vout: 0,
            isValid: false,
            address: 'bitcoincash:qphpmfj0qn7znklqhrfn5dq7qh36l3vxavu346vqcl',
            wif: 'L58jqHoi5ynSdsskPVBJuGuVqTP8ZML1MwHQsBJY32Pv7cqDSCeH',
        },
    ];

    const changeAddress = getChangeAddressFromInputUtxos(
        BCH,
        inputUtxo,
        wallet,
    );
    expect(changeAddress).toStrictEqual(inputUtxo[0].address);
});

it(`getChangeAddressFromInputUtxos() throws error upon a malformed input utxo`, () => {
    const BCH = new BCHJS();
    const { wallet } = sendBCHMock;
    const invalidInputUtxo = [
        {
            height: 669639,
            tx_hash:
                '0da6d49cf95d4603958e53360ad1e90bfccef41bfb327d6b2e8a77e242fa2d58',
            tx_pos: 0,
            value: 1000,
            txid: '0da6d49cf95d4603958e53360ad1e90bfccef41bfb327d6b2e8a77e242fa2d58',
            vout: 0,
            isValid: false,
            wif: 'L58jqHoi5ynSdsskPVBJuGuVqTP8ZML1MwHQsBJY32Pv7cqDSCeH',
        },
    ];
    let thrownError;
    try {
        getChangeAddressFromInputUtxos(BCH, invalidInputUtxo, wallet);
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid input utxo');
});

it(`getChangeAddressFromInputUtxos() throws error upon a valid input utxo with invalid address param`, () => {
    const BCH = new BCHJS();
    const { wallet } = sendBCHMock;
    const invalidInputUtxo = [
        {
            height: 669639,
            tx_hash:
                '0da6d49cf95d4603958e53360ad1e90bfccef41bfb327d6b2e8a77e242fa2d58',
            tx_pos: 0,
            value: 1000,
            address: 'bitcoincash:1qphpmfj0qn7znklqhrfn5dq7qh36l3vxavu346vqcl', // invalid cash address
            txid: '0da6d49cf95d4603958e53360ad1e90bfccef41bfb327d6b2e8a77e242fa2d58',
            vout: 0,
            isValid: false,
            wif: 'L58jqHoi5ynSdsskPVBJuGuVqTP8ZML1MwHQsBJY32Pv7cqDSCeH',
        },
    ];
    let thrownError;
    try {
        getChangeAddressFromInputUtxos(BCH, invalidInputUtxo, wallet);
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid input utxo');
});

it(`getChangeAddressFromInputUtxos() throws an error upon a null inputUtxos param`, () => {
    const BCH = new BCHJS();
    const { wallet } = sendBCHMock;
    const inputUtxo = null;

    let thrownError;
    try {
        getChangeAddressFromInputUtxos(BCH, inputUtxo, wallet);
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual(
        'Invalid getChangeAddressFromWallet input parameter',
    );
});

it(`parseXecSendValue() correctly parses the value for a valid one to one send XEC transaction`, () => {
    expect(parseXecSendValue(false, '550', null)).toStrictEqual(
        new BigNumber(550),
    );
});

it(`parseXecSendValue() correctly parses the value for a valid one to many send XEC transaction`, () => {
    const destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,6',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,6',
        'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,6',
    ];
    expect(
        parseXecSendValue(true, null, destinationAddressAndValueArray),
    ).toStrictEqual(new BigNumber(18));
});

it(`parseXecSendValue() correctly throws error when singleSendValue is invalid for a one to one send XEC transaction`, () => {
    let errorThrown;
    try {
        parseXecSendValue(false, null, 550);
    } catch (err) {
        errorThrown = err;
    }
    expect(errorThrown.message).toStrictEqual('Invalid singleSendValue');
});

it(`parseXecSendValue() correctly throws error when destinationAddressAndValueArray is invalid for a one to many send XEC transaction`, () => {
    let errorThrown;
    try {
        parseXecSendValue(true, null, null);
    } catch (err) {
        errorThrown = err;
    }
    expect(errorThrown.message).toStrictEqual(
        'Invalid destinationAddressAndValueArray',
    );
});

it(`parseXecSendValue() correctly throws error when the total value for a one to one send XEC transaction is below dust`, () => {
    let errorThrown;
    try {
        parseXecSendValue(false, '4.5', null);
    } catch (err) {
        errorThrown = err;
    }
    expect(errorThrown.message).toStrictEqual('dust');
});

it(`parseXecSendValue() correctly throws error when the total value for a one to many send XEC transaction is below dust`, () => {
    const destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,2',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,2',
        'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,1',
    ];
    let errorThrown;
    try {
        parseXecSendValue(true, null, destinationAddressAndValueArray);
    } catch (err) {
        errorThrown = err;
    }
    expect(errorThrown.message).toStrictEqual('dust');
});

it('generateOpReturnScript() correctly generates an encrypted message script', () => {
    const BCH = new BCHJS();
    const optionalOpReturnMsg = 'testing generateOpReturnScript()';
    const encryptionFlag = true;
    const airdropFlag = false;
    const airdropTokenId = null;
    const mockEncryptedEj =
        '04688f9907fe3c7c0b78a73c4ab4f75e15e7e2b79641add519617086126fe6f6b1405a14eed48e90c9c8c0fc77f0f36984a78173e76ce51f0a44af94b59e9da703c9ff82758cfdb9cc46437d662423400fb731d3bfc1df0599279356ca261213fbb40d398c041e1bac966afed1b404581ab1bcfcde1fa039d53b7c7b70e8edf26d64bea9fbeed24cc80909796e6af5863707fa021f2a2ebaa2fe894904702be19d';

    const encodedScript = generateOpReturnScript(
        BCH,
        optionalOpReturnMsg,
        encryptionFlag,
        airdropFlag,
        airdropTokenId,
        mockEncryptedEj,
    );
    expect(encodedScript.toString('hex')).toBe(
        '6a04657461624d420130343638386639393037666533633763306237386137336334616234663735653135653765326237393634316164643531393631373038363132366665366636623134303561313465656434386539306339633863306663373766306633363938346137383137336537366365353166306134346166393462353965396461373033633966663832373538636664623963633436343337643636323432333430306662373331643362666331646630353939323739333536636132363132313366626234306433393863303431653162616339363661666564316234303435383161623162636663646531666130333964353362376337623730653865646632366436346265613966626565643234636338303930393739366536616635383633373037666130323166326132656261613266653839343930343730326265313964',
    );
});

it('generateOpReturnScript() correctly generates an un-encrypted non-airdrop message script', () => {
    const BCH = new BCHJS();
    const optionalOpReturnMsg = 'testing generateOpReturnScript()';
    const encryptionFlag = false;
    const airdropFlag = false;

    const encodedScript = generateOpReturnScript(
        BCH,
        optionalOpReturnMsg,
        encryptionFlag,
        airdropFlag,
    );
    expect(encodedScript.toString('hex')).toBe(
        '6a04007461622074657374696e672067656e65726174654f7052657475726e5363726970742829',
    );
});

it('generateOpReturnScript() correctly generates an un-encrypted airdrop message script', () => {
    const BCH = new BCHJS();
    const optionalOpReturnMsg = 'testing generateOpReturnScript()';
    const encryptionFlag = false;
    const airdropFlag = true;
    const airdropTokenId =
        '1c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e';

    const encodedScript = generateOpReturnScript(
        BCH,
        optionalOpReturnMsg,
        encryptionFlag,
        airdropFlag,
        airdropTokenId,
    );
    expect(encodedScript.toString('hex')).toBe(
        '6a0464726f70201c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e04007461622074657374696e672067656e65726174654f7052657475726e5363726970742829',
    );
});

it('generateOpReturnScript() correctly generates an un-encrypted airdrop with no message script', () => {
    const BCH = new BCHJS();
    const optionalOpReturnMsg = null;
    const encryptionFlag = false;
    const airdropFlag = true;
    const airdropTokenId =
        '1c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e';

    const encodedScript = generateOpReturnScript(
        BCH,
        optionalOpReturnMsg,
        encryptionFlag,
        airdropFlag,
        airdropTokenId,
    );
    expect(encodedScript.toString('hex')).toBe(
        '6a0464726f70201c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e0400746162',
    );
});

it('generateOpReturnScript() correctly throws an error on an invalid encryption input', () => {
    const BCH = new BCHJS();
    const optionalOpReturnMsg = null;
    const encryptionFlag = true;
    const airdropFlag = false;
    const airdropTokenId = null;
    const mockEncryptedEj = null; // invalid given encryptionFlag is true
    let thrownError;

    try {
        generateOpReturnScript(
            BCH,
            optionalOpReturnMsg,
            encryptionFlag,
            airdropFlag,
            airdropTokenId,
            mockEncryptedEj,
        );
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid OP RETURN script input');
});

it('generateOpReturnScript() correctly throws an error on an invalid airdrop input', () => {
    const BCH = new BCHJS();
    const optionalOpReturnMsg = null;
    const encryptionFlag = false;
    const airdropFlag = true;
    const airdropTokenId = null; // invalid given airdropFlag is true

    let thrownError;

    try {
        generateOpReturnScript(
            BCH,
            optionalOpReturnMsg,
            encryptionFlag,
            airdropFlag,
            airdropTokenId,
        );
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid OP RETURN script input');
});

it(`generateTxInput() returns an input object for a valid one to one XEC tx `, async () => {
    const BCH = new BCHJS();
    const isOneToMany = false;
    const utxos = mockReturnGetSlpBalancesAndUtxos.nonSlpUtxos;
    let txBuilder = new BCH.TransactionBuilder();
    const destinationAddressAndValueArray = null;
    const satoshisToSend = new BigNumber(2184);
    const feeInSatsPerByte = currency.defaultFee;

    const inputObj = generateTxInput(
        BCH,
        isOneToMany,
        utxos,
        txBuilder,
        destinationAddressAndValueArray,
        satoshisToSend,
        feeInSatsPerByte,
    );
    expect(inputObj.txBuilder).not.toStrictEqual(null);
    expect(inputObj.totalInputUtxoValue).toStrictEqual(new BigNumber(701000));
    expect(inputObj.txFee).toStrictEqual(752);
    expect(inputObj.inputUtxos.length).not.toStrictEqual(0);
});

it(`generateTxInput() returns an input object for a valid one to many XEC tx `, async () => {
    const BCH = new BCHJS();
    const isOneToMany = true;
    const utxos = mockReturnGetSlpBalancesAndUtxos.nonSlpUtxos;
    let txBuilder = new BCH.TransactionBuilder();
    const destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,3000',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,3000',
        'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,3000',
    ];
    const satoshisToSend = new BigNumber(900000);
    const feeInSatsPerByte = currency.defaultFee;

    const inputObj = generateTxInput(
        BCH,
        isOneToMany,
        utxos,
        txBuilder,
        destinationAddressAndValueArray,
        satoshisToSend,
        feeInSatsPerByte,
    );
    expect(inputObj.txBuilder).not.toStrictEqual(null);
    expect(inputObj.totalInputUtxoValue).toStrictEqual(new BigNumber(1401000));
    expect(inputObj.txFee).toStrictEqual(1186);
    expect(inputObj.inputUtxos.length).not.toStrictEqual(0);
});

it(`generateTxInput() throws error for a one to many XEC tx with invalid destinationAddressAndValueArray input`, async () => {
    const BCH = new BCHJS();
    const isOneToMany = true;
    const utxos = mockReturnGetSlpBalancesAndUtxos.nonSlpUtxos;
    let txBuilder = new BCH.TransactionBuilder();
    const destinationAddressAndValueArray = null; // invalid since isOneToMany is true
    const satoshisToSend = new BigNumber(900000);
    const feeInSatsPerByte = currency.defaultFee;

    let thrownError;
    try {
        generateTxInput(
            BCH,
            isOneToMany,
            utxos,
            txBuilder,
            destinationAddressAndValueArray,
            satoshisToSend,
            feeInSatsPerByte,
        );
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid tx input parameter');
});

it(`generateTxInput() throws error for a one to many XEC tx with invalid utxos input`, async () => {
    const BCH = new BCHJS();
    const isOneToMany = true;
    const utxos = null;
    let txBuilder = new BCH.TransactionBuilder();
    const destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,3000',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,3000',
        'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,3000',
    ];
    const satoshisToSend = new BigNumber(900000);
    const feeInSatsPerByte = currency.defaultFee;

    let thrownError;
    try {
        generateTxInput(
            BCH,
            isOneToMany,
            utxos,
            txBuilder,
            destinationAddressAndValueArray,
            satoshisToSend,
            feeInSatsPerByte,
        );
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid tx input parameter');
});

it(`generateTxOutput() returns a txBuilder instance for a valid one to one XEC tx `, () => {
    // txbuilder output params
    const BCH = new BCHJS();
    const { destinationAddress, wallet } = sendBCHMock;
    const isOneToMany = false;
    const singleSendValue = new BigNumber(
        fromSmallestDenomination(
            mockOneToOneSendXecTxBuilderObj.transaction.tx.outs[0].value,
        ),
    );
    const totalInputUtxoValue =
        mockOneToOneSendXecTxBuilderObj.transaction.inputs[0].value;
    const satoshisToSend = toSmallestDenomination(
        new BigNumber(singleSendValue),
    );
    // for unit test purposes, calculate fee by subtracting satoshisToSend from totalInputUtxoValue
    // no change output to be subtracted in this tx
    const txFee = new BigNumber(totalInputUtxoValue).minus(
        new BigNumber(satoshisToSend),
    );

    const destinationAddressAndValueArray = null;
    let txBuilder = new BCH.TransactionBuilder();
    const changeAddress = wallet.Path1899.cashAddress;

    const outputObj = generateTxOutput(
        BCH,
        isOneToMany,
        singleSendValue,
        satoshisToSend,
        totalInputUtxoValue,
        destinationAddress,
        destinationAddressAndValueArray,
        changeAddress,
        txFee,
        txBuilder,
    );
    expect(outputObj.toString()).toStrictEqual(
        mockOneToOneSendXecTxBuilderObj.toString(),
    );
});

it(`generateTxOutput() returns a txBuilder instance for a valid one to many XEC tx `, () => {
    // txbuilder output params
    const BCH = new BCHJS();
    const { destinationAddress, wallet } = sendBCHMock;
    const isOneToMany = true;
    const singleSendValue = null;
    const totalInputUtxoValue =
        mockOneToManySendXecTxBuilderObj.transaction.inputs[0].value +
        mockOneToManySendXecTxBuilderObj.transaction.inputs[1].value +
        mockOneToManySendXecTxBuilderObj.transaction.inputs[2].value;
    const satoshisToSend = new BigNumber(
        mockOneToManySendXecTxBuilderObj.transaction.tx.outs[0].value +
            mockOneToManySendXecTxBuilderObj.transaction.tx.outs[1].value +
            mockOneToManySendXecTxBuilderObj.transaction.tx.outs[2].value,
    );
    // for unit test purposes, calculate fee by subtracting satoshisToSend and change amount from totalInputUtxoValue
    const txFee = new BigNumber(totalInputUtxoValue)
        .minus(satoshisToSend)
        .minus(
            new BigNumber(
                mockOneToManySendXecTxBuilderObj.transaction.tx.outs[3].value,
            ),
        ); // change value

    const destinationAddressAndValueArray = toLegacyCashArray(
        validAddressArrayInput,
    );
    let txBuilder = new BCH.TransactionBuilder();
    const changeAddress = wallet.Path1899.cashAddress;

    const outputObj = generateTxOutput(
        BCH,
        isOneToMany,
        singleSendValue,
        satoshisToSend,
        totalInputUtxoValue,
        destinationAddress,
        destinationAddressAndValueArray,
        changeAddress,
        txFee,
        txBuilder,
    );
    expect(outputObj.toString()).toStrictEqual(
        mockOneToManySendXecTxBuilderObj.toString(),
    );
});

it(`generateTxOutput() throws an error on invalid input params for a one to one XEC tx`, () => {
    // txbuilder output params
    const BCH = new BCHJS();
    const { wallet } = sendBCHMock;
    const isOneToMany = false;
    const singleSendValue = null; // invalid due to singleSendValue being mandatory when isOneToMany is false
    const totalInputUtxoValue =
        mockOneToOneSendXecTxBuilderObj.transaction.inputs[0].value;
    const satoshisToSend = toSmallestDenomination(
        new BigNumber(singleSendValue),
    );
    // for unit test purposes, calculate fee by subtracting satoshisToSend from totalInputUtxoValue
    // no change output to be subtracted in this tx
    const txFee = new BigNumber(totalInputUtxoValue).minus(satoshisToSend);

    const destinationAddressAndValueArray = null;
    let txBuilder = new BCH.TransactionBuilder();
    const changeAddress = wallet.Path1899.cashAddress;

    let thrownError;
    try {
        generateTxOutput(
            BCH,
            isOneToMany,
            singleSendValue,
            satoshisToSend,
            totalInputUtxoValue,
            null,
            destinationAddressAndValueArray,
            changeAddress,
            txFee,
            txBuilder,
        );
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid tx input parameter');
});

it(`generateTxOutput() throws an error on invalid input params for a one to many XEC tx`, () => {
    // txbuilder output params
    const BCH = new BCHJS();
    const { wallet } = sendBCHMock;
    const isOneToMany = true;
    const singleSendValue = null;
    const totalInputUtxoValue =
        mockOneToManySendXecTxBuilderObj.transaction.inputs[0].value +
        mockOneToManySendXecTxBuilderObj.transaction.inputs[1].value +
        mockOneToManySendXecTxBuilderObj.transaction.inputs[2].value;
    const satoshisToSend = new BigNumber(
        mockOneToManySendXecTxBuilderObj.transaction.tx.outs[0].value +
            mockOneToManySendXecTxBuilderObj.transaction.tx.outs[1].value +
            mockOneToManySendXecTxBuilderObj.transaction.tx.outs[2].value,
    );
    // for unit test purposes, calculate fee by subtracting satoshisToSend and change amount from totalInputUtxoValue
    const txFee = new BigNumber(totalInputUtxoValue)
        .minus(satoshisToSend)
        .minus(
            new BigNumber(
                mockOneToManySendXecTxBuilderObj.transaction.tx.outs[3].value,
            ),
        ); // change value
    const destinationAddressAndValueArray = null; // invalid as this is mandatory when isOneToMany is true
    let txBuilder = new BCH.TransactionBuilder();
    const changeAddress = wallet.Path1899.cashAddress;

    let thrownError;
    try {
        generateTxOutput(
            BCH,
            isOneToMany,
            singleSendValue,
            satoshisToSend,
            totalInputUtxoValue,
            null,
            destinationAddressAndValueArray,
            changeAddress,
            txFee,
            txBuilder,
        );
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid tx input parameter');
});

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
    it(`Recognizes a wallet with missing Hash160 values is a Legacy Wallet and requires migration`, () => {
        expect(isLegacyMigrationRequired(missingHash160)).toBe(true);
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

    test('parseOpReturn() successfully parses an airdrop transaction', async () => {
        const result = parseOpReturn(mockAirdropHexOutput);
        // verify the hex output is parsed correctly
        expect(result).toStrictEqual(mockParsedAirdropMessageArray);
        // verify airdrop hex prefix is contained in the array returned from parseOpReturn()
        expect(
            result.find(
                element => element === currency.opReturn.appPrefixesHex.airdrop,
            ),
        ).toStrictEqual(currency.opReturn.appPrefixesHex.airdrop);
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

    it(`flattenContactList flattens contactList array by returning an array of addresses`, () => {
        expect(
            flattenContactList([
                {
                    address: 'ecash:qpdkc5p7f25hwkxsr69m3evlj4h7wqq9xcgmjc8sxr',
                    name: 'Alpha',
                },
                {
                    address: 'ecash:qpq235n3l3u6ampc8slapapnatwfy446auuv64ylt2',
                    name: 'Beta',
                },
                {
                    address: 'ecash:qz50e58nkeg2ej2f34z6mhwylp6ven8emy8pp52r82',
                    name: 'Gamma',
                },
            ]),
        ).toStrictEqual([
            'ecash:qpdkc5p7f25hwkxsr69m3evlj4h7wqq9xcgmjc8sxr',
            'ecash:qpq235n3l3u6ampc8slapapnatwfy446auuv64ylt2',
            'ecash:qz50e58nkeg2ej2f34z6mhwylp6ven8emy8pp52r82',
        ]);
    });

    it(`flattenContactList flattens contactList array of length 1 by returning an array of 1 address`, () => {
        expect(
            flattenContactList([
                {
                    address: 'ecash:qpdkc5p7f25hwkxsr69m3evlj4h7wqq9xcgmjc8sxr',
                    name: 'Alpha',
                },
            ]),
        ).toStrictEqual(['ecash:qpdkc5p7f25hwkxsr69m3evlj4h7wqq9xcgmjc8sxr']);
    });
    it(`flattenContactList returns an empty array for invalid input`, () => {
        expect(flattenContactList(false)).toStrictEqual([]);
    });
    it(`getHashArrayFromWallet returns false for a legacy wallet`, () => {
        expect(
            getHashArrayFromWallet(mockLegacyWallets.legacyAlphaMainnet),
        ).toBe(false);
    });
    it(`Successfully extracts a hash160 array from a migrated wallet object`, () => {
        expect(
            getHashArrayFromWallet(
                mockLegacyWallets.migratedLegacyAlphaMainnet,
            ),
        ).toStrictEqual([
            '960c9ed561f1699f0c49974d50b3bb7cdc118625',
            '2be0e0c999e7e77a443ea726f82c441912fca92b',
            'ba8257db65f40359989c7b894c5e88ed7b6344f6',
        ]);
    });
    it(`Successfully parses an incoming XEC tx`, () => {
        expect(
            parseChronikTx(lambdaIncomingXecTx, lambdaHash160s),
        ).toStrictEqual({
            incoming: true,
            xecAmount: '42',
            isEtokenTx: false,
        });
    });
    it(`Successfully parses an outgoing XEC tx`, () => {
        expect(
            parseChronikTx(lambdaOutgoingXecTx, lambdaHash160s),
        ).toStrictEqual({
            incoming: false,
            xecAmount: '222',
            isEtokenTx: false,
        });
    });
    it(`Successfully parses an incoming eToken tx`, () => {
        expect(
            parseChronikTx(lambdaIncomingEtokenTx, lambdaHash160s),
        ).toStrictEqual({
            incoming: true,
            xecAmount: '5.46',
            isEtokenTx: true,
            slpMeta: {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
            },
            etokenAmount: '12',
        });
    });
    it(`Successfully parses an outgoing eToken tx`, () => {
        expect(
            parseChronikTx(lambdaOutgoingEtokenTx, lambdaHash160s),
        ).toStrictEqual({
            incoming: false,
            xecAmount: '5.46',
            isEtokenTx: true,
            slpMeta: {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
            },
            etokenAmount: '17',
        });
    });
    it(`Returns decimals, name, and ticker for an eToken stored in wallet object`, () => {
        expect(
            checkWalletForTokenInfo(
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                validStoredWallet,
            ),
        ).toStrictEqual({
            decimals: 0,
            name: 'Covid19 Lifetime Immunity',
            ticker: 'NOCOVID',
        });
    });
    it(`Returns false for an eToken not stored in a wallet object`, () => {
        expect(
            checkWalletForTokenInfo(
                '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                validStoredWallet,
            ),
        ).toBe(false);
    });
    it(`isActiveWebsocket returns true for an active chronik websocket connection`, () => {
        expect(isActiveWebsocket(activeWebsocketAlpha)).toBe(true);
    });
    it(`isActiveWebsocket returns false for a disconnected chronik websocket connection`, () => {
        expect(isActiveWebsocket(disconnectedWebsocketAlpha)).toBe(false);
    });
    it(`isActiveWebsocket returns false for a null chronik websocket connection`, () => {
        expect(isActiveWebsocket(null)).toBe(false);
    });
    it(`isActiveWebsocket returns false for an active websocket connection with no subscriptions`, () => {
        expect(isActiveWebsocket(unsubscribedWebsocket)).toBe(false);
    });
});
