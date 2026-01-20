// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Script, Address, HdNode, Ecc, fromHex } from 'ecash-lib';
import { ChronikClient, ScriptUtxo, Tx as ChronikTx } from 'chronik-client';
import { WalletUtxo } from './wallet';

/**
 * Base class for wallet implementations (Wallet and WatchOnlyWallet)
 * Contains all common properties and methods shared between the two
 */
export abstract class WalletBase<
    TKeypair extends {
        pk: Uint8Array;
        pkh: Uint8Array;
        script: Script;
        address: string;
    },
> {
    /** Initialized chronik instance */
    chronik: ChronikClient;
    /** Initialized Ecc instance */
    ecc: Ecc;
    /** Public key (only for non-HD wallets, undefined for WatchOnlyWallet non-HD) */
    pk: Uint8Array | undefined;
    /** Hash160 of the public key */
    pkh: Uint8Array;
    /** p2pkh output script of this wallet */
    script: Script;
    /** p2pkh cashaddress of this wallet */
    address: string;
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
    keypairs: Map<string, TKeypair>;

    protected constructor(
        chronik: ChronikClient,
        address?: string,
        baseHdNode?: HdNode,
        accountNumber: number = 0,
    ) {
        this.chronik = chronik;
        this.ecc = new Ecc();

        // Initialize HD wallet properties
        this.isHD = baseHdNode !== undefined;
        this.accountNumber = accountNumber;
        this.baseHdNode = baseHdNode;
        this.receiveIndex = 0;
        this.changeIndex = 0;
        this.keypairs = new Map();

        // Constructors cannot be async, so we must sync() to get utxos
        this.utxos = [];
        this.balanceSats = 0n;

        // Address-related fields are initialized by subclasses after super() call
        // They are typed as required because subclasses always set them before constructor completes
        // Using type assertions here - subclasses will set proper values
        this.address = (address ?? '') as string;
        this.pkh = new Uint8Array(20) as Uint8Array;
        this.script = Script.p2pkh(new Uint8Array(20)) as Script;
    }

    /**
     * Abstract method to derive a keypair at a specific path for HD wallets
     * Each subclass implements this differently (with or without secret key)
     *
     * @param forChange - If true, derive change address (chain 1), otherwise receive address (chain 0)
     * @param index - The address index
     * @returns Keypair data for the derived address
     * @throws Error if wallet is not HD or baseHdNode is not set
     */
    protected abstract _deriveKeypair(
        forChange: boolean,
        index: number,
    ): TKeypair;

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
        if (this.isHD) {
            return Array.from(this.keypairs.keys());
        } else if (this.address) {
            return [this.address];
        }
        return [];
    }

    /**
     * Convert an array of ScriptUtxos to WalletUtxos by deriving the address from outputScript once
     *
     * @param utxos - Array of ScriptUtxos to convert
     * @param outputScript - The output script as a hex string (from ScriptUtxos.outputScript)
     * @returns Array of WalletUtxos with address field added
     */
    protected _convertToWalletUtxos(
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
    protected async _syncHDWallet(): Promise<void> {
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
        this.updateBalance();
    }

    /**
     * Get keypair data for a specific address
     *
     * @param address - The address to look up
     * @returns Keypair data if address is in wallet, undefined otherwise
     */
    public getKeypairForAddress(address: string): TKeypair | undefined {
        return this.keypairs.get(address);
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
     * Check if a script belongs to this wallet.
     * For non-HD wallets, checks against the single address script.
     * For HD wallets, checks against all addresses in keypairs map.
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
     * Check if the address belongs to the wallet.
     * For non-HD wallets, checks against the single address.
     * For HD wallets, checks against all addresses in keypairs map.
     *
     * @param address - The address to check
     * @returns True if the address belongs to the wallet, false otherwise
     */
    public isWalletAddress(address: Address): boolean {
        if (this.isHD) {
            return this.keypairs.has(address.toString());
        }
        return address.toString() === this.address;
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
            let address: Address;
            try {
                address = Address.fromScriptHex(output.outputScript);
            } catch {
                // Skip unsupported output script types
                continue;
            }

            // Check if this address belongs to the wallet
            if (!this.isWalletAddress(address)) {
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
                address: address.toString(),
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
     * Calculate balance and token deltas for a transaction
     *
     * @param tx - The transaction object from chronik-client
     * @returns Whether this is a self-send, balance delta, and token deltas
     */
    public getTxAmounts(tx: ChronikTx): {
        selfSend: boolean;
        balanceSatsDelta: bigint;
        tokenDeltas: Map<string, bigint>;
    } {
        let selfSend = true;
        let balanceSatsDelta = 0n;
        let tokenDeltas = new Map<string, bigint>();

        // Process inputs: account for sats and tokens spent from the wallet
        for (const input of tx.inputs) {
            if (typeof input.outputScript !== 'string') {
                // Skip coinbase inputs
                continue;
            }

            // FIXME this adds an unnecessary hex conversion roundtrip
            if (!this.isWalletScript(new Script(fromHex(input.outputScript)))) {
                // Not from this wallet
                selfSend = false;
                continue;
            }

            balanceSatsDelta -= input.sats;

            if (typeof input.token !== 'undefined' && input.token.atoms > 0n) {
                // Equivalent to tokenDeltas[tokenId] -= atoms but it first
                // creates the entry if it doesn't exist
                tokenDeltas.set(
                    input.token.tokenId,
                    (tokenDeltas.get(input.token.tokenId) ?? 0n) -
                        input.token.atoms,
                );
            }
        }

        // Process outputs: account for sats and tokens received into the wallet
        for (const output of tx.outputs) {
            // FIXME this adds an unnecessary hex conversion roundtrip
            if (
                !this.isWalletScript(new Script(fromHex(output.outputScript)))
            ) {
                // Not for this wallet
                selfSend = false;
                continue;
            }

            balanceSatsDelta += output.sats;

            if (
                typeof output.token !== 'undefined' &&
                output.token.atoms > 0n
            ) {
                // Equivalent to tokenDeltas[tokenId] += atoms but it first
                // creates the entry if it doesn't exist
                tokenDeltas.set(
                    output.token.tokenId,
                    (tokenDeltas.get(output.token.tokenId) ?? 0n) +
                        output.token.atoms,
                );
            }
        }

        // Remove token deltas with 0 atoms
        tokenDeltas = new Map(
            [...tokenDeltas.entries()].filter(([_, atoms]) => atoms !== 0n),
        );

        return { selfSend, balanceSatsDelta, tokenDeltas };
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
        this.balanceSats = WalletBase.sumUtxosSats(balanceSatsOnlyUtxos);
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
