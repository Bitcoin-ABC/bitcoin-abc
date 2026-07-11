// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { chronik as chronikConfig } from 'config/chronik';
import { decodeCashAddress } from 'ecashaddrjs';
import {
    decimalizeTokenAmount,
    undecimalizeTokenAmount,
    TokenUtxo,
    SlpDecimals,
    CashtabTx,
} from 'wallet';
import { ChronikClient, Tx } from 'chronik-client';
import { CashtabCachedTokenInfo } from 'config/CashtabCache';
import { applyTokenDisplayOverrides } from 'constants/tokenDisplayOverrides';
import { parseTx } from 'ecash-parse';

export {
    parseTx,
    getTxNotificationMsg,
    XecTxType,
    ParsedTokenTxType,
    ParsedTx,
    ParsedTokenEntry,
    AppAction,
    SolAddrAction,
    XecxAction,
    UnknownAction,
} from 'ecash-parse';

const CHRONIK_MAX_PAGE_SIZE = 200;

export const getTransactionHistory = async (
    chronik: ChronikClient,
    address: string,
    cachedTokens: Map<string, CashtabCachedTokenInfo>,
    page: number = 0,
    pageSize: number = chronikConfig.txHistoryPageSize,
): Promise<{ txs: CashtabTx[]; numPages: number; numTxs: number }> => {
    // Get hash from address for parseTx
    const { hash } = decodeCashAddress(address);

    // Get transaction history from chronik
    const pageResponse = await chronik.address(address).history(page, pageSize);

    // For non-paginated requests, limit to pageSize
    const txsToProcess = pageResponse.txs;

    // Parse txs
    const history: CashtabTx[] = [];
    for (const tx of txsToProcess) {
        const { tokenEntries } = tx;

        // Get all tokenIds associated with this tx
        const tokenIds: Set<string> = new Set();
        for (const tokenEntry of tokenEntries) {
            tokenIds.add(tokenEntry.tokenId);
        }

        // Cache any tokenIds you do not have cached
        for (const tokenId of [...tokenIds]) {
            if (typeof cachedTokens.get(tokenId) === 'undefined') {
                // Add it to cache right here
                try {
                    const newTokenCacheInfo = await getTokenGenesisInfo(
                        chronik,
                        tokenId,
                    );
                    cachedTokens.set(tokenId, newTokenCacheInfo);
                } catch (err) {
                    // If you have an error getting the calculated token cache info, do not throw
                    // Could be some token out there that we do not parse properly with getTokenGenesisInfo
                    // Log it
                    // parseTx is tolerant to not having the info in cache
                    console.error(
                        `Error in getTokenGenesisInfo for tokenId ${tokenId}`,
                        err,
                    );
                }
            }
        }

        (tx as CashtabTx).parsed = parseTx(tx, [hash]);

        history.push(tx as CashtabTx);
    }

    const result = {
        txs: history,
        numTxs: pageResponse.numTxs,
        numPages: pageResponse.numPages,
    };

    return result;
};

/**
 * Get all info about a token used in Cashtab's token cache
 * @param chronik
 * @param tokenId
 */
export const getTokenGenesisInfo = async (
    chronik: ChronikClient,
    tokenId: string,
): Promise<CashtabCachedTokenInfo> => {
    // We can get timeFirstSeen, block, tokenType, and genesisInfo from the token() endpoint
    // If we call this endpoint before the genesis tx is confirmed, we will not get block
    // So, block does not need to be included

    const tokenInfo = await chronik.token(tokenId);
    const genesisTxInfo = await chronik.tx(tokenId);

    const { timeFirstSeen, tokenType } = tokenInfo;
    const genesisInfo = applyTokenDisplayOverrides(
        tokenId,
        tokenInfo.genesisInfo,
    );
    const decimals = genesisInfo.decimals;

    // Initialize variables for determined quantities we want to cache

    /**
     * genesisSupply {string}
     * Quantity of token created at mint
     * Note: we may have genesisSupply at different genesisAddresses
     * We do not track this information, only total genesisSupply
     * Cached as a decimalized string, e.g. 0.000 if 0 with 3 decimal places
     * 1000.000000000 if one thousand with 9 decimal places
     */
    let genesisSupply = decimalizeTokenAmount('0', decimals as SlpDecimals);

    /**
     * genesisMintBatons {number}
     * Number of mint batons created in the genesis tx for this token
     */
    let genesisMintBatons = 0;

    /**
     * genesisOutputScripts {Set(<outputScript>)}
     * Address(es) where initial token supply was minted
     */
    const genesisOutputScripts: Set<string> = new Set();

    // Iterate over outputs
    for (const output of genesisTxInfo.outputs) {
        if (output.token?.tokenId === tokenId) {
            // If this output of this genesis tx is associated with this tokenId

            const { token, outputScript } = output;

            // Add its outputScript to genesisOutputScripts
            genesisOutputScripts.add(outputScript);

            const { isMintBaton, atoms } = token;

            if (isMintBaton) {
                // If it is a mintBaton, increment genesisMintBatons
                genesisMintBatons += 1;
            }

            // Increment genesisSupply
            // decimalizeTokenAmount, undecimalizeTokenAmount
            //genesisSupply = genesisSupply.plus(new BN(amount));

            genesisSupply = decimalizeTokenAmount(
                (
                    BigInt(
                        undecimalizeTokenAmount(
                            genesisSupply,
                            decimals as SlpDecimals,
                        ),
                    ) + atoms
                ).toString(),
                decimals as SlpDecimals,
            );
        }
    }

    const tokenCache: CashtabCachedTokenInfo = {
        tokenType,
        genesisInfo,
        timeFirstSeen,
        genesisSupply,
        // Return genesisOutputScripts as an array as we no longer require Set features
        genesisOutputScripts: [...genesisOutputScripts],
        genesisMintBatons,
    };
    if (typeof tokenInfo.block !== 'undefined') {
        // If the genesis tx is confirmed at the time we check
        tokenCache.block = tokenInfo.block;
    }

    if (tokenType.type === 'SLP_TOKEN_TYPE_NFT1_CHILD') {
        // If this is an SLP1 NFT
        // Get the groupTokenId
        // This is available from the .tx() call and will never change, so it should also be cached
        for (const tokenEntry of genesisTxInfo.tokenEntries) {
            const { txType } = tokenEntry;
            if (txType === 'GENESIS') {
                const { groupTokenId } = tokenEntry;
                tokenCache.groupTokenId = groupTokenId;
            }
        }
    }
    // Note: if it is not confirmed, we can update the cache later when we try to use this value

    return tokenCache;
};

/**
 * Get decimalized balance of every token held by a wallet
 * Update Cashtab's tokenCache if any tokens are uncached
 * @param chronik
 * @param slpUtxos array of token utxos from chronik
 * @param tokenCache Cashtab's token cache
 * @returns Map of tokenId => token balance as decimalized string
 * Also updates tokenCache
 */
export const getTokenBalances = async (
    chronik: ChronikClient,
    slpUtxos: TokenUtxo[],
    tokenCache: Map<string, CashtabCachedTokenInfo>,
): Promise<Map<string, string>> => {
    const walletStateTokens: Map<string, string> = new Map();
    for (const utxo of slpUtxos) {
        // Every utxo in slpUtxos will have a tokenId
        const { token } = utxo;
        const { tokenId, atoms } = token;
        // Is this token cached?
        let cachedTokenInfo = tokenCache.get(tokenId);
        if (typeof cachedTokenInfo === 'undefined') {
            // If we have not cached this token before, cache it
            // NB we do not handle chronik errors here; expectation is that callsite will handle chronik errors
            cachedTokenInfo = await getTokenGenesisInfo(chronik, tokenId);
            tokenCache.set(tokenId, cachedTokenInfo);
        }
        // Now decimals is available
        const decimals = cachedTokenInfo.genesisInfo.decimals;

        const tokenBalanceInMap = walletStateTokens.get(tokenId);

        // Update or initialize token balance as a decimalized string in walletStateTokens Map
        walletStateTokens.set(
            tokenId,
            typeof tokenBalanceInMap === 'undefined'
                ? decimalizeTokenAmount(
                      atoms.toString(),
                      decimals as SlpDecimals,
                  )
                : decimalizeTokenAmount(
                      (
                          BigInt(
                              undecimalizeTokenAmount(
                                  tokenBalanceInMap,
                                  decimals as SlpDecimals,
                              ),
                          ) + atoms
                      ).toString(),
                      decimals as SlpDecimals,
                  ),
        );
    }

    return walletStateTokens;
};

/**
 *
 * @param chronik
 * @param tokenId
 * @param pageSize usually 200, the chronik max, but accept a parameter to simplify unit testing
 * @returns
 */
export const getAllTxHistoryByTokenId = async (
    chronik: ChronikClient,
    tokenId: string,
    pageSize = CHRONIK_MAX_PAGE_SIZE,
): Promise<Tx[]> => {
    // We will throw an error if we get an error from chronik fetch
    const firstPageResponse = await chronik
        .tokenId(tokenId)
        // call with page=0 (to get first page) and max page size, as we want all the history
        .history(0, pageSize);
    const { txs, numPages } = firstPageResponse;
    // Get tx history from all pages
    // We start with i = 1 because we already have the data from page 0
    const tokenHistoryPromises = [];
    for (let i = 1; i < numPages; i += 1) {
        tokenHistoryPromises.push(
            new Promise<Tx[]>((resolve, reject) => {
                chronik
                    .tokenId(tokenId)
                    .history(i, CHRONIK_MAX_PAGE_SIZE)
                    .then(
                        result => {
                            resolve(result.txs);
                        },
                        err => {
                            reject(err);
                        },
                    );
            }),
        );
    }
    // Get rest of txHistory using Promise.all() to execute requests in parallel
    const restOfTxHistory = await Promise.all(tokenHistoryPromises);
    // Flatten so we have an array of tx objects, and not an array of arrays of tx objects
    const flatTxHistory = restOfTxHistory.flat();
    // Combine with the first page
    const allHistory = txs.concat(flatTxHistory);

    return allHistory;
};

/**
 * Get all child NFTs from a given parent tokenId
 * i.e. get all NFTs in an NFT collection *
 * @param parentTokenId
 * @param allParentTokenTxHistory
 */
export const getChildNftsFromParent = (
    parentTokenId: string,
    allParentTokenTxHistory: Tx[],
): string[] => {
    const childNftsFromThisParent = [];
    for (const tx of allParentTokenTxHistory) {
        // Check tokenEntries
        const { tokenEntries } = tx;
        for (const tokenEntry of tokenEntries) {
            const { txType } = tokenEntry;
            if (
                txType === 'GENESIS' &&
                typeof tokenEntry.groupTokenId !== 'undefined' &&
                tokenEntry.groupTokenId === parentTokenId
            ) {
                childNftsFromThisParent.push(tokenEntry.tokenId);
            }
        }
    }
    return childNftsFromThisParent;
};
