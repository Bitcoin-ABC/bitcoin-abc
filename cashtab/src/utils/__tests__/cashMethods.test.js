import { BN } from 'slp-mdm';
import * as utxolib from '@bitgo/utxo-lib';
import cashaddr from 'ecashaddrjs';
import {
    fromSatoshisToXec,
    flattenContactList,
    loadStoredWallet,
    isValidStoredWallet,
    fromLegacyDecimals,
    convertToEcashPrefix,
    isLegacyMigrationRequired,
    convertEtokenToEcashAddr,
    parseOpReturn,
    convertEcashtoEtokenAddr,
    getHashArrayFromWallet,
    isActiveWebsocket,
    generateAliasOpReturnScript,
    generateTxInput,
    generateTxOutput,
    generateTokenTxInput,
    signAndBuildTx,
    fromXecToSatoshis,
    getWalletBalanceFromUtxos,
    signUtxosByAddress,
    generateTokenTxOutput,
    getCashtabByteCount,
    calcFee,
    toHash160,
    generateGenesisOpReturn,
    generateSendOpReturn,
    generateBurnOpReturn,
    hash160ToAddress,
    outputScriptToAddress,
    sumOneToManyXec,
} from 'utils/cashMethods';
import { validAddressArrayInput } from '../__mocks__/mockAddressArray';
import {
    mockGenesisOpReturnScript,
    mockSendOpReturnScript,
    mockSendOpReturnTokenUtxos,
    mockBurnOpReturnScript,
    mockBurnOpReturnTokenUtxos,
} from '../__mocks__/mockOpReturnScript';
import {
    cachedUtxos,
    utxosLoadedFromCache,
} from '../__mocks__/mockCachedUtxos';
import {
    validStoredWallet,
    invalidStoredWallet,
    invalidpreChronikStoredWallet,
    validStoredWalletAfter20221123Streamline,
    invalidStoredWalletMissingPath1899AndMnemonic,
} from '../__mocks__/mockStoredWallets';

import {
    missingPath1899Wallet,
    missingPublicKeyInPath1899Wallet,
    missingPublicKeyInPath145Wallet,
    missingPublicKeyInPath245Wallet,
    notLegacyWalletWithXecPrefixes,
    notLegacyWalletWithPath145OnBchPrefix,
    notLegacyWalletWithPath1899OnBchPrefix,
    notLegacyWalletWithPath245OnBchPrefix,
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

import mockLegacyWallets from 'hooks/__mocks__/mockLegacyWallets';
import sendBCHMock from '../__mocks__/sendBCH';
import {
    activeWebsocketAlpha,
    disconnectedWebsocketAlpha,
    unsubscribedWebsocket,
} from '../__mocks__/chronikWs';
import mockNonSlpUtxos from '../../hooks/__mocks__/mockNonSlpUtxos';
import mockSlpUtxos from '../../hooks/__mocks__/mockSlpUtxos';
import {
    mockOneToOneSendXecTxBuilderObj,
    mockOneToManySendXecTxBuilderObj,
    mockCreateTokenOutputsTxBuilderObj,
    mockSendTokenOutputsTxBuilderObj,
    mockBurnTokenOutputsTxBuilderObj,
    mockCreateTokenTxBuilderObj,
    mockSendTokenTxBuilderObj,
    mockBurnTokenTxBuilderObj,
} from '../__mocks__/mockTxBuilderObj';
import {
    mockSingleInputUtxo,
    mockMultipleInputUtxos,
    mockSingleOutput,
    mockMultipleOutputs,
} from '../__mocks__/mockTxBuilderData';
import createTokenMock from '../__mocks__/createToken';
import { opReturn as opreturnConfig } from 'config/opreturn';
import appConfig from 'config/app';

it(`generateSendOpReturn() returns correct script object for valid tokenUtxo and send quantity`, () => {
    const tokensToSend = 50;
    const sendOpReturnScriptObj = generateSendOpReturn(
        mockSendOpReturnTokenUtxos,
        tokensToSend,
    );

    expect(JSON.stringify(sendOpReturnScriptObj.script)).toStrictEqual(
        JSON.stringify(mockSendOpReturnScript),
    );
});

it(`generateSendOpReturnScript() throws error on invalid input`, () => {
    const mockSendOpReturnTokenUtxos = null;
    const tokensToSend = 50;

    let errorThrown;
    try {
        generateSendOpReturn(mockSendOpReturnTokenUtxos, tokensToSend);
    } catch (err) {
        errorThrown = err.message;
    }
    expect(errorThrown).toStrictEqual('Invalid send token parameter');
});

it(`generateBurnOpReturn() returns correct script for valid tokenUtxo and burn quantity`, () => {
    const tokensToBurn = 7000;
    const burnOpReturnScript = generateBurnOpReturn(
        mockBurnOpReturnTokenUtxos,
        tokensToBurn,
    );

    expect(JSON.stringify(burnOpReturnScript)).toStrictEqual(
        JSON.stringify(mockBurnOpReturnScript),
    );
});

it(`generateBurnOpReturn() throws error on invalid input`, () => {
    const tokensToBurn = 7000;
    let errorThrown;
    try {
        generateBurnOpReturn(null, tokensToBurn);
    } catch (err) {
        errorThrown = err.message;
    }
    expect(errorThrown).toStrictEqual('Invalid burn token parameter');
});

it(`generateGenesisOpReturn() returns correct script for a valid configObj`, () => {
    const configObj = {
        name: 'ethantest',
        ticker: 'ETN',
        documentUrl: 'https://cashtab.com/',
        decimals: '3',
        initialQty: '5000',
        documentHash: '',
        mintBatonVout: null,
    };

    const genesisOpReturnScript = generateGenesisOpReturn(configObj);

    expect(JSON.stringify(genesisOpReturnScript)).toStrictEqual(
        JSON.stringify(mockGenesisOpReturnScript),
    );
});

it(`generateGenesisOpReturn() throws error on invalid configObj`, () => {
    const configObj = null;

    let errorThrown;
    try {
        generateGenesisOpReturn(configObj);
    } catch (err) {
        errorThrown = err.message;
    }
    expect(errorThrown).toStrictEqual('Invalid token configuration');
});

it(`signUtxosByAddress() successfully returns a txBuilder object for a one to one XEC tx`, () => {
    const isOneToMany = false;
    const { destinationAddress, wallet, utxos } = sendBCHMock;
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const satoshisToSendInput = new BN(2184);
    const feeInSatsPerByte = appConfig.defaultFee;

    // mock tx input
    const inputObj = generateTxInput(
        isOneToMany,
        utxos,
        txBuilder,
        null,
        satoshisToSendInput,
        feeInSatsPerByte,
    );

    // mock tx output
    const totalInputUtxoValue =
        mockOneToOneSendXecTxBuilderObj.transaction.inputs[0].value;
    const singleSendValue = new BN(
        fromSatoshisToXec(
            mockOneToOneSendXecTxBuilderObj.transaction.tx.outs[0].value,
        ),
    );
    const satoshisToSendOutput = fromXecToSatoshis(new BN(singleSendValue));
    const txFee = new BN(totalInputUtxoValue).minus(
        new BN(satoshisToSendOutput),
    );
    const changeAddress = wallet.Path1899.cashAddress;
    const outputObj = generateTxOutput(
        isOneToMany,
        singleSendValue,
        satoshisToSendOutput,
        totalInputUtxoValue,
        destinationAddress,
        null,
        changeAddress,
        txFee,
        inputObj.txBuilder,
    );

    const txBuilderResponse = signUtxosByAddress(
        mockSingleInputUtxo,
        wallet,
        outputObj,
    );
    expect(txBuilderResponse.toString()).toStrictEqual(
        mockOneToOneSendXecTxBuilderObj.toString(),
    );
});

it(`signUtxosByAddress() successfully returns a txBuilder object for a one to many XEC tx`, () => {
    const isOneToMany = true;
    const { wallet, utxos } = sendBCHMock;
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    let destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,3000',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,3000',
        'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,3000',
    ];
    const satoshisToSendInput = new BN(900000);
    const feeInSatsPerByte = appConfig.defaultFee;

    // mock tx input
    const inputObj = generateTxInput(
        isOneToMany,
        utxos,
        txBuilder,
        destinationAddressAndValueArray,
        satoshisToSendInput,
        feeInSatsPerByte,
    );

    // mock tx output
    const totalInputUtxoValue =
        mockOneToManySendXecTxBuilderObj.transaction.inputs[0].value +
        mockOneToManySendXecTxBuilderObj.transaction.inputs[1].value +
        mockOneToManySendXecTxBuilderObj.transaction.inputs[2].value;
    const singleSendValue = null;
    const satoshisToSendOutput = new BN(
        mockOneToManySendXecTxBuilderObj.transaction.tx.outs[0].value +
            mockOneToManySendXecTxBuilderObj.transaction.tx.outs[1].value +
            mockOneToManySendXecTxBuilderObj.transaction.tx.outs[2].value,
    );
    const txFee = new BN(totalInputUtxoValue)
        .minus(satoshisToSendOutput)
        .minus(
            new BN(
                mockOneToManySendXecTxBuilderObj.transaction.tx.outs[3].value,
            ),
        ); // change value
    destinationAddressAndValueArray = validAddressArrayInput;
    const changeAddress = wallet.Path1899.cashAddress;
    const outputObj = generateTxOutput(
        isOneToMany,
        singleSendValue,
        satoshisToSendOutput,
        totalInputUtxoValue,
        null,
        destinationAddressAndValueArray,
        changeAddress,
        txFee,
        inputObj.txBuilder,
    );

    const txBuilderResponse = signUtxosByAddress(
        mockSingleInputUtxo,
        wallet,
        outputObj,
    );
    expect(txBuilderResponse.toString()).toStrictEqual(
        mockOneToManySendXecTxBuilderObj.toString(),
    );
});

it(`sumOneToManyXec() correctly parses the value for a valid one to many send XEC transaction`, () => {
    const destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,1',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,2',
        'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,3',
    ];
    expect(sumOneToManyXec(destinationAddressAndValueArray)).toStrictEqual(6);
});
it(`sumOneToManyXec() correctly parses the value for a valid one to many send XEC transaction with decimals`, () => {
    const destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,1.23',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,2.45',
        'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,3.67',
    ];
    expect(sumOneToManyXec(destinationAddressAndValueArray)).toStrictEqual(
        7.35,
    );
});
it(`sumOneToManyXec() returns NaN for an address and value array that is partially typed or has invalid format`, () => {
    const destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,1',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,',
    ];
    expect(sumOneToManyXec(destinationAddressAndValueArray)).toStrictEqual(NaN);
});
it('generateAliasOpReturnScript() correctly generates OP_RETURN script for a valid alias registration for a p2pkh address', () => {
    const alias = 'test';
    const address = 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035';
    const { hash } = cashaddr.decode(address, true);

    // Manually build the expected outputScript
    const opReturn = '6a';
    // push protocol identifier
    const prefixBytesHex = '04';
    const aliasIdentifier = '2e786563';

    // push alias tx version
    const aliasProtocolVersionNumberHex = '00';

    // push the alias
    const aliasHexBytes = '04'; // alias.length in one byte of hex
    const aliasHex = Buffer.from(alias).toString('hex');

    // push the address
    const aliasAddressBytesHex = '15'; // (1 + 20) in one byte of hex
    const p2pkhVersionByteHex = '00';

    const aliasTxOpReturnOutputScript = [
        opReturn,
        prefixBytesHex,
        aliasIdentifier,
        aliasProtocolVersionNumberHex,
        aliasHexBytes,
        aliasHex,
        aliasAddressBytesHex,
        p2pkhVersionByteHex,
        hash,
    ].join('');

    // Calculate the expected outputScript with the tested function
    const aliasOutputScript = generateAliasOpReturnScript(alias, address);
    // aliasOutputScript.toString('hex')
    // 6a042e78656301000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d

    expect(aliasOutputScript.toString('hex')).toBe(aliasTxOpReturnOutputScript);
});
it('generateAliasOpReturnScript() correctly generates OP_RETURN script for a valid alias registration for a p2sh address', () => {
    const alias = 'testtwo';
    const address = 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
    const { hash } = cashaddr.decode(address, true);

    // Manually build the expected outputScript
    const opReturn = '6a';

    // push protocol identifier
    const prefixBytesHex = '04';
    const aliasIdentifier = '2e786563';

    // push alias tx version
    const aliasProtocolVersionNumberHex = '00';

    // push the alias
    const aliasHexBytes = '07'; // alias.length in one byte of hex
    const aliasHex = Buffer.from(alias).toString('hex');

    // push the address
    const aliasAddressBytesHex = '15'; // (1 + 20) in one byte of hex
    const p2shVersionByteHex = '08';

    const aliasTxOpReturnOutputScript = [
        opReturn,
        prefixBytesHex,
        aliasIdentifier,
        aliasProtocolVersionNumberHex,
        aliasHexBytes,
        aliasHex,
        aliasAddressBytesHex,
        p2shVersionByteHex,
        hash,
    ].join('');

    // Calculate the expected outputScript with the tested function
    const aliasOutputScript = generateAliasOpReturnScript(alias, address);
    // aliasOutputScript.toString('hex')
    // 6a042e7865630100077465737474776f1508d37c4c809fe9840e7bfa77b86bd47163f6fb6c60

    expect(aliasOutputScript.toString('hex')).toBe(aliasTxOpReturnOutputScript);
});

it(`generateTokenTxInput() returns a valid object for a valid create token tx`, async () => {
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const tokenId =
        '1c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e';
    const tokenInputObj = generateTokenTxInput(
        'GENESIS',
        mockNonSlpUtxos,
        null, // no slpUtxos used for genesis tx
        tokenId,
        null, // no token send/burn amount for genesis tx
        appConfig.defaultFee,
        txBuilder,
    );

    expect(tokenInputObj.inputXecUtxos).toStrictEqual([mockNonSlpUtxos[0]]);
    expect(tokenInputObj.txBuilder.toString()).toStrictEqual(
        mockCreateTokenTxBuilderObj.toString(),
    );
    expect(tokenInputObj.remainderXecValue).toStrictEqual(
        new BN(698999), // tokenInputObj.inputXecUtxos - appConfig.etokenSats 546 - txFee
    );
});

it(`generateTokenTxInput() returns a valid object for a valid send token tx`, async () => {
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const tokenId = mockSlpUtxos[0].tokenId;

    const tokenInputObj = generateTokenTxInput(
        'SEND',
        mockNonSlpUtxos,
        mockSlpUtxos,
        tokenId,
        new BN(500), // sending 500 of these tokens
        appConfig.defaultFee,
        txBuilder,
    );

    expect(tokenInputObj.inputTokenUtxos).toStrictEqual(
        [mockSlpUtxos[0]].concat([mockSlpUtxos[1]]), // mockSlpUtxos[0] 400 + mockSlpUtxos[1] 6500
    );
    expect(tokenInputObj.remainderTokenValue).toStrictEqual(
        new BN(6400), // token change is mockSlpUtxos[0] 400 + mockSlpUtxos[1] 6500 - [tokenAmount] 500
    );
    expect(tokenInputObj.txBuilder.toString()).toStrictEqual(
        mockSendTokenTxBuilderObj.toString(),
    );
});

it(`generateTokenTxInput() returns a valid object for a valid burn token tx`, async () => {
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const tokenId = mockSlpUtxos[0].tokenId;

    const tokenInputObj = generateTokenTxInput(
        'BURN',
        mockNonSlpUtxos,
        mockSlpUtxos,
        tokenId,
        new BN(500), // burning 500 of these tokens
        appConfig.defaultFee,
        txBuilder,
    );

    expect(tokenInputObj.inputTokenUtxos).toStrictEqual(
        [mockSlpUtxos[0]].concat([mockSlpUtxos[1]]), // mockSlpUtxos[0] 400 + mockSlpUtxos[1] 6500
    );
    expect(tokenInputObj.remainderTokenValue).toStrictEqual(
        new BN(6400), // token change is mockSlpUtxos[0] 400 + mockSlpUtxos[1] 6500 - [tokenAmount] 500
    );
    expect(tokenInputObj.txBuilder.toString()).toStrictEqual(
        mockBurnTokenTxBuilderObj.toString(),
    );
});

it(`generateTokenTxOutput() returns a valid object for a valid create token tx`, async () => {
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const { configObj, wallet } = createTokenMock;
    const tokenSenderCashAddress = wallet.Path1899.cashAddress;

    const tokenOutputObj = generateTokenTxOutput(
        txBuilder,
        'GENESIS',
        tokenSenderCashAddress,
        null, // optional, for SEND or BURN amount
        new BN(500), // remainder XEC value
        configObj,
    );

    expect(tokenOutputObj.toString()).toStrictEqual(
        mockCreateTokenOutputsTxBuilderObj.toString(),
    );
});

it(`generateTokenTxOutput() returns a valid object for a valid send token tx`, async () => {
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const { wallet } = createTokenMock;
    const tokenSenderCashAddress = wallet.Path1899.cashAddress;
    const tokenRecipientTokenAddress = wallet.Path1899.cashAddress;

    const tokenOutputObj = generateTokenTxOutput(
        txBuilder,
        'SEND',
        tokenSenderCashAddress,
        mockSlpUtxos,
        new BN(500), // remainder XEC value
        null, // only for genesis tx
        tokenRecipientTokenAddress, // recipient token address
        new BN(50),
    );

    expect(tokenOutputObj.toString()).toStrictEqual(
        mockSendTokenOutputsTxBuilderObj.toString(),
    );
});

it(`generateTokenTxOutput() returns a valid object for a valid burn token tx`, async () => {
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const { wallet } = createTokenMock;
    const tokenSenderCashAddress = wallet.Path1899.cashAddress;

    const tokenOutputObj = generateTokenTxOutput(
        txBuilder,
        'BURN',
        tokenSenderCashAddress,
        mockSlpUtxos,
        new BN(500), // remainder XEC value
        null, // only for genesis tx
        null, // no token recipients for burn tx
        new BN(50),
    );

    expect(tokenOutputObj.toString()).toStrictEqual(
        mockBurnTokenOutputsTxBuilderObj.toString(),
    );
});

it(`generateTxInput() returns an input object for a valid one to one XEC tx`, async () => {
    const isOneToMany = false;
    const utxos = mockNonSlpUtxos;
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const destinationAddressAndValueArray = null;
    const satoshisToSend = new BN(2184);
    const feeInSatsPerByte = appConfig.defaultFee;

    const inputObj = generateTxInput(
        isOneToMany,
        utxos,
        txBuilder,
        destinationAddressAndValueArray,
        satoshisToSend,
        feeInSatsPerByte,
    );
    expect(inputObj.txBuilder).not.toStrictEqual(null);
    expect(inputObj.totalInputUtxoValue).toStrictEqual(new BN(700000));
    expect(inputObj.txFee).toStrictEqual(455);
    expect(inputObj.inputUtxos.length).not.toStrictEqual(0);
});

it(`generateTxInput() returns an input object for a valid one to many XEC tx`, async () => {
    const isOneToMany = true;
    const utxos = mockNonSlpUtxos;
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,3000',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,3000',
        'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,3000',
    ];
    const satoshisToSend = new BN(900000);
    const feeInSatsPerByte = appConfig.defaultFee;

    const inputObj = generateTxInput(
        isOneToMany,
        utxos,
        txBuilder,
        destinationAddressAndValueArray,
        satoshisToSend,
        feeInSatsPerByte,
    );
    expect(inputObj.txBuilder).not.toStrictEqual(null);
    expect(inputObj.totalInputUtxoValue).toStrictEqual(new BN(1400000));
    expect(inputObj.txFee).toStrictEqual(889);
    expect(inputObj.inputUtxos.length).not.toStrictEqual(0);
});

it(`generateTxInput() throws error for a one to many XEC tx with invalid destinationAddressAndValueArray input`, async () => {
    const isOneToMany = true;
    const utxos = mockNonSlpUtxos;
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const destinationAddressAndValueArray = null; // invalid since isOneToMany is true
    const satoshisToSend = new BN(900000);
    const feeInSatsPerByte = appConfig.defaultFee;

    let thrownError;
    try {
        generateTxInput(
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
    const isOneToMany = true;
    const utxos = null;
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,3000',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,3000',
        'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,3000',
    ];
    const satoshisToSend = new BN(900000);
    const feeInSatsPerByte = appConfig.defaultFee;

    let thrownError;
    try {
        generateTxInput(
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

it(`generateTxOutput() returns a txBuilder instance for a valid one to one XEC tx`, () => {
    // txbuilder output params
    const { destinationAddress, wallet } = sendBCHMock;
    const isOneToMany = false;
    const singleSendValue = fromSatoshisToXec(
        mockOneToOneSendXecTxBuilderObj.transaction.tx.outs[0].value,
    );
    const totalInputUtxoValue =
        mockOneToOneSendXecTxBuilderObj.transaction.inputs[0].value;
    const satoshisToSend = fromXecToSatoshis(new BN(singleSendValue));
    // for unit test purposes, calculate fee by subtracting satoshisToSend from totalInputUtxoValue
    // no change output to be subtracted in this tx
    const txFee = new BN(totalInputUtxoValue).minus(new BN(satoshisToSend));

    const destinationAddressAndValueArray = null;
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const changeAddress = wallet.Path1899.cashAddress;

    const outputObj = generateTxOutput(
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

it(`generateTxOutput() returns a txBuilder instance for a valid one to many XEC tx`, () => {
    // txbuilder output params
    const { destinationAddress, wallet } = sendBCHMock;
    const isOneToMany = true;
    const singleSendValue = null;
    const totalInputUtxoValue =
        mockOneToManySendXecTxBuilderObj.transaction.inputs[0].value +
        mockOneToManySendXecTxBuilderObj.transaction.inputs[1].value +
        mockOneToManySendXecTxBuilderObj.transaction.inputs[2].value;
    const satoshisToSend = new BN(
        mockOneToManySendXecTxBuilderObj.transaction.tx.outs[0].value +
            mockOneToManySendXecTxBuilderObj.transaction.tx.outs[1].value +
            mockOneToManySendXecTxBuilderObj.transaction.tx.outs[2].value,
    );
    // for unit test purposes, calculate fee by subtracting satoshisToSend and change amount from totalInputUtxoValue
    const txFee = new BN(totalInputUtxoValue)
        .minus(satoshisToSend)
        .minus(
            new BN(
                mockOneToManySendXecTxBuilderObj.transaction.tx.outs[3].value,
            ),
        ); // change value

    const destinationAddressAndValueArray = validAddressArrayInput;
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const changeAddress = wallet.Path1899.cashAddress;

    const outputObj = generateTxOutput(
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
    const { wallet } = sendBCHMock;
    const isOneToMany = false;
    const singleSendValue = null; // invalid due to singleSendValue being mandatory when isOneToMany is false
    const totalInputUtxoValue =
        mockOneToOneSendXecTxBuilderObj.transaction.inputs[0].value;
    const satoshisToSend = fromXecToSatoshis(new BN(singleSendValue));
    // for unit test purposes, calculate fee by subtracting satoshisToSend from totalInputUtxoValue
    // no change output to be subtracted in this tx
    const txFee = new BN(totalInputUtxoValue).minus(satoshisToSend);

    const destinationAddressAndValueArray = null;
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const changeAddress = wallet.Path1899.cashAddress;

    let thrownError;
    try {
        generateTxOutput(
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
    const { wallet } = sendBCHMock;
    const isOneToMany = true;
    const singleSendValue = null;
    const totalInputUtxoValue =
        mockOneToManySendXecTxBuilderObj.transaction.inputs[0].value +
        mockOneToManySendXecTxBuilderObj.transaction.inputs[1].value +
        mockOneToManySendXecTxBuilderObj.transaction.inputs[2].value;
    const satoshisToSend = new BN(
        mockOneToManySendXecTxBuilderObj.transaction.tx.outs[0].value +
            mockOneToManySendXecTxBuilderObj.transaction.tx.outs[1].value +
            mockOneToManySendXecTxBuilderObj.transaction.tx.outs[2].value,
    );
    // for unit test purposes, calculate fee by subtracting satoshisToSend and change amount from totalInputUtxoValue
    const txFee = new BN(totalInputUtxoValue)
        .minus(satoshisToSend)
        .minus(
            new BN(
                mockOneToManySendXecTxBuilderObj.transaction.tx.outs[3].value,
            ),
        ); // change value
    const destinationAddressAndValueArray = null; // invalid as this is mandatory when isOneToMany is true
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const changeAddress = wallet.Path1899.cashAddress;

    let thrownError;
    try {
        generateTxOutput(
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

it(`signAndBuildTx() successfully returns a raw tx hex for a tx with a single input and a single output`, () => {
    // txbuilder output params
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    // Use legacy sequencing for legacy unit tests
    txBuilder.DEFAULT_SEQUENCE = 0xffffffff;
    const { wallet } = sendBCHMock;
    // add inputs to txBuilder
    txBuilder.addInput(
        mockSingleInputUtxo[0].txid,
        mockSingleInputUtxo[0].vout,
    );

    // add outputs to txBuilder
    const outputAddressAndValue = mockSingleOutput.split(',');
    txBuilder.addOutput(
        cashaddr.toLegacy(outputAddressAndValue[0]), // address
        parseInt(fromXecToSatoshis(new BN(outputAddressAndValue[1]))), // value
    );
    const rawTxHex = signAndBuildTx(mockSingleInputUtxo, txBuilder, wallet);
    expect(rawTxHex).toStrictEqual(
        '0200000001582dfa42e2778a2e6b7d32fb1bf4cefc0be9d10a36538e9503465df99cd4a60d000000006b483045022100b4ee5268cb64c4f097e739df7c6934d1df7e75a4f217d5824db18ae2e12554b102204faf039738181aae80c064b928b3d8079a82cdb080ce9a2d5453939a588f4372412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff0158020000000000001976a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac00000000',
    );
});

it(`signAndBuildTx() successfully returns a raw tx hex for a tx with a single input and multiple outputs`, () => {
    // txbuilder output params
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    // Use legacy sequencing for legacy unit tests
    txBuilder.DEFAULT_SEQUENCE = 0xffffffff;
    const { wallet } = sendBCHMock;
    // add inputs to txBuilder
    txBuilder.addInput(
        mockSingleInputUtxo[0].txid,
        mockSingleInputUtxo[0].vout,
    );

    // add outputs to txBuilder
    for (let i = 0; i < mockMultipleOutputs.length; i++) {
        const outputAddressAndValue = mockMultipleOutputs[i].split(',');
        txBuilder.addOutput(
            cashaddr.toLegacy(outputAddressAndValue[0]), // address
            parseInt(fromXecToSatoshis(new BN(outputAddressAndValue[1]))), // value
        );
    }

    const rawTxHex = signAndBuildTx(mockSingleInputUtxo, txBuilder, wallet);
    expect(rawTxHex).toStrictEqual(
        '0200000001582dfa42e2778a2e6b7d32fb1bf4cefc0be9d10a36538e9503465df99cd4a60d000000006b483045022100df29734c4fb348b0e8b613ce522c10c5ac14cb3ecd32843dc7fcf004d60f1b8a022023c4ae02b38c7272e29f344902ae2afa4db1ec37d582a31c16650a0abc4f480c412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff0326020000000000001976a914f627e51001a51a1a92d8927808701373cf29267f88ac26020000000000001976a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac26020000000000001976a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac00000000',
    );
});

it(`signAndBuildTx() successfully returns a raw tx hex for a tx with multiple inputs and a single output`, () => {
    // txbuilder output params
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    // Use legacy sequencing for legacy unit tests
    txBuilder.DEFAULT_SEQUENCE = 0xffffffff;
    const { wallet } = sendBCHMock;
    // add inputs to txBuilder
    for (let i = 0; i < mockMultipleInputUtxos.length; i++) {
        txBuilder.addInput(
            mockMultipleInputUtxos[i].txid,
            mockMultipleInputUtxos[i].vout,
        );
    }
    // add outputs to txBuilder
    const outputAddressAndValue = mockSingleOutput.split(',');
    txBuilder.addOutput(
        cashaddr.toLegacy(outputAddressAndValue[0]), // address
        parseInt(fromXecToSatoshis(new BN(outputAddressAndValue[1]))), // value
    );

    const rawTxHex = signAndBuildTx(mockMultipleInputUtxos, txBuilder, wallet);
    expect(rawTxHex).toStrictEqual(
        '0200000003582dfa42e2778a2e6b7d32fb1bf4cefc0be9d10a36538e9503465df99cd4a60d000000006a4730440220541366dd5ea25d65d3044dbde16fc6118ab1aee07c7d0d4c25c9e8aa299f040402203ed2f540948197d4c6a4ae963ad187d145a9fb339e311317b03c6172732e267b412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff7313e804af08113dfa290515390a8ec3ac01448118f2eb556ee168a96ee6acdd000000006b483045022100c1d02c5023f83b87a4f2dd26a7306ed9be9d53ab972bd935b440e45eb54a304302200b99aa2f1a728b3bb1dcbff80742c5fcab991bb74e80fa231255a31d58a6ff7d412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff960dd2f0c47e8a3cf1486b046d879f45a047da3b51aedfb5594138ac857214f1000000006b483045022100bd24d11d7070988848cb4aa2b10748aa0aeb79dc8af39c1f22dc1034b3121e5f02201491026e5f8f6eb566eb17cb195e3da3ff0d9cf01bdd34c944964d33a8d3b1ad412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff0158020000000000001976a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac00000000',
    );
});

it(`signAndBuildTx() successfully returns a raw tx hex for a tx with multiple inputs and multiple outputs`, () => {
    // txbuilder output params
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    // Use legacy sequencing for legacy unit tests
    txBuilder.DEFAULT_SEQUENCE = 0xffffffff;
    const { wallet } = sendBCHMock;
    // add inputs to txBuilder
    for (let i = 0; i < mockMultipleInputUtxos.length; i++) {
        txBuilder.addInput(
            mockMultipleInputUtxos[i].txid,
            mockMultipleInputUtxos[i].vout,
        );
    }
    // add outputs to txBuilder
    for (let i = 0; i < mockMultipleOutputs.length; i++) {
        const outputAddressAndValue = mockMultipleOutputs[i].split(',');
        txBuilder.addOutput(
            cashaddr.toLegacy(outputAddressAndValue[0]), // address
            parseInt(fromXecToSatoshis(new BN(outputAddressAndValue[1]))), // value
        );
    }

    const rawTxHex = signAndBuildTx(mockMultipleInputUtxos, txBuilder, wallet);
    expect(rawTxHex).toStrictEqual(
        '0200000003582dfa42e2778a2e6b7d32fb1bf4cefc0be9d10a36538e9503465df99cd4a60d000000006a47304402203de4e6a512a6bec1d378b6444008484e1be5a0c621dc4b201d67addefffe864602202daf82e76b7594fe1ab54a49380c6b1226ab65551ae6ab9164216b66266f34a1412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff7313e804af08113dfa290515390a8ec3ac01448118f2eb556ee168a96ee6acdd000000006a473044022029f5fcbc9356beb9eae6b9ff9a479e8c8331b95406b6be456fccf9d90f148ea1022028f4e7fa7234f9429535360c8f5dad303e2c5044431615997861b10f26fa8a88412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff960dd2f0c47e8a3cf1486b046d879f45a047da3b51aedfb5594138ac857214f1000000006a473044022049a67738d99006b3523cff818f3626104cf5106bd463be70d22ad179a8cb403b022025829baf67f964202ea77ea7462a5447e32415e7293cdee382ea7ae9374364e8412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff0326020000000000001976a914f627e51001a51a1a92d8927808701373cf29267f88ac26020000000000001976a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac26020000000000001976a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac00000000',
    );
});

it(`signAndBuildTx() throws error on an empty inputUtxo param`, () => {
    // txbuilder output params
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const { wallet } = sendBCHMock;
    let thrownError;
    try {
        signAndBuildTx([], txBuilder, wallet);
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid buildTx parameter');
});

it(`signAndBuildTx() throws error on a null inputUtxo param`, () => {
    // txbuilder output params
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );
    const inputUtxo = null; // invalid input param
    const { wallet } = sendBCHMock;
    let thrownError;
    try {
        signAndBuildTx(inputUtxo, txBuilder, wallet);
    } catch (err) {
        thrownError = err;
    }
    expect(thrownError.message).toStrictEqual('Invalid buildTx parameter');
});

describe('Correctly executes cash utility functions', () => {
    it(`Correctly converts smallest base unit to smallest decimal for cashDecimals = 2`, () => {
        expect(fromSatoshisToXec(1, 2)).toStrictEqual(new BN(0.01));
    });
    it(`Correctly converts largest base unit to smallest decimal for cashDecimals = 2`, () => {
        expect(fromSatoshisToXec(1000000012345678, 2)).toStrictEqual(
            new BN(10000000123456.78),
        );
    });
    it(`Correctly converts smallest base unit to smallest decimal for cashDecimals = 8`, () => {
        expect(fromSatoshisToXec(1, 8)).toStrictEqual(new BN(0.00000001));
    });
    it(`Correctly converts largest base unit to smallest decimal for cashDecimals = 8`, () => {
        expect(fromSatoshisToXec(1000000012345678, 8)).toStrictEqual(
            new BN(10000000.12345678),
        );
    });
    it(`Accepts a cachedWalletState that has not preserved BigNumber object types, and returns the same wallet state with BigNumber type re-instituted`, () => {
        expect(loadStoredWallet(cachedUtxos)).toStrictEqual(
            utxosLoadedFromCache,
        );
    });
    it(`loadStoredWallet accepts undefined wallet state as input and outputs a zero balance wallet state`, () => {
        expect(loadStoredWallet(undefined)).toStrictEqual({
            balances: {
                totalBalanceInSatoshis: '0',
                totalBalance: '0',
            },
        });
    });
    it(`Correctly determines a wallet's balance from its set of non-eToken utxos (nonSlpUtxos)`, () => {
        expect(
            getWalletBalanceFromUtxos(
                validStoredWalletAfter20221123Streamline.state.nonSlpUtxos,
            ),
        ).toStrictEqual(validStoredWallet.state.balances);
    });
    it(`Correctly determines a wallet's zero balance from its empty set of non-eToken utxos (nonSlpUtxos)`, () => {
        expect(
            getWalletBalanceFromUtxos(utxosLoadedFromCache.nonSlpUtxos),
        ).toStrictEqual(utxosLoadedFromCache.balances);
    });
    it(`Recognizes a stored wallet as valid if it has all required fields prior to 20221123 updated format`, () => {
        expect(isValidStoredWallet(validStoredWallet)).toBe(true);
    });
    it(`Recognizes a stored wallet as valid if it has all required fields in 20221123 updated format`, () => {
        expect(
            isValidStoredWallet(validStoredWalletAfter20221123Streamline),
        ).toBe(true);
    });
    it(`Recognizes a stored wallet as invalid if it is missing required fields`, () => {
        expect(isValidStoredWallet(invalidStoredWallet)).toBe(false);
    });
    it(`Recognizes a stored wallet as invalid if it includes hydratedUtxoDetails in the state field`, () => {
        expect(isValidStoredWallet(invalidpreChronikStoredWallet)).toBe(false);
    });
    it(`Recognizes a stored wallet as invalid if it's missing the Path1899 and mnemonic keys`, () => {
        expect(
            isValidStoredWallet(invalidStoredWalletMissingPath1899AndMnemonic),
        ).toBe(false);
    });
    it(`Converts a legacy BCH amount to an XEC amount`, () => {
        expect(fromLegacyDecimals(0.00000546, 2)).toStrictEqual(5.46);
    });
    it(`Leaves a legacy BCH amount unchanged if appConfig.cashDecimals is 8`, () => {
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
        expect(isLegacyMigrationRequired(notLegacyWalletWithXecPrefixes)).toBe(
            false,
        );
    });
    it(`Recognizes a non-eCash prefixed Path245 address and requires migration`, () => {
        expect(
            isLegacyMigrationRequired(notLegacyWalletWithPath245OnBchPrefix),
        ).toBe(true);
    });
    it(`Recognizes a non-eCash prefixed Path1899 address and requires migration`, () => {
        expect(
            isLegacyMigrationRequired(notLegacyWalletWithPath1899OnBchPrefix),
        ).toBe(true);
    });
    it(`Recognizes a non-eCash prefixed Path145 address and requires migration`, () => {
        expect(
            isLegacyMigrationRequired(notLegacyWalletWithPath145OnBchPrefix),
        ).toBe(true);
    });

    test('toHash160() converts a valid bitcoincash: prefix address to a hash160', () => {
        const result = toHash160(
            'bitcoincash:qq9h6d0a5q65fgywv4ry64x04ep906mdku7ymranw3',
        );
        expect(result).toStrictEqual(
            '0b7d35fda03544a08e65464d54cfae4257eb6db7',
        );
    });
    test('toHash160 throws error if input address is an invalid bitcoincash: address', () => {
        const address = 'bitcoincash:qqd3qnINVALIDDDDDDDDDza25m';

        let errorThrown;
        try {
            toHash160(address);
        } catch (err) {
            errorThrown = err.message;
        }
        expect(errorThrown).toStrictEqual('Invalid address: ' + address + '.');
    });
    test('toHash160() converts a valid ecash: prefix address to a hash160', () => {
        const result = toHash160(
            'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
        );
        expect(result).toStrictEqual(
            '0b7d35fda03544a08e65464d54cfae4257eb6db7',
        );
    });
    test('toHash160 throws error if input address is an invalid ecash address', () => {
        const address = 'ecash:qqd3qn4zINVALIDDDDDtfza25m';

        let errorThrown;
        try {
            toHash160(address);
        } catch (err) {
            errorThrown = err.message;
        }
        expect(errorThrown).toStrictEqual('Invalid address: ' + address + '.');
    });
    test('toHash160() converts a valid etoken: address to a hash160', () => {
        const result = toHash160(
            'etoken:qq9h6d0a5q65fgywv4ry64x04ep906mdkufhx2swv3',
        );
        expect(result).toStrictEqual(
            '0b7d35fda03544a08e65464d54cfae4257eb6db7',
        );
    });
    test('toHash160 throws error if input address is an invalid etoken: address', () => {
        const address = 'etoken:qq9h6d0a5INVALIDDDDDDx2swv3';

        let errorThrown;
        try {
            toHash160(address);
        } catch (err) {
            errorThrown = err.message;
        }
        expect(errorThrown).toStrictEqual('Invalid address: ' + address + '.');
    });
    test('toHash160() converts a valid simpleledger: address to a hash160', () => {
        const result = toHash160(
            'simpleledger:qq9h6d0a5q65fgywv4ry64x04ep906mdkujlscgns0',
        );
        expect(result).toStrictEqual(
            '0b7d35fda03544a08e65464d54cfae4257eb6db7',
        );
    });
    test('toHash160 throws error if input address is an invalid simpleledger: address', () => {
        const address = 'simpleledger:qq9h6d0a5qINVALIDDDjlscgns0';

        let errorThrown;
        try {
            toHash160(address);
        } catch (err) {
            errorThrown = err.message;
        }
        expect(errorThrown).toStrictEqual('Invalid address: ' + address + '.');
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
                element => element === opreturnConfig.appPrefixesHex.airdrop,
            ),
        ).toStrictEqual(opreturnConfig.appPrefixesHex.airdrop);
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
    it(`getCashtabByteCount for 2 inputs, 2 outputs returns the same value as BCH.BitcoinCash.getByteCount(
            { P2PKH: utxos.length },
            { P2PKH: p2pkhOutputNumber },
        );`, () => {
        expect(getCashtabByteCount(2, 2)).toBe(374);
    });
    it(`getCashtabByteCount for 1 input, 2 outputs returns the same value as BCH.BitcoinCash.getByteCount(
            { P2PKH: utxos.length },
            { P2PKH: p2pkhOutputNumber },
        );`, () => {
        expect(getCashtabByteCount(1, 2)).toBe(226);
    });
    it(`getCashtabByteCount for 173 input, 1 outputs returns the same value as BCH.BitcoinCash.getByteCount(
            { P2PKH: utxos.length },
            { P2PKH: p2pkhOutputNumber },
        );`, () => {
        expect(getCashtabByteCount(173, 1)).toBe(25648);
    });
    it(`getCashtabByteCount for 1 input, 2000 outputs returns the same value as BCH.BitcoinCash.getByteCount(
            { P2PKH: utxos.length },
            { P2PKH: p2pkhOutputNumber },
        );`, () => {
        expect(getCashtabByteCount(1, 2000)).toBe(68158);
    });
    it('calculates fee correctly for 2 P2PKH outputs', () => {
        const utxosMock = [{}, {}];
        expect(calcFee(utxosMock, 2, appConfig.defaultFee)).toBe(752);
    });
    it(`Converts a hash160 to an ecash address`, () => {
        expect(
            hash160ToAddress('76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'),
        ).toBe('ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj');
    });
    it(`outputScriptToAddress determines P2PKH address type from output script and returns the ecash address`, () => {
        expect(
            outputScriptToAddress(
                '76a914da45fd71b76e34c88e97ccbebb454d7cd395e52c88ac',
            ),
        ).toBe('ecash:qrdytlt3kahrfjywjlxtaw69f47d89099s393kne5c');
    });
    it(`outputScriptToAddress determines P2SH address type from output script and returns the ecash address`, () => {
        expect(
            outputScriptToAddress(
                'a914c5e60aad8d98f298a76434750630dc1b46a2382187',
            ),
        ).toBe('ecash:prz7vz4d3kv09x98vs682p3smsd5dg3cyykjye6grt');
    });
    it(`outputScriptToAddress throws correct error for an output script that does not parse as P2PKH or P2SH`, () => {
        let thrownError;
        try {
            outputScriptToAddress('notAnOutputScript');
        } catch (err) {
            thrownError = err;
        }
        expect(thrownError.message).toBe('Unrecognized outputScript format');
    });
    it(`outputScriptToAddress throws correct error for an output script that for some reason is bracketed by P2PKH markers but is not a valid hash160`, () => {
        let thrownError;
        try {
            outputScriptToAddress(
                '76a914da45fd71b76eeeeeeeee34c88e97ccbebb454d7cd395e52c88ac',
            );
        } catch (err) {
            thrownError = err;
        }
        expect(thrownError.message).toBe('Parsed hash160 is incorrect length');
    });
});
