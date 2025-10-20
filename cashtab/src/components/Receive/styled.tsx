// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const ReceiveFormFlex = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    justify-content: center;
    gap: 12px;
`;
export const Row = styled.div<{ qrWidth?: number }>`
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: row;
    width: 100%;
    gap: 12px;
    ${props => props.qrWidth && `max-width: ${props.qrWidth}px;`}
    color: ${props => props.theme.primaryText};
`;

export const FirmaRow = styled.div<{ qrWidth: number }>`
    display: flex;
    align-items: flex-start;
    flex-direction: row;
    width: 100%;
    gap: 12px;
    max-width: ${props => props.qrWidth}px;
    color: ${props => props.theme.primaryText};

    /* Align switch with the input field (not the error message) */
    & > div:first-child {
        margin-top: 12px;
    }
`;

export const ReceiveCtn = styled.div`
    width: 100%;
    h2 {
        color: ${props => props.theme.primaryText};
        margin: 0 0 20px;
        margin-top: 10px;
    }
    ${ReceiveFormFlex} {
        padding-top: 12px;
        background: ${props => props.theme.primaryBackground};
        padding: 20px;
        border-radius: 10px;
    }
`;
