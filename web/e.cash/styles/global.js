// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { createGlobalStyle } from 'styled-components';

export default createGlobalStyle`
    @font-face {
        font-family: 'Poppins';
        src: local('Poppins'),
            url(/fonts/Poppins-Regular.ttf) format('truetype');
        font-weight: normal;
    }

    @font-face {
        font-family: 'Poppins';
        src: local('Poppins'),
            url(/fonts/Poppins-Medium.ttf) format('truetype');
        font-weight: 500;
    }

    @font-face {
        font-family: 'Poppins';
        src: local('Poppins'),
            url(/fonts/Poppins-Bold.ttf) format('truetype');
        font-weight: 700;
    }

    @font-face {
        font-family: 'Montserrat';
        src: local('Montserrat'),
            url(/fonts/Montserrat-Regular.ttf) format('truetype');
        font-weight: normal;
    }

    @font-face {
        font-family: 'Montserrat';
        src: local('Montserrat'),
            url(/fonts/Montserrat-Bold.ttf) format('truetype');
        font-weight: 700;
    }

    html {
        scroll-padding-top: 120px;
        scroll-behavior: smooth;
    }
    
    html,
    body {
        padding: 0;
        margin: 0;
        font-family: 'Poppins', sans-serif;
        line-height: 1.6;
        font-size: 18px;
        background-color: ${props => props.theme.colors.darkBackground};
        color: ${props => props.theme.colors.contrast};
        ${props => props.theme.breakpoint.medium} {
            overflow-x: hidden;
        }
       
    }

    ::-webkit-scrollbar {
        width: 5px;
    }
    ::-webkit-scrollbar-track {
        border-radius: 0px;
        background-color: ${props => props.theme.colors.darkBlue};
    }
    ::-webkit-scrollbar-thumb {
        border-radius: 0px;
        background: ${props => props.theme.colors.primary};
        height: 50px;
    }
    ::-webkit-scrollbar-corner {
        display: none;
        height: 0px;
        width: 0px;
    }

    * {
        box-sizing: border-box;
    }

    a {
        text-decoration: none;
        cursor: pointer;
        color: ${props => props.theme.colors.primary};
    }

    a:hover {
        text-decoration: none;
        color: ${props => props.theme.colors.primaryLight}
    }

    p {
        margin: 0;
        font-size: 18px;
        line-height: 1.8em;
        margin-bottom: 30px;
    }

    body .wg-default.weglot-container--left, .wg-default.weglot-container--left .country-selector {
        left: unset !important;
        right: 40px !important;
    }

    body .wg-default, body .wg-default .country-selector {
        bottom: 40px;
        position: fixed;
        right: 40px;
    }

    body .wg-drop.country-selector .wgcurrent,
    body .wg-drop.country-selector ul {
        border: none;
    }

    body .wg-drop.country-selector .wgcurrent a,
    body .wg-default .wg-drop.country-selector a {
        padding: 0 !important;
        width: 50px !important;
        height: 50px !important;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid ${props => props.theme.colors.primaryLight};
        background-color: ${props => props.theme.colors.darkBackground};
        color: ${props => props.theme.colors.contrast}
    }

    body aside #weglot-listbox {
        bottom: 43px !important;
    }

    body aside #weglot-listbox li a:hover {
       background-color: ${props => props.theme.colors.primaryLight} !important;
    }

    body .wg-drop.country-selector .wgcurrent:after {
        display: none;
    }

    body .wg-default .wg-drop.country-selector a {
        font-size: 13px;
        width: 50px;
        height: 50px;
        padding: 0;
    }

    body .wg-drop.weg-openup ul {
        bottom: 50px;
    }

    .anchor {
        display: block;
        height: 150px; 
        margin-top: -150px; 
        visibility: hidden;
    }
`;
