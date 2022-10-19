import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { getCashtabProviderStatus } from '../../utils/cashtab-helpers';
import type { ButtonStates } from '../../hoc/CashtabBase';
import colors from '../../styles/colors';
import Ticker from '../../atoms/Ticker';
import LoadSVG from '../../images/LoadSVG';

const GetAddressWrapper = styled.div``;

const ButtonElement = styled('button')<{ isFresh?: boolean }>`
    border: none;
    border-radius: 4px;
    padding: 12px 20px;
    outline: none;
    position: relative;
    color: ${colors.bg100};
    background-color: transparent;
    min-width: 150px;

    ${props =>
        props.isFresh &&
        css`
            cursor: pointer;

            background-color: ${colors.brand500};
            border: 1px solid ${colors.brand700};

            box-shadow: 1px 1px 1px ${colors.fg500};

            transform: translateY(0px);
            &:active {
                background-color: ${colors.brand700};
                color: ${colors.bg100};
                box-shadow: 0px 0px 0px ${colors.fg500};
                transform: translateY(2px);
            }
        `}
`;

const A = styled.a`
    color: inherit;
    text-decoration: none;
`;

const cover = css`
    position: absolute;
    border: 1px solid ${colors.brand700};
    border-radius: 4px;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    font-size: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const PendingCover = styled.div`
    ${cover};
    border-color: ${colors.pending700};
    background-color: ${colors.pending500};
`;

const spinAnimation = keyframes`
    from {transform:rotate(0deg);}
    to {transform:rotate(360deg);}
}
`;

const PendingSpinner = styled.div`
    animation: ${spinAnimation} 3s linear infinite;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const WarningCover = styled.div`
    ${cover};
    font-size: 16px;
    border-color: ${colors.brand700};
    background-color: ${colors.brand500};
    cursor: pointer;

    box-shadow: 1px 1px 1px ${colors.fg500};

    transform: translateY(0px);
    &:active {
        background-color: ${colors.brand700};
        color: ${colors.bg100};
        box-shadow: 0px 0px 0px ${colors.fg500};
        transform: translateY(2px);
    }
`;

type Props = {
    children: React.ReactNode;
};
interface AddrState {
    step: ButtonStates;
}

class GetAddress extends React.PureComponent<Props, AddrState> {
    state = {
        step: 'pending' as ButtonStates,
    };

    confirmCashtabProviderStatus = () => {
        const cashTabStatus = getCashtabProviderStatus();
        if (!cashTabStatus) {
            this.setState({ step: 'install' });
        } else {
            this.setState({ step: 'fresh' });
        }
    };

    // Listen for address from messages on load
    componentDidMount() {
        // Check to see if Cashtab is installed
        // Sometimes this will be false immediately at componentDidMount, check at tested interval
        setTimeout(this.confirmCashtabProviderStatus, 750);
    }
    handleGetAddress = () => {
        console.log(`handleGetAddress`);
        return window.postMessage(
            {
                type: 'FROM_PAGE',
                text: 'Cashtab',
                addressRequest: true,
            },
            '*',
        );
    };
    render() {
        const { children } = this.props;
        const { step } = this.state;

        const isPending = step === 'pending';
        const isFresh = step === 'fresh';
        const isInstall = step === 'install';

        return (
            <GetAddressWrapper>
                <ButtonElement<any>
                    isFresh={isFresh}
                    onClick={this.handleGetAddress}
                    {...this.props}
                >
                    {children}
                    {isPending && (
                        <PendingCover>
                            <PendingSpinner>
                                <LoadSVG />
                            </PendingSpinner>
                        </PendingCover>
                    )}
                    {isInstall && (
                        <WarningCover>
                            <A href={Ticker.installLink} target="_blank">
                                Install Cashtab & refresh
                            </A>
                        </WarningCover>
                    )}
                </ButtonElement>
            </GetAddressWrapper>
        );
    }
}

export default GetAddress;
