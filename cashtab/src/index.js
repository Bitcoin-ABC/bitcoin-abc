// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from 'components/App/App';
import { WalletProvider } from 'wallet/context';
import { HashRouter as Router } from 'react-router-dom';
import GA from 'components/Common/GoogleAnalytics';
import { ChronikClientNode } from 'chronik-client';
import { chronik as chronikConfig } from 'config/chronik';
const chronik = new ChronikClientNode(chronikConfig.urls);

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
    <WalletProvider chronik={chronik}>
        <Router>
            {GA.init() && <GA.RouteTracker />}
            <App />
        </Router>
    </WalletProvider>,
);

if (module.hot) {
    module.hot.accept();
}
