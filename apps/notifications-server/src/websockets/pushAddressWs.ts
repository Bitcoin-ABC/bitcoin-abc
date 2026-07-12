// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikClient, Tx, WsEndpoint, WsMsgClient } from 'chronik-client';
import {
    decodeCashAddress,
    encodeOutputScript,
    getOutputScriptFromAddress,
} from 'ecashaddrjs';
import { Pool } from 'pg';
import { listPushActiveAddresses } from '../services/pushTokenStore';
import { sendPushToActiveAddress } from '../services/pushNotificationService';
import { summarizePushTxForAddress } from '../pushTxParse';
import { buildGenesisInfoMapForTokenIds } from '../services/pushGenesisInfo';
import { parseTx } from '../pushTxParse';

const LOG_PREFIX = '[push-ws]';

let pushWs: WsEndpoint | null = null;
const subscribedAddresses = new Set<string>();

const safeEncodeActiveAddress = (activeAddress: string): string => {
    try {
        return encodeOutputScript(getOutputScriptFromAddress(activeAddress));
    } catch {
        return activeAddress;
    }
};

/**
 * Notify only on Avalanche pre-consensus finalization.
 *
 * Edge case: a miner may include a tx before this Chronik node sees it in
 * mempool / pre-consensus (same class of race as coinbase/staking rewards).
 * In that case we never get TX_FINALIZED PRE_CONSENSUS for that tx, and may
 * also miss TX_ADDED_TO_MEMPOOL. Closing the gap would mean deduping against
 * block/post-consensus msgs (or scanning block txs). For an MVP notification
 * server, rare missed pushes are acceptable.
 */
const isPreConsensusFinalized = (
    msg: Extract<WsMsgClient, { type: 'Tx' }>,
): boolean =>
    msg.msgType === 'TX_FINALIZED' &&
    msg.finalizationReasonType === 'TX_FINALIZATION_REASON_PRE_CONSENSUS';

/**
 * Cheap pre-filter: subscribed addresses whose pubkey hash appears in a tx output.
 * Avoids running parseTx for every subscription when most txs touch few addresses.
 */
export const getSubscribedAddressesWithTxOutputs = (
    tx: Tx,
    addresses: Set<string>,
): string[] => {
    const outputScripts = tx.outputs.map(output =>
        output.outputScript.toLowerCase(),
    );
    const matches: string[] = [];

    for (const activeAddress of addresses) {
        try {
            const { hash } = decodeCashAddress(activeAddress);
            const hashLower = hash.toLowerCase();
            if (outputScripts.some(script => script.includes(hashLower))) {
                matches.push(activeAddress);
            }
        } catch {
            // Ignore invalid subscribed addresses
        }
    }

    return matches;
};

export const subscribePushActiveAddress = (
    ws: WsEndpoint,
    activeAddress: string,
): void => {
    if (subscribedAddresses.has(activeAddress)) {
        return;
    }
    subscribedAddresses.add(activeAddress);
    ws.subscribeToAddress(activeAddress);
    console.info(
        `${LOG_PREFIX} subscribed to ${safeEncodeActiveAddress(activeAddress)}`,
    );
};

export const unsubscribePushActiveAddress = (
    ws: WsEndpoint,
    activeAddress: string,
): void => {
    if (!subscribedAddresses.has(activeAddress)) {
        return;
    }
    subscribedAddresses.delete(activeAddress);
    ws.unsubscribeFromAddress(activeAddress);
    console.info(
        `${LOG_PREFIX} unsubscribed from ${safeEncodeActiveAddress(
            activeAddress,
        )}`,
    );
};

export const syncPushAddressSubscriptions = async (
    pool: Pool,
): Promise<void> => {
    if (pushWs === null) {
        return;
    }

    const desired = await listPushActiveAddresses(pool);
    const desiredSet = new Set(desired);
    console.info(
        `${LOG_PREFIX} syncing ${desired.length} subscribed address(es)`,
    );
    for (const address of desired) {
        subscribePushActiveAddress(pushWs, address);
    }
    for (const address of [...subscribedAddresses]) {
        if (!desiredSet.has(address)) {
            unsubscribePushActiveAddress(pushWs, address);
        }
    }
};

export const processPushTxForSubscribedAddresses = async (
    tx: Tx,
    txid: string,
    chronik: ChronikClient,
    pool: Pool,
): Promise<void> => {
    const candidateAddresses = getSubscribedAddressesWithTxOutputs(
        tx,
        subscribedAddresses,
    );

    for (const activeAddress of candidateAddresses) {
        const { hash } = decodeCashAddress(activeAddress);
        const parsedTx = parseTx(tx, [hash]);
        const tokenIds = parsedTx.parsedTokenEntries.map(
            entry => entry.tokenId,
        );
        const genesisInfoByTokenId =
            tokenIds.length > 0
                ? await buildGenesisInfoMapForTokenIds(chronik, tokenIds)
                : undefined;

        const summary = summarizePushTxForAddress(tx, activeAddress, {
            genesisInfoByTokenId,
        });
        if (summary === null) {
            continue;
        }

        const result = await sendPushToActiveAddress(pool, {
            activeAddress,
            notificationType: 'tx_received',
            title: summary.title,
            body: summary.body,
            data: {
                txid,
                ...(summary.tokenId !== undefined
                    ? { token_id: summary.tokenId }
                    : {}),
            },
        });

        if (result.sent > 0) {
            console.info(
                `${LOG_PREFIX} sent tx push for ${txid} to ${activeAddress} (${result.sent} device(s))`,
            );
        }
    }
};

export const fetchCoinbaseTxForBlock = async (
    chronik: ChronikClient,
    blockHash: string,
): Promise<Tx | null> => {
    try {
        const page = await chronik.blockTxs(blockHash, 0, 1);
        const firstTx = page.txs[0];
        if (firstTx === undefined || !firstTx.isCoinbase) {
            return null;
        }
        return firstTx;
    } catch {
        return null;
    }
};

const handleFinalizedBlock = async (
    blockHash: string,
    chronik: ChronikClient,
    pool: Pool,
): Promise<void> => {
    const coinbaseTx = await fetchCoinbaseTxForBlock(chronik, blockHash);
    if (coinbaseTx === null) {
        console.error(
            `${LOG_PREFIX} block ${blockHash} has no coinbase tx on first page`,
        );
        return;
    }

    await processPushTxForSubscribedAddresses(
        coinbaseTx,
        coinbaseTx.txid,
        chronik,
        pool,
    );
};

const handleWsMsg = async (
    msg: WsMsgClient,
    chronik: ChronikClient,
    pool: Pool,
): Promise<void> => {
    if (msg.type === 'Error') {
        console.error(`${LOG_PREFIX} chronik ws error`, msg);
        return;
    }

    if (msg.type === 'Block') {
        if (msg.msgType === 'BLK_FINALIZED') {
            await handleFinalizedBlock(msg.blockHash, chronik, pool);
        }
        return;
    }

    if (msg.type !== 'Tx' || !isPreConsensusFinalized(msg)) {
        return;
    }

    let tx;
    try {
        tx = await chronik.tx(msg.txid);
    } catch (error) {
        console.error(`${LOG_PREFIX} failed to fetch tx ${msg.txid}:`, error);
        return;
    }

    await processPushTxForSubscribedAddresses(tx, msg.txid, chronik, pool);
};

export const initPushAddressWs = async (
    chronik: ChronikClient,
    pool: Pool,
): Promise<WsEndpoint> => {
    const ws = chronik.ws({
        onMessage: msg => {
            void handleWsMsg(msg, chronik, pool).catch(error => {
                console.error(`${LOG_PREFIX} message handler failed:`, error);
            });
        },
    });

    await ws.waitForOpen();
    pushWs = ws;
    console.info(`${LOG_PREFIX} connected`);

    ws.subscribeToBlocks();
    console.info(`${LOG_PREFIX} subscribed to blocks`);

    await syncPushAddressSubscriptions(pool);

    return ws;
};
