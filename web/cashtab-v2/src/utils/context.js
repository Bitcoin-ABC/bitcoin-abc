import React from 'react';
import PropTypes from 'prop-types';
import useWallet from '../hooks/useWallet';
import useWebAuthentication from '../hooks/useWebAuthentication';

export const WalletContext = React.createContext();

export const WalletProvider = ({ children }) => {
    const wallet = useWallet();
    return (
        <WalletContext.Provider value={wallet}>
            {children}
        </WalletContext.Provider>
    );
};

// Authentication Context

export const AuthenticationContext = React.createContext();
export const AuthenticationProvider = ({ children }) => {
    // useWebAuthentication returns null if Web Authn is not supported
    const authentication = useWebAuthentication();
    return (
        <AuthenticationContext.Provider value={authentication}>
            {children}
        </AuthenticationContext.Provider>
    );
};

WalletProvider.propTypes = {
    children: PropTypes.objectOf(PropTypes.node),
};

AuthenticationProvider.propTypes = {
    children: PropTypes.objectOf(PropTypes.node),
};
