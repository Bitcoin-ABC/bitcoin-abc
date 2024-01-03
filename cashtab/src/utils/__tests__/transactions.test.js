/* eslint-disable no-native-reassign */
import createTokenMock from '../__mocks__/createToken';
import { burnTokenWallet } from '../__mocks__/burnToken';
import { ChronikClient } from 'chronik-client'; // for mocking purposes
import { burnToken, createToken } from 'utils/transactions';
import { explorer } from 'config/explorer';
import appConfig from 'config/app';

describe('Cashtab transaction broadcasting functions', () => {
    it("Throws error attempting to burn an eToken ID that is not within the wallet's utxo", async () => {
        const wallet = burnTokenWallet;
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

    it('creates a token correctly', async () => {
        const { expectedTxId, wallet, configObj } = createTokenMock;
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );
        chronik.broadcastTx = jest
            .fn()
            .mockResolvedValue({ txid: expectedTxId });
        expect(await createToken(chronik, wallet, 5.01, configObj)).toBe(
            `${explorer.blockExplorerUrl}/tx/${expectedTxId}`,
        );
    });

    it('Throws correct error if user attempts to create a token with an invalid wallet', async () => {
        const { invalidWallet, configObj } = createTokenMock;
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );
        const invalidWalletTokenCreation = createToken(
            chronik,
            invalidWallet,
            appConfig.defaultFee,
            configObj,
        );
        await expect(invalidWalletTokenCreation).rejects.toThrow(
            new Error('Invalid wallet'),
        );
    });
});
