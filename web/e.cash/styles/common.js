// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { getAnimationSettings } from '/styles/framer-motion';

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
