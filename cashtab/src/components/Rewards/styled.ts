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

export const GameCardsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 16px;
`;

export const GameCard = styled.a`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background-color: ${props => props.theme.primaryBackground};
    border: 1px solid ${props => props.theme.border};
    border-radius: 12px;
    text-decoration: none;
    color: ${props => props.theme.primaryText};
    transition:
        border-color 0.2s,
        box-shadow 0.2s;

    &:hover {
        border-color: ${props => props.theme.primary};
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        text-decoration: none;
        color: ${props => props.theme.primaryText};
    }

    img,
    svg {
        flex-shrink: 0;
        width: 48px;
        height: 48px;
    }
`;
