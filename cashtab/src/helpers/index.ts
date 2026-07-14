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
import { Script } from 'ecash-lib';
import appConfig from 'config/app';
import CashtabCache, { CashtabCachedTokenInfo } from 'config/CashtabCache';
import { applyDisplayOverridesToTokenCache } from 'constants/tokenDisplayOverrides';
import { toSatoshis } from 'wallet';

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
 * True when the browser looks like a phone-class Android browser session (not a typical
 * tablet UA, and not the native app — exclude the latter with Capacitor.isNativePlatform()
 * at the call site). Used to promote the Play Store app on Cashtab Web for Android phones.
 */
export const isAndroidMobileWebUserAgent = (
    navigator?: ExtendedNavigator,
): boolean => {
    if (typeof navigator?.userAgent === 'undefined') {
        return false;
    }
    if (!/android/i.test(navigator.userAgent)) {
        return false;
    }
    if (typeof navigator.userAgentData?.mobile !== 'undefined') {
        return navigator.userAgentData.mobile === true;
    }
    return /\bmobile\b/i.test(navigator.userAgent);
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
        tokens: applyDisplayOverridesToTokenCache(
            new Map(storedCashtabCache.tokens),
        ),
    };
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

interface TxInputJson extends Omit<TxInput, 'sats' | 'token'> {
    sats: string;
    token?: TokenJson;
}

interface TxOutputJson extends Omit<TxOutput, 'sats' | 'token'> {
    sats: string;
    token?: TokenJson;
}

interface TokenEntryJson extends Omit<
    TokenEntry,
    'actualBurnAtoms' | 'intentionalBurnAtoms'
> {
    actualBurnAtoms: string;
    intentionalBurnAtoms: string;
}
export interface TxJson extends Omit<
    Tx,
    'inputs' | 'outputs' | 'tokenEntries'
> {
    inputs: TxInputJson[];
    outputs: TxOutputJson[];
    tokenEntries: TokenEntryJson[];
}

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

/**
 * Get desired target outputs from validated user input for eCash multi-send tx in Cashtab
 * Note: Input should be validated with isValidMultiSendUserInput() before calling this function
 * @param userMultisendInput formData.address from Send.js screen, validated for multi-send
 * @returns targetOutputs array with script and sats for each output
 */
export const getMultisendTargetOutputs = (
    userMultisendInput: string,
): Array<{ script: Script; sats: bigint }> => {
    // User input is validated as a string of
    // address, value\naddress, value\naddress, value\n
    const addressValueArray = userMultisendInput.split('\n');

    const targetOutputs: Array<{ script: Script; sats: bigint }> = [];
    for (const addressValueCsvPair of addressValueArray) {
        const addressValueLineArray = addressValueCsvPair.split(',');
        const valueXec = parseFloat(addressValueLineArray[1].trim());
        // targetOutputs expects satoshis at value key
        const valueSats = toSatoshis(valueXec);
        targetOutputs.push({
            script: Script.fromAddress(addressValueLineArray[0].trim()),
            sats: BigInt(valueSats),
        });
    }
    return targetOutputs;
};

export interface TokenMultisendCsvRow {
    address: string;
    decimalizedQty: string;
}

/**
 * Parse token send-to-many textarea (CSV: address,decimalizedTokenQty).
 * Uses the same line rules as {@link isValidTokenMultiSendUserInput}: every split line
 * must be non-empty after trim (no blank rows). Call only after validation returns true;
 * if called with invalid input, throws so behavior cannot diverge from validation.
 * @param userMultisendInput Raw textarea value
 * @returns One row per non-empty line (same count and order as validation)
 * @throws {Error} When a line is empty after trim (message matches validation)
 */
export const parseTokenMultisendRows = (
    userMultisendInput: string,
): TokenMultisendCsvRow[] => {
    const rows: TokenMultisendCsvRow[] = [];
    const inputLines = userMultisendInput.split('\n');
    for (let i = 0; i < inputLines.length; i += 1) {
        if (inputLines[i].trim() === '') {
            throw new Error(`Remove empty row at line ${i + 1}`);
        }
        const parts = inputLines[i].split(',');
        rows.push({
            address: parts[0].trim(),
            decimalizedQty: parts[1].trim(),
        });
    }
    return rows;
};
