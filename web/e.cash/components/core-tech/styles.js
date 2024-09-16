// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { getAnimationSettings } from '/styles/framer-motion';

export const SectionCtn = styled(motion.div).attrs(() =>
    getAnimationSettings(),
)`
    position: relative;
    width: 100%;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    justify-content: center;
    margin-top: 60px;

    ${props => props.theme.breakpoint.medium} {
        grid-template-columns: 1fr;
        grid-template-rows: auto auto auto;
    }
`;

export const CoreTechImage = styled.div`
    width: 408px;
    height: 300px;
    position: relative;
    flex-shrink: 0;

    ${props => props.theme.breakpoint.medium} {
        display: none;
    }

    img {
        object-fit: contain;
    }
`;

export const Labels = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: space-between;
    height: 300px;

    ${props => props.theme.breakpoint.medium} {
        height: unset;
        margin-bottom: 5px;
    }

    & > :first-child {
        clip-path: polygon(20px 0, 100% 0, 100% 100%, 0 100%, 0 20px);
    }

    & > :first-child > div {
        clip-path: polygon(19px 0, 100% 0, 100% 100%, 0 100%, 0 19px);
    }

    & > :last-child {
        clip-path: polygon(
            100% 0,
            100% 100%,
            20px 100%,
            0 calc(100% - 20px),
            0 0
        );
    }

    & > :last-child > div {
        clip-path: polygon(
            100% 0,
            100% 100%,
            19px 100%,
            0 calc(100% - 19px),
            0 0
        );
    }

    ${props => props.theme.breakpoint.medium} {
        & > :first-child,
        & > :first-child > div,
        & > :last-child,
        & > :last-child > div {
            clip-path: none;
        }
    }
`;

export const LabelOuter = styled.div`
    padding: 2px;
    background-color: ${props => props.theme.colors.primaryLight};
    width: 100%;
    max-width: 400px;
    cursor: pointer;
    ${props => props.theme.breakpoint.medium} {
        max-width: unset;
        margin-bottom: 2px;
    }
`;

export const LabelInner = styled.div`
    background-color: ${props => props.theme.colors.darkBlue};
    font-weight: 600;
    font-size: 26px;
    padding: 5px 20px;
    text-align: right;

    ${props => props.theme.breakpoint.medium} {
        font-size: 20px;
        text-align: left;
    }

    div {
        width: 50px;
        height: 50px;
        position: relative;
        margin-bottom: 10px;

        img {
            object-fit: contain;
        }
    }
`;

export const DescriptionCtn = styled.div`
    display: flex;
    align-items: center;
    & > :first-child {
        padding: 3px;
        background-color: ${props => props.theme.colors.primaryLight};
        clip-path: polygon(
            0 0,
            calc(100% - 20px) 0%,
            100% calc(0% + 20px),
            100% 100%,
            0 100%
        );
        position: relative;
        ${props => props.theme.breakpoint.medium} {
            padding: 2px;
            clip-path: none;
        }
    }
    ${props => props.theme.breakpoint.medium} {
        grid-row: 2;
        grid-column: 1 / 3;
    }
`;

export const DescriptionInner = styled.div`
    background-color: ${props => props.theme.colors.darkBlue};
    clip-path: polygon(
        0 0,
        calc(100% - 19px) 0%,
        100% calc(0% + 19px),
        100% 100%,
        0 100%
    );
    font-size: 18px;
    padding: 20px 30px;
    text-align: left;
    ${props => props.theme.breakpoint.medium} {
        clip-path: none;
    }

    a {
        background-color: ${props => props.theme.colors.contrast};
        margin-top: 30px;
        display: inline-block;
        color: ${props => props.theme.colors.darkBlue};
        padding: 4px 20px;
        font-size: 14px;

        :hover {
            background-color: ${props => props.theme.colors.accent};
        }
    }

    div {
        width: 50px;
        height: 50px;
        position: relative;
        margin-bottom: 10px;

        img {
            object-fit: contain;
        }
    }
`;
