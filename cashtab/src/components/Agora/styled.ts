// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const ActiveOffers = styled.div`
    color: ${props => props.theme.primaryText};
    width: 100%;
    h2 {
        margin: 0 0 20px;
        margin-top: 10px;
    }
`;
export const OfferTitle = styled.div`
    margin-top: 12px;
    margin-bottom: 12px;
    color: ${props => props.theme.primaryText};
    font-size: 20px;
    text-align: center;
    font-weight: bold;
`;
export const OfferTable = styled.div`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
    width: 100%;
    margin-top: 20px;
    @media (max-width: 1600px) {
        grid-template-columns: repeat(4, 1fr);
    }
    @media (max-width: 1400px) {
        grid-template-columns: repeat(3, 1fr);
    }
    @media (max-width: 1000px) {
        grid-template-columns: repeat(2, 1fr);
    }
    @media (max-width: 768px) {
        display: flex;
        flex-direction: column;
    }
`;
export const OfferCol = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;
