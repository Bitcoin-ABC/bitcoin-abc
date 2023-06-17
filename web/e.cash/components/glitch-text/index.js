// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { GlitchCtn } from './styles';

export default function GlitchText({ text }) {
    return (
        <GlitchCtn>
            <div className="glitch" data-text={text}>
                {text}
            </div>
        </GlitchCtn>
    );
}
