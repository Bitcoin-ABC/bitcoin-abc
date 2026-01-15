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
    MAX_TX_SERSIZE,
    fromHex,
    EccDummy,
    P2PKH_OUTPUT_SIZE,
} from 'ecash-lib';
import {
    ChronikClient,
    ScriptUtxo,
    TokenType,
    Tx as ChronikTx,
} from 'chronik-client';

const eccDummy = new EccDummy();
export const DUMMY_SK = fromHex(
    '112233445566778899001122334455667788990011223344556677889900aabb',
);
export const DUMMY_PK = eccDummy.derivePubkey(DUMMY_SK);
const DUMMY_P2PKH = Script.p2pkh(
    fromHex('0123456789012345678901234567890123456789'),
);
const DUMMY_P2PKH_INPUT = {
    input: {
        prevOut: { txid: '00'.repeat(32), outIdx: 0 },
        signData: {
            sats: DEFAULT_DUST_SATS,
            outputScript: DUMMY_P2PKH,
        },
    },
    signatory: P2PKHSignatory(DUMMY_SK, DUMMY_PK, ALL_BIP143),
};
export const DUMMY_P2PKH_OUTPUT = {
    sats: DEFAULT_DUST_SATS,
    script: Script.p2pkh(fromHex('11'.repeat(20))),
};

// User change and a utxo for the next chainedTx
const CHAINED_TX_ALPHA_RESERVED_OUTPUTS = 2;

// A tx in a chain that is not the first tx will always have exactly 1 input
const NTH_TX_IN_CHAIN_INPUTS = 1;

/**
 * Dummy prevOut txid for preliminary txs in chained token sends
 * To be used for PreliminaryTxs that will be updated with the real txid
 * when we convert PreliminaryTxs to final signed txs
 */
const DUMMY_PRELIMINARY_TXID = '99'.repeat(32);

/**
 * Keypair data for an HD wallet address
 */
export interface KeypairData {
    sk: Uint8Array;
    pk: Uint8Array;
    pkh: Uint8Array;
    script: Script;
    address: string;
}

/**
 * Wallet UTXO with cached address for quick lookup
 * Extends ScriptUtxo with an address field derived from outputScript
 */
export interface WalletUtxo extends ScriptUtxo {
    address: string;
}

/**
 * Wallet
 *
 * Implements a one-address eCash (XEC) wallet
 * Useful for running a simple hot wallet
 *
 * Also supports HD wallets when created with fromMnemonic(..., { hd: true })
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
    utxos: WalletUtxo[];
    /**
     * Total balance in satoshis from sats only UTXOs
     * Does not include sat balance of utxos associated with tokens
     * DOES include immature coinbase sats
     * Updated during sync()
     */
    balanceSats: bigint;
    /** Whether this is an HD wallet */
    isHD: boolean;
    /** Account number for HD wallets (defaults to 0) */
    accountNumber: number;
    /** Base HD node at m/44'/1899'/<accountNumber>' (only set for HD wallets) */
    baseHdNode: HdNode | undefined;
    /** Current receive address index, i.e. the next address we will receive at */
    receiveIndex: number;
    /** Current change address index, i.e. the next address we will send change to */
    changeIndex: number;
    /** Map of address -> keypair data for HD wallets */
    keypairs: Map<string, KeypairData>;

    private constructor(
        sk: Uint8Array,
        chronik: ChronikClient,
        baseHdNode?: HdNode,
        accountNumber: number = 0,
    ) {
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
        this.balanceSats = 0n;

        // Initialize HD wallet properties
        this.isHD = baseHdNode !== undefined;
        this.accountNumber = accountNumber;
        this.baseHdNode = baseHdNode;
        this.receiveIndex = 0;
        this.changeIndex = 0;
        this.keypairs = new Map();

        // For HD wallets, derive and cache the first receive address (index 0)
        if (this.isHD && this.baseHdNode) {
            const firstKeypair = this._deriveKeypair(false, 0);
            this.keypairs.set(firstKeypair.address, firstKeypair);
            // Update wallet's main address to be the first receive address
            this.address = firstKeypair.address;
            this.script = firstKeypair.script;
            this.sk = firstKeypair.sk;
            this.pk = firstKeypair.pk;
            this.pkh = firstKeypair.pkh;
        } else {
            // For a non-HD wallet, we only have one keypair
            this.keypairs.set(this.address, {
                sk: this.sk,
                pk: this.pk,
                pkh: this.pkh,
                script: this.script,
                address: this.address,
            });
        }
    }

    /**
     * Derive a keypair at a specific path for HD wallets
     * Path: m/44'/1899'/<accountNumber>'/<forChange ? 1 : 0>/<index>
     *
     * @param forChange - If true, derive change address (chain 1), otherwise receive address (chain 0)
     * @param index - The address index
     * @returns Keypair data for the derived address
     * @throws Error if wallet is not HD or baseHdNode is not set
     */
    private _deriveKeypair(forChange: boolean, index: number): KeypairData {
        if (!this.isHD || !this.baseHdNode) {
            throw new Error('_deriveKeypair can only be called on HD wallets');
        }

        // Derive path: m/44'/1899'/0'/<forChange ? 1 : 0>/<index>
        const chainIndex = forChange ? 1 : 0;
        const chainNode = this.baseHdNode.derive(chainIndex);
        const addressNode = chainNode.derive(index);

        const sk = addressNode.seckey()!;
        const pk = this.ecc.derivePubkey(sk);
        const pkh = shaRmd160(pk);
        const script = Script.p2pkh(pkh);
        const address = Address.p2pkh(pkh).toString();

        return {
            sk,
            pk,
            pkh,
            script,
            address,
        };
    }

    /**
     * Get keypair data for a specific address
     *
     * @param address - The address to look up
     * @returns Keypair data if address is in wallet, undefined otherwise
     */
    public getKeypairForAddress(address: string): KeypairData | undefined {
        return this.keypairs.get(address);
    }

    /**
     * Get receive address at a specific index
     * Does not increment receiveIndex
     *
     * @param index - The receive address index
     * @returns The address string
     * @throws Error if wallet is not HD
     */
    public getReceiveAddress(index: number): string {
        if (!this.isHD) {
            throw new Error(
                'getReceiveAddress can only be called on HD wallets',
            );
        }

        // Derive to get the address (we need this to check the cache)
        const keypair = this._deriveKeypair(false, index);

        // Return cached keypair if available, otherwise cache and return new one
        const cached = this.keypairs.get(keypair.address);
        if (cached) {
            return cached.address;
        }

        this.keypairs.set(keypair.address, keypair);
        return keypair.address;
    }

    /**
     * Get change address at a specific index
     * Does not increment changeIndex
     *
     * @param index - The change address index
     * @returns The address string
     * @throws Error if wallet is not HD
     */
    public getChangeAddress(index: number): string {
        if (!this.isHD) {
            throw new Error(
                'getChangeAddress can only be called on HD wallets',
            );
        }

        // Derive to get the address (we need this to check the cache)
        const keypair = this._deriveKeypair(true, index);

        // Return cached keypair if available, otherwise cache and return new one
        const cached = this.keypairs.get(keypair.address);
        if (cached) {
            return cached.address;
        }

        this.keypairs.set(keypair.address, keypair);
        return keypair.address;
    }

    /**
     * Get the next receive address and increment receiveIndex
     *
     * @returns The next receive address
     * @throws Error if wallet is not HD
     */
    public getNextReceiveAddress(): string {
        if (!this.isHD) {
            throw new Error(
                'getNextReceiveAddress can only be called on HD wallets',
            );
        }

        const address = this.getReceiveAddress(this.receiveIndex);
        this.receiveIndex++;
        return address;
    }

    /**
     * Get the next change address and increment changeIndex
     *
     * @returns The next change address
     * @throws Error if wallet is not HD
     */
    public getNextChangeAddress(): string {
        if (!this.isHD) {
            throw new Error(
                'getNextChangeAddress can only be called on HD wallets',
            );
        }

        const address = this.getChangeAddress(this.changeIndex);
        this.changeIndex++;
        return address;
    }

    /**
     * Get all addresses currently cached in the keypairs map
     *
     * @returns Array of all cached addresses
     */
    public getAllAddresses(): string[] {
        return Array.from(this.keypairs.keys());
    }

    /**
     * Update Wallet
     * - Set utxos to latest from chronik
     * - Set tipHeight to latest from chronik
     *
     * NB the reason we update tipHeight with sync() is
     * to determine which (if any) coinbase utxos
     * are spendable when we build txs
     *
     * For HD wallets, syncs all addresses at or below current indices
     * (receive addresses 0 to receiveIndex, change addresses 0 to changeIndex)
     */
    public async sync(): Promise<void> {
        if (!this.isHD) {
            // Single-address wallet: use existing sync logic
            const result = await this.chronik.address(this.address).utxos();
            const tipHeight = (await this.chronik.blockchainInfo()).tipHeight;

            // Convert ScriptUtxos to WalletUtxos (derive address once for all UTXOs)
            this.utxos = this._convertToWalletUtxos(
                result.utxos,
                result.outputScript,
            );
            this.tipHeight = tipHeight;
            this.updateBalance();
            return;
        }

        // HD wallet: sync all addresses at or below current indices
        await this._syncHDWallet();
    }

    /**
     * Convert an array of ScriptUtxos to WalletUtxos by deriving the address from outputScript once
     *
     * @param utxos - Array of ScriptUtxos to convert
     * @param outputScript - The output script as a hex string (from ScriptUtxos.outputScript)
     * @returns Array of WalletUtxos with address field added
     */
    public _convertToWalletUtxos(
        utxos: ScriptUtxo[],
        outputScript: string,
    ): WalletUtxo[] {
        // Derive address from outputScript hex string once
        const address = Address.fromScriptHex(outputScript).toString();

        // Add address to all UTXOs
        return utxos.map(utxo => ({
            ...utxo,
            address,
        }));
    }

    /**
     * Sync HD wallet: query UTXOs for all addresses at or below current indices
     * (receive addresses 0 to receiveIndex, change addresses 0 to changeIndex)
     */
    private async _syncHDWallet(): Promise<void> {
        // Get tipHeight (same for all addresses)
        const tipHeight = (await this.chronik.blockchainInfo()).tipHeight;

        // Expected number of addresses based on indices
        const expectedAddressCount =
            this.receiveIndex + 1 + this.changeIndex + 1;

        // Ensure all addresses are cached (derive if needed)
        // If keypairs.size matches expected count, we can use cached addresses
        // Otherwise, derive missing addresses by calling getReceiveAddress/getChangeAddress
        // NB we assume the receive and change indices are correct; we will implement
        // a method of "discovering" these indices if they are unknown later
        if (this.keypairs.size < expectedAddressCount) {
            // Derive all receive addresses from 0 to receiveIndex
            for (let i = 0; i <= this.receiveIndex; i++) {
                this.getReceiveAddress(i); // This will cache if not already cached
            }

            // Derive all change addresses from 0 to changeIndex
            for (let i = 0; i <= this.changeIndex; i++) {
                this.getChangeAddress(i); // This will cache if not already cached
            }
        }

        // Get all addresses to sync (now guaranteed to be cached)
        const allAddresses = this.getAllAddresses();

        // Query UTXOs for all addresses in parallel
        // TODO chronik and chronik-client should be optimized to support a single query for utxos
        // at multiple addresses
        const utxoPromises = allAddresses.map(address =>
            this.chronik.address(address).utxos(),
        );
        const utxoResults = await Promise.all(utxoPromises);

        // Merge all UTXOs and convert to WalletUtxo (derive address once per address)
        const allUtxos: WalletUtxo[] = [];
        for (const result of utxoResults) {
            // result.outputScript is the hex string for all UTXOs in this result
            // Derive address once and apply to all UTXOs from this address
            allUtxos.push(
                ...this._convertToWalletUtxos(
                    result.utxos,
                    result.outputScript,
                ),
            );
        }

        // Update wallet state
        this.utxos = allUtxos;
        this.tipHeight = tipHeight;
        this.updateBalance();
    }

    /**
     * Return all spendable UTXOs only containing sats and no tokens
     *
     * - Any spendable coinbase UTXO without tokens
     * - Any non-coinbase UTXO without tokens
     */
    public spendableSatsOnlyUtxos(): WalletUtxo[] {
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
     * Calculate the maximum amount of satoshis this wallet can send
     * Accounts for transaction fees and optional extra outputs (e.g., OP_RETURN for Cashtab messages)
     *
     * @param extraOutputs - Optional array of additional outputs to include in the transaction (e.g., OP_RETURN)
     * @param feePerKb - Fee per kilobyte in satoshis (defaults to DEFAULT_FEE_SATS_PER_KB)
     * @returns The maximum sendable amount in satoshis, or 0n if insufficient funds
     */
    public maxSendSats(
        extraOutputs: TxOutput[] = [],
        feePerKb: bigint = DEFAULT_FEE_SATS_PER_KB,
    ): bigint {
        // Get all spendable sats-only UTXOs
        const spendableUtxos = this.spendableSatsOnlyUtxos();

        if (spendableUtxos.length === 0) {
            return 0n;
        }

        // Calculate total balance from spendable UTXOs
        const totalSats = spendableUtxos.reduce(
            (sum, utxo) => sum + utxo.sats,
            0n,
        );

        // Build dummy inputs from all spendable UTXOs
        const inputs: TxBuilderInput[] = spendableUtxos.map(utxo =>
            this.p2pkhUtxoToBuilderInput(utxo, ALL_BIP143),
        );

        // Build outputs: extra outputs + max send output (total balance)
        // We use a dummy p2pkh script for the max send output to estimate fee
        // The actual recipient script may differ, but this gives a reasonable estimate
        const outputs: TxBuilderOutput[] = [
            ...extraOutputs,
            {
                sats: totalSats,
                script: DUMMY_P2PKH,
            },
        ];

        try {
            // Build and sign a dummy transaction to calculate the fee
            const txBuilder = new TxBuilder({ inputs, outputs });
            const signedTx = txBuilder.sign({
                ecc: eccDummy,
                feePerKb,
                dustSats: DEFAULT_DUST_SATS,
            });

            // Calculate the transaction fee
            const txSize = signedTx.serSize();
            const txFee = calcTxFee(txSize, feePerKb);

            // Max sendable amount is total balance minus fee
            const maxSendSats = totalSats - txFee;

            // Return 0n if the result would be negative (insufficient funds)
            return maxSendSats > 0n ? maxSendSats : 0n;
        } catch {
            // If building the transaction fails (e.g., insufficient funds), return 0n
            return 0n;
        }
    }

    /**
     * Add received UTXOs from a transaction to the wallet's UTXO set and remove spent UTXOs.
     * This method is useful for updating the wallet state when receiving a transaction
     * without performing a full sync.
     *
     * Only outputs that belong to the wallet (match wallet addresses) are added.
     * Outputs with a "spentBy" key are ignored (already spent).
     * Outputs that are already in the UTXO set are ignored (no duplicates).
     *
     * Inputs are processed to remove any UTXOs that belong to the wallet and are being spent.
     * This ensures the wallet stays in sync when a transaction is sent from another instance
     * of the same wallet (e.g., desktop vs mobile).
     *
     * @param tx - The transaction object from chronik-client
     * @returns Balance deltas: sats delta and token deltas (tokenId -> atoms delta)
     */
    public addReceivedTx(tx: ChronikTx): {
        balanceSatsDelta: bigint;
        tokenDeltas: Map<string, bigint>;
    } {
        let balanceSatsDelta = 0n;
        const tokenDeltas = new Map<string, bigint>();

        // Process inputs: remove spent UTXOs from the wallet
        for (const input of tx.inputs) {
            const { prevOut } = input;
            const { txid, outIdx } = prevOut;

            // Find the UTXO being spent
            const utxoIndex = this.utxos.findIndex(
                utxo =>
                    utxo.outpoint.txid === txid &&
                    utxo.outpoint.outIdx === outIdx,
            );

            if (utxoIndex >= 0) {
                const spentUtxo = this.utxos[utxoIndex];

                // Remove the UTXO from the wallet's UTXO set
                this.utxos.splice(utxoIndex, 1);

                // Update balance delta: subtract sats if it's not a token UTXO
                if (typeof spentUtxo.token === 'undefined') {
                    balanceSatsDelta -= spentUtxo.sats;
                    this.balanceSats -= spentUtxo.sats;
                } else {
                    // Update token delta: subtract atoms for spent token UTXO
                    const tokenId = spentUtxo.token.tokenId;
                    const currentDelta = tokenDeltas.get(tokenId) ?? 0n;
                    // Only subtract if it's not a mint baton (mint batons don't have atoms)
                    if (!spentUtxo.token.isMintBaton) {
                        tokenDeltas.set(
                            tokenId,
                            currentDelta - spentUtxo.token.atoms,
                        );
                    }
                }
            }
        }

        // Process outputs: add received UTXOs to the wallet
        for (let i = 0; i < tx.outputs.length; i++) {
            const output = tx.outputs[i];

            // Skip outputs that have been spent (have spentBy key)
            if (typeof output.spentBy !== 'undefined') {
                continue;
            }

            // Skip OP_RETURN outputs (they start with 0x6a = "6a" in hex)
            if (output.outputScript.startsWith('6a')) {
                continue;
            }

            // Derive address from outputScript early
            let address: string;
            try {
                address = Address.fromScriptHex(output.outputScript).toString();
            } catch {
                // Skip unsupported output script types
                continue;
            }

            // Check if this address belongs to the wallet
            let belongsToWallet = false;
            if (this.isHD) {
                // For HD wallets, check if address is in keypairs
                belongsToWallet = this.keypairs.has(address);
            } else {
                // For non-HD wallets, check if it matches the single address
                belongsToWallet = address === this.address;
            }
            if (!belongsToWallet) {
                continue;
            }

            // Check if this UTXO already exists in the wallet's UTXO set
            const outpoint = {
                txid: tx.txid,
                outIdx: i,
            };
            const existingUtxo = this.utxos.find(
                utxo =>
                    utxo.outpoint.txid === outpoint.txid &&
                    utxo.outpoint.outIdx === outpoint.outIdx,
            );
            if (existingUtxo) {
                // UTXO already exists, skip
                continue;
            }

            // Create the WalletUtxo
            const walletUtxo: WalletUtxo = {
                outpoint,
                blockHeight: tx.block?.height ?? -1, // Use block height if available, otherwise mempool
                isCoinbase: tx.isCoinbase ?? false,
                sats: output.sats,
                isFinal: tx.isFinal ?? false,
                address,
            };

            // Add token information if present
            if (output.token) {
                walletUtxo.token = {
                    tokenId: output.token.tokenId,
                    tokenType: output.token.tokenType,
                    atoms: output.token.atoms,
                    isMintBaton: output.token.isMintBaton,
                };
            }

            // Add the UTXO to the wallet's UTXO set
            this.utxos.push(walletUtxo);

            // Update balance delta: add sats if this is NOT a token UTXO
            if (typeof walletUtxo.token === 'undefined') {
                balanceSatsDelta += walletUtxo.sats;
                this.balanceSats += walletUtxo.sats;
            } else {
                // Update token delta: add atoms for received token UTXO
                const tokenId = walletUtxo.token.tokenId;
                const currentDelta = tokenDeltas.get(tokenId) ?? 0n;
                // Only add if it's not a mint baton (mint batons don't have atoms)
                if (!walletUtxo.token.isMintBaton) {
                    tokenDeltas.set(
                        tokenId,
                        currentDelta + walletUtxo.token.atoms,
                    );
                }
            }
        }

        return { balanceSatsDelta, tokenDeltas };
    }

    /**
     * Update balanceSats based on current utxos
     * Called during sync() after utxos are updated
     *
     * Editorial decision: Users want to see sats from immature coinbase utxos
     * in their balance, even if these are not spendable
     */
    public updateBalance(): void {
        // Get all sats-only UTXOs (no tokens, includes immature coinbase)
        const balanceSatsOnlyUtxos = this.utxos.filter(
            utxo => typeof utxo.token === 'undefined',
        );
        this.balanceSats = Wallet.sumUtxosSats(balanceSatsOnlyUtxos);
    }

    /**
     * Return all spendable utxos
     */
    public spendableUtxos(): WalletUtxo[] {
        return this.utxos
            .filter(utxo => utxo.isCoinbase === false)
            .concat(this._spendableCoinbaseUtxos());
    }

    /**
     * Return all spendable coinbase utxos
     * i.e. coinbase utxos with COINBASE_MATURITY confirmations
     */
    private _spendableCoinbaseUtxos(): WalletUtxo[] {
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
     * Get the private key for a UTXO
     * Unified method that works for both HD and non-HD wallets
     *
     * @param utxo - The UTXO to get the private key for
     * @returns The private key, or undefined if not found (should not happen for valid wallet UTXOs)
     */
    public getPrivateKeyForUtxo(utxo: WalletUtxo): Uint8Array | undefined {
        const keypair = this.getKeypairForAddress(utxo.address);
        return keypair?.sk;
    }

    /**
     * Get the public key for a UTXO
     * Unified method that works for both HD and non-HD wallets
     *
     * @param utxo - The UTXO to get the public key for
     * @returns The public key, or undefined if not found
     */
    public getPublicKeyForUtxo(utxo: WalletUtxo): Uint8Array | undefined {
        const keypair = this.getKeypairForAddress(utxo.address);
        return keypair?.pk;
    }

    /**
     * Get the output script for a UTXO
     * Unified method that works for both HD and non-HD wallets
     *
     * @param utxo - The UTXO to get the script for
     * @returns The output script, or undefined if not found
     */
    public getScriptForUtxo(utxo: WalletUtxo): Script | undefined {
        const keypair = this.getKeypairForAddress(utxo.address);
        return keypair?.script;
    }

    /**
     * Check if a script belongs to this wallet
     * For non-HD wallets, checks against the single address script
     * For HD wallets, checks against all addresses in keypairs map
     *
     * @param script - The script to check
     * @returns True if the script belongs to this wallet
     */
    public isWalletScript(script: Script): boolean {
        const scriptHex = script.toHex();
        for (const keypair of this.keypairs.values()) {
            if (keypair.script.toHex() === scriptHex) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get the change script for this wallet
     * Unified method that works for both HD and non-HD wallets
     * For HD wallets, generates and returns the next change address
     *
     * @returns The script for the change address
     */
    public getChangeScript(): Script {
        if (!this.isHD) {
            // Non-HD wallet: use the single address script
            return this.script;
        }

        // HD wallet: get next change address and convert to script
        const changeAddress = this.getNextChangeAddress();
        const keypair = this.getKeypairForAddress(changeAddress);
        if (!keypair) {
            throw new Error(
                'Change address keypair not found after generation',
            );
        }
        return keypair.script;
    }

    /**
     * Convert a WalletUtxo into a TxBuilderInput
     * Unified method that works for both HD and non-HD wallets
     */
    public p2pkhUtxoToBuilderInput(
        utxo: WalletUtxo,
        sighash = ALL_BIP143,
    ): TxBuilderInput {
        const keypair = this.getKeypairForAddress(utxo.address);
        if (!keypair) {
            throw new Error(
                `Could not get keypair data for UTXO at address ${utxo.address}`,
            );
        }

        // Sign and prep utxos for ecash-lib inputs
        return {
            input: {
                prevOut: {
                    txid: utxo.outpoint.txid,
                    outIdx: utxo.outpoint.outIdx,
                },
                signData: {
                    sats: utxo.sats,
                    outputScript: keypair.script,
                },
            },
            signatory: P2PKHSignatory(keypair.sk, keypair.pk, sighash),
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
     *
     * @param mnemonic - The mnemonic phrase
     * @param chronik - Initialized ChronikClient instance
     * @param options - Optional configuration
     * @param options.hd - If true, creates an HD wallet with multiple addresses. Defaults to false for backward compatibility.
     * @param options.accountNumber - Account number for HD wallets (BIP44 account index). Defaults to 0.
     * @param options.receiveIndex - Initial receive address index (only used for HD wallets). Defaults to 0.
     * @param options.changeIndex - Initial change address index (only used for HD wallets). Defaults to 0.
     */
    static fromMnemonic(
        mnemonic: string,
        chronik: ChronikClient,
        options?: {
            hd?: boolean;
            accountNumber?: number;
            receiveIndex?: number;
            changeIndex?: number;
        },
    ) {
        const seed = mnemonicToSeed(mnemonic);
        const master = HdNode.fromSeed(seed);

        if (options?.hd === true) {
            // HD wallet: derive base path and store the base node
            const accountNumber = options.accountNumber ?? 0;
            const basePath = `m/44'/1899'/${accountNumber}'`;
            const baseHdNode = master.derivePath(basePath);
            const wallet = new Wallet(
                baseHdNode.seckey()!,
                chronik,
                baseHdNode,
                accountNumber,
            );

            // Set initial indices (default to 0 if not provided)
            wallet.receiveIndex = options.receiveIndex ?? 0;
            wallet.changeIndex = options.changeIndex ?? 0;

            return wallet;
        }

        // Single-address wallet: derive full path to first address
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
        // Create a new wallet instance with the same secret key, chronik client, baseHdNode, and accountNumber
        const clonedWallet = new Wallet(
            this.sk,
            this.chronik,
            this.baseHdNode,
            this.accountNumber,
        );

        // Copy the mutable state
        clonedWallet.tipHeight = this.tipHeight;
        clonedWallet.utxos = [...this.utxos]; // Shallow copy of the array
        clonedWallet.balanceSats = this.balanceSats;
        // Deep copy the keypairs map
        clonedWallet.keypairs = new Map(this.keypairs);

        // Copy HD wallet state if applicable
        if (this.isHD) {
            clonedWallet.receiveIndex = this.receiveIndex;
            clonedWallet.changeIndex = this.changeIndex;
        }

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
 * Preprocess action to infer SEND actions for ALP-only-burn cases.
 * For ALP burns without SEND actions, if exact atoms are not available but sufficient
 * total atoms exist, automatically add a SEND action to allow change handling.
 *
 * @param action - The payment action to preprocess
 * @param spendableUtxos - Available UTXOs to check against
 * @returns A new action with inferred SEND actions added if needed
 */
function inferAlpBurnSendActions(
    action: payment.Action,
    spendableUtxos: WalletUtxo[],
): payment.Action {
    const tokenActions = action.tokenActions ?? [];
    if (tokenActions.length === 0) {
        return action;
    }

    // Find token IDs that have SEND actions
    const sendActionTokenIds = new Set(
        tokenActions
            .filter((ta): ta is payment.SendAction => ta.type === 'SEND')
            .map(ta => ta.tokenId),
    );

    // Find ALP BURN actions without corresponding SEND actions
    const alpBurnActions = tokenActions.filter(
        (ta): ta is payment.BurnAction =>
            ta.type === 'BURN' &&
            ta.tokenType.protocol === 'ALP' &&
            !sendActionTokenIds.has(ta.tokenId),
    );

    if (alpBurnActions.length === 0) {
        return action;
    }

    // Clone action to avoid mutating the original
    const modifiedAction: payment.Action = {
        ...action,
        tokenActions: [...tokenActions],
    };

    // For each ALP-only-burn, check if we need to add SEND
    for (const burnAction of alpBurnActions) {
        try {
            const { hasExact } = getTokenUtxosWithExactAtoms(
                spendableUtxos,
                burnAction.tokenId,
                burnAction.burnAtoms,
            );

            if (!hasExact) {
                // Don't have exact atoms, add SEND action to allow change
                modifiedAction.tokenActions!.push({
                    type: 'SEND',
                    tokenId: burnAction.tokenId,
                    tokenType: burnAction.tokenType,
                });
            }
        } catch (error) {
            // If error is about not finding exact atoms (not insufficient atoms), add SEND
            if (error instanceof ExactAtomsNotFoundError) {
                modifiedAction.tokenActions!.push({
                    type: 'SEND',
                    tokenId: burnAction.tokenId,
                    tokenType: burnAction.tokenType,
                });
            } else {
                // Re-throw other errors (e.g., insufficient atoms, invalid input, no UTXOs)
                throw error;
            }
        }
    }

    return modifiedAction;
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
        // Preprocess action: infer SEND actions for ALP-only-burn cases
        const preprocessedAction = inferAlpBurnSendActions(
            action,
            wallet.spendableUtxos(),
        );

        const selectUtxosResult = selectUtxos(
            preprocessedAction,
            wallet.spendableUtxos(),
            satsStrategy,
        );

        // NB actionTotal is an intermediate value calculated in selectUtxos
        // Since it is dependent on action and spendable utxos, we do not want it
        // to be a standalone param for selectUtxos
        // We need it here to get sat totals for tx building
        const actionTotal = getActionTotals(preprocessedAction);
        // Create a new WalletAction with the same wallet and preprocessed action
        return new WalletAction(
            wallet,
            preprocessedAction,
            selectUtxosResult,
            actionTotal,
        );
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
            case ChainedTxType.TOKEN_SEND_EXCEEDS_MAX_OUTPUTS:
                return this._buildTokenSendChained(sighash);
            default:
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
            // We do not pass noChange here; all chained txs ignore dev-specified noChange
        };

        const sendTx = this._wallet.action(sendAction).build(sighash);

        chainedTxs.push(sendTx.txs[0]);

        // 2. The user's original BURN action is simply this.action
        const burnTx = this._wallet
            .action(this.action)
            .build(sighash) as BuiltAction;

        chainedTxs.push(burnTx.txs[0]);

        return new BuiltAction(this._wallet, chainedTxs, feePerKb, this);
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
            // We do not pass noChange here; all chained txs ignore dev-specified noChange
        };

        // Create the NFT mint input
        const sendTx = this._wallet.action(sendAction).build(sighash);

        chainedTxs.push(sendTx.txs[0]);

        // 2. The user's original GENESIS action to mint the NFT
        const nftMintTx = this._wallet
            .action(this.action)
            .build(sighash) as BuiltAction;

        chainedTxs.push(nftMintTx.txs[0]);

        return new BuiltAction(this._wallet, chainedTxs, feePerKb, this);
    }

    /**
     * Build a chained token send tx to handle sending token atoms to
     * more outputs than could be handled by a single tx
     *
     * - Use a combined token change / XEC change output for chainedTxAlpha and chainedTx
     * - Calculate total sats required for the entire action, including dust sats and fees for every tx in the chain,
     *   by building the txs in reverse order (chainedTxOmega ... chainedTxAlpha)
     * - Build the actual txs in order of broadcast, as we need to know the txid of the previous tx to update the input of the next tx
     */
    private _buildTokenSendChained(sighash = ALL_BIP143): BuiltAction {
        const { tokenActions } = this.action;
        const sendActions = tokenActions?.filter(
            action => action.type === 'SEND',
        ) as payment.SendAction[] | undefined;

        if (!sendActions || sendActions.length === 0) {
            throw new Error(
                'No SEND action found in _buildTokenSendChained for token send chained tx',
            );
        }

        // For now, we only support chained txs for a single tokenId
        if (sendActions.length > 1) {
            throw new Error(
                'Chained token sends are only supported for a single tokenId',
            );
        }

        // Check for DATA actions - not supported in chained token send transactions
        const dataActions = tokenActions?.filter(
            action => action.type === 'DATA',
        ) as payment.DataAction[] | undefined;
        if (dataActions && dataActions.length > 0) {
            throw new Error(
                'Data actions are not supported in chained token send transactions.',
            );
        }

        const sendAction = sendActions[0];
        const { tokenId, tokenType } = sendAction;

        const dustSats = this.action.dustSats || DEFAULT_DUST_SATS;
        const feePerKb = this.action.feePerKb || DEFAULT_FEE_SATS_PER_KB;

        // Get token send outputs for this tokenId
        const tokenSendOutputs = this.action.outputs.filter(
            output =>
                'tokenId' in output &&
                output.tokenId === tokenId &&
                typeof (output as payment.PaymentTokenOutput).atoms !==
                    'undefined',
        ) as payment.PaymentTokenOutput[];

        // Determine max outputs based on token protocol
        const maxOutputsPerTx =
            tokenType.protocol === 'SLP'
                ? SLP_MAX_SEND_OUTPUTS
                : ALP_POLICY_MAX_OUTPUTS;

        // Get required utxos for this tokenId
        const requiredUtxos = this.selectUtxosResult.utxos || [];
        const tokenUtxos = requiredUtxos.filter(
            utxo =>
                'token' in utxo &&
                utxo.token?.tokenId === tokenId &&
                !utxo.token?.isMintBaton,
        );

        // Calculate total input atoms
        const totalInputAtoms = tokenUtxos.reduce(
            (sum, utxo) => sum + (utxo.token?.atoms || 0n),
            0n,
        );

        // Calculate total output atoms (excluding potential change)
        const totalOutputAtoms = tokenSendOutputs.reduce(
            (sum, output) => sum + (output.atoms || 0n),
            0n,
        );

        // Determine if we have token change
        const tokenChange = totalInputAtoms - totalOutputAtoms;
        const hasTokenChange = tokenChange > 0n;

        // If we have token change, add it to tokenSendOutputs BEFORE batching
        // This way it gets batched along with the other outputs and the optimization works correctly
        if (hasTokenChange) {
            tokenSendOutputs.push({
                isMintBaton: false,
                sats: dustSats,
                script: this._wallet.getChangeScript(),
                tokenId,
                atoms: tokenChange,
            });
        }

        // Batch the outputs (now including change if any)
        const batchedOutputs = batchTokenSendOutputs(
            tokenSendOutputs,
            maxOutputsPerTx,
        );

        if (batchedOutputs.length === 0) {
            throw new Error('No token send outputs to batch');
        }

        // Build preliminary txs from back to front (TxOmega to TxAlpha)
        const preliminaryTxs: {
            inputs: TxBuilderInput[];
            outputs: TxBuilderOutput[];
        }[] = [];

        // Initialize required atoms and satoshis for subsequent txs
        let requiredAtomsInSubsequentTxs = 0n;
        let requiredSatoshisToCoverFeesAndOutputsOfAllSubsequentTxs = 0n;

        // Iterate backwards over batches
        for (let i = batchedOutputs.length - 1; i >= 0; i -= 1) {
            const batch = batchedOutputs[i];

            // Build send amounts array for this batch
            const sendAmountsThisBatch = batch.map(
                output => output.atoms || 0n,
            );

            // If we need atoms for subsequent txs, add them to sendAmounts
            if (requiredAtomsInSubsequentTxs !== 0n) {
                sendAmountsThisBatch.push(requiredAtomsInSubsequentTxs);
            }

            // Build OP_RETURN script for this tx
            let opReturnScript: Script;
            if (tokenType.protocol === 'ALP') {
                opReturnScript = emppScript([
                    alpSend(tokenId, tokenType.number, sendAmountsThisBatch),
                ]);
            } else {
                opReturnScript = slpSend(
                    tokenId,
                    tokenType.number,
                    sendAmountsThisBatch,
                );
            }

            // Build outputs for this tx
            const outputsThisBatch: TxBuilderOutput[] = [
                { sats: 0n, script: opReturnScript },
            ];

            // Add token recipient outputs
            // For the last batch, if we have change, it's already included in the batch
            // For other batches, we add all outputs normally
            for (const output of batch) {
                if (!output.script) {
                    // Not expected to ever happen
                    // Type-safe for output.script below
                    throw new Error(
                        'Token send output must have a script defined',
                    );
                }
                outputsThisBatch.push({
                    sats: dustSats,
                    script: output.script,
                });
            }

            // Calculate satoshis needed for dust token outputs
            const satoshisToCoverDustTokenOutputs = outputsThisBatch.reduce(
                (sum, output) => {
                    // TxBuilderOutput can be TxOutput | Script
                    // Script doesn't have sats, so check if it's a TxOutput
                    if ('sats' in output) {
                        return sum + output.sats;
                    }
                    return sum;
                },
                0n,
            );

            // If this is not the last tx, add change output for next tx
            if (requiredAtomsInSubsequentTxs !== 0n) {
                outputsThisBatch.push({
                    sats: requiredSatoshisToCoverFeesAndOutputsOfAllSubsequentTxs,
                    script: this._wallet.getChangeScript(),
                });
            }

            if (i === 0) {
                // This is TxAlpha (first tx)
                // Add XEC change output (using dummy script for fee estimation)
                outputsThisBatch.push(DUMMY_P2PKH);

                // Build inputs from selected utxos (using dummy signatory for fee estimation)
                const inputs = tokenUtxos.map(utxo => {
                    const input = this._wallet.p2pkhUtxoToBuilderInput(
                        utxo,
                        sighash,
                    );
                    // Replace signatory with dummy for fee estimation
                    return {
                        ...input,
                        signatory: P2PKHSignatory(DUMMY_SK, DUMMY_PK, sighash),
                    };
                });

                // Add fuel inputs by trying to sign with dummy ECC and adding UTXOs if signing fails
                const fueledInputs = inputs;

                // Try to sign with dummy ECC for fee estimation
                let signedSuccessfully = false;
                let signedTx: Tx | undefined;
                try {
                    const testTxBuilder = new TxBuilder({
                        inputs: fueledInputs,
                        outputs: outputsThisBatch,
                    });
                    signedTx = testTxBuilder.sign({
                        ecc: eccDummy,
                        feePerKb,
                        dustSats,
                    });
                    signedSuccessfully = true;
                } catch {
                    // Signing failed, we need fuel inputs
                    signedSuccessfully = false;
                }

                // If signing failed, add fuel UTXOs one by one until signing succeeds
                if (!signedSuccessfully) {
                    // Filter out UTXOs that are already in inputs (to avoid double-spending)
                    // Note: spendableSatsOnlyUtxos() already excludes token UTXOs
                    const fuelUtxos = this._wallet
                        .spendableSatsOnlyUtxos()
                        .filter(
                            fuelUtxo =>
                                // Don't use UTXOs already in inputs
                                !fueledInputs.some(
                                    input =>
                                        input.input.prevOut.txid ===
                                            fuelUtxo.outpoint.txid &&
                                        input.input.prevOut.outIdx ===
                                            fuelUtxo.outpoint.outIdx,
                                ),
                        );

                    for (const fuelUtxo of fuelUtxos) {
                        const fuelInput = this._wallet.p2pkhUtxoToBuilderInput(
                            fuelUtxo,
                            sighash,
                        );
                        // Use dummy signatory for fee estimation
                        fueledInputs.push({
                            ...fuelInput,
                            signatory: P2PKHSignatory(
                                DUMMY_SK,
                                DUMMY_PK,
                                sighash,
                            ),
                        });

                        // Try to sign again with dummy ECC
                        try {
                            const testTxBuilder = new TxBuilder({
                                inputs: fueledInputs,
                                outputs: outputsThisBatch,
                            });
                            signedTx = testTxBuilder.sign({
                                ecc: eccDummy,
                                feePerKb,
                                dustSats,
                            });
                            signedSuccessfully = true;
                            break;
                        } catch {
                            // Still not enough, continue to next fuel UTXO
                            continue;
                        }
                    }
                }

                // If we still couldn't sign after adding all available fuel UTXOs, throw an error
                if (!signedSuccessfully || !signedTx) {
                    const inputSats = fueledInputs.reduce(
                        (sum, input) =>
                            sum + (input.input.signData?.sats || 0n),
                        0n,
                    );

                    throw new Error(
                        `Insufficient sats to complete chained token send. Have ${inputSats} sats, insufficient to cover chained tx required sats (${requiredSatoshisToCoverFeesAndOutputsOfAllSubsequentTxs}) + fee (variable with inputs).`,
                    );
                }

                // If we successfully signed with dummy ECC, we can afford the whole chain
                // because the first tx includes a chained output with sufficient sats
                // (requiredSatoshisToCoverFeesAndOutputsOfAllSubsequentTxs) to cover all subsequent transactions
                // Note: We'll do real signing when we build forward (below)

                preliminaryTxs.unshift({
                    inputs: fueledInputs,
                    outputs: outputsThisBatch,
                });
            } else {
                // This is a TxChained (not first, not last) or TxOmega (last)
                // The chained output from the previous tx (in forward order) goes to a change address
                // Since we're building from back to front, we don't know yet what change script the previous
                // transaction will use. For fee calculation purposes, we use a dummy p2pkh script (same size
                // as the actual change script, so same fee impact). The actual signatory and outputScript
                // will be updated when we build and sign the transactions from front to back, based on the
                // actual change output from the previous transaction.
                //
                // We avoid calling getChangeScript() here to prevent generating unused change addresses.
                const inputThisTx: TxBuilderInput = {
                    input: {
                        prevOut: {
                            txid: DUMMY_PRELIMINARY_TXID,
                            outIdx: maxOutputsPerTx,
                        },
                        signData: {
                            sats: dustSats, // Will be updated after fee calculation
                            outputScript: DUMMY_P2PKH, // Dummy p2pkh script for fee calculation
                        },
                    },
                    signatory: P2PKHSignatory(DUMMY_SK, DUMMY_PK, sighash),
                };

                // Calculate fee for this tx using a dummy tx builder
                const dummyTxBuilder = new TxBuilder({
                    inputs: [inputThisTx],
                    outputs: outputsThisBatch,
                });
                const dummyTxSigned = dummyTxBuilder.sign({
                    ecc: eccDummy,
                    feePerKb,
                    dustSats,
                });
                const feeThisTx = calcTxFee(dummyTxSigned.serSize(), feePerKb);

                // Calculate required input value
                const requiredInputValue =
                    feeThisTx +
                    satoshisToCoverDustTokenOutputs +
                    requiredSatoshisToCoverFeesAndOutputsOfAllSubsequentTxs;

                // Update input value
                inputThisTx.input.signData!.sats = requiredInputValue;

                // Update required satoshis for next tx up the chain
                requiredSatoshisToCoverFeesAndOutputsOfAllSubsequentTxs +=
                    feeThisTx + satoshisToCoverDustTokenOutputs;

                // Update required atoms for next tx up the chain
                const batchAtoms = batch.reduce(
                    (sum, output) => sum + (output.atoms || 0n),
                    0n,
                );
                requiredAtomsInSubsequentTxs += batchAtoms;

                preliminaryTxs.unshift({
                    inputs: [inputThisTx],
                    outputs: outputsThisBatch,
                });
            }
        }

        // Now build and sign all txs in order
        const chainedTxs: Tx[] = [];
        const paymentOutputsHistory: payment.PaymentOutput[][] = [];
        let prevOutTxid = '';

        for (let i = 0; i < preliminaryTxs.length; i += 1) {
            // For the first tx (TxAlpha), replace dummy signatories with real ones
            if (i === 0) {
                const txAlphaInputs = preliminaryTxs[i].inputs.map(input => {
                    // Find the original UTXO to get the real keypair
                    const utxo = tokenUtxos.find(
                        utxo =>
                            utxo.outpoint.txid === input.input.prevOut.txid &&
                            utxo.outpoint.outIdx === input.input.prevOut.outIdx,
                    );
                    if (utxo) {
                        // This is a token UTXO, use real signatory
                        return this._wallet.p2pkhUtxoToBuilderInput(
                            utxo,
                            sighash,
                        );
                    }
                    // This is a fuel UTXO, find it and use real signatory
                    const fuelUtxo = this._wallet
                        .spendableSatsOnlyUtxos()
                        .find(
                            fuelUtxo =>
                                fuelUtxo.outpoint.txid ===
                                    input.input.prevOut.txid &&
                                fuelUtxo.outpoint.outIdx ===
                                    input.input.prevOut.outIdx,
                        );
                    if (fuelUtxo) {
                        return this._wallet.p2pkhUtxoToBuilderInput(
                            fuelUtxo,
                            sighash,
                        );
                    }
                    // Fallback (shouldn't happen)
                    return input;
                });
                // Also replace dummy change script with real one
                const txAlphaOutputs = preliminaryTxs[i].outputs.map(
                    (output, idx) => {
                        // Last output is the XEC change output
                        if (
                            idx === preliminaryTxs[i].outputs.length - 1 &&
                            output instanceof Script &&
                            output.toHex() === DUMMY_P2PKH.toHex()
                        ) {
                            return this._wallet.getChangeScript();
                        }
                        return output;
                    },
                );
                preliminaryTxs[i] = {
                    inputs: txAlphaInputs,
                    outputs: txAlphaOutputs,
                };
            }

            // Update prevOut txid for chained txs (not the first)
            if (i !== 0 && prevOutTxid !== '') {
                // For subsequent transactions, find the LAST TOKEN OUTPUT from the previous transaction
                // Iterate backwards through paymentOutputs to find the last one with a tokenId
                const prevPaymentOutputs = paymentOutputsHistory[i - 1];
                let lastTokenOutputIndex = -1;
                for (let j = prevPaymentOutputs.length - 1; j >= 0; j--) {
                    const output = prevPaymentOutputs[j];
                    if ('tokenId' in output && output.tokenId === tokenId) {
                        lastTokenOutputIndex = j;
                        break;
                    }
                }

                if (lastTokenOutputIndex === -1) {
                    throw new Error(
                        `Could not find last token output in previous transaction ${i - 1} paymentOutputs`,
                    );
                }

                // The outIdx in the transaction is the index in paymentOutputs (since OP_RETURN at 0 is included)
                const chainedOutputIndex = lastTokenOutputIndex;
                const prevSignedTx = chainedTxs[i - 1];
                const chainedOutput = prevSignedTx.outputs[chainedOutputIndex];

                // Get the keypair for the chained output address
                const chainedOutputAddress = Address.fromScriptHex(
                    chainedOutput.script.toHex(),
                ).toString();
                const keypair =
                    this._wallet.getKeypairForAddress(chainedOutputAddress);
                if (!keypair) {
                    throw new Error(
                        `Could not get keypair for chained output address ${chainedOutputAddress}`,
                    );
                }

                const chainedInput: TxBuilderInput = {
                    input: {
                        prevOut: {
                            txid: prevOutTxid,
                            outIdx: chainedOutputIndex,
                        },
                        signData: {
                            sats: chainedOutput.sats,
                            outputScript: chainedOutput.script,
                        },
                    },
                    signatory: P2PKHSignatory(keypair.sk, keypair.pk, sighash),
                };

                // Replace the dummy input with the actual chained output input
                preliminaryTxs[i].inputs[0] = chainedInput;
            }

            // Build and sign this tx
            const txBuilder = new TxBuilder(preliminaryTxs[i]);
            const signedTx = txBuilder.sign({
                ecc: this._wallet.ecc,
                feePerKb,
                dustSats,
            });

            // Get txid for this tx
            const txid = toHexRev(sha256d(signedTx.ser()));

            // Update UTXOs after building this transaction (similar to _getBuiltAction)
            // Construct paymentOutputs for this transaction
            const batchIndex = i;
            const batch = batchedOutputs[batchIndex];
            const paymentOutputs: payment.PaymentOutput[] = [];

            // Add OP_RETURN output (sats: 0n)
            paymentOutputs.push({ sats: 0n });

            // Add token outputs from the batch
            for (const output of batch) {
                paymentOutputs.push({
                    sats: dustSats,
                    script: output.script,
                    tokenId: output.tokenId,
                    atoms: output.atoms,
                    isMintBaton: output.isMintBaton,
                });
            }

            // If this is not the last tx, add the change output for next tx
            if (i < preliminaryTxs.length - 1) {
                // Find the chained output: the last output with a wallet script
                // This is always the last token output
                let changeOutput: (typeof signedTx.outputs)[0] | undefined;
                for (let j = signedTx.outputs.length - 1; j >= 0; j--) {
                    const output = signedTx.outputs[j];
                    if (this._wallet.isWalletScript(output.script)) {
                        changeOutput = output;
                        break;
                    }
                }

                if (changeOutput) {
                    // Calculate atoms for the change output
                    // This is the sum of atoms in all subsequent batches
                    let changeAtoms = 0n;
                    for (let j = i + 1; j < batchedOutputs.length; j++) {
                        const subsequentBatch = batchedOutputs[j];
                        for (const output of subsequentBatch) {
                            changeAtoms += output.atoms || 0n;
                        }
                    }

                    paymentOutputs.push({
                        sats: changeOutput.sats,
                        script: changeOutput.script,
                        tokenId,
                        atoms: changeAtoms,
                        isMintBaton: false,
                    });
                }
            }

            // Update UTXOs for this transaction
            this._updateUtxosAfterSuccessfulBuild(
                signedTx,
                txid,
                paymentOutputs,
            );

            // Store paymentOutputs for this transaction so we can find the last token output
            paymentOutputsHistory.push(paymentOutputs);

            // Set prevOutTxid for next iteration
            prevOutTxid = txid;

            chainedTxs.push(signedTx);
        }

        return new BuiltAction(this._wallet, chainedTxs, feePerKb, this);
    }

    private _buildSizeLimitExceededChained(
        oversizedBuiltAction: BuiltAction,
        sighash = ALL_BIP143,
    ): BuiltAction {
        /**
         * Build a chained tx to satisfy an Action while remaining
         * under maxTxSersize for each tx in the chain
         *
         * Approach (see chained.md for an extended discussion)
         *
         * - The first tx in the chain will use all necessary utxos. It will determine
         *   the max outputs it can have while remaining under maxTxSersize
         * - The first tx in the chain must include a change output that will cover
         *   everything else in the chain
         *
         * To support problem understanding and code organization, we introduce
         * the following terms:
         *
         * 1. chainTxAlpha, the first tx in a chained tx
         *
         * Unique properties of chainTxAlpha:
         * - chainTxAlpha is expected to have all the inputs needed for all the txs in the chain
         * - chainTxAlpha must determine a change output that will cover required sats for
         *   every other tx in the chain
         * - chainTxAlpha may or may not have a change output that is the actual change, i.e.
         *   leftover from the inputs not required to complete the rest of the txs; but it
         *   will always be able to cover the fees and sats of the whole chain if this output exists
         *
         * 2. chainTx, the second thru "n-1" tx(s) in a chained tx
         *
         * Unique properties of chainTx:
         * - May or may not exist; i.e. if we only need 2 txs, we have only chainTxAlpha and chainTxOmega
         * - Exactly one input from the previous tx in the chain
         * - Change output that will cover required sats for all following txs in the chain
         *
         * 3. chainTxOmega, the last tx in a chained tx
         *
         * Unique properties of chainTxOmega:
         * - Like chainTx, exactly one input
         * - No change output, we exactly consume our inputs to fulfill the specified Action
         *
         * ASSUMPTIONS
         * - All inputs are p2pkh
         * - All outputs are p2pkh
         */

        const feePerKb = this.action.feePerKb || DEFAULT_FEE_SATS_PER_KB;
        const maxTxSersize = this.action.maxTxSersize || MAX_TX_SERSIZE;

        // Throw if we have a token tx that is (somehow) breaking size limits
        // Only expected in edge case as pure token send txs are restricted by OP_RETURN limits
        // long before they hit maxTxSersize
        if (this.action.tokenActions && this.action.tokenActions.length > 0) {
            throw new Error(
                `This token tx exceeds maxTxSersize ${maxTxSersize} and cannot be split into a chained tx. Try breaking it into smaller txs, e.g. by handling the token outputs in their own txs.`,
            );
        }

        // Get inputs needed for the chained tx
        const chainedTxInputsAndFees = this._getInputsAndFeesForChainedTx(
            oversizedBuiltAction.builtTxs[0],
        );

        // These inputs will determine the shape of the rest of the chain

        // Get number of inputs
        const chainTxAlphaInputCount = chainedTxInputsAndFees.inputs.length;

        // Determine number of outputs based on max p2pkh and OP_RETURN, if any
        const indexZeroOutput = this.action.outputs[0];
        const hasOpReturn =
            indexZeroOutput &&
            'script' in indexZeroOutput &&
            typeof indexZeroOutput.script !== 'undefined' &&
            indexZeroOutput.script.bytecode[0] === OP_RETURN;
        const opReturnSize = hasOpReturn
            ? indexZeroOutput.script!.bytecode.length
            : 0;

        const maxP2pkhOutputsInChainTxAlpha = getMaxP2pkhOutputs(
            chainTxAlphaInputCount,
            opReturnSize,
            maxTxSersize,
        );

        // We know the total fees, and we know the outputs we need to cover, so we can determine
        // - Total sats we need for fees
        // - Total sats we need for outputs
        // - The size of the next-chain-input output in chainTx Alpha
        // - The size of the user change output, if any, in chainTxAlpha

        // Total sats we need for fees
        const chainedTxFeeArray = chainedTxInputsAndFees.fees;
        const totalSatsNeededForFeesForAllChainedTxs =
            chainedTxInputsAndFees.fees.reduce((a, b) => a + b, 0n);

        // Total sats we need for the outputs
        const totalSatsNeededForOutputsForAllChainedTxs =
            this.action.outputs.reduce((a, b) => a + (b.sats || 0n), 0n);

        // To size the required sats for the next-chain-input output in chainTxAlpha, we remove chainTxAlpha fees and chainTxAlpha output sats
        const chainTxAlphaActionOutputCount =
            maxP2pkhOutputsInChainTxAlpha - CHAINED_TX_ALPHA_RESERVED_OUTPUTS;
        const chainedTxAlphaCoveredOutputs = this.action.outputs.slice(
            0,
            chainTxAlphaActionOutputCount,
        );
        const chainedTxAlphaCoveredOutputsSats =
            chainedTxAlphaCoveredOutputs.reduce(
                (a, b) => a + (b.sats || 0n),
                0n,
            );
        const chainedTxAlphaFeeSats = chainedTxInputsAndFees.fees[0];

        // To size the sats we need for the next input, start with current input sats and remove everything you cover in chainedTxAlpha
        let nextTxInputSats =
            totalSatsNeededForOutputsForAllChainedTxs -
            chainedTxAlphaCoveredOutputsSats +
            totalSatsNeededForFeesForAllChainedTxs -
            chainedTxAlphaFeeSats;

        // Determine if we need a user change output
        const chainedTxAlphaInputSats = chainedTxInputsAndFees.inputs.reduce(
            (a, b) => a + b.input.signData!.sats,
            0n,
        );
        const userChange =
            chainedTxAlphaInputSats -
            chainedTxAlphaCoveredOutputsSats -
            nextTxInputSats -
            chainedTxAlphaFeeSats;

        const needsUserChange = userChange >= DEFAULT_DUST_SATS;

        // Build chainedTxAlpha
        const chainedTxAlphaOutputs = this.action.outputs.slice(
            0,
            chainTxAlphaActionOutputCount,
        );

        // Add user change, if necessary
        // NB if we do not need change, we could technically fit another action output in chainedTxAlpha.
        // To simplify the design, we do not handle that complication.
        if (needsUserChange) {
            // NB if we do not need user change, we could technically fit another output here, but we won't bc we've
            // already got our calcs sorted for this
            const userChangeOutput = {
                sats: userChange,
                script: this._wallet.script,
            };
            chainedTxAlphaOutputs.push(userChangeOutput);
        }

        // Add the input for the next tx in the chain
        const chainTxNextInput = {
            sats: nextTxInputSats,
            script: this._wallet.script,
        };
        chainedTxAlphaOutputs.push(chainTxNextInput);

        const chainedTxAlphaAction = {
            // We need to specify utxos here as we determined them manually from our chain build method
            // If we do not specify, then build() could select enough utxos for one tx (that is too big to broadcast), instead of
            // enough utxos to cover the entire chain
            requiredUtxos: chainedTxInputsAndFees.inputs.map(
                input => input.input.prevOut,
            ),
            outputs: chainedTxAlphaOutputs,
            // We are manually specifying change so we do not allow ecash-wallet to "help" us figure it out
            noChange: true,
        };

        const chainedTxAlpha = this._wallet
            .action(chainedTxAlphaAction)
            .build(sighash);

        // Remove the first fee, which is the fee for chainTxAlpha, since this is already covered
        chainedTxFeeArray.splice(0, 1);

        // Input utxo for next tx is the last output in chainTxAlpha
        const nextTxUtxoOutIdx = chainedTxAlphaAction.outputs.length - 1;

        let nextTxUtxoOutpoint = {
            txid: chainedTxAlpha.txs[0].txid(),
            outIdx: nextTxUtxoOutIdx,
        };

        // Build the first tx in the chain, "chainTxAlpha"
        const chainedTxs: Tx[] = [chainedTxAlpha.txs[0]];

        // Iterate through remaining outputs and build the other txs in the chain
        const remainingOutputs = this.action.outputs.slice(
            chainedTxAlpha.txs[0].outputs.length -
                CHAINED_TX_ALPHA_RESERVED_OUTPUTS,
        );

        // Use a while loop to build the rest of the chain
        // Each run through the loop will build either chainedTx or chainedTxOmega
        while (true) {
            // Either chainedTx or chainedTxOmega

            const chainedTxMaxOutputs = getMaxP2pkhOutputs(
                NTH_TX_IN_CHAIN_INPUTS,
                0,
                maxTxSersize,
            );

            if (chainedTxMaxOutputs >= remainingOutputs.length) {
                // chainedTxOmega
                const chainedTxOmegaAction = {
                    outputs: remainingOutputs,
                    requiredUtxos: [nextTxUtxoOutpoint],
                    noChange: true,
                };
                const chainedTxOmega = this._wallet
                    .action(chainedTxOmegaAction)
                    .build(sighash);
                chainedTxs.push(chainedTxOmega.txs[0]);
                // Get out of the while loop, we have finished populating chainedTxs
                break;
            } else {
                // We remove the outputs we are using from remainingOutputs
                const outputsInThisTx = remainingOutputs.splice(
                    0,
                    chainedTxMaxOutputs - 1,
                );

                const feeThisTx = chainedTxFeeArray.splice(0, 1);

                const coveredOutputSatsThisTx = outputsInThisTx.reduce(
                    (a, b) => a + b.sats!,
                    0n,
                );

                nextTxInputSats -= coveredOutputSatsThisTx;
                nextTxInputSats -= feeThisTx[0];
                const chainedTxNextInputAsOutput = {
                    sats: nextTxInputSats,
                    script: this._wallet.script,
                };

                const chainedTxAction = {
                    outputs: [...outputsInThisTx, chainedTxNextInputAsOutput],
                    requiredUtxos: [nextTxUtxoOutpoint],
                    noChange: true,
                };
                const chainedTx = this._wallet
                    .action(chainedTxAction)
                    .build(sighash);
                chainedTxs.push(chainedTx.txs[0]);

                const nextUtxoTxid = chainedTx.txs[0].txid();
                const nextUtxoOutIdx = chainedTx.txs[0].outputs.length - 1;

                // Update the nextTxUtxoOutpoint
                nextTxUtxoOutpoint = {
                    txid: nextUtxoTxid,
                    outIdx: nextUtxoOutIdx,
                };
            }
        }

        // Build and broadcast the chained txs
        return new BuiltAction(this._wallet, chainedTxs, feePerKb, this);
    }

    /**
     * selectUtxos may not have enough inputs to cover the total fee
     * requirements of a chained tx
     *
     * In this case, we need to add more inputs and adjust the fee to
     * make sure we can cover every output in our chained tx
     */
    private _getInputsAndFeesForChainedTx(oversizedBuiltTx: BuiltTx): {
        inputs: TxBuilderInput[];
        fees: bigint[];
    } {
        const dustSats = this.action.dustSats || DEFAULT_DUST_SATS;
        const feePerKb = this.action.feePerKb || DEFAULT_FEE_SATS_PER_KB;
        const maxTxSersize = this.action.maxTxSersize || MAX_TX_SERSIZE;

        // First, get the fees. Maybe we already have enough
        const feeArray = getFeesForChainedTx(oversizedBuiltTx, maxTxSersize);

        // Do, do the inputs of chainTxAlpha cover the fees for the whole chain?
        const totalFee = feeArray.reduce((a, b) => a + b, 0n);

        const oversizedTx = oversizedBuiltTx.tx;

        // NB inputSats goes up by the sats of each added input, since all the inputs are always in chainTxAlpha
        let inputSats = oversizedTx.inputs.reduce(
            (a, b) => a + b.signData!.sats,
            0n,
        );

        // NB outputSats will be re-calculated for each chain as it depends on the required chainTxAlpha change output
        // that can fund all subsequent txs in the chain
        const outputSats = oversizedTx.outputs.reduce((a, b) => a + b.sats, 0n);
        const coveredFee = inputSats - outputSats;

        // Do we need another input?
        // Note this check is more sophisticated than just totalFee > coveredFee, bc the change output size would also change
        // What we really need to check is, does the current user change output have enough sats to cover the marginal extra fee of chained txs?
        // What we need to check is, did the original overSizedBuiltAction have a change output? If so, how big is it?
        // We can check this by examining the original user specified outputs vs the oversizedTx outputs
        if (oversizedTx.outputs.length > this.action.outputs.length) {
            // We have a change output as the last output
            const changeOutput =
                oversizedTx.outputs[oversizedTx.outputs.length - 1];
            const changeSats = changeOutput.sats;
            // Would these change sats cover the marginal increase in fee?
            const marginalFeeIncrease = totalFee - coveredFee;
            if (changeSats >= marginalFeeIncrease) {
                // We have enough change sats to cover the marginal fee increase
                // Our existing inputs are acceptable
                const txBuilder = TxBuilder.fromTx(oversizedTx);
                return {
                    inputs: [...txBuilder.inputs],
                    fees: feeArray,
                };
            }
        }

        // Otherwise look at adding more inputs to cover the fee of the chained tx
        // The selectUtxo function lacks the necessary logic to handle this, as it does not
        // test txs against size restrictions

        // Something of an edge case to get here For the most part, the marginal cost of making a
        // chained tx vs an impossible-to-broadcast super large tx is very small, on the order of
        // 100s of sats for a chained tx covering 15,000 outputs

        // Get the currently selected utxos
        // Clone to avoid mutating the original
        const currentlySelectedUtxos = structuredClone(
            this.selectUtxosResult.utxos as WalletUtxo[],
        );

        // Get available spendable utxos
        const spendableUtxos = this._wallet.spendableSatsOnlyUtxos();

        // Get the spendable utxos that are not already selected
        const unusedAndAvailableSpendableUtxos = spendableUtxos.filter(
            utxo =>
                !currentlySelectedUtxos.some(
                    selectedUtxo =>
                        selectedUtxo.outpoint.txid === utxo.outpoint.txid &&
                        selectedUtxo.outpoint.outIdx === utxo.outpoint.outIdx,
                ),
        );

        // Init a new array to store the utxos needed for the chained tx so we
        // do not mutate this.selectUtxosResult
        const additionalUtxosToCoverChainedTx: ScriptUtxo[] = [];
        const additionalTxInputsToCoverChainedTx: TxBuilderInput[] = [];

        for (const utxo of unusedAndAvailableSpendableUtxos) {
            // Add an input and try again
            additionalUtxosToCoverChainedTx.push(utxo);
            inputSats += utxo.sats;

            // NB adding an input has some known and potential consequences
            // Known: we increase the tx size by 141 bytes
            // Potential: we need another tx in the chain, increasing the total chain tx size by an
            //            amount that must be calculated and added to the fee

            // Get the tx builder from the built tx
            const txBuilder = TxBuilder.fromTx(oversizedTx);

            // Prepare the new (dummy) input so we can test the tx for fees
            // NB we use ALL_BIP143, chained txs are NOT (yet) supported by postage
            const newInput = this._wallet.p2pkhUtxoToBuilderInput(
                utxo,
                ALL_BIP143,
            );
            additionalTxInputsToCoverChainedTx.push(newInput);

            const newTxBuilder = new TxBuilder({
                inputs: [
                    ...txBuilder.inputs,
                    ...additionalTxInputsToCoverChainedTx,
                ],
                outputs: txBuilder.outputs,
            });

            const newTx = newTxBuilder.sign({ feePerKb, dustSats });

            const newBuiltTx = new BuiltTx(newTx, feePerKb);

            // Check the fees again
            const newFeeArray = getFeesForChainedTx(newBuiltTx, maxTxSersize);
            const newTotalFee = newFeeArray.reduce((a, b) => a + b, 0n);

            // Are we getting this appropriately?
            // Well, it does not have to be "right" here; the input just has to cover the fee
            // Will be sized later
            const newOutputSats = newTx.outputs.reduce(
                (a, b) => a + b.sats,
                0n,
            );
            const newCoveredFee = inputSats - newOutputSats;

            // Do we need another input
            const needsAnotherInput = newTotalFee > newCoveredFee;

            if (!needsAnotherInput) {
                // We have what we need for this chained tx
                return {
                    inputs: [
                        ...txBuilder.inputs,
                        ...additionalTxInputsToCoverChainedTx,
                    ],
                    fees: newFeeArray,
                };
            }
        }

        // Throw an error, we can't afford it
        throw new Error(
            `Insufficient input sats (${inputSats}) to complete required chained tx output sats`,
        );
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
            this.selectUtxosResult.satsStrategy ===
            SatsSelectionStrategy.NO_SATS
        ) {
            // Potentially we want to just call this.buildPostage here, but then the build method
            // would no longer return a single type. The methods are distinct enough to warrant
            // distinct methods
            throw new Error(
                `You must call buildPostage() for inputs selected with SatsSelectionStrategy.NO_SATS`,
            );
        }
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
        const maxTxSersize = this.action.maxTxSersize || MAX_TX_SERSIZE;

        /**
         * Validate outputs AND add token-required generated outputs
         * i.e. token change or burn-adjusted token change
         *
         * We pass a function to finalizeOutputs that will be called only when
         * a change output is actually needed. This ensures we only increment
         * changeIndex when we actually use a change address.
         */
        const { paymentOutputs, txOutputs } = finalizeOutputs(
            this.action,
            selectedUtxos,
            () => this._wallet.getChangeScript(),
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
            maxTxSersize,
        );
        if (builtActionResult.success && builtActionResult.builtAction) {
            // Check we do not exceed broadcast size
            const builtSize = builtActionResult.builtAction.builtTxs[0].size();
            if (builtSize > maxTxSersize) {
                // We will need to split this tx into multiple smaller txs that do not exceed maxTxSersize
                return this._buildSizeLimitExceededChained(
                    builtActionResult.builtAction,
                    sighash,
                );
            }
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
                    maxTxSersize,
                );
                if (
                    builtActionResult.success &&
                    builtActionResult.builtAction
                ) {
                    // Check we do not exceed broadcast size
                    const builtSize =
                        builtActionResult.builtAction.builtTxs[0].size();
                    if (builtSize > maxTxSersize) {
                        // We will need to split this tx into multiple smaller txs that do not exceed maxTxSersize
                        return this._buildSizeLimitExceededChained(
                            builtActionResult.builtAction,
                            sighash,
                        );
                    }
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
        removeSpentUtxos(this._wallet, tx);

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
            const script = finalizedOutput.script;
            if (this._wallet.isWalletScript(script)) {
                // If this output was created at one of the wallet's addresses, it is now a utxo for the wallet

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

                const outputScript = finalizedOutput.script.toHex();
                const walletUtxo = getWalletUtxoFromOutput(
                    finalizedOutput,
                    txid,
                    i,
                    outputScript,
                    tokenType,
                );
                this._wallet.utxos.push(walletUtxo);
            }
        }

        // NB we do not expect an XEC change output to be added to finalizedOutputs by finalizeOutputs, but it will be in the Tx outputs (if we have one)
        // NB that token change outputs WILL be returned in the paymentOutputs of finalizedOutputs return
        // So, we need to add a change output to the outputs we iterate over for utxo creation, if we have one
        if (
            !this.action.noChange &&
            tx.outputs.length > finalizedOutputs.length
        ) {
            // We have XEC change added by the txBuilder
            const changeOutIdx = tx.outputs.length - 1;
            const changeOutput = tx.outputs[changeOutIdx];

            // Note that ecash-lib supports change outputs at any Script, so we must still confirm this is going to our wallet's script
            // For HD wallets, this checks against all wallet addresses, not just the first receive address
            if (this._wallet.isWalletScript(changeOutput.script)) {
                // This will be a utxo
                const outputScript = changeOutput.script.toHex();
                const walletUtxo = getWalletUtxoFromOutput(
                    tx.outputs[changeOutIdx],
                    txid,
                    changeOutIdx,
                    outputScript,
                );
                this._wallet.utxos.push(walletUtxo);
            }
        }

        // Update balances after modifying utxos
        this._wallet.updateBalance();
    }

    /**
     * Build a postage transaction that is structurally valid but financially insufficient
     * This is used for postage scenarios where fuel inputs will be added later
     */
    public buildPostage(sighash = ALL_ANYONECANPAY_BIP143): PostageTx {
        if (this.action.noChange) {
            throw new Error('noChange param is not supported for postage txs');
        }
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
         *
         * We pass a function to finalizeOutputs that will be called only when
         * a change output is actually needed. This ensures we only increment
         * changeIndex when we actually use a change address.
         */
        const { txOutputs } = finalizeOutputs(
            this.action,
            selectedUtxos,
            () => this._wallet.getChangeScript(),
            dustSats,
        );

        /**
         * NB we DO NOT currently add a change output to the txOutputs
         * It would need to be properly sized to cover the fee, according to
         * the fuel utxo that the payer will be using
         * So, if this info is known, we could accept it as a param
         *
         * Possible approaches
         * - buildPostage could accept fuelUtxoSats and fuelScript as params, if the
         *   size of the fuelUtxos is known and the script is known
         * - Stick with no change and the fuel server has discretely-sized
         *   small utxos, say 1000 sats, and there is never change
         */

        // Create inputs with the specified sighash
        const finalizedInputs = selectedUtxos.map(utxo =>
            this._wallet.p2pkhUtxoToBuilderInput(utxo, sighash),
        );

        // NB we could remove these utxos from the wallet's utxo set, but this would
        // only partially match the API of the build() method
        // In build(), we know the txid of the tx, so we can also add the change utxos created
        // by the tx
        // In this case, we cannot know the txid until after the tx is broadcast. So, we must
        // let the app dev handle this problem

        // Create a signed tx, missing fuel inputs
        const txBuilder = new TxBuilder({
            inputs: finalizedInputs,
            outputs: txOutputs,
        });
        const partiallySignedTx = txBuilder.sign({
            feePerKb,
            dustSats,
        });

        // Create a PostageTx (structurally valid but financially insufficient)
        return new PostageTx(partiallySignedTx);
    }

    /**
     * We need to build and sign a tx to confirm
     * we have sufficient inputs
     *
     * We update the utxo set if the build is successful
     * We DO NOT update the utxo set if the build is unsuccessful or if the built tx
     * exceeds the broadcast size limit, requiring a chained tx
     */
    private _getBuiltAction = (
        inputs: TxBuilderInput[],
        // NB outputs here is the result of finalizeOutputs
        txOutputs: TxBuilderOutput[],
        paymentOutputs: payment.PaymentOutput[],
        feePerKb: bigint,
        dustSats: bigint,
        maxTxSersize: number,
    ): { success: boolean; builtAction?: BuiltAction } => {
        // Can you cover the tx without fuelUtxos?
        try {
            // For XEC change:
            // - Non-HD wallets: use this._wallet.script directly (no changeIndex to worry about)
            // - HD wallets: use this._wallet.script as dummy first, then rebuild with real change script
            //   if change was added (to avoid incrementing changeIndex when change isn't needed)
            const outputs = this.action.noChange
                ? txOutputs
                : [...txOutputs, this._wallet.script];

            const txBuilder = new TxBuilder({
                inputs,
                outputs,
            });
            const thisTx = txBuilder.sign({
                feePerKb,
                dustSats,
            });

            // For HD wallets: check if change output was added by comparing output count
            // If we got txOutputs.length + 1 outputs, change was added
            let finalTx = thisTx;
            if (
                this._wallet.isHD &&
                !this.action.noChange &&
                thisTx.outputs.length === txOutputs.length + 1
            ) {
                // Change was added, rebuild with real change script
                const outputsWithRealChange = [
                    ...txOutputs,
                    this._wallet.getChangeScript(),
                ];
                const txBuilderWithRealChange = new TxBuilder({
                    inputs,
                    outputs: outputsWithRealChange,
                });
                finalTx = txBuilderWithRealChange.sign({
                    feePerKb,
                    dustSats,
                });
            }

            const txSize = finalTx.serSize();
            const txFee = calcTxFee(txSize, feePerKb);

            const inputSats = inputs
                .map(input => input.input.signData!.sats)
                .reduce((a, b) => a + b, 0n);

            // Do your inputs cover outputSum + txFee?
            if (inputSats >= this.actionTotal.sats + txFee) {
                // mightTheseUtxosWork --> now we have confirmed they will work
                // Update utxos if this tx can be broadcasted
                if (txSize <= maxTxSersize) {
                    const txid = toHexRev(sha256d(finalTx.ser()));
                    this._updateUtxosAfterSuccessfulBuild(
                        finalTx,
                        txid,
                        paymentOutputs,
                    );
                }
                return {
                    success: true,
                    builtAction: new BuiltAction(
                        this._wallet,
                        [finalTx],
                        feePerKb,
                        this,
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
 * Configuration options for broadcasting transactions
 */
export interface BroadcastConfig {
    /**
     * If true (default), automatically sync and rebuild on UTXO conflict errors
     * (missing inputs or mempool conflicts). If false, return the error immediately.
     */
    retryOnUtxoConflict?: boolean;
}

/**
 * An action may have more than one Tx
 * So, we use the BuiltAction class to handle the txs property as an array
 * All methods return an array. So, we can still tell if this is a "normal" one-tx action
 * Although most actions are expected to be one-tx, it is deemed more important to keep a
 * constant interface than to optimze for one-tx actions
 */
export class BuiltAction {
    private _wallet: Wallet;
    public txs: Tx[];
    public builtTxs: BuiltTx[];
    public feePerKb: bigint;
    /**
     * Optional reference to the WalletAction that created this BuiltAction.
     * Used to rebuild the transaction if broadcast fails due to out-of-sync UTXO set.
     */
    private _walletAction?: WalletAction;
    constructor(
        wallet: Wallet,
        txs: Tx[],
        feePerKb: bigint,
        walletAction?: WalletAction,
    ) {
        this._wallet = wallet;
        this.txs = txs;
        this.feePerKb = feePerKb;
        this.builtTxs = txs.map(tx => new BuiltTx(tx, feePerKb));
        this._walletAction = walletAction;
    }

    /**
     * Determines if an error should trigger a wallet sync and broadcast retry.
     * Currently checks for:
     * - Missing inputs error (bad-txns-inputs-missingorspent)
     * - Mempool conflict error (txn-mempool-conflict)
     * - Finalized tx conflict error (finalized-tx-conflict)
     *
     * In practice these errors almost always mean the wallet tried to broadcast() with
     * an out-of-sync utxo set
     *
     * @param error - The error object or string to check
     * @returns true if the error indicates we should sync and retry, false otherwise
     */
    private _shouldSyncAndRetry(error: unknown): boolean {
        const errorStr = `${error}`;
        return (
            errorStr.includes('bad-txns-inputs-missingorspent') ||
            errorStr.includes('txn-mempool-conflict') ||
            errorStr.includes('finalized-tx-conflict')
        );
    }

    /**
     * Broadcast the built transaction(s) to the network.
     *
     * @param config - Optional configuration for broadcasting. Defaults to { retryOnUtxoConflict: true }
     * @returns Object with success status, broadcasted txids, and any errors
     */
    public async broadcast(
        config: BroadcastConfig = { retryOnUtxoConflict: true },
    ) {
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
                // Check if this error should trigger a sync and retry
                // Only do this if the failure happened on the first tx (i === 0)
                // This allows us to rebuild the entire chain with fresh UTXOs
                // If a later tx in the chain fails, it's more complex and we don't handle it
                if (
                    config.retryOnUtxoConflict !== false &&
                    this._shouldSyncAndRetry(err) &&
                    i === 0 &&
                    this._walletAction
                ) {
                    // Sync and rebuild - if it's a chained tx, we rebuild the entire chain
                    await this._wallet.sync();
                    try {
                        // Create a new WalletAction to re-select UTXOs with the synced wallet state
                        const rebuiltWalletAction = this._wallet.action(
                            this._walletAction.action,
                            this._walletAction.selectUtxosResult.satsStrategy,
                        );
                        const rebuiltAction = rebuiltWalletAction.build();
                        const rebuiltTxs = rebuiltAction.txs.map(tx =>
                            toHex(tx.ser()),
                        );

                        // Broadcast all rebuilt transactions (may be 1 or more for chained txs)
                        for (let j = 0; j < rebuiltTxs.length; j++) {
                            const { txid } =
                                await this._wallet.chronik.broadcastTx(
                                    rebuiltTxs[j],
                                );
                            broadcasted.push(txid);
                        }

                        // Update this BuiltAction's txs to match the rebuilt one
                        this.txs = rebuiltAction.txs;
                        this.builtTxs = rebuiltAction.builtTxs;
                        // We've successfully broadcast all rebuilt txs, so we're done
                        break;
                    } catch (retryErr) {
                        // Retry also failed, return the error
                        console.error(
                            `Error broadcasting after sync and rebuild retry:`,
                            retryErr,
                        );
                        return {
                            success: false,
                            broadcasted,
                            unbroadcasted: txsToBroadcast.slice(i),
                            errors: [`${retryErr}`],
                        };
                    }
                }
                // If we get here, either:
                // 1. The error doesn't require sync/retry
                // 2. The failure happened on a later tx in a chain (i > 0) - we don't handle this
                // 3. We don't have a WalletAction reference - can't rebuild
                // In all these cases, return the error immediately
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
export class PostageTx {
    public partiallySignedTx: Tx;
    public txBuilder: TxBuilder;

    constructor(partiallySignedTx: Tx) {
        this.partiallySignedTx = partiallySignedTx;
        this.txBuilder = TxBuilder.fromTx(partiallySignedTx);
    }

    /**
     * Add fuel inputs and create a broadcastable transaction
     * Uses the same fee calculation approach as build() method
     */
    public addFuelAndSign(
        fuelWallet: Wallet,
        /**
         * The party that finalizes and broadcasts the tx cannot know
         * the value of the inputs in the partiallySignedTx by inspecting
         * the partiallySignedTx, as this info is lost when the tx is serialized
         *
         * We leave it to the app dev to determine how to share this info
         * with the postage payer. It could easily be included in an API POST
         * request alongside the serialized partially signed tx, or in many cases
         * it could be assumed (token utxos could have known sats of DEFAULT_DUST_SATS
         * for many app use cases)
         */
        prePostageInputSats: bigint,
        sighash = ALL_BIP143,
        // feePerKb and dustSats may be set by the user completing the tx
        // after all, they're paying for it
        feePerKb = DEFAULT_FEE_SATS_PER_KB,
        dustSats = DEFAULT_DUST_SATS,
    ): BuiltAction {
        const fuelUtxos = fuelWallet.spendableSatsOnlyUtxos();

        // Start with postage inputs (token UTXOs with insufficient sats)
        const allInputs = [...this.txBuilder.inputs];

        // NB we do not expect to have inputSats, as signatory will be undefined after ser/deser
        const outputSats = this.txBuilder.outputs.reduce((sum, output) => {
            if ('sats' in output) {
                return sum + output.sats;
            } else {
                return sum;
            }
        }, 0n);

        let thisTxNeededFee = 0n;
        let inputSats = prePostageInputSats;

        if (inputSats > outputSats) {
            // If inputSats > outputSats, we may not need postage at all
            // NB > and not >= as we always need > 0n sats for the fee
            // NB we must test before we iterate as we want this to work in the
            // special case of a postage wallet having no fuel utxos but also
            // needing no fuel utxos
            try {
                const txBuilder = new TxBuilder({
                    inputs: allInputs,
                    outputs: this.txBuilder.outputs,
                });
                const signedTx = txBuilder.sign({
                    feePerKb: feePerKb,
                    dustSats: dustSats,
                });

                // Determine the size of the tx
                const txSize = signedTx.serSize();
                // Determine the fee for the tx
                // NB that selectUtxos knows nothing about the tx fee, it just makes sure
                // inputs meet or exceed outputs in determining missingSats
                thisTxNeededFee = calcTxFee(txSize, feePerKb);

                const thisTxPaysFee = inputSats - outputSats;
                if (thisTxPaysFee > thisTxNeededFee) {
                    // We have enough sats to cover the fee
                    // So we can broadcast the tx

                    // Remove spent utxos from the postage wallet
                    removeSpentUtxos(fuelWallet, signedTx);

                    // Return the built action for broadcast
                    return new BuiltAction(fuelWallet, [signedTx], feePerKb);
                }

                // Else start adding fuel UTXOs
            } catch (err) {
                // Continue to adding fuel UTXOs
                // NB we do not expect an error here as txBuilder.sign will not throw for not covering the fee in this case
                console.error(
                    'Error building tx in addFuelAndSign before adding fuel UTXOs:',
                    err,
                );
            }
        }

        // Add postage inputs if we need them
        for (const fuelUtxo of fuelUtxos) {
            // If we did not have enough sats to cover the fee,
            // add the fuel UTXO to the inputs and try again
            allInputs.push(
                fuelWallet.p2pkhUtxoToBuilderInput(fuelUtxo, sighash),
            );
            inputSats += fuelUtxo.sats;

            // This is the same check from above
            // We do not put it in a function as needs too many params, imo does not really make the code cleaner
            if (inputSats > outputSats) {
                try {
                    const txBuilder = new TxBuilder({
                        inputs: allInputs,
                        outputs: this.txBuilder.outputs,
                    });
                    const signedTx = txBuilder.sign({
                        feePerKb: feePerKb,
                        dustSats: dustSats,
                    });
                    const txSize = signedTx.serSize();
                    thisTxNeededFee = calcTxFee(txSize, feePerKb);
                    const thisTxPaysFee = inputSats - outputSats;
                    if (thisTxPaysFee > thisTxNeededFee) {
                        // Remove spent utxos from the postage wallet
                        removeSpentUtxos(fuelWallet, signedTx);

                        return new BuiltAction(
                            fuelWallet,
                            [signedTx],
                            feePerKb,
                        );
                    }
                    // Else continue to the next fuel UTXO
                } catch (err) {
                    // Continue to next fuel UTXO
                    // NB we do not expect an error here as txBuilder.sign will not throw
                    // even if we do not cover the fee
                    console.error('Error building tx in addFuelAndSign:', err);
                }
            }
        }

        // If we run out of fuel UTXOs without success, we can't afford this tx
        throw new Error(
            `Insufficient fuel: insufficient sats in impliedInputSats (${inputSats}) to cover output sats (${outputSats}) + fee (${thisTxNeededFee}) with available fuel UTXOs`,
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
export interface RequiredTokenInputs {
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
 * Error thrown when exact atoms are not found but sufficient total atoms exist.
 * This indicates that a SEND action may be needed to handle change.
 */
export class ExactAtomsNotFoundError extends Error {
    constructor(
        message: string,
        public readonly tokenId: string,
        public readonly burnAtoms: bigint,
    ) {
        super(message);
        this.name = 'ExactAtomsNotFoundError';
    }
}

/**
 * Finds a combination of UTXOs for a given tokenId whose atoms exactly sum to burnAtoms.
 * Returns the matching UTXOs or throws an error if no exact match is found.
 *
 * @param availableUtxos - Array of UTXOs to search through
 * @param tokenId - The token ID to match
 * @param burnAtoms - The exact amount of atoms to burn
 * @returns Array of UTXOs whose atoms sum exactly to burnAtoms
 * @throws ExactAtomsNotFoundError when exact atoms are not found but sufficient total atoms exist
 * @throws Error for other cases (invalid input, no UTXOs, insufficient atoms)
 */
export const getTokenUtxosWithExactAtoms = (
    availableUtxos: WalletUtxo[],
    tokenId: string,
    burnAtoms: bigint,
): { hasExact: boolean; burnUtxos: WalletUtxo[] } => {
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
    const dp: Map<bigint, WalletUtxo[]> = new Map();
    dp.set(0n, []);

    for (const utxo of relevantUtxos) {
        const atoms = utxo.token!.atoms;
        const newEntries: Array<[bigint, WalletUtxo[]]> = [];

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
        throw new ExactAtomsNotFoundError(
            `Unable to find UTXOs for ${tokenId} with exactly ${burnAtoms} atoms. Create a UTXO with ${burnAtoms} atoms to burn without a SEND action.`,
            tokenId,
            burnAtoms,
        );
    }

    // Otherwise for all SLP tokens, we can auto chain
    // "chained" will be true, and we need to return utxo(s) with atoms > burnAtoms

    // We use accumulative algo here
    // NB we "know" we have enough utxos as we already would have thrown above if not
    // But, we do not need to return all the utxos here, just enough to cover the burn
    const utxosWithSufficientAtoms: WalletUtxo[] = [];
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
    slpUtxos: WalletUtxo[],
): WalletUtxo | undefined => {
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
    let highestQtyUtxo: WalletUtxo | undefined = undefined;
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
            // ALP tokens burn with SEND and do not require burnAllTokenIds handling,
            // i.e. they do not require exactly-sized utxos nor do they require chained
            // txs to burn atoms that do not exactly match available utxos
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

/**
 * Interface used to identify a known required chained tx type
 * that is discernable from selectUtxos
 *
 *
 * Note
 * For some types of chained txs, we cannot immediately know from
 * the utxo set alone, e.g. for a tx that exceeds the max serSize
 * we must actually try and sign the tx with selected inputs to
 * determine if the max size is exceeded
 *
 * Sometimes we could "know" e.g. if we have 5000 outputs but we still
 * need to exact fees to determine the exact cutoffs for chained txs, and
 * we cannot do this without signing or dummy signing
 */
export enum ChainedTxType {
    /** We can complete this Action in a single tx */
    NONE = 'NONE',
    /** We need to chain a tx to fan-out an NFT mint */
    NFT_MINT_FANOUT = 'NFT_MINT_FANOUT',
    /** We need to chain a tx to intentional burn an SLP token */
    INTENTIONAL_BURN = 'INTENTIONAL_BURN',
    /** We need to chain txs because token send outputs exceed protocol max outputs per tx */
    TOKEN_SEND_EXCEEDS_MAX_OUTPUTS = 'TOKEN_SEND_EXCEEDS_MAX_OUTPUTS',

    /**
     * NB we intentionally omit EXCEEDS_MAX_SERSIZE as we cannot
     * determine this from selectUtxos, this specific case is handled
     * at the point where we know it to be true, i.e. once we know
     * exactly how many inputs and outputs the tx has and its serSize
     */
}

interface SelectUtxosResult {
    /** Were we able to select all required utxos */
    success: boolean;
    utxos?: WalletUtxo[];
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
    /**
     * We need to return the satsStrategy used to select the utxos, because
     * it is not always possible to infer
     *
     * For example, we may wish to send a token tx with 1 input and one output
     * and SatsSelectionStrategy.NO_SATS
     *
     * Such a tx would give us success true and missingSats 0n. If this tx
     * were passed to build(), it would just add fuel utxos up to the point of
     * the fee being covered
     */
    satsStrategy: SatsSelectionStrategy;
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
/**
 * Check if token send outputs exceed protocol max outputs per tx
 *
 * This determines if a chained transaction is needed by counting:
 * - All send outputs for each tokenId
 * - Potential change outputs (when input atoms > output atoms)
 *
 * @param action - The payment action to check
 * @param tokenType - The token type (SLP or ALP)
 * @param tokens - Map of required token inputs (used to estimate change outputs)
 * @returns true if outputs exceed max, false otherwise
 */
export const checkTokenSendExceedsMaxOutputs = (
    action: payment.Action,
    tokenType: TokenType,
    tokens?: Map<string, RequiredTokenInputs>,
): boolean => {
    const sendActions = action.tokenActions?.filter(
        action => action.type === 'SEND',
    ) as payment.SendAction[] | undefined;

    if (!sendActions || sendActions.length === 0) {
        return false;
    }

    // Count send outputs for each tokenId
    const sendOutputCounts = new Map<string, number>();
    let totalSendOutputs = 0;

    for (const output of action.outputs) {
        if (
            'tokenId' in output &&
            typeof output.tokenId !== 'undefined' &&
            output.tokenId !== payment.GENESIS_TOKEN_ID_PLACEHOLDER
        ) {
            const tokenId = output.tokenId as string;
            if (
                sendActions.some(sendAction => sendAction.tokenId === tokenId)
            ) {
                const currentCount = sendOutputCounts.get(tokenId) || 0;
                sendOutputCounts.set(tokenId, currentCount + 1);
                totalSendOutputs++;
            }
        }
    }

    // Check if we'll need change outputs by estimating from tokens map
    // We need to estimate if there will be change by comparing input atoms to output atoms
    if (typeof tokens !== 'undefined') {
        for (const [tokenId] of sendActions.map(
            action => [action.tokenId] as [string],
        )) {
            const requiredTokenInputs = tokens.get(tokenId);
            if (requiredTokenInputs) {
                // Get output atoms for this tokenId
                const outputAtoms = action.outputs
                    .filter(
                        (o: payment.PaymentOutput) =>
                            'tokenId' in o &&
                            o.tokenId === tokenId &&
                            typeof (o as payment.PaymentTokenOutput).atoms !==
                                'undefined',
                    )
                    .reduce(
                        (sum: bigint, o: payment.PaymentOutput) =>
                            sum +
                            ((o as payment.PaymentTokenOutput).atoms || 0n),
                        0n,
                    );

                // Check if we'll have change (input atoms > output atoms)
                if (
                    requiredTokenInputs.atoms > outputAtoms &&
                    requiredTokenInputs.atoms > 0n
                ) {
                    // We'll need a change output, add 1 to the count for this tokenId
                    const currentCount = sendOutputCounts.get(tokenId) || 0;
                    sendOutputCounts.set(tokenId, currentCount + 1);
                    totalSendOutputs++;
                }
            }
        }
    }

    // Determine max outputs based on token protocol
    const maxOutputs =
        tokenType.protocol === 'SLP'
            ? SLP_MAX_SEND_OUTPUTS
            : ALP_POLICY_MAX_OUTPUTS;

    // Check if total outputs (including change) would exceed max
    // Note: we add 1 for the OP_RETURN output at index 0
    return totalSendOutputs + 1 > maxOutputs;
};

export const selectUtxos = (
    action: payment.Action,
    /**
     * All spendable utxos available to the wallet
     * - Token utxos
     * - Non-token utxos
     * - Coinbase utxos with at least COINBASE_MATURITY confirmations
     */
    spendableUtxos: WalletUtxo[],
    /**
     * Strategy for selecting satoshis
     * @default SatsSelectionStrategy.REQUIRE_SATS
     */
    satsStrategy: SatsSelectionStrategy = SatsSelectionStrategy.REQUIRE_SATS,
): SelectUtxosResult => {
    const actionTotals = getActionTotals(action);
    const { sats, tokens, groupTokenId } = actionTotals;

    // Clone spendableUtxos so that we can mutate it in this function without mutating the original
    const clonedSpendableUtxos = structuredClone(spendableUtxos);

    // Init "chainedTxType" as NONE
    let chainedTxType = ChainedTxType.NONE;

    // Check if token send outputs exceed protocol max outputs per tx
    // This check must happen EARLY, before any early returns, so we can detect
    // chained transaction needs even if we have enough utxos
    const tokenType = getTokenType(action);
    if (typeof tokenType !== 'undefined') {
        const result = checkTokenSendExceedsMaxOutputs(
            action,
            tokenType,
            tokens,
        );
        if (result) {
            chainedTxType = ChainedTxType.TOKEN_SEND_EXCEEDS_MAX_OUTPUTS;
        }
    }

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
    let nftMintInput: WalletUtxo | undefined = undefined;
    let needsNftMintInput: boolean = false;
    let needsNftFanout: boolean = false;
    if (typeof groupTokenId !== 'undefined') {
        nftMintInput = getNftChildGenesisInput(
            groupTokenId,
            clonedSpendableUtxos,
        );
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

    const selectedUtxos: WalletUtxo[] = [];
    let selectedUtxosSats = 0n;

    // We add requiredUtxos first, if any are specified
    if (
        typeof action.requiredUtxos !== 'undefined' &&
        action.requiredUtxos.length > 0
    ) {
        for (const requiredUtxoOutpoint of action.requiredUtxos) {
            // We remove this utxo from clonedSpendableUtxos and add it to selectedUtxos
            const addedRequiredUtxoIndexInSpendableUtxos =
                clonedSpendableUtxos.findIndex(
                    spendableUtxo =>
                        spendableUtxo.outpoint.txid ===
                            requiredUtxoOutpoint.txid &&
                        spendableUtxo.outpoint.outIdx ===
                            requiredUtxoOutpoint.outIdx,
                );
            if (typeof addedRequiredUtxoIndexInSpendableUtxos === 'undefined') {
                throw new Error(
                    `Required UTXO ${requiredUtxoOutpoint.txid}:${requiredUtxoOutpoint.outIdx} not available in spendableUtxos`,
                );
            }
            const addedRequiredUtxo = clonedSpendableUtxos.splice(
                addedRequiredUtxoIndexInSpendableUtxos,
                1,
            )[0];
            // We add to selected utxos
            selectedUtxos.push(addedRequiredUtxo);

            // Bump sats
            selectedUtxosSats += addedRequiredUtxo.sats;

            // Check if this utxo fulfills any token requirements for this action and update them appropriately
            if (
                typeof addedRequiredUtxo.token !== 'undefined' &&
                tokenIdsWithRequiredUtxos.includes(
                    addedRequiredUtxo.token.tokenId,
                )
            ) {
                // If we have remaining requirements for a utxo with this tokenId
                // to complete this user-specified Action

                const requiredTokenInputsThisToken = tokens!.get(
                    addedRequiredUtxo.token.tokenId,
                ) as RequiredTokenInputs;

                if (
                    addedRequiredUtxo.token.isMintBaton &&
                    requiredTokenInputsThisToken.needsMintBaton
                ) {
                    // Now we no longer need a mint baton as we already added this utxo
                    requiredTokenInputsThisToken.needsMintBaton = false;

                    if (
                        requiredTokenInputsThisToken.atoms === 0n &&
                        !requiredTokenInputsThisToken.needsMintBaton
                    ) {
                        // If we no longer require any utxos for this tokenId,
                        // remove it from tokenIdsWithRequiredUtxos
                        tokenIdsWithRequiredUtxos =
                            tokenIdsWithRequiredUtxos.filter(
                                tokenId =>
                                    tokenId !==
                                    addedRequiredUtxo.token!.tokenId,
                            );
                    }
                } else if (
                    !addedRequiredUtxo.token.isMintBaton &&
                    requiredTokenInputsThisToken.atoms > 0n
                ) {
                    // If this is a token utxo and we needed its atoms, track that we now need less

                    // We now require fewer atoms of this tokenId. Update.
                    const requiredAtomsRemainingThisToken =
                        (requiredTokenInputsThisToken.atoms -=
                            addedRequiredUtxo.token.atoms);

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
                                tokenId =>
                                    tokenId !==
                                    addedRequiredUtxo.token!.tokenId,
                            );
                    }
                }
            }
        }
        // Return utxos if we have enough
        // NB for requiredUtxos, we do this check only after they have all been added
        // It is possible for a user to include "too many" utxos, at least as far as
        // ecash-wallet is concerned,by using requiredUtxos
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
                    selectedUtxosSats >= sats ? 0n : sats - selectedUtxosSats,
                chainedTxType,
                satsStrategy,
            };
        }
    }

    // Add NFT mint input if we have one and it was not already added by
    // the user with requiredUtxos
    if (
        typeof groupTokenId !== 'undefined' &&
        typeof nftMintInput !== 'undefined'
    ) {
        // Although we do not anticipate requiredUtxos being used to specify which qty-1
        // groupTokenId utxo to mint an NFT with, it is easy enough to check for it, so
        // we support this use case
        const userSpecifiedNftMintInput = getNftChildGenesisInput(
            groupTokenId,
            selectedUtxos,
        );

        if (typeof userSpecifiedNftMintInput === 'undefined') {
            // If the user has not specified a custom preferred nft mint input, we add the one that is available

            // We add the input regardless of qty for chained tx handling
            // For qty-1 inputs, we can mint directly
            // For qty >1 inputs, we'll use a chained tx to fan out first
            selectedUtxos.push(nftMintInput);
            selectedUtxosSats += nftMintInput.sats;

            // There's a good chance this is all we need for our tx, as we likely have
            // a 546-sat input and a single 546-sat output specified

            // Check and return
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
                    satsStrategy,
                };
            }
        }
    }

    // Handle burnAll tokenIds
    for (const burnAllTokenId of burnAllTokenIds) {
        if (typeof action.requiredUtxos !== 'undefined') {
            // It gets pretty hairy trying to check if the user already required some or all
            // of the exact-atoms utxos for this type of burn

            // The requiredUtxos feature is not expected to be used for this type of action,
            // so it is better to simply omit support
            throw new Error(
                'ecash-wallet does not support requiredUtxos for SLP burn txs',
            );
        }

        const result = getTokenUtxosWithExactAtoms(
            clonedSpendableUtxos,
            burnAllTokenId,
            tokens!.get(burnAllTokenId)!.atoms,
        );
        const { hasExact, burnUtxos } = result;

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
                satsStrategy,
            };
        }
    }

    for (const utxo of clonedSpendableUtxos) {
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
                            satsStrategy,
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
                            satsStrategy,
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
                satsStrategy,
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
            missingTokens: tokens || new Map(),
            missingSats:
                selectedUtxosSats >= sats ? 0n : sats - selectedUtxosSats,
            chainedTxType,
            errors,
            satsStrategy,
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
            satsStrategy,
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
            satsStrategy,
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
        satsStrategy,
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

/**
 * Batch token send outputs for chained transactions
 *
 * Splits token send outputs into batches that fit within protocol limits.
 * Each batch (except the last) reserves space for a change output that will
 * be used as input for the next transaction in the chain.
 *
 * @param sendOutputs - Array of token send outputs to batch
 * @param maxOutputsPerTx - Maximum outputs allowed per tx (SLP_MAX_SEND_OUTPUTS or ALP_POLICY_MAX_OUTPUTS)
 * @returns Array of batches, where each batch is an array of outputs
 */
export const batchTokenSendOutputs = (
    sendOutputs: payment.PaymentTokenOutput[],
    maxOutputsPerTx: number,
): payment.PaymentTokenOutput[][] => {
    if (maxOutputsPerTx <= 1) {
        throw new Error(
            `batchTokenSendOutputs called with maxOutputsPerTx of ${maxOutputsPerTx}; must be greater than 1`,
        );
    }
    if (sendOutputs.length === 0) {
        return [];
    }

    // Every tx except the last (TxOmega) must reserve space for a change output
    // that will be used as input for the next tx in the chain
    // So if maxOutputsPerTx is 29, only TxOmega can have 29 outputs
    // Preceding txs can have 28 outputs + 1 change output
    const maxEventOutputsPerTx = maxOutputsPerTx - 1;
    const batched = Array.from(
        { length: Math.ceil(sendOutputs.length / maxEventOutputsPerTx) },
        (_, i) =>
            sendOutputs.slice(
                i * maxEventOutputsPerTx,
                (i + 1) * maxEventOutputsPerTx,
            ),
    );

    if (maxOutputsPerTx > 2 && batched.length > 1) {
        // If we are working with a max batch size greater than 2
        // Check to see if the last batch can be combined with the preceding batch
        const lastBatch = batched[batched.length - 1];
        if (lastBatch.length === 1) {
            // If we have one element in the last batch, i.e. in TxOmega
            // Remove this length-1 array from batched and add it into the previous batch
            // Remember TxOmega does not need to "save room" for a change tx, so we can fit this
            // (Token change is already included in the sendOutputs before batching, so it's
            // already accounted for in the batches)
            batched.pop();
            batched[batched.length - 1] = [
                ...batched[batched.length - 1],
                lastBatch[0],
            ];
        }
    }
    return batched;
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
    getChangeScript: () => Script,
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
                    // Call getChangeScript() only when we actually need to add a change output
                    outputs.push({
                        sats: dustSats,
                        tokenId: tokenId as string,
                        atoms: changeAtoms,
                        isMintBaton: false,
                        script: getChangeScript(),
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
                        !output.isMintBaton &&
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
 * Convert a PaymentOutput to a WalletUtxo
 * NB this function assumes the output is from a valid tx that met valid token spec conditions
 *
 * @param output - The PaymentOutput to convert
 * @param txid - Transaction ID
 * @param outIdx - Output index
 * @param outputScript - The output script as a hex string (used to derive address)
 * @param tokenType - Optional token type for token UTXOs
 * @returns WalletUtxo with address field derived from outputScript
 */
export const getWalletUtxoFromOutput = (
    output: payment.PaymentOutput,
    txid: string,
    outIdx: number,
    outputScript: string,
    tokenType?: TokenType,
): WalletUtxo => {
    // Create the outpoint
    const outpoint = { txid, outIdx };

    const { sats } = output;
    if (typeof sats === 'undefined') {
        // OP_RETURN outputs cannot be utxos
        // NB we do not expect this function to be called on OP_RETURN outputs
        throw new Error('Output must have sats');
    }

    // Derive address from outputScript
    const address = Address.fromScriptHex(outputScript).toString();

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
            address,
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
            address,
        };
    }
};

/**
 * Determine the maximum number of p2pkh outputs that can be
 * included in a tx while remaining under maxTxSersize,
 * given the number of schnorr-signed p2pkh inputs and any
 * required OP_RETURN
 */
export const getMaxP2pkhOutputs = (
    inputCount: number,
    opReturnSize = 0,
    maxTxSersize = MAX_TX_SERSIZE,
): number => {
    // Build outputs
    const outputs = [DUMMY_P2PKH_OUTPUT];
    if (opReturnSize > 0) {
        // Include an OP_RETURN output if present
        outputs.unshift({
            sats: DEFAULT_DUST_SATS,
            script: new Script(new Uint8Array(opReturnSize)),
        });
    }

    // Build a dummy tx that includes minimum required outputs for a HolderPaymentTx
    const minTxBuilder = new TxBuilder({
        inputs: Array(inputCount).fill(DUMMY_P2PKH_INPUT),
        outputs,
    });
    const tx = minTxBuilder.sign({ ecc: eccDummy });

    // Get the size of the tx in bytes
    const txSizeBytes = tx.serSize();

    const sizeAvailableForMoreOutputs = maxTxSersize - txSizeBytes;

    // How many p2pkh outputs fit into size remaining
    const maxAdditionalP2pkhOutputs = Math.floor(
        sizeAvailableForMoreOutputs / P2PKH_OUTPUT_SIZE,
    );

    // Account for the 1 in minTxBuilder
    const maxP2pkhOutputsThisTx = 1 + maxAdditionalP2pkhOutputs;

    if (maxP2pkhOutputsThisTx < 1) {
        // Unlikely to run into this as we need 709 inputs
        // For now, ecash-wallet does not support automatic utxo-consolidation
        // But, it would not be too complicated to add this support
        throw new Error(
            `Total inputs exceed maxTxSersize of ${maxTxSersize} bytes. You must consolidate utxos to fulfill this action.`,
        );
    }

    // Max p2pkh outputs is the 1 in our dummy + the maxAdditionalP2pkhOutputs
    return 1 + maxAdditionalP2pkhOutputs;
};

/**
 * Calculate the fee for a p2pkh tx
 * NB this function assumes no OP_RETURN outputs
 */
export const getP2pkhTxFee = (
    p2pkhInputCount: number,
    p2pkhOutputCount: number,
    feePerKb = DEFAULT_FEE_SATS_PER_KB,
) => {
    // Build a dummy tx to get size and fee
    const minTxBuilder = new TxBuilder({
        inputs: Array(p2pkhInputCount).fill(DUMMY_P2PKH_INPUT),
        outputs: Array(p2pkhOutputCount).fill(DUMMY_P2PKH_OUTPUT),
    });
    const tx = minTxBuilder.sign({ ecc: eccDummy });
    const txSizeBytes = tx.serSize();
    const txFee = calcTxFee(txSizeBytes, feePerKb);
    return txFee;
};

/**
 * Return an array of fees such that each entry in the array is the fee for
 * the chained tx corresponding to its index in the array
 *
 * e.g.
 *
 * result = getFeesForChainedTx(builtTx)
 * result[0] = fee for chainTxAlpha
 * result[1] = fee for chainedTx
 * result[n] = fee for chainedTx n
 * result[result.length-1] = fee for chainedTxOmega
 */
export const getFeesForChainedTx = (
    oversizedBuiltTx: BuiltTx,
    maxTxSersize = MAX_TX_SERSIZE,
): bigint[] => {
    const oversizedTx = oversizedBuiltTx.tx;

    // Get number of inputs and outputs
    const chainTxAlphaInputCount = oversizedTx.inputs.length;
    const chainedActionOutputCount = oversizedTx.outputs.length;

    // Parse for an OP_RETURN output
    // NB potentially we want to support including this OP_RETURN in every tx in the chain
    // But, it is hard to assume this, so should be gated by a param
    // For now just add it for the first tx. _buildSizeLimitExceededChained for now only supports non-token txs
    // so there is no functional requirement for OP_RETURN in every tx

    // NB ecash-wallet only supports OP_RETURN outputs at outIdx 0, so this is the only output we check
    const indexZeroOutput = oversizedTx.outputs[0];
    const hasOpReturn =
        indexZeroOutput &&
        'script' in indexZeroOutput &&
        typeof indexZeroOutput.script !== 'undefined' &&
        indexZeroOutput.script.bytecode[0] === OP_RETURN;

    const opReturnSize = hasOpReturn
        ? indexZeroOutput.script!.bytecode.length
        : 0;

    // The max outputs in chainTxAlpha depends on input count and OP_RETURN size
    const maxP2pkhOutputsInChainTxAlpha = getMaxP2pkhOutputs(
        chainTxAlphaInputCount,
        opReturnSize,
        maxTxSersize,
    );

    // Init chainTxDummyHelper, which will help us determine the fee for each tx in the chain, and
    // hence the total sats required to complete the full chain
    const chainTxDummyHelper = [
        {
            inputCount: oversizedTx.inputs.length,
            outputCount: maxP2pkhOutputsInChainTxAlpha,
        },
    ];

    // Init a tracker for actionAssignedOutputs, which we decrement as these are covered by the txs in the chain
    let unassignedActionOutputs = chainedActionOutputCount;

    // SPECIAL CONDITIONS FOR chainTxAlpha
    // - chainTxAlpha always has 1 output that is the exact input needed to cover the rest of the chain
    // - When we calc fees and estimate size, we assume that chainTxAlpha will also have 1 output to
    //   cover change back to the sender. In practice, we may sometimes not need this, so we may sometimes
    //   undersize chainTxAlpha by 1 output. This is deemed acceptable.
    const chainTxAlphaActionAssignedOutputs =
        maxP2pkhOutputsInChainTxAlpha - CHAINED_TX_ALPHA_RESERVED_OUTPUTS;

    unassignedActionOutputs -= chainTxAlphaActionAssignedOutputs;

    while (unassignedActionOutputs > 0) {
        // All txs after chainTxAlpha will have no OP_RETURN and exactly 1 input

        // We do not (currently) support OP_RETURN in chained txs after chainTxAlpha
        const nextTxMaxOutputs = getMaxP2pkhOutputs(
            NTH_TX_IN_CHAIN_INPUTS,
            0,
            maxTxSersize,
        );

        // Now that we are using the noChange param to build a chained tx,
        // design decision that we include the actual change, if any, from the whole action
        // back to the creating wallet in chainTxAlpha

        // If nextTxMaxOutputs is greater than or equal to actionSpecifiedOutputsLeftToAssign,
        // then this is the last tx in the chain
        const isChainedTxOmega = nextTxMaxOutputs >= unassignedActionOutputs;

        if (isChainedTxOmega) {
            chainTxDummyHelper.push({
                inputCount: NTH_TX_IN_CHAIN_INPUTS,
                outputCount: unassignedActionOutputs,
            });

            // Will trivially break the while loop, so we just break instead
            // actionSpecifiedOutputsLeftToAssign -= actionSpecifiedOutputsLeftToAssign;
            break;
        } else {
            // chainedTx
            // A chained tx will cover max outputs minus 1, as it will need change which is not an action-specified output
            const actionSpecifiedOutputsAssignedThisTx = nextTxMaxOutputs - 1; // Less 1 as the change does not handle an output

            chainTxDummyHelper.push({
                inputCount: NTH_TX_IN_CHAIN_INPUTS,
                // We always max our outputs in chained txs
                outputCount: nextTxMaxOutputs,
            });
            unassignedActionOutputs -= actionSpecifiedOutputsAssignedThisTx;
        }
    }

    // Get the fee for each tx planned in this chain
    const feeArray = chainTxDummyHelper.map(tx => {
        return getP2pkhTxFee(
            tx.inputCount,
            tx.outputCount,
            oversizedBuiltTx.feePerKb,
        );
    });
    return feeArray;
};

/**
 * The addFuelAndSign method in a PostageTx consumes postage inputs from the postage wallet
 * It DOES NOT create utxos for the postage wallet, at least not in its current implementation
 *
 * It's worth having a streamlined way to automatically remove these utxos from the postage wallet's utxo set
 * A postage wallet could, for example, have 10,000 10-XEC utxos
 *
 * It would be slow and wasteful to sync() such a wallet before each postage tx. Instead, the wallet should
 * sync on server start and then automatically consume utxos; perhaps sync at some regular interval in the
 * background.
 *
 * Another thing to look at for the future here is paginated utxos and utxos() chronik calls that return
 * some kind of filtered set
 */
export const removeSpentUtxos = (wallet: Wallet, tx: Tx) => {
    // Remove spent utxos
    const { inputs } = tx;
    for (const input of inputs) {
        // Find the utxo used to create this input
        const { prevOut } = input;
        const { txid, outIdx } = prevOut;
        const utxoIndex = wallet.utxos.findIndex(
            utxo =>
                utxo.outpoint.txid === txid && utxo.outpoint.outIdx === outIdx,
        );
        if (utxoIndex >= 0) {
            // Remove the utxo from the utxo set
            wallet.utxos.splice(utxoIndex, 1);
        }
    }
};

/**
 * Punchlist
 *
 * [] New diff: UX of burning mint batons and associated regtest
 * [] New diff: support remaining token types
 * [] New diff: chained txs
 */
