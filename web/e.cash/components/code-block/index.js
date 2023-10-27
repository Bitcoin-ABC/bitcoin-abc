// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { Pre } from './styles.js';

/**
 * Component to render code
 * @param {string} code - the text to render
 */

export default function CodeBlock({ code }) {
    return (
        <Pre>
            <code>{code}</code>
        </Pre>
    );
}
