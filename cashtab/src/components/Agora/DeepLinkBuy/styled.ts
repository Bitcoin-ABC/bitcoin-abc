// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const DeepLinkBuyCtn = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 24px 20px 100px;
    box-sizing: border-box;
    background: ${props => props.theme.secondaryBackground};
    border-radius: 0 0 20px 20px;
    border-top: 1px solid ${props => props.theme.primaryBackground};
`;

export const DeepLinkBuyTitle = styled.h2`
    margin: 0;
    color: ${props => props.theme.primaryText};
    font-size: var(--text-xl);
    font-weight: 600;
    text-align: center;
`;

export const DeepLinkBuyTokenMeta = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: ${props => props.theme.primaryText};
    text-align: center;

    span {
        color: ${props => props.theme.secondaryText};
    }
`;

export const DeepLinkBuySummary = styled.div`
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
`;

export const DeepLinkBuySummaryRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    color: ${props => props.theme.primaryText};
`;

export const DeepLinkBuySummaryLabel = styled.span`
    color: ${props => props.theme.secondaryText};
    font-size: var(--text-sm);
`;

export const DeepLinkBuySummaryValue = styled.span`
    font-weight: 600;
    text-align: right;
`;

export const DeepLinkBuyAmountCtn = styled.div`
    width: 100%;
    max-width: 420px;
`;

export const DeepLinkBuyActions = styled.div`
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-width: 420px;
    display: flex;
    gap: 10px;
    margin-top: 16px;
    padding: 12px 0;
    background: ${props => props.theme.secondaryBackground};
    z-index: 10;

    button {
        flex: 1;
        margin-bottom: 0 !important;
    }

    @media (max-width: 768px) {
        position: fixed;
        bottom: var(--cashtab-mobile-footer-offset, 70px);
        left: 0;
        right: 0;
        max-width: none;
        padding: 12px;
        background: ${props => props.theme.primaryBackground};
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    }
`;

export const DeepLinkBuyLoading = styled.div`
    display: flex;
    justify-content: center;
    width: 100%;
    margin: 24px auto;
`;

/** Longer "You bought …" copy needs wrap + padding; Send's Sent! stays large. */
export const DeepLinkBuySuccessTitle = styled.h2`
    color: ${props => props.theme.primaryText};
    font-size: 22px;
    font-weight: bold;
    margin: 0 0 10px;
    padding: 0 20px;
    line-height: 1.3;
    word-break: break-word;
    text-align: center;
`;
