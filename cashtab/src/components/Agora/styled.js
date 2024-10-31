// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

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
export const OfferCol = styled.div`
    min-width: 128px;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;
