// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';
import Neoncity from '/public/images/neon-city.png';
import { motion } from 'framer-motion';
import { getAnimationSettings } from '/styles/framer-motion';

export const Hero = styled(motion.div).attrs(() =>
    getAnimationSettings({ duration: 2, delay: 0.4, displacement: 300 }),
)`
    width: 100%;
    height: 100vh;
    min-height: 600px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    position: relative;
    z-index: 1;

    .social-ctn {
        display: flex;
        align-items: center;
        position: absolute;
        bottom: 30px;
        left: 20px;
        right: 0;
        margin: auto;
        max-width: 1400px;
    }

    .social-icon-ctn {
        width: 20px;
        height: 20px;
        position: relative;
        margin-right: 20px;
        transition: all ease-in-out 200ms;
    }

    .social-icon-ctn:hover {
        transform: scale(1.4);
    }

    h1 {
        font-family: 'Montserrat', sans-serif;
        font-size: 7.5vw;
        line-height: 0.8;
        font-weight: 700;
        text-shadow: 6px 6px 12px rgb(0 0 0 / 70%);
        margin: 0;
        text-align: center;
        display: flex;
        justify-content: center;
        margin-bottom: 40px;
    }

    @media screen and (min-width: 2000px) {
        h1 {
            font-size: 120px;
        }
    }

    h1 span {
        margin-right: 20px;
        font-weight: 400;
    }

    ${props => props.theme.breakpoint.medium} {
        h1 {
            font-size: 14vw;
            line-height: 1;
            display: inline-block;
            text-align: center;
            margin-bottom: 10px;
        }

        h1 span {
            margin-right: 0;
        }
    }

    @media (max-width: 480px) {
        .social-ctn {
            display: none;
        }
    }
`;

export const ButtonCtn = styled.div`
    display: flex;
    justify-content: center;
    margin-top: 40px;
    ${props => props.theme.breakpoint.small} {
        flex-direction: column;
        a {
            display: block;
        }
    }
`;

export const MarginButtonWrapper = styled.div`
    margin: 0 10px;
    ${props => props.theme.breakpoint.small} {
        margin: 10px 0;
    }
`;

export const HeroImage = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    width: 80%;
    max-width: 800px;
    height: 100%;
    z-index: -1;
    animation: bounce 6s infinite;

    img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
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
`;

export const StoryAndWhySection = styled.div`
    background-image: url('/images/neon-city.png');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    width: 100%;
    padding: 200px 0 400px;
    position: relative;
    ${props => props.theme.filters.grayscale};
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

export const GradientSpacer = styled.div`
    height: 100px;
    width: 100%;
    background-image: linear-gradient(
        180deg,
        ${props => props.theme.colors.darkBlue},
        ${props => props.theme.colors.black}
    );
`;

export const StorySection = styled(motion.div).attrs(() =>
    getAnimationSettings(),
)`
    display: flex;
    gap: 30px;
    position: relative;

    > :first-child {
        width: 45%;
    }

    > :last-child {
        width: 55%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    ${props => props.theme.breakpoint.medium} {
        flex-direction: column;

        > :first-child,
        > :last-child {
            width: 100%;
        }

        > :last-child {
            margin-top: 30px;
        }
    }
`;

export const YouTubeVideo = styled.div`
    clip-path: polygon(
        23% 0,
        26% 0,
        95% 0,
        98% 5%,
        98% 33%,
        100% 36%,
        100% 97%,
        81% 97%,
        78% 100%,
        15% 100%,
        0 74%,
        0 0
    );
    position: relative;
    z-index: 2;
    overflow: hidden;
    width: 100%;
    padding: 4px;
    background-color: #00abe7;
    background-image: -webkit-gradient(
        linear,
        left top,
        left bottom,
        from(#273498),
        color-stop(53%, #0074c2),
        to(#00abe7)
    );
    background-image: linear-gradient(180deg, #273498, #0074c2 53%, #00abe7);
    -webkit-transform: translate(0, -30px);
    -ms-transform: translate(0, -30px);
    transform: translate(0, -30px);
    filter: drop-shadow(
        10px 8px 14px hsla(221.45454545454544, 100%, 7.33%, 0.94)
    );

    > :first-child {
        clip-path: polygon(
            23% 0,
            26% 0,
            95% 0,
            98% 5%,
            98% 33%,
            100% 36%,
            100% 97%,
            81% 97%,
            78% 100%,
            15% 100%,
            0 74%,
            0 0
        );
        position: relative;
        padding-top: 56.25%;
    }

    iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        border: 0px;
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
`;

export const RoadmapSection = styled.div`
    width: 100%;
    text-align: center;
    background-color: ${props => props.theme.colors.black};
    padding: 120px 0;
    position: relative;
`;

export const TilesSectionCtn = styled(motion.div).attrs(() =>
    getAnimationSettings(),
)`
    margin-top: 200px;
    text-align: center;
`;
