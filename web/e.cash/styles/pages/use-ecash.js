// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { getAnimationSettings } from '/styles/framer-motion';

export const TextImageBlockCtn = styled(motion.div).attrs(() =>
    getAnimationSettings(),
)`
    position: relative;
    display: flex;
    width: 100%;
    padding: 45px;
    align-items: center;
    border: 3px solid ${props => props.theme.colors.primaryLight};
    background-color: ${props => props.theme.colors.coretechBackground};
    box-shadow: -2px 6px 20px 2px ${props => props.theme.colors.coretechShadow1},
        inset 0 0 17px 6px ${props => props.theme.colors.coretechShadow2};
    margin-bottom: 50px;

    :last-child {
        margin-bottom: 0;
    }

    ${props => props.theme.breakpoint.medium} {
        flex-direction: column;
        margin-bottom: 150px;
        padding: 25px;
    }
`;

export const TextCtn = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    z-index: 5;

    ${props => props.theme.breakpoint.medium} {
        width: 100%;
    }

    h3 {
        margin-bottom: 16px;
    }

    p {
        font-size: 16px;
        :last-child {
            margin-bottom: 0;
        }
    }
`;

export const ImageCtn = styled.div`
    width: 300px;
    position: relative;
    height: 300px;
    margin-left: 50px;

    ${props => props.theme.breakpoint.medium} {
        width: 100%;
        position: relative;
        height: auto;
        transform: none;
        margin-top: 30px;
        margin-left: 0;
    }

    img {
        object-fit: contain;
    }
`;
