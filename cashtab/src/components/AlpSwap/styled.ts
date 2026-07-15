// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const Wrapper = styled.div`
    width: 100%;
    @media (max-width: 768px) {
        padding: 0 10px;
    }
`;

export const PairPills = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 16px;
`;

export const PairPill = styled.button<{ $active?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 9999px;
    border: 1px solid
        ${props => (props.$active ? props.theme.accent : props.theme.border)};
    background: ${props =>
        props.$active ? props.theme.accent : props.theme.primaryBackground};
    color: ${props => props.theme.primaryText};
    cursor: pointer;
    font-size: var(--text-sm);
    font-weight: 700;
    line-height: 1.2;
    &:hover {
        border-color: ${props => props.theme.accent};
        background: ${props =>
            props.$active
                ? props.theme.accent
                : props.theme.secondaryBackground};
    }
    /* Load 32px CDN icons; display smaller in the pill */
    img {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        flex-shrink: 0;
    }
`;

export const SwapPanel = styled.div`
    margin-top: 12px;
    padding: 16px;
    background-color: ${props => props.theme.secondaryBackground};
    border-radius: 12px;
    color: ${props => props.theme.primaryText};
`;

export const AmountRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 8px;
`;

export const AmountHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

export const TokenBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: ${props => props.theme.primaryBackground};
    border: 1px solid ${props => props.theme.border};
    border-radius: 9999px;
    padding: 8px 12px 8px 8px;
    color: ${props => props.theme.primaryText};
    font-size: var(--text-base);
    font-weight: 700;
    line-height: 1;
    img {
        width: 32px;
        height: 32px;
        border-radius: 50%;
    }
`;

export const ClearButton = styled.button`
    background: none;
    border: none;
    color: ${props => props.theme.secondaryText};
    cursor: pointer;
    font-size: var(--text-sm);
    font-weight: 600;
    padding: 0;
    &:hover {
        color: ${props => props.theme.primary};
    }
`;

export const AmountInput = styled.input`
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    text-align: right;
    color: ${props => props.theme.primaryText};
    font-size: 36px;
    font-weight: 700;
    line-height: 1.1;
    min-width: 0;
    &::placeholder {
        color: ${props => props.theme.secondaryText};
        opacity: 0.6;
    }
    @media (max-width: 768px) {
        font-size: 28px;
    }
`;

export const BalanceHint = styled.div<{ $error?: boolean }>`
    font-size: var(--text-sm);
    color: ${props =>
        props.$error ? props.theme.formError : props.theme.secondaryText};
    padding-left: 4px;
`;

export const MidRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 12px 0;
    flex-wrap: wrap;
`;

export const MidLabel = styled.span`
    font-size: var(--text-lg);
    font-weight: 700;
    color: ${props => props.theme.primaryText};
`;

export const RatePill = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-sm);
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 9999px;
    background: ${props => props.theme.primaryBackground};
    border: 1px solid ${props => props.theme.border};
    color: ${props => props.theme.primaryText};
`;

export const FlipButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid ${props => props.theme.border};
    background: ${props => props.theme.primaryBackground};
    color: ${props => props.theme.primaryText};
    cursor: pointer;
    &:hover {
        border-color: ${props => props.theme.primary};
        color: ${props => props.theme.primary};
    }
    svg {
        width: 18px;
        height: 18px;
    }
`;

export const FeeRow = styled.div`
    margin-top: 8px;
    font-size: var(--text-sm);
    color: ${props => props.theme.secondaryText};
`;

export const ErrorBanner = styled.div`
    margin: 12px 0;
    padding: 12px;
    border-radius: 8px;
    background: rgba(255, 70, 70, 0.12);
    color: ${props => props.theme.formError};
    font-size: var(--text-sm);
`;

export const ButtonRow = styled.div`
    margin-top: 24px;
    width: 100%;
`;

export const StatusText = styled.p`
    margin: 16px 0;
    color: ${props => props.theme.secondaryText};
    font-size: var(--text-base);
    text-align: center;
`;
