// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const WelcomeCtn = styled.div`
    margin-top: 20px;
    padding: 0px 30px;
    color: ${props => props.theme.contrast};
    h2 {
        color: ${props => props.theme.contrast};
    }
`;

export const WelcomeText = styled.p`
    width: 100%;
    font-size: 16px;
    margin-bottom: 60px;
    text-align: left;
`;

export const WelcomeLink = styled.a`
    text-decoration: underline;
    color: ${props => props.theme.eCashBlue};
    :hover {
        color: ${props => props.theme.eCashPurple} !important;
        text-decoration: underline !important;
    }
`;
