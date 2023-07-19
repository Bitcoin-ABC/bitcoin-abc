// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { GlitchCtn } from './styles';

export default function GlitchText({ text }) {
    return (
        <GlitchCtn>
            <div className="glitch">
                <div className="glitch_before">{text}</div>
                {text}
                <div className="glitch_after">{text}</div>
            </div>
        </GlitchCtn>
    );
}
