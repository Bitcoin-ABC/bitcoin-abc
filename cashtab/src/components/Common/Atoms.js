// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';
import { Link } from 'react-router-dom';

export const WarningFont = styled.div`
    color: ${props => props.theme.wallet.text.primary};
`;

export const LoadingCtn = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 400px;
    flex-direction: column;

    svg {
        width: 50px;
        height: 50px;
        fill: ${props => props.theme.eCashBlue};
    }
`;

export const TxLink = styled.a`
    color: ${props => props.theme.primary};
`;

export const FormLabel = styled.label`
    font-size: 16px;
    margin-bottom: 5px;
    text-align: left;
    width: 100%;
    display: inline-block;
    color: ${props => props.theme.contrast};
`;

export const WalletInfoCtn = styled.div`
    background: ${props => props.theme.walletInfoContainer};
    padding: 12px 20px;
`;

export const TokenParamLabel = styled.span`
    font-weight: bold;
`;

export const AlertMsg = styled.p`
    color: ${props => props.theme.forms.error} !important;
`;

export const ConvertAmount = styled.div`
    color: ${props => props.theme.contrast};
    width: 100%;
    font-size: 14px;
    margin-bottom: 10px;
    @media (max-width: 768px) {
        font-size: 12px;
    }
`;

export const StyledLink = styled(Link)`
    color: ${props => props.theme.buttons.styledLink};
    text-decoration: none;
    padding: 8px;
    position: relative;
    border: solid 1px silver;
    border-radius: 10px;
`;

export const SwitchLabel = styled.div`
    text-align: left;
    color: ${props => props.theme.contrast};
    font-size: 18px;
`;
