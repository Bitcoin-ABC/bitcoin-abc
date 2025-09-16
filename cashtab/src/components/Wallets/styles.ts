// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const WalletsList = styled.div`
    margin-top: 24px;
    padding: 12px;
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
    padding: 12px;
    width: 100%;
    background-color: ${props => props.theme.primaryBackground};
    border-radius: 9px;
    margin-bottom: 12px;
`;
export const Wallet = styled.div`
    display: flex;
    flex-direction: column;
    border-top: 0.5px solid ${props => props.theme.border};
    gap: 0 12px;
    padding: 6px 0;
`;
export const WalletRow = styled.div`
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
`;
export const ActionsRow = styled.div``;

export const WalletName = styled.div`
    display: flex;
    text-align: left;
    word-break: break-word;
`;

export const ActiveWalletName = styled(WalletName)`
    font-weight: bold;
    color: ${props => props.theme.accent};
`;

export const SvgButtonPanel = styled.div`
    display: flex;
    align-items: baseline;
`;
export const ButtonPanel = styled.div`
    display: flex;
    gap: 9px;
    align-items: center;
    justify-content: center;
`;

export const ActivateButton = styled.button`
    cursor: pointer;
    color: ${props => props.theme.accent};
    border-radius: 9px;
    border: 2px solid ${props => props.theme.accent};
    background: transparent;
    :hover {
        background-color: ${props => props.theme.accent};
        color: ${props => props.theme.primaryText};
    }
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
