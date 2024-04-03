// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import PropTypes from 'prop-types';
import useWallet from 'wallet/useWallet';

export const WalletContext = React.createContext();

export const WalletProvider = ({ chronik, children }) => {
    const wallet = useWallet(chronik);
    return (
        <WalletContext.Provider value={wallet}>
            {children}
        </WalletContext.Provider>
    );
};

WalletProvider.propTypes = {
    chronik: PropTypes.object,
    children: PropTypes.node,
};
