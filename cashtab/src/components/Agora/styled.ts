// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const Wrapper = styled.div`
    width: 100%;
    @media (max-width: 768px) {
        padding: 0 10px;
    }
`;
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
export const OfferTable = styled.div<{ renderedOfferCount?: number }>`
    display: grid;
    grid-template-columns: repeat(
        ${props =>
            props.renderedOfferCount && props.renderedOfferCount < 5
                ? props.renderedOfferCount
                : '5'},
        1fr
    );
    gap: 16px;
    width: 100%;
    margin-top: 20px;

    /* Ensure all grid items have equal width */
    > * {
        min-width: 0;
        max-width: 100%;
    }

    grid-template-columns: repeat(4, 1fr);

    @media (max-width: 1400px) {
        grid-template-columns: repeat(3, 1fr);
    }
    @media (max-width: 1090px) {
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

export const SectionTitle = styled.h3`
    margin: 20px 0 8px;
    color: ${props => props.theme.primaryText};
    font-size: var(--text-lg);
    font-weight: 600;
    text-align: left;
`;

export const TokenList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
    margin-top: 12px;
    background: ${props => props.theme.secondaryBackground};
    border-radius: 8px;
    overflow: hidden;
`;

/** Same footprint as a Swap pair TokenRow so Agora does not jump. */
export const SwapStatusRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 12px 16px;
    min-height: 74px;
    box-sizing: border-box;
    color: ${props => props.theme.secondaryText};
    font-size: var(--text-base);
    text-align: center;
    @media (max-width: 768px) {
        min-height: 64px;
    }
`;

export const SwapPairIcons = styled.div`
    display: flex;
    align-items: center;
    flex-shrink: 0;
    img {
        width: 50px;
        height: 50px;
        @media (max-width: 768px) {
            width: 40px;
            height: 40px;
        }
    }
    img + img {
        margin-left: -12px;
    }
`;

export const TokenRow = styled.a`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    color: ${props => props.theme.primaryText};
    text-decoration: none;
    transition: background-color 0.15s ease;
    border-bottom: 1px solid ${props => props.theme.primaryBackground};

    :hover {
        background-color: ${props => props.theme.accent};
        color: ${props => props.theme.primaryText};
    }

    img {
        flex-shrink: 0;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        @media (max-width: 768px) {
            width: 40px;
            height: 40px;
        }
    }
`;

export const TokenRowName = styled.span`
    font-weight: 700;
    font-size: var(--text-base);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    gap: 3px;
    text-align: left;
`;

export const TokenRowTicker = styled.span`
    color: ${props => props.theme.secondaryText};
    font-size: var(--text-sm);
    font-weight: normal;
`;

export const StatusText = styled.p`
    color: ${props => props.theme.secondaryText};
`;
