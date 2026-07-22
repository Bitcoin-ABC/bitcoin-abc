// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { mnemonicToEntropy } from 'ecash-lib';
import * as englishWordlist from 'ecash-lib/wordlists/english.json';

/**
 * Placeholder in `config.sample.json`. Not a usable seed — operators must
 * replace it before the config will parse.
 */
export const MNEMONIC_PLACEHOLDER = 'REPLACE_WITH_YOUR_BIP39_MNEMONIC';

/**
 * Normalize whitespace and assert `raw` is a valid BIP39 English mnemonic.
 * @throws with an operator-facing message (no stack needed for config errors)
 */
export const assertBip39Mnemonic = (raw: unknown): string => {
    if (typeof raw !== 'string') {
        throw new Error(`mnemonic must be a string (got ${typeof raw})`);
    }
    const mnemonic = raw.trim().replace(/\s+/g, ' ');
    if (mnemonic === '') {
        throw new Error('mnemonic must be a non-empty string');
    }
    if (
        mnemonic === MNEMONIC_PLACEHOLDER ||
        mnemonic.includes('REPLACE_WITH_YOUR')
    ) {
        throw new Error(
            'mnemonic is still the config.sample.json placeholder; ' +
                'generate your own BIP39 mnemonic and set it in config.json',
        );
    }
    try {
        mnemonicToEntropy(mnemonic, englishWordlist.words);
    } catch (error) {
        throw new Error(
            `mnemonic is not a valid BIP39 English mnemonic: ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    }
    return mnemonic;
};
