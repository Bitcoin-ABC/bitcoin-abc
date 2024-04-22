// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getAnimationSettings } from '/styles/framer-motion';

export const DescriptionBox = styled(motion.div).attrs(() =>
    getAnimationSettings(),
)`
    width: 100%;
    margin-bottom: -100px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    ${props => props.theme.breakpoint.medium} {
        flex-direction: column;
        margin-bottom: 40px;
    }
`;

export const ImgCtn = styled.div`
    width: 60%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    height: ${props => props.height};
    margin-left: 20px;
    ${props => props.theme.filters.grayscale}

    img {
        object-fit: contain;
    }
    ${props => props.theme.breakpoint.medium} {
        width: 100%;
        height: 250px;
    }
`;

export const TitleBox = styled(motion.div).attrs(() => getAnimationSettings())`
    width: 100%;
    border-left: 3px solid ${props => props.theme.colors.primary};
    background-image: linear-gradient(
        90deg,
        ${props => props.theme.colors.black},
        transparent 93%
    );
    margin-top: 40px;
    margin-bottom: 40px;
    padding: 10px 20px;
    font-size: 16px;
    text-transform: uppercase;
`;

export const TilesOuterCtn = styled.div`
    width: 100%;
    margin-bottom: 100px;
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(1, 1fr);
    grid-column-gap: 0px;
    grid-row-gap: 0px;
`;

export const TileImgCtn = styled.div`
    width: 100%;
    height: 60px;
    position: relative;
    opacity: 0.6;
    transition: all 200ms ease-in-out;

    img {
        object-fit: contain;
    }
`;

export const Tile = styled(motion(Link)).attrs(() => getAnimationSettings())`
    position: relative;
    padding: 50px;
    border-right: 1px solid ${props => props.theme.colors.gridlines};
    border-top: 1px solid ${props => props.theme.colors.gridlines};

    :nth-child(3n + 0) {
        border-right: none;
    }

    :nth-child(-n + 3) {
        border-top: none;
    }

    &:hover ${TileImgCtn} {
        opacity: 1;
    }
    ${props => props.theme.breakpoint.medium} {
        padding: 30px;
    }
    ${props => props.theme.breakpoint.small} {
        padding: 10px;
    }
`;

export const BlankTile = styled.div`
    border-right: none;
    border-top: 1px solid ${props => props.theme.colors.gridlines};

    :nth-child(3n + 0) {
        border-right: none;
    }
`;

export const ImageTextCtn = styled(motion.div).attrs(() =>
    getAnimationSettings(),
)`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 300px 0;
    flex-direction: ${props => (props.rightimage ? 'row-reverse' : 'row')};
    ${props => props.theme.breakpoint.medium} {
        flex-direction: column;
        margin-bottom: 40px;
        margin: 200px 0;
    }
    > :first-child {
        width: 50%;
        ${props => props.theme.breakpoint.medium} {
            width: 100%;
            margin-bottom: 50px;
        }
        a {
            z-index: 99;
            position: relative;
        }
    }

    > :nth-child(2) {
        left: ${props => (props.rightimage ? '0' : 'unset')};
    }
`;

export const SectionImg = styled.div`
    width: 60%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    height: ${props => props.height};
    margin-left: 20px;
    right: 0;
    ${props => props.theme.filters.grayscale}

    img {
        object-fit: contain;
    }
    ${props => props.theme.breakpoint.medium} {
        width: 100%;
        height: 350px;
        position: relative;
    }
`;

export const SwapZoneCtn = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    margin: 30px 0 50px;
`;
