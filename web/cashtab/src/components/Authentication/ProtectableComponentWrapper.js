import React, { useContext } from 'react';
import { AuthenticationContext } from 'utils/context';
import PropTypes from 'prop-types';
import SignIn from './SignIn';

const ProtectableComponentWrapper = ({ children }) => {
    const authentication = useContext(AuthenticationContext);
    if (authentication) {
        const { loading, isAuthenticationRequired, isSignedIn } =
            authentication;

        if (loading) {
            return <p>Loading authentication data...</p>;
        }

        // prompt user to sign in
        if (isAuthenticationRequired && !isSignedIn) {
            return <SignIn />;
        }
    }

    // authentication = null  => authentication is not supported
    return <>{children}</>;
};

ProtectableComponentWrapper.propTypes = {
    children: PropTypes.node,
};

export default ProtectableComponentWrapper;
