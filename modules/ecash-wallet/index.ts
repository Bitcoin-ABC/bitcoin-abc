// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Script, Ecc, shaRmd160, Address } from 'ecash-lib';
import { ChronikClient, ScriptUtxo } from 'chronik-client';

/**
 * Confirmations required before coinbase utxos
 * are spendable
 *
 * On eCash, coinbase utxos may be
 *
 * - mining rewards
 * - staking rewards
 * - IFP rewards
 */
export const COINBASE_MATURITY = 100;

/**
 * Wallet
 *
 * Implements a one-address eCash (XEC) wallet
 * Useful for running a simple hot wallet
 */
class Wallet {
    /** Initialized chronik instance */
    chronik: ChronikClient;
    /** Initialized Ecc instance */
    ecc: Ecc;
    /** Secret key of the wallet */
    sk: Uint8Array;
    /** Public key derived from sk */
    pk: Uint8Array;
    /** Hash160 of the public key */
    pkh: Uint8Array;
    /** p2pkh output script of this wallet */
    script: Script;
    /** p2pkh cashaddress of this wallet */
    address: string;
    /**
     * height of chaintip of last sync
     * zero if wallet has never successfully synced
     * We need this info to determine spendability
     * of coinbase utxos
     */
    tipHeight: number;
    /** The utxo set of this wallet */
    utxos: ScriptUtxo[];

    private constructor(sk: Uint8Array, chronik: ChronikClient) {
        this.sk = sk;
        this.chronik = chronik;

        this.ecc = new Ecc();

        // Calculate values derived from the sk
        this.pk = this.ecc.derivePubkey(sk);
        this.pkh = shaRmd160(this.pk);
        this.script = Script.p2pkh(this.pkh);
        this.address = Address.p2pkh(this.pkh).toString();

        // Constructors cannot be async, so we must sync() to get utxos and tipHeight
        this.tipHeight = 0;
        this.utxos = [];
    }

    /**
     * Update Wallet
     * - Set utxos to latest from chronik
     * - Set tipHeight to latest from chronik
     *
     * NB the reason we update tipHeight with sync() is
     * to determine which (if any) coinbase utxos
     * are spendable when we build txs
     */
    public async sync(): Promise<void> {
        // Update the utxo set
        const utxos = (await this.chronik.address(this.address).utxos()).utxos;

        // Get tipHeight of last sync()
        const tipHeight = (await this.chronik.blockchainInfo()).tipHeight;

        // Only set chronik-dependent fields if we got no errors
        this.utxos = utxos;
        this.tipHeight = tipHeight;
    }

    /**
     * Return all spendable UTXOs only containing sats and no tokens
     *
     * - Any spendable coinbase UTXO without tokens
     * - Any non-coinbase UTXO without tokens
     */
    public spendableSatsOnlyUtxos(): ScriptUtxo[] {
        return this.utxos
            .filter(
                utxo =>
                    typeof utxo.token === 'undefined' &&
                    utxo.isCoinbase === false,
            )
            .concat(this._spendableCoinbaseUtxos());
    }

    /**
     * Return all spendable coinbase utxos
     * i.e. coinbase utxos with COINBASE_MATURITY confirmations
     */
    private _spendableCoinbaseUtxos(): ScriptUtxo[] {
        return this.utxos.filter(
            utxo =>
                utxo.isCoinbase === true &&
                typeof utxo.token === 'undefined' &&
                this.tipHeight - utxo.blockHeight >= COINBASE_MATURITY,
        );
    }

    /**
     * static constructor for sk as Uint8Array
     */
    static fromSk(sk: Uint8Array, chronik: ChronikClient) {
        return new Wallet(sk, chronik);
    }
}

export default Wallet;
