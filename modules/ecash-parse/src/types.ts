// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { RenderedTokenType } from './tokenProtocol';

export enum XecTxType {
    Received = 'Received',
    Sent = 'Sent',
    Staking = 'Staking Reward',
    Coinbase = 'Coinbase Reward',
}

export enum ParsedTokenTxType {
    AgoraOffer = 'Agora Offer',
    AgoraCancel = 'Agora Cancel',
    AgoraRelist = 'Agora Relist',
    AgoraBuy = 'Agora Buy',
    AgoraSale = 'Agora Sale',
    FanOut = 'Fan Out',
    BlitzPlay = 'Blitz play',
}

export interface AliasAction {
    alias: string;
    address: string;
}
export interface AirdropAction {
    tokenId: string;
    msg?: string;
}
export interface PaybuttonAction {
    data: string;
    nonce: string;
}
export interface NftoaAction {
    data: string;
    nonce: string;
}
export interface EcashChatAction {
    msg: string;
}
export interface PaywallAction {
    sharedArticleTxid: string;
}
export interface EcashChatArticleReply {
    replyArticleTxid: string;
    msg: string;
}
export interface CashtabMsgAction {
    msg: string;
}
export interface SolAddrAction {
    solAddr: string;
}
export interface XecxAction {
    minBalanceTokenSatoshisToReceivePaymentThisRound: number;
    eligibleTokenSatoshis: number;
    ineligibleTokenSatoshis: number;
    excludedHoldersCount: number;
}
export interface UnknownAction {
    stack: string;
    decoded: string;
}
export interface DiceBetAction {
    minValue: number;
    maxValue: number;
}
export interface RollPayoutAction {
    betTxid: string;
    roll: number;
    seedHash: string;
    result: string;
}
export interface TrophyPayoutAction {
    numTxs: number;
    potAtoms: bigint;
    winnerOddsBps: number;
    winnerTxid: string;
}
export interface PowAction {
    type:
        | 'post'
        | 'reply'
        | 'quote'
        | 'repost'
        | 'like'
        | 'publish'
        | 'unlock'
        | 'auth'
        | 'handle'
        | 'comment'
        | 'comment_reply';
    /** referenced tx (hex txid); present for reply/quote/repost/like/comment_reply */
    targetTxid?: string;
    /** sha256 of stored content (hex); present for post/reply/quote/publish/comment/comment_reply */
    contentHash?: string;
    /** server-issued nonce (hex of 36-byte ASCII UUID); present for auth/handle */
    nonce?: string;
}
export interface AppAction {
    lokadId: string;
    app: string;
    isValid?: boolean;
    action?:
        | AliasAction
        | AirdropAction
        | PaybuttonAction
        | NftoaAction
        | EcashChatAction
        | PaywallAction
        | EcashChatArticleReply
        | CashtabMsgAction
        | XecxAction
        | SolAddrAction
        | DiceBetAction
        | RollPayoutAction
        | TrophyPayoutAction
        | PowAction
        | UnknownAction;
}

/**
 * Cashtab renders an action block for each token entry
 * We get everything we need for the render in this function
 * async and store in this interface so we keep rendering fast
 */
export interface ParsedTokenEntry {
    /**
     * tokenId for this token Entry
     */
    tokenId: string;
    /**
     * See getRenderedTokenType in token-protocols
     * Human-readable token type, i.e. "NFT" or "Collection"
     */
    renderedTokenType: RenderedTokenType;
    /**
     * Same as txType from chronik-client, except we will
     * occasionally overwrite SEND to be BURN if this
     * token entry burns tokens
     */
    renderedTxType: string;
    /**
     * The amount of tokenSatoshis associated with this tokenEntry
     * e.g. the amount sent, or the amount minted, or the amount burned,
     * or the amount purchased on agora, or the amount sold on agora
     *
     * Should be a bigint but jest can't stringify bigints, so we use a string
     * simpler handling
     */
    tokenSatoshis: string;
    /**
     * If this is a Collection token that is creating mint tokens,
     * parse how many are created
     */
    nftFanInputsCreated?: number;
}
export interface ParsedTx {
    recipients: string[];
    satoshisSent: number;
    stackArray: string[];
    xecTxType: XecTxType;
    appActions: AppAction[];
    replyAddress?: string;
    /**
     * Each token entry is associated with its own action, tokenId, token type, and quantity
     * Same length as tokenEntries of this tx
     */
    parsedTokenEntries: ParsedTokenEntry[];
}
