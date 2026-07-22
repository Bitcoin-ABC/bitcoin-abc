// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { ChronikClient } from 'chronik-client';
import { Address, HdNode, mnemonicToSeed } from 'ecash-lib';
import { Wallet } from 'ecash-wallet';
import { assertBip39Mnemonic } from '../config/mnemonic';

/** BIP44 account index for the public seller / inventory address. */
export const SELLER_ACCOUNT = 0;
/** BIP44 account index for slush (deposit / change / LP reserve). */
export const SLUSH_ACCOUNT = 1;

export type LpAddresses = {
    sellerAddress: string;
    slushAddress: string;
    /**
     * Fee / misc-sweep payout address from config.
     * The fee wallet should be off the server and does not need to be a hot
     * wallet.
     */
    feeAddress: string;
};

export type LpWallets = {
    seller: Wallet;
    slush: Wallet;
    addresses: LpAddresses;
};

/**
 * Assert `address` is a valid `ecash:` cashaddr and return its canonical form.
 */
export const assertEcashAddress = (address: string, label: string): string => {
    if (typeof address !== 'string' || address.trim() === '') {
        throw new Error(`${label} must be a non-empty ecash address`);
    }
    const trimmed = address.trim();
    try {
        const parsed = Address.fromCashAddress(trimmed);
        if (parsed.prefix !== 'ecash') {
            throw new Error('wrong prefix');
        }
        return parsed.withPrefix('ecash').toString();
    } catch {
        throw new Error(`${label} is not a valid ecash address: ${trimmed}`);
    }
};

/**
 * Derive `m/44'/1899'/{account}'/0/0` for a BIP39 mnemonic (no Chronik needed).
 */
export const deriveRoleAddress = (
    mnemonic: string,
    accountNumber: number,
): string => {
    if (!Number.isInteger(accountNumber) || accountNumber < 0) {
        throw new Error(
            `accountNumber must be a non-negative integer (got ${accountNumber})`,
        );
    }
    const validated = assertBip39Mnemonic(mnemonic);
    const master = HdNode.fromSeed(mnemonicToSeed(validated));
    const node = master.derivePath(`m/44'/1899'/${accountNumber}'/0/0`);
    return Address.p2pkh(node.pkh()!).toString();
};

/**
 * Resolve seller / slush from the server mnemonic and validate `feeAddress`.
 *
 * Rejects feeAddress equal to seller or slush. The fee wallet should be off
 * the server and does not need to be a hot wallet.
 */
export const resolveLpAddresses = (
    mnemonic: string,
    feeAddressRaw: string,
): LpAddresses => {
    const sellerAddress = deriveRoleAddress(mnemonic, SELLER_ACCOUNT);
    const slushAddress = deriveRoleAddress(mnemonic, SLUSH_ACCOUNT);
    if (sellerAddress === slushAddress) {
        throw new Error(
            'Derived seller and slush addresses collide; check mnemonic',
        );
    }

    const feeAddress = assertEcashAddress(feeAddressRaw, 'feeAddress');
    if (feeAddress === sellerAddress || feeAddress === slushAddress) {
        throw new Error(
            'feeAddress must not collide with seller or slush address',
        );
    }

    return { sellerAddress, slushAddress, feeAddress };
};

/**
 * Build seller + slush `Wallet` instances (HD accounts 0 and 1).
 *
 * Chronik is required by the Wallet constructor but is not contacted until
 * `sync()` (roadmap step 5). Pass `MockChronikClient` in unit tests.
 * Fee payouts use config `feeAddress` only. The fee wallet should be off the
 * server and does not need to be a hot wallet.
 */
export const createLpWallets = (
    mnemonic: string,
    chronik: ChronikClient,
    feeAddress: string,
): LpWallets => {
    const validated = assertBip39Mnemonic(mnemonic);
    const seller = Wallet.fromMnemonic(validated, chronik, {
        hd: true,
        accountNumber: SELLER_ACCOUNT,
    });
    const slush = Wallet.fromMnemonic(validated, chronik, {
        hd: true,
        accountNumber: SLUSH_ACCOUNT,
    });

    const addresses = resolveLpAddresses(validated, feeAddress);

    if (seller.address !== addresses.sellerAddress) {
        throw new Error('Seller Wallet address does not match HD derivation');
    }
    if (slush.address !== addresses.slushAddress) {
        throw new Error('Slush Wallet address does not match HD derivation');
    }

    return { seller, slush, addresses };
};
