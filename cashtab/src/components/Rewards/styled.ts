// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const Wrapper = styled.div`
    width: 100%;
    margin-top: 24px;
    h2 {
        margin-bottom: 30px;
    }
`;

export const ContentDiv = styled.div`
    color: ${props => props.theme.primaryText};
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
    margin-top: 24px;
    padding: 16px;
    background-color: ${props => props.theme.secondaryBackground};
    border-radius: 12px;

    h3 {
        margin: 0 0 12px 0;
        font-size: var(--text-lg);
        line-height: var(--text-lg--line-height);
    }

    p {
        margin: 0;
    }

    a {
        color: ${props => props.theme.primary};
        text-decoration: none;

        &:hover {
            text-decoration: underline;
        }
    }
`;
