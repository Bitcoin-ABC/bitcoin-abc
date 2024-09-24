// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';
import { token as tokenConfig } from 'config/token';
import { Alert, CashtabScroll } from 'components/Common/Atoms';

export const ActiveOffers = styled.div`
    color: ${props => props.theme.contrast};
    width: 100%;
    h2 {
        margin: 0 0 20px;
        margin-top: 10px;
    }
`;

export const OfferTitle = styled.div`
    margin-top: 12px;
    margin-bottom: 12px;
    color: ${props => props.theme.contrast};
    font-size: 20px;
    text-align: center;
    font-weight: bold;
`;

export const OfferTable = styled.div`
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
    justify-content: center;
    width: 100%;
    gap: 9px;
`;
export const OfferIcon = styled.button`
    cursor: pointer;
    border: none;
    background-color: transparent;
    display: flex;
    margin: auto;
    width: 96px;
    height: 96px;
    background: url(${props =>
            `${tokenConfig.tokenIconsUrl}/${props.size}/${props.tokenId}.png`})
        center no-repeat;
    background-size: 100% 100%;
    transition: all ease-in-out 1s;
    :hover {
        background-size: 150% 150%;
    }
`;
export const OfferRow = styled.div`
    word-break: break-word;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 3px;
    align-items: center;
    justify-content: center;
    width: 100%;
`;
export const SliderRow = styled.div`
    word-break: break-word;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 3px;
    align-items: center;
    justify-content: center;
    min-width: 256px;
`;
export const SliderInfoRow = styled.div`
    display: flex;
    flex-direction: row;
    width: 100%;
    justify-content: center;
`;
export const OfferCol = styled.div`
    min-width: 128px;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;
export const DepthBarCol = styled.div`
    min-width: 128px;
    height: 128px;
    overflow-y: auto;
    ${CashtabScroll}
    display: flex;
    flex-direction: column-reverse;
    gap: 0px;
    align-items: flex-end;
    justify-content: end;
    flex-wrap: no-wrap;
    align-content: flex-end;
`;
export const OfferIconCol = styled.div`
    min-width: 128px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
`;
export const ChronikErrorAlert = styled(Alert)`
    margin-top: 12px;
`;
export const DepthBar = styled.div`
    display: flex;
    flex-direction: row;
    position: absolute;
    top: 0;
    right: 0;
    background-color: ${props => props.theme.eCashBlue};
    height: 100%;
    width: ${props => props.depthPercent}%;
    z-index: -2;
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
    z-index: -1;
`;

export const OrderbookPrice = styled.div`
    position: relative;
    font-size: 14px;
    line-height: 25px;
    text-align: right;
    height: 100%;
    min-width: 128px;
    z-index: 1;
    padding-right: 3px;
`;
export const OrderBookRow = styled.button`
    border: 3px solid
        ${props =>
            props.selected ? `${props.theme.genesisGreen}` : 'transparent'};
    border-radius: 5px;
    transition: border 0.5s ease-in-out;
    color: ${props => props.theme.contrast};
    height: 30px;
    padding: 0;
    cursor: pointer;
    background-color: transparent;
    display: flex;
    flex-direction: row;
    min-width: 128px;
    margin-right: 3px;
`;
