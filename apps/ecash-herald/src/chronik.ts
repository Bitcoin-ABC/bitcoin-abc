// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    ChronikClient,
    ScriptType,
    Tx,
    GenesisInfo,
    Utxo,
} from 'chronik-client';
import { getEmojiFromBalanceSats } from './utils';
import { getTypeAndHashFromOutputScript } from 'ecashaddrjs';

// Max txs we can get in one request
const CHRONIK_MAX_PAGESIZE = 200;

export type TokenInfoMap = Map<string, GenesisInfo>;
export const getTokenInfoMap = async (
    chronik: ChronikClient,
    tokenIdSet: Set<string>,
) => {
    const tokenInfoMap: TokenInfoMap = new Map();
    const tokenInfoPromises: Promise<void>[] = [];
    tokenIdSet.forEach(tokenId => {
        tokenInfoPromises.push(
            new Promise((resolve, reject) => {
                chronik.token(tokenId).then(
                    response => {
                        // Note: txDetails.slpTxData.genesisInfo only exists for token genesis txs
                        try {
                            const genesisInfo = response.genesisInfo;
                            tokenInfoMap.set(tokenId, genesisInfo);
                            resolve();
                        } catch (err) {
                            console.log(
                                `Error getting genesis info for ${tokenId}`,
                                err,
                            );
                            reject(err);
                        }
                    },
                    err => {
                        reject(err);
                    },
                );
            }),
        );
    });

    try {
        await Promise.all(tokenInfoPromises);
    } catch (err) {
        console.log(`Error in await Promise.all(tokenInfoPromises)`, err);
        // Print all tokenIds in event of error
        // Note: any 1 promise failing in Promise.all() will hit this
        // catch block
        console.log(`tokenIdSet:`);
        tokenIdSet.forEach(tokenId => {
            console.log(tokenId);
        });
        return false;
    }
    return tokenInfoMap;
};

export interface OutputscriptInfo {
    emoji: string;
    balanceSats: number;
    utxos: Utxo[];
}
/**
 * Build a reference map of outputScripts and their balance in satoshis
 * @param {object} chronik
 * @param {set} outputScripts
 * @returns {map} addressInfoMap, a map with key = address, value = {balanceSats, emoji, utxos}
 */
export const getOutputscriptInfoMap = async (
    chronik: ChronikClient,
    outputScripts: Set<string>,
): Promise<false | Map<string, OutputscriptInfo>> => {
    const outputScriptInfoMap = new Map();
    const outputScriptInfoPromises: Promise<void>[] = [];

    // For each outputScript, create a promise to get its balance and add
    // info related to this balance to outputScriptInfoMap
    outputScripts.forEach(outputScript => {
        // Decode output script
        const { type, hash } = getTypeAndHashFromOutputScript(outputScript);
        outputScriptInfoPromises.push(
            new Promise((resolve, reject) => {
                chronik
                    .script(type as ScriptType, hash)
                    .utxos()
                    .then(
                        response => {
                            // If this address has no utxos, then utxos.length is 0
                            // If this address has utxos, then utxos = [{utxos: []}]
                            const balanceSats =
                                response.utxos.length === 0
                                    ? 0
                                    : response.utxos
                                          .map(utxo => utxo.value)
                                          .reduce(
                                              (prev, curr) => prev + curr,
                                              0,
                                          );

                            // Set the map outputScript => emoji
                            outputScriptInfoMap.set(outputScript, {
                                emoji: getEmojiFromBalanceSats(balanceSats),
                                balanceSats,
                                utxos: response.utxos,
                            });
                            resolve();
                        },
                        err => {
                            reject(err);
                        },
                    );
            }),
        );
    });
    try {
        await Promise.all(outputScriptInfoPromises);
    } catch (err) {
        console.log(
            `Error in await Promise.all(outputScriptInfoPromises)`,
            err,
        );
        // Print all outputScripts in event of error
        // Note: any 1 promise failing in Promise.all() will hit this
        // catch block
        console.log(`outputScripts:`);
        outputScripts.forEach(outputScript => {
            console.log(outputScript);
        });
        return false;
    }
    return outputScriptInfoMap;
};
/**
 * Get all txs in a block
 * Txs are paginated so this may require more than one API call
 * @param chronik
 * @param blockHeight
 * @throws on chronik error
 */
export const getAllBlockTxs = async (
    chronik: ChronikClient,
    blockHeight: number,
    pageSize = CHRONIK_MAX_PAGESIZE,
): Promise<Tx[]> => {
    const firstPage = await chronik.blockTxs(blockHeight, 0, pageSize);
    const { txs, numPages } = firstPage;

    if (numPages === 1) {
        return txs;
    }

    const remainingPagesPromises: Promise<Tx[]>[] = [];

    // Start with i=1 as you already have the first page of txs, which corresponds with pagenum = 0
    for (let i = 1; i < numPages; i += 1) {
        remainingPagesPromises.push(
            new Promise((resolve, reject) => {
                chronik.blockTxs(blockHeight, i, pageSize).then(
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
    const remainingTxs = await Promise.all(remainingPagesPromises);

    // Combine all txs into an array
    return txs.concat(remainingTxs.flat());
};
/**
 * Get the start and end blockheights that will include all txs within a specified time period
 * Note: This function only works for time intervals relative to "right now"
 * We always return chaintip as the end height
 * @param  chronik
 * @param now unix timestamp in seconds
 * @param  secondsAgo how far back we are interested in getting blocks
 */
export const getBlocksAgoFromChaintipByTimestamp = async (
    chronik: ChronikClient,
    now: number,
    secondsAgo: number,
): Promise<{ chaintip: number; startBlockheight: number }> => {
    // Get the chaintip
    const chaintip = (await chronik.blockchainInfo()).tipHeight;

    // Make an educated guess about how many blocks ago the first block we want should be
    // = 10 minutes per block * 60 seconds per minute
    const SECONDS_PER_BLOCK = 600;
    const guessedBlocksAgo = Math.floor(secondsAgo / SECONDS_PER_BLOCK);
    const guessedBlockheight = chaintip - guessedBlocksAgo;

    // Get the block from blocksAgo and check its timestamp
    const guessedBlock = (await chronik.block(guessedBlockheight)).blockInfo;

    let guessedBlockTimestampDelta = now - guessedBlock.timestamp;

    // We won't keep guessing forever
    const ADDITIONAL_BLOCKS_TO_GUESS = 200;

    let startBlockheight;
    if (guessedBlockTimestampDelta > secondsAgo) {
        // If the guessed block was further back in time than desired secondsAgo
        // Then we need to guess a higher block
        for (
            let i = guessedBlockheight + 1;
            i <= guessedBlockheight + ADDITIONAL_BLOCKS_TO_GUESS;
            i += 1
        ) {
            const guessedBlock = (await chronik.block(i)).blockInfo;
            const thisBlockTimestampDelta = now - guessedBlock.timestamp;
            if (thisBlockTimestampDelta <= secondsAgo) {
                startBlockheight = i;
                break;
            }
        }
    } else {
        // We might already be looking at the right block
        // But mb we some previous blocks are also in this acceptable window
        // If the guessed block was NOT further back in time than desired secondsAgo
        // Then we need to guess a LOWER block
        for (
            let i = guessedBlockheight - 1;
            i >= guessedBlockheight - ADDITIONAL_BLOCKS_TO_GUESS;
            i -= 1
        ) {
            const guessedBlock = (await chronik.block(i)).blockInfo;
            guessedBlockTimestampDelta = now - guessedBlock.timestamp;
            if (guessedBlockTimestampDelta > secondsAgo) {
                // We keep looking for blocks until we find one that is "too old"
                // Then we take the immediately newer block
                startBlockheight = i + 1;
                break;
            }
        }
    }

    if (typeof startBlockheight === 'undefined') {
        console.log(
            `Did not find startBlockheight in ${ADDITIONAL_BLOCKS_TO_GUESS} blocks`,
        );
        console.log(`Chaintip: ${chaintip}`);
        console.log(`guessedBlockheight: ${guessedBlockheight}`);
        console.log(
            `guessedBlockTimestampDelta: ${guessedBlockTimestampDelta}`,
        );
        throw new Error(
            `Start block more than ${ADDITIONAL_BLOCKS_TO_GUESS} off our original guess`,
        );
    }

    return { chaintip, startBlockheight };
};
