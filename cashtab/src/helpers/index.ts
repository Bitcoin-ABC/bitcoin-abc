// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    ScriptUtxo,
    Token,
    Tx,
    TxInput,
    TxOutput,
    TokenEntry,
} from 'chronik-client';
import appConfig from 'config/app';
import CashtabCache, { CashtabCachedTokenInfo } from 'config/CashtabCache';
import {
    StoredCashtabState_Pre_3_42_0,
    CashtabPathInfo,
    StoredCashtabPathInfo,
    LegacyCashtabWallet,
    LegacyPathInfo,
    CashtabTxJson,
    CashtabUtxo,
    CashtabUtxoJson,
    TokenUtxo,
    NonTokenUtxo,
    TokenUtxoJson,
    NonTokenUtxoJson,
    CashtabTx,
    CashtabWalletState_Pre_3_42_0,
    CashtabWallet_Pre_3_41_0,
    StoredCashtabWallet_Pre_3_41_0,
} from 'wallet';
import { CashtabWallet_Pre_2_55_0 } from 'components/App/fixtures/mocks';

/**
 * the userAgentData key is supported by recent
 * versions of Chromium-based browsers
 */
interface ExtendedNavigator extends Navigator {
    userAgentData?: NavigatorUAData;
}
interface NavigatorUAData {
    readonly brands: NavigatorUABrandVersion[];
    readonly mobile: boolean;
    readonly platform: string;
    getHighEntropyValues(hints: string[]): Promise<Record<string, string>>;
}

interface NavigatorUABrandVersion {
    readonly brand: string;
    readonly version: string;
}

/**
 * Call in a web browser. Return true if browser is on a mobile device.
 * Return false if browser is desktop or browser is too old to support navigator.userAgentData
 * @param navigator
 */
export const isMobile = (navigator: ExtendedNavigator): boolean => {
    return (
        typeof navigator?.userAgentData?.mobile !== 'undefined' &&
        navigator.userAgentData.mobile === true
    );
};

/**
 * Call in a web browser. Return user locale if available or default (e.g. 'en-US') if not.
 * @param navigator
 * @returns
 */
export const getUserLocale = (navigator?: ExtendedNavigator): string => {
    if (typeof navigator?.language !== 'undefined') {
        return navigator.language;
    }
    return appConfig.defaultLocale;
};

export interface CashtabCacheJson extends Omit<CashtabCache, 'tokens'> {
    tokens: [string, CashtabCachedTokenInfo][];
}
/**
 * Convert cashtabCache to a JSON for storage
 * @param cashtabCache {tokens: <Map of genesis info by tokenId>}
 */
export const cashtabCacheToJSON = (
    cashtabCache: CashtabCache,
): CashtabCacheJson => {
    return {
        ...cashtabCache,
        tokens: Array.from(cashtabCache.tokens.entries()),
    };
};

/**
 * Convert stored cashtabCache from JSON to more useful data types
 * For now, this means converting the one key 'tokens' from a keyvalue array to a Map
 * @param storedCashtabCache
 */
export const storedCashtabCacheToMap = (
    storedCashtabCache: CashtabCacheJson,
): CashtabCache => {
    return {
        ...storedCashtabCache,
        tokens: new Map(storedCashtabCache.tokens),
    };
};

export interface LegacyStoredCashtabWallet {
    name: string;
    mnemonic: string;
    paths: [number, StoredCashtabPathInfo][];
    state: StoredCashtabState_Pre_3_42_0;
}

/**
 * Convert stored cashtabWallet, which includes Map type stored as keyvalue array to some keys
 * to include actual Maps at these keys
 * @param storedCashtabWallet
 * @returns
 */
export const cashtabWalletFromJSON = (
    storedCashtabWallet: LegacyCashtabWallet | StoredCashtabWallet_Pre_3_41_0,
): LegacyCashtabWallet => {
    // Convert all bigint json'd values in chronik-client
    const revivedSlpUtxos: TokenUtxo[] = [];
    for (const slpUtxo of storedCashtabWallet.state.slpUtxos) {
        revivedSlpUtxos.push(
            scriptUtxoFromJson(slpUtxo as TokenUtxoJson) as TokenUtxo,
        );
    }
    const revivedNonSlpUtxos: NonTokenUtxo[] = [];
    for (const nonSlpUtxo of storedCashtabWallet.state.nonSlpUtxos) {
        revivedNonSlpUtxos.push(
            scriptUtxoFromJson(nonSlpUtxo as NonTokenUtxoJson) as NonTokenUtxo,
        );
    }
    const revivedParsedTxHistory: CashtabTx[] = [];
    for (const parsedTx of storedCashtabWallet.state.parsedTxHistory) {
        const txJson = parsedTx as CashtabTxJson;
        revivedParsedTxHistory.push({
            ...txFromJson(txJson),
            parsed: txJson.parsed,
        } as CashtabTx);
    }

    // If you are pulling a pre-2.9.0 wallet out of storage, no conversion necessary
    // Cashtab will find this wallet invalid and migrate it
    // But, you need to ber able to handle pulling old wallets from storage
    if (
        'Path1899' in storedCashtabWallet ||
        // Pre 2.9.0 wallet
        (Array.isArray(storedCashtabWallet.paths) &&
            storedCashtabWallet.paths.length > 0 &&
            typeof (storedCashtabWallet.paths[0] as LegacyPathInfo).path !==
                'undefined')
    ) {
        storedCashtabWallet.state = {
            ...storedCashtabWallet.state,
            slpUtxos: revivedSlpUtxos,
            nonSlpUtxos: revivedNonSlpUtxos,
            parsedTxHistory: revivedParsedTxHistory,
        } as unknown as CashtabWalletState_Pre_3_42_0;

        return storedCashtabWallet as LegacyCashtabWallet;
    }
    const activeCashtabWalletPathInfos: [number, CashtabPathInfo][] = [];
    for (const [path, storedPathInfo] of (
        storedCashtabWallet as
            | CashtabWallet_Pre_2_55_0
            | StoredCashtabWallet_Pre_3_41_0
    ).paths) {
        if ('sk' in storedPathInfo && 'pk' in storedPathInfo) {
            // If the stored wallet is > 2.55.0, it will have sk and pk fields
            activeCashtabWalletPathInfos.push([
                path,
                {
                    ...storedPathInfo,
                    sk: new Uint8Array(storedPathInfo.sk),
                    pk: new Uint8Array(storedPathInfo.pk),
                },
            ]);
        } else {
            activeCashtabWalletPathInfos.push([
                path,
                // Note we know here that storedPathInfo is actually NOT of CashtabPathInfo type
                // We expect this wallet to be revived as invalid for migration
                storedPathInfo as CashtabPathInfo,
            ]);
        }
    }
    return {
        ...storedCashtabWallet,
        paths: new Map(activeCashtabWalletPathInfos),
        state: {
            ...storedCashtabWallet.state,
            slpUtxos: revivedSlpUtxos,
            nonSlpUtxos: revivedNonSlpUtxos,
            parsedTxHistory: revivedParsedTxHistory,
            tokens: new Map(
                (storedCashtabWallet as CashtabWallet_Pre_3_41_0).state.tokens,
            ),
        },
    } as CashtabWallet_Pre_3_41_0;
};

/**
 * Same as Token except atoms is a string for JSON storage
 */
export interface TokenJson extends Omit<Token, 'atoms'> {
    atoms: string;
}

/**
 * Same as ScriptUtxo except sats is a string for JSON storage
 * And atoms in token is also a string for the same reason
 */
export interface ScriptUtxoJson extends Omit<ScriptUtxo, 'sats' | 'token'> {
    sats: string;
    token?: TokenJson;
}
/**
 * Convert a ScriptUtxo for JSON for localforage
 */
export const scriptUtxoToJson = (
    utxo: TokenUtxo | NonTokenUtxo,
): TokenUtxoJson | NonTokenUtxoJson => {
    const scriptUtxoJson: CashtabUtxoJson = {
        ...utxo,
        sats: utxo.sats.toString(),
    } as CashtabUtxoJson;
    if ('token' in utxo && typeof utxo.token !== 'undefined') {
        scriptUtxoJson.token = {
            ...utxo.token,
            atoms: utxo.token.atoms.toString(),
        };
    }
    return scriptUtxoJson;
};

/**
 * Convert ScriptUtxoJson to ScriptUtxo
 */
export const scriptUtxoFromJson = (utxo: ScriptUtxoJson): CashtabUtxo => {
    const storedSats = BigInt(utxo.sats);

    const scriptUtxo: CashtabUtxo = {
        ...utxo,
        sats: storedSats,
    } as CashtabUtxo;
    if ('value' in scriptUtxo) {
        // Legacy utxo
        delete scriptUtxo.value;
    }
    if ('token' in utxo && typeof utxo.token !== 'undefined') {
        const atoms = BigInt(utxo.token.atoms);

        scriptUtxo.token = {
            ...utxo.token,
            atoms,
        };
        if ('amount' in scriptUtxo.token) {
            // Legacy utxo
            delete scriptUtxo.token.amount;
        }
    }
    return scriptUtxo;
};

interface TxInputJson extends Omit<TxInput, 'sats' | 'token'> {
    sats: string;
    token?: TokenJson;
}

interface TxOutputJson extends Omit<TxOutput, 'sats' | 'token'> {
    sats: string;
    token?: TokenJson;
}

interface TokenEntryJson
    extends Omit<TokenEntry, 'actualBurnAtoms' | 'intentionalBurnAtoms'> {
    actualBurnAtoms: string;
    intentionalBurnAtoms: string;
}
export interface TxJson
    extends Omit<Tx, 'inputs' | 'outputs' | 'tokenEntries'> {
    inputs: TxInputJson[];
    outputs: TxOutputJson[];
    tokenEntries: TokenEntryJson[];
}

export const txToJson = (tx: Tx): TxJson => {
    const txJson: TxJson = { ...tx, inputs: [], outputs: [], tokenEntries: [] };
    const { inputs, outputs, tokenEntries } = tx;
    for (const input of inputs) {
        if (typeof input.token !== 'undefined') {
            txJson.inputs.push({
                ...input,
                sats: input.sats.toString(),
                token: { ...input.token, atoms: input.token.atoms.toString() },
            });
        } else {
            txJson.inputs.push({
                ...input,
                sats: input.sats.toString(),
            } as TxInputJson);
        }
    }
    for (const output of outputs) {
        if (typeof output.token !== 'undefined') {
            txJson.outputs.push({
                ...output,
                sats: output.sats.toString(),
                token: {
                    ...output.token,
                    atoms: output.token.atoms.toString(),
                },
            });
        } else {
            txJson.outputs.push({
                ...output,
                sats: output.sats.toString(),
            } as TxOutputJson);
        }
    }
    for (const entry of tokenEntries) {
        txJson.tokenEntries.push({
            ...entry,
            actualBurnAtoms: entry.actualBurnAtoms.toString(),
            intentionalBurnAtoms: entry.intentionalBurnAtoms.toString(),
        });
    }
    return txJson;
};

export const txFromJson = (txJson: TxJson): Tx => {
    const tx: Tx = { ...txJson, inputs: [], outputs: [], tokenEntries: [] };

    const { inputs, outputs, tokenEntries } = txJson;

    for (const input of inputs) {
        const revivedInput: TxInput = { ...input } as unknown as TxInput;
        const sats = BigInt(input.sats);
        revivedInput.sats = sats;

        if (typeof revivedInput.token !== 'undefined') {
            const atoms = BigInt(revivedInput.token.atoms);
            revivedInput.token.atoms = atoms;
        }
        tx.inputs.push(revivedInput);
    }
    for (const output of outputs) {
        const revivedOutput: TxOutput = { ...output } as unknown as TxOutput;
        const sats = BigInt(output.sats);
        revivedOutput.sats = sats;

        if ('value' in revivedOutput) {
            delete revivedOutput.value;
        }

        if (typeof revivedOutput.token !== 'undefined') {
            const atoms = BigInt(revivedOutput.token.atoms);
            revivedOutput.token.atoms = atoms;
        }
        tx.outputs.push(revivedOutput);
    }
    for (const entry of tokenEntries) {
        const revivedTokenEntry: TokenEntry = {
            ...entry,
        } as unknown as TokenEntry;
        const actualBurnAtoms = BigInt(entry.actualBurnAtoms);
        const intentionalBurnAtoms = BigInt(entry.intentionalBurnAtoms);
        revivedTokenEntry.actualBurnAtoms = actualBurnAtoms;
        revivedTokenEntry.intentionalBurnAtoms = intentionalBurnAtoms;
        tx.tokenEntries.push(revivedTokenEntry);
    }
    return tx;
};

/**
 * Store Map objects as keyvalue arrays before saving in localforage
 * Note: this is only used for legacy wallets and mock management
 * @param cashtabWallet
 */
export const cashtabWalletToJSON = (
    cashtabWallet: LegacyCashtabWallet | CashtabWallet_Pre_3_41_0,
): LegacyStoredCashtabWallet | LegacyCashtabWallet => {
    const storedSlpUtxos: object[] = [];
    for (const slpUtxo of cashtabWallet.state.slpUtxos) {
        storedSlpUtxos.push(
            scriptUtxoToJson(slpUtxo as TokenUtxo) as TokenUtxoJson,
        );
    }
    const storedNonSlpUtxos: NonTokenUtxoJson[] = [];
    for (const nonSlpUtxo of cashtabWallet.state.nonSlpUtxos) {
        storedNonSlpUtxos.push(
            scriptUtxoToJson(nonSlpUtxo as NonTokenUtxo) as NonTokenUtxoJson,
        );
    }
    const storedParsedTxHistory: CashtabTxJson[] = [];
    for (const parsedTx of cashtabWallet.state.parsedTxHistory) {
        storedParsedTxHistory.push({
            ...txToJson(parsedTx as CashtabTx),
            parsed: parsedTx.parsed,
        } as CashtabTxJson);
    }

    if (
        typeof (cashtabWallet as unknown as CashtabWallet_Pre_3_41_0).paths ===
            'undefined' ||
        !(
            (cashtabWallet as unknown as CashtabWallet_Pre_3_41_0)
                .paths instanceof Map
        )
    ) {
        // Cashtab wallets before 2.9.0 were already JSON
        // However with new chronik bigint in mocks, we do need to convert bigint to string
        // Cast it to make LegacyCashtabWallet happy in ts
        cashtabWallet.state = {
            ...cashtabWallet.state,
            slpUtxos: storedSlpUtxos,
            nonSlpUtxos: storedNonSlpUtxos,
            parsedTxHistory: storedParsedTxHistory,
        } as unknown as CashtabWalletState_Pre_3_42_0;

        // We do not plan to ever use this function on such a wallet
        // Handle so we can be sure no errors are thrown
        return cashtabWallet as LegacyCashtabWallet;
    }

    // Convert sk and pk from Uint8Array to Array for JSON storage
    // Note that we only expect valid CashtabWallet type here, Legacy handled above
    // And in practice, we do not expect to ever store legacy type as they are migrated on app startup
    const storedCashtabPaths: [number, StoredCashtabPathInfo][] = [];
    (cashtabWallet as CashtabWallet_Pre_3_41_0).paths.forEach(
        (pathInfo, path) => {
            storedCashtabPaths.push([
                path,
                'sk' in pathInfo && 'pk' in pathInfo
                    ? {
                          ...pathInfo,
                          sk: Array.from(pathInfo.sk),
                          pk: Array.from(pathInfo.pk),
                      }
                    : pathInfo,
            ]);
        },
    );

    return {
        ...(cashtabWallet as CashtabWallet_Pre_3_41_0),
        paths: storedCashtabPaths,
        state: {
            ...(cashtabWallet.state as unknown as StoredCashtabState_Pre_3_42_0),
            slpUtxos: storedSlpUtxos,
            nonSlpUtxos: storedNonSlpUtxos,
            parsedTxHistory: storedParsedTxHistory,
            tokens: Array.from(
                (
                    cashtabWallet as CashtabWallet_Pre_3_41_0
                ).state.tokens.entries(),
            ),
        },
    } as unknown as LegacyStoredCashtabWallet;
};

/**
 * Get the width of a given string of text
 * Useful to customize the width of a component according to the size of displayed text
 *
 * Note
 * It is not practical to unit test this function as document is an html document
 * @param document document global of a rendered web page
 * @param text text to get width of
 * @param font e.g. '16px Poppins'
 * @returns pixel width of text
 */
export const getTextWidth = (
    document: Document,
    text: string,
    font: string,
): number => {
    try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context !== null) {
            context.font = font || getComputedStyle(document.body).font;
            return context.measureText(text).width;
        }
        return 200;
    } catch {
        // If we do not have access to HTML methods, e.g. if we are in the test environment
        // Return a hard-coded width
        return 200;
    }
};

/**
 * Create a standardized preview of an address for display purposes
 * @param address Full address string (e.g., "ecash:qzs4zzxs0gvfrc6e2wqhkmvj4dmmh332cvfpd7yjep")
 * @returns Abbreviated address in format "XXX...XXX" (e.g., "qzs...jep")
 */
export const previewAddress = (address: string): string => {
    // Remove the "ecash:" prefix and get the address part
    const addressWithoutPrefix = address.includes(':')
        ? address.split(':')[1]
        : address;

    return `${addressWithoutPrefix.slice(0, 3)}...${addressWithoutPrefix.slice(
        -3,
    )}`;
};

/**
 * Create a standardized preview of a token ID for display purposes
 * @param tokenId Full token ID string (e.g., "50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e")
 * @returns Abbreviated token ID in format "XXX...XXX" (e.g., "50d...10e")
 */
export const previewTokenId = (tokenId: string): string => {
    return `${tokenId.slice(0, 3)}...${tokenId.slice(-3)}`;
};

/**
 * Create a standardized preview of a Sol address for display purposes
 * @param solAddr Full Sol address string
 * @returns Abbreviated Sol address in format "XXX...XXX" (e.g., "abc...xyz")
 */
export const previewSolAddr = (solAddr: string): string => {
    return `${solAddr.slice(0, 3)}...${solAddr.slice(-3)}`;
};
