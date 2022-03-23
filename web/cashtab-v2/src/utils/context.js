import React from 'react';
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

// Authentication Context
import useWebAuthentication from '../hooks/useWebAuthentication';
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
