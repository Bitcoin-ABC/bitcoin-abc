import * as React from 'react';
import styled, { css, keyframes } from 'styled-components';

import type { ButtonStates } from '../../hoc/CashtabBase';
import colors from '../../styles/colors';

import CheckSVG from '../../images/CheckSVG';
import LoadSVG from '../../images/LoadSVG';

import Ticker from '../../atoms/Ticker/';

const A = styled.a`
    color: inherit;
    text-decoration: none;
`;

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

const CompleteCover = styled.div`
    ${cover};
    border-color: ${colors.success700};
    background-color: ${colors.success500};
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

type Props = {
    step: ButtonStates;
    children: React.ReactNode;
    onClick?: Function;
};

class Button extends React.PureComponent<Props> {
    render() {
        const { children, step } = this.props;

        const isFresh = step === 'fresh';
        const isPending = step === 'pending';
        const isComplete = step === 'complete';
        const isInstall = step === 'install';

        return (
            <ButtonElement<any>
                disabled={!isFresh}
                isFresh={isFresh}
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
                {isComplete && (
                    <CompleteCover>
                        <CheckSVG />
                    </CompleteCover>
                )}

                {isInstall && (
                    <WarningCover>
                        <A href={Ticker.installLink} target="_blank">
                            Install CashTab & refresh
                        </A>
                    </WarningCover>
                )}
            </ButtonElement>
        );
    }
}

export default Button;
