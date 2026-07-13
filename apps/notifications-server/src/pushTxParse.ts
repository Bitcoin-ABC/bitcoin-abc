// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Tx, GenesisInfo } from 'chronik-client';
import { decodeCashAddress } from 'ecashaddrjs';
import {
    getTxNotificationMsg,
    parseTx,
    ParsedTokenTxType,
    XecTxType,
    type ParsedTx,
} from 'ecash-parse';

export type PushTxSummary = {
    title: string;
    body: string;
    /**
     * Set for incoming token txs; used as the push notification icon
     * (web Notification icon / Android FCM imageUrl).
     */
    tokenId?: string;
};

export type SummarizePushTxOptions = {
    locale?: string;
    fiatPrice?: number | null;
    fiatTicker?: string;
    genesisInfoByTokenId?: Map<string, GenesisInfo>;
};

const DEFAULT_PUSH_TITLE = 'Payment received';

const getTokenTickerForPush = (
    tokenId: string,
    genesisInfo?: GenesisInfo,
): string => {
    if (typeof genesisInfo === 'undefined') {
        return `${tokenId.slice(0, 5)}...${tokenId.slice(-5)}`;
    }
    if (genesisInfo.tokenTicker !== '') {
        return genesisInfo.tokenTicker;
    }
    if (genesisInfo.tokenName !== '') {
        return genesisInfo.tokenName;
    }
    return `${tokenId.slice(0, 5)}...${tokenId.slice(-5)}`;
};

const getPushTitle = (
    parsedTx: ParsedTx,
    genesisInfo?: GenesisInfo,
): string => {
    if (parsedTx.parsedTokenEntries.length === 0) {
        return DEFAULT_PUSH_TITLE;
    }
    const { tokenId, renderedTxType } = parsedTx.parsedTokenEntries[0];
    if (renderedTxType === ParsedTokenTxType.AgoraSale) {
        return `${getTokenTickerForPush(tokenId, genesisInfo)} Sold`;
    }
    return DEFAULT_PUSH_TITLE;
};

const buildPushSummary = (
    parsedTx: ParsedTx,
    options?: SummarizePushTxOptions,
): PushTxSummary | null => {
    if (parsedTx.xecTxType === XecTxType.Sent) {
        return null;
    }

    const locale = options?.locale ?? 'en-US';
    const fiatTicker = options?.fiatTicker ?? 'USD';
    const fiatPrice =
        options?.fiatPrice === undefined ? null : options.fiatPrice;

    let genesisInfo: GenesisInfo | undefined;
    let tokenId: string | undefined;
    if (parsedTx.parsedTokenEntries.length > 0) {
        tokenId = parsedTx.parsedTokenEntries[0].tokenId;
        genesisInfo = options?.genesisInfoByTokenId?.get(tokenId);
    }

    const body = getTxNotificationMsg(
        parsedTx,
        fiatPrice,
        locale,
        fiatTicker,
        genesisInfo,
    );

    if (typeof body === 'undefined') {
        return null;
    }

    return {
        title: getPushTitle(parsedTx, genesisInfo),
        body,
        ...(tokenId !== undefined ? { tokenId } : {}),
    };
};

/**
 * Build push notification copy for an incoming tx to a wallet hash.
 */
export const summarizePushTxForWalletHash = (
    tx: Tx,
    walletHash: string,
    options?: SummarizePushTxOptions,
): PushTxSummary | null => buildPushSummary(parseTx(tx, [walletHash]), options);

/**
 * Build push notification copy for an incoming tx to address.
 * Returns null when the tx should not trigger a push notification.
 */
export const summarizePushTxForAddress = (
    tx: Tx,
    address: string,
    options?: SummarizePushTxOptions,
): PushTxSummary | null => {
    const { hash } = decodeCashAddress(address);
    return summarizePushTxForWalletHash(tx, hash, options);
};

export { parseTx, getTxNotificationMsg, type ParsedTx } from 'ecash-parse';
