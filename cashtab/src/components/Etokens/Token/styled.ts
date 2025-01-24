// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const OuterCtn = styled.div`
    background-color: ${props => props.theme.primaryBackground};
    padding: 20px;
    border-radius: 10px;
    max-width: 700px;
    margin: auto;
`;

export const TokenScreenWrapper = styled.div`
    color: ${props => props.theme.primaryText};
    width: 100%;
    h2 {
        margin: 0 0 20px;
        margin-top: 10px;
    }
`;

export const InfoModalParagraph = styled.p`
    color: ${props => props.theme.primaryText};
    text-align: left;
`;
export const DataAndQuestionButton = styled.div`
    display: flex;
    align-items: center;
`;
export const TokenIconExpandButton = styled.button`
    cursor: pointer;
    border: none;
    background-color: transparent;
`;
export const SendTokenForm = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 12px;
`;
export const SendTokenFormRow = styled.div`
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin: 3px;
`;
export const InputRow = styled.div`
    width: 100%;
`;

export const TokenStatsTable = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 100%;
    color: ${props => props.theme.primaryText};
    border-radius: 20px 20px 0 0;
    padding: 20px;
    border: 1px solid ${props => props.theme.border};
    border-bottom: none;
    background: linear-gradient(
        0deg,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.1) 100%
    );
`;

export const TokenStatsRowCtn = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    border-top: 1px solid ${props => props.theme.border};
    border-bottom: 1px solid ${props => props.theme.border};
    padding: 20px 0;
    margin-top: 20px;
`;
export const TokenStatsRow = styled.div`
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    text-align: center;
    justify-content: center;
    gap: 3px;
`;
export const TokenStatsCol = styled.div`
    align-items: center;
    justify-content: center;
    display: flex;
    flex-direction: column;
    h2 {
        margin: 0;
        font-size: 26px;
        line-height: 1.2em;
        font-weight: 600;
        text-align: center;
    }
    span {
        color: ${props => props.theme.secondaryText};
    }
`;
export const TokenUrlCol = styled(TokenStatsCol)`
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    max-width: 300px;
    @media (max-width: 768px) {
        max-width: 200px;
    }
    @media (max-width: 400px) {
        max-width: 124px;
    }
`;
export const TokenStatsTableRow = styled.div<{ balance?: boolean }>`
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 20px;
    justify-content: space-between;
    color: ${props =>
        props.balance ? props.theme.primaryText : props.theme.secondaryText};
    font-size: ${props => (props.balance ? '18px' : '16px')};
    @media (max-width: 768px) {
        font-size: ${props => (props.balance ? '16px' : '14px')};
    }
    margin-bottom: ${props => (props.balance ? '15px' : '0')};
    label {
        flex-shrink: 0;
    }
    > div {
        display: flex;
        align-items: center;
        word-break: break-all;
        text-align: right;
        button {
            display: flex;
            align-items: center;
            padding: 0;
            padding-left: 5px;
        }
        a {
            color: ${props => props.theme.secondaryText};
            :hover {
                color: ${props => props.theme.accent};
                text-decoration: underline;
            }
        }

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
    }
`;

export const TokenStatsLabel = styled.div`
    font-weight: bold;
    justify-content: flex-end;
    text-align: right;
    display: flex;
    width: 106px;
`;
export const SwitchHolder = styled.div`
    width: 100%;
    display: flex;
    justify-content: flex-start;
    gap: 12px;
    align-content: center;
    align-items: center;
    margin: 12px;
`;

export const ButtonDisabledMsg = styled.div`
    font-size: 14px;
    color: ${props => props.theme.formError};
    word-break: break-all;
`;
export const ButtonDisabledSpan = styled.span`
    color: ${props => props.theme.formError};
`;
export const NftTitle = styled.div`
    color: ${props => props.theme.primaryText};
    font-size: 20px;
    text-align: center;
    font-weight: bold;
`;
export const NftTable = styled.div`
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 9px;
    width: 100%;
    background-color: ${props => props.theme.secondaryBackground}
    border-radius: 9px;
    color: ${props => props.theme.primaryText};
    max-height: 220px;
    overflow: auto;
    &::-webkit-scrollbar {
        width: 12px;
    }

    &::-webkit-scrollbar-track {
        -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
        background-color: ${props => props.theme.accent};
        border-radius: 10px;
        height: 80%;
    }

    &::-webkit-scrollbar-thumb {
        border-radius: 10px;
        color: ${props => props.theme.accent};
        -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.5);
    }
`;
export const NftRow = styled.div`
    display: flex;
    flex-direction: row;
    gap: 3px;
    align-items: center;
    justify-content: center;
`;
export const NftTokenIdAndCopyIcon = styled.div`
    display: flex;
    align-items: center;
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
export const NftCol = styled.div`
    display: flex;
    flex-direction: column;
    svg {
        width: 18px;
        height: 18px;
    }
    gap: 6px;
`;
export const NftNameTitle = styled.div`
    margin-top: 12px;
    font-size: 24px;
    font-weight: bold;
    color: ${props => props.theme.primaryText};
    word-break: break-all;
`;
export const NftCollectionTitle = styled.div`
    font-size: 18px;
    color: ${props => props.theme.primaryText};
    word-break: break-all;
`;

export const ListPricePreview = styled.div`
    text-align: center;
    color: ${props => props.theme.primaryText};
`;
export const AgoraPreviewParagraph = styled.p`
    color: ${props => props.theme.primaryText};
`;
export const AgoraPreviewTable = styled.div`
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    font-size: 12px;
    color: ${props => props.theme.primaryText};
`;
export const AgoraPreviewRow = styled.div`
    display: flex;
    justify-content: center;
    gap: 3px;
    align-items: center;
    width: 100%;
    flex-direction: row;
`;
export const AgoraPreviewCol = styled.div`
    display: flex;
    flex-direction: column;
`;
export const AgoraPreviewLabel = styled.div`
    display: flex;
    flex-direction: column;
    font-weight: bold;
    text-align: right;
`;

export const NftOfferWrapper = styled.div`
    color: ${props => props.theme.primaryText};
    border-radius: 0 0 20px 20px;
    border: 1px solid ${props => props.theme.border};
    border-top: none;
    div {
        margin-top: 0px;
        margin-bottom: 0px;
        border-radius: 0 0 20px 20px;
    }
`;
