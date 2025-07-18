// Copyright (c) 2024-2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    mnemonicToSeed,
    toHex,
    HdNode,
    XEC_TOKEN_AWARE_DERIVATION_PATH,
} from 'ecash-lib';
import { encodeCashAddress } from 'ecashaddrjs';

/**
 * getWallet.ts
 *
 * Print the hex sk and ecash: address of a given mnemonic using ecash-lib methods
 *
 * Usage
 * npx tsx getWallet.ts "your mnemonic"
 *
 * Note that ecash-lib does not validate mnemonics, so any string will be accepted
 */

const mnemonic = process.argv[2];

if (!mnemonic) {
    throw new Error('MNEMONIC is not set');
}

const seed = mnemonicToSeed(mnemonic);
const master = HdNode.fromSeed(seed);

// Use XEC token-aware wallet path
const xecMaster = master.derivePath(XEC_TOKEN_AWARE_DERIVATION_PATH);
const sk = toHex(xecMaster.seckey()!);
console.log(`sk:      ${sk}`);
const address = encodeCashAddress('ecash', 'p2pkh', toHex(xecMaster.pkh()!));
console.log(`address: ${address}`);
