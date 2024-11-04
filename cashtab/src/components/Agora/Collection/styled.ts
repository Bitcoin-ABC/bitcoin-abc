// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';
import { token as tokenConfig } from 'config/token';
import { CollapseDownIcon } from 'components/Common/CustomIcons';

export const CollectionLoading = styled.div`
    display: flex;
    justify-content: center;
    width: 100%;
    margin: 12px auto;
`;

export const CollectionWrapper = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    color: ${props => props.theme.contrast};
    width: 100%;
    flex-grow: 1;
    margin: 12px auto;
`;
export const CollectionSummary = styled.div<{ isCollapsed: boolean }>`
    display: flex;
    justify-content: center;
    width: 100%;
    flex-direction: row;
    gap: 3px;
    flex-wrap: wrap;
    padding: 6px;
    border-radius: ${props =>
        props.isCollapsed ? '20px' : '20px 20px 0px 0px'};
    background: ${props => props.theme.modal.background};
    border-top: 1px solid ${props => props.theme.lightGrey};
    border-left: 1px solid ${props => props.theme.lightGrey};
    border-right: 1px solid ${props => props.theme.lightGrey};
    ${props =>
        props.isCollapsed &&
        `border-bottom: 1px solid ${props.theme.lightGrey}`};
`;

export const ArrowWrapper = styled.div<{ isCollapsed: boolean }>`
    width: 64px;
    height: 64px;
    display: flex;
    svg {
        height: 64px;
        width: 64px;
        transition: transform 0.3s ease;
        fill: ${props => (props.isCollapsed ? 'red' : 'blue')};
        transform: ${props =>
            props.isCollapsed ? 'rotate(-180deg)' : 'rotate(0deg)'};
    }
`;
export const Arrow = styled(CollapseDownIcon)``;

export const CollapsibleContent = styled.div<{ isCollapsed: boolean }>`
    max-height: ${props => (props.isCollapsed ? '0' : '600px')};
    width: 100%;
    overflow: hidden;
    transition: max-height 0.3s ease-out;
    ${props =>
        !props.isCollapsed &&
        `border-radius: 0 0 20px 20px;
    background: ${props.theme.modal.background};
    border-left: 1px solid ${props.theme.lightGrey};
    border-right: 1px solid ${props.theme.lightGrey};
    border-bottom: 1px solid ${props.theme.lightGrey};
        `}
`;
export const TitleAndIconAndCollapseArrow = styled.button`
    display: flex;
    flex-direction: row;
    width: 100%;
    justify-content: space-between;
    align-items: center;
    border: none;
    background-color: transparent;
    color: ${props => props.theme.contrast};
    cursor: pointer;
`;

export const CollectionTitle = styled.div`
    display: flex;
    flex-direction: column;
    word-break: break-all;
    font-size: 20px;
    font-weight: bold;
    line-height: 20px;
`;
export const CollectionIcon = styled.div`
    display: flex;
    flex-direction: column;
`;
export const CollectionInfoRow = styled.div`
    display: flex;
    flex-direction: row;
    width: 100%;
    justify-content: center;
`;

export const ListedNft = styled.div`
    display: flex;
    flex-direction: row;
    width: 100%;
    flex-wrap: wrap;
    margin-bottom: 36px;
`;
export const NftName = styled.div`
    display: flex;
    justify-content: center;
    word-break: break-all;
    width: 100%;
    line-height: 25px;
    padding: 6px 0;
`;
export const NftPrice = styled.div`
    display: flex;
    width: 100%;
    justify-content: center;
    line-height: 25px;
`;
export const NftInfoRow = styled.div`
    display: flex;
    width: 100%;
    justify-content: center;
`;
export const ButtonRow = styled(NftInfoRow)`
    margin: 6px 12px;
`;

export const NftIcon = styled.button<{ tokenId: string; size: number }>`
    cursor: pointer;
    border: none;
    background-color: transparent;
    display: flex;
    margin: auto;
    width: 256px;
    height: 256px;
    background: url(${props =>
            `${tokenConfig.tokenIconsUrl}/${props.size}/${props.tokenId}.png`})
        center no-repeat;
    background-size: 100% 100%;
    transition: all ease-in-out 1s;
    :hover {
        background-size: 150% 150%;
    }
`;
export const NftSwiperSlide = styled.div`
    background-color: ${props => props.theme.panel};
`;
export const ModalFlex = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    color: ${props => props.theme.contrast};
`;
export const ModalRow = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    width: 100%;
`;
