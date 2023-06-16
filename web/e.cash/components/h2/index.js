// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import GlitchText from '/components/glitch-text';
import Image from 'next/image';
import h2graphic from '/public/images/h2-graphic.svg';
import { StyledH3, StyledH2, H2Image } from './styles';

/**
 * Return a styled h2, styled h3 and decorative image
 * @param {string} subtect h3 string to render
 * @param {string} text h2 string to render
 * @param {boolean} center optional value to center the image
 */
export default function H2({ subtext, text, center }) {
    return (
        <>
            <StyledH3>{subtext}</StyledH3>
            <StyledH2>
                <H2Image center={center === true}>
                    <Image src={h2graphic} alt="eCash" fill />
                </H2Image>
                <GlitchText text={text} />
            </StyledH2>
        </>
    );
}
