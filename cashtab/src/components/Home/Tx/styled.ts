// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled, { css } from 'styled-components';
import { Link } from 'react-router-dom';
import { XecTxType } from 'chronik';

export const TxWrapper = styled.div`
    background-color: ${props => props.theme.secondaryBackground}B3;
    display: flex;
    flex-direction: column;
    padding: 12px;
    border-radius: 6px;
    svg {
        width: 33px;
        height: 33px;
    }
    img {
        height: 33px;
    }
    box-sizing: border-box;
    *,
    *:before,
    *:after {
        box-sizing: inherit;
    }
    @media (max-width: 768px) {
        padding: 10px;
    }
`;
export const Collapse = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    cursor: pointer;
`;
const Incoming = css`
    color: ${props => props.theme.accent};
    fill: ${props => props.theme.accent};
`;
const Genesis = css`
    color: ${props => props.theme.genesisGreen};
    fill: ${props => props.theme.genesisGreen};
    svg {
        fill: ${props => props.theme.genesisGreen};
    }
    path {
        fill: ${props => props.theme.genesisGreen};
    }
    g {
        fill: ${props => props.theme.genesisGreen};
    }
`;
const Burn = css`
    color: ${props => props.theme.secondaryAccent};
    fill: ${props => props.theme.secondaryAccent};
    svg {
        fill: ${props => props.theme.secondaryAccent};
    }
    path {
        fill: ${props => props.theme.secondaryAccent};
    }
    g {
        fill: ${props => props.theme.secondaryAccent};
    }
`;
export const MainRow = styled.div<{
    type?: XecTxType;
}>`
    display: flex;
    justify-content: space-between;
    flex-direction: row;
    align-items: center;
    gap: 12px;
    width: 100%;
    color: ${props => props.theme.primaryText};
    fill: ${props => props.theme.primaryText};
    ${props =>
        (props.type === 'Received' ||
            props.type === 'Staking Reward' ||
            props.type === 'Coinbase Reward') &&
        Incoming}
`;
export const MainRowLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    @media (max-width: 768px) {
        flex-direction: column;
        gap: 8px;
        align-items: flex-start;
    }
`;
export const IconCtn = styled.div<{ receive?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${props =>
        props.receive
            ? `${props.theme.accent}20`
            : `${props.theme.primaryText}20`};
    border-radius: 50%;
    padding: 12px;
    svg {
        width: 25px;
        height: 25px;
    }
    @media (max-width: 768px) {
        padding: 8px;
        svg {
            width: 15px;
            height: 15px;
        }
    }
`;
export const AppTxIcon = styled.div``;
export const TxDescCol = styled.div`
    flex-direction: row;
`;
// Top row of TxDescCol
export const TxDescSendRcvMsg = styled.div`
    display: inline-block;
`;
export const TxDesc = styled.div`
    display: flex;
    flex-wrap: wrap;
    text-align: left;
    width: 100%;
    align-items: center;
    gap: 6px;
`;
// Bottom row of TxDescCol
export const Timestamp = styled.div`
    display: flex;
    align-items: center;
    width: 100%;
    text-align: left;
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
    color: ${props => props.theme.secondaryText};
    margin-top: 4px;
    opacity: 0.8;
`;

export const TimestampSeperator = styled.div`
    margin: 0 8px;
`;
export const Ellipsis = styled.div`
    @keyframes blink {
        0% {
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }
    span {
        opacity: 0;
        animation: blink 1.2s infinite;
    }
    span:nth-child(1) {
        animation-delay: 0s;
    }
    span:nth-child(2) {
        animation-delay: 0.2s;
    }
    span:nth-child(3) {
        animation-delay: 0.4s;
    }
`;
export const AmountCol = styled.div`
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
    text-align: right;
`;
// Top row of TxAmountCol
export const AmountTop = styled.div`
    font-weight: 600;
    :hover {
        text-decoration: underline;
    }
`;
export const AmountBottom = styled.div`
    color: ${props => props.theme.secondaryText};
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
`;
export const CashtabMsg = styled.div`
    display: flex;
    width: 100%;
`;
export const TokenEntry = styled.div`
    display: flex;
    width: 100%;
`;
// Button panel for actions on each tx
export const Expand = styled.div<{ showPanel: boolean }>`
    display: flex;
    overflow: hidden;
    height: ${props => (props.showPanel ? '36px' : '0px')};
    visibility: ${props => (props.showPanel ? 'visible' : 'collapse')};
    transition: all 0.5s ease-out;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
    margin-top: ${props => (props.showPanel ? '20px' : '0px')};
    svg {
        height: 33px;
        width: 33px;
        fill: ${props => props.theme.primaryText};
    }
    path {
        fill: ${props => props.theme.primaryText};
    }
    g {
        fill: ${props => props.theme.primaryText};
    }
`;
export const ExpandButtonPanel = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
`;
export const PanelButton = styled.button`
    border: none;
    background: none;
    cursor: pointer;
`;
export const PanelLink = styled(Link)`
    border: none;
    background: none;
    cursor: pointer;
`;
export const ReplyLink = styled(PanelLink)`
    margin-left: auto;
`;
export const AddressLink = styled.a`
    padding: 0 3px;
`;
export const AppAction = styled.div<{ type?: string }>`
    word-break: break-all;
    ${props => props.type === 'Received' && Incoming}
    background: ${props => props.theme.primaryText}10;
    background: ${props => props.theme.primaryBackground};
    padding: 10px;
    border-radius: 6px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
`;
export const AppDescLabel = styled.div<{ noWordBreak?: boolean }>`
    word-break: ${props => (props.noWordBreak ? 'normal' : 'break-all')};
`;
export const MessageLabel = styled.div`
    font-size: var(--text-sm);
    color: ${props => props.theme.secondaryText};
    display: flex;
    align-items: center;

    svg {
        width: 15px;
        height: 15px;
        margin-right: 6px;
    }
`;
export const IconAndLabel = styled.div`
    display: flex;
    gap: 6px;
    align-items: center;
`;
export const AppDescMsg = styled.div`
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-all;
    text-align: left;
    width: 100%;
    margin-top: 5px;
`;

export const TokenActionHolder = styled.div``;
export const TokenInfoCol = styled.div`
    display: flex;
    flex-direction: column;
`;
export const UnknownMsgColumn = styled.div`
    display: flex;
    flex-direction: column;
    text-align: left;
`;
export const TokenType = styled.div``;
export const TokenName = styled(PanelLink)`
    text-decoration: none;
`;
export const TokenTicker = styled.div``;
export const TokenDesc = styled.div``;
export const ActionLink = styled.a``;

export const TokenAction = styled(AppAction)<{
    tokenTxType?: string;
    noWordBreak?: boolean;
}>`
    word-break: ${props => (props.noWordBreak ? 'normal' : 'break-all')};
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    ${props => props.tokenTxType === 'Received' && Incoming}
    ${props =>
        (props.tokenTxType === 'Created' || props.tokenTxType === 'Minted') &&
        Genesis}
        ${props => props.tokenTxType === 'Burned' && Burn}
        @media (max-width: 768px) {
        font-size: var(--text-sm);
        line-height: var(--text-sm--line-height);
        ${TokenInfoCol} {
            text-align: left;
        }

        ${TokenDesc} {
            text-align: right;
            margin-left: 10px;
        }

        ${IconAndLabel} {
            gap: 3px;
            flex-direction: column;
            margin-right: 20px;
            word-break: normal;

            svg {
                width: 18px;
                height: 18px;
            }

            img {
                width: 20px;
                height: 20px;
            }
        }
    }
    ${IconAndLabel} {
        svg {
            fill: ${props =>
                props.tokenTxType === 'GENESIS'
                    ? props => props.theme.genesisGreen
                    : 'white'};
        }
    }
`;

export const AirdropHeader = styled.div<{ message?: boolean }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    flex-wrap: wrap;
    margin-bottom: ${props => (props.message ? '20px' : '0')};
`;

export const AirdropIconCtn = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

export const TxInfoModalParagraph = styled.p`
    color: ${props => props.theme.primaryText};
    text-align: left;
    padding: 12px;
`;
