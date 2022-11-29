/* eslint-disable no-native-reassign */
import useBCH from '../useBCH';
import sendBCHMock from '../__mocks__/sendBCH';
import createTokenMock from '../__mocks__/createToken';
import { validStoredWallet } from '../../utils/__mocks__/mockStoredWallets';
import { currency } from '../../components/Common/Ticker';
import BigNumber from 'bignumber.js';
import { fromSatoshisToXec } from 'utils/cashMethods';
import { ChronikClient } from 'chronik-client'; // for mocking purposes

describe('useBCH hook', () => {
    it('gets primary Rest API URL on mainnet', () => {
        process = {
            env: {
                REACT_APP_BCHA_APIS:
                    'https://rest.kingbch.com/v3/,https://wallet-service-prod.bitframe.org/v3/,notevenaurl,https://rest.kingbch.com/v3/',
            },
        };
        const { getRestUrl } = useBCH();
        const expectedApiUrl = `https://rest.kingbch.com/v3/`;
        expect(getRestUrl(0)).toBe(expectedApiUrl);
    });

    it('sends XEC correctly', async () => {
        const { sendXec } = useBCH();
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );
        const { expectedTxId, utxos, wallet, destinationAddress, sendAmount } =
            sendBCHMock;

        chronik.broadcastTx = jest
            .fn()
            .mockResolvedValue({ txid: expectedTxId });
        expect(
            await sendXec(
                chronik,
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
    });

    it('sends XEC correctly with an encrypted OP_RETURN message', async () => {
        const { sendXec } = useBCH();
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );
        const { expectedTxId, utxos, wallet, destinationAddress, sendAmount } =
            sendBCHMock;
        const expectedPubKey =
            '03451a3e61ae8eb76b8d4cd6057e4ebaf3ef63ae3fe5f441b72c743b5810b6a389';

        chronik.broadcastTx = jest
            .fn()
            .mockResolvedValue({ txid: expectedTxId });
        expect(
            await sendXec(
                chronik,
                wallet,
                utxos,
                currency.defaultFee,
                'This is an encrypted opreturn message',
                false,
                null,
                destinationAddress,
                sendAmount,
                true, // encryption flag for the OP_RETURN message
                false, // airdrop flag
                '', // airdrop token id
                expectedPubKey, //optionalMockPubKeyResponse
            ),
        ).toBe(`${currency.blockExplorerUrl}/tx/${expectedTxId}`);
    });

    it('sends one to many XEC correctly', async () => {
        const { sendXec } = useBCH();
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );
        const { expectedTxId, utxos, wallet } = sendBCHMock;

        const addressAndValueArray = [
            'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05,6',
            'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05,6.8',
            'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05,7',
            'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05,6',
        ];

        chronik.broadcastTx = jest
            .fn()
            .mockResolvedValue({ txid: expectedTxId });
        expect(
            await sendXec(
                chronik,
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
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );
        const { utxos, wallet, destinationAddress } = sendBCHMock;

        const expectedTxFeeInSats = 229;

        // tally up the total utxo values
        let totalInputUtxoValue = new BigNumber(0);
        for (let i = 0; i < utxos.length; i++) {
            totalInputUtxoValue = totalInputUtxoValue.plus(
                new BigNumber(utxos[i].value),
            );
        }

        const oneBaseUnitMoreThanBalance = totalInputUtxoValue
            .minus(expectedTxFeeInSats)
            .plus(1)
            .div(10 ** currency.cashDecimals)
            .toString();

        let errorThrown;
        try {
            await sendXec(
                chronik,
                wallet,
                utxos,
                currency.defaultFee,
                '',
                false,
                null,
                destinationAddress,
                oneBaseUnitMoreThanBalance,
            );
        } catch (err) {
            errorThrown = err;
        }
        expect(errorThrown.message).toStrictEqual('Insufficient funds');

        const nullValuesSendBch = sendXec(
            chronik,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            null,
        );
        expect(nullValuesSendBch).rejects.toThrow(
            new Error('Invalid singleSendValue'),
        );
    });

    it('Throws error on attempt to send one satoshi less than backend dust limit', async () => {
        const { sendXec } = useBCH();
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );
        const { utxos, wallet, destinationAddress } = sendBCHMock;
        const failedSendBch = sendXec(
            chronik,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            new BigNumber(fromSatoshisToXec(currency.dustSats).toString())
                .minus(new BigNumber('0.00000001'))
                .toString(),
        );
        expect(failedSendBch).rejects.toThrow(new Error('dust'));
    });

    it("Throws error attempting to burn an eToken ID that is not within the wallet's utxo", async () => {
        const { burnToken } = useBCH();
        const wallet = validStoredWallet;
        const burnAmount = 10;
        const eTokenId = '0203c768a66eba24affNOTVALID103b772de4d9f8f63ba79e';
        const expectedError =
            'No token UTXOs for the specified token could be found.';
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );

        let thrownError;
        try {
            await burnToken(chronik, wallet, {
                tokenId: eTokenId,
                amount: burnAmount,
            });
        } catch (err) {
            thrownError = err;
        }
        expect(thrownError).toStrictEqual(new Error(expectedError));
    });

    it('receives errors from the network and parses it', async () => {
        const { sendXec } = useBCH();
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );
        const { sendAmount, utxos, wallet, destinationAddress } = sendBCHMock;
        chronik.broadcastTx = jest.fn().mockImplementation(async () => {
            throw new Error('insufficient priority (code 66)');
        });
        const insufficientPriority = sendXec(
            chronik,
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

        chronik.broadcastTx = jest.fn().mockImplementation(async () => {
            throw new Error('txn-mempool-conflict (code 18)');
        });
        const txnMempoolConflict = sendXec(
            chronik,
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

        chronik.broadcastTx = jest.fn().mockImplementation(async () => {
            throw new Error('Network Error');
        });
        const networkError = sendXec(
            chronik,
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

        chronik.broadcastTx = jest.fn().mockImplementation(async () => {
            const err = new Error(
                'too-long-mempool-chain, too many unconfirmed ancestors [limit: 25] (code 64)',
            );
            throw err;
        });

        const tooManyAncestorsMempool = sendXec(
            chronik,
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
        const { expectedTxId, expectedHex, wallet, configObj } =
            createTokenMock;
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );
        chronik.broadcastTx = jest
            .fn()
            .mockResolvedValue({ txid: expectedTxId });
        expect(await createToken(chronik, wallet, 5.01, configObj)).toBe(
            `${currency.blockExplorerUrl}/tx/${expectedTxId}`,
        );
    });

    it('Throws correct error if user attempts to create a token with an invalid wallet', async () => {
        const { createToken } = useBCH();
        const { invalidWallet, configObj } = createTokenMock;
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );
        const invalidWalletTokenCreation = createToken(
            chronik,
            invalidWallet,
            currency.defaultFee,
            configObj,
        );
        await expect(invalidWalletTokenCreation).rejects.toThrow(
            new Error('Invalid wallet'),
        );
    });

    it(`getRecipientPublicKey() correctly retrieves the public key of a cash address`, async () => {
        const { getRecipientPublicKey } = useBCH();
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );
        const expectedPubKey =
            '03208c4f52229e021ddec5fc6e07a59fd66388ac52bc2a2c1e0f1afb24b0e275ac';
        const destinationAddress =
            'bitcoincash:qqvuj09f80sw9j7qru84ptxf0hyqffc38gstxfs5ru';

        expect(
            await getRecipientPublicKey(
                chronik,
                destinationAddress,
                expectedPubKey,
            ),
        ).toBe(expectedPubKey);
    });
});
