// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { MemoryRouter } from 'react-router-dom';
import { WalletProvider } from 'wallet/context';
import App from 'components/App/App';
import PropTypes from 'prop-types';

// Default ecc to an empty object
// It is only needed in tests that use it from context
const CashtabTestWrapper = ({
    chronik,
    agora = {},
    ecc = {},
    route = '/wallet',
}) => (
    <WalletProvider chronik={chronik} agora={agora} ecc={ecc}>
        <MemoryRouter initialEntries={[route]}>
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
};

export default CashtabTestWrapper;
