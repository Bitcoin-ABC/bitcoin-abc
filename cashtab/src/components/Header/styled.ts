// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const HeaderCtn = styled.div`
    display: flex;
    width: 100%;
    align-items: center;
    flex-direction: column;
    padding: 20px;
    background: ${props => props.theme.primaryBackground};
    border-bottom: 1px solid ${props => props.theme.border};
    position: sticky;
    top: 0;
    z-index: 99;
    @media (max-width: 1100px) {
        position: relative;
    }
    @media (max-width: 768px) {
        padding: 10px;
        position: relative;
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
    gap: 5px;
    @media (max-width: 768px) {
        height: 30px;
        width: 100%;
    }
`;

export const WalletDropdown = styled.select`
    width: 180px;
    height: 100%;
    cursor: pointer;
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
    padding: 0px 10px;
    color: ${props => props.theme.secondaryText};
    border: none;
    border-radius: 5px;
    background-color: ${props => props.theme.secondaryBackground};
    text-overflow: ellipsis;
    text-decoration: none !important;
    &:focus-visible {
        outline: none;
        text-decoration: underline;
    }
    @media (max-width: 768px) {
        width: 100%;
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
    @media (max-width: 1100px) {
        overflow: hidden;
        &::after {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 40px;
            height: 100%;
            pointer-events: none;
            background: linear-gradient(
                to left,
                rgba(0, 0, 0, 0.7),
                transparent
            );
        }
    }
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
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        flex-direction: row;

        @media (pointer: fine) {
            &::-webkit-scrollbar {
                width: 4px;
            }

            &::-webkit-scrollbar-track {
                -webkit-box-shadow: inset 0 0 0 rgba(0, 0, 0, 0);
                background-color: ${props => props.theme.primaryBackground};
            }

            &::-webkit-scrollbar-thumb {
                border-radius: 10px;
                background-color: ${props => props.theme.accent};
            }
        }
    }
`;

export const BalanceCard = styled.div<{
    tokenLabel?: string;
}>`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    border-radius: 5px;
    overflow-wrap: break-word;
    word-break: break-word;
    padding: 15px;
    text-align: left;
    position: relative;
    overflow: hidden;
    color: ${props => props.theme.primaryText};
    background: linear-gradient(
        to right,
        ${props =>
            (props.tokenLabel === 'FIRMA'
                ? props.theme.firmaAccent
                : props.tokenLabel === 'XECX'
                  ? props.theme.secondaryAccent
                  : props.theme.accent) + '4D'},
        ${props => props.theme.secondaryBackground}
    );
    @media (max-width: 1100px) {
        padding: 6px 10px;
        width: 88%;
        flex-shrink: 0;
        scroll-snap-align: start;
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
    margin-bottom: 3px;
    font-size: var(--text-sm);
    color: ${props =>
        props.tokenLabel === 'FIRMA'
            ? props.theme.firmaAccent
            : props.tokenLabel === 'XECX'
              ? props.theme.secondaryAccent
              : props.theme.accent};

    @media (max-width: 1100px) {
        margin-bottom: 2px;
        font-size: 12px;
    }
`;
export const BalanceRow = styled.div<{
    hideBalance: boolean;
    tokenLabel: string;
}>`
    font-weight: 600;
    font-size: var(--text-xl);
    line-height: 1.2em;
    color: ${props =>
        props.hideBalance ? 'transparent' : props.theme.primaryText};

    text-shadow: ${props =>
        props.hideBalance ? `0 0 15px ${props.theme.primaryText}` : 'none'};
    @media (max-width: 768px) {
        font-size: var(--text-lg);
    }
    a {
        color: ${props => props.theme.primaryText};
        :hover {
            color: ${props =>
                props.tokenLabel === 'FIRMA'
                    ? props.theme.firmaAccent
                    : props.tokenLabel === 'XECX'
                      ? props.theme.secondaryAccent
                      : props.theme.accent};
            text-decoration: underline;
        }
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
