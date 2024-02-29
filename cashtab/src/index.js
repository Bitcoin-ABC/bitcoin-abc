import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './components/App';
import { WalletProvider } from 'wallet/context';
import { HashRouter as Router } from 'react-router-dom';
import GA from './utils/GoogleAnalytics';
import { ChronikClient } from 'chronik-client';
import { chronik as chronikConfig } from 'config/chronik';
const chronik = new ChronikClient(chronikConfig.urls);

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
