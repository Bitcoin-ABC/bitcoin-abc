// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { sha256, sha512Hasher } from './hash';
import { strToBytes } from './indexNodeJs';
import { pbkdf2 } from './pbkdf2';

const BITS_PER_BYTE = 8;
const BITS_PER_WORD = 11;
const BITS_PER_CHECKSUM_BIT = 32;

// Calculate how many bits there are in the mnemonic
function calcNumChecksumBits(numEntropyBytes: number): number {
    return (numEntropyBytes * BITS_PER_BYTE) / BITS_PER_CHECKSUM_BIT;
}

// Normalize according to unicode standard
function normalize(str?: string): string {
    return (str || '').normalize('NFKD');
}

// Turn the password into a salt for seed generation
function salt(password?: string): string {
    return 'mnemonic' + (password || '');
}

/** Word list to generate a seed phrase. */
export interface WordList {
    /** Word separator of the seed phrase (Japanese has \u3000 as space) */
    separator: string;
    /** Words in the word list to generate a mnemonic phrase */
    words: string[];
}

/** Derive the mnemonic from entropy */
export function entropyToMnemonic(
    entropy: Uint8Array,
    wordlist: WordList,
): string {
    if (entropy.length < 16 || entropy.length > 32) {
        throw new TypeError('Entropy must be between 16 and 32 bytes long');
    }
    if (entropy.length % 4 !== 0) {
        throw new TypeError('Entropy length must be divisible by 4');
    }

    const checksum = sha256(entropy);
    const data = new Uint8Array(entropy.length + checksum.length);
    data.set(entropy, 0);
    data.set(checksum, entropy.length);

    let nextBits = 0;
    let numBits = 0;
    let numLeftoverBits =
        entropy.length * BITS_PER_BYTE + calcNumChecksumBits(entropy.length);
    const words = [];
    for (const byte of data) {
        nextBits = (nextBits << BITS_PER_BYTE) | byte;
        numBits += BITS_PER_BYTE;
        if (numBits >= BITS_PER_WORD) {
            const wordIdx = nextBits >> (numBits - BITS_PER_WORD);
            words.push(wordlist.words[wordIdx]);
            if (numLeftoverBits <= BITS_PER_WORD) {
                break;
            }
            numBits -= BITS_PER_WORD;
            numLeftoverBits -= BITS_PER_WORD;
            nextBits &= 0x7ff >> (BITS_PER_WORD - numBits);
        }
    }

    return words.join(wordlist.separator);
}

/** Recover the entropy from the mnemonic */
export function mnemonicToEntropy(
    phrase: string,
    wordlist: string[],
): Uint8Array {
    const words = normalize(phrase).split(' ');
    if (words.length < 12 || words.length > 24) {
        throw new Error(
            'Number of words in mnemonic phrase must be between 12 and 24',
        );
    }
    if (words.length % 3 !== 0) {
        throw new Error(
            'Number of words in mnemonic phrase must be divisible by 3',
        );
    }

    const wordIndices = words.map(word => {
        const idx = wordlist.indexOf(word);
        if (idx === -1) {
            throw new Error('Invalid mnemonic phrase word: ' + word);
        }
        return idx;
    });

    const numEntropyBytes = (wordIndices.length / 3) * 4;
    let nextBits = 0;
    let numBits = 0;
    let idx = 0;
    const entropy = new Uint8Array(numEntropyBytes);
    let checksum = 0;
    for (const wordIdx of wordIndices) {
        nextBits = (nextBits << BITS_PER_WORD) | wordIdx;
        numBits += BITS_PER_WORD;
        while (numBits >= BITS_PER_BYTE) {
            const byte = nextBits >> (numBits - BITS_PER_BYTE);
            if (idx < entropy.length) {
                entropy[idx] = byte;
            } else {
                checksum = (checksum << BITS_PER_BYTE) | byte;
            }
            idx++;
            numBits -= BITS_PER_BYTE;
            nextBits &= 0xffff >> (16 - numBits);
        }
    }
    if (numBits != 0) {
        checksum = (checksum << BITS_PER_BYTE) | nextBits;
    }

    const entropyHash = sha256(entropy);
    const numChecksumBits = calcNumChecksumBits(numEntropyBytes);
    const expectedChecksum =
        entropyHash[0] >> (BITS_PER_BYTE - numChecksumBits);

    if (checksum != expectedChecksum) {
        const expected = expectedChecksum.toString(16);
        const actual = checksum.toString(16);
        throw new Error(
            `Invalid checksum: expected ${expected}, got ${actual}`,
        );
    }

    return entropy;
}

/** Derive the seed bytes from the mnemonic */
export function mnemonicToSeed(phrase: string, password?: string): Uint8Array {
    return pbkdf2({
        hashFactory: sha512Hasher,
        password: strToBytes(normalize(phrase)),
        salt: strToBytes(salt(normalize(password))),
        blockLength: 128,
        outputLength: 64,
        dkLen: 64,
        iterations: 2048,
    });
}
