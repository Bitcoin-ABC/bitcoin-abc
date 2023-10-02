// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { sendXec } from 'transactions';
import { MockChronikClient } from '../../../../apps/mock-chronik-client';
import { sendXecVectors } from '../fixtures/vectors';

describe('Improved Cashtab transaction broadcasting functions', () => {
    // Unit test for each vector in fixtures for the sendingXecToSingleAddress case
    const { txs, errors } = sendXecVectors;

    // Successfully built and broadcast txs
    txs.forEach(async tx => {
        const { description, wallet, targetOutputs, feeRate, txid, hex } = tx;
        it(`sendXec: ${description}`, async () => {
            const chronik = new MockChronikClient();
            chronik.setMock('broadcastTx', {
                input: hex,
                output: { txid },
            });
            expect(
                await sendXec(chronik, wallet, targetOutputs, feeRate),
            ).toStrictEqual({ hex, response: { txid } });
        });
    });

    // Error cases
    errors.forEach(async error => {
        const { description, wallet, targetOutputs, feeRate, msg, hex } = error;

        it(`sendXec: ${description}`, async () => {
            const chronik = new MockChronikClient();
            // e.g. ('block', {input: '', output: ''})
            if (typeof hex !== 'undefined') {
                // For error cases that are not thrown until after the tx is successfully built,
                // set a tx broadcast error that can be thrown by the broadcasting eCash node
                chronik.setMock('broadcastTx', {
                    input: hex,
                    output: new Error(msg),
                });
            }

            await expect(
                sendXec(chronik, wallet, targetOutputs, feeRate),
            ).rejects.toThrow(msg);
        });
    });
});
