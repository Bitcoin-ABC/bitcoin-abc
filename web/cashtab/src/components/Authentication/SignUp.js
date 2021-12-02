import React, { useContext } from 'react';
import { Modal } from 'antd';
import styled from 'styled-components';
import { AuthenticationContext } from '@utils/context';
import { ThemedLockOutlined } from '@components/Common/CustomIcons';
import PrimaryButton, {
    SecondaryButton,
} from '@components/Common/PrimaryButton';

const StyledSignUp = styled.div`
    h2 {
        color: ${props => props.theme.wallet.text.primary};
        font-size: 25px;
    }
    p {
        color: ${props => props.theme.wallet.text.secondary};
    }
`;

const SignUp = () => {
    const authentication = useContext(AuthenticationContext);

    const handleSignUp = async () => {
        try {
            await authentication.signUp();
        } catch (err) {
            Modal.error({
                title: 'Registration Error',
                content: 'Cannot create Credential on your device',
                centered: true,
            });
        }
    };

    let signUpBody;
    if (authentication) {
        signUpBody = (
            <div>
                <p>Enable wallet lock to protect your funds.</p>
                <p>
                    You will need to unlock with your{' '}
                    <strong>fingerprint / device pin</strong> in order to access
                    the wallet.
                </p>
                <p>
                    This lock can also be enabled / disabled under
                    <br />
                    <strong>Settings / General Settings / App Lock</strong>
                </p>
                <PrimaryButton onClick={handleSignUp}>
                    Enable Lock
                </PrimaryButton>
                <SecondaryButton
                    onClick={() => authentication.turnOffAuthentication()}
                >
                    Skip
                </SecondaryButton>
            </div>
        );
    } else {
        signUpBody = <p>Authentication is not supported</p>;
    }

    return (
        <StyledSignUp>
            <h2>
                <ThemedLockOutlined /> Wallet Lock
            </h2>
            {signUpBody}
        </StyledSignUp>
    );
};

export default SignUp;
