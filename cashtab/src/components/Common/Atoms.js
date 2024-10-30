// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled, { css } from 'styled-components';
import { Link } from 'react-router-dom';

export const CashtabScroll = css`
    &::-webkit-scrollbar {
        width: 12px;
    }

    &::-webkit-scrollbar-track {
        -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
        background-color: ${props => props.theme.eCashBlue};
        border-radius: 10px;
        height: 80%;
    }

    &::-webkit-scrollbar-thumb {
        border-radius: 10px;
        color: ${props => props.theme.eCashBlue};
        -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.5);
    }
`;

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
    word-break: break-all;
`;

export const Alert = styled.div`
    background-color: #fff2f0;
    border-radius: 12px;
    color: red;
    padding: 12px;
    margin: 12px 0;
    word-break: break-all;
`;
export const Info = styled.div`
    background-color: #fff2f0;
    border-radius: 12px;
    color: ${props => props.theme.eCashBlue};
    padding: 12px;
    margin: 12px 0;
`;
export const BlockNotification = styled.div`
    display: flex;
    flex-direction: column;
`;
export const BlockNotificationLink = styled.a`
    display: flex;
    justify-content: flex-start;
    width: 100%;
    color: ${props => props.theme.walletBackground};
    text-decoration: none;
`;
export const BlockNotificationDesc = styled.div`
    display: flex;
    justify-content: flex-start;
    width: 100%;
`;
