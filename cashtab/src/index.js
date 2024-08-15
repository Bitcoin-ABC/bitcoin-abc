// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from 'components/App/App';
import { WalletProvider } from 'wallet/context';
import { HashRouter as Router } from 'react-router-dom';
import GA from 'components/Common/GoogleAnalytics';
import { ChronikClient } from 'chronik-client';
import { chronik as chronikConfig } from 'config/chronik';
import { Ecc, initWasm } from 'ecash-lib';

// Initialize wasm (activate ecash-lib) at app startup
initWasm()
    .then(() => {
        // Initialize Ecc (used for signing txs) at app startup
        const ecc = new Ecc();
        // Initialize chronik-client at app startup
        const chronik = new ChronikClient(chronikConfig.urls);

        const container = document.getElementById('root');
        const root = createRoot(container);
        root.render(
            <WalletProvider chronik={chronik} ecc={ecc}>
                <Router>
                    {GA.init() && <GA.RouteTracker />}
                    <App />
                </Router>
            </WalletProvider>,
        );
    })
    .catch(console.error);

if (module.hot) {
    module.hot.accept();
}
