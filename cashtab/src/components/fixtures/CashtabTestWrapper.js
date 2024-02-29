// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { MemoryRouter } from 'react-router-dom';
import { WalletProvider } from 'wallet/context';
import App from 'components/App';
import PropTypes from 'prop-types';

const CashtabTestWrapper = ({ chronik, route = '/wallet' }) => (
    <WalletProvider chronik={chronik}>
        <MemoryRouter initialEntries={[route]}>
            <ThemeProvider theme={theme}>
                <App />
            </ThemeProvider>
        </MemoryRouter>
    </WalletProvider>
);

CashtabTestWrapper.propTypes = {
    chronik: PropTypes.object,
    route: PropTypes.string,
};

export default CashtabTestWrapper;
