// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
export const ecash = {
    colors: {
        primary: '#0074c2',
        primaryLight: '#00abe7',
        accent: '#ff21d0',
        accentDark: '#CD0BC3',
        darkBackground: '#050d27',
        contrast: '#ffffff',
        black: '#000',
        darkBlue: '#001137',
        videocover:
            'linear-gradient(9deg,#001137 18%,transparent 91%),linear-gradient(180deg,rgba(0, 0, 0, 0.46),rgba(0, 0, 0, 0.46))',
        navbarBackground: 'rgba(0, 0, 0, 0.65)',
        coretechBackground: 'rgba(0, 17, 55, 0.2)',
        coretechShadow1: 'rgba(0, 0, 0, 0.63)',
        coretechShadow2: 'rgba(0, 171, 231, 0.86)',
        colorSwatchBackground: 'rgba(255,255,255, 0.2)',
        gridlines: 'rgba(255,255,255, 0.2)',
        featureTileHover: '#CD0BC3',
        walletHover: 'rgba(255,255,255, 0.1)',
    },
    roadmap: {
        sectionHeader: '#00abe7',
        complete: '#ffffff',
        underway: '#ff21d0',
        planning: '#00abe7',
        whiteIcon:
            'invert(100%) sepia(1%) saturate(0%) hue-rotate(56deg) brightness(106%) contrast(100%)',
        primaryIcon:
            'invert(59%) sepia(96%) saturate(2939%) hue-rotate(159deg) brightness(94%) contrast(101%)',
        accentIcon:
            'invert(52%) sepia(100%) saturate(6184%) hue-rotate(295deg) brightness(100%) contrast(109%)',
    },
    filters: {
        grayscale: null,
        videospeed: 1,
        animationspeed: 0.4,
        glitchAnimationSpeed: '3s',
    },
    breakpoint: {
        large: '@media (max-width: 1300px)',
        medium: '@media (max-width: 920px)',
        small: '@media (max-width: 520px)',
    },
};

export const stealth = {
    colors: {
        primary: '#7f7f7f',
        primaryLight: '#a0a0a0',
        accent: '#8a8a8a',
        accentDark: '#797878',
        darkBackground: '#000000',
        contrast: '#ffffff',
        black: '#000',
        darkBlue: '#181818',
        videocover:
            'linear-gradient(9deg,#181818 18%,transparent 91%),linear-gradient(180deg,rgba(0, 0, 0, 0.46),rgba(0, 0, 0, 0.46))',
        navbarBackground: 'rgba(0, 0, 0, 0.65)',
        coretechBackground: 'rgba(0, 0, 0, 0.5)',
        coretechShadow1: 'rgba(0, 0, 0, 0.63)',
        coretechShadow2: 'rgba(255, 255, 255, 0.86)',
        colorSwatchBackground: 'rgba(255,255,255, 0.2)',
        gridlines: 'rgba(255,255,255, 0.2)',
        featureTileHover: '#c8c8c8',
        walletHover: 'rgba(255,255,255, 0.1)',
    },
    roadmap: {
        sectionHeader: '#ffffff',
        complete: '#ffffff',
        underway: '#cccccc',
        planning: '#7a7a7a',
        whiteIcon:
            'invert(100%) sepia(0%) saturate(0%) hue-rotate(360deg) brightness(102%) contrast(102%)',
        primaryIcon:
            'invert(48%) sepia(2%) saturate(9%) hue-rotate(315deg) brightness(99%) contrast(85%)',
        accentIcon:
            'invert(99%) sepia(0%) saturate(1540%) hue-rotate(210deg) brightness(81%) contrast(97%)',
    },
    filters: {
        grayscale: 'filter: grayscale(100%);',
        videospeed: 1,
        animationspeed: 0.4,
        glitchAnimationSpeed: '3s',
    },
    breakpoint: {
        large: '@media (max-width: 1300px)',
        medium: '@media (max-width: 920px)',
        small: '@media (max-width: 520px)',
    },
};
