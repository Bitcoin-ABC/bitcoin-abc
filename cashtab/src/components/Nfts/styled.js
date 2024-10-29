// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';
import { token as tokenConfig } from 'config/token';

export const NftsCtn = styled.div`
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
export const OfferIcon = styled.div`
    display: flex;
    width: 128px;
    height: 128px;
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
`;
export const OfferCol = styled.div`
    width: 30%;
    min-width: 128px;
    display: flex;
    flex-direction: column;
`;
