// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useEffect } from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { MemoryRouter, useNavigate } from 'react-router';
import { WalletProvider } from 'wallet/context';
import App from 'components/App/App';
import PropTypes from 'prop-types';

/** Lets a test change the route without remounting Send. */
const ExposeTestNavigate = ({ navigateRef }) => {
    const navigate = useNavigate();
    useEffect(() => {
        navigateRef.current = navigate;
        return () => {
            navigateRef.current = null;
        };
    }, [navigate, navigateRef]);
    return null;
};

ExposeTestNavigate.propTypes = {
    navigateRef: PropTypes.shape({
        current: PropTypes.func,
    }).isRequired,
};

// Default ecc to an empty object
// It is only needed in tests that use it from context
const CashtabTestWrapper = ({
    chronik,
    agora = {},
    ecc = {},
    route = '/wallet',
    navigateRef = null,
}) => (
    <WalletProvider chronik={chronik} agora={agora} ecc={ecc}>
        <MemoryRouter initialEntries={[route]}>
            {navigateRef && <ExposeTestNavigate navigateRef={navigateRef} />}
            <ThemeProvider theme={theme}>
                <App />
            </ThemeProvider>
        </MemoryRouter>
    </WalletProvider>
);

CashtabTestWrapper.propTypes = {
    chronik: PropTypes.object,
    agora: PropTypes.object,
    ecc: PropTypes.object,
    route: PropTypes.string,
    navigateRef: PropTypes.shape({
        current: PropTypes.func,
    }),
};

export default CashtabTestWrapper;
