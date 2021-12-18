/* eslint-disable no-native-reassign */
import useBCH from '../useBCH';
import mockReturnGetHydratedUtxoDetails from '../__mocks__/mockReturnGetHydratedUtxoDetails';
import mockReturnGetSlpBalancesAndUtxos from '../__mocks__/mockReturnGetSlpBalancesAndUtxos';
import mockReturnGetHydratedUtxoDetailsWithZeroBalance from '../__mocks__/mockReturnGetHydratedUtxoDetailsWithZeroBalance';
import mockReturnGetSlpBalancesAndUtxosNoZeroBalance from '../__mocks__/mockReturnGetSlpBalancesAndUtxosNoZeroBalance';
import sendBCHMock from '../__mocks__/sendBCH';
import createTokenMock from '../__mocks__/createToken';
import mockTxHistory from '../__mocks__/mockTxHistory';
import mockFlatTxHistory from '../__mocks__/mockFlatTxHistory';
import mockTxDataWithPassthrough from '../__mocks__/mockTxDataWithPassthrough';
import mockPublicKeys from '../__mocks__/mockPublicKeys';
import {
    flattenedHydrateUtxosResponse,
    legacyHydrateUtxosResponse,
} from '../__mocks__/mockHydrateUtxosBatched';
import {
    tokenSendWdt,
    tokenReceiveGarmonbozia,
    tokenReceiveTBS,
    tokenGenesisCashtabMintAlpha,
} from '../__mocks__/mockParseTokenInfoForTxHistory';
import {
    mockSentCashTx,
    mockReceivedCashTx,
    mockSentTokenTx,
    mockReceivedTokenTx,
    mockSentOpReturnMessageTx,
    mockReceivedOpReturnMessageTx,
} from '../__mocks__/mockParsedTxs';
import BCHJS from '@psf/bch-js'; // TODO: should be removed when external lib not needed anymore
import { currency } from '../../components/Common/Ticker';
import BigNumber from 'bignumber.js';
import { fromSmallestDenomination } from '@utils/cashMethods';

describe('useBCH hook', () => {
    it('gets Rest Api Url on testnet', () => {
        process = {
            env: {
                REACT_APP_NETWORK: `testnet`,
                REACT_APP_BCHA_APIS:
                    'https://rest.kingbch.com/v3/,https://wallet-service-prod.bitframe.org/v3/,notevenaurl,https://rest.kingbch.com/v3/',
                REACT_APP_BCHA_APIS_TEST:
                    'https://free-test.fullstack.cash/v3/',
            },
        };
        const { getRestUrl } = useBCH();
        const expectedApiUrl = `https://free-test.fullstack.cash/v3/`;
        expect(getRestUrl(0)).toBe(expectedApiUrl);
    });

    it('gets primary Rest API URL on mainnet', () => {
        process = {
            env: {
                REACT_APP_BCHA_APIS:
                    'https://rest.kingbch.com/v3/,https://wallet-service-prod.bitframe.org/v3/,notevenaurl,https://rest.kingbch.com/v3/',
                REACT_APP_NETWORK: 'mainnet',
            },
        };
        const { getRestUrl } = useBCH();
        const expectedApiUrl = `https://rest.kingbch.com/v3/`;
        expect(getRestUrl(0)).toBe(expectedApiUrl);
    });

    it('calculates fee correctly for 2 P2PKH outputs', () => {
        const { calcFee } = useBCH();
        const BCH = new BCHJS();
        const utxosMock = [{}, {}];

        expect(calcFee(BCH, utxosMock, 2, 1.01)).toBe(378);
    });

    it('gets SLP and BCH balances and utxos from hydrated utxo details', async () => {
        const { getSlpBalancesAndUtxos } = useBCH();
        const BCH = new BCHJS();
        const result = await getSlpBalancesAndUtxos(
            BCH,
            mockReturnGetHydratedUtxoDetails,
        );

        expect(result).toStrictEqual(mockReturnGetSlpBalancesAndUtxos);
    });

    it(`Ignores SLP utxos with utxo.tokenQty === '0'`, async () => {
        const { getSlpBalancesAndUtxos } = useBCH();
        const BCH = new BCHJS();

        const result = await getSlpBalancesAndUtxos(
            BCH,
            mockReturnGetHydratedUtxoDetailsWithZeroBalance,
        );

        expect(result).toStrictEqual(
            mockReturnGetSlpBalancesAndUtxosNoZeroBalance,
        );
    });

    it(`Parses flattened batched hydrateUtxosResponse to yield same result as legacy unbatched hydrateUtxosResponse`, async () => {
        const { getSlpBalancesAndUtxos } = useBCH();
        const BCH = new BCHJS();

        const batchedResult = await getSlpBalancesAndUtxos(
            BCH,
            flattenedHydrateUtxosResponse,
        );

        const legacyResult = await getSlpBalancesAndUtxos(
            BCH,
            legacyHydrateUtxosResponse,
        );

        expect(batchedResult).toStrictEqual(legacyResult);
    });

    it('sends XEC correctly', async () => {
        const { sendXec } = useBCH();
        const BCH = new BCHJS();
        const {
            expectedTxId,
            expectedHex,
            utxos,
            wallet,
            destinationAddress,
            sendAmount,
        } = sendBCHMock;

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockResolvedValue(expectedTxId);
        expect(
            await sendXec(
                BCH,
                wallet,
                utxos,
                currency.defaultFee,
                '',
                false,
                null,
                destinationAddress,
                sendAmount,
            ),
        ).toBe(`${currency.blockExplorerUrl}/tx/${expectedTxId}`);
        expect(BCH.RawTransactions.sendRawTransaction).toHaveBeenCalledWith(
            expectedHex,
        );
    });

    it('sends XEC correctly with an encrypted OP_RETURN message', async () => {
        const { sendXec } = useBCH();
        const BCH = new BCHJS();
        const {
            expectedTxId,
            expectedHex,
            utxos,
            wallet,
            destinationAddress,
            sendAmount,
        } = sendBCHMock;

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockResolvedValue(expectedTxId);
        expect(
            await sendXec(
                BCH,
                wallet,
                utxos,
                currency.defaultFee,
                'This is an encrypted opreturn message',
                false,
                null,
                destinationAddress,
                sendAmount,
                true, // encryption flag for the OP_RETURN message
            ),
        ).toBe(`${currency.blockExplorerUrl}/tx/${expectedTxId}`);
    });

    it('sends XEC throws error attempting to encrypt a message with an invalid address', async () => {
        const { sendXec } = useBCH();
        const BCH = new BCHJS();
        const {
            expectedTxId,
            expectedHex,
            utxos,
            wallet,
            destinationAddress,
            sendAmount,
        } = sendBCHMock;

        const expectedError = {
            error: `Unsupported address format : INVALIDADDRESS`,
            success: false,
        };

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockResolvedValue(expectedTxId);

        let thrownError;

        try {
            await sendXec(
                BCH,
                wallet,
                utxos,
                currency.defaultFee,
                'This is an encrypted opreturn message',
                false,
                null,
                'INVALIDADDRESS',
                sendAmount,
                true, // encryption flag for the OP_RETURN message
            );
        } catch (err) {
            thrownError = err;
        }

        expect(thrownError).toStrictEqual(expectedError);
    });

    it('sends one to many XEC correctly', async () => {
        const { sendXec } = useBCH();
        const BCH = new BCHJS();
        const {
            expectedTxId,
            expectedHex,
            utxos,
            wallet,
            destinationAddress,
            sendAmount,
        } = sendBCHMock;

        const addressAndValueArray = [
            'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05,6',
            'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05,6.8',
            'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05,7',
            'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05,6',
        ];

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockResolvedValue(expectedTxId);
        expect(
            await sendXec(
                BCH,
                wallet,
                utxos,
                currency.defaultFee,
                '',
                true,
                addressAndValueArray,
            ),
        ).toBe(`${currency.blockExplorerUrl}/tx/${expectedTxId}`);
    });

    it(`Throws error if called trying to send one base unit ${currency.ticker} more than available in utxo set`, async () => {
        const { sendXec } = useBCH();
        const BCH = new BCHJS();
        const { expectedTxId, utxos, wallet, destinationAddress } = sendBCHMock;

        const expectedTxFeeInSats = 229;

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockResolvedValue(expectedTxId);
        const oneBaseUnitMoreThanBalance = new BigNumber(utxos[0].value)
            .minus(expectedTxFeeInSats)
            .plus(1)
            .div(10 ** currency.cashDecimals)
            .toString();

        const failedSendBch = sendXec(
            BCH,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            oneBaseUnitMoreThanBalance,
        );
        expect(failedSendBch).rejects.toThrow(new Error('Insufficient funds'));
        const nullValuesSendBch = await sendXec(
            BCH,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            null,
        );
        expect(nullValuesSendBch).toBe(null);
    });

    it('Throws error on attempt to send one satoshi less than backend dust limit', async () => {
        const { sendXec } = useBCH();
        const BCH = new BCHJS();
        const { expectedTxId, utxos, wallet, destinationAddress } = sendBCHMock;
        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockResolvedValue(expectedTxId);
        const failedSendBch = sendXec(
            BCH,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            new BigNumber(
                fromSmallestDenomination(currency.dustSats).toString(),
            )
                .minus(new BigNumber('0.00000001'))
                .toString(),
        );
        expect(failedSendBch).rejects.toThrow(new Error('dust'));
        const nullValuesSendBch = await sendXec(
            BCH,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            null,
        );
        expect(nullValuesSendBch).toBe(null);
    });

    it('receives errors from the network and parses it', async () => {
        const { sendXec } = useBCH();
        const BCH = new BCHJS();
        const { sendAmount, utxos, wallet, destinationAddress } = sendBCHMock;
        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockImplementation(async () => {
                throw new Error('insufficient priority (code 66)');
            });
        const insufficientPriority = sendXec(
            BCH,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            sendAmount,
        );
        await expect(insufficientPriority).rejects.toThrow(
            new Error('insufficient priority (code 66)'),
        );

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockImplementation(async () => {
                throw new Error('txn-mempool-conflict (code 18)');
            });
        const txnMempoolConflict = sendXec(
            BCH,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            sendAmount,
        );
        await expect(txnMempoolConflict).rejects.toThrow(
            new Error('txn-mempool-conflict (code 18)'),
        );

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockImplementation(async () => {
                throw new Error('Network Error');
            });
        const networkError = sendXec(
            BCH,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            sendAmount,
        );
        await expect(networkError).rejects.toThrow(new Error('Network Error'));

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockImplementation(async () => {
                const err = new Error(
                    'too-long-mempool-chain, too many unconfirmed ancestors [limit: 25] (code 64)',
                );
                throw err;
            });

        const tooManyAncestorsMempool = sendXec(
            BCH,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            sendAmount,
        );
        await expect(tooManyAncestorsMempool).rejects.toThrow(
            new Error(
                'too-long-mempool-chain, too many unconfirmed ancestors [limit: 25] (code 64)',
            ),
        );
    });

    it('creates a token correctly', async () => {
        const { createToken } = useBCH();
        const BCH = new BCHJS();
        const { expectedTxId, expectedHex, wallet, configObj } =
            createTokenMock;

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockResolvedValue(expectedTxId);
        expect(await createToken(BCH, wallet, 5.01, configObj)).toBe(
            `${currency.tokenExplorerUrl}/tx/${expectedTxId}`,
        );
        expect(BCH.RawTransactions.sendRawTransaction).toHaveBeenCalledWith(
            expectedHex,
        );
    });

    it('Throws correct error if user attempts to create a token with an invalid wallet', async () => {
        const { createToken } = useBCH();
        const BCH = new BCHJS();
        const { invalidWallet, configObj } = createTokenMock;

        const invalidWalletTokenCreation = createToken(
            BCH,
            invalidWallet,
            currency.defaultFee,
            configObj,
        );
        await expect(invalidWalletTokenCreation).rejects.toThrow(
            new Error('Invalid wallet'),
        );
    });

    it('Correctly flattens transaction history', () => {
        const { flattenTransactions } = useBCH();
        expect(flattenTransactions(mockTxHistory, 10)).toStrictEqual(
            mockFlatTxHistory,
        );
    });

    it(`Correctly parses a "send ${currency.ticker}" transaction`, async () => {
        const { parseTxData } = useBCH();
        const BCH = new BCHJS();
        expect(
            await parseTxData(
                BCH,
                [mockTxDataWithPassthrough[0]],
                mockPublicKeys,
            ),
        ).toStrictEqual(mockSentCashTx);
    });

    it(`Correctly parses a "receive ${currency.ticker}" transaction`, async () => {
        const { parseTxData } = useBCH();
        const BCH = new BCHJS();
        expect(
            await parseTxData(
                BCH,
                [mockTxDataWithPassthrough[5]],
                mockPublicKeys,
            ),
        ).toStrictEqual(mockReceivedCashTx);
    });

    it(`Correctly parses a "send ${currency.tokenTicker}" transaction`, async () => {
        const { parseTxData } = useBCH();
        const BCH = new BCHJS();
        expect(
            await parseTxData(
                BCH,
                [mockTxDataWithPassthrough[1]],
                mockPublicKeys,
            ),
        ).toStrictEqual(mockSentTokenTx);
    });

    it(`Correctly parses a "receive ${currency.tokenTicker}" transaction`, async () => {
        const { parseTxData } = useBCH();
        const BCH = new BCHJS();
        expect(
            await parseTxData(
                BCH,
                [mockTxDataWithPassthrough[3]],
                mockPublicKeys,
            ),
        ).toStrictEqual(mockReceivedTokenTx);
    });

    it(`Correctly parses a "send ${currency.tokenTicker}" transaction with token details`, () => {
        const { parseTokenInfoForTxHistory } = useBCH();
        const BCH = new BCHJS();
        expect(
            parseTokenInfoForTxHistory(
                BCH,
                tokenSendWdt.parsedTx,
                tokenSendWdt.tokenInfo,
            ),
        ).toStrictEqual(tokenSendWdt.cashtabTokenInfo);
    });

    it(`Correctly parses a "receive ${currency.tokenTicker}" transaction with token details and 9 decimals of precision`, () => {
        const { parseTokenInfoForTxHistory } = useBCH();
        const BCH = new BCHJS();
        expect(
            parseTokenInfoForTxHistory(
                BCH,
                tokenReceiveTBS.parsedTx,
                tokenReceiveTBS.tokenInfo,
            ),
        ).toStrictEqual(tokenReceiveTBS.cashtabTokenInfo);
    });

    it(`Correctly parses a "receive ${currency.tokenTicker}" transaction from an HD wallet (change address different from sending address)`, () => {
        const { parseTokenInfoForTxHistory } = useBCH();
        const BCH = new BCHJS();
        expect(
            parseTokenInfoForTxHistory(
                BCH,
                tokenReceiveGarmonbozia.parsedTx,
                tokenReceiveGarmonbozia.tokenInfo,
            ),
        ).toStrictEqual(tokenReceiveGarmonbozia.cashtabTokenInfo);
    });

    it(`Correctly parses a "GENESIS ${currency.tokenTicker}" transaction with token details`, () => {
        const { parseTokenInfoForTxHistory } = useBCH();
        const BCH = new BCHJS();
        expect(
            parseTokenInfoForTxHistory(
                BCH,
                tokenGenesisCashtabMintAlpha.parsedTx,
                tokenGenesisCashtabMintAlpha.tokenInfo,
            ),
        ).toStrictEqual(tokenGenesisCashtabMintAlpha.cashtabTokenInfo);
    });

    it(`Correctly parses a "send ${currency.ticker}" transaction with an OP_RETURN message`, async () => {
        const { parseTxData } = useBCH();
        const BCH = new BCHJS();
        expect(
            await parseTxData(
                BCH,
                [mockTxDataWithPassthrough[10]],
                mockPublicKeys,
            ),
        ).toStrictEqual(mockSentOpReturnMessageTx);
    });

    it(`Correctly parses a "receive ${currency.ticker}" transaction with an OP_RETURN message`, async () => {
        const { parseTxData } = useBCH();
        const BCH = new BCHJS();
        BCH.RawTransactions.getRawTransaction = jest
            .fn()
            .mockResolvedValue(mockTxDataWithPassthrough[12]);
        expect(
            await parseTxData(
                BCH,
                [mockTxDataWithPassthrough[11]],
                mockPublicKeys,
            ),
        ).toStrictEqual(mockReceivedOpReturnMessageTx);
    });

    it(`handleEncryptedOpReturn() correctly encrypts a message based on a valid cash address`, async () => {
        const { handleEncryptedOpReturn } = useBCH();
        const BCH = new BCHJS();
        const destinationAddress =
            'bitcoincash:qqvuj09f80sw9j7qru84ptxf0hyqffc38gstxfs5ru';
        const message =
            'This message is encrypted by ecies-lite with default parameters';

        const result = await handleEncryptedOpReturn(
            BCH,
            destinationAddress,
            Buffer.from(message),
        );

        // loop through each ecies encryption parameter from the object returned from the handleEncryptedOpReturn() call
        for (const k of Object.keys(result)) {
            switch (result[k].toString()) {
                case 'epk':
                    // verify the sender's ephemeral public key buffer
                    expect(result[k].toString()).toEqual(
                        'BPxEy0o7QsRok2GSpuLU27g0EqLIhf6LIxHx7P5UTZF9EFuQbqGzr5cCA51qVnvIJ9CZ84iW1DeDdvhg/EfPSas=',
                    );
                    break;
                case 'iv':
                    // verify the initialization vector for the cipher algorithm
                    expect(result[k].toString()).toEqual(
                        '2FcU3fRZUOBt7dqshZjd+g==',
                    );
                    break;
                case 'ct':
                    // verify the encrypted message buffer
                    expect(result[k].toString()).toEqual(
                        'wVxPjv/ZiQ4etHqqTTIEoKvYYf4po05I/kNySrdsN3verxlHI07Rbob/VfF4MDfYHpYmDwlR9ax1shhdSzUG/A==',
                    );
                    break;
                case 'mac':
                    // verify integrity of the message (checksum)
                    expect(result[k].toString()).toEqual(
                        'F9KxuR48O0wxa9tFYq6/Hy3joI2edKxLFSeDVk6JKZE=',
                    );
                    break;
            }
        }
    });

    it(`handleEncryptedOpReturn() correctly throws error when attempting to encrypt a message based on an invalid cash address`, async () => {
        const { handleEncryptedOpReturn } = useBCH();
        const BCH = new BCHJS();
        const destinationAddress = 'bitcoincash:qqvINVALIDADDRESSSSSSru';
        const message =
            'This message is encrypted by ecies-lite with default parameters';

        const expectedError = {
            error: `Unsupported address format : ${destinationAddress}`,
            success: false,
        };

        let thrownError;
        try {
            await handleEncryptedOpReturn(
                BCH,
                destinationAddress,
                Buffer.from(message),
            );
        } catch (err) {
            thrownError = err;
        }

        expect(thrownError).toStrictEqual(expectedError);
    });

    it(`handleEncryptedOpReturn() correctly throws error when attempting to encrypt a message based on null cash address input`, async () => {
        const { handleEncryptedOpReturn } = useBCH();
        const BCH = new BCHJS();
        const destinationAddress = null;
        const message =
            'This message is encrypted by ecies-lite with default parameters';
        const expectedError = 'Input must be a valid Bitcoin Cash address.';

        let thrownError;
        try {
            await handleEncryptedOpReturn(
                BCH,
                destinationAddress,
                Buffer.from(message),
            );
        } catch (err) {
            thrownError = err;
        }

        expect(thrownError).toStrictEqual(new Error(expectedError));
    });

    it(`getRecipientPublicKey() correctly retrieves the public key of a cash address`, async () => {
        const { getRecipientPublicKey } = useBCH();
        const BCH = new BCHJS();
        expect(
            await getRecipientPublicKey(
                BCH,
                'bitcoincash:qqvuj09f80sw9j7qru84ptxf0hyqffc38gstxfs5ru',
            ),
        ).toStrictEqual(
            '03208c4f52229e021ddec5fc6e07a59fd66388ac52bc2a2c1e0f1afb24b0e275ac',
        );
    });

    it(`getRecipientPublicKey() correctly throws error for an invalid cash address`, async () => {
        const { getRecipientPublicKey } = useBCH();
        const BCH = new BCHJS();
        const destinationAddress = 'bitcoincash:qqvuj0INVALIDDDDDDDDDDs5ru';

        const expectedError = {
            error: `Unsupported address format : ${destinationAddress}`,
            success: false,
        };

        let thrownError;
        try {
            await getRecipientPublicKey(BCH, destinationAddress);
        } catch (err) {
            thrownError = err;
        }

        expect(thrownError).toStrictEqual(expectedError);
    });

    it(`getRecipientPublicKey() correctly throws error for a null cash address input`, async () => {
        const { getRecipientPublicKey } = useBCH();
        const BCH = new BCHJS();
        const destinationAddress = null;
        const expectedError = 'Input must be a valid Bitcoin Cash address.';

        let thrownError;
        try {
            await getRecipientPublicKey(BCH, destinationAddress);
        } catch (err) {
            thrownError = err;
        }

        expect(thrownError).toStrictEqual(new Error(expectedError));
    });
});
