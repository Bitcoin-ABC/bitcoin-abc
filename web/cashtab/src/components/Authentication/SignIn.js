import React, { useContext, useEffect, useState } from 'react';
import { Modal, Spin } from 'antd';
import styled from 'styled-components';
import { AuthenticationContext } from '@utils/context';
import { ThemedLockOutlined } from '@components/Common/CustomIcons';
import PrimaryButton from '@components/Common/PrimaryButton';
import { ReactComponent as FingerprintSVG } from '@assets/fingerprint-solid.svg';

const StyledSignIn = styled.div`
    h2 {
        color: ${props => props.theme.wallet.text.primary};
        font-size: 25px;
    }
    p {
        color: ${props => props.theme.wallet.text.secondary};
    }
`;

const UnlockButton = styled(PrimaryButton)`
    position: relative;
    width: auto;
    margin: 30px auto;
    padding: 20px 30px;

    svg {
        fill: ${props => props.theme.buttons.primary.color};
    }

    @media (max-width: 768px) {
        font-size: 16px;
        padding: 15px 20px;
    }

    :disabled {
        cursor: not-allowed;
        box-shadow: none;
        ::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${props => props.theme.buttons.primary.disabledOverlay};
            z-index: 10;
        }
    }
`;

const StyledFingerprintIcon = styled.div`
    width: 48px;
    height: 48px;
    margin: auto;
`;

const SignIn = () => {
    const authentication = useContext(AuthenticationContext);
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleDocVisibilityChange = () => {
        document.visibilityState === 'visible'
            ? setIsVisible(true)
            : setIsVisible(false);
    };

    const handleSignIn = async () => {
        try {
            setIsLoading(true);
            await authentication.signIn();
        } catch (err) {
            Modal.error({
                title: 'Authentication Error',
                content: 'Cannot get Credential from your device',
                centered: true,
            });
        }
        setIsLoading(false);
    };

    const handleSignInAndSuppressError = async () => {
        try {
            setIsLoading(true);
            await authentication.signIn();
        } catch (err) {
            // fail silently
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (document.visibilityState === 'visible') {
            setIsVisible(true);
        }
        document.addEventListener(
            'visibilitychange',
            handleDocVisibilityChange,
        );

        return () => {
            document.removeEventListener(
                'visibilitychange',
                handleDocVisibilityChange,
            );
        };
    }, []);

    useEffect(() => {
        // This will trigger the plaform authenticator as soon as the component becomes visible
        // (when switch back to this app), without any user gesture (such as clicking a button)
        // In platforms that require user gesture in order to invoke the platform authenticator,
        // this will fail. We want it to fail silently, and then show user a button to activate
        // the platform authenticator
        if (isVisible && authentication) {
            handleSignInAndSuppressError();
        }
    }, [isVisible]);

    let signInBody;
    if (authentication) {
        signInBody = (
            <>
                <p>
                    This wallet can be unlocked with your{' '}
                    <strong>fingerprint / device pin</strong>
                </p>
                <UnlockButton
                    onClick={handleSignIn}
                    disabled={isLoading ? true : false}
                >
                    <StyledFingerprintIcon>
                        <FingerprintSVG />
                    </StyledFingerprintIcon>
                    Unlock
                </UnlockButton>
                <div>
                    {isLoading ? <Spin tip="loading authenticator" /> : ''}
                </div>
            </>
        );
    } else {
        signInBody = <p>Authentication is not supported</p>;
    }

    return (
        <StyledSignIn>
            <h2>
                <ThemedLockOutlined /> Wallet Unlock
            </h2>
            {signInBody}
        </StyledSignIn>
    );
};

export default SignIn;
