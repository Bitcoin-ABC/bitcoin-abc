// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    Script,
    Address,
    HdNode,
    Ecc,
    fromHex,
    toHex,
    COINBASE_MATURITY,
} from 'ecash-lib';
import {
    BatchSummaryRow,
    ChronikClient,
    ScriptRef,
    ScriptUtxo,
    ScriptUtxos,
    Tx as ChronikTx,
} from 'chronik-client';
import { WalletUtxo } from './wallet';

/** Chronik HTTP batch limit for `/script/batch/utxos` and `/script/batch/summary`. */
const CHRONIK_BATCH_UTXOS_MAX_SCRIPTS = 500;

/**
 * BIP44-style default gap limit for HD address discovery.
 * Matches Electrum-ABC (`GAP_LIMIT = 20`).
 */
export const DEFAULT_GAP_LIMIT = 20;

/** Options for {@link WalletBase.syncAndDiscoverAddresses}. */
export interface SyncAndDiscoverOptions {
    /**
     * Stop scanning each chain after this many consecutive unused addresses.
     * Used when {@link receiveGapLimit} / {@link changeGapLimit} are omitted.
     * Defaults to {@link DEFAULT_GAP_LIMIT}.
     */
    gapLimit?: number;
    /**
     * Gap limit for the receive chain (`0/`).
     * Defaults to {@link gapLimit} or {@link DEFAULT_GAP_LIMIT}.
     */
    receiveGapLimit?: number;
    /**
     * Gap limit for the change chain (`1/`).
     * Defaults to {@link gapLimit} or {@link DEFAULT_GAP_LIMIT}.
     * Apps that distribute many receive addresses but rarely send may want a
     * larger receive gap than change gap.
     */
    changeGapLimit?: number;
    /**
     * First receive index to scan (inclusive). Defaults to `0`.
     * Pass a persisted next-receive index to avoid re-scanning from zero.
     */
    startReceiveIndex?: number;
    /**
     * First change index to scan (inclusive). Defaults to `0`.
     * Pass a persisted next-change index to avoid re-scanning from zero.
     */
    startChangeIndex?: number;
    /**
     * Optional hook invoked for each address when gap discovery has Chronik
     * batch-summary data for that address (requires `POST /script/batch/summary`,
     * Chronik server >= 0.33.4). Not invoked when discovery falls back to
     * per-script queries. Stops for a chain once that chain's gap limit is
     * reached (after the callback for the gap-completing address).
     */
    onAddress?: OnAddressFn;
}

/** One HD address considered during gap-limit discovery. */
export interface AddressSummary {
    forChange: boolean;
    index: number;
    address: string;
    summary: BatchSummaryRow;
}

/** Called for each row during {@link SyncAndDiscoverOptions} gap discovery. */
export type OnAddressFn = (entry: AddressSummary) => void;

interface ResolvedGapSearchOptions {
    receiveGapLimit: number;
    changeGapLimit: number;
    startReceiveIndex: number;
    startChangeIndex: number;
    onAddress?: OnAddressFn;
}

/**
 * Subset of coinbase outputs that are allowed as transaction inputs: `isCoinbase` and buried
 * under at least {@link COINBASE_MATURITY} blocks relative to `tipHeight`.
 *
 * Used by spendable UTXO helpers; immature coinbase is excluded.
 *
 * @param utxos - Candidate UTXOs (typically the wallet’s full synced set).
 * @param tipHeight - Chain tip height from the same sync as `utxos` (e.g. Chronik `blockchainInfo().tipHeight`).
 */
function filterMatureCoinbaseUtxos(
    utxos: Iterable<WalletUtxo>,
    tipHeight: number,
): WalletUtxo[] {
    return [...utxos].filter(
        utxo =>
            utxo.isCoinbase === true &&
            tipHeight - utxo.blockHeight >= COINBASE_MATURITY,
    );
}

/**
 * UTXOs safe to use as **plain XEC** inputs (no token coloring): non-coinbase outputs without a
 * `token` field, **plus** mature coinbase outputs that also have no token.
 *
 * Immature coinbase is excluded; coinbase with tokens is excluded from the “sats-only” path.
 *
 * @param utxos - Wallet UTXO set.
 * @param tipHeight - Chain tip for coinbase maturity (see {@link filterMatureCoinbaseUtxos}).
 */
function filterSpendableSatsOnlyUtxos(
    utxos: Iterable<WalletUtxo>,
    tipHeight: number,
): WalletUtxo[] {
    const list = [...utxos];
    return list
        .filter(
            utxo =>
                typeof utxo.token === 'undefined' && utxo.isCoinbase === false,
        )
        .concat(
            filterMatureCoinbaseUtxos(list, tipHeight).filter(
                utxo => typeof utxo.token === 'undefined',
            ),
        );
}

/**
 * All UTXOs that may be spent as inputs for generic coin-selection: every **non-coinbase** output
 * (including token outputs), union **mature coinbase** outputs (token or not).
 *
 * Differs from {@link filterSpendableSatsOnlyUtxos}: this includes token-colored UTXOs and does
 * not require `token` to be absent.
 *
 * @param utxos - Wallet UTXO set.
 * @param tipHeight - Chain tip for coinbase maturity (see {@link filterMatureCoinbaseUtxos}).
 */
function filterSpendableUtxos(
    utxos: Iterable<WalletUtxo>,
    tipHeight: number,
): WalletUtxo[] {
    const list = [...utxos];
    return list
        .filter(utxo => utxo.isCoinbase === false)
        .concat(filterMatureCoinbaseUtxos(list, tipHeight));
}

/**
 * Base class for wallet implementations (Wallet, WatchOnlyWallet, MultisigWallet).
 * Contains common properties and methods shared between them.
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
    /** Prefix of the address */
    prefix: string;
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

    /**
     * Chain tip height from last successful {@link sync} (for coinbase maturity).
     * Subclasses update this when they refresh UTXOs. Defaults to `0` (no coinbase spendable).
     */
    tipHeight = 0;

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
        this.prefix = address
            ? (Address.fromCashAddress(this.address).prefix ?? 'ecash')
            : 'ecash';
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
     * Get all scripts (as ChronikClient ScriptRef values) currently cached in
     * the keypairs map.
     *
     * @returns Array of ScriptRef values
     */
    public getAllScripts(): ScriptRef[] {
        if (this.isHD) {
            return Array.from(this.keypairs.values()).map(kp => ({
                scriptType: 'p2pkh',
                payload: toHex(kp.pkh),
            }));
        }
        if (this.address) {
            return [{ scriptType: 'p2pkh', payload: toHex(this.pkh) }];
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
        const address = Address.fromScriptHex(
            outputScript,
            this.prefix,
        ).toString();

        // Add address to all UTXOs
        return utxos.map(utxo => ({
            ...utxo,
            address,
        }));
    }

    /**
     * Whether a Chronik batch-summary row indicates the script has been used
     * (any history and/or any UTXOs). History matters so spent-but-empty
     * addresses still advance the gap scan.
     */
    private _isScriptUsedFromSummary(row: BatchSummaryRow): boolean {
        return row.numTxs > 0 || row.numUtxos > 0;
    }

    /**
     * Query Chronik for whether a single script has been used (history or UTXOs).
     * Throws if Chronik cannot be queried — never treats transport errors as unused.
     */
    private async _queryScriptUsed(script: ScriptRef): Promise<boolean> {
        let historyError: unknown;
        try {
            const history = await this.chronik
                .script(script.scriptType, script.payload)
                .history(0, 1);
            if (history.numTxs > 0) {
                return true;
            }
        } catch (err) {
            historyError = err;
        }

        try {
            const utxos = await this.chronik
                .script(script.scriptType, script.payload)
                .utxos();
            return utxos.utxos.length > 0;
        } catch (utxoError) {
            // Prefer the history error if both failed; never report "unused"
            // when Chronik is unreachable — that would truncate gap discovery.
            throw historyError ?? utxoError;
        }
    }

    /**
     * Query Chronik for whether each script has been used.
     * Prefers `batchSummary`; falls back to per-script `history` (+ utxos) if
     * the batch endpoint is unavailable.
     *
     * @param scripts - Scripts to check (order preserved in the result)
     * @returns An object with `usedFlags` indicating if each script was used,
     *   and the fetched Chronik batch summary `rows` (which may be empty
     *   if falling back to per-script checks).
     */
    private async _queryScriptsBatchSummary(scripts: ScriptRef[]): Promise<{
        usedFlags: boolean[];
        rows: BatchSummaryRow[];
    }> {
        if (scripts.length === 0) {
            return { usedFlags: [], rows: [] };
        }

        try {
            const rows: BatchSummaryRow[] = [];
            const remaining = [...scripts];
            const batchPromises: Promise<BatchSummaryRow[]>[] = [];
            while (remaining.length > 0) {
                batchPromises.push(
                    this.chronik.batchSummary(
                        remaining.splice(0, CHRONIK_BATCH_UTXOS_MAX_SCRIPTS),
                    ),
                );
            }
            const chunks = await Promise.all(batchPromises);
            for (const chunk of chunks) {
                rows.push(...chunk);
            }
            return {
                usedFlags: rows.map(row => this._isScriptUsedFromSummary(row)),
                rows,
            };
        } catch {
            const usedFlags = await Promise.all(
                scripts.map(script => this._queryScriptUsed(script)),
            );
            return { usedFlags, rows: [] };
        }
    }

    /**
     * Scan one HD chain (receive or change) with a BIP44 gap limit.
     * Updates `receiveIndex` / `changeIndex` to at least `highestUsed + 1`
     * (never decreases an already-higher index).
     *
     * @param forChange - true for change chain (1/), false for receive (0/)
     * @param gapLimit - consecutive unused addresses required to stop
     * @param startIndex - first index to scan (inclusive); treat
     *   `startIndex - 1` as already known-used for gap purposes
     */
    protected async _discoverHDChain(
        forChange: boolean,
        gapLimit: number,
        startIndex: number = 0,
        onAddress?: OnAddressFn,
    ): Promise<void> {
        let consecutiveUnused = 0;

        let index = startIndex;
        while (consecutiveUnused < gapLimit) {
            // Always use Chronik's max batch size. HD derive is ~0.27ms/addr
            // locally, so filling 500 scripts is cheaper than an extra RTT —
            // important for large wallets with long used prefixes.
            const batchCount = CHRONIK_BATCH_UTXOS_MAX_SCRIPTS;
            const scripts: ScriptRef[] = [];
            for (let i = 0; i < batchCount; i++) {
                const address = forChange
                    ? this.getChangeAddress(index + i)
                    : this.getReceiveAddress(index + i);
                const keypair = this.keypairs.get(address);
                if (!keypair) {
                    throw new Error(
                        `Missing keypair for discovered address ${address}`,
                    );
                }
                scripts.push({
                    scriptType: 'p2pkh',
                    payload: toHex(keypair.pkh),
                });
            }

            const { usedFlags, rows } =
                await this._queryScriptsBatchSummary(scripts);

            for (let i = 0; i < usedFlags.length; i++) {
                const summary = rows[i];
                if (onAddress && summary) {
                    onAddress({
                        forChange,
                        index,
                        // The address is cached so this call is mostly free
                        address: forChange
                            ? this.getChangeAddress(index)
                            : this.getReceiveAddress(index),
                        summary,
                    });
                }

                if (usedFlags[i]) {
                    consecutiveUnused = 0;
                } else {
                    consecutiveUnused++;
                }

                if (consecutiveUnused >= gapLimit) {
                    break;
                }

                index++;
            }
        }

        const nextIndex = index - gapLimit + 1;
        if (forChange) {
            this.changeIndex = Math.max(this.changeIndex, nextIndex);
        } else {
            this.receiveIndex = Math.max(this.receiveIndex, nextIndex);
        }
    }

    /**
     * Resolve and validate gap-discovery options.
     *
     * @param options - Raw {@link SyncAndDiscoverOptions}
     * @throws Error if any option value is invalid
     */
    private _resolveGapSearchOptions(
        options?: SyncAndDiscoverOptions,
    ): ResolvedGapSearchOptions {
        const receiveGapLimit =
            options?.receiveGapLimit ?? options?.gapLimit ?? DEFAULT_GAP_LIMIT;
        const changeGapLimit =
            options?.changeGapLimit ?? options?.gapLimit ?? DEFAULT_GAP_LIMIT;
        const startReceiveIndex = options?.startReceiveIndex ?? 0;
        const startChangeIndex = options?.startChangeIndex ?? 0;

        const assertPositiveInt = (name: string, value: number) => {
            if (!Number.isInteger(value) || value < 1) {
                throw new Error(`${name} must be a positive integer`);
            }
        };
        const assertNonNegativeInt = (name: string, value: number) => {
            if (!Number.isInteger(value) || value < 0) {
                throw new Error(`${name} must be a non-negative integer`);
            }
        };
        assertPositiveInt('receiveGapLimit', receiveGapLimit);
        assertPositiveInt('changeGapLimit', changeGapLimit);
        assertNonNegativeInt('startReceiveIndex', startReceiveIndex);
        assertNonNegativeInt('startChangeIndex', startChangeIndex);

        return {
            receiveGapLimit,
            changeGapLimit,
            startReceiveIndex,
            startChangeIndex,
            onAddress: options?.onAddress,
        };
    }

    /**
     * Discover receive and change indices via gap-limit scanning.
     * Does not fetch the full UTXO set; call {@link _syncHDWallet} after.
     * Receive and change chains are scanned concurrently.
     */
    protected async _discoverHDIndices(
        options: ResolvedGapSearchOptions,
    ): Promise<void> {
        const {
            receiveGapLimit,
            changeGapLimit,
            startReceiveIndex,
            startChangeIndex,
            onAddress,
        } = options;

        await Promise.all([
            this._discoverHDChain(
                false,
                receiveGapLimit,
                startReceiveIndex,
                onAddress,
            ),
            this._discoverHDChain(
                true,
                changeGapLimit,
                startChangeIndex,
                onAddress,
            ),
        ]);
    }

    /**
     * Discover HD receive/change indices with a gap limit, then sync UTXOs.
     *
     * Use when restoring a wallet with unknown indices (e.g. from mnemonic or
     * xpub only). Scans each chain from the start index until the chain's gap
     * limit of consecutive unused addresses is found (BIP44 / Electrum-ABC
     * style). An address is "used" if Chronik reports any tx history or any
     * UTXOs.
     *
     * Gap lookahead addresses derived during the scan (the unused addresses
     * past the highest used index, and any extras from large Chronik batches)
     * remain cached in `keypairs`. That is intentional: once derived, keep
     * them. UTXO sync still only queries addresses at or below the discovered
     * `receiveIndex` / `changeIndex`.
     *
     * Normal {@link sync} assumes indices are already correct and does not
     * perform gap-limit discovery.
     *
     * @param options - Gap limits, optional start indexes, optional per-row
     *                  hook
     * @throws Error if the wallet is not HD, or if options are invalid
     */
    public async syncAndDiscoverAddresses(
        options?: SyncAndDiscoverOptions,
    ): Promise<void> {
        if (!this.isHD) {
            throw new Error(
                'syncAndDiscoverAddresses can only be called on HD wallets',
            );
        }

        await this._discoverHDIndices(this._resolveGapSearchOptions(options));
        await this._syncHDWallet();
    }

    /**
     * Scripts for addresses at or below current HD indices only.
     * Ignores any gap-lookahead addresses cached in `keypairs` beyond the
     * active receive/change indices (e.g. after {@link syncAndDiscoverAddresses}).
     */
    private _scriptsAtOrBelowIndices(): ScriptRef[] {
        const scripts: ScriptRef[] = [];
        for (let i = 0; i <= this.receiveIndex; i++) {
            const address = this.getReceiveAddress(i);
            const keypair = this.keypairs.get(address);
            if (!keypair) {
                throw new Error(
                    `Missing keypair for receive address ${address}`,
                );
            }
            scripts.push({
                scriptType: 'p2pkh',
                payload: toHex(keypair.pkh),
            });
        }
        for (let i = 0; i <= this.changeIndex; i++) {
            const address = this.getChangeAddress(i);
            const keypair = this.keypairs.get(address);
            if (!keypair) {
                throw new Error(
                    `Missing keypair for change address ${address}`,
                );
            }
            scripts.push({
                scriptType: 'p2pkh',
                payload: toHex(keypair.pkh),
            });
        }
        return scripts;
    }

    /**
     * Sync HD wallet: query UTXOs for all addresses at or below current indices
     * (receive addresses 0 to receiveIndex, change addresses 0 to changeIndex).
     *
     * Assumes receiveIndex and changeIndex are already correct. Use
     * {@link syncAndDiscoverAddresses} when indices are unknown.
     *
     * Ignores any gap-lookahead addresses cached in `keypairs` beyond the
     * active indices (e.g. after discovery).
     */
    protected async _syncHDWallet(): Promise<void> {
        // Derive and sync only addresses at or below current indices.
        // Do not use getAllScripts(): discovery may have cached unused gap
        // lookahead addresses beyond receiveIndex/changeIndex.
        const allScripts = this._scriptsAtOrBelowIndices();

        if (allScripts.length === 0) {
            // No script no utxo.
            this.utxos = [];
            this.updateBalance();
            return;
        }

        // Prefer batch UTXOs; fall back to per-address requests if unsupported
        // or on error.
        let utxoResults: ScriptUtxos[];
        try {
            const batchUtxosPromises = [];
            // Copy so splice does not mutate allScripts (needed for fallback).
            const scriptsToBatch = [...allScripts];
            while (scriptsToBatch.length > 0) {
                batchUtxosPromises.push(
                    this.chronik.batchUtxos(
                        scriptsToBatch.splice(
                            0,
                            CHRONIK_BATCH_UTXOS_MAX_SCRIPTS,
                        ),
                    ),
                );
            }

            const batchRowsChunks = await Promise.all(batchUtxosPromises);
            utxoResults = batchRowsChunks.flat().map(row => row.utxos);
        } catch {
            // Fallback to a non-batch request if the batch request failed (aka
            // is not available from the connected Chronik instance).
            utxoResults = await Promise.all(
                allScripts.map(script =>
                    this.chronik
                        .script(script.scriptType, script.payload)
                        .utxos(),
                ),
            );
        }

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
        this.tipHeight = (await this.chronik.blockchainInfo()).tipHeight;
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
                address = Address.fromScriptHex(
                    output.outputScript,
                    this.prefix,
                );
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
     * Spendable sats-only UTXOs (no token): non-coinbase outputs without tokens, plus mature
     * coinbase without tokens. Uses {@link tipHeight} from the last {@link sync}.
     */
    public spendableSatsOnlyUtxos(): WalletUtxo[] {
        return filterSpendableSatsOnlyUtxos(this.utxos, this.tipHeight);
    }

    /**
     * Spendable UTXOs including tokens: non-coinbase or mature coinbase.
     * Uses {@link tipHeight} from the last {@link sync}.
     */
    public spendableUtxos(): WalletUtxo[] {
        return filterSpendableUtxos(this.utxos, this.tipHeight);
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
