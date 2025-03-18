// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';
import { token as tokenConfig } from 'config/token';
import { CashtabScroll } from 'components/Common/Atoms';

export const OrderBookLoading = styled.div`
    display: flex;
    justify-content: center;
    width: 100%;
    margin: 12px auto;
`;

export const OfferWrapper = styled.div<{ borderRadius: boolean }>`
    border-radius: ${props => (props.borderRadius ? '20px' : '0 0 20px 20px')};
    border: 1px solid ${props => props.theme.border};
    width: 100%;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    background: ${props =>
        !props.borderRadius
            ? props.theme.primaryBackground
            : `linear-gradient(
        0deg,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.1) 100%
    )`};
    border-top: ${props => (!props.borderRadius ? 'none' : '')};
    @media (max-width: 768px) {
        margin-bottom: 20px;
        width: 100%;
    }
`;

export const OfferHeader = styled.div<{ noIcon?: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding: ${props => (props.noIcon ? '0 20px 0 20px' : '20px 20px 0')};
    text-align: left;
    border-radius: 20px 20px 0 0;
`;

export const OfferHeaderRow = styled.div<{ noIcon?: boolean }>`
    display: flex;
    align-items: center;
    width: 100%;
    justify-content: space-between;
    margin-top: ${props => (props.noIcon ? '0' : '20px')};
    margin-bottom: 20px;
    color: ${props => props.theme.primaryText};
`;

export const OfferTitleCtn = styled.div`
    display: flex;
    flex-direction: column;
    word-break: break-all;
    align-items: center;
    margin-top: 20px;
    a {
        margin: 0;
        font-size: var(--text-2xl);
        line-height: var(--text-2xl--line-height);
        height: 1.2em;
        overflow: hidden;
        color: ${props => props.theme.primaryText};
        font-weight: 600;
        text-decoration: none;
        text-align: center;
        :hover {
            color: ${props => props.theme.accent};
        }
    }

    span {
        color: ${props => props.theme.secondaryText};
    }
`;

export const OfferIcon = styled.button<{ size: number; tokenId: string }>`
    cursor: pointer;
    border: none;
    background-color: transparent;
    width: 96px;
    height: 96px;
    flex-shrink: 0;
    border-radius: 96px;
    background: url(${props =>
            `${tokenConfig.tokenIconsUrl}/${props.size}/${props.tokenId}.png`})
        center no-repeat;
    background-size: 100% 100%;
    transition: all ease-in-out 200ms;
    :hover {
        transform: scale(1.2);
    }
`;

export const OfferDetailsCtn = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
`;

export const DepthBarCol = styled.div<{ noIcon?: boolean }>`
    width: 100%;
    max-height: 110px;
    overflow-y: auto;
    ${CashtabScroll}
    display: flex;
    flex-direction: column-reverse;
    max-height: ${props => (props.noIcon ? '150px' : '110px')};
`;

export const OrderBookRow = styled.button<{ selected: boolean }>`
    color: ${props =>
        props.selected
            ? `${props.theme.primaryText}!important`
            : 'rgba(255, 255, 255, 0.6)'};
    font-weight: ${props => (props.selected ? '600' : '400')};
    height: 32px !important;
    cursor: pointer;
    background-color: rgba(0, 0, 0, 0.3);
    display: flex;
    border: none;
    width: 100%;
    justify-content: center;
    align-items: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-color: ${props =>
        props.selected
            ? `rgba(0, 231, 129, 0.6)!important`
            : 'rgba(0,0,0, 0.3)'};
    flex-shrink: 0;
    position: relative;
    :hover {
        color: #fff;
    }
`;

export const OrderbookPrice = styled.div`
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
    z-index: 1;
`;

export const DepthBar = styled.div<{
    depthPercent: number;
    isMaker: boolean;
    isUnacceptable: boolean;
}>`
    display: flex;
    flex-direction: row;
    position: absolute;
    top: 0;
    right: 0;
    background-color: ${props =>
        props.isMaker
            ? props.isUnacceptable
                ? props.theme.agoraDepthBarUnacceptable
                : props.theme.agoraDepthBarOwnOffer
            : props.theme.agoraDepthBar};
    height: 100%;
    width: ${props => props.depthPercent}%;
`;

export const TentativeAcceptBar = styled.div<{ acceptPercent: number }>`
    display: flex;
    flex-direction: row;
    position: absolute;
    top: 0;
    right: 0;
    background-color: ${props => props.theme.genesisGreen};
    height: 100%;
    width: ${props => props.acceptPercent}%;
`;

export const SliderRow = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    padding: 20px 20px 0px;
    & > span {
        margin-right: 10px;
        font-weight: 600;
        font-size: var(--text-lg);
        line-height: var(--text-lg--line-height);
        color: ${props => props.theme.genesisGreen};
    }
    input {
        accent-color: ${props => props.theme.genesisGreen};
    }
`;

export const BuyOrderCtn = styled.div`
    display: flex;
    flex-direction: column;
    word-break: break-all;
    padding: 20px;
    color: ${props => props.theme.primaryText};
    border-radius: 0 0 20px 20px;
    flex-grow: 1;
    align-items: flex-end;
    text-align: right;
    & > div {
        font-size: var(--text-lg);
        line-height: var(--text-lg--line-height);
        opacity: 0.7;
    }
    h3 {
        font-size: var(--text-2xl);
        margin: 0;
        margin-bottom: 20px;
    }
    button {
        font-size: var(--text-base);
        line-height: var(--text-base--line-height);
        padding: 14px 10px;
        border-radius: 4px;
        margin-top: 30px;
        margin-bottom: 0;
        margin-top: auto;
    }
`;
export const MintIconSpotWrapper = styled.div`
    svg {
        height: 24px;
        width: 24px;
    }
`;

export const DeltaSpan = styled.span`
    color: ${props => props.theme.secondaryAccent};
`;

export const AgoraWarningParagraph = styled.div`
    font-weight: bold;
    text-align: center;
    color: ${props => props.theme.secondaryAccent};
`;
