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

export const OfferWrapper = styled.div`
    background-color: ${props => props.theme.modal.background};
    margin-bottom: 20px;
    border-radius: ${props => (props.borderRadius ? '20px' : '0 0 20px 20px')};
    border: 1px solid ${props => props.theme.lightGrey};
`;

export const OfferHeader = styled.div`
    display: flex;
    align-items: center;
    width: 100%;
    padding: 30px 20px;
    text-align: left;
`;
export const OfferTitleCtn = styled.div`
    display: flex;
    flex-direction: column;
    word-break: break-all;
    margin-left: 14px;
    align-items: flex-start;
    a {
        margin: 0;
        font-size: 24px;
        line-height: 1.2em;
        color: ${props => props.theme.contrast};
        font-weight: 600;
        text-decoration: none;
        :hover {
            color: ${props => props.theme.eCashBlue};
        }
    }
`;

export const OfferIcon = styled.button`
    cursor: pointer;
    border: none;
    background-color: transparent;
    width: 96px;
    height: 96px;
    flex-shrink: 0;
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
`;

export const DepthBarCol = styled.div`
    width: 100%;
    max-height: 110px;
    overflow-y: auto;
    ${CashtabScroll}
    display: flex;
    flex-direction: column-reverse;
`;

export const OrderBookRow = styled.button`
    color: ${props =>
        props.selected
            ? `${props.theme.contrast}!important`
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
    font-size: 16px;
    z-index: 1;
`;

export const DepthBar = styled.div`
    display: flex;
    flex-direction: row;
    position: absolute;
    top: 0;
    right: 0;
    background-color: ${props => props.theme.eCashBlue};
    background-color: rgba(0, 0, 0, 0.3);
    height: 100%;
    width: ${props => props.depthPercent}%;
`;

export const TentativeAcceptBar = styled.div`
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
    padding: 30px 20px 0px;
    /* border-top: 1px solid ${props => props.theme.lightGrey}; */
    & > span {
        margin-right: 10px;
        font-weight: 600;
        font-size: 18px;
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
    color: ${props => props.theme.contrast};
    & > div {
        font-size: 18px;
        opacity: 0.7;
    }
    h3 {
        font-size: 20px;
        margin: 0;
    }
    button {
        font-size: 16px;
        padding: 20px 10px;
        margin-top: 30px;
        margin-bottom: 0;
    }
`;
