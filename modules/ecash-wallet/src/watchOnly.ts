// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Script, Address, shaRmd160, HdNode, fromHex } from 'ecash-lib';
import { ChronikClient } from 'chronik-client';
import { WalletBase } from './walletBase';

/**
 * Keypair data for a watch-only HD wallet address (public key only)
 */
export interface WatchOnlyKeypairData {
    pk: Uint8Array;
    pkh: Uint8Array;
    script: Script;
    address: string;
}

/**
 * WatchOnlyWallet
 *
 * Implements a watch-only wallet that can track addresses and UTXOs
 * without private keys. Supports both single-address and HD wallets.
 *
 * - Can be initialized by an address (non-HD)
 * - Can be initialized by an xpub (HD)
 * - HD version can be initialized with same options shape as Wallet
 * - Has utxos and balanceSats
 * - HD version can get next change address and next receive address
 * - Does not track tipHeight as it does not track spendability
 */
export class WatchOnlyWallet extends WalletBase<WatchOnlyKeypairData> {
    protected constructor(
        chronik: ChronikClient,
        address?: string,
        baseHdNode?: HdNode,
        accountNumber: number = 0,
        prefix: string = 'ecash',
    ) {
        super(chronik, address, baseHdNode, accountNumber);

        if (this.isHD && this.baseHdNode) {
            this.prefix = prefix;
            // HD wallet: derive and cache the first receive address (index 0)
            const firstKeypair = this._deriveKeypair(false, 0);
            this.keypairs.set(firstKeypair.address, firstKeypair);
            // Set wallet's main address to be the first receive address
            this.address = firstKeypair.address;
            this.script = firstKeypair.script;
            this.pkh = firstKeypair.pkh;
            this.pk = firstKeypair.pk;
        } else if (address) {
            // Non-HD wallet: single address
            this.address = address;
            const addrObj = Address.fromCashAddress(address);
            // Address.hash is a hex string, convert to Uint8Array
            this.pkh = fromHex(addrObj.hash);
            this.script = Script.p2pkh(this.pkh);
            this.prefix = addrObj.prefix ?? prefix;
            // For watch-only, we don't have the public key, so pk remains undefined
        } else {
            throw new Error(
                'WatchOnlyWallet must be initialized with either an address or xpub',
            );
        }
    }

    /**
     * Derive a keypair at a specific path for HD wallets (public key only)
     * Path: m/44'/1899'/<accountNumber>'/<forChange ? 1 : 0>/<index>
     *
     * @param forChange - If true, derive change address (chain 1), otherwise receive address (chain 0)
     * @param index - The address index
     * @returns Keypair data for the derived address (public key only)
     * @throws Error if wallet is not HD or baseHdNode is not set
     */
    protected _deriveKeypair(
        forChange: boolean,
        index: number,
    ): WatchOnlyKeypairData {
        if (!this.isHD || !this.baseHdNode) {
            throw new Error('_deriveKeypair can only be called on HD wallets');
        }

        // Derive path: m/44'/1899'/<accountNumber>'/<forChange ? 1 : 0>/<index>
        const chainIndex = forChange ? 1 : 0;
        const chainNode = this.baseHdNode.derive(chainIndex);
        const addressNode = chainNode.derive(index);

        const pk = addressNode.pubkey();
        const pkh = shaRmd160(pk);
        const script = Script.p2pkh(pkh);
        const address = Address.p2pkh(pkh, this.prefix).toString();

        return {
            pk,
            pkh,
            script,
            address,
        };
    }

    /**
     * Update Wallet
     * - Set utxos to latest from chronik
     *
     * For HD wallets, syncs all addresses at or below current indices
     * (receive addresses 0 to receiveIndex, change addresses 0 to changeIndex)
     */
    public async sync(): Promise<void> {
        if (!this.isHD) {
            // Single-address wallet: use existing sync logic
            if (!this.address) {
                throw new Error('Cannot sync: wallet has no address');
            }
            const result = await this.chronik.address(this.address).utxos();

            // Convert ScriptUtxos to WalletUtxos (derive address once for all UTXOs)
            this.utxos = this._convertToWalletUtxos(
                result.utxos,
                result.outputScript,
            );
            this.updateBalance();
            return;
        }

        // HD wallet: sync all addresses at or below current indices
        await this._syncHDWallet();
    }

    /**
     * Static constructor from a single address (non-HD)
     *
     * @param address - The cashaddress to watch
     * @param chronik - Initialized ChronikClient instance
     */
    static fromAddress(
        address: string,
        chronik: ChronikClient,
    ): WatchOnlyWallet {
        return new WatchOnlyWallet(chronik, address);
    }

    /**
     * Static constructor from xpub (HD wallet)
     *
     * @param xpub - The extended public key string
     * @param chronik - Initialized ChronikClient instance
     * @param prefix - The prefix of the address (defaults to 'ecash')
     * @param options - Optional configuration
     * @param options.accountNumber - Account number for HD wallets (BIP44 account index). Defaults to 0.
     * @param options.receiveIndex - Initial receive address index (only used for HD wallets). Defaults to 0.
     * @param options.changeIndex - Initial change address index (only used for HD wallets). Defaults to 0.
     */
    static fromXpub(
        xpub: string,
        chronik: ChronikClient,
        options?: {
            accountNumber?: number;
            receiveIndex?: number;
            changeIndex?: number;
            prefix?: string;
        },
    ): WatchOnlyWallet {
        // Decode xpub to get the base node using HdNode.fromXpub
        // The xpub should be at the account level: m/44'/1899'/<accountNumber>'
        const baseHdNode = HdNode.fromXpub(xpub);

        // Validate that the xpub is at the correct depth (should be depth 3 for account level)
        // m/44'/1899'/<accountNumber>' has depth 3
        if (baseHdNode.depth() !== 3) {
            throw new Error(
                `Invalid xpub depth: expected depth 3 (account level), got ${baseHdNode.depth()}. ` +
                    `xpub should be at path m/44'/1899'/<accountNumber>'`,
            );
        }

        const accountNumber = options?.accountNumber ?? 0;
        const wallet = new WatchOnlyWallet(
            chronik,
            undefined,
            baseHdNode,
            accountNumber,
            options?.prefix ?? 'ecash',
        );

        // Set initial indices (default to 0 if not provided)
        wallet.receiveIndex = options?.receiveIndex ?? 0;
        wallet.changeIndex = options?.changeIndex ?? 0;

        return wallet;
    }
}
