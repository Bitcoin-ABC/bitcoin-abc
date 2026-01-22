// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import BigNumber from 'bignumber.js';
import randomBytes from 'randombytes';
import { ChronikClient } from 'chronik-client';
import { encodeCashAddress, decodeCashAddress } from 'ecashaddrjs';
import appConfig from 'config/app';
import {
    fromHex,
    HdNode,
    shaRmd160,
    toHex,
    entropyToMnemonic,
    mnemonicToSeed,
} from 'ecash-lib';
import * as englishWordlist from 'ecash-lib/wordlists/english.json';
import { Token, Tx, ScriptUtxo } from 'chronik-client';
import { ParsedTx, getTokenBalances } from 'chronik';
import {
    CashtabWallet_Pre_2_1_0,
    CashtabWallet_Pre_2_9_0,
    CashtabWallet_Pre_2_55_0,
    PathInfo_Pre_2_55_0,
} from 'components/App/fixtures/mocks';
import { previewAddress, TxJson, TokenJson } from 'helpers';

export type SlpDecimals = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface CashtabPathInfo {
    address: string;
    hash: string;
    wif: string;
    /**
     * Public key as a hex string
     * Introduced in 2.55.0
     * Cashtab migrates legacy wallets to this
     */
    pk: Uint8Array;
    /**
     * Private key as a hex string
     * Introduced in 2.55.0
     * Cashtab migrates legacy wallets to this
     */
    sk: Uint8Array;
}
export interface StoredCashtabPathInfo {
    address: string;
    hash: string;
    wif: string;
    /**
     * Public key as a hex string
     * Introduced in 2.55.0
     * Cashtab migrates legacy wallets to this
     */
    pk: number[];
    /**
     * Private key as a hex string
     * Introduced in 2.55.0
     * Cashtab migrates legacy wallets to this
     */
    sk: number[];
}
export interface CashtabWalletState_Pre_3_42_0 {
    balanceSats: number;
    nonSlpUtxos: NonTokenUtxo[];
    slpUtxos: TokenUtxo[];
    tokens: Map<string, string>;
    parsedTxHistory: CashtabTx[];
}

export interface CashtabWalletState {
    balanceSats: number;
    nonSlpUtxos: NonTokenUtxo[];
    slpUtxos: TokenUtxo[];
    tokens: Map<string, string>;
}
export interface StoredCashtabState_Pre_3_42_0 extends Omit<
    CashtabWalletState_Pre_3_42_0,
    'tokens' | 'slpUtxos' | 'nonSlpUtxos'
> {
    tokens: [string, string][];
    slpUtxos: object[];
    nonSlpUtxos: object[];
}
export interface ScriptUtxoWithToken extends ScriptUtxo {
    token: Token;
}
export type NonTokenUtxo = Omit<ScriptUtxo, 'token'>;

export interface NonTokenUtxoJson extends Omit<NonTokenUtxo, 'sats'> {
    sats: string;
}

export interface TokenUtxo extends NonTokenUtxo {
    token: Token;
}

export interface TokenUtxoJson extends Omit<NonTokenUtxoJson, 'token'> {
    token: TokenJson;
}

export interface LegacyTokenJson extends Omit<TokenJson, 'atoms'> {
    amount: string;
}
export interface LegacyTokenUtxoJson extends Omit<
    TokenUtxoJson,
    'sats' | 'token'
> {
    value: number;
    token: LegacyTokenJson;
}

export interface CashtabUtxo extends NonTokenUtxo {
    token?: Token;
}

export interface CashtabUtxoJson extends NonTokenUtxoJson {
    token?: TokenJson;
}

export interface CashtabTx extends Tx {
    parsed: ParsedTx;
}
export interface CashtabTxJson extends TxJson {
    parsed: ParsedTx;
}
export interface CashtabWalletPaths extends Map<number, CashtabPathInfo> {
    // Assert that path 1899, the default path, is always defined
    get(key: 1899): CashtabPathInfo;
    // For all other keys, it might return undefined
    get(key: number): CashtabPathInfo | undefined;
}
export interface CashtabWallet_Pre_3_41_0 {
    name: string;
    mnemonic: string;
    // Path 1899 is always defined
    paths: CashtabWalletPaths;
    state: CashtabWalletState_Pre_3_42_0;
}
export interface StoredCashtabWallet_Pre_3_41_0 {
    name: string;
    mnemonic: string;
    paths: [number, StoredCashtabPathInfo][];
    state: StoredCashtabState_Pre_3_42_0;
}

export interface LegacyTokenJson extends Omit<TokenJson, 'atoms'> {
    amount: string;
}
/**
 * Minimal storage interface for a wallet
 * Note that all we really need is name and mnemonic, as we can derive the rest from mnemonic
 * However, since we never expect that info to change, it is convenient and lightweight to save ourselves from so much derivation
 *
 * We may, for example, wish to ws subscribe to all wallet addresses to show notifications if txs are received at the inactive wallet
 */
export interface StoredCashtabWallet {
    name: string;
    mnemonic: string;
    // Store as hex string to save JSON conversions for storage
    sk: string;
    // Store as hex string to save JSON conversions for storage
    pk: string;
    address: string;
    hash: string;
}

const SATOSHIS_PER_XEC = 100;
const NANOSATS_PER_XEC = new BigNumber(1e11);
const STRINGIFIED_INTEGER_REGEX = /^[0-9]+$/;

const SCI_REGEX_POSTIIVE = /^(\d*\.?\d+)e([+-]?\d+)$/i;
export const STRINGIFIED_DECIMALIZED_REGEX = /^\d*\.?\d*$/;

export const DUMMY_KEYPAIR = {
    sk: fromHex('33'.repeat(32)),
    pk: fromHex(
        '023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1',
    ),
};
/**
 * Convert an amount in XEC to satoshis
 * @param xecAmount a number with no more than 2 decimal places
 */
export const toSatoshis = (xecAmount: number): number => {
    const satoshis = new BigNumber(xecAmount)
        .times(SATOSHIS_PER_XEC)
        .toNumber();
    if (!Number.isInteger(satoshis)) {
        throw new Error(
            'Result not an integer. Check input for valid XEC amount.',
        );
    }
    return satoshis;
};

/**
 * Convert an amount in satoshis to XEC
 * @param satoshis
 */
export const toXec = (satoshis: bigint | number): number => {
    if (typeof satoshis === 'bigint') {
        satoshis = parseInt(satoshis.toString());
    }
    if (!Number.isInteger(satoshis)) {
        throw new Error('Input param satoshis must be an integer');
    }
    return new BigNumber(satoshis).div(SATOSHIS_PER_XEC).toNumber();
};

/**
 * Convert an amount in nanosatoshis to XEC
 * @param nanosats
 */
export const nanoSatoshisToXec = (nanosats: bigint): number => {
    if (typeof nanosats !== 'bigint') {
        throw new Error('Input param nanosats must be a bigint');
    }
    return new BigNumber(nanosats.toString()).div(NANOSATS_PER_XEC).toNumber();
};

/**
 * xecToNanoSatoshis
 * Note that, because this function may accept prices much lower than one XEC
 * xecAmount may not be in units of XEC
 * Given over-precise XEC values, this function will round to the nearest nanosat
 * @param xecAmount
 */
export const xecToNanoSatoshis = (xecAmount: number | BigNumber): bigint => {
    const nanosats = BigInt(
        new BigNumber(xecAmount)
            .times(NANOSATS_PER_XEC)
            .integerValue(BigNumber.ROUND_HALF_UP)
            .toFixed(0),
    );

    return nanosats;
};

/**
 * Determine if a given wallet has enough of a certain token to unlock a feature
 * @param tokens decimalized balance summary tokens reference from wallet.state
 * @param tokenId tokenId of the token we are checking
 * @param tokenQty quantity of the token required for unlock, decimalized string
 */
export const hasEnoughToken = (
    tokens: Map<string, string>,
    tokenId: string,
    tokenQty: string,
): boolean => {
    // Filter for tokenId
    const thisTokenBalance = tokens.get(tokenId);
    // Confirm we have this token at all
    if (typeof thisTokenBalance === 'undefined') {
        return false;
    }
    return new BigNumber(thisTokenBalance).gte(tokenQty);
};

/**
 * Cashtab wallet
 * We keep this in state; only name and mnemonic are stored
 */
export interface ActiveCashtabWallet extends StoredCashtabWallet {
    state: CashtabWalletState;
}
/**
 * Create a Cashtab wallet object from a valid BIP39 mnemonic
 * We only store wallet name and mnemonic, and we keep a CashtabWallet in state for processing
 * This will be replaced by Wallet from the ecash-wallet lib when feature parity is reached there
 * @param mnemonic a valid BIP39 mnemonic
 * @param ecc
 * Default to 1899-only for all new wallets
 * Accept an array, in case we are migrating a wallet with legacy paths 145, 245, or both 145 and 245
 */
export const createCashtabWallet = (
    mnemonic: string,
    name?: string,
): StoredCashtabWallet => {
    const rootSeedBuffer = mnemonicToSeed(mnemonic, '');
    const masterHDNode = HdNode.fromSeed(rootSeedBuffer);
    const fullDerivationPath = `m/44'/${appConfig.derivationPath}'/0'/0/0`;
    const node = masterHDNode.derivePath(fullDerivationPath);
    const address = encodeCashAddress(
        appConfig.prefix,
        'p2pkh',
        shaRmd160(node.pubkey()),
    );
    const pk = toHex(node.pubkey());
    const { hash } = decodeCashAddress(address);
    const sk = toHex(node.seckey()!);

    return {
        name: name || previewAddress(address),
        mnemonic,
        sk,
        pk,
        address,
        hash,
    };
};

/**
 * Generate tokens map from ecash-wallet UTXOs
 * Filters token UTXOs from the wallet's UTXO set and calculates balances
 * @param chronik ChronikClient instance
 * @param walletUtxos UTXOs from ecash-wallet (ScriptUtxo[])
 * @param tokenCache Cashtab's token cache
 * @returns Map of tokenId => decimalized balance string
 */
export const generateTokensFromWalletUtxos = async (
    chronik: ChronikClient,
    walletUtxos: ScriptUtxo[],
    tokenCache: Map<string, CashtabCachedTokenInfo>,
): Promise<Map<string, string>> => {
    // Filter for token UTXOs (those with a token property)
    const tokenUtxos = walletUtxos.filter(
        (utxo): utxo is TokenUtxo => utxo.token !== undefined,
    );
    // Use existing getTokenBalances function to calculate balances
    const result = await getTokenBalances(chronik, tokenUtxos, tokenCache);
    return result;
};

/**
 * Generate a mnemonic using ecash-lib (replaces bip39)
 * This function generates a 12-word mnemonic (128 bits of entropy)
 */
export const generateMnemonic = (): string => {
    // Generate 16 bytes (128 bits) of entropy
    const entropy = randomBytes(16);
    // Convert entropy to mnemonic using ecash-lib
    const mnemonic = entropyToMnemonic(entropy, englishWordlist);
    return mnemonic;
};

/**
 * Convert user input send amount to satoshis
 * @param sendAmountFiat User input amount of fiat currency to send.
 * Input from an amount field is of type number. If we extend fiat send support to bip21 or
 * webapp txs, we should also handle string inputs
 * @param fiatPrice Price of XEC in units of selectedCurrency / XEC
 * @return satoshis value equivalent to this sendAmountFiat at exchange rate fiatPrice
 */
export const fiatToSatoshis = (
    sendAmountFiat: string | number,
    fiatPrice: number,
): number => {
    return Math.floor((Number(sendAmountFiat) / fiatPrice) * SATOSHIS_PER_XEC);
};

/**
 * A user who has not opened Cashtab in some time may have a legacy wallet
 * The wallet shape has changed a few times
 * Cashtab is designed so that a user starting up the app with legacy wallet(s)
 * in storage will have them all migrated on startup
 * So, if cashtabWalletFromJSON is called with a legacy wallet, it returns the
 * wallet as-is so it can be invalidated and recreated
 */
export interface LegacyPathInfo extends PathInfo_Pre_2_55_0 {
    path: number;
}

export type LegacyCashtabWallet =
    | CashtabWallet_Pre_2_1_0
    | CashtabWallet_Pre_2_9_0
    | CashtabWallet_Pre_2_55_0;

/**
 * Convert a token amount like one from an in-node chronik utxo to a decimalized string
 * @param amount undecimalized token amount as a string, e.g. 10012345 at 5 decimals
 * @param decimals
 * @returns decimalized token amount as a string, e.g. 100.12345
 */
export const decimalizeTokenAmount = (
    amount: string,
    decimals: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
): string => {
    if (typeof amount !== 'string') {
        throw new Error('amount must be a string');
    }

    // Test for scientific notation
    if (SCI_REGEX_POSTIIVE.test(amount)) {
        amount = sciToDecimal(amount);
    }

    if (!STRINGIFIED_INTEGER_REGEX.test(amount)) {
        // If scientific notation, use a different aproach
        //TODO
        throw new Error('amount must be a stringified integer');
    }
    if (!Number.isInteger(decimals)) {
        throw new Error('decimals must be an integer');
    }
    if (decimals === 0) {
        // If we have 0 decimal places, and amount is a stringified integer
        // amount is already correct
        return amount;
    }

    // Do you need to pad with leading 0's?
    // For example, you have have "1" with 9 decimal places
    // This should be 0.000000001 strlength 1, decimals 9
    // So, you must add 9 zeros before the 1 before proceeding
    // You may have "123" with 9 decimal places strlength 3, decimals 9
    // This should be 0.000000123
    // So, you must add 7 zeros before the 123 before proceeding
    if (decimals > amount.length) {
        // We pad with decimals - amount.length 0s, plus an extra zero so we return "0.000" instead of ".000"
        amount = `${new Array(decimals - amount.length + 1)
            .fill(0)
            .join('')}${amount}`;
    }

    // Insert decimal point in proper place
    const stringAfterDecimalPoint = amount.slice(-1 * decimals);
    const stringBeforeDecimalPoint = amount.slice(
        0,
        amount.length - stringAfterDecimalPoint.length,
    );
    return `${stringBeforeDecimalPoint}.${stringAfterDecimalPoint}`;
};

/**
 * JS cannot convert stringified scientific notation to bigint
 * @param str stringified number from slider or user input
 */
export const toBigInt = (str: string): bigint => {
    if (SCI_REGEX_POSTIIVE.test(str)) {
        str = sciToDecimal(str);
    }
    return BigInt(str);
};

/**
 * Get a stringified decimal representation of sci notation number
 * @param str
 */
export const sciToDecimal = (str: string): string => {
    // Regular expression to match scientific notation
    let [, mantissa] = str.match(SCI_REGEX_POSTIIVE) || [];
    const exponent = (str.match(SCI_REGEX_POSTIIVE) || [])[2];

    if (!mantissa || !exponent) {
        throw new Error('Invalid scientific notation format');
    }

    // Remove any leading zeros from mantissa
    mantissa = removeLeadingZeros(mantissa);

    const mantissaDecimalPlaces = mantissa.includes('.')
        ? mantissa.split('.')[1].length
        : 0;
    const mantissaWithoutDot = mantissa.replace(/\./, '');
    let exponentValue = parseInt(exponent, 10);
    // If the exponent is negative, we need to handle it differently
    if (exponentValue < 0) {
        throw new Error(
            'Negative exponents require special handling beyond simple conversion',
        );
        // Cashtab is only doing integer conversion
    }
    if (mantissaDecimalPlaces > 0) {
        exponentValue -= mantissaDecimalPlaces;
    }
    if (exponentValue < 0) {
        throw new Error('Value is not an integer');
    }

    // Handle zero case
    if (parseInt(mantissaWithoutDot) === 0) {
        return '0';
    }

    // Construct the decimal number by padding with zeros
    const decimalString = mantissaWithoutDot + '0'.repeat(exponentValue);

    return decimalString;
};

/**
 * Convert a decimalized token amount to an undecimalized amount
 * Useful to perform integer math as you can use BigInt for amounts greater than Number.MAX_SAFE_INTEGER in js
 * @param decimalizedAmount decimalized token amount as a string, e.g. 100.12345 for a 5-decimals token
 * @param decimals
 * @returns undecimalized token amount as a string, e.g. 10012345 for a 5-decimals token
 */
export const undecimalizeTokenAmount = (
    decimalizedAmount: string,
    decimals: SlpDecimals,
) => {
    if (typeof decimalizedAmount !== 'string') {
        throw new Error('decimalizedAmount must be a string');
    }
    if (
        !STRINGIFIED_DECIMALIZED_REGEX.test(decimalizedAmount) ||
        decimalizedAmount.length === 0
    ) {
        throw new Error(
            `decimalizedAmount must be a non-empty string containing only decimal numbers and optionally one decimal point "."`,
        );
    }
    if (!Number.isInteger(decimals)) {
        throw new Error('decimals must be an integer');
    }

    // If decimals is 0, we should not have a decimal point, or it should be at the very end
    if (decimals === 0) {
        if (!decimalizedAmount.includes('.')) {
            // If 0 decimals and no '.' in decimalizedAmount, it's the same
            return decimalizedAmount;
        }
        if (decimalizedAmount.slice(-1) !== '.') {
            // If we have a decimal anywhere but at the very end, throw precision error
            throw new Error(
                'decimalizedAmount specified at greater precision than supported token decimals',
            );
        }
        // Everything before the decimal point is what we want
        return decimalizedAmount.split('.')[0];
    }

    // How many decimal places does decimalizedAmount account for
    const accountedDecimals = decimalizedAmount.includes('.')
        ? decimalizedAmount.split('.')[1].length
        : 0;

    // Remove decimal point from the string
    let undecimalizedAmountString = decimalizedAmount.split('.').join('');
    // Remove leading zeros, if any
    undecimalizedAmountString = removeLeadingZeros(undecimalizedAmountString);

    if (accountedDecimals === decimals) {
        // If decimalized amount is accounting for all decimals, we simply remove the decimal point
        return undecimalizedAmountString;
    }

    const unAccountedDecimals = decimals - accountedDecimals;
    if (unAccountedDecimals > 0) {
        // Handle too little precision
        // say, a token amount for a 9-decimal token is only specified at 3 decimals
        // e.g. 100.123
        const zerosToAdd = new Array(unAccountedDecimals).fill(0).join('');
        return `${undecimalizedAmountString}${zerosToAdd}`;
    }

    // Do not accept too much precision
    // say, a token amount for a 3-decimal token is specified at 5 decimals
    // e.g. 100.12300 or 100.12345
    // Note if it is specied at 100.12345, we have an error, really too much precision
    throw new Error(
        'decimalizedAmount specified at greater precision than supported token decimals',
    );
};

/**
 * Remove leading '0' characters from any string
 * @param givenString
 */
export const removeLeadingZeros = (givenString: string): string => {
    let leadingZeroCount = 0;
    // We only iterate up to the 2nd-to-last character
    // i.e. we only iterate over "leading" characters
    for (let i = 0; i < givenString.length - 1; i += 1) {
        const thisChar = givenString[i];
        if (thisChar === '0') {
            leadingZeroCount += 1;
        } else {
            // Once you hit something other than '0', there are no more "leading" zeros
            break;
        }
    }
    return givenString.slice(leadingZeroCount, givenString.length);
};

/**
 * Sort wallets for display with active wallet first, then alphabetically by name
 * @param wallets Array of wallets to sort
 * @param activeWallet The currently active wallet
 * @returns Sorted array with active wallet at index 0, rest alphabetically
 */
export const sortWalletsForDisplay = <
    T extends { name: string; address: string },
>(
    activeWallet: T,
    wallets: T[],
): T[] => {
    // Check if activeWallet exists in the wallets array
    const activeWalletExists = wallets.some(
        wallet => wallet.address === activeWallet.address,
    );

    if (!activeWalletExists) {
        // Not expected to ever happen
        return wallets.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Filter out the active wallet from the list
    const otherWallets = wallets.filter(
        wallet => wallet.address !== activeWallet.address,
    );

    // Sort other wallets alphabetically by name
    const sortedOtherWallets = otherWallets.sort((a, b) =>
        a.name.localeCompare(b.name),
    );

    // Return active wallet first, then sorted others
    return [activeWallet, ...sortedOtherWallets];
};
