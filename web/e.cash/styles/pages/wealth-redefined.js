// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { getAnimationSettings } from '/styles/framer-motion';

export const TextBlock = styled(motion.div).attrs(() => getAnimationSettings())`
    width: 100%;
    margin-bottom: 150px;
    position: relative;

    ${props => props.theme.breakpoint.medium} {
        margin-bottom: 90px;
    }
`;
