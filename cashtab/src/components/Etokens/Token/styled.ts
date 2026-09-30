// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const OuterCtn = styled.div`
    max-width: 700px;
    margin: auto;
    margin-top: 20px;
    @media (max-width: 768px) {
        padding: 0 10px;
    }
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

/** Shared section container for Buy, Redeem, Send, etc. */
export const SectionCtn = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 20px;
    border-radius: 0 0 20px 20px;
    background-color: ${props => props.theme.secondaryBackground};
    border-top: 1px solid ${props => props.theme.primaryBackground};
`;

/** Optional section title label (e.g. when the primary input has no label prop) */
export const SectionLabel = styled.span`
    display: block;
    font-size: var(--text-lg);
    line-height: var(--text-lg--line-height);
    font-weight: 600;
    color: ${props => props.theme.primaryText};
    margin-bottom: 10px;
    text-align: left;
`;

export const TokenStatsTable = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 100%;
    color: ${props => props.theme.primaryText};
    border-radius: 20px 20px 0 0;
    padding: 0;
    border-bottom: none;
    background-color: ${props => props.theme.secondaryBackground};
`;

export const TokenStatsRowCtn = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid ${props => props.theme.primaryBackground};
    padding: 15px;
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
    justify-content: flex-start;
    display: flex;
    gap: 8px;
    text-align: left;
    border-bottom: 1px solid ${props => props.theme.primaryBackground};
    padding: 15px;
    img {
        width: 60px;
        height: 60px;
    }
    h2 {
        margin: 0;
        font-size: var(--text-2xl);
        line-height: var(--text-2xl--line-height);
        font-weight: 600;
    }
    span {
        color: ${props => props.theme.secondaryText};
    }
`;
export const TokenUrlCol = styled.div`
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
export const TokenStatsTableRow = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 20px;
    justify-content: space-between;
    margin-top: 5px;
    font-size: var(--text-sm);
    color: ${props => props.theme.primaryText};
    label {
        flex-shrink: 0;
        color: ${props => props.theme.secondaryText};
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
            color: ${props => props.theme.primaryText};
            :hover {
                color: ${props => props.theme.accent};
                text-decoration: underline;
            }
        }

        svg {
            width: 16px;
            height: 16px;
            g {
                fill: ${props => props.theme.primaryText};
            }
            fill: ${props => props.theme.primaryText};
            :hover {
                g {
                    fill: ${props => props.theme.accent};
                }
                fill: ${props => props.theme.accent};
            }
        }
    }
`;

export const TokenInfoRow = styled.div<{ expand?: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 20px;
    justify-content: space-between;
    font-size: var(--text-base);
    label {
        font-weight: bold;
    }
    svg {
        width: 20px;
        height: 20px;
    }
    ${props =>
        props.expand &&
        `
        margin-top: 8px;
        cursor: pointer;
        user-select: none;
        :hover {
            color: ${props.theme.accent};
            path {
                
                fill: ${props.theme.accent};
            }
        }
    `}
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

export const TokenActionBar = styled.div`
    display: flex;
    align-items: center;
    width: 100%;
    flex-wrap: wrap;
    background: ${props => props.theme.secondaryBackground};
`;

export const TokenActionBtn = styled.button<{ $active?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 18px;
    font-size: var(--text-base);
    cursor: pointer;
    border: none;
    flex-grow: 1;
    height: 40px;
    color: ${props => props.theme.primaryText};
    border-right: 1px solid ${props => props.theme.primaryBackground};
    background-color: ${props =>
        props.$active ? props.theme.accent : props.theme.secondaryBackground};
    transition:
        background-color 0.15s ease,
        color 0.15s ease;

    :hover:not(:disabled) {
        background-color: ${props =>
            props.$active ? props.theme.accent : props.theme.border};
    }
    :disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export const TokenActionMoreWrap = styled.div`
    position: relative;
    margin-left: auto;
`;

export const TokenActionDropdown = styled.div<{ $open: boolean }>`
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    min-width: 180px;
    padding: 8px 0;
    border-radius: 10px;
    background-color: ${props => props.theme.secondaryBackground};
    border: 1px solid ${props => props.theme.border};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10;
    display: ${props => (props.$open ? 'block' : 'none')};
`;

export const TokenActionDropdownItem = styled.button<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 16px;
    border: none;
    background: none;
    color: ${props =>
        props.$disabled ? props.theme.secondaryText : props.theme.primaryText};
    font-size: var(--text-base);
    text-align: left;
    cursor: ${props => (props.$disabled ? 'not-allowed' : 'pointer')};
    opacity: ${props => (props.$disabled ? 0.6 : 1)};

    :hover:not(:disabled) {
        background-color: ${props => props.theme.formBorder};
    }
`;

export const ButtonDisabledMsg = styled.div`
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
    color: ${props => props.theme.formError};
    word-break: break-all;
`;
export const ButtonDisabledSpan = styled.span`
    color: ${props => props.theme.formError};
`;
export const NftTitle = styled.div`
    color: ${props => props.theme.primaryText};
    font-size: var(--text-xl);
    line-height: var(--text-xl--line-height);
    text-align: center;
    font-weight: bold;
`;
export const NftTable = styled.div`
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 9px;
    width: 100%;
    background-color: ${props => props.theme.secondaryBackground};
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
    font-size: var(--text-xl);
    line-height: var(--text-xl--line-height);
    font-weight: bold;
    color: ${props => props.theme.primaryText};
    word-break: break-all;
`;
export const NftCollectionTitle = styled.div`
    font-size: var(--text-lg);
    line-height: var(--text-lg--line-height);
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
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
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

/** XEC / AlpDex redeem destination switch with rates. */
export const RedeemOutputSwitch = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    width: 100%;
    margin-bottom: 16px;
`;

export const RedeemOutputOption = styled.button<{ $active?: boolean }>`
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 12px;
    /* Title + rate + fiat + reserved impact line */
    min-height: 118px;
    border-radius: 12px;
    border: 1px solid
        ${props => (props.$active ? props.theme.accent : props.theme.border)};
    background: ${props =>
        props.$active
            ? props.theme.primaryBackground
            : props.theme.secondaryBackground};
    color: ${props => props.theme.primaryText};
    cursor: pointer;
    text-align: left;
    &:hover {
        border-color: ${props => props.theme.accent};
    }
`;

export const RedeemOutputOptionTitle = styled.span`
    font-size: var(--text-base);
    font-weight: 700;
    line-height: 1.2;
`;

export const RedeemOutputOptionRate = styled.span`
    display: block;
    min-height: var(--text-sm--line-height);
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
    color: ${props => props.theme.secondaryText};
    font-variant-numeric: tabular-nums;
`;

export const RedeemOutputOptionImpact = styled.span<{ $warn?: boolean }>`
    display: block;
    min-height: var(--text-sm--line-height);
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${props =>
        props.$warn ? props.theme.formError : props.theme.secondaryText};
`;

export const RedeemBestDealFlare = styled.span`
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 2px 6px;
    border-radius: 9999px;
    background: ${props => props.theme.genesisGreen};
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0.02em;
    text-transform: uppercase;
`;

export const RedeemAmountInputWrap = styled.div`
    width: 100%;
    margin-top: 12px;
`;
