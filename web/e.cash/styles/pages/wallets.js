// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { getAnimationSettings } from '/styles/framer-motion';

export const FlexCtn = styled.div`
    display: flex;
    align-items: center;
    width: 100%;
    ${props => props.theme.breakpoint.medium} {
        flex-direction: column;
    }
`;

export const OuterImageCtn = styled.div`
    width: 420px;
    height: 140px;
    padding: 0 20px;
    position: relative;
    border: 1px solid ${props => props.theme.colors.gridlines};
    display: flex;
    align-items: center;
    ${props => props.theme.breakpoint.medium} {
        width: 100%;
        height: 120px;
        margin-bottom: 20px;
    }
`;

export const ImageCtn = styled.div`
    width: 100%;
    height: 80px;
    padding: 20px;
    position: relative;

    img {
        object-fit: contain;
    }
`;

export const TextCtn = styled.div`
    width: 100%;
    padding: 0 0 0 30px;
    color: ${props => props.theme.colors.contrast};
    position: relative;

    h4 {
        font-size: 28px;
        margin: 0 0 10px 0;
        line-height: 1em;
        transition: all ease-in-out 200ms;
    }

    p {
        margin: 0;
        font-size: 16px;
        opacity: 0.6;
    }

    h5 {
        text-transform: uppercase;
        color: ${props => props.theme.colors.primaryLight};
        margin: 0;
        margin-top: 10px;
        font-size: 14px;
    }

    ${props => props.theme.breakpoint.medium} {
        padding: 0 0 0 0;
    }
`;

export const WalletCardCtn = styled(motion.div).attrs(() =>
    getAnimationSettings(),
)`
    width: 100%;
    margin-bottom: 50px;
    display: inline-block;
    padding: 30px 0;
    transition: background-color ease-in-out 200ms;
    border-radius: 5px;

    ${props => props.theme.breakpoint.medium} {
        margin-bottom: 90px;
    }

    :hover {
        background-color: ${props => props.theme.colors.walletHover};
    }

    :hover ${TextCtn} {
        h4 {
            color: ${props => props.theme.colors.primaryLight};
        }
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
    margin-bottom: 50px;
`;
