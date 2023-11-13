// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';

export const Container = styled.div`
    width: 100%;
    max-width: ${props => (props.narrow ? '900px' : '1500px')};
    margin: auto;
    padding: 0 50px;

    ${props => props.theme.breakpoint.medium} {
        padding: 0 20px;
    }
`;

export const ThemeSwitch = styled.div`
    position: fixed;
    bottom: 30px;
    width: 40px;
    height: 40px;
    z-index: 9999;
    background: rgba(255, 255, 255, 0.1);
    right: 30px;
`;

export const CenterImage = styled.div`
    position: relative;
    width: 100%;
    height: ${props => props.height};
    ${props => props.theme.filters.grayscale}

    img {
        object-fit: contain;
    }

    ${props => props.theme.breakpoint.medium} {
        height: calc(${props => props.height} / 2);
    }
`;

export const GradientSpacer = styled.div`
    height: 100px;
    width: 100%;
    background-image: linear-gradient(
        180deg,
        ${props => props.theme.colors.darkBlue},
        ${props => props.theme.colors.darkBackground}
    );
    margin-bottom: 80px;
`;

export const WarningBox = styled.p`
    padding: 20px;
    background-color: ${props => props.theme.colors.primary};
    border-radius: 10px;
    line-height: 1.5em;
`;
