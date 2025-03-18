// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const WelcomeCtn = styled.div`
    margin-top: 20px;
    padding: 0px 30px;
    color: ${props => props.theme.primaryText};
    h2 {
        color: ${props => props.theme.primaryText};
    }
`;

export const WelcomeText = styled.p`
    width: 100%;
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
    margin-bottom: 60px;
    text-align: left;
`;

export const WelcomeLink = styled.a`
    text-decoration: underline;
    color: ${props => props.theme.accent};
    :hover {
        color: ${props => props.theme.secondaryAccent} !important;
        text-decoration: underline !important;
    }
`;
