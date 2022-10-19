import React from 'react';
import styled, { css } from 'styled-components';

import type { ButtonStates } from '../../hoc/CashtabBase';
import colors from '../../styles/colors';

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

type Props = {
    children: React.ReactNode;
    step: ButtonStates;
};

class GetAddress extends React.PureComponent<Props> {
    handleGetAddress = () => {
        console.log(`handleGetAddress`);
    };
    render() {
        const { children, step } = this.props;

        const isFresh = step === 'fresh';

        return (
            <GetAddressWrapper>
                <ButtonElement<any>
                    isFresh={isFresh}
                    onClick={this.handleGetAddress}
                    {...this.props}
                >
                    {children}
                </ButtonElement>
            </GetAddressWrapper>
        );
    }
}

export default GetAddress;
