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
    font-size: var(--text-xl);
    line-height: var(--text-xl--line-height);
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

export const AgoraHeader = styled.div`
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: ${props => props.theme.primaryText};
    @media (max-width: 768px) {
        flex-direction: column;
        margin: 20px 0;
    }

    h2 {
        margin: 0;
    }

    > div {
        display: flex;
        align-items: center;
        gap: 20px;
        @media (max-width: 768px) {
            margin-top: 10px;
            gap: 0px;
            flex-direction: column;
        }
    }
`;

export const ManageSwitch = styled.span`
    cursor: pointer;
    user-select: none;
    padding-left: 20px;
    position: relative;
    :hover {
        color: ${props => props.theme.accent};
    }
    @media (max-width: 768px) {
        padding-left: 0;
        padding-top: 20px;
        margin-top: 10px;
    }
    ::after {
        content: '';
        height: 100%;
        width: 1px;
        background-color: #fff;
        position: absolute;
        left: 0;
        @media (max-width: 768px) {
            width: 100%;
            height: 1px;
            top: 0px;
        }
    }
`;

export const SortSwitch = styled.div<{ active: boolean; disabled: boolean }>`
    cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
    user-select: none;
    opacity: ${props => (props.disabled ? '0.5' : '1')};
    padding: 5px 10px;
    border-radius: 5px;
    background-color: ${props =>
        props.active ? props.theme.secondaryBackground : ''};
    position: relative;
    > div {
        position: absolute;
        right: -12px;
        top: 50%;
        transform: translateY(-50%);
    }
`;
