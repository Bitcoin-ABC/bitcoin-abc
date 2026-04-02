// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    Address,
    ALL_BIP143,
    copyTxInput,
    DEFAULT_FEE_SATS_PER_KB,
    fromHex,
    P2SHMultisigSignatory,
    payment,
    Script,
    shaRmd160,
    SigHashType,
    toHexRev,
    Tx,
} from 'ecash-lib';
import type { Signatory } from 'ecash-lib';
import { ChronikClient } from 'chronik-client';
import { WalletBase } from './walletBase';
import {
    BuiltAction,
    SelectUtxosConfig,
    WalletAction,
    WalletUtxo,
} from './wallet';

/**
 * Participant in an m-of-n P2SH multisig. Pubkeys are ordered only after
 * {@link MultisigWallet.fromCosigners} applies Electrum-ABC–style lexicographic sort.
 */
export interface MultisigCosigner {
    pk: Uint8Array;
    sk?: Uint8Array;
}

interface MultisigAddressData {
    pk: Uint8Array;
    pkh: Uint8Array;
    script: Script;
    address: string;
    sk?: Uint8Array;
}

/**
 * Lexicographic compare of pubkey bytes — same order as Electrum-ABC
 * `MultisigWallet.pubkeys_to_redeem_script` (`electrum/electrumabc/wallet.py`, uses `sorted(pubkeys)`).
 *
 * Return value follows `Array.sort`: negative if `a` precedes `b`, positive if `b` precedes `a`.
 * **`0` means equal pubkeys** (same length and identical bytes): the loop only finishes without
 * a differing byte when every shared-index pair matches; the final `length` difference is then
 * zero iff the lengths agree. So `comparePubkeysLex(a, b) === 0` doubles as an equality test.
 */
function comparePubkeysLex(a: Uint8Array, b: Uint8Array): number {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        if (a[i] !== b[i]) {
            return a[i]! < b[i]! ? -1 : 1;
        }
    }
    return a.length - b.length;
}

/**
 * Sort cosigners by pubkey bytes to match Electrum-ABC `pubkeys_to_redeem_script`
 * (`electrum/electrumabc/wallet.py`). Reject duplicate pubkeys.
 */
function normalizeCosigners(cosigners: MultisigCosigner[]): MultisigCosigner[] {
    const sorted = [...cosigners].sort((a, b) => comparePubkeysLex(a.pk, b.pk));
    for (let i = 1; i < sorted.length; i++) {
        if (comparePubkeysLex(sorted[i].pk, sorted[i - 1].pk) === 0) {
            throw new Error('Duplicate cosigner pubkey');
        }
    }
    return sorted;
}

/**
 * m-of-n P2SH-wrapped ECDSA multisig (single address; OP_CHECKMULTISIG in redeem script).
 *
 * **Electrum-ABC compatibility:** redeem script pubkeys are ordered by **lexicographic byte order**
 * (`electrum/electrumabc/wallet.py`, `MultisigWallet.pubkeys_to_redeem_script`). Pass cosigners in any order;
 * `fromCosigners` canonicalizes internally. `ecash-lib` remains agnostic; this policy is
 * `ecash-wallet` only.
 *
 * **UTXO set:** unlike {@link Wallet}, `action(...).build()` does not optimistically remove spent
 * UTXOs or add new outputs. After {@link BuiltAction.broadcast}, call {@link MultisigWallet.sync}
 * on each cosigner instance that should track the chain.
 */
export class MultisigWallet extends WalletBase<MultisigAddressData> {
    readonly m: number;
    readonly n: number;
    readonly cosigners: MultisigCosigner[];
    readonly redeemScript: Script;

    readonly isMultisig = true;

    /**
     * This party's signing key pair — {@link fromCosigners} requires exactly one `sk` among cosigners.
     */
    readonly signingKey: { pk: Uint8Array; sk: Uint8Array };

    private constructor(
        chronik: ChronikClient,
        m: number,
        cosigners: MultisigCosigner[],
        options?: { prefix?: string },
    ) {
        const n = cosigners.length;
        const pubkeys = cosigners.map(c => c.pk);
        const redeemScript = Script.multisig(m, pubkeys);
        const script = Script.p2sh(shaRmd160(redeemScript.bytecode));
        const prefix = options?.prefix ?? 'ecash';
        const address = Address.fromScript(script, prefix).toString();

        const signer = cosigners.find(c => c.sk !== undefined)!;
        const signingKey = { pk: signer.pk, sk: signer.sk! };

        super(chronik, address, undefined, 0);
        this.m = m;
        this.n = n;
        this.cosigners = cosigners;
        this.redeemScript = redeemScript;
        this.signingKey = signingKey;
        this.script = script;
        this.pkh = shaRmd160(redeemScript.bytecode);
        this.pk = signingKey.pk;
        this.keypairs.set(address, {
            pk: signingKey.pk,
            sk: signingKey.sk,
            pkh: this.pkh,
            script,
            address,
        });
    }

    protected _deriveKeypair(
        _forChange: boolean,
        _index: number,
    ): MultisigAddressData {
        throw new Error('HD multisig not yet supported');
    }

    /**
     * Create an m-of-n multisig wallet.
     * Pubkeys are sorted lexicographically before building the redeem script (Electrum-ABC convention).
     *
     * Exactly **one** cosigner must include `sk`: this type models a **single** party’s wallet.
     * Other signers use separate `MultisigWallet` instances, each with its own `sk` on the right entry.
     */
    static fromCosigners(
        cosigners: MultisigCosigner[],
        m: number,
        chronik: ChronikClient,
        options?: { prefix?: string },
    ): MultisigWallet {
        if (cosigners.length < m) {
            throw new Error(
                `Need at least ${m} cosigners for ${m}-of-${cosigners.length}`,
            );
        }
        const normalized = normalizeCosigners(cosigners);
        const nSk = normalized.filter(c => c.sk !== undefined).length;
        if (nSk !== 1) {
            throw new Error(
                'MultisigWallet: exactly one cosigner must include a secret key',
            );
        }
        return new MultisigWallet(chronik, m, normalized, options);
    }

    public async sync(): Promise<void> {
        const result = await this.chronik.address(this.address).utxos();
        this.utxos = this._convertToWalletUtxos(
            result.utxos,
            result.outputScript,
        );
        const info = await this.chronik.blockchainInfo();
        this.tipHeight = info.tipHeight;
        this.updateBalance();
    }

    /**
     * Wrapper for {@link p2shMultisigUtxoToBuilderInput} (satisfies {@link ActionableWallet}).
     * Signs with {@link signingKey}.
     */
    public utxoToBuilderInput(
        utxo: WalletUtxo,
        sighash: SigHashType = ALL_BIP143,
    ) {
        return this.p2shMultisigUtxoToBuilderInput(utxo, sighash);
    }

    public action(
        action: payment.Action,
        config: SelectUtxosConfig = {},
    ): WalletAction {
        return WalletAction.fromAction(this, action, config);
    }

    /**
     * Build a TxBuilder input for a multisig UTXO (P2SH-wrapped redeem script).
     * Uses {@link signingKey} as the partial signer.
     */
    public p2shMultisigUtxoToBuilderInput(
        utxo: WalletUtxo,
        sighash: SigHashType = ALL_BIP143,
    ) {
        const signatory: Signatory = P2SHMultisigSignatory(
            this.m,
            this.cosigners.map(c => c.pk),
            this.signingKey.sk,
            this.signingKey.pk,
            sighash,
        );
        return {
            input: {
                prevOut: utxo.outpoint,
                signData: {
                    sats: utxo.sats,
                    redeemScript: this.redeemScript,
                },
            },
            signatory,
        };
    }

    /**
     * Build {@link TxInput.signData} for an input by resolving its prevout against this wallet’s
     * synced {@link utxos}. Raw serialized txs omit `signData`; this restores `sats` and
     * `redeemScript` so BIP143 preimage / multisig signing can run after hex round-trip.
     *
     * @throws if no UTXO in this wallet matches `tx.inputs[inputIdx].prevOut` — call {@link sync} first.
     */
    private getSignDataForInput(
        tx: Tx,
        inputIdx: number,
    ): { sats: bigint; redeemScript: Script } {
        const prevOut = tx.inputs[inputIdx].prevOut;
        const prevOutTxidHex =
            typeof prevOut.txid === 'string'
                ? prevOut.txid
                : toHexRev(prevOut.txid);
        const utxo = this.utxos.find(u => {
            const uTxidHex =
                typeof u.outpoint.txid === 'string'
                    ? u.outpoint.txid
                    : toHexRev(u.outpoint.txid);
            return (
                uTxidHex === prevOutTxidHex &&
                u.outpoint.outIdx === prevOut.outIdx
            );
        });
        if (!utxo) {
            throw new Error(
                `UTXO ${prevOutTxidHex}:${prevOut.outIdx} not found in wallet`,
            );
        }
        return { sats: utxo.sats, redeemScript: this.redeemScript };
    }

    /**
     * Like {@link getSignDataForInput}, but returns `undefined` when this wallet does not hold the
     * prevout (e.g. inputs spent from other addresses). Used to re-attach `signData` only where
     * applicable when hydrating a deserialized tx.
     */
    private trySignDataForInput(
        tx: Tx,
        inputIdx: number,
    ): { sats: bigint; redeemScript: Script } | undefined {
        try {
            return this.getSignDataForInput(tx, inputIdx);
        } catch {
            return undefined;
        }
    }

    /**
     * Add this wallet's cosigner signature(s) to a partially signed tx (hex from another party).
     * Call {@link sync} first so UTXOs are available for signData matching.
     *
     * @throws if every input matching this wallet's redeem script already has `m` signatures
     *   (nothing to add; avoids returning an unchanged tx silently).
     */
    public signPartialTx(partialTxHex: string): BuiltAction {
        let tx = Tx.deser(fromHex(partialTxHex));
        tx = new Tx({
            version: tx.version,
            inputs: tx.inputs.map((inp, i) => {
                const signData = this.trySignDataForInput(tx, i);
                return signData !== undefined
                    ? { ...copyTxInput(inp), signData }
                    : copyTxInput(inp);
            }),
            outputs: tx.outputs,
            locktime: tx.locktime,
        });

        let sawOurMultisigInput = false;
        let sawOurMultisigInputNeedingSignature = false;

        for (let i = 0; i < tx.inputs.length; i++) {
            const script = tx.inputs[i].script;
            if (!script || script.bytecode.length === 0) {
                continue;
            }
            let parsed;
            try {
                parsed = script.parseP2shMultisigSpend();
            } catch {
                continue;
            }
            if (parsed.isSchnorr) {
                throw new Error(
                    'MultisigWallet supports ECDSA P2SH multisig only (not Schnorr checkbits)',
                );
            }
            if (parsed.redeemScript.toHex() !== this.redeemScript.toHex()) {
                continue;
            }
            sawOurMultisigInput = true;
            const sigCount = parsed.signatures.filter(
                (s): s is Uint8Array => s !== undefined,
            ).length;
            if (sigCount >= parsed.numSignatures) {
                continue;
            }
            sawOurMultisigInputNeedingSignature = true;
            const signData = this.getSignDataForInput(tx, i);
            tx = tx.addMultisigSignatureFromKey({
                inputIdx: i,
                sk: this.signingKey.sk,
                signData,
                ecc: this.ecc,
            });
        }

        if (sawOurMultisigInput && !sawOurMultisigInputNeedingSignature) {
            throw new Error(
                'Multisig inputs for this wallet are already fully signed; nothing to add',
            );
        }

        return new BuiltAction(this, [tx], DEFAULT_FEE_SATS_PER_KB);
    }
}
