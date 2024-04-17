// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled, { createGlobalStyle, css } from 'styled-components';
import { ToastContainer } from 'react-toastify';

export const ExtensionFrame = createGlobalStyle`
    html, body {
        min-width: 400px;
        min-height: 600px;
    }
`;

export const GlobalStyle = createGlobalStyle`
    *::placeholder {
        color: ${props => props.theme.forms.placeholder} !important;
    }
    a {
        color: ${props => props.theme.eCashBlue}
        &:hover {
            color: ${props => props.theme.eCashPurple}
            text-decoration: none;
        }
    }
`;

export const CashtabNotification = styled(ToastContainer)`
    .Toastify__progress-bar-theme--dark {
        background: #00abe7;
    }
    .Toastify__progress-bar-theme--light {
        background: #00abe7;
    }
`;

export const CustomApp = styled.div`
    text-align: center;
    font-family: 'Poppins', sans-serif;
    background-color: ${props => props.theme.backgroundColor};
    background-size: 100px 171px;
    background-image: ${props => props.theme.backgroundImage};
    background-attachment: fixed;
    min-height: 100vh;
`;
export const WalletBody = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
`;
const AppPositionCss = css`
    width: 500px;
    background: ${props => props.theme.walletBackground};
    -webkit-box-shadow: 0px 0px 24px 1px ${props => props.theme.shadow};
    -moz-box-shadow: 0px 0px 24px 1px ${props => props.theme.shadow};
    box-shadow: 0px 0px 24px 1px ${props => props.theme.shadow};
    @media (max-width: 768px) {
        width: 100%;
        -webkit-box-shadow: none;
        -moz-box-shadow: none;
        box-shadow: none;
    }
`;
export const Header = styled.div`
    ${AppPositionCss}
    position: sticky;
    z-index: 2;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    *,
    *:before,
    *:after {
        box-sizing: inherit;
    }
`;

export const WalletCtn = styled.div`
    ${AppPositionCss}
    position: relative;
    padding: 0 0 100px;
    min-height: calc(100vh - 80px);
`;

export const Footer = styled.div`
    ${AppPositionCss}
    z-index: 2;
    height: 80px;
    border-top: 1px solid rgba(255, 255, 255, 0.5);
    position: fixed;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0;
`;

export const NavWrapper = styled.div`
    width: 100%;
    height: 100%;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 1.3rem;
    margin-bottom: 5px;
`;

export const NavIcon = styled.span`
    @media (hover: hover) {
        ${NavWrapper}:hover & {
            background-color: ${props =>
                props.clicked ? 'transparent' : props.theme.eCashPurple};
            ::before,
            ::after {
                background-color: ${props => props.theme.eCashPurple};
            }
        }
    }

    position: relative;
    background-color: ${props =>
        props.clicked ? 'transparent' : props.theme.buttons.primary.color};
    width: 2rem;
    height: 2px;
    display: inline-block;
    transition: transform 300ms, top 300ms, background-color 300ms;
    &::before,
    &::after {
        content: '';
        background-color: ${props => props.theme.buttons.primary.color};
        width: 2rem;
        height: 2px;
        display: inline-block;
        position: absolute;
        left: 0;
        transition: transform 300ms, top 300ms, background-color 300ms;
    }
    &::before {
        top: ${props => (props.clicked ? '0' : '-0.8rem')};
        transform: ${props => (props.clicked ? 'rotate(135deg)' : 'rotate(0)')};
    }
    &::after {
        top: ${props => (props.clicked ? '0' : '0.8rem')};
        transform: ${props =>
            props.clicked ? 'rotate(-135deg)' : 'rotate(0)'};
    }
`;

export const NavMenu = styled.div`
    position: fixed;
    margin-right: 125px;
    bottom: 80px;
    display: flex;
    width: 225px;
    flex-direction: column;
    border: ${props => (props.open ? '1px solid' : '0px solid')};
    border-color: ${props =>
        props.open ? props.theme.contrast : 'transparent'};
    justify-content: center;
    align-items: center;
    @media (max-width: 768px) {
        right: 0;
        margin-right: 0;
    }
    overflow: hidden;
    transition: ${props =>
        props.open
            ? 'max-height 250ms ease-in-out , border-color 250ms ease-in-out, border-width 250ms ease-in-out'
            : 'max-height 250ms cubic-bezier(0, 1, 0, 1), border-color 250ms ease-in-out, border-width 250ms ease-in-out'};
    max-height: ${props => (props.open ? '100vh' : '0')};
`;

export const NavItem = styled.button`
    display: flex;
    justify-content: space-between;
    text-align: left;
    font-size: 24px;
    padding: 12px;
    align-items: center;
    width: 100%;
    white-space: nowrap;
    background-color: ${props => props.theme.walletBackground};
    border: 1px solid ${props => props.theme.walletBackground};
    color: ${props => props.theme.contrast};
    gap: 6px;
    cursor: pointer;
    &:hover {
        color: ${props => props.theme.eCashPurple};
        svg,
        g,
        path {
            fill: ${props => props.theme.eCashPurple};
        }
    }
    svg {
        fill: ${props => props.theme.contrast};
        max-width: 33px;
        height: auto;
        flex: 1;
    }
    g,
    path {
        fill: ${props => props.theme.contrast};
    }
    p {
        flex: 2;
        margin: 0;
    }
    ${({ active, ...props }) =>
        active &&
        `    
        color: ${props.theme.navActive};
        svg, g, path {
            fill: ${props.theme.navActive};
        }
  `}
`;

export const NavButton = styled.button`
    :focus,
    :active {
        outline: none;
    }
    @media (hover: hover) {
        :hover {
            svg,
            g,
            path {
                fill: ${props => props.theme.eCashPurple};
            }
        }
    }
    width: 100%;
    height: 100%;
    cursor: pointer;
    padding: 0;
    background: none;
    border: none;
    font-size: 10px;
    svg {
        fill: ${props => props.theme.contrast};
        width: 30px;
        height: 30px;
    }
    g,
    path {
        fill: ${props => props.theme.contrast};
    }
    ${({ active, ...props }) =>
        active &&
        `    
        color: ${props.theme.navActive};
        svg, g, path {
            fill: ${props.theme.navActive};
        }
  `}
`;
export const ScreenWrapper = styled.div`
    padding: 0px 30px;
    @media (max-width: 768px) {
        padding: 0px 15px;
    }
`;

export const HeaderCtn = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 15px 0;
    gap: 6px;
`;

export const CashtabLogo = styled.img`
    width: 120px;
    @media (max-width: 768px) {
        width: 110px;
    }
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

    @media screen and (max-width: 1250px) {
        display: none;
    }
`;

export const NavHeader = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 1rem;
    color: ${props => props.theme.navActive};
    svg {
        padding: 0.2rem;
        fill: ${props => props.theme.navActive};
        height: 33px;
        width: 30px;
    }
    g {
        fill: ${props => props.theme.navActive};
    }
    path {
        fill: ${props => props.theme.navActive};
    }
`;

export const WalletInfoCtn = styled.div`
    ${props =>
        props.minified &&
        `display: flex;
        align-items: center;
        justify-content: space-between;
        position: fixed;
        top: 0;
        width: 500px;
        @media (max-width: 768px) {
            width: 100%;
        }
        height: 63px;
        overflow: hidden;
        `}
    background: ${props => props.theme.walletInfoContainer};
    padding: 12px 20px;
    box-sizing: border-box;
    *,
    *:before,
    *:after {
        box-sizing: inherit;
    }
`;
