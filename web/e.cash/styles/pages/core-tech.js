// Copyright (c) 2023 The Bitcoin developers
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
    margin-bottom: 350px;

    :last-child {
        margin-bottom: 0;
    }

    ${props => props.theme.breakpoint.medium} {
        flex-direction: column;
        margin-bottom: 150px;
        padding: 25px;
    }
`;

export const LeftTopArrow = styled.div`
    position: absolute;
    left: 0;
    top: 0;
    right: auto;
    bottom: auto;
    width: 40px;
    height: 40px;
    border-top: 2px solid ${props => props.theme.colors.contrast};
    border-left: 2px solid ${props => props.theme.colors.contrast};
`;

export const LeftDownArrow = styled.div`
    position: absolute;
    left: 0;
    top: auto;
    right: auto;
    bottom: 0;
    width: 40px;
    height: 40px;
    border-bottom: 2px solid ${props => props.theme.colors.contrast};
    border-left: 2px solid ${props => props.theme.colors.contrast};
`;

export const RightDownArrow = styled.div`
    position: absolute;
    left: auto;
    top: auto;
    right: 0;
    bottom: 0;
    width: 40px;
    height: 40px;
    border-right: 2px solid ${props => props.theme.colors.contrast};
    border-bottom: 2px solid ${props => props.theme.colors.contrast};
`;

export const RightTopArrow = styled.div`
    position: absolute;
    left: auto;
    top: 0;
    right: 0;
    bottom: auto;
    width: 40px;
    height: 40px;
    border-top: 2px solid ${props => props.theme.colors.contrast};
    border-right: 2px solid ${props => props.theme.colors.contrast};
`;

export const TextCtn = styled.div`
    display: flex;
    flex-direction: column;
    width: 60%;
    z-index: 5;

    ${props => props.theme.breakpoint.medium} {
        width: 100%;
    }

    h3 {
        margin-bottom: 16px;
        text-transform: uppercase;
    }

    p {
        font-size: 16px;

        :last-child {
            margin-bottom: 0;
        }
    }
`;

export const ImageCtn = styled.div`
    position: absolute;
    width: 50%;
    height: 700px;
    top: 50%;
    transform: translate(10%, -50%);
    right: 0px;
    bottom: 0;
    ${props => props.theme.filters.grayscale}

    ${props => props.theme.breakpoint.medium} {
        width: 100%;
        position: relative;
        height: auto;
        transform: none;
        margin-top: 30px;
    }

    img {
        object-fit: contain;
    }
`;

export const ButtonRow = styled.div`
    display: flex;
    align-items: center;

    > :last-child {
        margin-left: 10px;
    }

    @media (max-width: 500px) {
        flex-direction: column;
        align-items: flex-start;
        > :last-child {
            margin-left: 0px;
            margin-top: 10px;
        }
    }
`;

export const Blob = styled.div`
    background-color: white;
    height: 400px;
    aspect-ratio: 1;
    position: absolute;
    left: ${props => props.left};
    top: ${props => props.top};
    border-radius: 50%;
    background: linear-gradient(
        to right,
        ${props => props.theme.colors.primary},
        ${props => props.theme.colors.primaryLight}
    );
    opacity: 0.5;
    filter: blur(150px);
`;

export const ContentCtn = styled.div`
    height: 100%;
    width: 100%;
    position: relative;
    padding-bottom: 350px;
    margin-top: -80px;
    padding-top: 100px;
`;
