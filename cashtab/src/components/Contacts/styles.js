// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const ContactList = styled.div`
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

export const ContactsPanel = styled.div`
    display: flex;
    flex-direction: column;
    padding: 12px;
    width: 100%;
    background-color: ${props => props.theme.primaryBackground};
    border-radius: 9px;
    margin-bottom: 12px;
`;

export const Row = styled.div`
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    border-bottom: 0.5px solid ${props => props.theme.border};
    padding: 6px 0;
`;
export const ButtonRow = styled.div`
    display: flex;
    width: 100%;
    align-items: center;
    gap: 12px;
`;

export const ContactListName = styled.div`
    display: flex;
    text-align: left;
    word-break: break-word;
`;

export const ButtonPanel = styled.div`
    display: flex;
    gap: 9px;
    align-items: baseline;
`;
