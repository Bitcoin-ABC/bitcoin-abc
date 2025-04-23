// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as React from 'react';
import styled, { keyframes } from 'styled-components';

// Ref https://stackoverflow.com/questions/41078478/css-animated-checkmark
const stroke = keyframes`
  100% {
    stroke-dashoffset: 0;
  }
`;
const scale = keyframes`
  0%, 100% {
    transform: none;
  }
  50% {
    transform: scale3d(1.1, 1.1, 1);
  }`;

const fill = keyframes`
  100% {
    box-shadow: inset 0px 0px 0px 30px #838d91;
  }
`;

const Wrapper = styled.div`
    svg {
        width: 14px !important;
        height: 14px !important;
    }
    path {
        fill: none;
    }
`;

// Note that we do not use the title prop
// styled-components gives us a lint error for specifying it below if it is
// not specified here
// It is a prop of the component, we just happen to not have conditional style rules
// based on this prop
const Finalized = styled.svg<{ displayed: boolean; title: string }>`
    display: ${props => (props.displayed ? 'inherit' : 'none')};
    border-radius: 50%;
    stroke-width: 2;
    stroke: #fff;
    stroke-miterlimit: 10;
    box-shadow: inset 0px 0px 0px ${props => props.theme.secondaryText};
    animation: ${fill} 0.4s ease-in-out 0.4s forwards,
        ${scale} 0.3s ease-in-out 0.9s both;
`;

const Circle = styled.circle`
    stroke-dasharray: 166;
    stroke-dashoffset: 166;
    stroke-width: 2;
    stroke-miterlimit: 10;
    stroke: ${props => props.theme.secondaryText};
    fill: none;
    animation: ${stroke} 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
`;

const Check = styled.path`
    transform-origin: 50% 50%;
    transform: scale(1.3);
    stroke-dasharray: 48;
    stroke-dashoffset: 48;
    animation: ${stroke} 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
    stroke-width: 6;
    stroke: ${props => props.theme.primaryBackground};
`;

interface AvalancheFinalizedProps {
    displayed: boolean;
}
export const AvalancheFinalized: React.FC<AvalancheFinalizedProps> = ({
    displayed = true,
}) => {
    return (
        <Wrapper>
            <Finalized
                title="Finalized by Avalanche"
                displayed={displayed}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 52 52"
            >
                <Circle cx="26" cy="26" r="25" fill="none" />
                <Check fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </Finalized>
        </Wrapper>
    );
};

export default AvalancheFinalized;
