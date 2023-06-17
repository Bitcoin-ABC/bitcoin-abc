// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';

export const StyledH3 = styled.h3`
    margin: 0;
    font-size: 20px;
    font-weight: 400;
    color: ${props => props.theme.colors.primaryLight};
    line-height: 1em;
    margin-bottom: 10px;
    position: relative;
`;

export const StyledH2 = styled.h2`
    margin: 0;
    font-size: 55px;
    font-weight: 700;
    line-height: 1em;
    position: relative;
    margin-bottom: 70px;
    display: inline-block;
    ${props => props.theme.breakpoint.medium} {
        font-size: 40px;
        margin-bottom: 60px;
    }
`;

export const H2Image = styled.div`
    width: 380px;
    height: 60px;
    position: absolute;
    bottom: -40px;
    left: 0;
    right: ${props => (props.center ? '0' : 'unset')};
    margin: ${props => (props.center ? 'auto' : 'unset')};
    ${props => props.theme.filters.grayscale};
    ${props => props.theme.breakpoint.medium} {
        width: 300px;
        height: 47px;
        bottom: -27px;
    }
`;
