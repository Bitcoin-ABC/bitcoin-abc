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

/**
 * Compare txs for history display: unconfirmed first, then newer-first.
 * Same-block (or same timeFirstSeen) ties break on txid for a stable order.
 */
const compareTxHistoryDesc = (a: Tx, b: Tx): number => {
    const aHeight = a.block?.height;
    const bHeight = b.block?.height;
    const aConfirmed = typeof aHeight === 'number';
    const bConfirmed = typeof bHeight === 'number';

    if (aConfirmed !== bConfirmed) {
        // Unconfirmed before confirmed
        return aConfirmed ? 1 : -1;
    }

    if (aConfirmed && bConfirmed && aHeight !== bHeight) {
        // Higher block height = newer
        return (bHeight as number) - (aHeight as number);
    }

    const timeDiff = (b.timeFirstSeen || 0) - (a.timeFirstSeen || 0);
    if (timeDiff !== 0) {
        return timeDiff;
    }

    // Txids are hex; ASCII compare is enough for a stable tie-break
    if (a.txid === b.txid) {
        return 0;
    }
    return a.txid < b.txid ? 1 : -1;
};

/**
 * Parse Chronik txs into CashtabTxs, caching token genesis info as needed.
 */
const parseTxsForHistory = async (
    chronik: ChronikClient,
    txs: Tx[],
    hashes: string[],
    cachedTokens: Map<string, CashtabCachedTokenInfo>,
): Promise<CashtabTx[]> => {
    const history: CashtabTx[] = [];
    for (const tx of txs) {
        const { tokenEntries } = tx;

        const tokenIds: Set<string> = new Set();
        for (const tokenEntry of tokenEntries) {
            tokenIds.add(tokenEntry.tokenId);
        }

        for (const tokenId of [...tokenIds]) {
            if (typeof cachedTokens.get(tokenId) === 'undefined') {
                try {
                    const newTokenCacheInfo = await getTokenGenesisInfo(
                        chronik,
                        tokenId,
                    );
                    cachedTokens.set(tokenId, newTokenCacheInfo);
                } catch (err) {
                    console.error(
                        `Error in getTokenGenesisInfo for tokenId ${tokenId}`,
                        err,
                    );
                }
            }
        }

        (tx as CashtabTx).parsed = parseTx(tx, hashes);
        history.push(tx as CashtabTx);
    }
    return history;
};

/**
 * Fetch all history pages for one address (Chronik max page size).
 */
const getAllTxHistoryByAddress = async (
    chronik: ChronikClient,
    address: string,
    pageSize = CHRONIK_MAX_PAGE_SIZE,
): Promise<Tx[]> => {
    const firstPageResponse = await chronik
        .address(address)
        .history(0, pageSize);
    const { txs, numPages } = firstPageResponse;
    if (numPages <= 1) {
        return txs;
    }
    const rest = await Promise.all(
        Array.from({ length: numPages - 1 }, (_, i) =>
            chronik.address(address).history(i + 1, pageSize),
        ),
    );
    return txs.concat(rest.flatMap(page => page.txs));
};

/**
 * Get paginated transaction history for one or more wallet addresses.
 * Multiple addresses (HD): merge/dedupe by txid, sort newer-first, then page.
 */
export const getTransactionHistory = async (
    chronik: ChronikClient,
    addressOrAddresses: string | string[],
    cachedTokens: Map<string, CashtabCachedTokenInfo>,
    page: number = 0,
    pageSize: number = chronikConfig.txHistoryPageSize,
): Promise<{ txs: CashtabTx[]; numPages: number; numTxs: number }> => {
    const addresses = Array.isArray(addressOrAddresses)
        ? addressOrAddresses
        : [addressOrAddresses];

    if (addresses.length === 0) {
        return { txs: [], numTxs: 0, numPages: 0 };
    }

    const hashes = addresses.map(address => {
        const { hash } = decodeCashAddress(address);
        return hash;
    });

    // Single address: use Chronik server-side pagination (existing behavior)
    if (addresses.length === 1) {
        const address = addresses[0];
        const pageResponse = await chronik
            .address(address)
            .history(page, pageSize);
        const history = await parseTxsForHistory(
            chronik,
            pageResponse.txs,
            hashes,
            cachedTokens,
        );
        return {
            txs: history,
            numTxs: pageResponse.numTxs,
            numPages: pageResponse.numPages,
        };
    }

    // HD / multi-address: fetch full history per address, merge, then page locally
    const perAddressTxs = await Promise.all(
        addresses.map(address => getAllTxHistoryByAddress(chronik, address)),
    );
    const byTxid = new Map<string, Tx>();
    for (const txs of perAddressTxs) {
        for (const tx of txs) {
            byTxid.set(tx.txid, tx);
        }
    }
    const merged = [...byTxid.values()].sort(compareTxHistoryDesc);
    const numTxs = merged.length;
    const numPages = numTxs === 0 ? 0 : Math.ceil(numTxs / pageSize);
    const start = page * pageSize;
    const pageTxs = merged.slice(start, start + pageSize);
    const history = await parseTxsForHistory(
        chronik,
        pageTxs,
        hashes,
        cachedTokens,
    );

    return { txs: history, numTxs, numPages };
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
