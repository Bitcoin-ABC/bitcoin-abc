// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { sendXecToOneAddress } from 'transactions';
import { MockChronikClient } from '../../../../apps/mock-chronik-client';
import { sendingXecToSingleAddress } from '../fixtures/vectors';

describe('Improved Cashtab transaction broadcasting functions', () => {
    // Unit test for each vector in fixtures for the sendingXecToSingleAddress case
    const { txs, errors } = sendingXecToSingleAddress;

    // Successfully built and broadcast txs
    txs.forEach(async tx => {
        const {
            description,
            wallet,
            feeRate,
            satsToSend,
            destinationAddress,
            txid,
            hex,
        } = tx;
        it(`sendXecToOneAddress: ${description}`, async () => {
            const chronik = new MockChronikClient();
            chronik.setMock('broadcastTx', {
                input: hex,
                output: { txid },
            });
            expect(
                await sendXecToOneAddress(
                    chronik,
                    wallet,
                    feeRate,
                    satsToSend,
                    destinationAddress,
                ),
            ).toStrictEqual({ hex, response: { txid } });
        });
    });

    // Error cases
    errors.forEach(async error => {
        const {
            description,
            wallet,
            satsToSend,
            feeRate,
            destinationAddress,
            msg,
            hex,
        } = error;

        it(`sendXecToOneAddress throws on: ${description}`, async () => {
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
                sendXecToOneAddress(
                    chronik,
                    wallet,
                    feeRate,
                    satsToSend,
                    destinationAddress,
                ),
            ).rejects.toThrow(msg);
        });
    });
});
