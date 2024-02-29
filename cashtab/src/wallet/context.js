import React from 'react';
import PropTypes from 'prop-types';
import useWallet from 'hooks/useWallet';

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
