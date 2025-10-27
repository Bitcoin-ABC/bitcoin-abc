// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    Script,
    Ecc,
    shaRmd160,
    Address,
    TxBuilderInput,
    DEFAULT_DUST_SATS,
    DEFAULT_FEE_SATS_PER_KB,
    P2PKHSignatory,
    ALL_BIP143,
    ALL_ANYONECANPAY_BIP143,
    TxBuilder,
    Tx,
    calcTxFee,
    OP_RETURN,
    emppScript,
    slpGenesis,
    alpGenesis,
    slpSend,
    slpBurn,
    alpSend,
    alpBurn,
    slpMint,
    alpMint,
    SLP_MAX_SEND_OUTPUTS,
    TxOutput,
    TxBuilderOutput,
    COINBASE_MATURITY,
    OP_RETURN_MAX_BYTES,
    ALP_POLICY_MAX_OUTPUTS,
    payment,
    XEC_TOKEN_AWARE_DERIVATION_PATH,
    mnemonicToSeed,
    HdNode,
    toHex,
    SLP_TOKEN_TYPE_NFT1_CHILD,
    toHexRev,
    sha256d,
    SLP_TOKEN_TYPE_NFT1_GROUP,
} from 'ecash-lib';
import { ChronikClient, ScriptUtxo, TokenType } from 'chronik-client';

/**
 * Wallet
 *
 * Implements a one-address eCash (XEC) wallet
 * Useful for running a simple hot wallet
 */
export class Wallet {
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
            .concat(
                this._spendableCoinbaseUtxos().filter(
                    utxo => typeof utxo.token === 'undefined',
                ),
            );
    }

    /**
     * Return all spendable utxos
     */
    public spendableUtxos(): ScriptUtxo[] {
        return this.utxos
            .filter(utxo => utxo.isCoinbase === false)
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
                this.tipHeight - utxo.blockHeight >= COINBASE_MATURITY,
        );
    }

    /** Create class that supports action-fulfilling methods  */
    public action(
        /**
         * User-specified instructions for desired on-chain action(s)
         *
         * Note that an Action may take more than 1 tx to fulfill
         */
        action: payment.Action,
        /**
         * Strategy for selecting satoshis in UTXO selection
         * @default SatsSelectionStrategy.REQUIRE_SATS
         */
        satsStrategy: SatsSelectionStrategy = SatsSelectionStrategy.REQUIRE_SATS,
    ): WalletAction {
        return WalletAction.fromAction(this, action, satsStrategy);
    }

    /**
     * Convert a ScriptUtxo into a TxBuilderInput
     */
    public p2pkhUtxoToBuilderInput(
        utxo: ScriptUtxo,
        sighash = ALL_BIP143,
    ): TxBuilderInput {
        // Sign and prep utxos for ecash-lib inputs
        return {
            input: {
                prevOut: {
                    txid: utxo.outpoint.txid,
                    outIdx: utxo.outpoint.outIdx,
                },
                signData: {
                    sats: utxo.sats,
                    outputScript: this.script,
                },
            },
            signatory: P2PKHSignatory(this.sk, this.pk, sighash),
        };
    }

    /**
     * static constructor for sk as Uint8Array
     */
    static fromSk(sk: Uint8Array, chronik: ChronikClient) {
        return new Wallet(sk, chronik);
    }

    /**
     * static constructor from mnemonic
     *
     * NB ecash-lib mnemonicToSeed does not validate for bip39 mnemonics
     * Any string will be walletized
     */
    static fromMnemonic(mnemonic: string, chronik: ChronikClient) {
        const seed = mnemonicToSeed(mnemonic);
        const master = HdNode.fromSeed(seed);

        // ecash-wallet Wallets are token aware, so we use the token-aware derivation path
        const xecMaster = master.derivePath(XEC_TOKEN_AWARE_DERIVATION_PATH);
        const sk = xecMaster.seckey()!;

        return Wallet.fromSk(sk, chronik);
    }

    /**
     * Create a deep clone of this wallet
     * Useful for testing scenarios where you want to use a wallet
     * without mutating the original
     */
    clone(): Wallet {
        // Create a new wallet instance with the same secret key and chronik client
        const clonedWallet = new Wallet(this.sk, this.chronik);

        // Copy the mutable state
        clonedWallet.tipHeight = this.tipHeight;
        clonedWallet.utxos = [...this.utxos]; // Shallow copy of the array

        return clonedWallet;
    }

    /**
     * Return total quantity of satoshis held
     * by arbitrary array of utxos
     */
    static sumUtxosSats = (utxos: ScriptUtxo[]): bigint => {
        return utxos
            .map(utxo => utxo.sats)
            .reduce((prev, curr) => prev + curr, 0n);
    };
}

/**
 * eCash tx(s) that fulfill(s) an Action
 */
class WalletAction {
    private _wallet: Wallet;
    public action: payment.Action;
    public actionTotal: ActionTotal;
    public selectUtxosResult: SelectUtxosResult;

    private constructor(
        wallet: Wallet,
        action: payment.Action,
        selectUtxosResult: SelectUtxosResult,
        actionTotal: ActionTotal,
    ) {
        this._wallet = wallet;
        this.action = action;
        this.selectUtxosResult = selectUtxosResult;
        this.actionTotal = actionTotal;
    }

    static fromAction(
        wallet: Wallet,
        action: payment.Action,
        satsStrategy: SatsSelectionStrategy = SatsSelectionStrategy.REQUIRE_SATS,
    ): WalletAction {
        const selectUtxosResult = selectUtxos(
            action,
            wallet.spendableUtxos(),
            satsStrategy,
        );

        // NB actionTotal is an intermediate value calculated in selectUtxos
        // Since it is dependent on action and spendable utxos, we do not want it
        // to be a standalone param for selectUtxos
        // We need it here to get sat totals for tx building
        const actionTotal = getActionTotals(action);
        // Create a new WalletAction with the same wallet and action
        return new WalletAction(wallet, action, selectUtxosResult, actionTotal);
    }

    /**
     * Build chained txs to fulfill a multi-tx action
     * Chained txs fulfill a limited number of known cases
     * Incrementally add to this method to cover them all
     * [x] Intentional SLP burn where we do not have exact atoms available
     * [x] SLP_TOKEN_TYPE_NFT1_CHILD mints where we do not have a qty-1 input
     * [] Token txs with outputs exceeding spec per-tx limits, or ALP txs where outputs and data pushes exceed OP_RETURN limits
     * [] XEC or XEC-and-token txs where outputs would cause tx to exceed 100kb broadcast limit
     */
    private _buildChained(sighash = ALL_BIP143): BuiltAction {
        // Check the specific chained transaction type
        switch (this.selectUtxosResult.chainedTxType) {
            case ChainedTxType.INTENTIONAL_BURN:
                return this._buildIntentionalBurnChained(sighash);
            case ChainedTxType.NFT_MINT_FANOUT:
                return this._buildNftMintFanoutChained(sighash);
            default:
                // For now, we only support intentional SLP burns and NFT mint fanouts
                throw new Error(
                    `Unsupported chained transaction type: ${this.selectUtxosResult.chainedTxType}`,
                );
        }
    }

    private _buildIntentionalBurnChained(sighash = ALL_BIP143): BuiltAction {
        const { tokenActions } = this.action;
        const burnAction = tokenActions?.find(action => action.type === 'BURN');
        if (!burnAction) {
            // Not expected to ever happen
            throw new Error(
                'No burn action found in _buildIntentionalBurnChained for intentional SLP burn',
            );
        }
        const { tokenId, burnAtoms, tokenType } =
            burnAction as payment.BurnAction;

        const dustSats = this.action.dustSats || DEFAULT_DUST_SATS;
        const feePerKb = this.action.feePerKb || DEFAULT_FEE_SATS_PER_KB;

        // An intentional SLP burn requires two actions
        // 1. A SEND action to create a utxo of the correct size
        // 2. The user's original BURN action

        const chainedTxs: Tx[] = [];

        // 1. A SEND action to create a utxo of the correct size
        const sendAction: payment.Action = {
            outputs: [
                { sats: 0n },
                // This is the utxo that will be used for the BURN action
                // So, we note that its outIdx is 1
                {
                    sats: dustSats,
                    script: this._wallet.script,
                    tokenId,
                    atoms: burnAtoms,
                },
            ],
            tokenActions: [{ type: 'SEND', tokenId, tokenType }],
        };

        const sendTx = this._wallet.action(sendAction).build(sighash);

        chainedTxs.push(sendTx.txs[0]);

        // 2. The user's original BURN action is simply this.action
        const burnTx = this._wallet
            .action(this.action)
            .build(sighash) as BuiltAction;

        chainedTxs.push(burnTx.txs[0]);

        return new BuiltAction(this._wallet, chainedTxs, feePerKb);
    }

    private _buildNftMintFanoutChained(sighash = ALL_BIP143): BuiltAction {
        const { tokenActions } = this.action;
        const genesisAction = tokenActions?.find(
            action => action.type === 'GENESIS',
        );
        if (!genesisAction) {
            // Not expected to ever happen
            throw new Error(
                'No GENESIS action found in _buildNftMintFanoutChained for NFT mint fanout',
            );
        }
        const { groupTokenId } = genesisAction as payment.GenesisAction;

        const dustSats = this.action.dustSats || DEFAULT_DUST_SATS;
        const feePerKb = this.action.feePerKb || DEFAULT_FEE_SATS_PER_KB;

        // An NFT mint requires two actions if a properly-sized input is not available
        // 1. A SEND action to create a utxo of the correct size (qty-1 of the groupTokenId)
        // 2. The user's original GENESIS action to mint the NFT

        const chainedTxs: Tx[] = [];

        // 1. A SEND action to create a utxo with qty-1 of the groupTokenId
        const sendAction: payment.Action = {
            outputs: [
                { sats: 0n },
                // This is the utxo that will be used for the BURN action
                // So, we note that its outIdx is 1
                {
                    sats: dustSats,
                    script: this._wallet.script,
                    tokenId: groupTokenId,
                    atoms: 1n,
                },
            ],
            tokenActions: [
                {
                    type: 'SEND',
                    tokenId: groupTokenId as string,
                    // NB the fant out is a SEND of the SLP_TOKEN_TYPE_NFT1_GROUP token
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                },
            ],
        };

        // Create the NFT mint input
        const sendTx = this._wallet.action(sendAction).build(sighash);

        chainedTxs.push(sendTx.txs[0]);

        // 2. The user's original GENESIS action to mint the NFT
        const nftMintTx = this._wallet
            .action(this.action)
            .build(sighash) as BuiltAction;

        chainedTxs.push(nftMintTx.txs[0]);

        return new BuiltAction(this._wallet, chainedTxs, feePerKb);
    }

    /**
     * Build (but do not broadcast) an eCash tx to handle the
     * action specified by the constructor
     *
     * NB that, for now, we will throw an error if we cannot handle
     * all instructions in a single tx
     *
     * NB calling build() will always update the wallet's utxo set to reflect the post-broadcast state
     */
    public build(sighash = ALL_BIP143): BuiltAction {
        if (
            this.selectUtxosResult.success === false ||
            typeof this.selectUtxosResult.utxos === 'undefined' ||
            this.selectUtxosResult.missingSats > 0n
        ) {
            // Use the errors field if available, otherwise construct a generic error
            if (
                this.selectUtxosResult.errors &&
                this.selectUtxosResult.errors.length > 0
            ) {
                throw new Error(this.selectUtxosResult.errors.join('; '));
            }

            // The build() method only works for the REQUIRE_SATS strategy
            // TODO add another method to handle missingSats selectUtxos
            throw new Error(
                `Insufficient sats to complete tx. Need ${this.selectUtxosResult.missingSats} additional satoshis to complete this Action.`,
            );
        }

        if (this.selectUtxosResult.chainedTxType !== ChainedTxType.NONE) {
            // Special handling for chained txs
            return this._buildChained(sighash);
        }

        const selectedUtxos = this.selectUtxosResult.utxos;

        const dustSats = this.action.dustSats || DEFAULT_DUST_SATS;
        const feePerKb = this.action.feePerKb || DEFAULT_FEE_SATS_PER_KB;

        /**
         * Validate outputs AND add token-required generated outputs
         * i.e. token change or burn-adjusted token change
         */
        const { paymentOutputs, txOutputs } = finalizeOutputs(
            this.action,
            selectedUtxos,
            this._wallet.script,
            dustSats,
        );

        // Determine the exact utxos we need for this tx by building and signing the tx
        let inputSats = Wallet.sumUtxosSats(selectedUtxos);
        const outputSats = this.actionTotal.sats;
        let needsAnotherUtxo = false;
        let txFee;

        const finalizedInputs = selectedUtxos.map(utxo =>
            this._wallet.p2pkhUtxoToBuilderInput(utxo, sighash),
        );

        // Can you cover the tx without fuelUtxos?
        const builtActionResult = this._getBuiltAction(
            finalizedInputs,
            txOutputs,
            paymentOutputs,
            feePerKb,
            dustSats,
        );
        if (builtActionResult.success && builtActionResult.builtAction) {
            return builtActionResult.builtAction;
        } else {
            needsAnotherUtxo = true;
        }

        // If we get here, we need more utxos
        // Fuel utxos are spendableSatsUtxos that are not already included in selectedUtxos
        const fuelUtxos = this._wallet
            .spendableSatsOnlyUtxos()
            .filter(
                spendableSatsOnlyUtxo =>
                    !selectedUtxos.some(
                        selectedUtxo =>
                            selectedUtxo.outpoint.txid ===
                                spendableSatsOnlyUtxo.outpoint.txid &&
                            selectedUtxo.outpoint.outIdx ===
                                spendableSatsOnlyUtxo.outpoint.outIdx,
                    ),
            );

        for (const utxo of fuelUtxos) {
            // If our inputs cover our outputs, we might have enough
            // But we don't really know since we must calculate the fee
            let mightTheseUtxosWork = inputSats >= outputSats;

            if (!mightTheseUtxosWork || needsAnotherUtxo) {
                // If we know these utxos are insufficient to cover the tx, add a utxo
                inputSats += utxo.sats;
                finalizedInputs.push(
                    this._wallet.p2pkhUtxoToBuilderInput(utxo, sighash),
                );
            }

            // Update mightTheseUtxosWork as now we have another input
            mightTheseUtxosWork = inputSats > outputSats;

            if (mightTheseUtxosWork) {
                const builtActionResult = this._getBuiltAction(
                    finalizedInputs,
                    txOutputs,
                    paymentOutputs,
                    feePerKb,
                    dustSats,
                );
                if (
                    builtActionResult.success &&
                    builtActionResult.builtAction
                ) {
                    return builtActionResult.builtAction;
                } else {
                    needsAnotherUtxo = true;
                }
            }
        }

        // If we run out of availableUtxos without returning inputs, we can't afford this tx
        throw new Error(
            `Insufficient satoshis in available utxos (${inputSats}) to cover outputs of this tx (${outputSats}) + fee${
                typeof txFee !== 'undefined' ? ` (${txFee})` : ``
            }`,
        );
    }

    /**
     * After a successful broadcast, we "know" how the wallet's utxo set has changed
     * - Inputs can be removed
     * - Outputs can be added
     *
     * Because all txs made with ecash-wallet are valid token txs, i.e. no unintentional burns,
     * we can safely assume created token utxos will be valid and spendable
     *
     * NB we could calc the txid from the Tx, but we will always have the txid from the successful broadcast
     * So we use that as a param, since we only call this function after a successful broadcast
     */
    private _updateUtxosAfterSuccessfulBuild(
        tx: Tx,
        txid: string,
        finalizedOutputs: payment.PaymentOutput[],
    ) {
        // Remove spent utxos
        const { inputs } = tx;
        for (const input of inputs) {
            // Find the utxo used to create this input
            const { prevOut } = input;
            const { txid, outIdx } = prevOut;
            const utxo = this._wallet.utxos.find(
                utxo =>
                    utxo.outpoint.txid === txid &&
                    utxo.outpoint.outIdx === outIdx,
            );
            if (utxo) {
                // Remove the utxo from the utxo set
                this._wallet.utxos.splice(this._wallet.utxos.indexOf(utxo), 1);
            }
        }

        for (let i = 0; i < finalizedOutputs.length; i++) {
            const finalizedOutput = finalizedOutputs[i];
            if (finalizedOutput.sats === 0n) {
                // Skip blank OP_RETURN outputs
                continue;
            }
            if (typeof finalizedOutput.script === 'undefined') {
                // finalizeOutputs will have converted address key to script key
                // We include this to satisfy typescript
                throw new Error(
                    'Outputs[i].script must be defined to _updateUtxosAfterSuccessfulBuild',
                );
            }
            const script = finalizedOutput.script.toHex();
            if (script === this._wallet.script.toHex()) {
                // If this output was created at the wallet's script, it is now a utxo for the wallet

                // Parse for tokenType, if any
                // Get the tokenType for this output by parsing for its associated action
                let tokenType: TokenType | undefined;
                if ('tokenId' in finalizedOutput) {
                    // Special handling for genesis outputs
                    if (
                        finalizedOutput.tokenId ===
                        payment.GENESIS_TOKEN_ID_PLACEHOLDER
                    ) {
                        // This is a genesis output
                        const genesisAction = this.action.tokenActions?.find(
                            action => action.type === 'GENESIS',
                        ) as payment.GenesisAction | undefined;
                        tokenType = genesisAction?.tokenType;
                    } else {
                        // This is a mint or send output
                        const action = this.action.tokenActions?.find(
                            action =>
                                'tokenId' in action &&
                                action.tokenId === finalizedOutput.tokenId,
                        );
                        tokenType =
                            action && 'tokenType' in action
                                ? action.tokenType
                                : undefined;
                        if (typeof tokenType === 'undefined') {
                            // We can't get here because of other type checks; but we include this to satisfy typescript
                            // DataActions do not have a tokenId but they only apply to OP_RETURN outputs
                            throw new Error(
                                `Token type not found for tokenId ${finalizedOutput.tokenId}`,
                            );
                        }
                    }
                }

                this._wallet.utxos.push(
                    getUtxoFromOutput(finalizedOutputs[i], txid, i, tokenType),
                );
            }
        }

        // NB we do not expect an XEC change output to be added to finalizedOutputs by finalizeOutputs, but it will be in the Tx outputs (if we have one)
        // NB that token change outputs WILL be returned in the paymentOutputs of finalizedOutputs return
        // So, we need to add a change output to the outputs we iterate over for utxo creation, if we have one
        if (tx.outputs.length > finalizedOutputs.length) {
            // We have XEC change added by the txBuilder
            const changeOutIdx = tx.outputs.length - 1;
            const changeOutput = tx.outputs[changeOutIdx];

            // Note that ecash-lib supports change outputs at any Script, so we must still confirm this is going to our wallet's script
            if (changeOutput.script.toHex() === this._wallet.script.toHex()) {
                // This will be a utxo
                this._wallet.utxos.push(
                    getUtxoFromOutput(
                        tx.outputs[changeOutIdx],
                        txid,
                        changeOutIdx,
                    ),
                );
            }
        }
    }

    /**
     * Build a postage transaction that is structurally valid but financially insufficient
     * This is used for postage scenarios where fuel inputs will be added later
     */
    public buildPostage(sighash = ALL_ANYONECANPAY_BIP143): PostageTx {
        if (
            this.selectUtxosResult.success === false ||
            typeof this.selectUtxosResult.utxos === 'undefined'
        ) {
            // Use the errors field if available, otherwise construct a generic error
            if (
                this.selectUtxosResult.errors &&
                this.selectUtxosResult.errors.length > 0
            ) {
                throw new Error(this.selectUtxosResult.errors.join('; '));
            }

            throw new Error(`Unable to select required UTXOs for this Action.`);
        }

        const selectedUtxos = this.selectUtxosResult.utxos;
        const dustSats = this.action.dustSats || DEFAULT_DUST_SATS;
        const feePerKb = this.action.feePerKb || DEFAULT_FEE_SATS_PER_KB;

        /**
         * Validate outputs AND add token-required generated outputs
         * i.e. token change or burn-adjusted token change
         */
        const { txOutputs } = finalizeOutputs(
            this.action,
            selectedUtxos,
            this._wallet.script,
            dustSats,
        );

        // Create inputs with the specified sighash
        const finalizedInputs = selectedUtxos.map(utxo =>
            this._wallet.p2pkhUtxoToBuilderInput(utxo, sighash),
        );

        // Create a PostageTx (structurally valid but financially insufficient)
        return new PostageTx(
            this._wallet,
            finalizedInputs,
            txOutputs,
            feePerKb,
            dustSats,
            this.actionTotal,
        );
    }

    /**
     * We need to build and sign a tx to confirm
     * we have sufficient inputs
     */
    private _getBuiltAction = (
        inputs: TxBuilderInput[],
        // NB outputs here is the result of finalizeOutputs
        txOutputs: TxBuilderOutput[],
        paymentOutputs: payment.PaymentOutput[],
        feePerKb: bigint,
        dustSats: bigint,
    ): { success: boolean; builtAction?: BuiltAction } => {
        // Can you cover the tx without fuelUtxos?
        try {
            const txBuilder = new TxBuilder({
                inputs,
                // ecash-wallet always adds a leftover output
                outputs: [...txOutputs, this._wallet.script],
            });
            const thisTx = txBuilder.sign({
                feePerKb,
                dustSats,
            });

            const txSize = thisTx.serSize();
            const txFee = calcTxFee(txSize, feePerKb);

            const inputSats = inputs
                .map(input => input.input.signData!.sats)
                .reduce((a, b) => a + b, 0n);

            // Do your inputs cover outputSum + txFee?
            if (inputSats >= this.actionTotal.sats + txFee) {
                // mightTheseUtxosWork --> now we have confirmed they will work
                // Update utxos
                const txid = toHexRev(sha256d(thisTx.ser()));
                this._updateUtxosAfterSuccessfulBuild(
                    thisTx,
                    txid,
                    paymentOutputs,
                );
                return {
                    success: true,
                    builtAction: new BuiltAction(
                        this._wallet,
                        [thisTx],
                        feePerKb,
                    ),
                };
            }
        } catch {
            // Error is expected if we do not have enough utxos
            // So do nothing
            return { success: false };
        }
        return { success: false };
    };
}

/**
 * A single built tx
 * Ready-to-broadcast, and with helpful methods for inspecting its properties
 *
 * We do not include a broadcast() method because we want broadcast() to return
 * a standard type for any action, whether it requires a single tx or a tx chain
 */
class BuiltTx {
    public tx: Tx;
    public txid: string;
    public feePerKb: bigint;
    constructor(tx: Tx, feePerKb: bigint) {
        this.tx = tx;
        this.feePerKb = feePerKb;
        this.txid = toHexRev(sha256d(tx.ser()));
    }

    public size(): number {
        return this.tx.serSize();
    }

    public fee(): bigint {
        return calcTxFee(this.size(), this.feePerKb);
    }
}

/**
 * An action may have more than one Tx
 * So, we use the BuiltAction class to handle the txs property as an array
 * All methods return an array. So, we can still tell if this is a "normal" one-tx action
 * Although most actions are expected to be one-tx, it is deemed more important to keep a
 * constant interface than to optimze for one-tx actions
 */
class BuiltAction {
    private _wallet: Wallet;
    public txs: Tx[];
    public builtTxs: BuiltTx[];
    public feePerKb: bigint;
    constructor(wallet: Wallet, txs: Tx[], feePerKb: bigint) {
        this._wallet = wallet;
        this.txs = txs;
        this.feePerKb = feePerKb;
        this.builtTxs = txs.map(tx => new BuiltTx(tx, feePerKb));
    }

    public async broadcast() {
        // We must broadcast each tx in order and separately
        // We must track which txs broadcast successfully
        // If any tx in the chain fails, we stop, and return the txs that broadcast successfully and those that failed

        // txids that broadcast succcessfully
        const broadcasted: string[] = [];

        const txsToBroadcast = this.txs.map(tx => toHex(tx.ser()));

        for (let i = 0; i < txsToBroadcast.length; i++) {
            try {
                // NB we DO NOT sync in between txs, as all chained txs are built with utxos that exist at initial sync or are implied by previous txs in the chain
                const { txid } = await this._wallet.chronik.broadcastTx(
                    txsToBroadcast[i],
                );
                broadcasted.push(txid);
            } catch (err) {
                console.error(
                    `Error broadcasting tx ${i + 1} of ${
                        txsToBroadcast.length
                    }:`,
                    err,
                );
                return {
                    success: false,
                    broadcasted,
                    unbroadcasted: txsToBroadcast.slice(i),
                    errors: [`${err}`],
                };
            }
        }

        return { success: true, broadcasted };
    }
}

/**
 * PostageTx represents a transaction that is structurally valid but financially insufficient
 * It can be used for postage scenarios where fuel inputs need to be added later
 */
class PostageTx {
    private _wallet: Wallet;
    public inputs: TxBuilderInput[];
    public outputs: TxBuilderOutput[];
    public feePerKb: bigint;
    public dustSats: bigint;
    public actionTotal: ActionTotal;

    constructor(
        wallet: Wallet,
        inputs: TxBuilderInput[],
        outputs: TxBuilderOutput[],
        feePerKb: bigint,
        dustSats: bigint,
        actionTotal: ActionTotal,
    ) {
        this._wallet = wallet;
        this.inputs = inputs;
        this.outputs = outputs;
        this.feePerKb = feePerKb;
        this.dustSats = dustSats;
        this.actionTotal = actionTotal;
    }

    /**
     * Add fuel inputs and create a broadcastable transaction
     * Uses the same fee calculation approach as build() method
     */
    public addFuelAndSign(
        fuelWallet: Wallet,
        sighash = ALL_BIP143,
    ): BuiltAction {
        const fuelUtxos = fuelWallet.spendableSatsOnlyUtxos();
        if (fuelUtxos.length === 0) {
            throw new Error('No XEC UTXOs available in fuel wallet');
        }

        // Start with postage inputs (token UTXOs with insufficient sats)
        const allInputs = [...this.inputs];
        let inputSats = allInputs.reduce(
            (sum, input) => sum + input.input.signData!.sats,
            0n,
        );
        const baseOutputs = [...this.outputs];
        const outputSats = baseOutputs.reduce((sum, output) => {
            if ('sats' in output) {
                return sum + output.sats;
            } else {
                return sum;
            }
        }, 0n);

        // Add a leftover output (change) as just the Script, not {script, sats}
        const outputsWithChange = [
            ...baseOutputs,
            fuelWallet.script, // This signals TxBuilder to calculate change and fee
        ];

        // Try to build with just postage inputs first
        try {
            const txBuilder = new TxBuilder({
                inputs: allInputs,
                outputs: outputsWithChange,
            });
            const signedTx = txBuilder.sign({
                feePerKb: this.feePerKb,
                dustSats: this.dustSats,
            });
            return new BuiltAction(fuelWallet, [signedTx], this.feePerKb);
        } catch {
            // Expected - postage inputs are insufficient
        }

        // If we get here, we need fuel UTXOs
        // Add fuel UTXOs one by one and try to build after each addition
        for (const fuelUtxo of fuelUtxos) {
            inputSats += fuelUtxo.sats;
            allInputs.push(
                fuelWallet.p2pkhUtxoToBuilderInput(fuelUtxo, sighash),
            );

            // Try to build with current inputs
            try {
                const txBuilder = new TxBuilder({
                    inputs: allInputs,
                    outputs: outputsWithChange,
                });
                const signedTx = txBuilder.sign({
                    feePerKb: this.feePerKb,
                    dustSats: this.dustSats,
                });
                return new BuiltAction(fuelWallet, [signedTx], this.feePerKb);
            } catch {
                // Continue to next fuel UTXO
            }
        }

        // If we run out of fuel UTXOs without success, we can't afford this tx
        throw new Error(
            `Insufficient fuel: cannot cover outputs (${outputSats}) + fee with available fuel UTXOs (${inputSats} total sats)`,
        );
    }
}

/**
 * We create this interface to store parsed token info from
 * user-specified token outputs
 *
 * We store sufficient information to let us know what token
 * inputs are required to fulfill this user-specified Action
 */
interface RequiredTokenInputs {
    /**
     * The total atoms of the tokenId required by this action
     * e.g. for SEND, it would be the total number of atoms
     * specified in the outputs
     *
     * For MINT it would be 0, though mintBatonRequired would be true
     */
    atoms: bigint;
    /**
     * For transactions that BURN without a SEND action, we must have
     * utxos that exactly sum to atoms
     *
     * Set atomsMustBeExact to true for this case
     */
    atomsMustBeExact: boolean;
    /**
     * Does the action specified for this tokenId require a mint baton?
     */
    needsMintBaton: boolean;
    /**
     * If we still have requiredTokenInputs after attempting
     * to selectUtxos, we return RequiredTokenInputs reflecting
     * the MISSING inputs
     *
     * We also include an error msg to describe the shortage
     */
    error?: string;
}

/**
 * Sufficient information to select utxos to fulfill
 * a user-specified Action
 */
interface ActionTotal {
    /**
     * Total satoshis required to fulfill this action
     * NB we still may need more fuel satoshis when we
     * build the action, as a generated OP_RETURN, as a
     * generated OP_RETURN, token change outputs, or
     * a leftover output may require more satoshis
     */
    sats: bigint;
    /** All the info we need to determine required token utxos for an action */
    tokens?: Map<string, RequiredTokenInputs>;
    /**
     * Only for SLP_TOKEN_TYPE_NFT1_CHILD tokens
     * We need a qty-1 input of this tokenId at index 0 of inputs to mint an NFT,
     * aka GENESIS tx of SLP_TOKEN_TYPE_NFT1_CHILD tokens
     * */
    groupTokenId?: string;
}

/**
 * Finds a combination of UTXOs for a given tokenId whose atoms exactly sum to burnAtoms.
 * Returns the matching UTXOs or throws an error if no exact match is found.
 *
 * @param availableUtxos - Array of UTXOs to search through
 * @param tokenId - The token ID to match
 * @param burnAtoms - The exact amount of atoms to burn
 * @returns Array of UTXOs whose atoms sum exactly to burnAtoms
 */
export const getTokenUtxosWithExactAtoms = (
    availableUtxos: ScriptUtxo[],
    tokenId: string,
    burnAtoms: bigint,
): { hasExact: boolean; burnUtxos: ScriptUtxo[] } => {
    if (burnAtoms <= 0n) {
        throw new Error(
            `burnAtoms of ${burnAtoms} specified for ${tokenId}. burnAtoms must be greater than 0n.`,
        );
    }

    // Filter UTXOs for the given tokenId and valid token data
    const relevantUtxos = availableUtxos.filter(
        utxo =>
            utxo.token?.tokenId === tokenId &&
            utxo.token.atoms > 0n &&
            !utxo.token.isMintBaton,
    );

    if (relevantUtxos.length === 0) {
        throw new Error(`Cannot burn ${tokenId} as no UTXOs are available.`);
    }

    // Calculate total atoms available
    const totalAtoms = relevantUtxos.reduce(
        (sum, utxo) => sum + utxo.token!.atoms,
        0n,
    );

    if (totalAtoms < burnAtoms) {
        throw new Error(
            `burnAtoms of ${burnAtoms} specified for ${tokenId}, but only ${totalAtoms} are available.`,
        );
    }

    if (totalAtoms === burnAtoms) {
        // If total equals burnAtoms, return all relevant UTXOs
        return { hasExact: true, burnUtxos: relevantUtxos };
    }

    // Use dynamic programming to find the exact sum and track UTXOs
    const dp: Map<bigint, ScriptUtxo[]> = new Map();
    dp.set(0n, []);

    for (const utxo of relevantUtxos) {
        const atoms = utxo.token!.atoms;
        const newEntries: Array<[bigint, ScriptUtxo[]]> = [];

        for (const [currentSum, utxos] of dp) {
            const newSum = currentSum + atoms;
            if (newSum <= burnAtoms) {
                newEntries.push([newSum, [...utxos, utxo]]);
            }
        }

        for (const [newSum, utxos] of newEntries) {
            if (newSum === burnAtoms) {
                // Found exact match
                return { hasExact: true, burnUtxos: utxos };
            }
            dp.set(newSum, utxos);
        }
    }

    // We do not have utxos available that exactly sum to burnAtoms
    // For ALP, throw; as we do not "auto chain" alp BURN without SEND actions; in ALP these
    // very specifically mean "must burn all", as the user could otherwise specify a SEND
    if (
        relevantUtxos.some(
            utxo => utxo.token?.tokenType.type === 'ALP_TOKEN_TYPE_STANDARD',
        )
    ) {
        throw new Error(
            `Unable to find UTXOs for ${tokenId} with exactly ${burnAtoms} atoms. Create a UTXO with ${burnAtoms} atoms to burn without a SEND action.`,
        );
    }

    // Otherwise for all SLP tokens, we can auto chain
    // "chained" will be true, and we need to return utxo(s) with atoms > burnAtoms

    // We use accumulative algo here
    // NB we "know" we have enough utxos as we already would have thrown above if not
    // But, we do not need to return all the utxos here, just enough to cover the burn
    const utxosWithSufficientAtoms: ScriptUtxo[] = [];
    let currentSum = 0n;
    for (const utxo of relevantUtxos) {
        currentSum += utxo.token!.atoms;
        utxosWithSufficientAtoms.push(utxo);
        if (currentSum >= burnAtoms) {
            break;
        }
    }

    return { hasExact: false, burnUtxos: utxosWithSufficientAtoms };
};

/**
 * We need a qty-1 input of this tokenId at index 0 of inputs to mint an NFT
 * - Try to get this
 * - If we can't get this, get the biggest qty utxo
 * - If we don't have anything, return undefined
 */
export const getNftChildGenesisInput = (
    tokenId: string,
    slpUtxos: ScriptUtxo[],
): ScriptUtxo | undefined => {
    // Note that we do not use .filter() as we do in most "getInput" functions for SLP,
    // because in this case we only want exactly 1 utxo
    for (const utxo of slpUtxos) {
        if (
            utxo.token?.tokenId === tokenId &&
            utxo.token?.isMintBaton === false &&
            utxo.token?.atoms === 1n
        ) {
            return utxo;
        }
    }

    // If we can't find exactly 1 input, look for the input with the highest qty
    let highestQtyUtxo: ScriptUtxo | undefined = undefined;
    let highestQty = 0n;

    for (const utxo of slpUtxos) {
        if (
            utxo.token?.tokenId === tokenId &&
            utxo.token?.isMintBaton === false &&
            utxo.token?.atoms > highestQty
        ) {
            highestQtyUtxo = utxo;
            highestQty = utxo.token.atoms;
        }
    }

    // Return the highest qty utxo if found
    return highestQtyUtxo;
};

/**
 * Validate only user-specified token actions
 * For v0 of ecash-wallet, we only support single-tx actions, which
 * means some combinations of actions are always invalid, or
 * unsupported by the lib
 *
 * Full validation of tokenActions is complex and depends on available utxos
 * and user-specified outputs. In this function, we do all the validation
 * we can without knowing anything about token type, utxos, or outputs
 *
 * - No duplicate actions
 * - Only 0 or 1 GenesisAction and must be first
 * - No MINT and SEND for the same tokenId
 */
export const validateTokenActions = (tokenActions: payment.TokenAction[]) => {
    const mintTokenIds: string[] = [];
    const sendTokenIds: string[] = [];
    const burnTokenIds: string[] = [];

    for (let i = 0; i < tokenActions.length; i++) {
        const tokenAction = tokenActions[i];

        switch (tokenAction.type) {
            case 'GENESIS': {
                if (i !== 0) {
                    // This also handles the validation condition of "no more than one genesis action"
                    throw new Error(
                        `GenesisAction must be at index 0 of tokenActions. Found GenesisAction at index ${i}.`,
                    );
                }
                if (
                    tokenAction.tokenType.type === 'SLP_TOKEN_TYPE_NFT1_CHILD'
                ) {
                    if (typeof tokenAction.groupTokenId === 'undefined') {
                        throw new Error(
                            `SLP_TOKEN_TYPE_NFT1_CHILD genesis txs must specify a groupTokenId.`,
                        );
                    }
                } else {
                    if (typeof tokenAction.groupTokenId !== 'undefined') {
                        throw new Error(
                            `${tokenAction.tokenType.type} genesis txs must not specify a groupTokenId.`,
                        );
                    }
                }
                break;
            }
            case 'SEND': {
                const { tokenId } = tokenAction as payment.SendAction;

                if (sendTokenIds.includes(tokenId)) {
                    throw new Error(
                        `Duplicate SEND action for tokenId ${tokenId}`,
                    );
                }
                if (mintTokenIds.includes(tokenId)) {
                    throw new Error(
                        `ecash-wallet does not support minting and sending the same token in the same Action. tokenActions MINT and SEND ${tokenId}.`,
                    );
                }
                sendTokenIds.push(tokenId);
                break;
            }
            case 'MINT': {
                const { tokenId, tokenType } =
                    tokenAction as payment.MintAction;
                if (tokenType.type === 'SLP_TOKEN_TYPE_MINT_VAULT') {
                    throw new Error(
                        `ecash-wallet does not currently support minting SLP_TOKEN_TYPE_MINT_VAULT tokens.`,
                    );
                }
                if (mintTokenIds.includes(tokenId)) {
                    throw new Error(
                        `Duplicate MINT action for tokenId ${tokenId}`,
                    );
                }
                if (sendTokenIds.includes(tokenId)) {
                    throw new Error(
                        `ecash-wallet does not support minting and sending the same token in the same Action. tokenActions MINT and SEND ${tokenId}.`,
                    );
                }
                mintTokenIds.push(tokenId);
                break;
            }
            case 'BURN': {
                const { tokenId } = tokenAction as payment.BurnAction;
                if (burnTokenIds.includes(tokenId)) {
                    throw new Error(
                        `Duplicate BURN action for tokenId ${tokenId}`,
                    );
                }
                burnTokenIds.push(tokenId);
                break;
            }
            case 'DATA': {
                // DataAction validation is handled in finalizeOutputs
                // No specific validation needed here
                // We do not validate data actions here because we would need to know token type
                break;
            }
            default: {
                throw new Error(
                    `Unknown token action at index ${i} of tokenActions`,
                );
            }
        }
    }
};

/**
 * Parse actions to determine the total quantity of satoshis
 * and token atoms (of each token) required to fulfill the Action
 */
export const getActionTotals = (action: payment.Action): ActionTotal => {
    const { outputs } = action;

    const tokenActions = action.tokenActions ?? [];

    // Iterate over tokenActions to figure out which outputs are associated with which actions
    const sendActionTokenIds: Set<string> = new Set();
    const burnActionTokenIds: Set<string> = new Set();
    const burnWithChangeTokenIds: Set<string> = new Set();
    const burnAllTokenIds: Set<string> = new Set();
    const mintActionTokenIds: Set<string> = new Set();
    let groupTokenId: string | undefined = undefined;

    const burnAtomsMap: Map<string, bigint> = new Map();
    for (const action of tokenActions) {
        switch (action.type) {
            case 'SEND': {
                sendActionTokenIds.add(action.tokenId);
                break;
            }
            case 'BURN': {
                burnActionTokenIds.add(action.tokenId);
                burnAtomsMap.set(action.tokenId, action.burnAtoms);
                break;
            }
            case 'MINT': {
                mintActionTokenIds.add(action.tokenId);
                break;
            }
            case 'GENESIS': {
                // GENESIS txs only require specific inputs if they are for SLP_TOKEN_TYPE_NFT1_CHILD
                if (action.tokenType.type === 'SLP_TOKEN_TYPE_NFT1_CHILD') {
                    // NB we already validate that a genesis action for SLP_TOKEN_TYPE_NFT1_CHILD has a groupTokenId
                    // in validateTokenActions
                    groupTokenId = action.groupTokenId;
                }
            }
        }
    }

    // Group burn action tokenIds into two sets with different input requirements
    burnActionTokenIds.forEach(tokenId => {
        if (sendActionTokenIds.has(tokenId)) {
            burnWithChangeTokenIds.add(tokenId);
        } else {
            burnAllTokenIds.add(tokenId);
        }
    });

    const dustSats = action.dustSats ?? DEFAULT_DUST_SATS;

    // NB we do not require any token inputs for genesisAction

    // Initialize map to store token requirements
    const requiredTokenInputsMap = new Map();

    // Get all outputs that require input atoms
    const tokenSendOutputs = outputs.filter(
        (output): output is payment.PaymentTokenOutput =>
            'tokenId' in output &&
            typeof output.tokenId !== 'undefined' &&
            (sendActionTokenIds.has(output.tokenId) ||
                burnActionTokenIds.has(output.tokenId)),
    );

    // Process token send outputs
    for (const tokenSendOutput of tokenSendOutputs) {
        const { tokenId, atoms } = tokenSendOutput;
        const requiredTokenInputs = requiredTokenInputsMap.get(tokenId);
        if (typeof requiredTokenInputs === 'undefined') {
            // Initialize
            requiredTokenInputsMap.set(tokenId, {
                atoms,
                atomsMustBeExact: false,
                needsMintBaton: false,
            });
        } else {
            // Increment atoms
            requiredTokenInputs.atoms += atoms;
        }
    }

    // Process burn with change actions
    // We only need utxos with atoms >= burnAtoms for these tokenIds
    burnWithChangeTokenIds.forEach(tokenId => {
        const burnAtoms = burnAtomsMap.get(tokenId) as bigint;
        const requiredTokenInputs = requiredTokenInputsMap.get(tokenId);
        if (typeof requiredTokenInputs === 'undefined') {
            // Initialize
            requiredTokenInputsMap.set(tokenId, {
                atoms: burnAtoms,
                // We are only looking at the tokens that burn with change
                atomsMustBeExact: false,
                needsMintBaton: false,
            });
        } else {
            // Increment atoms
            // We only get here if the user is SENDing and BURNing the same tokenId
            // NB we do need MORE atoms in inputs to burn, as the user-specified outputs are NOT burned
            // So we need inputs to cover the specified outputs AND the burn
            requiredTokenInputs.atoms += burnAtoms;
        }
    });

    // Process burnAll actions
    // We must find utxos with atoms that exactly match burnAtoms for these tokenIds
    burnAllTokenIds.forEach(tokenId => {
        const burnAtoms = burnAtomsMap.get(tokenId) as bigint;

        // No increment here, we need exact atoms and
        // we will not have any atom requirements for these tokenIds from SEND outputs
        requiredTokenInputsMap.set(tokenId, {
            atoms: burnAtoms,
            atomsMustBeExact: true,
            needsMintBaton: false,
        });
    });

    // Process mint actions
    mintActionTokenIds.forEach(tokenId => {
        const requiredTokenInputs = requiredTokenInputsMap.get(tokenId);
        if (typeof requiredTokenInputs === 'undefined') {
            requiredTokenInputsMap.set(tokenId, {
                atoms: 0n,
                atomsMustBeExact: false,
                needsMintBaton: true,
            });
        } else {
            // If we have already defined this, i.e. if we are also BURNing this tokenId
            // in this tx, then do not modify atoms. Make sure we add mintBaton though.
            requiredTokenInputs.needsMintBaton = true;
        }
    });

    // We need to know sats for all outputs in the tx
    let requiredSats = 0n;
    for (const output of outputs) {
        if ('bytecode' in output) {
            // If this output is a Script output
            // We do not sum this as an output, as its value must be
            // calculated dynamically by the txBuilder.sign method
            continue;
        }
        requiredSats += output.sats ?? dustSats;
    }

    const actionTotal: ActionTotal = { sats: requiredSats };
    if (requiredTokenInputsMap.size > 0) {
        actionTotal.tokens = requiredTokenInputsMap;
    }

    if (typeof groupTokenId !== 'undefined') {
        actionTotal.groupTokenId = groupTokenId;
    }

    return actionTotal;
};

/**
 * Strategy for selecting satoshis in UTXO selection
 */
export enum SatsSelectionStrategy {
    /** Must select enough sats to cover outputs + fee, otherwise error (default behavior) */
    REQUIRE_SATS = 'REQUIRE_SATS',
    /** Try to cover sats, otherwise return UTXOs which cover less than asked for */
    ATTEMPT_SATS = 'ATTEMPT_SATS',
    /** Don't add sats, even if they're available (for postage-paid-in-full scenarios) */
    NO_SATS = 'NO_SATS',
}

export enum ChainedTxType {
    /** We can complete this Action in a single tx */
    NONE = 'NONE',
    /** We need to chain a tx to fan-out an NFT mint */
    NFT_MINT_FANOUT = 'NFT_MINT_FANOUT',
    /** We need to chain a tx to intentional burn an SLP token */
    INTENTIONAL_BURN = 'INTENTIONAL_BURN',
}

interface SelectUtxosResult {
    /** Were we able to select all required utxos */
    success: boolean;
    utxos?: ScriptUtxo[];
    /**
     * If we are missing required token inputs and unable
     * to select utxos, we return a map detailing what
     * token utxos are missing from SpendableUtxos
     *
     * Map of tokenId => RequiredTokenInputs
     */
    missingTokens?: Map<string, RequiredTokenInputs>;
    /**
     * Required satoshis missing in spendableUtxos
     * We may have success: true and still have missingSats,
     * if user required selectUtxos with NoSats strategy
     */
    missingSats: bigint;
    /**
     * For a tx that requires multiple "chained" txs, the specific type
     * We need to pass a type as each requires distinct handling
     *
     * For a tx that DOES NOT require "chained" txs, this has a defined
     * enum for "NONE"
     *
     * Note that chained txs are not just multiple txs. "chained" implies that each tx
     * requires a utxo from the previous tx as an input
     *
     * Examples
     * - SLP intentional burn where we must first prepare a utxo of the correct size
     * - SLP NFT mints where we must first prepare a SLP_TOKEN_TYPE_NFT1_GROUP token of size 1
     * - Token sends where we send to more outputs than the token protocol allows
     * - XEC or mixed token/XEC sends where the tx size will exceed 100kb
     *
     * If chainedTxType is NONE, then we can complete the action with a single tx
     * If chainedTxType is not NONE, then a chained tx is required to fulfill the action
     */
    chainedTxType: ChainedTxType;
    /**
     * Error messages if selection failed
     */
    errors?: string[];
}

/**
 * Select utxos to fulfill the requirements of an Action
 *
 * Notes about minting SLP_TOKEN_TYPE_NFT1_CHILD tokens
 *
 * These tokens, aka "NFTs", are minted by burning exactly 1 SLP_TOKEN_TYPE_NFT1_GROUP token
 * However, a user may not have these quantity-1 SLP_TOKEN_TYPE_NFT1_GROUP tokens available
 * We return a unique error msg for the case of "user has no qty-1 SLP_TOKEN_TYPE_NFT1_GROUP tokens"
 * vs "user has only qty-more-than-1 SLP_TOKEN_TYPE_NFT1_GROUP tokens"
 *
 * ref https://github.com/simpleledger/slp-specifications/blob/master/slp-nft-1.md
 * NB we actually "could" mint NFT by burning an SLP_TOKEN_TYPE_NFT1_GROUP with qty > 1.
 * However we cannot have "change" for the SLP_TOKEN_TYPE_NFT1_GROUP in this tx, because
 * SLP only supports one action, and the mint action must be for token type SLP_TOKEN_TYPE_NFT1_CHILD
 * So, the best practice is to perform fan-out txs
 *
 * ecash-wallet could handle this with chained txs, either before MINT or after the genesis of the
 * SLP_TOKEN_TYPE_NFT1_GROUP token. For now, the user must perform fan-out txs manually.
 *
 * NB the following are not currently supported:
 * - Minting of SLP_TOKEN_TYPE_MINT_VAULT tokens
 *
 * Note on "chained" txs
 * For chained txs, we select the utxos we need for every tx in the chain on the first function call
 * In this way, we know we have all the utxos required for the user action
 * Some chained txs require specific intermediary utxos, e.g. SLP agora and intentional burn txs
 * All chained txs require enough sats to cover the tx fees of every tx in the chain (well, depending on SatsSelectionStrategy)
 * TODO well not necessarily, we could just mark utxos as spent in real time and continue to call selectUtxos for each tx in the chain;
 * we would still throw an error if we did not have the fees for the whole chain
 * but this could be less optimized than say a token chained tx, where you could use the fees for hte sats of the token change of each tx in the chain,
 * this approach would also work for slp agora and slp intentional burn, so could be good to generalize it now
 *
 * Actions
 * 1) after tx is broadcast, update the utxo set without any API call; remove inputs and add outputs
 * 2) this is "good enough" for the SLP and agora 2-part chained txs; if you want, can add more specific handling for optimizing chained txs
 *
 */
export const selectUtxos = (
    action: payment.Action,
    /**
     * All spendable utxos available to the wallet
     * - Token utxos
     * - Non-token utxos
     * - Coinbase utxos with at least COINBASE_MATURITY confirmations
     */
    spendableUtxos: ScriptUtxo[],
    /**
     * Strategy for selecting satoshis
     * @default SatsSelectionStrategy.REQUIRE_SATS
     */
    satsStrategy: SatsSelectionStrategy = SatsSelectionStrategy.REQUIRE_SATS,
): SelectUtxosResult => {
    const { sats, tokens, groupTokenId } = getActionTotals(action);

    // Init "chainedTxType" as NONE
    let chainedTxType = ChainedTxType.NONE;

    let tokenIdsWithRequiredUtxos: string[] = [];

    // Burn all tokenIds require special handling as we must collect
    // utxos where the atoms exactly sum to burnAtoms
    const burnAllTokenIds: string[] = [];

    if (typeof tokens !== 'undefined') {
        tokenIdsWithRequiredUtxos = Array.from(tokens.keys());

        for (const tokenId of tokenIdsWithRequiredUtxos) {
            const requiredTokenInputs = tokens.get(
                tokenId,
            ) as RequiredTokenInputs;
            if (requiredTokenInputs.atomsMustBeExact) {
                // If this tokenId requires an exact burn
                // We will need to collect utxos that exactly sum to burnAtoms
                burnAllTokenIds.push(tokenId);
            }
        }
    }

    // We need exactly 1 qty-1 input of this tokenId at index 0 of inputs to mint an NFT
    // If we have it, use it, and we can make this mint in 1 tx
    // If we have an input with qty > 1, we need to chain a fan-out tx; return appropriate error msg
    // If we have no inputs, return appropriate error msg
    let nftMintInput: ScriptUtxo | undefined = undefined;
    let needsNftMintInput: boolean = false;
    let needsNftFanout: boolean = false;
    if (typeof groupTokenId !== 'undefined') {
        nftMintInput = getNftChildGenesisInput(groupTokenId, spendableUtxos);
        if (typeof nftMintInput === 'undefined') {
            // We do not have any inputs for this groupTokenId
            needsNftMintInput = true;
        } else if (nftMintInput.token?.atoms === 1n) {
            // We have a qty-1 input, we can mint directly
            // nftMintInput is already set correctly
        } else {
            // We have an input but it's not qty-1, we need to fan out
            // nftMintInput is already set to the highest qty input
            needsNftFanout = true;
            chainedTxType = ChainedTxType.NFT_MINT_FANOUT;
        }
    }

    // NB for a non-token tx, we only use non-token utxos
    // As this function is extended, we will need to count the sats
    // in token utxos

    const selectedUtxos: ScriptUtxo[] = [];
    let selectedUtxosSats = 0n;

    // Add NFT mint input if we have one
    if (
        typeof groupTokenId !== 'undefined' &&
        typeof nftMintInput !== 'undefined'
    ) {
        // We add the input regardless of qty for chained tx handling
        // For qty-1 inputs, we can mint directly
        // For qty >1 inputs, we'll use a chained tx to fan out first
        selectedUtxos.push(nftMintInput);
        selectedUtxosSats += nftMintInput.sats;
    }

    // Handle burnAll tokenIds first
    for (const burnAllTokenId of burnAllTokenIds) {
        const { hasExact, burnUtxos } = getTokenUtxosWithExactAtoms(
            spendableUtxos,
            burnAllTokenId,
            tokens!.get(burnAllTokenId)!.atoms,
        );

        if (!hasExact) {
            // If we do not have utxos with the exact burn atoms, we must have a chained tx for an intentional BURN
            chainedTxType = ChainedTxType.INTENTIONAL_BURN;
        }

        for (const utxo of burnUtxos) {
            selectedUtxos.push(utxo);
            selectedUtxosSats += utxo.sats;
        }

        // We have now added utxos to cover the required atoms for this tokenId

        if (typeof tokens !== 'undefined') {
            // If we have tokens to handle
            // (we always will if we are here, ts assertion issue)

            const requiredTokenInputs = tokens.get(
                burnAllTokenId,
            ) as RequiredTokenInputs;

            if (!requiredTokenInputs.needsMintBaton) {
                // If we do not need a mint baton
                // Then we no longer need utxos for this token
                tokenIdsWithRequiredUtxos = tokenIdsWithRequiredUtxos.filter(
                    tokenId => tokenId !== burnAllTokenId,
                );
            } else {
                // Otherwise we've only dealt with the atoms
                requiredTokenInputs.atoms = 0n;
            }
        }
    }

    // If this tx is ONLY a burn all tx, we may have enough already
    if (typeof groupTokenId === 'undefined') {
        // Make sure this is not an NFT mint tx
        if (
            (selectedUtxosSats >= sats ||
                satsStrategy === SatsSelectionStrategy.NO_SATS) &&
            tokenIdsWithRequiredUtxos.length === 0
        ) {
            // If selectedUtxos fulfill the requirements of this Action, return them

            return {
                success: true,
                utxos: selectedUtxos,
                // Only expected to be > 0n if satsStrategy is NO_SATS
                missingSats:
                    selectedUtxosSats >= sats ? 0n : sats - selectedUtxosSats,
                chainedTxType,
            };
        }
    }

    for (const utxo of spendableUtxos) {
        if ('token' in utxo && typeof utxo.token !== 'undefined') {
            // If this is a token utxo
            if (tokenIdsWithRequiredUtxos.includes(utxo.token.tokenId)) {
                // If we have remaining requirements for a utxo with this tokenId
                // to complete this user-specified Action

                const requiredTokenInputsThisToken = tokens!.get(
                    utxo.token.tokenId,
                ) as RequiredTokenInputs;

                if (
                    utxo.token.isMintBaton &&
                    requiredTokenInputsThisToken.needsMintBaton
                ) {
                    // If this is a mint baton and we need a mint baton, add this utxo to selectedUtxos
                    selectedUtxos.push(utxo);
                    selectedUtxosSats += utxo.sats;

                    // Now we no longer need a mint baton
                    requiredTokenInputsThisToken.needsMintBaton = false;

                    if (
                        requiredTokenInputsThisToken.atoms === 0n &&
                        !requiredTokenInputsThisToken.needsMintBaton
                    ) {
                        // If we no longer require any utxos for this tokenId,
                        // remove it from tokenIdsWithRequiredUtxos
                        tokenIdsWithRequiredUtxos =
                            tokenIdsWithRequiredUtxos.filter(
                                tokenId => tokenId !== utxo.token!.tokenId,
                            );
                    }

                    // Return utxos if we have enough
                    if (
                        (selectedUtxosSats >= sats ||
                            satsStrategy === SatsSelectionStrategy.NO_SATS) &&
                        tokenIdsWithRequiredUtxos.length === 0
                    ) {
                        return {
                            success: true,
                            utxos: selectedUtxos,
                            // Only expected to be > 0n if satsStrategy is NO_SATS
                            missingSats:
                                selectedUtxosSats >= sats
                                    ? 0n
                                    : sats - selectedUtxosSats,
                            chainedTxType,
                        };
                    }
                } else if (
                    !utxo.token.isMintBaton &&
                    requiredTokenInputsThisToken.atoms > 0n
                ) {
                    // If this is a token utxo and we need atoms, add this utxo to selectedUtxos
                    selectedUtxos.push(utxo);
                    selectedUtxosSats += utxo.sats;

                    // We now require fewer atoms of this tokenId. Update.
                    const requiredAtomsRemainingThisToken =
                        (requiredTokenInputsThisToken.atoms -=
                            utxo.token.atoms);

                    // Update required atoms remaining for this token
                    requiredTokenInputsThisToken.atoms =
                        requiredAtomsRemainingThisToken > 0n
                            ? requiredAtomsRemainingThisToken
                            : 0n;

                    if (
                        requiredTokenInputsThisToken.atoms === 0n &&
                        !requiredTokenInputsThisToken.needsMintBaton
                    ) {
                        // If we no longer require utxos for this tokenId,
                        // remove tokenId from tokenIdsWithRequiredUtxos

                        tokenIdsWithRequiredUtxos =
                            tokenIdsWithRequiredUtxos.filter(
                                tokenId => tokenId !== utxo.token!.tokenId,
                            );
                    }

                    if (
                        (selectedUtxosSats >= sats ||
                            satsStrategy === SatsSelectionStrategy.NO_SATS) &&
                        tokenIdsWithRequiredUtxos.length === 0
                    ) {
                        // If selectedUtxos fulfill the requirements of this Action, return them
                        return {
                            success: true,
                            utxos: selectedUtxos,
                            // Only expected to be > 0n if satsStrategy is NO_SATS
                            missingSats:
                                selectedUtxosSats >= sats
                                    ? 0n
                                    : sats - selectedUtxosSats,
                            chainedTxType,
                        };
                    }
                }
            }

            // Done processing token utxo, go the next utxo
            // NB we DO NOT add any tokenUtxo to selectedUtxos unless there is
            // a token-related need for it specified in the Action
            continue;
        }

        if (satsStrategy === SatsSelectionStrategy.NO_SATS) {
            // We do not need any fuel utxos if we are gasless
            continue;
        }

        // For ATTEMPT_SATS and REQUIRE_SATS, we collect sats utxos
        // ATTEMPT_SATS will return what we have even if incomplete
        // REQUIRE_SATS will only return if we have enough

        // If we have not returned selectedUtxos yet, we still need more sats
        // So, add this utxo
        selectedUtxos.push(utxo);
        selectedUtxosSats += utxo.sats;
        if (
            selectedUtxosSats >= sats &&
            tokenIdsWithRequiredUtxos.length === 0 &&
            !needsNftMintInput
        ) {
            return {
                success: true,
                utxos: selectedUtxos,
                // Always 0 here, determined by condition of this if block
                missingSats: 0n,
                chainedTxType,
            };
        }
    }

    // If we get here, we do not have sufficient utxos
    const errors: string[] = [];

    if (tokenIdsWithRequiredUtxos.length > 0) {
        // Add human-readable error msg for missing token utxos
        tokens?.forEach(requiredTokenInfo => {
            requiredTokenInfo.error = `${
                requiredTokenInfo.needsMintBaton
                    ? `Missing mint baton`
                    : `Missing ${requiredTokenInfo.atoms} atom${
                          requiredTokenInfo.atoms !== 1n ? 's' : ''
                      }`
            }`;
        });

        const tokenErrorMsg: string[] = [];
        // Sort by tokenId to ensure consistent order
        const sortedTokenIds = Array.from(tokens!.keys()).sort();
        sortedTokenIds.forEach(tokenId => {
            const requiredTokenInfo = tokens!.get(tokenId)!;
            tokenErrorMsg.push(` ${tokenId} => ${requiredTokenInfo.error}`);
        });
        errors.push(`Missing required token utxos:${tokenErrorMsg.join(',')}`);

        const selectedUtxosResult: SelectUtxosResult = {
            success: false,
            missingSats:
                selectedUtxosSats >= sats ? 0n : sats - selectedUtxosSats,
            chainedTxType,
            errors,
        };

        if (typeof tokens !== 'undefined') {
            selectedUtxosResult.missingTokens = tokens;
        }

        // Missing tokens always cause failure, regardless of strategy
        return selectedUtxosResult;
    }

    if (needsNftMintInput) {
        // Special case where user wants to mint an NFT but lacks any inputs
        const missingTokensCustom = new Map();
        missingTokensCustom.set(groupTokenId, {
            atoms: 1n,
            needsMintBaton: false,
        });
        return {
            success: false,
            missingTokens: missingTokensCustom,
            missingSats:
                selectedUtxosSats >= sats ? 0n : sats - selectedUtxosSats,
            chainedTxType,
            errors: [
                `Missing SLP_TOKEN_TYPE_NFT1_GROUP input for groupTokenId ${groupTokenId}`,
            ],
        };
    }

    const missingSats =
        selectedUtxosSats >= sats ? 0n : sats - selectedUtxosSats;

    if (missingSats > 0n) {
        errors.push(
            `Insufficient sats to complete tx. Need ${missingSats} additional satoshis to complete this Action.`,
        );
    }

    if (needsNftFanout) {
        // We handle this with a chained tx, to eliminate the (confusing) need for fan-out txs
        chainedTxType = ChainedTxType.NFT_MINT_FANOUT;
    }

    if (satsStrategy === SatsSelectionStrategy.REQUIRE_SATS) {
        return {
            success: false,
            missingSats,
            chainedTxType,
            errors,
        };
    }

    // For ATTEMPT_SATS and NO_SATS strategies, return what we have even if incomplete
    // Do not include errors field for missing sats if returning success
    return {
        success: true,
        utxos: selectedUtxos,
        missingSats,
        // NB we do not have errors for missingSats with these strategies
        chainedTxType,
    };
};

/**
 * ecash-wallet only supports one token type per action (for now)
 * - We could support multiple ALP types in one tx, if and when we have multiple ALP types
 * - We could support multiple types in multiple txs. Support for multiple txs is planned.
 * Parse tokenActions for tokenType
 *
 * TODO (own diff) will need special handling (i.e. multiple token types) for minting of SLP NFT1
 *
 * Returns TokenType of the token associated with this action, if action is valid
 * Throws if action specifies more than one TokenType in a single tx
 * Returns undefined for non-token tx
 */
export const getTokenType = (action: payment.Action): TokenType | undefined => {
    let tokenType: TokenType | undefined;
    const { tokenActions } = action;
    if (typeof tokenActions == 'undefined' || tokenActions.length === 0) {
        // If no tokenActions are specified
        return tokenType;
    }
    const genesisAction = action.tokenActions?.find(
        action => action.type === 'GENESIS',
    ) as payment.GenesisAction | undefined;

    if (typeof genesisAction !== 'undefined') {
        // We have specified token actions
        // Genesis txs must specify a token type in the token action
        // Parse for this
        tokenType = genesisAction.tokenType;
    }

    // Confirm no other token types are specified
    for (const action of tokenActions) {
        if ('tokenType' in action && typeof action.tokenType !== 'undefined') {
            // If this is a token action (i.e. NOT a data action)

            if (typeof tokenType === 'undefined') {
                // If we have not yet defined tokenType, define it
                tokenType = action.tokenType;
            } else {
                // If we have defined tokenType, verify we do not have multiple tokenTypes
                if (tokenType.type !== action.tokenType.type) {
                    throw new Error(
                        `Action must include only one token type. Found (at least) two: ${tokenType.type} and ${action.tokenType.type}.`,
                    );
                }
            }
        }
        // NB we do not expect to find tokenType in a data action
    }

    return tokenType;
};

// Convert user-specified ecash-wallet Output[] to TxOutput[], so we can build
// and sign the tx that fulfills this Action
export const paymentOutputsToTxOutputs = (
    outputs: payment.PaymentOutput[],
    dustSats: bigint,
): TxOutput[] => {
    const txBuilderOutputs: TxOutput[] = [];
    for (const output of outputs) {
        txBuilderOutputs.push({
            sats: output.sats ?? dustSats,
            script: output.script as Script,
        });
    }
    return txBuilderOutputs;
};

/**
 * finalizeOutputs
 *
 * Accept user-specified outputs and prepare them for network broadcast
 * - Parse and validate token inputs and outputs according to relevant token spec
 * - Add token change outputs to fulfill user SEND and/or BURN instructions
 * - Build OP_RETURN to fulfill intended user action per token spec
 * - Validate outputs for token and non-token actions
 * - Convert user-specified ecash-wallet PaymentOutput[] into TxBuilderOutput[] ready for signing/broadcast
 *
 * SLP_TOKEN_TYPE_FUNGIBLE
 * - May only have 1 mint quantity and it must be at outIdx 1
 * - May only have 1 mint baton and it must be at outIdx >= 2 and <= 0xff (255)
 * - All send outputs must be at 1<=outIdx<=19
 *
 * SLP_TOKEN_TYPE_NFT1_GROUP is the same spec rules as SLP_TOKEN_TYPE_FUNGIBLE except different type byte
 * Will have some distinctions added when we support SLP_TOKEN_TYPE_NFT1_CHILD
 *
 * SLP spec rules prevent exceeding 223 bytes in the OP_RETURN. So, even if this
 * limit increase in future, SLP txs will be the same.
 *
 * ALP_TOKEN_TYPE_STANDARD
 * MINT or GENESIS
 * - May have n mint quantities
 * - May have n mint batons, but must be consecutive and have higher index than qty outputs
 * - With current 223-byte OP_RETURN limit, no indices higher than 29
 * SEND
 * - All send outputs must be at 1<=outIdx<=29
 * - We cannot have SEND and MINT for the same tokenId
 * - We cannot have more than one genesis
 *
 * Assumptions
 * - Only one token type per tx
 * - We do not support SLP intentional burns
 * - We do not support ALP combined MINT / BURN txs
 *
 * Returns: The action outputs. The script field of each output will be set if
 * the address was specified.
 */
export const finalizeOutputs = (
    action: payment.Action,
    requiredUtxos: ScriptUtxo[],
    changeScript: Script,
    dustSats = DEFAULT_DUST_SATS,
): { paymentOutputs: payment.PaymentOutput[]; txOutputs: TxOutput[] } => {
    // Make a deep copy of outputs to avoid mutating the action object
    const outputs = action.outputs.map(output => ({ ...output }));
    const tokenActions = action.tokenActions;

    if (outputs.length === 0) {
        throw new Error(`No outputs specified. All actions must have outputs.`);
    }

    // Convert any address fields to script fields before processing
    for (let i = 0; i < outputs.length; i++) {
        const output = outputs[i];
        if ('address' in output && output.address) {
            // Convert from address variant to script variant of the union type
            const { address, ...restOfOutput } =
                output as payment.PaymentNonTokenOutput & {
                    address: string;
                };
            outputs[i] = {
                ...restOfOutput,
                script: Script.fromAddress(address),
            } as payment.PaymentOutput;
        }
    }

    // We do not support manually-specified leftover outputs
    // ecash-wallet automatically includes a leftover output
    // We may add support for manually specifying NO leftover, but probably not
    const leftoverOutputArr = outputs.filter(output => 'bytecode' in output);
    if (leftoverOutputArr.length > 0) {
        throw new Error(
            `ecash-wallet automatically includes a leftover output. Do not specify a leftover output in the outputs array.`,
        );
    }

    const tokenType = getTokenType(action);

    const isTokenTx = typeof tokenType !== 'undefined';

    // Check for data actions
    const dataActions = tokenActions?.filter(
        action => action.type === 'DATA',
    ) as payment.DataAction[];

    if (dataActions && dataActions.length > 0) {
        // Data actions are only supported for ALP_TOKEN_TYPE_STANDARD token actions
        // Users who want straight-up EMPP in a tx or straight-up OP_RETURN do not include
        // DataAction in tokenActions, but instead specify their OP_RETURN output
        if (tokenType?.type !== 'ALP_TOKEN_TYPE_STANDARD') {
            throw new Error(
                `Data actions are only supported for ALP_TOKEN_TYPE_STANDARD token actions.`,
            );
        }
    }

    // We can have only 1 OP_RETURN output
    // A non-token tx must specify OP_RETURN output manually
    // A token tx must specify a blank OP_RETURN output at index 0
    const maxOpReturnOutputs = isTokenTx ? 0 : 1;

    // Validate OP_RETURN (we can have only 1 that does not burn sats)
    const opReturnArr = outputs.filter(
        output =>
            'script' in output &&
            typeof output.script !== 'undefined' &&
            output.script.bytecode[0] === OP_RETURN,
    ) as payment.PaymentOutput[];

    if (opReturnArr.length > maxOpReturnOutputs) {
        const opReturnErrMsg = isTokenTx
            ? `A token tx cannot specify any manual OP_RETURN outputs. Token txs can only include a blank OP_RETURN output (i.e. { sats: 0n} at index 0.`
            : `ecash-wallet only supports 1 OP_RETURN per tx. ${opReturnArr.length} OP_RETURN outputs specified.`;
        throw new Error(opReturnErrMsg);
    } else if (opReturnArr.length === 1) {
        const opReturnSats = opReturnArr[0].sats;
        // If we have exactly 1 OP_RETURN, validate we do not burn sats
        if (opReturnSats !== 0n) {
            throw new Error(
                `Tx burns ${opReturnSats} satoshis in OP_RETURN output. ecash-wallet does not support burning XEC in the OP_RETURN.`,
            );
        }
    }

    if (typeof tokenType === 'undefined') {
        // If this is a non-token tx, i.e. there are no token inputs or outputs
        // Make sure we DO NOT have a blank OP_RETURN output
        const blankOpReturnOutput = outputs.filter(
            output =>
                Object.keys(output).length === 1 &&
                'sats' in output &&
                output.sats === 0n,
        );
        if (blankOpReturnOutput.length > 0) {
            throw new Error(
                `A blank OP_RETURN output (i.e. {sats: 0n}) is not allowed in a non-token tx.`,
            );
        }
        // For this case, validation is finished
        return {
            paymentOutputs: outputs,
            txOutputs: paymentOutputsToTxOutputs(outputs, dustSats),
        };
    }

    // Everything below is for token txs

    if (typeof tokenActions === 'undefined' || tokenActions.length === 0) {
        // If we have implied token action by outputs but not token actions are specified
        throw new Error(
            `Specified outputs imply token actions, but no tokenActions specified.`,
        );
    }

    // Validate actions
    validateTokenActions(tokenActions);

    if (tokenType.protocol === 'SLP') {
        // SLP tokens may have only one token action
        // We have a kind of exception for minting SLP NFTs, where we must consume / burn a Parent token to mint a child
        // But ecash-wallet treats this as one action, since it is a unique case
        if (tokenActions.length > 1) {
            // And we have more than 1 tokenAction specified
            throw new Error(
                `${tokenType.type} token txs may only have a single token action. ${tokenActions.length} tokenActions specified.`,
            );
        }
    }

    // NB we have already validated that, if GenesisAction exists, it is at index 0
    const genesisAction = tokenActions.find(
        action => action.type === 'GENESIS',
    ) as payment.GenesisAction | undefined;

    const genesisActionOutputs = outputs.filter(
        (o): o is payment.PaymentTokenOutput =>
            'tokenId' in o &&
            o.tokenId === payment.GENESIS_TOKEN_ID_PLACEHOLDER,
    );

    if (
        genesisActionOutputs.length > 0 &&
        typeof genesisAction === 'undefined'
    ) {
        throw new Error(
            `Genesis outputs specified without GenesisAction. Must include GenesisAction or remove genesis outputs.`,
        );
    }

    /**
     * ALP
     * - We can have multiple mint actions (but each must be for a different tokenId)
     * SLP
     * - We can have ONLY ONE mint action
     */

    const mintActionTokenIds = new Set(
        tokenActions
            .filter(action => action.type === 'MINT')
            .map(action => (action as payment.MintAction).tokenId),
    );

    const invalidMintBatonOutputs = outputs.filter(
        (output): output is payment.PaymentTokenOutput =>
            'isMintBaton' in output &&
            output.isMintBaton &&
            'atoms' in output &&
            output.atoms !== 0n,
    );

    if (invalidMintBatonOutputs.length > 0) {
        throw new Error(
            `Mint baton outputs must have 0 atoms. Found ${
                invalidMintBatonOutputs.length
            } mint baton output${
                invalidMintBatonOutputs.length == 1 ? '' : 's'
            } with non-zero atoms.`,
        );
    }

    /**
     * ALP
     * - We can have multiple burn actions (but each must be for a different tokenId)
     * SLP
     * - We can have ONLY ONE burn action
     *
     * Note that it is possible to have a burn action specified with no specified outputs associated
     * with this tokenId.
     *
     * For ALP, can also specify a SEND action with a BURN action, and no outputs, and finalizeOutputs
     * will automatically size a change output to allow intentional burn of user-specified burnAtoms.
     *
     * This would be expected behavior for an intentional ALP or SLP burn of 100% of token inputs.
     */

    const burnActionTokenIds = new Set(
        tokenActions
            .filter(action => action.type === 'BURN')
            .map(action => (action as payment.BurnAction).tokenId),
    );

    // We identify SEND outputs from user specified SEND action
    const sendActionTokenIds = new Set(
        tokenActions
            .filter(action => action.type === 'SEND')
            .map(action => (action as payment.SendAction).tokenId),
    );

    /**
     * Get all tokenIds associated with this Action from the Outputs
     */
    const tokenIdsThisAction = new Set(
        outputs
            .filter(
                o =>
                    'tokenId' in o &&
                    typeof o.tokenId !== 'undefined' &&
                    o.tokenId !== payment.GENESIS_TOKEN_ID_PLACEHOLDER,
            )
            .map(o => (o as payment.PaymentTokenOutput).tokenId),
    );

    if (tokenType.protocol === 'SLP') {
        if (tokenIdsThisAction.size > 0 && burnActionTokenIds.size > 0) {
            throw new Error(
                `SLP burns may not specify SLP receive outputs. ecash-wallet will automatically calculate change from SLP burns.`,
            );
        }
    }

    // Make sure we do not have any output-specified tokenIds that are not
    // associated with any action
    for (const tokenIdThisAction of tokenIdsThisAction) {
        if (
            !sendActionTokenIds.has(tokenIdThisAction) &&
            !burnActionTokenIds.has(tokenIdThisAction) &&
            !mintActionTokenIds.has(tokenIdThisAction)
        ) {
            throw new Error(
                `Output-specified tokenId ${tokenIdThisAction} is not associated with any action. Please ensure that the tokenActions match the outputs specified in the action.`,
            );
        }
    }

    // Since this is a token Action, validate we have a blank OP_RETURN template output at outIdx 0
    const indexZeroOutput = outputs[0];
    const indexZeroOutputKeys = Object.keys(indexZeroOutput);
    const hasIndexZeroOpReturnBlank =
        indexZeroOutputKeys.length === 1 && indexZeroOutputKeys[0] === 'sats';
    if (!hasIndexZeroOpReturnBlank) {
        throw new Error(
            `Token action requires a built OP_RETURN at index 0 of outputs, i.e. { sats: 0n }.`,
        );
    }

    /**
     * If this is a SEND or BURN tx, we (may) need to generate and add change outputs
     *
     * We need to calculate them to validate them, so we might as well do that here
     *
     * Because Action is an object and a param in this function, changes we make to the outputs array
     * in Action will persist when this function is called in the class
     */

    /**
     * If a token is
     * - Sent AND burned
     *   - We may need to calculate a change output that fulfills burnAtoms from BurnAction
     * - Sent only
     *   - We may need to calculate a change output based on available inputs that prevents
     *     a token burn
     *
     * We may need to generate an output to fulfill the user-specified action
     *
     * If a token is
     *
     * - Burned only
     * - Minted and burned
     *
     * Then we can only burn quantities that exactly match atoms of this token in the inputs
     * We will not generate any outputs
     */

    // Get all tokenIds that are SENT and BURNED
    const sendAndBurnActionTokenIds = new Set();
    sendActionTokenIds.forEach(tokenId => {
        if (burnActionTokenIds.has(tokenId)) {
            sendAndBurnActionTokenIds.add(tokenId);
        }
    });

    if (sendActionTokenIds.size > 0 || sendAndBurnActionTokenIds.size > 0) {
        /**
         * See if we need a token change output (or outputs, possibly, if ALP)
         *
         * Note that requiredUtxos is a generated value, so we do not expect
         * the validation errors checked here
         *
         * It is expected to have >= atoms needed for any SEND or BURN action
         */

        // Possible user specifies a burn for a tokenId with no specified SEND outputs
        // We need to iterate over all tokenIds that are SENT or BURNed
        const sendOrSendAndBurnTokens = new Set([
            ...sendActionTokenIds,
            ...sendAndBurnActionTokenIds,
        ]);

        sendOrSendAndBurnTokens.forEach(tokenId => {
            const availableUtxosThisToken = requiredUtxos.filter(
                utxo => 'token' in utxo && utxo.token?.tokenId === tokenId,
            );

            const inputAtomsThisToken = availableUtxosThisToken
                .map(utxo => utxo.token!.atoms)
                .reduce((prev, curr) => prev + curr, 0n);

            const outputsThisToken = outputs.filter(
                output => 'tokenId' in output && output.tokenId === tokenId,
            );

            const outputAtomsThisToken = outputsThisToken
                .map(output => (output as payment.PaymentTokenOutput).atoms)
                .reduce((prev, curr) => prev + curr, 0n);

            if (inputAtomsThisToken < outputAtomsThisToken) {
                // Not expected to happen in ecash-wallet, as we only call finalizeOutputs with
                // calculated requiredUtxos
                throw new Error(
                    `Insufficient atoms of ${tokenId} in inputs (${inputAtomsThisToken}) to cover atoms specified in outputs ${outputAtomsThisToken}`,
                );
            }

            if (inputAtomsThisToken >= outputAtomsThisToken) {
                // We may need a change output. Check for intentionalBurns
                let intentionalBurnAtomsThisToken = 0n;

                if (sendAndBurnActionTokenIds.has(tokenId)) {
                    // We have burn atoms for this token
                    intentionalBurnAtomsThisToken = (
                        tokenActions!.find(
                            burnAction =>
                                (burnAction as payment.BurnAction).tokenId ===
                                    tokenId && 'burnAtoms' in burnAction,
                        ) as payment.BurnAction
                    ).burnAtoms;
                }

                if (
                    outputAtomsThisToken >
                    inputAtomsThisToken - intentionalBurnAtomsThisToken
                ) {
                    // If the user has specified "too many" output atoms of a token he wishes to burn
                    // NB we do not expect this to happen in ecash-wallet usage as the inputs will be
                    // calculated to support the burnAction
                    throw new Error(
                        `Cannot process burn action for ${tokenId}: output atoms exceed input atoms less burn atoms.`,
                    );
                }

                const adjustedOutputAtomsThisToken =
                    outputAtomsThisToken - intentionalBurnAtomsThisToken;

                if (inputAtomsThisToken > adjustedOutputAtomsThisToken) {
                    // We need a change output
                    const changeAtoms =
                        inputAtomsThisToken -
                        outputAtomsThisToken -
                        intentionalBurnAtomsThisToken;

                    // NB adding a change output can make the tx invalid based on the outIdx of
                    // the change output.

                    // The change output will be added at the end of the outputs array
                    // This approach preserves the outIdx of the user-specified outputs
                    // We could attempt to do something like, only add token change outputs
                    // at a valid outIdx, if available ... but this would get confusing
                    // very fast, we do not want to change the outIdx of user-specified outputs
                    // Just throw a specific error msg
                    const changeOutputIdx = outputs.length;

                    // Apply SLP or ALP max output rules
                    const changeOutputIdxMax =
                        tokenType.protocol === 'SLP'
                            ? SLP_MAX_SEND_OUTPUTS
                            : ALP_POLICY_MAX_OUTPUTS;

                    if (changeOutputIdx > changeOutputIdxMax) {
                        throw new Error(
                            `Tx needs a token change output to avoid burning atoms of ${tokenId}, but the token change output would be at outIdx ${changeOutputIdx} which is greater than the maximum allowed outIdx of ${changeOutputIdxMax} for ${tokenType.type}.`,
                        );
                    }

                    // We add a token change output
                    outputs.push({
                        sats: dustSats,
                        tokenId: tokenId as string,
                        atoms: changeAtoms,
                        isMintBaton: false,
                        script: changeScript,
                    });
                }
            }
        });
    }

    /**
     * Initialize a map to store lastAtomsOutIdx
     * tokenId => lastAtomsOutIdx
     *
     * For SLP, can only ever have one tokenId
     * For ALP, can have many
     */

    // tokenId => lastAtomsOutIdx
    const lastAtomsOutIdxMap: Map<string, number> = new Map();

    // tokenId => numBatons
    // Only needed for ALP_TOKEN_TYPE_STANDARD
    const numBatonsMap: Map<string, number> = new Map();

    switch (tokenType.type) {
        case 'SLP_TOKEN_TYPE_MINT_VAULT': {
            /**
             * Validate for tokenId(s) and actions
             * - SLP SLP_TOKEN_TYPE_MINT_VAULT can have ONLY genesis or
             *   ONLY send or ONLY mint, ONLY with a single tokenId
             *
             * NB ecash-wallet does not currently support MINT for SLP_TOKEN_TYPE_MINT_VAULT tokens
             * This is handled in validateTokenActions
             */
            if (tokenIdsThisAction.size > 1) {
                throw new Error(
                    `An SLP SLP_TOKEN_TYPE_MINT_VAULT Action may only be associated with a single tokenId. Found ${tokenIdsThisAction.size}.`,
                );
            }
            if (
                typeof genesisAction !== 'undefined' &&
                tokenIdsThisAction.size !== 0
            ) {
                // If we have a genesis action and any other associated tokenIds
                // NB this covers the case of attempting to combine GENESIS and BURN
                throw new Error(
                    `An SLP SLP_TOKEN_TYPE_MINT_VAULT Action with a specified genesisAction may not have any other associated token actions.`,
                );
            }
            /**
             * For an SLP SLP_TOKEN_TYPE_FUNGIBLE Action,
             * if we have any send outputs, then we cannot have any other token outputs
             * and we may ONLY have a burn action
             */
            if (sendActionTokenIds.size > 0 && mintActionTokenIds.size > 0) {
                throw new Error(
                    `An SLP SLP_TOKEN_TYPE_MINT_VAULT Action with SEND outputs may not have any MINT outputs.`,
                );
            }

            /**
             * Now that we have validated everything we can validate at the Action and
             * Output level, iterate over outputs to validate for spec-related requirements
             * related to output ordering and indices
             *
             * Spec
             * https://github.com/badger-cash/slp-specifications/blob/master/slp-token-type-2.md
             *
             * - Mint qty must be at outIdx 1 for GENESIS txs (can be at 1 and more for MINT txs)
             * - Mint txs are only valid if their blockheight is > genesis tx blockheight
             * - No mint batons
             */
            for (let i = 0; i < outputs.length; i += 1) {
                const output = outputs[i];
                if ('tokenId' in output) {
                    if (output.isMintBaton === true) {
                        throw new Error(
                            `An SLP SLP_TOKEN_TYPE_MINT_VAULT Action may not have any mint batons.`,
                        );
                    }

                    // If this is a token output
                    if (i > SLP_MAX_SEND_OUTPUTS) {
                        /**
                         * For an SLP SLP_TOKEN_TYPE_MINT_VAULT action, we cannot have
                         * more than SLP_MAX_SEND_OUTPUTS (19) total token outputs
                         *
                         * We will support Actions with more than 19 outputs when we support
                         * chained txs, but even in this case there are additional rules (i.e.
                         * we would only support chained txs of sends, not mint or genesis)
                         *
                         * If the outIdx is higher than SLP_MAX_SEND_OUTPUTS, throw
                         * NB we need to validate not just for max outputs, but also for max outIdx, this approach does both
                         */
                        throw new Error(
                            `An SLP SLP_TOKEN_TYPE_MINT_VAULT Action may not have more than ${SLP_MAX_SEND_OUTPUTS} token outputs, and no outputs may be at outIdx > ${SLP_MAX_SEND_OUTPUTS}. Found output at outIdx ${i}.`,
                        );
                    }
                    if (sendActionTokenIds.has(output.tokenId)) {
                        // If this is a token send output, update lastAtomsOutIdx map
                        lastAtomsOutIdxMap.set(output.tokenId, i);
                    }
                }
                if (i === 1) {
                    // If we are at outIdx of 1
                    if (typeof genesisAction !== 'undefined') {
                        // If we have a genesis action specified
                        if (
                            !('tokenId' in output) ||
                            output.tokenId !==
                                payment.GENESIS_TOKEN_ID_PLACEHOLDER
                        ) {
                            // Throw if output at outIdx 1 is NOT a genesis-related mint quantity output
                            throw new Error(
                                `Genesis action for SLP_TOKEN_TYPE_MINT_VAULT token specified, but no mint quantity output found at outIdx 1. This is a spec requirement for SLP SLP_TOKEN_TYPE_MINT_VAULT tokens.`,
                            );
                        }
                        // else continue to the next output, no further validation required
                        continue;
                    }
                }
                if (
                    typeof genesisAction !== 'undefined' &&
                    'tokenId' in output &&
                    output.tokenId === payment.GENESIS_TOKEN_ID_PLACEHOLDER
                ) {
                    // Genesis tx cannot have any mint qty output other than the one at outIdx 1
                    throw new Error(
                        `An SLP SLP_TOKEN_TYPE_MINT_VAULT GENESIS tx may have only one mint qty output and it must be at outIdx 1. Found another mint qty output at outIdx ${i}.`,
                    );
                }
            }
            break;
        }
        // Intentional fall through as SLP_TOKEN_TYPE_NFT1_GROUP tokens have same spec as SLP_TOKEN_TYPE_FUNGIBLE tokens
        // Intentional fall through as SLP_TOKEN_TYPE_NFT1_CHILD tokens have same spec as SLP_TOKEN_TYPE_FUNGIBLE tokens
        // There is a unique case where we burn exactly 1 SLP_TOKEN_TYPE_NFT1_GROUP, but that is handled in the inputs, needed for selecting utxos, only for minting a SLP_TOKEN_TYPE_NFT1_CHILD
        // It is not technically a BURN action
        case 'SLP_TOKEN_TYPE_NFT1_GROUP':
        case 'SLP_TOKEN_TYPE_NFT1_CHILD':
        case 'SLP_TOKEN_TYPE_FUNGIBLE': {
            /**
             * Valid
             * - no token actions and no token outputs
             * - no token actions and send outputs of a single tokenId ONLY
             * - no token actions and burn outputs ONLY
             * - MINT action only and no send outputs
             * - GENESIS action only and no send outputs
             */

            // Flags to validate we DO NOT have more than one mint baton
            let hasExtendedMintingMintBaton = false;

            /**
             * Validate for tokenId(s) and actions
             * - SLP SLP_TOKEN_TYPE_FUNGIBLE can have ONLY genesis or
             *   ONLY send or ONLY mint, ONLY with a single tokenId
             */
            if (tokenIdsThisAction.size > 1) {
                throw new Error(
                    `An SLP ${tokenType.type} Action may only be associated with a single tokenId. Found ${tokenIdsThisAction.size}.`,
                );
            }
            if (
                typeof genesisAction !== 'undefined' &&
                tokenIdsThisAction.size !== 0
            ) {
                // If we have a genesis action and any other associated tokenIds
                // NB this covers the case of attempting to combine GENESIS and BURN
                throw new Error(
                    `An SLP ${tokenType.type} Action with a specified genesisAction may not have any other associated token actions.`,
                );
            }
            /**
             * For an SLP SLP_TOKEN_TYPE_FUNGIBLE Action,
             * if we have any send outputs, then we cannot have any other token outputs
             * and we may ONLY have a burn action
             */
            if (sendActionTokenIds.size > 0 && mintActionTokenIds.size > 0) {
                throw new Error(
                    `An SLP ${tokenType.type} Action with SEND outputs may not have any MINT outputs.`,
                );
            }

            /**
             * Now that we have validated everything we can validate at the Action and
             * Output level, iterate over outputs to validate for spec-related requirements
             * related to output ordering and indices
             *
             * For SLP SLP_TOKEN_TYPE_FUNGIBLE, mint qty and mint baton output validation is
             * simplified by strict spec requirements
             * - Mint qty must be at outIdx 1
             * - Can only have 1 mint baton, must be at outIdx 2-255
             */
            for (let i = 0; i < outputs.length; i += 1) {
                const output = outputs[i];
                if ('tokenId' in output) {
                    // If this is a token output
                    if (i > SLP_MAX_SEND_OUTPUTS) {
                        /**
                         * For an SLP SLP_TOKEN_TYPE_FUNGIBLE action, we cannot have
                         * more than SLP_MAX_SEND_OUTPUTS (19) total token outputs
                         *
                         * We will support Actions with more than 19 outputs when we support
                         * chained txs, but even in this case there are additional rules (i.e.
                         * we would only support chained txs of sends, not mint or genesis)
                         *
                         * If the outIdx is higher than SLP_MAX_SEND_OUTPUTS, throw
                         * NB we need to validate not just for max outputs, but also for max outIdx, this approach does both
                         */
                        throw new Error(
                            `An SLP ${tokenType.type} Action may not have more than ${SLP_MAX_SEND_OUTPUTS} token outputs, and no outputs may be at outIdx > ${SLP_MAX_SEND_OUTPUTS}. Found output at outIdx ${i}.`,
                        );
                    }
                    if (sendActionTokenIds.has(output.tokenId)) {
                        // If this is a token send output, update lastAtomsOutIdx map
                        lastAtomsOutIdxMap.set(output.tokenId, i);
                    }
                }
                if (i === 1) {
                    // If we are at outIdx of 1
                    if (typeof genesisAction !== 'undefined') {
                        // If we have a genesis action specified
                        if (
                            !('tokenId' in output) ||
                            output.tokenId !==
                                payment.GENESIS_TOKEN_ID_PLACEHOLDER ||
                            output.isMintBaton === true
                        ) {
                            // Throw if output at outIdx 1 is NOT a genesis-related mint quantity output
                            throw new Error(
                                `Genesis action for ${tokenType.type} token specified, but no mint quantity output found at outIdx 1. This is a spec requirement for SLP ${tokenType.type} tokens.`,
                            );
                        }
                        // else continue to the next output, no further validation required
                        continue;
                    } else if (mintActionTokenIds.size > 0) {
                        // If we have a non-genesis mint action implied by outputs
                        if (
                            !('tokenId' in output) ||
                            !mintActionTokenIds.has(output.tokenId) ||
                            output.isMintBaton === true
                        ) {
                            // If the output at outIdx 1 for an SLP_TOKEN_TYPE_FUNGIBLE tx with a mint qty specified
                            // is NOT a mint quantity output, throw
                            // This is a spec requirement for SLP SLP_TOKEN_TYPE_FUNGIBLE tokens
                            throw new Error(
                                `Mint action for ${tokenType.type} token specified, but no mint quantity output found at outIdx 1. This is a spec requirement for SLP ${tokenType.type} tokens.`,
                            );
                        }
                        // If outIdx 1 is a mint qty output, no further validation required
                        continue;
                    }
                }
                if ('isMintBaton' in output && output.isMintBaton === true) {
                    // NB that genesis txs and MINT txs both are limited to a single mint baton at outIdx 2-255

                    if (hasExtendedMintingMintBaton) {
                        // If this is the 2nd mint baton we have found, throw
                        throw new Error(
                            `An ${tokenType.type} ${
                                typeof genesisAction !== 'undefined'
                                    ? 'GENESIS'
                                    : 'MINT'
                            } tx may only specify exactly 1 mint baton. Found second mint baton at outIdx ${i}.`,
                        );
                    }
                    if (i < 2 || i > 255) {
                        // If the outIdx of the mint baton is off spec, throw
                        throw new Error(
                            `An ${tokenType.type} ${
                                typeof genesisAction !== 'undefined'
                                    ? 'GENESIS'
                                    : 'MINT'
                            } tx mint baton, if present, must be at outIdx 2-255. Mint baton found at outIdx ${i}.`,
                        );
                    }
                    hasExtendedMintingMintBaton = true;
                    continue;
                }
                if (
                    ('tokenId' in output &&
                        !output.isMintBaton &&
                        mintActionTokenIds.has(output.tokenId)) ||
                    (typeof genesisAction !== 'undefined' &&
                        'tokenId' in output &&
                        output.tokenId ===
                            payment.GENESIS_TOKEN_ID_PLACEHOLDER &&
                        !output.isMintBaton)
                ) {
                    // Genesis tx and MINT tx cannot have any mint qty output other than the one at outIdx 1
                    throw new Error(
                        `An ${tokenType.type} ${
                            typeof genesisAction !== 'undefined'
                                ? 'GENESIS'
                                : 'MINT'
                        } tx may have only one mint qty output and it must be at outIdx 1. Found another mint qty output at outIdx ${i}.`,
                    );
                }
            }
            break;
        }
        case 'ALP_TOKEN_TYPE_STANDARD': {
            /**
             * ALP_TOKEN_TYPE_STANDARD
             *
             * - May only have a single genesisAction
             * - May not combine MINT and SEND actions for the same tokenId
             * - May have multiple mint batons, but must be consecutive and have higher index than qty outputs
             * - May have multiple mint quantities
             * - For now, all outputs must be at outIdx 1 <= outIdx <= 29
             */

            /**
             * For an ALP_TOKEN_TYPE_STANDARD Action,
             * we cannot have SEND and MINT outputs for the same tokenId
             */
            if (sendActionTokenIds.size > 0 && mintActionTokenIds.size > 0) {
                sendActionTokenIds.forEach(sentTokenId => {
                    if (mintActionTokenIds.has(sentTokenId)) {
                        throw new Error(
                            `An ALP ALP_TOKEN_TYPE_STANDARD Action cannot have SEND and MINT outputs for the same tokenId. Found SEND and MINT outputs for tokenId ${sentTokenId}.`,
                        );
                    }
                });
            }

            // Flags for validating mint baton(s)
            let lastOutputMintBatonTokenId;
            const tokenIdsWithMintBatons = new Set();
            for (let i = 0; i < outputs.length; i += 1) {
                const output = outputs[i];
                if ('tokenId' in output) {
                    // If this is a token output
                    if (i > ALP_POLICY_MAX_OUTPUTS) {
                        /**
                         * For an ALP ALP_TOKEN_TYPE_STANDARD action, we cannot have
                         * more than ALP_POLICY_MAX_OUTPUTS (29) total token outputs.
                         *
                         * This is the 1-tx limit given current OP_RETURN limit (223 bytes).
                         *
                         * We will support Actions with more than 29 outputs when we support
                         * chained txs, but even in this case there are additional rules (i.e.
                         * we will probably only support chained txs of sends, not mint or genesis)
                         *
                         * If the outIdx is higher than ALP_POLICY_MAX_OUTPUTS, throw
                         * NB we need to validate not just for max outputs, but also for max outIdx, this approach does both
                         */
                        throw new Error(
                            `An ALP ALP_TOKEN_TYPE_STANDARD Action may not have more than ${ALP_POLICY_MAX_OUTPUTS} token outputs, and no outputs may be at outIdx > ${ALP_POLICY_MAX_OUTPUTS}. Found output at outIdx ${i}.`,
                        );
                    }
                    if (
                        'atoms' in output &&
                        output.isMintBaton === false &&
                        'tokenId' in output &&
                        sendActionTokenIds.has(output.tokenId)
                    ) {
                        // If this is a non-mint baton non-mint send output
                        // Update lastAtomsOutIdx for this tokenId to this index
                        lastAtomsOutIdxMap.set(output.tokenId, i);
                    }
                }
                if ('isMintBaton' in output && output.isMintBaton === true) {
                    // If the output is a mint baton
                    // NB this also includes GENESIS mint batons
                    const tokenIdThisOutput =
                        'tokenId' in output
                            ? output.tokenId
                            : payment.GENESIS_TOKEN_ID_PLACEHOLDER;

                    const isFirstMintBatonThisTokenId =
                        !tokenIdsWithMintBatons.has(tokenIdThisOutput);

                    if (isFirstMintBatonThisTokenId) {
                        // If this is the first mint baton for this tokenId,
                        // set lastAtomsOutIdx for this tokenId to i-1
                        lastAtomsOutIdxMap.set(tokenIdThisOutput, i - 1);
                        // Initialize batons map
                        numBatonsMap.set(tokenIdThisOutput, 1);
                    } else {
                        // If this is NOT the first mint baton if this tokenId, then it must
                        // be part of a consecutive string of mint baton outputs of this tokenId
                        if (lastOutputMintBatonTokenId !== tokenIdThisOutput) {
                            // If the last mint baton was not for this tokenId, throw
                            throw new Error(
                                `An ALP ALP_TOKEN_TYPE_STANDARD Action may only have consecutive mint baton outputs for the same tokenId. Found non-consecutive mint baton output at outIdx ${i} for ${
                                    tokenIdThisOutput ===
                                    payment.GENESIS_TOKEN_ID_PLACEHOLDER
                                        ? `GENESIS action`
                                        : `tokenId ${tokenIdThisOutput}`
                                }.`,
                            );
                        }

                        // Increment numBatonsMap
                        numBatonsMap.set(
                            tokenIdThisOutput,
                            numBatonsMap.get(tokenIdThisOutput)! + 1,
                        );
                    }

                    // Update flag
                    lastOutputMintBatonTokenId = tokenIdThisOutput;

                    tokenIdsWithMintBatons.add(tokenIdThisOutput);

                    // Validation complete for this output, go to the next one
                    continue;
                }
                if (
                    ('tokenId' in output &&
                        mintActionTokenIds.has(output.tokenId) &&
                        !output.isMintBaton) ||
                    ('tokenId' in output &&
                        output.tokenId ===
                            payment.GENESIS_TOKEN_ID_PLACEHOLDER &&
                        !output.isMintBaton)
                ) {
                    // If this is a mint qty output (MINT or GENESIS)
                    const tokenIdThisOutput =
                        'tokenId' in output
                            ? output.tokenId
                            : payment.GENESIS_TOKEN_ID_PLACEHOLDER;

                    if (tokenIdsWithMintBatons.has(tokenIdThisOutput)) {
                        // If we have already seen mint batons for this tokenId, throw
                        throw new Error(
                            `For a given tokenId, an ALP ALP_TOKEN_TYPE_STANDARD Action may not have mint qty outputs at a higher outIdx than mint baton outputs. Mint qty output for ${
                                tokenIdThisOutput ===
                                payment.GENESIS_TOKEN_ID_PLACEHOLDER
                                    ? `GENESIS action`
                                    : `a tokenId`
                            } with preceding mint batons found at outIdx ${i}.`,
                        );
                    }

                    // Update lastAtomsOutIdx for this tokenId
                    lastAtomsOutIdxMap.set(tokenIdThisOutput, i);

                    // NB we could validate atoms here, but this is validated by alp methods in ecash-lib
                }
                // Reset the lastOutputMintBatonTokenId flag for all outputs that are not mint batons
                lastOutputMintBatonTokenId = undefined;
            }
            break;
        }
        default: {
            throw new Error(`Unsupported tokenType ${tokenType.type}.`);
        }
    }

    /**
     * Validation complete and any generated outputs added to outputs array
     * Now we can build the OP_RETURN
     *
     * We do it in this function because the same validation steps are required
     * So, if we separate the function, it doesn't really work as a stand-alone
     */

    /**
     * Required genesis info
     *
     * ALP
     * atomsArray, numBatons
     *
     * SLP
     * atoms
     * mintBatonOutIdx
     */

    let opReturnScript: Script;

    switch (tokenType.type) {
        case 'SLP_TOKEN_TYPE_MINT_VAULT': {
            /**
             * NB for SLP_TOKEN_TYPE_MINT_VAULT, lastAtomsOutIdx is only relevant for a send tx
             * We do not need this info for genesis as there can be only one qty output
             * We would need this info for MINT, but this is not yet supported
             *
             * NB for SLP_TOKEN_TYPE_MINT_VAULT, we expect only 1 or 0 entries in lastAtomsOutIdxMap
             */

            // GENESIS action mint qty, if applicable
            let mintQuantity: undefined | bigint;

            // We only expect 0 or 1 entries in lastAtomsKeyValueArr for SLP_TOKEN_TYPE_FUNGIBLE
            const lastAtomsKeyValueArr = lastAtomsOutIdxMap
                .entries()
                .next().value;

            const lastAtomsOutIdx: undefined | number =
                typeof lastAtomsKeyValueArr !== 'undefined'
                    ? lastAtomsKeyValueArr[1]
                    : undefined;

            // Will only have one for SLP. Necessary for SEND.
            // NB SLP MINT txs may only have 1 mint qty and 1 mint baton
            const atomsArray: bigint[] = [];
            // NB we start iterating at i=1 bc we do not have to do anything for the outIdx 0 OP_RETURN output
            for (let i = 1; i < outputs.length; i += 1) {
                const output = outputs[i];

                if ('tokenId' in output) {
                    if (sendActionTokenIds.has(output.tokenId)) {
                        // If this is a token SEND output, we must add its atoms to the atomsArray
                        // NB for SLP_TOKEN_TYPE_FUNGIBLE we only use atomsArray for SEND action
                        atomsArray.push(output.atoms);
                    }
                }
                if (
                    'tokenId' in output &&
                    output.tokenId === payment.GENESIS_TOKEN_ID_PLACEHOLDER
                ) {
                    // If this is a mint qty output (GENESIS or MINT)
                    mintQuantity = output.atoms;
                }
                if (
                    atomsArray.length !== i &&
                    i <= SLP_MAX_SEND_OUTPUTS &&
                    typeof lastAtomsOutIdx === 'number' &&
                    i <= lastAtomsOutIdx
                ) {
                    // If we did not add atoms to atomsArray for this outIdx
                    // AND we are still dealing with outIdx values that are associated
                    // with SLP tokens
                    // AND we still expect another outIdx associated with this token send later
                    // THEN add 0n placeholder
                    // NB we only use atomsArray for SLP SEND or BURN for SLP_TOKEN_TYPE_FUNGIBLE
                    atomsArray.push(0n);
                }
            }

            if (typeof mintQuantity !== 'undefined') {
                // If we have a mint quantity (for SLP_TOKEN_TYPE_FUNGIBLE, this is required
                // for all GENESIS and MINT actions)
                if (typeof genesisAction !== 'undefined') {
                    // If this is a GENESIS tx, build a GENESIS OP_RETURN
                    opReturnScript = slpGenesis(
                        genesisAction.tokenType.number,
                        genesisAction.genesisInfo,
                        mintQuantity,
                    );
                }
            } else if (burnActionTokenIds.size > 0) {
                const burnAtoms = (tokenActions[0] as payment.BurnAction)
                    .burnAtoms;
                opReturnScript = slpBurn(
                    (tokenActions[0] as payment.BurnAction).tokenId,
                    tokenType.number,
                    burnAtoms,
                );
            } else {
                // SEND
                opReturnScript = slpSend(
                    (tokenActions[0] as payment.SendAction).tokenId,
                    tokenType.number,
                    atomsArray,
                );
            }

            // Write over the blank OP_RETURN output at index 0
            (outputs[0] as payment.PaymentOutput).script = opReturnScript!;

            break;
        }
        // Intentional fall through as SLP_TOKEN_TYPE_NFT1_GROUP tokens have same spec as SLP_TOKEN_TYPE_FUNGIBLE tokens
        // Intentional fall through as SLP_TOKEN_TYPE_NFT1_CHILD tokens have same spec as SLP_TOKEN_TYPE_FUNGIBLE tokens

        case 'SLP_TOKEN_TYPE_NFT1_GROUP':
        case 'SLP_TOKEN_TYPE_NFT1_CHILD':
        case 'SLP_TOKEN_TYPE_FUNGIBLE': {
            /**
             * NB for SLP_TOKEN_TYPE_FUNGIBLE, lastAtomsOutIdx is only relevant for a send tx
             * We do not need this info for mint or genesis as there can be only one qty output
             * and it must be at outIdx 1, and only 1 mint baton
             *
             * NB for SLP_TOKEN_TYPE_FUNGIBLE, we expect only 1 or 0 entries in lastAtomsOutIdxMap
             */

            // GENESIS or MINT action mint qty, if applicable
            let mintQuantity: undefined | bigint;
            // GENESIS or MINT action mint baton outIdx, if applicable
            let mintBatonOutIdx: undefined | number;

            // We only expect 0 or 1 entries in lastAtomsKeyValueArr for SLP_TOKEN_TYPE_FUNGIBLE
            const lastAtomsKeyValueArr = lastAtomsOutIdxMap
                .entries()
                .next().value;

            const lastAtomsOutIdx: undefined | number =
                typeof lastAtomsKeyValueArr !== 'undefined'
                    ? lastAtomsKeyValueArr[1]
                    : undefined;

            // Will only have one for SLP. Necessary for SEND.
            // NB SLP MINT txs may only have 1 mint qty and 1 mint baton
            const atomsArray: bigint[] = [];
            // NB we start iterating at i=1 bc we do not have to do anything for the outIdx 0 OP_RETURN output
            for (let i = 1; i < outputs.length; i += 1) {
                const output = outputs[i];

                if ('tokenId' in output) {
                    if (sendActionTokenIds.has(output.tokenId)) {
                        // If this is a token SEND output, we must add its atoms to the atomsArray
                        // NB for SLP_TOKEN_TYPE_FUNGIBLE we only use atomsArray for SEND action
                        atomsArray.push(output.atoms);
                    }
                }
                if (
                    ('tokenId' in output &&
                        mintActionTokenIds.has(output.tokenId) &&
                        !output.isMintBaton) ||
                    ('tokenId' in output &&
                        output.tokenId ===
                            payment.GENESIS_TOKEN_ID_PLACEHOLDER &&
                        !output.isMintBaton)
                ) {
                    // If this is a mint qty output (GENESIS or MINT)
                    mintQuantity = output.atoms;
                }
                if ('isMintBaton' in output && output.isMintBaton === true) {
                    // If this is a mint baton output (GENESIS or MINT)
                    mintBatonOutIdx = i;
                }
                if (
                    atomsArray.length !== i &&
                    i <= SLP_MAX_SEND_OUTPUTS &&
                    typeof lastAtomsOutIdx === 'number' &&
                    i <= lastAtomsOutIdx
                ) {
                    // If we did not add atoms to atomsArray for this outIdx
                    // AND we are still dealing with outIdx values that are associated
                    // with SLP tokens
                    // AND we still expect another outIdx associated with this token send later
                    // THEN add 0n placeholder
                    // NB we only use atomsArray for SLP SEND or BURN for SLP_TOKEN_TYPE_FUNGIBLE
                    atomsArray.push(0n);
                }
            }

            if (typeof mintQuantity !== 'undefined') {
                // If we have a mint quantity (for SLP_TOKEN_TYPE_FUNGIBLE, this is required
                // for all GENESIS and MINT actions)
                if (typeof genesisAction !== 'undefined') {
                    // Validate quantity 1n for NFT genesis
                    if (
                        genesisAction.tokenType.type ===
                        SLP_TOKEN_TYPE_NFT1_CHILD.type
                    ) {
                        // We validate that SLP_TOKEN_TYPE_NFT1_CHILD mints are only for qty 1n
                        // NB chronik will also throw an error if this broadcasts as it fails token checks
                        if (mintQuantity !== 1n) {
                            throw new Error(
                                `An SLP_TOKEN_TYPE_NFT1_CHILD GENESIS tx must have 1 atom at outIdx 1. Found ${mintQuantity} atoms.`,
                            );
                        }
                    }
                    // If this is a GENESIS tx, build a GENESIS OP_RETURN
                    opReturnScript = slpGenesis(
                        genesisAction.tokenType.number,
                        genesisAction.genesisInfo,
                        mintQuantity,
                        // NB mintBatonOutIdx may be undefined, implying a genesis tx with no mint baton
                        mintBatonOutIdx,
                    );
                } else {
                    // This is a MINT tx
                    opReturnScript = slpMint(
                        (tokenActions[0] as payment.MintAction)
                            .tokenId as string,
                        tokenType.number,
                        mintQuantity,
                        mintBatonOutIdx,
                    );
                }
            } else if (burnActionTokenIds.size > 0) {
                const burnAtoms = (tokenActions[0] as payment.BurnAction)
                    .burnAtoms;
                opReturnScript = slpBurn(
                    (tokenActions[0] as payment.BurnAction).tokenId,
                    tokenType.number,
                    burnAtoms,
                );
            } else {
                // SEND
                opReturnScript = slpSend(
                    (tokenActions[0] as payment.SendAction).tokenId,
                    tokenType.number,
                    atomsArray,
                );
            }

            // Write over the blank OP_RETURN output at index 0
            (outputs[0] as payment.PaymentOutput).script = opReturnScript!;

            break;
        }
        case 'ALP_TOKEN_TYPE_STANDARD': {
            // ALP token txs may have multiple actions, each with its own EMPP push within emppScriptArr
            // NB there may be only one GENESIS push and it must be at the beginning
            // NB we have already validated for the condition of "one genesis"
            const emppScriptArr: Uint8Array[] = [];

            // ALP txs may have multiple atomsArrays for multiple tokenIds
            // ALP genesis tx also needs an atomsArray as ALP genesis supports multiple mint qtys and mint batons,
            // unlike SLP genesis

            // tokenId => atomsArray
            const atomsArrayMap: Map<string, bigint[]> = new Map();

            // Init atomsArrayMap with an empty array for each tokenId that will need an atomsArray in this tx
            lastAtomsOutIdxMap.forEach((_lastAtomsOutIdx, tokenId) => {
                atomsArrayMap.set(tokenId, []);
            });

            // Build atomsArray for each tokenId that needs one
            for (let i = 0; i < outputs.length; i++) {
                const output = outputs[i];
                /**
                 * Conditions to add a 0 to atoms array
                 * - i < lastAtomsOutIdx for this tokenId
                 * - output is not related to the tokenId of the atoms array
                 */
                atomsArrayMap.forEach((atomsArray, tokenId) => {
                    if (i === 0) {
                        // The atomsArrays do not require an input for index 0
                        return;
                    }

                    const lastAtomsOutIdxThisTokenId =
                        lastAtomsOutIdxMap.get(tokenId);

                    if (i <= lastAtomsOutIdxThisTokenId!) {
                        // If we have not yet passed lastAtomsOutIdx for this tokenId
                        if (
                            tokenId === payment.GENESIS_TOKEN_ID_PLACEHOLDER &&
                            'atoms' in output
                        ) {
                            // If this is a genesis output and we are working with the genesis atomsArray
                            // add atoms
                            atomsArray.push(output.atoms);
                        } else if (
                            'tokenId' in output &&
                            output.tokenId === tokenId
                        ) {
                            // If this is a non-genesis token-associated output
                            // and it is associated with this tokenId
                            atomsArray.push(output.atoms);
                        } else {
                            // If this output should not be colored for this tokenId
                            // but we are not yet to lasAtomsOutIdx, add 0n
                            atomsArray.push(0n);
                        }
                    }
                });
            }

            // Now we have all the atomsArray(s) we need
            // Build the OP_RETURN

            // Build the OP_RETURN in order of specified tokenActions
            for (const action of tokenActions) {
                const { type } = action;
                switch (type) {
                    case 'GENESIS': {
                        const genesisEmppPush = alpGenesis(
                            (genesisAction as payment.GenesisAction).tokenType
                                .number,
                            (genesisAction as payment.GenesisAction)
                                .genesisInfo,
                            {
                                atomsArray: atomsArrayMap.get(
                                    payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                ) as bigint[],
                                numBatons:
                                    numBatonsMap.get(
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    ) ?? 0,
                            },
                        );
                        emppScriptArr.push(genesisEmppPush);
                        break;
                    }
                    case 'SEND': {
                        const { tokenId } = action as payment.SendAction;
                        const thisAtomsArray = atomsArrayMap.get(tokenId);
                        emppScriptArr.push(
                            alpSend(tokenId, tokenType.number, thisAtomsArray!),
                        );
                        break;
                    }
                    case 'MINT': {
                        const { tokenId } = action as payment.MintAction;
                        const thisAtomsArray = atomsArrayMap.get(tokenId);
                        emppScriptArr.push(
                            alpMint(tokenId, tokenType.number, {
                                atomsArray: thisAtomsArray!,
                                numBatons: numBatonsMap.get(tokenId) ?? 0,
                            }),
                        );
                        break;
                    }
                    case 'BURN': {
                        // NB we have already handled atomsArray for case 'SEND' for actions that send and burn
                        const { tokenId, burnAtoms } =
                            action as payment.BurnAction;
                        emppScriptArr.push(
                            alpBurn(tokenId, tokenType.number, burnAtoms),
                        );
                        break;
                    }
                    case 'DATA': {
                        // Add the arbitrary data as an EMPP push
                        const { data } = action as payment.DataAction;
                        emppScriptArr.push(data);
                        break;
                    }
                    default: {
                        // Should never happen as we have already validated actions
                        throw new Error(
                            `Unsupported token action type: ${type}.`,
                        );
                    }
                }
            }

            // Combine all ALP EMPP pushes into the OP_RETURN
            opReturnScript = emppScript(emppScriptArr);

            const opReturnBytes = opReturnScript.bytecode.length;
            if (opReturnBytes > OP_RETURN_MAX_BYTES) {
                throw new Error(
                    `Specified action results in OP_RETURN of ${opReturnBytes} bytes, vs max allowed of ${OP_RETURN_MAX_BYTES}.`,
                );
            }
            // Write over the blank OP_RETURN output at index 0
            (outputs[0] as payment.PaymentOutput).script = opReturnScript!;
            break;
        }
        default: {
            break;
        }
    }

    // We must return the paymentOutputs to support utxo updating after successful build
    // The txOutputs are used to build and sign the tx
    return {
        paymentOutputs: outputs,
        txOutputs: paymentOutputsToTxOutputs(outputs, dustSats),
    };
};

/**
 * Convert a PaymentOutput to a ScriptUtxo
 * NB this function assumes the output is from a valid tx that met valid token spec conditions
 */
export const getUtxoFromOutput = (
    output: payment.PaymentOutput,
    txid: string,
    outIdx: number,
    tokenType?: TokenType,
): ScriptUtxo => {
    // Create the outpoint
    const outpoint = { txid, outIdx };

    const { sats } = output;
    if (typeof sats === 'undefined') {
        // OP_RETURN outputs cannot be utxos
        // NB we do not expect this function to be called on OP_RETURN outputs
        throw new Error('Output must have sats');
    }

    if ('tokenId' in output) {
        if (typeof tokenType === 'undefined') {
            throw new Error('Token type is required for token utxos');
        }
        /**
         * This PaymentOutput has become a token utxo
         *
         * Possibilities
         * - GENESIS mint baton (tokenId will be txid)
         * - GENESIS mint qty (tokenId will be txid)
         * - mint baton (tokenId as specified)
         * - mint qty (tokenId as specified)
         */

        const tokenId =
            output.tokenId === payment.GENESIS_TOKEN_ID_PLACEHOLDER
                ? txid
                : output.tokenId;

        return {
            outpoint,
            sats,
            token: {
                tokenId,
                tokenType,
                atoms: output.atoms,
                isMintBaton: output.isMintBaton ?? false,
            },
            // We init as unconfirmed
            blockHeight: -1,
            // We init as unfinalized
            isFinal: false,
            // A utxo created from a PaymentOutput will never be a coinbase utxo
            isCoinbase: false,
        };
    } else {
        // Just a regular non-token utxo
        return {
            outpoint,
            // We init as unconfirmed
            blockHeight: -1,
            sats,
            // We init as unfinalized
            isFinal: false,
            // A utxo created from a PaymentOutput will never be a coinbase utxo
            isCoinbase: false,
        };
    }
};

/**
 * Punchlist
 *
 * [] New diff: UX of burning mint batons and associated regtest
 * [] New diff: support remaining token types
 * [] New diff: chained txs
 */
