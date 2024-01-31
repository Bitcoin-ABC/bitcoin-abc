import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './components/App';
import { WalletProvider } from './utils/context';
import { HashRouter as Router } from 'react-router-dom';
import GA from './utils/GoogleAnalytics';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
    <WalletProvider>
        <Router>
            {GA.init() && <GA.RouteTracker />}
            <App />
        </Router>
    </WalletProvider>,
);

if (module.hot) {
    module.hot.accept();
}
