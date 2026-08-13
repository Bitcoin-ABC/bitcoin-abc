// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { ChronikClient, Tx } from 'chronik-client';
import { RedeemProgressToast } from 'components/Etokens/RedeemToast';
import { clearAllPendingRedeems } from 'components/Etokens/pendingRedeems';

describe('<RedeemProgressToast />', () => {
    afterEach(() => {
        clearAllPendingRedeems();
    });

    it('Shows Redeeming then Redeemed when the offer is taken', async () => {
        const offerTxid = 'aa'.repeat(32);
        const redeemTxid = 'bb'.repeat(32);
        const chronik = {
            tx: async () => {
                return {
                    outputs: [
                        {
                            token: { tokenId: 'cc'.repeat(32) },
                            spentBy: { txid: redeemTxid, outIdx: 0 },
                        },
                    ],
                } as Tx;
            },
        } as unknown as ChronikClient;

        render(
            <ThemeProvider theme={theme}>
                <RedeemProgressToast
                    amountLabel="10,000.00"
                    ticker="XECX"
                    chronik={chronik}
                    offerTxid={offerTxid}
                    toastId="redeem-test"
                />
            </ThemeProvider>,
        );

        expect(
            screen.getByText('Redeeming 10,000.00 XECX'),
        ).toBeInTheDocument();
        expect(screen.getByTitle('Redeeming')).toBeInTheDocument();

        expect(await screen.findByText('Redeemed')).toBeInTheDocument();
        expect(screen.getByTitle('Redeemed')).toBeInTheDocument();
        expect(
            screen.queryByText('Redeeming 10,000.00 XECX'),
        ).not.toBeInTheDocument();
    });
});
