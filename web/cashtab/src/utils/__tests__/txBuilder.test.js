/* eslint-disable no-native-reassign */
import BigNumber from 'bignumber.js';
import { currency } from 'components/Common/Ticker.js';
import sendBCHMock from 'hooks/__mocks__/sendBCH';
import {
    generateTxInput,
    generateTxOutput,
    signAndBuildTx,
} from 'utils/cashMethods';
import {
    mockOnetoOneXecInputOnlyTxBuilderObj,
    mockOnetoOneXecInputAndOutputOnlyTxBuilderObj,
    mockOnetoOneXecInputOutputSignedRawHex,
} from 'utils/__mocks__/mockTxBuilderObj';
import TransactionBuilder from 'utils/txBuilder';

it(`Transaction Builder returns correct builder object with valid input and output params`, () => {
    const isOneToMany = false;
    let txBuilder = new TransactionBuilder();
    const { utxos, destinationAddress, wallet } = sendBCHMock;
    const satoshisToSend = new BigNumber(600);

    const txInputObj = generateTxInput(
        isOneToMany,
        utxos,
        txBuilder,
        null, // destinationAddressAndValueArray
        satoshisToSend,
        currency.defaultFee,
    );
    txBuilder = txInputObj.txBuilder;
    expect(JSON.stringify(txBuilder)).toStrictEqual(
        JSON.stringify(mockOnetoOneXecInputOnlyTxBuilderObj),
    );

    // verify txBuilder after adding tx outputs
    txBuilder = generateTxOutput(
        isOneToMany,
        new BigNumber(6), // XEC denomination of 600 satoshisToSend
        satoshisToSend,
        txInputObj.totalInputUtxoValue,
        destinationAddress,
        null, // destinationAddressAndValueArray
        destinationAddress, // using the same destination address as changeAddress
        txInputObj.txFee,
        txBuilder,
    );
    expect(JSON.stringify(txBuilder)).toStrictEqual(
        JSON.stringify(mockOnetoOneXecInputAndOutputOnlyTxBuilderObj),
    );

    // verify txBuilder after signing and building tx
    const rawTxHex = signAndBuildTx(txInputObj.inputUtxos, txBuilder, wallet);
    expect(JSON.stringify(rawTxHex)).toStrictEqual(
        JSON.stringify(mockOnetoOneXecInputOutputSignedRawHex),
    );
});
