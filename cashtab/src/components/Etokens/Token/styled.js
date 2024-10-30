// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const TokenScreenWrapper = styled.div`
    color: ${props => props.theme.contrast};
    width: 100%;
    h2 {
        margin: 0 0 20px;
        margin-top: 10px;
    }
`;

export const InfoModalParagraph = styled.p`
    color: ${props => props.theme.contrast};
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
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    width: 100%;
    color: ${props => props.theme.contrast};
    gap: 12px;
    margin-bottom: 12px;
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
    flex-wrap: wrap;
`;
export const TokenUrlCol = styled(TokenStatsCol)`
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: 120px;
    white-space: nowrap;
`;
export const TokenStatsTableRow = styled.div`
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-start;
    gap: 3px;
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
export const TokenSentLink = styled.a`
    color: ${props => props.theme.walletBackground};
    text-decoration: none;
`;
export const AliasAddressPreviewLabel = styled.div`
    text-align: center;
    color: ${props => props.theme.forms.text};
    padding-left: 1px;
    white-space: nowrap;
`;

export const ButtonDisabledMsg = styled.div`
    font-size: 14px;
    color: ${props => props.theme.forms.error};
    word-break: break-all;
`;
export const ButtonDisabledSpan = styled.span`
    color: ${props => props.theme.forms.error};
`;
export const NftTitle = styled.div`
    color: ${props => props.theme.contrast};
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
    background-color: ${props => props.theme.panel}
    border-radius: 9px;
    color: ${props => props.theme.contrast};
    max-height: 220px;
    overflow: auto;
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
                fill: ${props => props.theme.eCashPurple};
            }
            fill: ${props => props.theme.eCashPurple};
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
    color: ${props => props.theme.contrast};
    word-break: break-all;
`;
export const NftCollectionTitle = styled.div`
    font-size: 18px;
    color: ${props => props.theme.contrast};
    word-break: break-all;
`;

export const ListPricePreview = styled.div`
    text-align: center;
    color: ${props => props.theme.contrast};
`;
export const AgoraPreviewParagraph = styled.p`
    color: ${props => props.theme.contrast};
`;
export const AgoraPreviewTable = styled.div`
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    font-size: 12px;
    color: ${props => props.theme.contrast};
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
