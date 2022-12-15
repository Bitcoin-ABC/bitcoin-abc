import React from 'react';
import PropTypes from 'prop-types';
import useWallet from '../hooks/useWallet';

export const WalletContext = React.createContext();

export const WalletProvider = ({ children }) => {
    const wallet = useWallet();
    return (
        <WalletContext.Provider value={wallet}>
            {children}
        </WalletContext.Provider>
    );
};

WalletProvider.propTypes = {
    children: PropTypes.node,
};
