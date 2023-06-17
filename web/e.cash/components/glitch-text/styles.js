// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';

export const GlitchCtn = styled.div`
    height: 100%;
    display: flex;

    .glitch {
        position: relative;
        display: inline-block;
    }
    .glitch::before,
    .glitch::after {
        content: attr(data-text);
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }
    .glitch::before {
        left: 2px;
        text-shadow: -2px 0 ${props => props.theme.colors.accent};
        clip: rect(24px, 550px, 90px, 0);
        -webkit-animation: glitch-anim-2 2.5s infinite linear alternate-reverse;
        animation: glitch-anim-2 2.5s infinite linear alternate-reverse;
    }
    .glitch::after {
        left: -2px;
        text-shadow: -2px 0 ${props => props.theme.colors.primaryLight};
        clip: rect(85px, 550px, 140px, 0);
        -webkit-animation: glitch-anim 2.5s infinite linear alternate-reverse;
        animation: glitch-anim 2.5s infinite linear alternate-reverse;
    }

    @keyframes glitch-anim {
        0% {
            clip: rect(110px, 9999999px, 74px, 0);
        }
        4% {
            clip: rect(135px, 9999999px, 143px, 0);
        }
        8% {
            clip: rect(100px, 9999999px, 100px, 0);
        }
        12.5% {
            clip: rect(38px, 9999999px, 24px, 0);
        }
        20% {
            clip: rect(149px, 9999999px, 63px, 0);
        }
        25% {
            clip: rect(12px, 9999999px, 104px, 0);
        }
        33% {
            clip: rect(77px, 9999999px, 20px, 0);
        }
        45.83333333% {
            clip: rect(58px, 9999999px, 107px, 0);
        }
        50% {
            clip: rect(108px, 9999999px, 77px, 0);
        }
        58% {
            clip: rect(142px, 9999999px, 112px, 0);
        }
        66% {
            clip: rect(61px, 9999999px, 53px, 0);
        }
        70% {
            clip: rect(117px, 9999999px, 74px, 0);
        }
        75% {
            clip: rect(21px, 9999999px, 74px, 0);
        }
        79% {
            clip: rect(117px, 9999999px, 70px, 0);
        }
        87.5% {
            clip: rect(95px, 9999999px, 9px, 0);
        }
        91% {
            clip: rect(121px, 9999999px, 75px, 0);
        }
        95% {
            clip: rect(121px, 9999999px, 115px, 0);
        }
    }

    @keyframes glitch-anim-2 {
        6% {
            clip: rect(76px, 9999999px, 132px, 0);
        }
        10% {
            clip: rect(13px, 9999999px, 82px, 0);
        }
        13% {
            clip: rect(97px, 9999999px, 2px, 0);
        }
        16% {
            clip: rect(1px, 9999999px, 147px, 0);
        }
        20% {
            clip: rect(113px, 9999999px, 124px, 0);
        }
        30% {
            clip: rect(2px, 9999999px, 10px, 0);
        }
        36% {
            clip: rect(140px, 9999999px, 79px, 0);
        }
        40% {
            clip: rect(37px, 9999999px, 67px, 0);
        }
        46% {
            clip: rect(6px, 9999999px, 16px, 0);
        }
        50% {
            clip: rect(98px, 9999999px, 123px, 0);
        }
        56% {
            clip: rect(77px, 9999999px, 110px, 0);
        }
        60% {
            clip: rect(22px, 9999999px, 145px, 0);
        }
        66% {
            clip: rect(109px, 9999999px, 135px, 0);
        }
        70% {
            clip: rect(118px, 9999999px, 40px, 0);
        }
        73% {
            clip: rect(74px, 9999999px, 141px, 0);
        }
        76% {
            clip: rect(59px, 9999999px, 100px, 0);
        }
        80% {
            clip: rect(14px, 9999999px, 32px, 0);
        }
        90% {
            clip: rect(33px, 9999999px, 97px, 0);
        }
        93% {
            clip: rect(94px, 9999999px, 29px, 0);
        }
        100% {
            clip: rect(5px, 9999999px, 14px, 0);
        }
    }
`;
