// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * wallet.ts
 * methods for working with a server-based hotwallet
 */

import { ChronikClient, ScriptUtxo } from 'chronik-client';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bip39 from 'bip39';
import { encodeCashAddress } from 'ecashaddrjs';
const bip32 = BIP32Factory(ecc);

export interface ServerWallet {
    address: string;
    sk: Uint8Array;
    utxos?: ScriptUtxo[];
}

/**
 * Get address and wif from a valid bip39 seed
 * @param mnemonic valid bip39 mnemonic
 * @throws if mnemonic is not a valid bip39 mnemonic
 */
export function getWalletFromSeed(mnemonic: string): ServerWallet {
    // validate mnemonic
    const isValidMnemonic = bip39.validateMnemonic(mnemonic);
    if (!isValidMnemonic) {
        throw new Error('getWalletFromSeed called with invalid mnemonic');
    }

    const seed = bip39.mnemonicToSeedSync(mnemonic);

    const ECASH_DERIVATION_PATH_TOKENS = `m/44'/1899'/0'/0/0`;

    const root = bip32.fromSeed(seed);

    const child = root.derivePath(ECASH_DERIVATION_PATH_TOKENS);

    // Get private key and public key
    const { privateKey, identifier } = child;

    // bip32 child.privateKey is Buffer | undefined
    const skString = privateKey!.toString('hex');
    console.log(`sk as hex string: ${skString}`);

    const address = encodeCashAddress('ecash', 'p2pkh', identifier);

    return { address, sk: Uint8Array.from(Buffer.from(skString, 'hex')) };
}

/**
 * Get latest utxo set for given ServerWallet
 * @param chronik
 * @param wallet
 * @throws if error in chronik call
 */
export async function syncWallet(
    chronik: ChronikClient,
    wallet: ServerWallet,
): Promise<ServerWallet> {
    const { address } = wallet;
    wallet.utxos = (await chronik.address(address).utxos()).utxos;
    return wallet;
}
