// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const WalletsList = styled.div`
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: center;
    gap: 12px;
    color: ${props => props.theme.primaryText};
    box-sizing: border-box;
    *,
    *:before,
    *:after {
        box-sizing: inherit;
    }
`;

export const WalletsPanel = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-bottom: 12px;
`;
export const Wallet = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding: 14px 12px;
    background: ${props => props.theme.secondaryBackground};
    border-radius: 10px;
`;

export const WalletLeftColumn = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    min-width: 0;
`;

export const WalletRow = styled.div`
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
`;

export const WalletName = styled.div`
    display: flex;
    text-align: left;
    word-break: break-word;
    color: ${props => props.theme.primaryText};
    font-weight: bold;
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
    align-items: center;
    gap: 8px;
`;

export const HdBadge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: var(--text-xs);
    line-height: var(--text-xs--line-height);
    font-weight: 600;
    letter-spacing: 0.04em;
    color: ${props => props.theme.secondaryText};
    border: 1px solid ${props => props.theme.secondaryText};
`;

export const ActiveWalletName = styled(WalletName)`
    color: inherit;
`;

export const SvgButtonPanel = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
`;

export const ActivateButton = styled.button<{ $active?: boolean }>`
    cursor: pointer;
    border-radius: 8px;
    border: none;
    padding: 6px 14px;
    font-size: var(--text-sm);
    font-weight: 600;
    ${props =>
        props.$active
            ? `
        background: ${props.theme.accent};
        color: ${props.theme.primaryText};
        cursor: default;
    `
            : `
        background: ${props.theme.inputBackground};
        color: ${props.theme.primaryText};
        :hover {
            background: rgba(255, 255, 255, 0.15);
        }
    `}
`;

export const AddressShareModal = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const WalletAddressRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background-color: ${props => props.theme.secondaryBackground};
    border-radius: 9px;
    gap: 12px;
`;

export const WalletInfo = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
`;

export const WalletNameText = styled.div`
    font-weight: bold;
    color: ${props => props.theme.primaryText};
    margin-bottom: 4px;
`;

export const WalletAddress = styled.div`
    font-family: monospace;
    font-size: 14px;
    color: ${props => props.theme.secondaryText};
    word-break: break-all;
`;

export const CopyButton = styled.button`
    background: ${props => props.theme.accent};
    border: none;
    border-radius: 6px;
    padding: 8px 12px;
    color: ${props => props.theme.primaryText};
    cursor: pointer;
    font-size: 12px;
    white-space: nowrap;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.theme.secondaryAccent};
    }
`;

export const ActiveIndicator = styled.span`
    color: ${props => props.theme.accent};
    margin-left: 4px;
`;

export const HdSwitchRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    gap: 12px;
    margin-top: 16px;
`;

export const HdSwitchLabel = styled.div`
    color: ${props => props.theme.primaryText};
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
`;
