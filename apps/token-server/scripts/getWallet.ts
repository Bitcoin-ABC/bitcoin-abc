// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * getWallet.ts
 * Generate a 12-word seed for an eCash wallet
 *
 * Generate a new 12-word seed and wallet
 * ts-node scripts/getWallet.ts
 *
 * Get address, wif, and utxo set from an existing wallet
 * ts-node scripts/getWallet.ts "spare pudding shuffle cruise crater column loud unknown design abstract climb estate"
 */

import config from '../config';
import { ChronikClientNode } from 'chronik-client';
import * as bip39 from 'bip39';
import { ServerWallet, getWalletFromSeed, syncWallet } from '../src/wallet';

// Initialize new in-node chronik connection
const chronik = new ChronikClientNode(config.chronikUrls);

// Get input from bash or use defaults
const mnemonic =
    typeof process.argv[2] !== 'undefined' ? process.argv[2] : undefined;

interface WalletReturn {
    makingNewWallet: boolean;
    mnemonic: string;
    wallet: ServerWallet;
}
/**
 * Generate a new wallet OR, if called with a valid 12-word mnemonic,
 * give its corresponding, address, wif, and utxo set
 * @param chronik
 * @param mnemonic
 */
async function getWallet(
    chronik: ChronikClientNode,
    mnemonic?: string,
): Promise<WalletReturn> {
    const makingNewWallet = typeof mnemonic === 'undefined';
    if (typeof mnemonic === 'undefined') {
        // Need to use `if (typeof mnemonic === 'undefined')` instead of `if (makingNewWallet)`
        // as typescript will throw lint error on `const wallet = getWalletFromSeed(mnemonic)`
        // with the second approach (says mnemonic may be undefined)
        mnemonic = bip39.generateMnemonic();
    }
    const wallet = getWalletFromSeed(mnemonic);
    if (makingNewWallet) {
        await syncWallet(chronik, wallet);
    }
    return { makingNewWallet, mnemonic, wallet };
}

getWallet(chronik, mnemonic).then(
    result => {
        const { makingNewWallet, mnemonic, wallet } = result;
        console.log(
            '\x1b[32m%s\x1b[0m',
            `✔ Wallet ${makingNewWallet ? 'generated' : 'synced'}`,
        );
        console.log(mnemonic);
        console.log(wallet);
        process.exit(0);
    },
    err => {
        console.log('\x1b[31m%s\x1b[0m', `Error in getWallet`, err);
        process.exit(1);
    },
);
