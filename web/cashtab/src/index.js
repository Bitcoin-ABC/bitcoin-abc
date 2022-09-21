import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './components/App';
import { AuthenticationProvider, WalletProvider } from './utils/context';
import { HashRouter as Router } from 'react-router-dom';
import GA from './utils/GoogleAnalytics';
import 'antd/dist/antd.min.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

ReactDOM.render(
    <AuthenticationProvider>
        <WalletProvider>
            <Router>
                {GA.init() && <GA.RouteTracker />}
                <App />
            </Router>
        </WalletProvider>
    </AuthenticationProvider>,
    document.getElementById('root'),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();

if (module.hot) {
    module.hot.accept();
}
