// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled, { css } from 'styled-components';
import { CopyIconButton } from 'components/Common/Buttons';
import { explorer } from 'config/explorer';

export const CashtabScroll = css`
    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-track {
        -webkit-box-shadow: inset 0 0 0 rgba(0, 0, 0, 0);
        background-color: ${props => props.theme.secondaryBackground};
    }

    &::-webkit-scrollbar-thumb {
        border-radius: 10px;
        background-color: ${props => props.theme.accent};
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
        fill: ${props => props.theme.accent};
    }
`;

export const TxLink = styled.a`
    color: ${props => props.theme.primary};
`;

export const TokenParamLabel = styled.span`
    font-weight: bold;
`;

export const AlertMsg = styled.p`
    color: ${props => props.theme.formError} !important;
`;

export const ConvertAmount = styled.div`
    color: ${props => props.theme.primaryText};
    width: 100%;
    font-size: 14px;
    margin-bottom: 10px;
    @media (max-width: 768px) {
        font-size: 12px;
    }
`;

export const SwitchLabel = styled.div`
    text-align: left;
    color: ${props => props.theme.primaryText};
    font-size: 18px;
    word-break: break-all;
`;

export const Alert = styled.div<{ noWordBreak?: boolean }>`
    background-color: #fff2f0;
    border-radius: 12px;
    color: red;
    padding: 12px;
    margin: 12px 0;
    ${props =>
        typeof props.noWordBreak === 'undefined' && `word-break: break-all`};
`;
export const Info = styled.div`
    background-color: #fff2f0;
    border-radius: 12px;
    color: ${props => props.theme.accent};
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
    text-decoration: none;
`;
export const BlockNotificationDesc = styled.div`
    display: flex;
    justify-content: flex-start;
    width: 100%;
`;

export const TokenIdAndCopyIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    svg {
        width: 18px;
        height: 18px;
        :hover {
            g {
                fill: ${props => props.theme.secondaryAccent};
            }
            fill: ${props => props.theme.secondaryAccent};
        }
    }
`;

interface TokenIdPreviewProps {
    tokenId: string;
}
export const TokenIdPreview: React.FC<TokenIdPreviewProps> = ({ tokenId }) => {
    return (
        <TokenIdAndCopyIcon>
            <a
                href={`${explorer.blockExplorerUrl}/tx/${tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
            >
                {tokenId.slice(0, 3)}
                ...
                {tokenId.slice(-3)}
            </a>
            <CopyIconButton
                name={`Copy Token ID`}
                data={tokenId}
                showToast
                customMsg={`Token ID "${tokenId}" copied to clipboard`}
            />
        </TokenIdAndCopyIcon>
    );
};

export const PageHeader = styled.h2`
    margin: 0;
    margin-top: 20px;
    color: ${props => props.theme.primaryText};
    display: flex;
    align-items: center;
    justify-content: center;
    svg {
        height: 30px;
        width: 30px;
        margin-left: 10px;
    }
    svg path {
        fill: #fff !important;
    }
`;

const CopyTokenIdWrapper = styled.div`
    display: flex;
    align-items: center;
    color: ${props => props.theme.secondaryText};
    svg {
        width: 16px;
        height: 16px;
        g {
            fill: ${props => props.theme.secondaryText};
        }
        fill: ${props => props.theme.secondaryText};
        :hover {
            g {
                fill: ${props => props.theme.secondaryAccent};
            }
            fill: ${props => props.theme.secondaryAccent};
        }
    }
    button {
        display: flex;
        align-items: center;
    }
`;
interface CopyTokenIdProps {
    tokenId: string;
}
export const CopyTokenId: React.FC<CopyTokenIdProps> = ({ tokenId }) => {
    return (
        <CopyTokenIdWrapper>
            {tokenId.slice(0, 3)}
            ...
            {tokenId.slice(-3)}
            <CopyIconButton
                name={`Copy Token ID`}
                data={tokenId}
                showToast
                customMsg={`Token ID "${tokenId}" copied to clipboard`}
            />
        </CopyTokenIdWrapper>
    );
};
