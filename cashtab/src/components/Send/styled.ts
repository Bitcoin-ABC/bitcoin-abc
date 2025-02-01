// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const SendButtonContainer = styled.div`
    position: fixed;
    bottom: 0;
    left: 230px;
    right: 40px;
    padding: 12px 0;
    display: flex;
    justify-content: center;
    background-color: ${props => props.theme.primaryBackground};
    @media (max-width: 768px) {
        left: 0;
        right: 0;
        bottom: 70px;
        padding: 12px;
        button {
            margin: 0;
        }
    }
`;
