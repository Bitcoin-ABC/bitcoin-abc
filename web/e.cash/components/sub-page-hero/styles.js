// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { getAnimationSettings } from '/styles/framer-motion';

export const OuterHeroCtn = styled.div`
    width: 100%;
    position: relative;
`;
export const HeroCtn = styled(motion.div).attrs(() =>
    getAnimationSettings({ duration: 2, displacement: 300 }),
)`
    display: flex;
    padding-top: 130px;
    position: relative;
    height: 830px;
    align-items: center;

    ${props => props.theme.breakpoint.medium} {
        flex-direction: column-reverse;
        height: 100%;
    }
`;

export const ImgCtn = styled.div`
    width: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    height: 700px;
    ${props => props.theme.filters.grayscale}

    img {
        object-fit: contain;
    }
    ${props => props.theme.breakpoint.medium} {
        width: 100%;
        padding-right: 0;
        height: 500px;
    }
`;

export const TextCtn = styled.div`
    width: 50%;
    display: flex;
    padding-left: 20px;
    flex-direction: column;
    justify-content: center;

    p {
        font-size: 16px;
    }
    ${props => props.theme.breakpoint.medium} {
        width: 100%;
        padding-left: 0;
    }
`;
