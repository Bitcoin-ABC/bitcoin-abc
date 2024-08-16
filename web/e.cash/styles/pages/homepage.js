// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { getAnimationSettings } from '/styles/framer-motion';
import Link from 'next/link';

export const Hero = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    position: relative;
    z-index: 1;
    padding: 200px 0 200px 0;
    position: relative;

    ${props => props.theme.breakpoint.medium} {
        padding: 120px 0 100px 0;
    }
`;

export const BlackGradient = styled.div`
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 100px;
    background: linear-gradient(
        0deg,
        rgba(0, 0, 0, 1) 0%,
        rgba(0, 0, 0, 0) 100%
    );
`;

export const HeroContentCtn = styled(motion.div).attrs(() =>
    getAnimationSettings({ duration: 2, delay: 0.4, displacement: 300 }),
)`
    display: flex;
    width: 100%;
    align-items: center;
    ${props => props.theme.breakpoint.medium} {
        flex-direction: column;
    }
`;

export const HeroTextCtn = styled.div`
    display: flex;
    flex-direction: column;
    width: 50%;
    align-items: flex-start;

    h1 {
        font-family: 'Montserrat', sans-serif;
        font-size: 110px;
        line-height: 0.7em;
        font-weight: 700;
        text-shadow: 6px 6px 12px rgb(0 0 0 / 70%);
        margin: 0;
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        margin-bottom: 30px;
    }

    h1 span {
        font-weight: 400;
        font-size: 70px;
        margin-bottom: 10px;
    }

    p {
        text-align: left;
        ${props => props.theme.breakpoint.medium} {
            text-align: center;
        }
    }

    ${props => props.theme.breakpoint.medium} {
        width: 100%;
        text-align: center;
        align-items: center;
        h1 {
            font-size: 15vw;
            align-items: center;
            width: 100%;
        }

        h1 span {
            font-size: 10vw;
            margin-bottom: 10px;
            text-align: center;
        }
    }
`;

export const Tagline = styled.span`
    color: ${props => props.theme.colors.primaryLight};
    font-size: 30px;
    font-weight: 600;
    margin-bottom: 20px;
    ${props => props.theme.breakpoint.medium} {
        font-size: 6vw;
    }
`;

export const ButtonCtn = styled.div`
    display: flex;
    margin-top: 40px;
    ${props => props.theme.breakpoint.medium} {
        margin-top: 20px;
    }
    ${props => props.theme.breakpoint.small} {
        flex-direction: column;
        a {
            display: block;
        }
    }
`;

export const MarginButtonWrapper = styled.div`
    margin: 0 10px;
    position: relative;
    ${props => props.theme.breakpoint.small} {
        margin: 10px 0;
    }
`;

export const ButtonFlagCtn = styled.div`
    position: absolute;
    z-index: 99;
    top: -40px;
    left: -30px;
    display: flex;
    flex-direction: column;
    color: #f4e600;
    font-weight: 600;
    font-size: 14px;

    div {
        width: 40px;
        height: 40px;
        position: relative;
        margin-left: 25px;
        transform: rotate(16deg);

        img {
            object-fit: contain;
        }
    }
`;

export const HeroImage = styled.div`
    width: 50%;
    height: 500px;
    animation: bounce 6s infinite;
    position: relative;

    img {
        object-fit: contain;
        ${props => props.theme.filters.grayscale};
    }

    @keyframes bounce {
        0% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-20px);
        }
        100% {
            transform: translateY(0);
        }
    }

    ${props => props.theme.breakpoint.medium} {
        width: 100%;
        height: 400px;
        margin-top: 80px;
    }
`;

export const StoryAndWhySection = styled.div`
    background-image: url('/images/neon-city.png');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    width: 100%;
    padding: 0 0 400px;
    position: relative;
    ${props => props.theme.breakpoint.medium} {
        padding-bottom: 200px;
    }
`;

export const Overlay = styled.div`
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    background-color: rgba(0, 0, 0, 0.5);
    background-image: linear-gradient(180deg, #000, rgba(39, 52, 152, 0.57));
`;

export const ExchangeTileCtn = styled.div`
    --color-text: navy;
    --color-bg: papayawhip;
    --color-bg-accent: #ecdcc0;
    --size: clamp(10rem, 1rem + 40vmin, 30rem);
    --gap: calc(var(--size) / 14);
    --scroll-start: 0;
    --scroll-end: calc(-100% - var(--gap));

    display: flex;
    overflow: hidden;
    user-select: none;
    gap: var(--gap);
    mask-image: linear-gradient(
        var(--mask-direction, to right),
        hsl(0 0% 0% / 0),
        hsl(0 0% 0% / 1) 20%,
        hsl(0 0% 0% / 1) 80%,
        hsl(0 0% 0% / 0)
    );
`;

export const ExchangeWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 80px;
    margin: auto;
    max-width: 2000px;
    ${props => props.theme.breakpoint.medium} {
        gap: 50px;
    }
`;

export const ExchangeTileGroup = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: var(--gap);
    min-width: 100%;
    animation: scroll-x 60s linear infinite;
    animation-direction: ${({ reverse }) => (reverse ? 'reverse' : 'normal')};
    animation-delay: ${({ reverse }) => (reverse ? '-3s' : '0s')};
    @keyframes scroll-x {
        from {
            transform: translateX(var(--scroll-start));
        }
        to {
            transform: translateX(var(--scroll-end));
        }
    }
`;

export const ExchangeTile = styled(Link)`
    width: 200px;
    height: 80px;
    position: relative;
    :hover {
        img {
            filter: invert(50%) sepia(93%) saturate(2193%) hue-rotate(161deg)
                brightness(96%) contrast(101%);
        }
    }

    ${props => props.theme.breakpoint.medium} {
        width: 150px;
        height: 60px;
    }

    img {
        object-fit: contain;
    }
`;

export const PixelBorder = styled.div`
    width: 100%;
    position: relative;
    margin-top: -120px;
    height: 120px;
    z-index: 99;
    background-position: 50% 100%, 0 0;
    background-size: auto, auto;
    background-repeat: repeat-x;
    background-image: url('/images/pixel-border.svg'),
        linear-gradient(180deg, transparent 79%, rgba(0, 0, 0, 0.67) 97%, #000);
    ${props => props.theme.breakpoint.medium} {
        height: 100px;
        background-image: url('/images/pixel-border.svg');
        background-repeat: no-repeat;
        background-size: cover;
        margin-top: -100px;
    }
`;

export const BuildSection = styled.div`
    width: 100%;
    text-align: center;
    background-color: ${props => props.theme.colors.black};
    padding: 150px 0;
    position: relative;
    ${props => props.theme.breakpoint.medium} {
        padding: 80px 0;
    }
`;

export const BuildSectionCtn = styled(motion.div).attrs(() =>
    getAnimationSettings(),
)`
    width: 100%;
    display: flex;
    align-items: center;
    ${props => props.theme.breakpoint.medium} {
        flex-direction: column;
    }

    > div:first-child {
        width: 50%;
        text-align: left;
        padding-right: 40px;
        ${props => props.theme.breakpoint.medium} {
            width: 100%;
            padding-right: 0;
        }

        p {
            margin-bottom: 50px;
        }
    }

    > div:nth-child(2) {
        width: 50%;
        height: 500px;
        position: relative;
        ${props => props.theme.breakpoint.medium} {
            width: 100%;
            height: 400px;
        }

        img {
            object-fit: contain;
        }
    }
`;

export const TilesSectionCtn = styled(motion.div).attrs(() =>
    getAnimationSettings(),
)`
    margin-top: 200px;
    text-align: center;
    ${props => props.theme.breakpoint.medium} {
        margin-top: 80px;
    }
`;

export const LearnMoreBtnCtn = styled.div`
    display: flex;
    margin-top: 60px;
    justify-content: center;
`;
