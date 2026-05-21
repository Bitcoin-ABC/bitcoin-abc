// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

import { HashRouter as Router } from 'react-router';
import { ChronikClient, ConnectionStrategy } from 'chronik-client';
import { chronik as chronikConfig } from 'config/chronik';
import { Agora } from 'ecash-agora';
import { Ecc } from 'ecash-lib';

import Cashtab from 'assets/cashtab_xec.png';
import { WalletProvider } from 'wallet/context';
import GA from 'components/Common/GoogleAnalytics';
import App from 'components/App/App';
import { SplashScreen, SplashLogo } from './styled';
import { ExtensionFrame } from 'components/App/styles';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { isRecaptchaV3Configured } from 'constants/recaptcha';

interface LoadingWrapperProps {
    ecc: Ecc;
}

const LoadingWrapper: React.FC<LoadingWrapperProps> = ({ ecc }) => {
    const [chronik, setChronik] = useState<null | ChronikClient>(null);
    const [agora, setAgora] = useState<null | Agora>(null);
    const [error, setError] = useState<null | string>(null);
    const [gaEnabled, setGaEnabled] = useState(false);

    // Set platform for CSS (skip body safe-area on native - MainActivity handles insets)
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            document.body.setAttribute(
                'data-platform',
                Capacitor.getPlatform(),
            );
        }
    }, []);

    useEffect(() => {
        // Initialize Google Analytics
        GA.init().then(enabled => {
            setGaEnabled(enabled);
        });

        // Detect if we're in transaction mode (URL has parameters)
        const hasUrlParameters = window.location.hash.includes('?');
        const strategy = hasUrlParameters
            ? ConnectionStrategy.AsOrdered
            : ConnectionStrategy.ClosestFirst;

        ChronikClient.useStrategy(strategy, chronikConfig.urls)
            .then(client => {
                setChronik(client);
                setAgora(new Agora(client));
            })
            .catch(err => {
                console.error('Failed to initialize chronik client', err);
                setError(`${err}`);
            });
    }, []);

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <h2>Error</h2>
                <p>Cashtab failed to load:</p>
                <p>{error}</p>
            </div>
        );
    }

    const recaptchaV3SiteKey = isRecaptchaV3Configured()
        ? import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY
        : undefined;

    const app = (
        <WalletProvider chronik={chronik!} agora={agora!} ecc={ecc}>
            <Router>
                {gaEnabled && <GA.RouteTracker />}
                <App />
            </Router>
        </WalletProvider>
    );

    return (
        <>
            {chronik === null || agora === null ? (
                <SplashScreen>
                    {import.meta.env.VITE_BUILD_ENV === 'extension' && (
                        <ExtensionFrame />
                    )}
                    <SplashLogo src={Cashtab} alt="cashtab" />
                </SplashScreen>
            ) : recaptchaV3SiteKey ? (
                <GoogleReCaptchaProvider reCaptchaKey={recaptchaV3SiteKey}>
                    {app}
                </GoogleReCaptchaProvider>
            ) : (
                app
            )}
        </>
    );
};

export default LoadingWrapper;
