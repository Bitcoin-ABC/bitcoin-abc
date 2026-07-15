// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from 'styled-components';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { theme } from 'assets/styles/theme';
import Tx from 'components/Home/Tx';
import CashtabState from 'config/CashtabState';
import { parseTx } from 'chronik';
import {
    alpDexSettleTx,
    alpSwapTokenCacheEntries,
    BUYER_HASH,
    SELLER_HASH,
    MAKER_FEE_HASH,
    PLATFORM_FEE_HASH,
} from '../fixtures/alpSwapSettle';

const renderAlpSwapTx = (walletHash: string) => {
    const parsed = parseTx(alpDexSettleTx as Parameters<typeof parseTx>[0], [
        walletHash,
    ]);
    return render(
        <MemoryRouter>
            <ThemeProvider theme={theme}>
                <Tx
                    tx={{
                        ...alpDexSettleTx,
                        parsed,
                    }}
                    hashes={[walletHash]}
                    fiatPrice={0.00003}
                    fiatCurrency="usd"
                    cashtabState={{
                        ...new CashtabState(),
                        cashtabCache: {
                            tokens: new Map(alpSwapTokenCacheEntries),
                        },
                    }}
                />
            </ThemeProvider>
        </MemoryRouter>,
    );
};

describe('<Tx /> AlpSwap settle rendering', () => {
    it('Buyer: Swapped from → to · Fee (no per-token SEND rows)', () => {
        renderAlpSwapTx(BUYER_HASH);

        expect(screen.getByTitle('swap')).toBeInTheDocument();
        expect(
            screen.getByText(
                'Swapped 1.0000 BUTTER → .98 Guns · Fee 0.0109 BUTTER',
            ),
        ).toBeInTheDocument();
        expect(screen.getByText('AlpSwap')).toBeInTheDocument();
        expect(screen.queryByText(/^Sent [\d.]/)).not.toBeInTheDocument();
        expect(screen.queryByText(/^Received [\d.]/)).not.toBeInTheDocument();
    });

    it('Seller (alp-dex LP sales): Sold to-token for from-token price', () => {
        renderAlpSwapTx(SELLER_HASH);

        expect(screen.getByTitle('swap')).toBeInTheDocument();
        expect(
            screen.getByText('Sold .98 Guns for .9891 BUTTER'),
        ).toBeInTheDocument();
        expect(screen.queryByText(/^Sent [\d.]/)).not.toBeInTheDocument();
        expect(screen.queryByText(/^Received [\d.]/)).not.toBeInTheDocument();
    });

    it('Alp-dex fee recipient: Received alp-dex fee only', () => {
        renderAlpSwapTx(MAKER_FEE_HASH);

        expect(
            screen.getByText('Received alp-dex fee 0.0099 BUTTER'),
        ).toBeInTheDocument();
        expect(screen.getByText('Alp-dex fee')).toBeInTheDocument();
        expect(screen.queryByText(/Guns/)).not.toBeInTheDocument();
        expect(screen.queryByText(/^Sent [\d.]/)).not.toBeInTheDocument();
    });

    it('Platform fee recipient: Received platform fee only (no Guns row)', () => {
        renderAlpSwapTx(PLATFORM_FEE_HASH);

        expect(
            screen.getByText('Received platform fee 0.0010 BUTTER'),
        ).toBeInTheDocument();
        expect(screen.getByText('Platform fee')).toBeInTheDocument();
        expect(screen.queryByText(/Guns/)).not.toBeInTheDocument();
        expect(screen.queryByText(/^Received 0/)).not.toBeInTheDocument();
        expect(screen.queryByText(/^Sent [\d.]/)).not.toBeInTheDocument();
    });
});
