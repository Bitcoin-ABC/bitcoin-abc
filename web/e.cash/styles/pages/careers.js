// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { getAnimationSettings } from '/styles/framer-motion';

export const CareersCtn = styled(motion.div).attrs(() =>
    getAnimationSettings(),
)`
    padding: 160px 0;
    background-size: 60px 103px;
    background-image: url(/images/logo-tile.png);
    ${props => props.theme.filters.grayscale}
    ${props => props.theme.breakpoint.medium} {
        padding: 120px 0;
    }
`;

export const CardCtn = styled.div`
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    grid-template-rows: repeat(1, 1fr);
    grid-column-gap: 15px;
    grid-row-gap: 15px;
`;

export const Card = styled.div`
    display: flex;
    flex-direction: column;
    border: 1px solid ${props => props.theme.colors.primaryLight};
    transition: all ease-in-out 200ms;
    position: relative;
    box-shadow: 0px 0px 22px 1px ${props => props.theme.colors.primaryLight}68;
    background: ${props => props.theme.colors.darkBackground};
    padding: 30px;

    h3 {
        margin-bottom: 5px;
    }

    p:last-child {
        margin-bottom: 0;
        color: #ffffff60;
        font-size: 14px;
    }

    p {
        font-size: 16px;
    }
`;

export const Location = styled.div`
    display: flex;
    align-items: center;
    font-size: 20px;
    margin-bottom: 30px;

    img {
        margin-right: 10px;
    }
`;
