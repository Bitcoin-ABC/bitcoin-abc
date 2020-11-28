/* eslint-disable no-native-reassign */
import useBCH from '../useBCH';
import mockReturnGetUtxos from '../__mocks__/mockReturnGetUtxos';
import mockReturnGetSlpBalancesAndUtxos from '../__mocks__/mockReturnGetSlpBalancesAndUtxos';
import sendBCHMock from '../__mocks__/sendBCH';
import BCHJS from '@psf/bch-js'; // TODO: should be removed when external lib not needed anymore
import { currency } from '../../components/Common/Ticker';
import sendBCH from '../__mocks__/sendBCH';

describe('useBCH hook', () => {
    it('gets Rest Api Url on testnet', () => {
        process = {
            env: {
                REACT_APP_NETWORK: `testnet`,
                REACT_APP_API_TEST: `https://free-test.fullstack.cash/v3/`,
                REACT_APP_API: `https://free-main.fullstack.cash/v3/`,
            },
        };
        const { getRestUrl } = useBCH();
        const expectedApiUrl = `https://free-test.fullstack.cash/v3/`;
        expect(getRestUrl()).toBe(expectedApiUrl);
    });

    it('gets Rest Api Url on mainnet', () => {
        process = {
            env: {
                REACT_APP_NETWORK: `mainnet`,
                REACT_APP_API_TEST: `https://free-test.fullstack.cash/v3/`,
                REACT_APP_API: `https://free-main.fullstack.cash/v3/`,
            },
        };
        const { getRestUrl } = useBCH();
        const expectedApiUrl = `https://free-main.fullstack.cash/v3/`;
        expect(getRestUrl()).toBe(expectedApiUrl);
    });

    it('calculates fee correctly for 2 P2PKH outputs', () => {
        const { calcFee } = useBCH();
        const BCH = new BCHJS();
        const utxosMock = [{}, {}];
        // For 1.01 sat/byte fee
        let expectedTxFee = 378;
        if (currency.defaultFee === 3.01) {
            expectedTxFee = 1126;
        } else if (currency.defaultFee === 5.01) {
            expectedTxFee = 1874;
        } else if ((currency.defaultFee = 83.3)) {
            expectedTxFee = 31155;
        }
        expect(calcFee(BCH, utxosMock)).toBe(expectedTxFee);
    });

    it('gets utxos', async () => {
        const { getUtxos } = useBCH();
        const BCH = new BCHJS();

        const addresses = [
            'bitcoincash:qphazxf3vhe4qchvzz2pjempdhplaxcj957xqq8mg2',
            'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05',
        ];

        const result = await getUtxos(BCH, addresses);
        expect(result).toStrictEqual(mockReturnGetUtxos);
    });

    it('gets SLP and BCH balances and utxos', async () => {
        const { getSlpBalancesAndUtxos } = useBCH();
        const BCH = new BCHJS();
        const utxos = mockReturnGetUtxos;

        const result = await getSlpBalancesAndUtxos(BCH, utxos);

        expect(result).toStrictEqual(mockReturnGetSlpBalancesAndUtxos);
    });

    it('sends BCH correctly', async () => {
        const { sendBch } = useBCH();
        const BCH = new BCHJS();
        const {
            expectedTxId,
            expectedHex,
            utxos,
            wallet,
            addresses,
            values,
        } = sendBCHMock;
        let expectedHexByFee = expectedHex;
        if (currency.defaultFee === 3.01) {
            expectedHexByFee = sendBCHMock.expectedHexThreeSatPerByteFee;
        } else if (currency.defaultFee === 5.01) {
            expectedHexByFee = sendBCHMock.expectedHexFiveSatPerByteFee;
        } else if (currency.defaultFee === 83.3) {
            expectedHexByFee = sendBCHMock.expectedHexEightyThreeSatPerByteFee;
        }
        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockResolvedValue(expectedTxId);
        expect(await sendBch(BCH, wallet, utxos, { addresses, values })).toBe(
            `${currency.blockExplorerUrl}/tx/${expectedTxId}`,
        );
        expect(BCH.RawTransactions.sendRawTransaction).toHaveBeenCalledWith(
            expectedHexByFee,
        );
    });

    it('sends BCH correctly with callback', async () => {
        const { sendBch } = useBCH();
        const BCH = new BCHJS();
        const callback = jest.fn();
        const {
            expectedTxId,
            expectedHex,
            utxos,
            wallet,
            addresses,
            values,
        } = sendBCHMock;
        let expectedHexByFee = expectedHex;
        if (currency.defaultFee === 3.01) {
            expectedHexByFee = sendBCHMock.expectedHexThreeSatPerByteFee;
        } else if (currency.defaultFee === 5.01) {
            expectedHexByFee = sendBCHMock.expectedHexFiveSatPerByteFee;
        } else if (currency.defaultFee === 83.3) {
            expectedHexByFee = sendBCHMock.expectedHexEightyThreeSatPerByteFee;
        }
        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockResolvedValue(expectedTxId);
        expect(
            await sendBch(BCH, wallet, utxos, { addresses, values }, callback),
        ).toBe(`${currency.blockExplorerUrl}/tx/${expectedTxId}`);
        expect(BCH.RawTransactions.sendRawTransaction).toHaveBeenCalledWith(
            expectedHexByFee,
        );
        expect(callback).toHaveBeenCalledWith(expectedTxId);
    });

    it('sends BCH with less BCH available on balance', async () => {
        const { sendBch } = useBCH();
        const BCH = new BCHJS();
        const {
            expectedTxId,
            expectedHex,
            utxos,
            wallet,
            addresses,
        } = sendBCHMock;
        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockResolvedValue(expectedTxId);
        const failedSendBch = sendBch(BCH, wallet, utxos, {
            addresses,
            values: [1],
        });
        expect(failedSendBch).rejects.toThrow(new Error('Insufficient funds'));
        const nullValuesSendBch = await sendBch(BCH, wallet, utxos, {
            addresses,
            values: null,
        });
        expect(nullValuesSendBch).toBe(null);
    });

    it('receives errors from the network and parses it', async () => {
        const { sendBch } = useBCH();
        const BCH = new BCHJS();
        const { values, utxos, wallet, addresses } = sendBCHMock;
        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockImplementation(async () => {
                throw new Error('insufficient priority (code 66)');
            });
        const insufficientPriority = sendBch(BCH, wallet, utxos, {
            addresses,
            values,
        });
        await expect(insufficientPriority).rejects.toThrow(
            new Error('insufficient priority (code 66)'),
        );

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockImplementation(async () => {
                throw new Error('txn-mempool-conflict (code 18)');
            });
        const txnMempoolConflict = sendBch(BCH, wallet, utxos, {
            addresses,
            values,
        });
        await expect(txnMempoolConflict).rejects.toThrow(
            new Error('txn-mempool-conflict (code 18)'),
        );

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockImplementation(async () => {
                throw new Error('Network Error');
            });
        const networkError = sendBch(BCH, wallet, utxos, { addresses, values });
        await expect(networkError).rejects.toThrow(new Error('Network Error'));

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockImplementation(async () => {
                const err = new Error(
                    'too-long-mempool-chain, too many unconfirmed ancestors [limit: 25] (code 64)',
                );
                throw err;
            });

        const tooManyAncestorsMempool = sendBch(BCH, wallet, utxos, {
            addresses,
            values,
        });
        await expect(tooManyAncestorsMempool).rejects.toThrow(
            new Error(
                'too-long-mempool-chain, too many unconfirmed ancestors [limit: 25] (code 64)',
            ),
        );
    });
});
