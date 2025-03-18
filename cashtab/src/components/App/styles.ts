// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled, { createGlobalStyle, css } from 'styled-components';
import { CashtabScroll } from 'components/Common/Atoms';
import { CashtabTheme } from 'assets/styles/theme';

export const ExtensionFrame = createGlobalStyle`
    html, body {
        min-width: 400px;
        min-height: 600px;
    }
`;

/**
 * GlobalStyle component
 * Modify Toastify variables and styles here
 */
export const GlobalStyle = createGlobalStyle`
    :root {
        --toastify-icon-color-success: ${props => props.theme.genesisGreen};
        --toastify-color-success: ${props => props.theme.genesisGreen};
        --toastify-toast-padding: 20px;
        --toastify-color-progress-dark: ${props => props.theme.accent};

        --text-sm: 0.875rem;
        --text-base: 1rem; /* 16px */
        --text-lg: 1.125rem; 
        --text-xl: 1.25rem; 
        --text-2xl: 1.5rem; 
        --text-3xl: 1.875rem;
        
        --text-sm--line-height: 1.428;
        --text-base--line-height: 1.5;
        --text-lg--line-height: 1.556;
        --text-xl--line-height: 1.4;
        --text-2xl--line-height: 1.333;
        --text-3xl--line-height: 1.2;
        --leading-7: 1.75; 
    }    
    
    .Toastify__toast {
        margin-bottom: 0;
        justify-content: center;
        border: 1px solid ${props => props.theme.accent};
        a {
            text-decoration: none;
        }
    }

    *::placeholder {
        color: ${(props: { theme: CashtabTheme }) =>
            props.theme.secondaryText} !important;
    }

    a {
        color: ${props => props.theme.accent};
        &:hover {
            color: ${props => props.theme.secondaryAccent};
            text-decoration: none;
        }
    }

    p {
        line-height: var(--leading-7);
    }
`;

export const CustomApp = styled.div`
    text-align: center;
    background-color: ${props => props.theme.secondaryBackground};
    background-size: 100px 171px;
    background-image: ${props => props.theme.backgroundImage};
    background-attachment: fixed;
    min-height: 100vh;
    box-sizing: border-box;
    *,
    *:before,
    *:after {
        box-sizing: inherit;
    }
`;
export const WalletBody = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    flex-direction: row-reverse;
    max-height: 100vh;
    max-width: 2000px;
    margin: auto;
    @media (max-width: 768px) {
        max-height: unset;
    }
`;

export const WalletCtn = styled.div<{ showFooter?: boolean }>`
    width: 100%;
    background: ${props => props.theme.primaryBackground};
    position: relative;
    min-height: 100vh;
    max-height: 100vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    ${CashtabScroll}
    @media (max-width: 768px) {
        max-height: unset;
        overflow-y: unset;
        padding: 0 0 100px;
        min-height: ${props =>
            props.showFooter ? 'calc(100vh - 70px)' : '100vh'};
        background: ${props => props.theme.primaryBackground};
    }
`;

export const Footer = styled.div`
    width: 230px;
    background: ${props => props.theme.primaryBackground};
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow-y: auto;
    ${CashtabScroll}
    padding: 0 10px;
    border-right: 1px solid ${props => props.theme.border};
    @media (max-width: 768px) {
        width: 100%;
        z-index: 100;
        height: 70px;
        border-top: 1px solid ${props => props.theme.border};
        align-items: center;
        justify-content: space-between;
        padding: 0;
        position: fixed;
        flex-direction: row;
        bottom: 0;
        overflow: visible;
        box-shadow: 0px 0px 24px 1px ${props => props.theme.menuGlow};
        border-right: none;
    }
`;

export const NavWrapper = styled.div`
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    padding-bottom: 30px;
    @media (max-width: 768px) {
        width: 100%;
        height: 100%;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        padding-bottom: 0;
    }
`;

export const NavIcon = styled.span<{ clicked?: boolean }>`
    display: none;
    @media (max-width: 768px) {
        @media (hover: hover) {
            ${NavWrapper}:hover & {
                background-color: ${props =>
                    props.clicked
                        ? 'transparent'
                        : props.theme.secondaryAccent};
                ::before,
                ::after {
                    background-color: ${props => props.theme.secondaryAccent};
                }
            }
        }

        position: relative;
        background-color: ${props =>
            props.clicked ? 'transparent' : props.theme.secondaryText};
        width: 40px;
        height: 3px;
        border-radius: 10px;
        display: inline-block;
        transition: all 200ms ease-in-out;
        &::before,
        &::after {
            content: '';
            background-color: ${props => props.theme.secondaryText};
            width: 40px;
            height: 3px;
            border-radius: 10px;
            display: inline-block;
            position: absolute;
            left: 0;
            transition: all 200ms ease-in-out;
        }
        &::before {
            top: ${props => (props.clicked ? '0' : '-0.8rem')};
            transform: ${props =>
                props.clicked ? 'rotate(135deg)' : 'rotate(0)'};
        }
        &::after {
            top: ${props => (props.clicked ? '0' : '0.8rem')};
            transform: ${props =>
                props.clicked ? 'rotate(-135deg)' : 'rotate(0)'};
        }
    }
`;

export const NavMenu = styled.div<{ open?: boolean }>`
    @media (max-width: 768px) {
        position: absolute;
        bottom: 70px;
        right: ${props => (props.open ? '0' : '-300px')};
        display: flex;
        flex-direction: column;
        border: 1px solid ${props => props.theme.border};
        overflow: auto;
        transition: all 250ms ease-in-out;
        max-height: calc(100vh - 70px);
        background-color: ${props => props.theme.primaryBackground};
        border-bottom: none;
        border-right: none;
        ${CashtabScroll}
    }
`;

const NavButtonDesktop = css<{ active?: boolean }>`
    width: 100%;
    cursor: pointer;
    padding: 5px 10px;
    display: flex;
    align-items: center;
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
    border: none;
    background: none;
    margin-bottom: 5px;
    user-select: none;
    flex-direction: row-reverse;
    justify-content: flex-start;
    text-align: left;
    color: ${props => props.theme.secondaryText};
    border-radius: 5px;
    font-weight: normal;
    font-family: 'Poppins';

    span,
    p {
        line-height: 1em;
    }

    :hover {
        color: ${props => props.theme.secondaryAccent};
        svg,
        g,
        path {
            fill: ${props => props.theme.secondaryAccent};
        }
        background: ${props => props.theme.secondaryBackground};
    }

    svg {
        fill: ${props => props.theme.secondaryText};
        width: 24px;
        height: 24px;
        margin-right: 8px;
        @media (max-width: 768px) {
            margin-right: 0;
        }
    }
    g,
    path {
        fill: ${props => props.theme.secondaryText};
    }
    ${({ active, ...props }) =>
        active &&
        `    
        color: ${props.theme.primaryBackground} !important;
        background: ${props.theme.accent} !important;
        svg, g, path {
            fill: ${props.theme.primaryBackground} !important;
        }
        font-weight: 700;
  `}
    @media (max-width: 768px) {
        border-radius: 0px;
    }
`;

export const NavButton = styled.button`
    :focus,
    :active {
        outline: none;
    }
    ${NavButtonDesktop}
    justify-content: flex-end;
    @media (max-width: 768px) {
        height: 100%;
        justify-content: center;
        align-items: center;
        padding: 0;
        margin-bottom: 0;
        span {
            display: none;
        }
    }
`;

export const NavItem = styled.button`
    ${NavButtonDesktop}
    @media (max-width: 768px) {
        flex-direction: row;
        justify-content: space-between;
        font-size: var(--text-xl);
        line-height: var(--text-xl--line-height);
        padding: 10px 20px 10px;
        margin-bottom: 0;
    }
    svg {
        @media (max-width: 768px) {
            margin-left: 8px;
            margin-right: 0;
            width: 28px;
            height: 28px;
        }
    }
    p {
        flex: 2;
        margin: 0;
    }
`;

export const ScreenWrapper = styled.div`
    padding: 20px;
    background: ${props => props.theme.primaryBackground};
    @media (max-width: 768px) {
        padding: 0px;
        max-height: unset;
    }
`;

export const HeaderCtn = styled.div`
    display: none;
    @media (max-width: 768px) {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: 10px 0;
        gap: 6px;
        background: ${props => props.theme.primaryBackground};
        border-bottom: 1px solid ${props => props.theme.border};
    }
`;

export const CashtabLogo = styled.img`
    width: 100px;
`;

// Easter egg styled component not used in extension/src/components/App.js
export const EasterEgg = styled.img`
    position: fixed;
    bottom: -195px;
    margin: 0;
    right: 10%;
    transition-property: bottom;
    transition-duration: 1.5s;
    transition-timing-function: ease-out;

    :hover {
        bottom: 0;
    }

    @media screen and (max-width: 768px) {
        display: none;
    }
`;

export const DesktopLogo = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    padding: 20px;
    margin-bottom: 5px;
    img {
        width: 90%;
    }
    @media (max-width: 768px) {
        display: none;
    }
`;

export const HeaderInfoCtn = styled.div`
    display: flex;
    width: 100%;
    align-items: center;
    flex-direction: row-reverse;
    padding: 20px;
    background: ${props => props.theme.primaryBackground};
    border-bottom: 1px solid ${props => props.theme.border};
    position: relative;
    position: sticky;
    top: 0;
    z-index: 99;
    @media (max-width: 768px) {
        flex-direction: column;
        position: relative;
        padding: 10px 20px;
    }
`;

export const BalanceHeaderContainer = styled.div`
    box-sizing: border-box;
    transition: all 0.5s ease-in-out;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    *,
    *:before,
    *:after {
        box-sizing: inherit;
    }
    @media (max-width: 768px) {
        width: 100%;
        padding: 5px 20px;
        align-items: center;
    }
`;
