// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import GlitchText from '/components/glitch-text';
import { StyledH3 } from './styles';

/**
 * @param {string} text - the string to render
 * @param {string} id - optional string to use for CSS id
 * @returns Styled H3 component
 */
export default function H3({ text, id }) {
    const props = {};
    if (id) {
        props.id = id;
    }
    return (
        <StyledH3 {...props}>
            <GlitchText text={text} />
        </StyledH3>
    );
}
