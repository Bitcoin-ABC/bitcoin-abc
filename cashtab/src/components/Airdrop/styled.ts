// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const AirdropForm = styled.div`
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    svg {
        height: 24px;
        width: 24px;
    }
`;
export const FormRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: ${props => props.theme.primaryText};
`;
export const SwitchHolder = styled.div`
    display: flex;
    align-content: center;
    gap: 12px;
`;
export const AirdropTitle = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    text-align: center;
    justify-content: center;
`;
