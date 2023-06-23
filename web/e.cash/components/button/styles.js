// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';
import Link from 'next/link';
import { stealth } from '/styles/theme';

export const ButtonCtn = styled.div`
    ${props =>
        props.glow &&
        `filter: drop-shadow(0px 0px 10px ${
            props.color === 'accent'
                ? props.theme.colors.accent + '90'
                : props.color === 'white'
                ? props.theme.colors.contrast + '90'
                : props.theme.colors.primaryLight + '90'
        });`}
`;

export const ButtonMain = styled(Link)`
    display: inline-flex;
    padding: 2px;
    align-items: center;
    transition: all 300ms ease-in-out;
    color: ${props =>
        props.color === 'accent'
            ? props.theme.colors.accent
            : props.color === 'white'
            ? props.theme.colors.contrast
            : props.theme.colors.primaryLight};
    font-size: 15px;
    line-height: 1.5;
    font-weight: 400;
    letter-spacing: 1px;
    background-color: ${props =>
        props.color === 'accent'
            ? props.theme.colors.accent
            : props.color === 'white'
            ? props.theme.colors.contrast
            : props.theme.colors.primaryLight};
    ${props =>
        props.theme === stealth
            ? 'background-color: #fff !important; color: #fff !important; '
            : null};
    :hover {
        color: ${props =>
            props.color === 'accent'
                ? props.theme.colors.accent
                : props.color === 'white'
                ? props.theme.colors.contrast
                : props.theme.colors.primaryLight};
    }
`;

export const ButtonInner = styled.div`
    background-color: ${props => props.theme.colors.darkBlue};
    padding: 16px 40px;
    font-size: 15px;
    line-height: 1.5;
    font-weight: 500;
    letter-spacing: 1px;
    transition: all ease-in-out 150ms;

    &:hover {
        box-shadow: inset 0 0 13px 2px
            ${props =>
                props.color === 'accent'
                    ? props.theme.colors.accent + '90'
                    : props.color === 'white'
                    ? props.theme.colors.contrast + '90'
                    : props.theme.colors.primaryLight + '90'};
        animation: hoverbutton 150ms ease-in-out 1;
    }

    @keyframes hoverbutton {
        0% {
            background-color: ${props =>
                props.color === 'accent'
                    ? props.theme.colors.accent
                    : props.color === 'white'
                    ? props.theme.colors.contrast
                    : props.theme.colors.primaryLight} !important;
        }
        100% {
            background-color: unset;
        }
    }
    ${props => props.theme.breakpoint.medium} {
        .buttoninner {
            padding: 14px 30px;
            font-size: 14px;
        }
    }
`;
