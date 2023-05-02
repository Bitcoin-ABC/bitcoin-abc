/* eslint-disable no-native-reassign */
import sendBCHMock from '../__mocks__/sendBCH';
import {
    aliasRegisteringWallet,
    aliasRegisteringWalletAfterTx,
    aliasRegisteringWalletAfterTwoTxs,
} from '../__mocks__/registerNewAliasMocks';
import createTokenMock from '../__mocks__/createToken';
import { burnTokenWallet } from '../__mocks__/burnToken';
import { currency } from '../../components/Common/Ticker';
import BigNumber from 'bignumber.js';
import { fromSatoshisToXec } from 'utils/cashMethods';
import { ChronikClient } from 'chronik-client'; // for mocking purposes
import {
    sendXec,
    burnToken,
    createToken,
    getRecipientPublicKey,
    registerNewAlias,
} from 'utils/transactions';

describe('Cashtab transaction broadcasting functions', () => {
    it('sends XEC correctly', async () => {
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

    it('Broadcasts a v0 alias registration tx for an 8-byte alias to a p2pkh address', async () => {
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );

        const mockTxid =
            '1272c4a9bf5829c9dba1efb252e753ed20e3cdd49b6e75a778befc7a87eaf7d0';

        chronik.broadcastTx = jest.fn().mockResolvedValue({ txid: mockTxid });

        const expectedResult = {
            explorerLink:
                'https://explorer.e.cash/tx/1272c4a9bf5829c9dba1efb252e753ed20e3cdd49b6e75a778befc7a87eaf7d0',
            rawTxHex:
                '0200000001049c2df49978e91fbd28e7827c2cee71c1d56c7743706b7f959dc090ba649e87000000006b483045022100dd79c2a3e8773e7d4963ad3f6f03b54aca569e8e383c5cdc285afa601ee50829022058dfcdc905ec8f45d7418644ccfdf45cd8db41aade2d57d455c50e1a181cf7bb4121036ea648569566fa0843b914f67e54ebcfa6921208acd6408d2881488809403ac6ffffffff030000000000000000266a042e78656300086e65777465737431150020edc8389101aed204b9c17b7d64a00ead0e8cfc27020000000000001976a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac92929800000000001976a91420edc8389101aed204b9c17b7d64a00ead0e8cfc88ac00000000',
            txid: '1272c4a9bf5829c9dba1efb252e753ed20e3cdd49b6e75a778befc7a87eaf7d0',
        };
        expect(
            await registerNewAlias(
                chronik,
                aliasRegisteringWallet,
                currency.defaultFee,
                'newtest1',
                'ecash:qqswmjpcjyq6a5syh8qhklty5q826r5vlsh7a7uqtq',
                551,
            ),
        ).toStrictEqual(expectedResult);
    });
    it('Broadcasts a v0 alias registration tx for a 21-byte alias to a p2pkh address', async () => {
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );

        const mockTxid =
            '912582a1dc11b568f14f8ebae15cbb0ce53bdb973e137e7dc7c9b261327e6cab';

        chronik.broadcastTx = jest.fn().mockResolvedValue({ txid: mockTxid });

        const expectedResult = {
            explorerLink: `${currency.blockExplorerUrl}/tx/${mockTxid}`,
            txid: mockTxid,
            rawTxHex:
                '0200000001d0f7ea877afcbe78a7756e9bd4cde320ed53e752b2efa1dbc92958bfa9c47212020000006a47304402205cf1941bd0ed8c49319189973feebd14e8d7faf6c5a3cdc6c16f676bd62c63ac022068c10726326e37f960433a92894609f7f0b65946d8104038110e2104d973c8e24121036ea648569566fa0843b914f67e54ebcfa6921208acd6408d2881488809403ac6ffffffff030000000000000000336a042e78656300157477656e74796f6e6562797465616c696173726567150020edc8389101aed204b9c17b7d64a00ead0e8cfc27020000000000001976a914638568e36d0b5d7d49a6e99854caa27d9772b09388aca48e9800000000001976a91420edc8389101aed204b9c17b7d64a00ead0e8cfc88ac00000000',
        };
        expect(
            await registerNewAlias(
                chronik,
                aliasRegisteringWalletAfterTx,
                currency.defaultFee,
                'twentyonebytealiasreg',
                'ecash:qqswmjpcjyq6a5syh8qhklty5q826r5vlsh7a7uqtq',
                551,
            ),
        ).toStrictEqual(expectedResult);
    });
    it('Broadcasts a v0 alias registration tx for a 16-byte alias to a p2pkh address', async () => {
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );

        const mockTxid =
            '8783d7064ce22e8390c9fa94ef9a4d5bb0184e401ef5a9fbf60b68294e275c80';

        chronik.broadcastTx = jest.fn().mockResolvedValue({ txid: mockTxid });

        const expectedResult = {
            explorerLink: `${currency.blockExplorerUrl}/tx/${mockTxid}`,
            txid: mockTxid,
            rawTxHex:
                '0200000001ab6c7e3261b2c9c77d7e133e97db3be50cbb5ce1ba8e4ff168b511dca1822591020000006b483045022100d0bd27e798ac38de8b4c654c6670386c68d8bfac4bf5fe26a185d8250bd7ae7e02206acfe247b95ee9879080e6e413d7f28734aa498046e7363a638a537fc657c50e4121036ea648569566fa0843b914f67e54ebcfa6921208acd6408d2881488809403ac6ffffffff0300000000000000002e6a042e78656300107768796e6f7474687265657465737473150020edc8389101aed204b9c17b7d64a00ead0e8cfc27020000000000001976a914638568e36d0b5d7d49a6e99854caa27d9772b09388acb68a9800000000001976a91420edc8389101aed204b9c17b7d64a00ead0e8cfc88ac00000000',
        };
        expect(
            await registerNewAlias(
                chronik,
                aliasRegisteringWalletAfterTwoTxs,
                currency.defaultFee,
                'whynotthreetests',
                'ecash:qqswmjpcjyq6a5syh8qhklty5q826r5vlsh7a7uqtq',
                551,
            ),
        ).toStrictEqual(expectedResult);
    });

    it(`Throws error if called trying to send one base unit ${currency.ticker} more than available in utxo set`, async () => {
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

        await expect(nullValuesSendBch).rejects.toThrow(
            new Error('Invalid singleSendValue'),
        );
    });

    it('Throws error on attempt to send one satoshi less than backend dust limit', async () => {
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
        await expect(failedSendBch).rejects.toThrow(new Error('dust'));
    });

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

    it('receives errors from the network and parses it', async () => {
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
        const { expectedTxId, wallet, configObj } = createTokenMock;
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
