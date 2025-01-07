// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { DefaultTheme } from 'styled-components';

export interface CashtabTheme extends DefaultTheme {
    primaryBackground: string;
    secondaryBackground: string;
    accent: string;
    secondaryAccent: string;
    primaryText: string;
    secondaryText: string;
    border: string;
    agoraDepthBar: string;
    agoraDepthBarOwnOffer: string;
    agoraDepthBarUnacceptable: string;
    error: string;
    genesisGreen: string;
    formError: string;
    qrBackground: string;
    backgroundImage: string;
    menuGlow: string;
    buttons: {
        primary: {
            backgroundImage: string;
            color: string;
            hoverShadow: string;
        };
        secondary: {
            backgroundImage: string;
            color: string;
        };
        disabled: {
            background: string;
            color: string;
        };
    };
}

export const theme: CashtabTheme = {
    primaryBackground: '#111313',
    secondaryBackground: '#2a2e2e',
    accent: '#00ABE7',
    secondaryAccent: '#ff21d0',
    primaryText: '#FFF',
    secondaryText: '#838d91',
    border: '#586161',
    agoraDepthBar: 'rgba(255, 255, 255, 0.2)',
    agoraDepthBarOwnOffer: 'rgba(179, 33, 144, 0.2)',
    agoraDepthBarUnacceptable: 'rgba(220, 20, 60, .7)',
    error: '#DC143C',
    genesisGreen: '#00e781',
    formError: '#ff21d0',
    qrBackground: '#fff',
    backgroundImage: `url("/cashtab_bg.png")`,
    menuGlow: '#00ABE740',
    buttons: {
        primary: {
            backgroundImage:
                'linear-gradient(270deg, #0074C2 0%, #273498 100%)',
            color: '#fff',
            hoverShadow: '0px 3px 10px -5px rgba(0, 0, 0, 0.75)',
        },
        secondary: {
            backgroundImage:
                'linear-gradient(270deg, #ff21d0 0%, #273498 100%)',
            color: '#fff',
        },
        disabled: {
            background: '#4b5252',
            color: '#a2acb0',
        },
    },
};
