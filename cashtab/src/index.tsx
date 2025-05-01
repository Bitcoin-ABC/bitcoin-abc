// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from 'components/App/App';
import { WalletProvider } from 'wallet/context';
import { HashRouter as Router } from 'react-router-dom';
import GA from 'components/Common/GoogleAnalytics';
import { ChronikClient, ConnectionStrategy } from 'chronik-client';
import { chronik as chronikConfig } from 'config/chronik';
import { Ecc } from 'ecash-lib';
import { Agora } from 'ecash-agora';

// Initialize Ecc (used for signing txs) at app startup
const ecc = new Ecc();

ChronikClient.useStrategy(ConnectionStrategy.ClosestFirst, chronikConfig.urls)
    .then(chronik => {
        // Initialize new Agora chronik wrapper after chronik is ready
        const agora = new Agora(chronik);

        const container = document.getElementById('root');
        if (container) {
            const root = createRoot(container);
            root.render(
                <WalletProvider chronik={chronik} agora={agora} ecc={ecc}>
                    <Router>
                        {GA.init() && <GA.RouteTracker />}
                        <App />
                    </Router>
                </WalletProvider>,
            );
        } else {
            console.error('Failed to find the root element');
        }
    })
    .catch(err => {
        console.error('Failed to initialize chronik client', err);
    });

if (module.hot) {
    module.hot.accept();
}
