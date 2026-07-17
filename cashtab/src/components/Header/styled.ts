// Copyright (c) 2024-2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Link } from 'react-router';
import styled from 'styled-components';
import { FIRMA_BALANCE_LABEL } from 'constants/tokenDisplayOverrides';

export const HeaderCtn = styled.div`
    display: flex;
    width: 100%;
    align-items: center;
    flex-direction: column;
    padding: 20px;
    padding-bottom: 10px;
    background-color: ${props => props.theme.primaryBackground}1A;
    backdrop-filter: blur(35px);
    position: sticky;
    top: 0;
    z-index: 99;
    @media (max-width: 1100px) {
        position: relative;
    }
    @media (max-width: 768px) {
        padding: 10px 10px 5px 10px;
        position: relative;
        /* Solid background on mobile so content doesn't show through (fixes Android overlap) */
        background-color: ${props => props.theme.primaryBackground};
        backdrop-filter: none;
    }
`;

export const MobileHeader = styled.div`
    display: none;
    @media (max-width: 768px) {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        margin-bottom: 10px;
        img {
            width: 100px;
        }
    }
`;

export const LabelCtn = styled.div`
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all ease-in-out 200ms;
    svg {
        height: 21px;
        width: 21px;
    }
    width: 100%;
`;

export const Price = styled.div`
    color: ${props => props.theme.secondaryText};
    text-align: left;
    @media (max-width: 768px) {
        display: none;
    }
`;

export const MobilePrice = styled.div`
    display: none;
    @media (max-width: 1100px) {
        font-size: 12px;
        color: ${props => props.theme.secondaryText};
        display: inline-block;
        text-align: right;
        margin-left: 10px;
    }
`;

export const WalletSelectCtn = styled.div`
    display: flex;
    align-items: center;
    height: 34px;
    gap: 15px;
    @media (max-width: 768px) {
        height: 32px;
        width: 100%;
        flex-direction: row-reverse;
        justify-content: space-between;
        margin: 2px 0 2px 0;
    }
`;

export const WalletDropdown = styled.select`
    width: 180px;
    height: 100%;
    cursor: pointer;
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
    padding: 0 36px 0 14px;
    color: ${props => props.theme.primaryText};
    font-weight: 600;
    border: none;
    border-radius: 100px;
    background-color: rgba(255, 255, 255, 0.14);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath fill='%23fff' d='M6 8L0 0h12z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    background-size: 10px 6px;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    text-overflow: ellipsis;
    text-decoration: none !important;
    &:focus-visible {
        outline: none;
        text-decoration: underline;
    }
    @media (max-width: 768px) {
        font-size: var(--text-sm);
        line-height: var(--text-sm--line-height);
    }
`;
export const WalletOption = styled.option`
    text-align: left;
    background-color: ${props => props.theme.secondaryBackground};
    :hover {
        color: ${props => props.theme.accent};
        background-color: ${props => props.theme.primaryBackground};
    }
`;

export const ExtenstionButton = styled.div`
    width: 38px;
    height: 100%;
    display: inline-block;
    position: relative;
    cursor: pointer;
    background-color: ${props => props.theme.secondaryBackground};
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    flex-shrink: 0;

    img {
        width: 20px;
        height: 20px;
        opacity: 0.5;
    }

    :hover {
        background-color: ${props => props.theme.accent};
        img {
            opacity: 1;
        }
    }
`;

export const CardWrapper = styled.div`
    position: relative;
    width: 100%;
`;

export const BalanceXec = styled.div`
    display: flex;
    align-items: stretch;
    width: 100%;
    margin-top: 15px;
    gap: 10px;
    position: relative;
    @media (max-width: 1100px) {
        margin-top: 6px;
        gap: 5px;
    }
`;

export const BalanceCard = styled(Link)<{
    tokenLabel?: string;
}>`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    flex: 1 1 0;
    min-width: 0;
    width: auto;
    border-radius: 10px;
    overflow-wrap: break-word;
    word-break: break-word;
    padding: 14px;
    text-align: left;
    position: relative;
    overflow: hidden;
    text-decoration: none;
    cursor: pointer;
    color: ${props => props.theme.primaryText};
    background: ${props =>
        (props.tokenLabel === FIRMA_BALANCE_LABEL
            ? props.theme.firmaAccent
            : props.theme.accent) + '4D'};
    :hover {
        text-decoration: none;
        color: ${props => props.theme.primaryText};
    }
    @media (max-width: 1100px) {
        padding: 10px 10px;
    }
`;

export const BackgroundImage = styled.img`
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: 10px;
    width: 80px;
    opacity: 0.1;
    @media (max-width: 1100px) {
        right: 5px;
        width: 35px;
    }
`;

export const BalanceTitle = styled.div<{
    tokenLabel?: string;
}>`
    width: 100%;
    margin-bottom: 6px;
    font-size: var(--text-sm);
    display: flex;
    align-items: center;
    gap: 4px;
    svg {
        width: auto;
        height: 12px;
        fill: currentColor;
    }
    @media (max-width: 1100px) {
        margin-bottom: 2px;
        font-size: 12px;
    }
`;

/** Ticker next to the card title (e.g. "eCash XEC") — smaller than the title */
export const TitleTicker = styled.span`
    font-size: 0.85em;
    font-weight: 500;
    opacity: 0.75;
    letter-spacing: 0.02em;
`;
export const BalanceRow = styled.div<{
    hideBalance: boolean;
    tokenLabel: string;
}>`
    font-weight: 600;
    font-size: var(--text-2xl);
    line-height: 1em;
    color: ${props =>
        props.hideBalance ? 'transparent' : props.theme.primaryText};

    text-shadow: ${props =>
        props.hideBalance ? `0 0 15px ${props.theme.primaryText}` : 'none'};
    @media (max-width: 768px) {
        font-size: var(--text-lg);
    }
`;
export const BalanceFiat = styled.div<{ balanceVisible: boolean }>`
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
    color: ${props =>
        props.balanceVisible ? 'transparent' : props.theme.secondaryText};

    text-shadow: ${props =>
        props.balanceVisible
            ? `0 0 15px ${props.theme.secondaryText}`
            : 'none'};
    @media (max-width: 768px) {
        font-size: 12px;
        line-height: 1em;
        margin-top: 2px;
    }
`;

/** Staked XECX share shown under the combined eCash total */
export const StakedPercent = styled.div<{ balanceVisible: boolean }>`
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
    margin-top: 2px;
    color: ${props =>
        props.balanceVisible ? 'transparent' : props.theme.secondaryText};

    text-shadow: ${props =>
        props.balanceVisible
            ? `0 0 15px ${props.theme.secondaryText}`
            : 'none'};
    @media (max-width: 768px) {
        font-size: 12px;
        line-height: 1em;
    }
`;
