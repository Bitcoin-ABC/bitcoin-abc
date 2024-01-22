// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { getAnimationSettings } from '/styles/framer-motion';

export const WalletListCtn = styled(motion.div).attrs(() =>
    getAnimationSettings(),
)`
    display: flex;
    align-items: flex-start;
    width: 100%;
    flex-wrap: wrap;
    align-items: stretch;
`;

export const WalletCardCtn = styled.div`
    width: 33.333%;
    margin-bottom: 40px;
    display: inline-block;
    padding: 15px;

    > a {
        width: 100%;
        display: flex;
        flex-direction: column;
        padding: 40px;
        border: 2px solid ${props => props.theme.colors.primary};
        background-color: rgba(0, 0, 0, 0.51);
        height: 100%;
        :hover {
            border-color: ${props => props.theme.colors.contrast};
            background-color: rgba(0, 0, 0, 0.75);
        }

        @media (max-width: 1330px) {
            padding: 30px;
        }
    }

    @media (max-width: 1330px) {
        width: 50%;
        padding: 10px;
    }

    @media (max-width: 800px) {
        width: 100%;
        margin-bottom: 10px;
    }
`;

export const ImageCtn = styled.div`
    width: 100%;
    height: 50px;
    position: relative;
    margin-bottom: 30px;
    display: flex;
    justify-content: flex-start;
    @media (max-width: 800px) {
        height: 40px;
    }

    img {
        object-fit: contain;
        width: unset !important;
        max-width: 100%;
        left: 0;
    }
`;

export const TextCtn = styled.div`
    width: 100%;
    color: ${props => props.theme.colors.contrast};
    position: relative;
    font-size: 16px;
    margin-bottom: 30px;
    line-height: 1.8em;
    border-top: 1px solid rgba(255, 255, 255, 0.6);
    padding-top: 20px;
`;

export const DetailsTitle = styled.div`
    font-size: 12px;
    color: ${props =>
        props.accent
            ? props.theme.colors.accent
            : props.theme.colors.primaryLight};
    opacity: 0.6;
`;

export const DetailsCtn = styled.div`
    color: ${props =>
        props.accent
            ? props.theme.colors.accent
            : props.theme.colors.primaryLight};
    font-size: 16px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: ${props => (props.accent ? '15px' : '')};

    > div {
        margin-right: 5px;
        font-size: 14px;
        font-weight: 600;
    }
    > div:not(:first-child) {
        border-left: 1px solid
            ${props =>
                props.accent
                    ? props.theme.colors.accent
                    : props.theme.colors.primary};
        padding-left: 5px;
    }
`;
