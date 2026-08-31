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

/** BIP44 `m/44'/1899'/{account}'/0/0` node for a BIP39 mnemonic. */
const deriveRoleNode = (mnemonic: string, accountNumber: number): HdNode => {
    if (!Number.isInteger(accountNumber) || accountNumber < 0) {
        throw new Error(
            `accountNumber must be a non-negative integer (got ${accountNumber})`,
        );
    }
    const validated = assertBip39Mnemonic(mnemonic);
    const master = HdNode.fromSeed(mnemonicToSeed(validated));
    return master.derivePath(`m/44'/1899'/${accountNumber}'/0/0`);
};

/**
 * Derive `m/44'/1899'/{account}'/0/0` for a BIP39 mnemonic (no Chronik needed).
 */
export const deriveRoleAddress = (
    mnemonic: string,
    accountNumber: number,
): string => {
    const node = deriveRoleNode(mnemonic, accountNumber);
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
 * Build seller + slush `Wallet` instances from BIP44 accounts 0 and 1.
 *
 * Addresses are still `m/44'/1899'/{0,1}'/0/0`. Seller and slush are both
 * single-address wallets (not HD) so change always returns to that same
 * address. HD is only used to pick the two role keys from one mnemonic.
 * Chronik is required by the Wallet constructor but is not contacted until
 * `sync()`. Pass `MockChronikClient` in unit tests.
 * Fee payouts use config `feeAddress` only. The fee wallet should be off the
 * server and does not need to be a hot wallet.
 */
export const createLpWallets = (
    mnemonic: string,
    chronik: ChronikClient,
    feeAddress: string,
): LpWallets => {
    const validated = assertBip39Mnemonic(mnemonic);
    const sellerSk = deriveRoleNode(validated, SELLER_ACCOUNT).seckey();
    const slushSk = deriveRoleNode(validated, SLUSH_ACCOUNT).seckey();
    if (sellerSk === undefined || slushSk === undefined) {
        throw new Error('Failed to derive seller or slush secret key');
    }
    const seller = Wallet.fromSk(sellerSk, chronik);
    const slush = Wallet.fromSk(slushSk, chronik);

    const addresses = resolveLpAddresses(validated, feeAddress);

    if (seller.address !== addresses.sellerAddress) {
        throw new Error('Seller Wallet address does not match HD derivation');
    }
    if (slush.address !== addresses.slushAddress) {
        throw new Error('Slush Wallet address does not match HD derivation');
    }

    return { seller, slush, addresses };
};
