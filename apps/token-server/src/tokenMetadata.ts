// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikClient, TokenInfo, TokenType, Tx } from 'chronik-client';
import {
    decodeCashAddress,
    encodeCashAddress,
    getTypeAndHashFromOutputScript,
} from 'ecashaddrjs';
import { CashtabTokenMetadata } from './cashtabTokens';

export interface TokenMetadataLookupOptions {
    attempts?: number;
    delayMs?: number;
}

export type TokenLookupErrorKind = 'not_found' | 'invalid_genesis' | 'upstream';

/**
 * Classify Chronik / genesis lookup failures so callers can pick an HTTP status.
 */
export const classifyTokenLookupError = (
    err: unknown,
): TokenLookupErrorKind => {
    const message = err instanceof Error ? err.message : String(err);
    if (/not found in the index/i.test(message) || /:\s*404:\s/.test(message)) {
        return 'not_found';
    }
    if (
        message.includes('No genesis supply or mint baton output found') ||
        message.includes('No input[0] outputScript')
    ) {
        return 'invalid_genesis';
    }
    return 'upstream';
};

const outputScriptToAddress = (outputScript: string): string => {
    const { type, hash } = getTypeAndHashFromOutputScript(outputScript);
    return encodeCashAddress('ecash', type, hash);
};

const tokenTypeToString = (tokenType: TokenType): string => {
    return tokenType.type;
};

/**
 * The address that minted is the one that signed genesis input[0].
 * Token outputs only say where the supply was paid.
 */
const getGenesisInput0Address = (tokenId: string, genesisTx: Tx): string => {
    const firstInput = genesisTx.inputs?.[0];
    if (
        typeof firstInput === 'undefined' ||
        typeof firstInput.outputScript !== 'string'
    ) {
        throw new Error(`No input[0] outputScript for tokenId ${tokenId}`);
    }
    return outputScriptToAddress(firstInput.outputScript);
};

/**
 * Return true if two cash addresses identify the same output script.
 */
export const isSameMinterAddress = (a: string, b: string): boolean => {
    try {
        const decodedA = decodeCashAddress(a);
        const decodedB = decodeCashAddress(b);
        return (
            decodedA.hash === decodedB.hash && decodedA.type === decodedB.type
        );
    } catch {
        return false;
    }
};

/**
 * Derive Cashtab token metadata from Chronik genesis data.
 */
export const getCashtabTokenMetadata = async (
    chronik: ChronikClient,
    tokenId: string,
): Promise<CashtabTokenMetadata> => {
    const tokenInfo: TokenInfo = await chronik.token(tokenId);
    const genesisTx = await chronik.tx(tokenId);
    const tokenType = tokenTypeToString(tokenInfo.tokenType);
    const minterAddress = getGenesisInput0Address(tokenId, genesisTx);

    if (tokenType === 'SLP_TOKEN_TYPE_MINT_VAULT') {
        return {
            tokenId,
            minterAddress,
            tokenType,
            supplyType: 'VARIABLE',
        };
    }

    if (tokenType === 'SLP_TOKEN_TYPE_NFT1_CHILD') {
        return {
            tokenId,
            minterAddress,
            tokenType,
            supplyType: 'FIXED',
        };
    }

    let genesisMintBatons = 0;
    let sawSupply = false;

    for (const output of genesisTx.outputs) {
        if (output.token?.tokenId !== tokenId) {
            continue;
        }

        const { isMintBaton, atoms } = output.token;

        if (isMintBaton) {
            genesisMintBatons += 1;
            continue;
        }

        if (atoms > 0n) {
            sawSupply = true;
        }
    }

    if (!sawSupply && genesisMintBatons === 0) {
        throw new Error(
            `No genesis supply or mint baton output found for tokenId ${tokenId}`,
        );
    }

    return {
        tokenId,
        minterAddress,
        tokenType,
        supplyType: genesisMintBatons > 0 ? 'VARIABLE' : 'FIXED',
    };
};

const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
};

/**
 * Fetch genesis metadata, retrying so a just-broadcast Cashtab mint can appear.
 */
export const getCashtabTokenMetadataWithRetry = async (
    chronik: ChronikClient,
    tokenId: string,
    options: TokenMetadataLookupOptions = {},
): Promise<CashtabTokenMetadata> => {
    const attempts = options.attempts ?? 5;
    const delayMs = options.delayMs ?? 400;
    let lastError: unknown;

    for (let i = 0; i < attempts; i++) {
        try {
            return await getCashtabTokenMetadata(chronik, tokenId);
        } catch (err) {
            lastError = err;
            if (classifyTokenLookupError(err) === 'invalid_genesis') {
                throw err;
            }
            if (i < attempts - 1) {
                await sleep(delayMs);
            }
        }
    }

    throw lastError;
};
