// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';
import Image from 'next/image';
import { getStatusValues } from './status.js';
import { motion } from 'framer-motion';
import { getAnimationSettings } from '/styles/framer-motion';

export const Legend = styled(motion.div).attrs(() =>
    getAnimationSettings({ duration: 1, displacement: 200 }),
)`
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 20px;
    margin-bottom: 80px;

    img {
        margin-right: 5px;
    }

    span {
        margin: 0 15px;
    }

    ${props => props.theme.breakpoint.medium} {
        flex-direction: column;
        text-align: left;
        margin-bottom: 40px;

        > div {
            align-self: center;
            margin-bottom: 10px;
        }

        span {
            display: none;
        }
    }
`;

export const WhiteIcon = styled(Image)`
    filter: ${props => props.theme.roadmap.whiteIcon};
`;

export const PinkIcon = styled(Image)`
    filter: ${props => props.theme.roadmap.accentIcon};
`;

export const BlueIcon = styled(Image)`
    filter: ${props => props.theme.roadmap.primaryIcon};
`;

export const RoadmapCtn = styled.div`
    display: flex;
    flex-direction: column;
    position: relative;
`;

export const RoadmapBlock = styled(motion.div).attrs(() =>
    getAnimationSettings({ duration: 2, displacement: 200 }),
)`
    display: flex;
    width: 100%;
    margin-bottom: 100px;
    position: relative;

    :first-child > div::before {
        content: '';
        width: 12px;
        height: 100px;
        background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0) 100%
        );
        position: absolute;
        top: -10px;
        left: -6px;
    }

    :nth-child(3) > div::before {
        content: '';
        width: 12px;
        height: 100px;
        background: linear-gradient(
            0deg,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0) 100%
        );
        position: absolute;
        bottom: -110px;
        left: -7px;
        z-index: 99;
    }

    ${props => props.theme.breakpoint.medium} {
        flex-direction: column;

        :first-child > div::before {
            display: none;
        }

        :nth-child(3) > div::before {
            display: none;
        }
    }
`;

export const TitleCtn = styled.div`
    width: 50%;
    position: relative;
    padding-right: 40px;
    overflow: visible;
    padding-top: 84px;

    ${props => props.theme.breakpoint.medium} {
        width: 100%;
        border-left: 2px solid ${props => props.theme.colors.primaryLight};
        padding-right: 0px;
        padding-top: 60px;
    }
`;

export const Title = styled.div`
    position: sticky;
    z-index: 100;
    top: 25%;
    right: 0;
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    h3 {
        margin: 0;
        color: ${props => props.theme.roadmap.sectionHeader};
        font-size: 40px;
        font-weight: 600;
        ${props => props.theme.breakpoint.medium} {
            font-size: 28px;
        }
    }

    p {
        font-size: 14px;
        margin: 0;
        max-width: 600px;
    }

    ${props => props.theme.breakpoint.medium} {
        align-items: flex-start;
        text-align: left;
        padding-left: 30px;
    }
`;

export const Dot = styled.div`
    width: 20px;
    height: 20px;
    border-radius: 100%;
    background-color: ${props => props.theme.colors.primaryLight};
    background-image: radial-gradient(
        circle farthest-corner at 50% 50%,
        ${props => props.theme.colors.primaryLight},
        ${props => props.theme.colors.primary}
    );
    box-shadow: 0 0 8px 2px ${props => props.theme.colors.primaryLight};
    position: absolute;
    right: -51px;
    top: 0;
    bottom: 0;
    margin: auto;

    ${props => props.theme.breakpoint.medium} {
        left: -10px;
        right: unset;
    }
`;

export const ItemsCtn = styled.div`
    width: 50%;
    border-left: 2px solid ${props => props.theme.colors.primaryLight};
    padding-left: 40px;
    display: flex;
    flex-direction: column;
    padding-top: 100px;
    position: relative;

    :after {
        content: '';
        width: 50px;
        height: 100px;
        border-left: 2px solid ${props => props.theme.colors.primaryLight};
        position: absolute;
        bottom: -100px;
        left: -2px;
    }

    ${props => props.theme.breakpoint.medium} {
        width: 100%;
        padding-left: 10px;
        padding-top: 50px;
    }
`;

export const ItemOuter = styled.div`
    margin-bottom: 20px;
    padding: 2px;
    align-self: auto;
    background-color: ${props =>
        getStatusValues({
            status: props.status,
            values: {
                planning: props.theme.roadmap.planning,
                underway: props.theme.roadmap.underway,
                complete: props.theme.roadmap.complete,
            },
            allStatuses: props.allStatuses,
        })};
    clip-path: polygon(
        100% 0,
        100% calc(100% - 16px),
        calc(100% - 20px) 100%,
        0 100%,
        0 0
    );
    width: fit-content;

    ${props => props.theme.breakpoint.medium} {
        height: 68px;
        margin-bottom: 10px;
    }
`;

export const ItemInner = styled.div`
    display: flex;
    width: auto;
    background-color: ${props => props.theme.colors.black};
    clip-path: polygon(
        100% 0,
        100% calc(100% - 16px),
        calc(100% - 20px) 100%,
        0 100%,
        0 0
    );

    ${props => props.theme.breakpoint.medium} {
        height: 64px;
        align-items: center;
    }

    > div:first-child {
        display: flex;
        width: 66px;
        justify-content: center;
        align-items: center;
        background-color: ${props =>
            getStatusValues({
                status: props.status,
                values: {
                    planning: props.theme.roadmap.planning,
                    underway: props.theme.roadmap.underway,
                    complete: props.theme.roadmap.complete,
                },
                allStatuses: props.allStatuses,
            })};

        ${props => props.theme.breakpoint.medium} {
            width: 40px;
            height: 100%;
        }
    }

    > div:nth-child(2) {
        display: flex;
        padding: 5px 25px 5px 15px;
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
        color: ${props =>
            getStatusValues({
                status: props.status,
                values: {
                    planning: props.theme.roadmap.planning,
                    underway: props.theme.roadmap.underway,
                    complete: props.theme.roadmap.complete,
                },
                allStatuses: props.allStatuses,
            })};

        h4 {
            font-size: 18px;
            line-height: 28px;
            font-weight: 600;
            margin: 0;
            ${props => props.theme.breakpoint.medium} {
                font-size: 14px;
                line-height: 1.2em;
            }
        }

        p {
            opacity: 0.8;
            font-size: 14px;
            margin: 0;
            ${props => props.theme.breakpoint.medium} {
                font-size: 12px;
                line-height: 1.2em;
            }
        }

        ${props => props.theme.breakpoint.medium} {
            padding: 0 10px 0 10px;
        }
    }
`;

export const TaglineCtn = styled.div`
    display: flex;
    align-items: center;
    text-align: left;

    > div:first-child {
        width: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    h4 {
        font-size: 18px;
        line-height: 28px;
        font-weight: 600;
        margin: 0;
    }

    p {
        opacity: 0.8;
        font-size: 14px;
        margin: 0;
    }
`;
