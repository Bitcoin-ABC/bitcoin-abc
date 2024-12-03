// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from 'components/App/App';
import { WalletProvider } from 'wallet/context';
import { HashRouter as Router } from 'react-router-dom';
import GA from 'components/Common/GoogleAnalytics';
import { ChronikClient } from 'chronik-client';
import { chronik as chronikConfig } from 'config/chronik';
import { Ecc, initWasm } from 'ecash-lib';
import { Agora } from 'ecash-agora';

const AppWrapper: React.FC = () => {
    useEffect(() => {
        const initializeApp = async () => {
            await initWasm();
        };

        initializeApp().catch(console.error);
    }, []);

    return (
        <WalletProvider
            chronik={new ChronikClient(chronikConfig.urls)}
            agora={new Agora(new ChronikClient(chronikConfig.urls))}
            ecc={new Ecc()}
        >
            <Router>
                {GA.init() && ((<GA.RouteTracker />) as React.ReactNode)}
                <App />
            </Router>
        </WalletProvider>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<AppWrapper />);
} else {
    console.error('Root container not found');
}

if (module.hot) {
    module.hot.accept();
}
