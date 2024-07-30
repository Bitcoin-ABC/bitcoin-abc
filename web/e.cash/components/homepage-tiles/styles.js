// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { getAnimationSettings } from '/styles/framer-motion';

export const GridCtn = styled(motion.div).attrs(() =>
    getAnimationSettings({ duration: 2, displacement: 200 }),
)`
    margin-top: 30px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
    grid-column-gap: 16px;
    grid-row-gap: 16px;

    ${props => props.theme.breakpoint.medium} {
        grid-template-columns: repeat(1, 1fr);
        grid-template-rows: repeat(4, 1fr);
        margin-top: 0;
    }

    .grid-item {
        border: 2px solid ${props => props.theme.colors.primary};
        background-color: rgba(0, 0, 0, 0.51);
        transition: 0.3s ease-in-out;
        color: #fff;
        text-align: left;
        text-decoration: none;
        display: flex;
        align-items: flex-start;
        flex-direction: column;
        padding: 30px 30px 200px 30px;
        position: relative;
    }

    .grid-item:hover {
        border-color: ${props => props.theme.colors.contrast};
        background-color: rgba(0, 0, 0, 0.75);
    }

    .grid-item h4 {
        margin: 0;
        margin-bottom: 6px;
        color: ${props => props.theme.colors.primaryLight};
        font-size: 36px;
        line-height: 1.2;
        font-weight: 600;
    }

    .grid-item p {
        position: relative;
    }

    .grid-item p::after {
        content: '';
        width: 30px;
        height: 1px;
        background-color: ${props => props.theme.colors.contrast};
        position: absolute;
        bottom: -20px;
        left: 0;
    }

    .tile-image-ctn {
        width: 100%;
        height: 200px;
        position: relative;
        position: absolute;
        bottom: 0;
        right: 0;
    }

    .tile-image-ctn img {
        object-fit: contain;
        object-position: right;
    }
`;
