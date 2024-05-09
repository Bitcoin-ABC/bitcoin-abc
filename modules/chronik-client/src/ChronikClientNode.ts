// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import cashaddr from 'ecashaddrjs';
import WebSocket from 'isomorphic-ws';
import * as ws from 'ws';
import * as proto from '../proto/chronikNode';
import { BlockchainInfo, OutPoint } from './ChronikClient';
import { FailoverProxy } from './failoverProxy';
import { fromHex, toHex, toHexRev } from './hex';
import {
    isValidWsSubscription,
    verifyLokadId,
    verifyTokenId,
} from './validation';

type MessageEvent = ws.MessageEvent | { data: Blob };

/**
 * Client to access an in-node Chronik instance.
 * Plain object, without any connections.
 */
export class ChronikClientNode {
    private _proxyInterface: FailoverProxy;
    /**
     * Create a new client. This just creates an object, without any connections.
     *
     * @param {string[]} urls Array of valid urls. A valid url comes with schema and without a trailing slash.
     * e.g. '['https://chronik.be.cash/xec2', 'https://chronik-native.fabien.cash']
     * The approach of accepting an array of urls as input is to ensure redundancy if the
     * first url encounters downtime.
     * @throws {error} throws error on invalid constructor inputs
     */
    constructor(urls: string[]) {
        // Instantiate FailoverProxy with the urls array
        this._proxyInterface = new FailoverProxy(urls);
    }

    // For unit test verification
    public proxyInterface(): FailoverProxy {
        return this._proxyInterface;
    }

    /**
     * Broadcasts the `rawTx` on the network.
     * If `skipTokenChecks` is false, it will be checked that the tx doesn't burn
     * any tokens before broadcasting.
     */
    public async broadcastTx(
        rawTx: Uint8Array | string,
        skipTokenChecks = false,
    ): Promise<{ txid: string }> {
        const request = proto.BroadcastTxRequest.encode({
            rawTx: typeof rawTx === 'string' ? fromHex(rawTx) : rawTx,
            skipTokenChecks,
        }).finish();
        const data = await this._proxyInterface.post('/broadcast-tx', request);
        const broadcastResponse = proto.BroadcastTxResponse.decode(data);
        return {
            txid: toHexRev(broadcastResponse.txid),
        };
    }

    /**
     * Broadcasts the `rawTxs` on the network, only if all of them are valid.
     * If `skipTokenChecks` is false, it will be checked that the txs don't burn
     * any tokens before broadcasting.
     */
    public async broadcastTxs(
        rawTxs: (Uint8Array | string)[],
        skipTokenChecks = false,
    ): Promise<{ txids: string[] }> {
        const request = proto.BroadcastTxsRequest.encode({
            rawTxs: rawTxs.map(rawTx =>
                typeof rawTx === 'string' ? fromHex(rawTx) : rawTx,
            ),
            skipTokenChecks,
        }).finish();
        const data = await this._proxyInterface.post('/broadcast-txs', request);
        const broadcastResponse = proto.BroadcastTxsResponse.decode(data);
        return {
            txids: broadcastResponse.txids.map(toHexRev),
        };
    }

    /** Fetch current info of the blockchain, such as tip hash and height. */
    public async blockchainInfo(): Promise<BlockchainInfo> {
        const data = await this._proxyInterface.get(`/blockchain-info`);
        const blockchainInfo = proto.BlockchainInfo.decode(data);
        return convertToBlockchainInfo(blockchainInfo);
    }

    /** Fetch info about the current running chronik server */
    public async chronikInfo(): Promise<ChronikInfo> {
        const data = await this._proxyInterface.get(`/chronik-info`);
        const chronikServerInfo = proto.ChronikInfo.decode(data);
        return convertToChronikInfo(chronikServerInfo);
    }

    /** Fetch the block given hash or height. */
    public async block(hashOrHeight: string | number): Promise<Block_InNode> {
        const data = await this._proxyInterface.get(`/block/${hashOrHeight}`);
        const block = proto.Block.decode(data);
        return convertToBlock(block);
    }

    /** Fetch the tx history of a block given hash or height. */
    public async blockTxs(
        hashOrHeight: string | number,
        page = 0, // Get the first page if unspecified
        pageSize = 25, // Must be less than 200, let server handle error as server setting could change
    ): Promise<TxHistoryPage_InNode> {
        const data = await this._proxyInterface.get(
            `/block-txs/${hashOrHeight}?page=${page}&page_size=${pageSize}`,
        );
        const blockTxs = proto.TxHistoryPage.decode(data);
        return convertToTxHistoryPage(blockTxs);
    }

    /**
     * Fetch block info of a range of blocks.
     * `startHeight` and `endHeight` are inclusive ranges.
     */
    public async blocks(
        startHeight: number,
        endHeight: number,
    ): Promise<BlockInfo_InNode[]> {
        const data = await this._proxyInterface.get(
            `/blocks/${startHeight}/${endHeight}`,
        );
        const blocks = proto.Blocks.decode(data);
        return blocks.blocks.map(convertToBlockInfo);
    }

    /** Fetch token info and stats given the tokenId. */
    public async token(tokenId: string): Promise<TokenInfo> {
        const data = await this._proxyInterface.get(`/token/${tokenId}`);
        const tokenInfo = proto.TokenInfo.decode(data);
        return convertToTokenInfo(tokenInfo);
    }

    /** Fetch tx details given the txid. */
    public async tx(txid: string): Promise<Tx_InNode> {
        const data = await this._proxyInterface.get(`/tx/${txid}`);
        const tx = proto.Tx.decode(data);
        return convertToTx(tx);
    }

    /** Fetch tx details given the txid. */
    public async rawTx(txid: string): Promise<RawTx> {
        const data = await this._proxyInterface.get(`/raw-tx/${txid}`);
        const rawTx = proto.RawTx.decode(data);
        return convertToRawTx(rawTx);
    }

    /** Create object that allows fetching info about a given token */
    public tokenId(tokenId: string): TokenIdEndpoint {
        return new TokenIdEndpoint(this._proxyInterface, tokenId);
    }

    /** Create object that allows fetching info about a given lokadId */
    public lokadId(lokadId: string): LokadIdEndpoint {
        return new LokadIdEndpoint(this._proxyInterface, lokadId);
    }

    /** Create object that allows fetching script history or UTXOs. */
    public script(
        scriptType: ScriptType_InNode,
        scriptPayload: string,
    ): ScriptEndpointInNode {
        return new ScriptEndpointInNode(
            this._proxyInterface,
            scriptType,
            scriptPayload,
        );
    }

    /** Create object that allows fetching script history or UTXOs by p2pkh or p2sh address */
    public address(address: string): ScriptEndpointInNode {
        const { type, hash } = cashaddr.decode(address, true);

        return new ScriptEndpointInNode(
            this._proxyInterface,
            type,
            hash as string,
        );
    }

    /** Open a WebSocket connection to listen for updates. */
    public ws(config: WsConfig_InNode): WsEndpoint_InNode {
        return new WsEndpoint_InNode(this._proxyInterface, config);
    }
}

/** Allows fetching script history and UTXOs. */
export class ScriptEndpointInNode {
    private _proxyInterface: FailoverProxy;
    private _scriptType: string;
    private _scriptPayload: string;

    constructor(
        proxyInterface: FailoverProxy,
        scriptType: string,
        scriptPayload: string,
    ) {
        this._proxyInterface = proxyInterface;
        this._scriptType = scriptType;
        this._scriptPayload = scriptPayload;
    }

    /**
     * Fetches the tx history of this script, in anti-chronological order.
     * This means it's ordered by first-seen first, i.e. TxHistoryPage_InNode.txs[0]
     * will be the most recent tx. If the tx hasn't been seen
     * by the indexer before, it's ordered by the block timestamp.
     * @param page Page index of the tx history.
     * @param pageSize Number of txs per page.
     */
    public async history(
        page = 0, // Get the first page if unspecified
        pageSize = 25, // Must be less than 200, let server handle error as server setting could change
    ): Promise<TxHistoryPage_InNode> {
        const data = await this._proxyInterface.get(
            `/script/${this._scriptType}/${this._scriptPayload}/history?page=${page}&page_size=${pageSize}`,
        );
        const historyPage = proto.TxHistoryPage.decode(data);
        return {
            txs: historyPage.txs.map(convertToTx),
            numPages: historyPage.numPages,
            numTxs: historyPage.numTxs,
        };
    }

    /**
     * Fetches the confirmed tx history of this script, in the order they appear on the blockchain.
     * @param page Page index of the tx history.
     * @param pageSize Number of txs per page.
     */
    public async confirmedTxs(
        page = 0, // Get the first page if unspecified
        pageSize = 25, // Must be less than 200, let server handle error as server setting could change
    ): Promise<TxHistoryPage_InNode> {
        const data = await this._proxyInterface.get(
            `/script/${this._scriptType}/${this._scriptPayload}/confirmed-txs?page=${page}&page_size=${pageSize}`,
        );
        const historyPage = proto.TxHistoryPage.decode(data);
        return {
            txs: historyPage.txs.map(convertToTx),
            numPages: historyPage.numPages,
            numTxs: historyPage.numTxs,
        };
    }

    /**
     * Fetches the unconfirmed tx history of this script, in chronological order.
     * @param page Page index of the tx history.
     * @param pageSize Number of txs per page.
     */
    public async unconfirmedTxs(
        page = 0, // Get the first page if unspecified
        pageSize = 25, // Must be less than 200, let server handle error as server setting could change
    ): Promise<TxHistoryPage_InNode> {
        const data = await this._proxyInterface.get(
            `/script/${this._scriptType}/${this._scriptPayload}/unconfirmed-txs?page=${page}&page_size=${pageSize}`,
        );
        const historyPage = proto.TxHistoryPage.decode(data);
        return {
            txs: historyPage.txs.map(convertToTx),
            numPages: historyPage.numPages,
            numTxs: historyPage.numTxs,
        };
    }

    /**
     * Fetches the current UTXO set for this script.
     * It is grouped by output script, in case a script type can match multiple
     * different output scripts (e.g. Taproot on Lotus).
     */
    public async utxos(): Promise<ScriptUtxos_InNode> {
        const data = await this._proxyInterface.get(
            `/script/${this._scriptType}/${this._scriptPayload}/utxos`,
        );
        const scriptUtxos = proto.ScriptUtxos.decode(data);
        return {
            outputScript: toHex(scriptUtxos.script),
            utxos: scriptUtxos.utxos.map(convertToScriptUtxo),
        };
    }
}

/** Allows fetching tokenId confirmedTxs, unconfirmedTxs, history, and UTXOs. */
export class TokenIdEndpoint {
    private _proxyInterface: FailoverProxy;
    private _tokenId: string;

    constructor(proxyInterface: FailoverProxy, tokenId: string) {
        this._proxyInterface = proxyInterface;
        this._tokenId = tokenId;
    }

    /**
     * Fetches the tx history of this tokenId, in anti-chronological order.
     * @param page Page index of the tx history.
     * @param pageSize Number of txs per page.
     */
    public async history(
        page = 0, // Get the first page if unspecified
        pageSize = 25, // Must be less than 200, let server handle error as server setting could change
    ): Promise<TxHistoryPage_InNode> {
        const data = await this._proxyInterface.get(
            `/token-id/${this._tokenId}/history?page=${page}&page_size=${pageSize}`,
        );
        const historyPage = proto.TxHistoryPage.decode(data);
        return {
            txs: historyPage.txs.map(convertToTx),
            numPages: historyPage.numPages,
            numTxs: historyPage.numTxs,
        };
    }

    /**
     * Fetches the confirmed tx history of this tokenId, in the order they appear on the blockchain.
     * @param page Page index of the tx history.
     * @param pageSize Number of txs per page.
     */
    public async confirmedTxs(
        page = 0, // Get the first page if unspecified
        pageSize = 25, // Must be less than 200, let server handle error as server setting could change
    ): Promise<TxHistoryPage_InNode> {
        const data = await this._proxyInterface.get(
            `/token-id/${this._tokenId}/confirmed-txs?page=${page}&page_size=${pageSize}`,
        );
        const historyPage = proto.TxHistoryPage.decode(data);
        return {
            txs: historyPage.txs.map(convertToTx),
            numPages: historyPage.numPages,
            numTxs: historyPage.numTxs,
        };
    }

    /**
     * Fetches the unconfirmed tx history of this tokenId, in chronological order.
     * @param page Page index of the tx history.
     * @param pageSize Number of txs per page.
     */
    public async unconfirmedTxs(
        page = 0, // Get the first page if unspecified
        pageSize = 25, // Must be less than 200, let server handle error as server setting could change
    ): Promise<TxHistoryPage_InNode> {
        const data = await this._proxyInterface.get(
            `/token-id/${this._tokenId}/unconfirmed-txs?page=${page}&page_size=${pageSize}`,
        );
        const historyPage = proto.TxHistoryPage.decode(data);
        return {
            txs: historyPage.txs.map(convertToTx),
            numPages: historyPage.numPages,
            numTxs: historyPage.numTxs,
        };
    }

    /**
     * Fetches the current UTXO set for this tokenId.
     */
    public async utxos(): Promise<TokenIdUtxos> {
        const data = await this._proxyInterface.get(
            `/token-id/${this._tokenId}/utxos`,
        );
        const utxos = proto.Utxos.decode(data);
        return {
            tokenId: this._tokenId,
            utxos: utxos.utxos.map(convertToUtxo),
        };
    }
}

/** Allows fetching lokadId confirmedTxs, unconfirmedTxs, and history. */
export class LokadIdEndpoint {
    private _proxyInterface: FailoverProxy;
    private _lokadId: string;

    constructor(proxyInterface: FailoverProxy, lokadId: string) {
        this._proxyInterface = proxyInterface;
        this._lokadId = lokadId;
    }

    /**
     * Fetches the tx history of this tokenId, in anti-chronological order.
     * @param page Page index of the tx history.
     * @param pageSize Number of txs per page.
     */
    public async history(
        page = 0, // Get the first page if unspecified
        pageSize = 25, // Must be less than 200, let server handle error as server setting could change
    ): Promise<TxHistoryPage_InNode> {
        const data = await this._proxyInterface.get(
            `/lokad-id/${this._lokadId}/history?page=${page}&page_size=${pageSize}`,
        );
        const historyPage = proto.TxHistoryPage.decode(data);
        return {
            txs: historyPage.txs.map(convertToTx),
            numPages: historyPage.numPages,
            numTxs: historyPage.numTxs,
        };
    }

    /**
     * Fetches the confirmed tx history of this tokenId, in the order they appear on the blockchain.
     * @param page Page index of the tx history.
     * @param pageSize Number of txs per page.
     */
    public async confirmedTxs(
        page = 0, // Get the first page if unspecified
        pageSize = 25, // Must be less than 200, let server handle error as server setting could change
    ): Promise<TxHistoryPage_InNode> {
        const data = await this._proxyInterface.get(
            `/lokad-id/${this._lokadId}/confirmed-txs?page=${page}&page_size=${pageSize}`,
        );
        const historyPage = proto.TxHistoryPage.decode(data);
        return {
            txs: historyPage.txs.map(convertToTx),
            numPages: historyPage.numPages,
            numTxs: historyPage.numTxs,
        };
    }

    /**
     * Fetches the unconfirmed tx history of this tokenId, in chronological order.
     * @param page Page index of the tx history.
     * @param pageSize Number of txs per page.
     */
    public async unconfirmedTxs(
        page = 0, // Get the first page if unspecified
        pageSize = 25, // Must be less than 200, let server handle error as server setting could change
    ): Promise<TxHistoryPage_InNode> {
        const data = await this._proxyInterface.get(
            `/lokad-id/${this._lokadId}/unconfirmed-txs?page=${page}&page_size=${pageSize}`,
        );
        const historyPage = proto.TxHistoryPage.decode(data);
        return {
            txs: historyPage.txs.map(convertToTx),
            numPages: historyPage.numPages,
            numTxs: historyPage.numTxs,
        };
    }
}

/** Config for a WebSocket connection to Chronik. */
export interface WsConfig_InNode {
    /** Fired when a message is sent from the WebSocket. */
    onMessage?: (msg: WsMsgClient) => void;

    /** Fired when a connection has been (re)established. */
    onConnect?: (e: ws.Event) => void;

    /**
     * Fired after a connection has been unexpectedly closed, and before a
     * reconnection attempt is made. Only fired if `autoReconnect` is true.
     */
    onReconnect?: (e: ws.Event) => void;

    /** Fired when an error with the WebSocket occurs. */
    onError?: (e: ws.ErrorEvent) => void;

    /**
     * Fired after a connection has been manually closed, or if `autoReconnect`
     * is false, if the WebSocket disconnects for any reason.
     */
    onEnd?: (e: ws.Event) => void;

    /** Whether to automatically reconnect on disconnect, default true. */
    autoReconnect?: boolean;
}

/** WebSocket connection to Chronik. */
export class WsEndpoint_InNode {
    private _proxyInterface: FailoverProxy;
    /** Fired when a message is sent from the WebSocket. */
    public onMessage?: (msg: WsMsgClient) => void;

    /** Fired when a connection has been (re)established. */
    public onConnect?: (e: ws.Event) => void;

    /**
     * Fired after a connection has been unexpectedly closed, and before a
     * reconnection attempt is made. Only fired if `autoReconnect` is true.
     */
    public onReconnect?: (e: ws.Event) => void;

    /** Fired when an error with the WebSocket occurs. */
    public onError?: (e: ws.ErrorEvent) => void;

    /**
     * Fired after a connection has been manually closed, or if `autoReconnect`
     * is false, if the WebSocket disconnects for any reason.
     */
    public onEnd?: (e: ws.Event) => void;

    /** Whether to automatically reconnect on disconnect, default true. */
    public autoReconnect: boolean;

    public ws: ws.WebSocket | undefined;
    public connected: Promise<ws.Event> | undefined;
    public manuallyClosed: boolean;
    public subs: WsSubscriptions;

    constructor(proxyInterface: FailoverProxy, config: WsConfig_InNode) {
        this.onMessage = config.onMessage;
        this.onConnect = config.onConnect;
        this.onReconnect = config.onReconnect;
        this.onEnd = config.onEnd;
        this.autoReconnect =
            config.autoReconnect !== undefined ? config.autoReconnect : true;
        this.manuallyClosed = false;
        this.subs = { scripts: [], tokens: [], lokadIds: [], blocks: false };
        this._proxyInterface = proxyInterface;
    }

    /** Wait for the WebSocket to be connected. */
    public async waitForOpen() {
        await this._proxyInterface.connectWs(this);
        await this.connected;
    }

    /**
     * Subscribe to block messages
     */
    public subscribeToBlocks() {
        this.subs.blocks = true;
        if (this.ws?.readyState === WebSocket.OPEN) {
            this._subUnsubBlocks(false);
        }
    }

    /**
     * Unsubscribe from block messages
     */
    public unsubscribeFromBlocks() {
        this.subs.blocks = false;
        if (this.ws?.readyState === WebSocket.OPEN) {
            this._subUnsubBlocks(true);
        }
    }

    /**
     * Subscribe to the given script type and payload.
     * For "p2pkh", `scriptPayload` is the 20 byte public key hash.
     */
    public subscribeToScript(type: ScriptType_InNode, payload: string) {
        // Build sub according to chronik expected type
        const subscription: WsSubScriptClient = {
            scriptType: type,
            payload,
        };
        // We do not want to add invalid subs to ws.subs
        const scriptSubscriptionValidationCheck =
            isValidWsSubscription(subscription);

        if (scriptSubscriptionValidationCheck !== true) {
            // isValidWsSubscription returns string error msg if the sub is invalid
            throw new Error(scriptSubscriptionValidationCheck as string);
        }

        this.subs.scripts.push(subscription as WsSubScriptClient);

        if (this.ws?.readyState === WebSocket.OPEN) {
            this._subUnsubScript(false, subscription);
        }
    }

    /** Unsubscribe from the given script type and payload. */
    public unsubscribeFromScript(type: ScriptType_InNode, payload: string) {
        // Build sub according to chronik expected type
        const subscription: WsSubScriptClient = {
            scriptType: type,
            payload,
        };

        // Find the requested unsub script and remove it
        const unsubIndex = this.subs.scripts.findIndex(
            sub => sub.scriptType === type && sub.payload === payload,
        );
        if (unsubIndex === -1) {
            // If we cannot find this subscription in this.subs, throw an error
            // We do not want an app developer thinking they have unsubscribed from something
            throw new Error(`No existing sub at ${type}, ${payload}`);
        }

        // Remove the requested subscription from this.subs
        this.subs.scripts.splice(unsubIndex, 1);

        if (this.ws?.readyState === WebSocket.OPEN) {
            this._subUnsubScript(true, subscription);
        }
    }

    /**
     * Subscribe to an address
     * Method can be used for p2pkh or p2sh addresses
     */
    public subscribeToAddress(address: string) {
        // Get type and hash
        const { type, hash } = cashaddr.decode(address, true);

        // Subscribe to script
        this.subscribeToScript(type as 'p2pkh' | 'p2sh', hash as string);
    }

    /** Unsubscribe from the given address */
    public unsubscribeFromAddress(address: string) {
        // Get type and hash
        const { type, hash } = cashaddr.decode(address, true);

        // Unsubscribe from script
        this.unsubscribeFromScript(type as 'p2pkh' | 'p2sh', hash as string);
    }

    /** Subscribe to a lokadId */
    public subscribeToLokadId(lokadId: string) {
        verifyLokadId(lokadId);

        // Update ws.subs to include this lokadId
        this.subs.lokadIds.push(lokadId);

        if (this.ws?.readyState === WebSocket.OPEN) {
            // Send subscribe msg to chronik server
            this._subUnsubLokadId(false, lokadId);
        }
    }

    /** Unsubscribe from the given lokadId */
    public unsubscribeFromLokadId(lokadId: string) {
        // Find the requested unsub lokadId and remove it
        const unsubIndex = this.subs.lokadIds.findIndex(
            thisLokadId => thisLokadId === lokadId,
        );
        if (unsubIndex === -1) {
            // If we cannot find this subscription in this.subs.lokadIds, throw an error
            // We do not want an app developer thinking they have unsubscribed from something if no action happened
            throw new Error(`No existing sub at lokadId "${lokadId}"`);
        }

        // Remove the requested lokadId subscription from this.subs.lokadIds
        this.subs.lokadIds.splice(unsubIndex, 1);

        if (this.ws?.readyState === WebSocket.OPEN) {
            // Send unsubscribe msg to chronik server
            this._subUnsubLokadId(true, lokadId);
        }
    }

    /** Subscribe to a tokenId */
    public subscribeToTokenId(tokenId: string) {
        verifyTokenId(tokenId);

        // Update ws.subs to include this tokenId
        this.subs.tokens.push(tokenId);

        if (this.ws?.readyState === WebSocket.OPEN) {
            // Send subscribe msg to chronik server
            this._subUnsubToken(false, tokenId);
        }
    }

    /** Unsubscribe from the given tokenId */
    public unsubscribeFromTokenId(tokenId: string) {
        // Find the requested unsub tokenId and remove it
        const unsubIndex = this.subs.tokens.findIndex(
            thisTokenId => thisTokenId === tokenId,
        );
        if (unsubIndex === -1) {
            // If we cannot find this subscription in this.subs.tokens, throw an error
            // We do not want an app developer thinking they have unsubscribed from something if no action happened
            throw new Error(`No existing sub at tokenId "${tokenId}"`);
        }

        // Remove the requested tokenId subscription from this.subs.tokens
        this.subs.tokens.splice(unsubIndex, 1);

        if (this.ws?.readyState === WebSocket.OPEN) {
            // Send unsubscribe msg to chronik server
            this._subUnsubToken(true, tokenId);
        }
    }

    /**
     * Close the WebSocket connection and prevent any future reconnection
     * attempts.
     */
    public close() {
        this.manuallyClosed = true;
        this.ws?.close();
    }

    private _subUnsubBlocks(isUnsub: boolean) {
        // Blocks subscription is empty object
        const BLOCKS_SUBSCRIPTION: proto.WsSubBlocks = {};
        const encodedSubscription = proto.WsSub.encode({
            isUnsub,
            blocks: BLOCKS_SUBSCRIPTION,
        }).finish();
        if (this.ws === undefined) {
            throw new Error('Invalid state; _ws is undefined');
        }
        this.ws.send(encodedSubscription);
    }

    private _subUnsubScript(isUnsub: boolean, subscription: WsSubScriptClient) {
        // If this subscription is to an address, leave the 'blocks' key undefined
        const encodedSubscription = proto.WsSub.encode({
            isUnsub,
            script: {
                scriptType: (subscription as WsSubScriptClient).scriptType,
                payload: fromHex((subscription as WsSubScriptClient).payload),
            },
        }).finish();

        if (this.ws === undefined) {
            throw new Error('Invalid state; _ws is undefined');
        }

        this.ws.send(encodedSubscription);
    }

    private _subUnsubLokadId(isUnsub: boolean, lokadId: string) {
        const encodedSubscription = proto.WsSub.encode({
            isUnsub,
            lokadId: {
                // User input for lokadId is string
                // Chronik expects bytes
                lokadId: fromHex(lokadId),
            },
        }).finish();

        if (this.ws === undefined) {
            throw new Error('Invalid state; _ws is undefined');
        }

        this.ws.send(encodedSubscription);
    }

    private _subUnsubToken(isUnsub: boolean, tokenId: string) {
        const encodedSubscription = proto.WsSub.encode({
            isUnsub,
            tokenId: {
                tokenId: tokenId,
            },
        }).finish();

        if (this.ws === undefined) {
            throw new Error('Invalid state; _ws is undefined');
        }

        this.ws.send(encodedSubscription);
    }

    public async handleMsg(wsMsg: MessageEvent) {
        if (typeof this.onMessage === 'undefined') {
            return;
        }
        const data =
            typeof window === 'undefined'
                ? // NodeJS
                  (wsMsg.data as Uint8Array)
                : // Browser
                  new Uint8Array(await (wsMsg.data as Blob).arrayBuffer());
        const msg = proto.WsMsg.decode(data);
        if (typeof msg.error !== 'undefined') {
            this.onMessage({ type: 'Error', ...msg.error });
        } else if (typeof msg.block !== 'undefined') {
            this.onMessage({
                type: 'Block',
                msgType: convertToBlockMsgType(msg.block.msgType),
                blockHash: toHexRev(msg.block.blockHash),
                blockHeight: msg.block.blockHeight,
            });
        } else if (typeof msg.tx !== 'undefined') {
            this.onMessage({
                type: 'Tx',
                msgType: convertToTxMsgType(msg.tx.msgType),
                txid: toHexRev(msg.tx.txid),
            });
        } else {
            console.log('Silently ignored unknown Chronik message:', msg);
        }
    }
}

function convertToBlockchainInfo(
    blockchainInfo: proto.BlockchainInfo,
): BlockchainInfo {
    return {
        tipHash: toHexRev(blockchainInfo.tipHash),
        tipHeight: blockchainInfo.tipHeight,
    };
}

function convertToChronikInfo(chronikInfo: proto.ChronikInfo): ChronikInfo {
    if (chronikInfo.version === undefined) {
        throw new Error('chronikInfo has no version');
    }
    return {
        version: chronikInfo.version.length !== 0 ? chronikInfo.version : '',
    };
}

function convertToBlock(block: proto.Block): Block_InNode {
    if (block.blockInfo === undefined) {
        throw new Error('Block has no blockInfo');
    }
    return {
        blockInfo: convertToBlockInfo(block.blockInfo),
    };
}

function convertToTxHistoryPage(
    blockTxs: proto.TxHistoryPage,
): TxHistoryPage_InNode {
    const { txs, numPages, numTxs } = blockTxs;
    const convertedTxs = txs.map(convertToTx);
    return {
        txs: convertedTxs,
        numPages,
        numTxs,
    };
}

function convertToBlockInfo(block: proto.BlockInfo): BlockInfo_InNode {
    return {
        ...block,
        hash: toHexRev(block.hash),
        prevHash: toHexRev(block.prevHash),
        timestamp: parseInt(block.timestamp),
        blockSize: parseInt(block.blockSize),
        numTxs: parseInt(block.numTxs),
        numInputs: parseInt(block.numInputs),
        numOutputs: parseInt(block.numOutputs),
        sumInputSats: parseInt(block.sumInputSats),
        sumCoinbaseOutputSats: parseInt(block.sumCoinbaseOutputSats),
        sumNormalOutputSats: parseInt(block.sumNormalOutputSats),
        sumBurnedSats: parseInt(block.sumBurnedSats),
    };
}

function convertToTx(tx: proto.Tx): Tx_InNode {
    const convertedTx: Tx_InNode = {
        txid: toHexRev(tx.txid),
        version: tx.version,
        inputs: tx.inputs.map(convertToTxInput),
        outputs: tx.outputs.map(convertToTxOutput),
        lockTime: tx.lockTime,
        timeFirstSeen: parseInt(tx.timeFirstSeen),
        size: tx.size,
        isCoinbase: tx.isCoinbase,
        tokenEntries: tx.tokenEntries.map(convertToTokenEntry),
        tokenFailedParsings: tx.tokenFailedParsings.map(
            convertToTokenFailedParsing,
        ),
        tokenStatus: convertToTokenStatus(tx.tokenStatus),
    };
    if (typeof tx.block !== 'undefined') {
        // Only include block if the tx is in a block
        convertedTx.block = convertToBlockMeta(tx.block);
    }
    return convertedTx;
}

function convertToTxInput(input: proto.TxInput): TxInput_InNode {
    if (input.prevOut === undefined) {
        throw new Error('Invalid proto, no prevOut');
    }
    const txInput: TxInput_InNode = {
        prevOut: {
            txid: toHexRev(input.prevOut.txid),
            outIdx: input.prevOut.outIdx,
        },
        inputScript: toHex(input.inputScript),
        value: parseInt(input.value),
        sequenceNo: input.sequenceNo,
    };
    if (typeof input.token !== 'undefined') {
        // We only return a token key if we have token data for this input
        txInput.token = convertToTokenInNode(input.token);
    }
    if (
        typeof input.outputScript !== 'undefined' &&
        input.outputScript.length > 0
    ) {
        // Coinbase tx inputs do not have an outputScript
        txInput.outputScript = toHex(input.outputScript);
    }
    return txInput;
}

function convertToTxOutput(output: proto.TxOutput): TxOutput_InNode {
    const txOutput: TxOutput_InNode = {
        value: parseInt(output.value),
        outputScript: toHex(output.outputScript),
    };
    if (typeof output.token !== 'undefined') {
        // We only return a token key if we have token data for this input
        txOutput.token = convertToTokenInNode(output.token);
    }
    if (typeof output.spentBy !== 'undefined') {
        // We only return a spentBy key if this output has been spent
        txOutput.spentBy = {
            txid: toHexRev(output.spentBy.txid),
            outIdx: output.spentBy.inputIdx,
        };
    }
    return txOutput;
}

function convertToBlockMeta(block: proto.BlockMetadata): BlockMetadata_InNode {
    return {
        height: block.height,
        hash: toHexRev(block.hash),
        timestamp: parseInt(block.timestamp),
    };
}

function convertToRawTx(rawTx: proto.RawTx): RawTx {
    return {
        rawTx: toHex(rawTx.rawTx),
    };
}

function convertToScriptUtxo(utxo: proto.ScriptUtxo): ScriptUtxo_InNode {
    if (utxo.outpoint === undefined) {
        throw new Error('UTXO outpoint is undefined');
    }
    const utxoInNode: ScriptUtxo_InNode = {
        outpoint: {
            txid: toHexRev(utxo.outpoint.txid),
            outIdx: utxo.outpoint.outIdx,
        },
        blockHeight: utxo.blockHeight,
        isCoinbase: utxo.isCoinbase,
        value: parseInt(utxo.value),
        isFinal: utxo.isFinal,
    };
    if (typeof utxo.token !== 'undefined') {
        // We only return a token key if we have token data for this input
        utxoInNode.token = convertToTokenInNode(utxo.token);
    }
    return utxoInNode;
}

function convertToUtxo(utxo: proto.Utxo): Utxo_InNode {
    if (utxo.outpoint === undefined) {
        throw new Error('UTXO outpoint is undefined');
    }
    const utxoInNode: Utxo_InNode = {
        outpoint: {
            txid: toHexRev(utxo.outpoint.txid),
            outIdx: utxo.outpoint.outIdx,
        },
        blockHeight: utxo.blockHeight,
        isCoinbase: utxo.isCoinbase,
        script: toHex(utxo.script),
        value: parseInt(utxo.value),
        isFinal: utxo.isFinal,
    };
    if (typeof utxo.token !== 'undefined') {
        // We only return a token key if we have token data for this input
        utxoInNode.token = convertToTokenInNode(utxo.token);
    }
    return utxoInNode;
}

function convertToTokenEntry(tokenEntry: proto.TokenEntry): TokenEntry {
    if (typeof tokenEntry.tokenType === 'undefined') {
        // Not expected to ever happen
        throw new Error(
            `chronik returned undefined tokenEntry.tokenType for tokenId "${tokenEntry.tokenId}"`,
        );
    }
    const returnObj: TokenEntry = {
        tokenId: tokenEntry.tokenId,
        tokenType: convertToTokenType(tokenEntry.tokenType),
        txType: convertToTokenTxType(tokenEntry.txType),
        isInvalid: tokenEntry.isInvalid,
        burnSummary: tokenEntry.burnSummary,
        failedColorings: tokenEntry.failedColorings,
        actualBurnAmount: tokenEntry.actualBurnAmount,
        intentionalBurn: tokenEntry.intentionalBurn,
        burnsMintBatons: tokenEntry.burnsMintBatons,
    };
    if (tokenEntry.groupTokenId !== '') {
        // Only include groupTokenId if it is not empty
        returnObj.groupTokenId = tokenEntry.groupTokenId;
    }
    return returnObj;
}

function convertToTokenFailedParsing(
    tokenFailedParsing: proto.TokenFailedParsing,
): TokenFailedParsing {
    return {
        pushdataIdx: tokenFailedParsing.pushdataIdx,
        bytes: toHex(tokenFailedParsing.bytes),
        error: tokenFailedParsing.error,
    };
}

function convertToTokenType(tokenType: proto.TokenType): TokenType {
    if (typeof tokenType.alp !== 'undefined') {
        return {
            protocol: 'ALP',
            type: convertToAlpTokenType(tokenType.alp),
            number: tokenType.alp,
        };
    }
    if (typeof tokenType.slp !== 'undefined') {
        return {
            protocol: 'SLP',
            type: convertToSlpTokenType(tokenType.slp),
            number: tokenType.slp,
        };
    }
    // Should never happen
    throw new Error('chronik did not return a token protocol for this token');
}

function convertToSlpTokenType(
    msgType: proto.SlpTokenType,
): SlpTokenType_InNode_Type {
    const slpTokenType = proto.slpTokenTypeToJSON(msgType);
    if (isSlpTokenType(slpTokenType)) {
        return slpTokenType;
    }
    return 'SLP_TOKEN_TYPE_UNKNOWN';
}

function isSlpTokenType(msgType: any): msgType is SlpTokenType_InNode_Type {
    return SLP_TOKEN_TYPES.includes(msgType);
}

function convertToAlpTokenType(msgType: proto.AlpTokenType): AlpTokenType_Type {
    const alpTokenType = proto.alpTokenTypeToJSON(msgType);
    if (isAlpTokenType(alpTokenType)) {
        return alpTokenType;
    }
    return 'ALP_TOKEN_TYPE_UNKNOWN';
}

function isAlpTokenType(msgType: any): msgType is AlpTokenType_Type {
    return ALP_TOKEN_TYPES.includes(msgType);
}

function convertToTokenStatus(msgType: proto.TokenStatus): TokenStatus {
    const tokenStatus = proto.tokenStatusToJSON(msgType);
    if (isTokenStatus(tokenStatus)) {
        return tokenStatus;
    }
    return 'TOKEN_STATUS_UNKNOWN';
}

function isTokenStatus(msgType: any): msgType is TokenStatus {
    return TOKEN_STATUS_TYPES.includes(msgType);
}

function convertToTokenTxType(msgType: proto.TokenTxType): TokenTxType {
    const tokenTxType = proto.tokenTxTypeToJSON(msgType);
    if (isTokenTxType(tokenTxType)) {
        return tokenTxType;
    }
    return 'UNKNOWN';
}

function isTokenTxType(msgType: any): msgType is TokenTxType {
    return TOKEN_TX_TYPE_TYPES.includes(msgType);
}

function convertToTokenInNode(token: proto.Token): Token_InNode {
    if (typeof token.tokenType === 'undefined') {
        // Not expected to ever happen
        throw new Error(
            `chronik returned undefined token.tokenType for tokenId "${token.tokenId}"`,
        );
    }

    const tokenInNode: Token_InNode = {
        tokenId: token.tokenId,
        tokenType: convertToTokenType(token.tokenType),
        amount: token.amount,
        isMintBaton: token.isMintBaton,
    };

    // We do not bother including entryIdx for utxos, where it is always -1
    if (token.entryIdx !== -1) {
        tokenInNode.entryIdx = token.entryIdx;
    }

    return tokenInNode;
}

function convertToBlockMsgType(msgType: proto.BlockMsgType): BlockMsgType {
    const blockMsgType = proto.blockMsgTypeToJSON(msgType);
    if (isBlockMsgType(blockMsgType)) {
        return blockMsgType;
    }
    return 'UNRECOGNIZED';
}

function isBlockMsgType(msgType: any): msgType is BlockMsgType {
    return BLK_MSG_TYPES.includes(msgType);
}

function convertToTxMsgType(msgType: proto.TxMsgType): TxMsgType {
    const txMsgType = proto.txMsgTypeToJSON(msgType);
    if (isTxMsgType(txMsgType)) {
        return txMsgType;
    }
    return 'UNRECOGNIZED';
}

function convertToTokenInfo(tokenInfo: proto.TokenInfo): TokenInfo {
    if (typeof tokenInfo.tokenType === 'undefined') {
        // Not expected to ever happen
        throw new Error(
            `chronik returned undefined tokenInfo.tokenType for tokenId "${tokenInfo.tokenId}"`,
        );
    }
    if (typeof tokenInfo.genesisInfo === 'undefined') {
        // Not expected to ever happen
        throw new Error(
            `chronik returned undefined tokenInfo.genesisInfo for tokenId "${tokenInfo.tokenId}"`,
        );
    }

    // We use tokenType to get the correct shape of genesisInfo
    const tokenType = convertToTokenType(tokenInfo.tokenType);

    const returnedTokenInfo: TokenInfo = {
        tokenId: tokenInfo.tokenId,
        tokenType,
        timeFirstSeen: parseInt(tokenInfo.timeFirstSeen),
        genesisInfo: convertToGenesisInfo(tokenInfo.genesisInfo, tokenType),
    };

    if (typeof tokenInfo.block !== 'undefined') {
        // Only include block if the tx is in a block
        returnedTokenInfo.block = convertToBlockMeta(tokenInfo.block);
    }

    return returnedTokenInfo;
}

function convertToGenesisInfo(
    genesisInfo: proto.GenesisInfo,
    tokenType: TokenType,
): GenesisInfo {
    const decoder = new TextDecoder();
    const returnedGenesisInfo: GenesisInfo = {
        tokenTicker: decoder.decode(genesisInfo.tokenTicker),
        tokenName: decoder.decode(genesisInfo.tokenName),
        url: decoder.decode(genesisInfo.url),
        decimals: genesisInfo.decimals,
    };

    // Add ALP fields for ALP types only
    if (tokenType.protocol === 'ALP') {
        returnedGenesisInfo.data = genesisInfo.data;
        returnedGenesisInfo.authPubkey = toHex(genesisInfo.authPubkey);
    }

    // Add mintVaultHash for SLP Mint Vault only
    if (tokenType.type === 'SLP_TOKEN_TYPE_MINT_VAULT') {
        returnedGenesisInfo.mintVaultScripthash = toHex(
            genesisInfo.mintVaultScripthash,
        );
    }

    // Add url for SLP only
    if (tokenType.protocol === 'SLP') {
        returnedGenesisInfo.hash = toHex(genesisInfo.hash);
    }

    return returnedGenesisInfo;
}

function isTxMsgType(msgType: any): msgType is TxMsgType {
    return TX_MSG_TYPES.includes(msgType);
}

/** Info about connected chronik server */
export interface ChronikInfo {
    version: string;
}

/**  BlockInfo interface for in-node chronik */
export interface BlockInfo_InNode {
    /** Block hash of the block, in 'human-readable' (big-endian) hex encoding. */
    hash: string;
    /** Block hash of the prev block, in 'human-readable' (big-endian) hex encoding. */
    prevHash: string;
    /** Height of the block; Genesis block has height 0. */
    height: number;
    /** nBits field of the block, encodes the target compactly. */
    nBits: number;
    /**
     * Timestamp of the block. Filled in by the miner,
     * so might not be 100 % precise.
     */
    timestamp: number;
    /** Is this block avalanche finalized? */
    isFinal: boolean;
    /** Block size of this block in bytes (including headers etc.). */
    blockSize: number;
    /** Number of txs in this block. */
    numTxs: number;
    /** Total number of tx inputs in block (including coinbase). */
    numInputs: number;
    /** Total number of tx output in block (including coinbase). */
    numOutputs: number;
    /** Total number of satoshis spent by tx inputs. */
    sumInputSats: number;
    /** Total block reward for this block. */
    sumCoinbaseOutputSats: number;
    /** Total number of satoshis in non-coinbase tx outputs. */
    sumNormalOutputSats: number;
    /** Total number of satoshis burned using OP_RETURN. */
    sumBurnedSats: number;
}

/** Block interface for in-node chronik */
export interface Block_InNode {
    /** Contains the blockInfo object defined above */
    blockInfo: BlockInfo_InNode;
}

/** A page of in-node chronik tx history */
export interface TxHistoryPage_InNode {
    /** Txs of the page */
    txs: Tx_InNode[];
    /** How many pages there are total */
    numPages: number;
    /** How many txs there are total */
    numTxs: number;
}

/** The hex bytes of a raw tx */
export interface RawTx {
    rawTx: string;
}

/** A transaction on the blockchain or in the mempool. */
export interface Tx_InNode {
    /** Transaction ID. */
    txid: string;
    /** `version` field of the transaction. */
    version: number;
    /** Inputs of this transaction. */
    inputs: TxInput_InNode[];
    /** Outputs of this transaction. */
    outputs: TxOutput_InNode[];
    /** `locktime` field of the transaction, tx is not valid before this time. */
    lockTime: number;
    /** Block data for this tx, if it is in a block. */
    block?: BlockMetadata_InNode;
    /**
     * UNIX timestamp when this tx has first been seen in the mempool.
     * 0 if unknown -> make sure to check.
     */
    timeFirstSeen: number;
    /** Serialized size of the tx. */
    size: number;
    /** Whether this tx is a coinbase tx. */
    isCoinbase: boolean;
    /** Tokens involved in this txs */
    tokenEntries: TokenEntry[];
    /** Failed parsing attempts of this tx */
    tokenFailedParsings: TokenFailedParsing[];
    /**
     * Token status, i.e. whether this tx has any tokens or unintentional token burns
     * or something unexpected, like failed parsings etc.
     */
    tokenStatus: TokenStatus;
}

/** Input of a tx, spends an output of a previous tx. */
export interface TxInput_InNode {
    /** Points to an output spent by this input. */
    prevOut: OutPoint;
    /**
     * Script unlocking the output, in hex encoding.
     * Aka. `scriptSig` in bitcoind parlance.
     */
    inputScript: string;
    /**
     * Script of the output, in hex encoding.
     * Aka. `scriptPubKey` in bitcoind parlance.
     * Not present for coinbase txs
     */
    outputScript?: string;
    /** Value of the output spent by this input, in satoshis. */
    value: number;
    /** `sequence` field of the input; can be used for relative time locking. */
    sequenceNo: number;
    /** Token value attached to this input */
    token?: Token_InNode;
}

/** Output of a tx, creates new UTXOs. */
export interface TxOutput_InNode {
    /** Value of the output, in satoshis. */
    value: number;
    /**
     * Script of this output, locking the coins.
     * Aka. `scriptPubKey` in bitcoind parlance.
     */
    outputScript: string;
    /**
     * Transaction & input index spending this output, if
     * spent.
     */
    spentBy?: OutPoint;
    /** Token value attached to this output */
    token?: Token_InNode;
}

/** Metadata of a block, used in transaction data. */
export interface BlockMetadata_InNode {
    /** Height of the block. */
    height: number;
    /** Hash of the block. */
    hash: string;
    /**
     * Timestamp of the block; useful if `timeFirstSeen` of a transaction is
     * unknown.
     */
    timestamp: number;
}

/** Token involved in a transaction */
interface TokenEntry {
    /**
     * Hex token_id (in big-endian, like usually displayed to users) of the token.
     * This is not `bytes` because SLP and ALP use different endiannes, so to avoid
     * this we use hex, which conventionally implies big-endian in a bitcoin context.
     */
    tokenId: string;
    /** Token type of the token */
    tokenType: TokenType;
    /** Tx type of the token; NONE if there's no section that introduced it (e.g. in an accidental burn) */
    txType: TokenTxType;
    /**
     *  For NFT1 Child tokens: group ID
     *  Unset if the token is not an NFT1 Child token
     */
    groupTokenId?: string;
    /** Whether the validation rules have been violated for this section */
    isInvalid: boolean;
    /** Human-readable error message of why this entry burned tokens */
    burnSummary: string;
    /** Human-readable error messages of why colorings failed */
    failedColorings: TokenFailedColoring[];
    /**
     * Number of actually burned tokens (as decimal integer string, e.g. "2000").
     * This is because burns can exceed the 64-bit range of values and protobuf doesn't have a nice type to encode this.
     */
    actualBurnAmount: string;
    /** Burn amount the user explicitly opted into (as decimal integer string) */
    intentionalBurn: string;
    /** Whether any mint batons have been burned of this token */
    burnsMintBatons: boolean;
}

/**
 * SLP/ALP token type
 */
export type TokenType = SlpTokenType_InNode | AlpTokenType;

export interface SlpTokenType_InNode {
    protocol: 'SLP';
    type: SlpTokenType_InNode_Type;
    number: number;
}

export interface AlpTokenType {
    protocol: 'ALP';
    type: AlpTokenType_Type;
    number: number;
}

/** Possible ALP token types returned by chronik */
export type AlpTokenType_Type =
    | 'ALP_TOKEN_TYPE_STANDARD'
    | 'ALP_TOKEN_TYPE_UNKNOWN';

export const ALP_TOKEN_TYPES: AlpTokenType_Type[] = [
    'ALP_TOKEN_TYPE_STANDARD',
    'ALP_TOKEN_TYPE_UNKNOWN',
];

/** Possible SLP token types returned by chronik */
export type SlpTokenType_InNode_Type =
    | 'SLP_TOKEN_TYPE_FUNGIBLE'
    | 'SLP_TOKEN_TYPE_MINT_VAULT'
    | 'SLP_TOKEN_TYPE_NFT1_GROUP'
    | 'SLP_TOKEN_TYPE_NFT1_CHILD'
    | 'SLP_TOKEN_TYPE_UNKNOWN';

const SLP_TOKEN_TYPES: SlpTokenType_InNode_Type[] = [
    'SLP_TOKEN_TYPE_FUNGIBLE',
    'SLP_TOKEN_TYPE_MINT_VAULT',
    'SLP_TOKEN_TYPE_NFT1_GROUP',
    'SLP_TOKEN_TYPE_NFT1_CHILD',
    'SLP_TOKEN_TYPE_UNKNOWN',
];

/**
 * TokenStatus
 * TOKEN_STATUS_NON_TOKEN - Tx involves no tokens whatsover, i.e. neither any burns nor any failed
 * parsing/coloring or any tokens being created / moved.
 * TOKEN_STATUS_NORMAL - Tx involves tokens but no unintentional burns or failed parsings/colorings
 * TOKEN_STATUS_NOT_NORMAL - Tx involves tokens but contains unintentional burns or failed parsings/colorings
 * TOKEN_STATUS_UNKNOWN - Token tx of unknown status
 */
export type TokenStatus =
    | 'TOKEN_STATUS_NON_TOKEN'
    | 'TOKEN_STATUS_NORMAL'
    | 'TOKEN_STATUS_NOT_NORMAL'
    | 'TOKEN_STATUS_UNKNOWN';

const TOKEN_STATUS_TYPES: TokenStatus[] = [
    'TOKEN_STATUS_NON_TOKEN',
    'TOKEN_STATUS_NORMAL',
    'TOKEN_STATUS_NOT_NORMAL',
    'TOKEN_STATUS_UNKNOWN',
];

/** SLP/ALP tx type */
export type TokenTxType =
    /** NONE - No tx type, e.g. when input tokens are burned */
    | 'NONE'
    /** UNKNOWN - Unknown tx type, i.e. for unknown token types */
    | 'UNKNOWN'
    /** GENESIS - GENESIS tx */
    | 'GENESIS'
    /** SEND - SEND tx */
    | 'SEND'
    /** MINT - MINT tx */
    | 'MINT'
    /** BURN - BURN tx */
    | 'BURN';

const TOKEN_TX_TYPE_TYPES: TokenTxType[] = [
    'NONE',
    'UNKNOWN',
    'GENESIS',
    'SEND',
    'MINT',
    'BURN',
];

/**
 * A report of a failed coloring attempt of SLP/ALP.
 * This should always indicate something went wrong when building the tx.
 */
export interface TokenFailedColoring {
    /** For ALP, the index of the pushdata in the OP_RETURN that failed parsing. */
    pushdataIdx: number;
    /** Human-readable message of what went wrong */
    error: string;
}

/**
 * TokenFailedParsing
 * A report of a failed parsing attempt of SLP/ALP.
 * This should always indicate something went wrong when building the tx.
 */
export interface TokenFailedParsing {
    /**
     * For ALP, the index of the pushdata in the OP_RETURN that failed parsing.
     * -1 if the whole OP_RETURN failed, e.g. for SLP or eMPP
     */
    pushdataIdx: number;
    /** The bytes that failed parsing, useful for debugging */
    bytes: string;
    /** Human-readable message of what went wrong */
    error: string;
}

/** Group of UTXOs by output script. */
export interface ScriptUtxos_InNode {
    /** Output script in hex. */
    outputScript: string;
    /** UTXOs of the output script. */
    utxos: ScriptUtxo_InNode[];
}

/** An unspent transaction output (aka. UTXO, aka. "Coin") of a script. */
export interface ScriptUtxo_InNode {
    /** Outpoint of the UTXO. */
    outpoint: OutPoint;
    /** Which block this UTXO is in, or -1 if in the mempool. */
    blockHeight: number;
    /** Whether this UTXO is a coinbase UTXO
     * (make sure it's buried 100 blocks before spending!) */
    isCoinbase: boolean;
    /** Value of the UTXO in satoshis. */
    value: number;
    /** Is this utxo avalanche finalized */
    isFinal: boolean;
    /** Token value attached to this utxo */
    token?: Token_InNode;
}

/**
 * An unspent transaction output (aka. UTXO, aka. "Coin") with script attached
 * Useful when getting utxos by something other than script, e.g. tokenId
 */
export interface Utxo_InNode {
    /** Outpoint of the UTXO. */
    outpoint: OutPoint;
    /** Which block this UTXO is in, or -1 if in the mempool. */
    blockHeight: number;
    /** Whether this UTXO is a coinbase UTXO
     * (make sure it's buried 100 blocks before spending!) */
    isCoinbase: boolean;
    /** Value of the UTXO in satoshis. */
    value: number;
    /** Bytecode of the script of the output */
    script: string;
    /** Is this utxo avalanche finalized */
    isFinal: boolean;
    /** Token value attached to this utxo */
    token?: Token_InNode;
}

/** Token coloring an input or output */
export interface Token_InNode {
    /** Hex token_id of the token, see `TokenInfo` for details */
    tokenId: string;
    /** Token type of the token */
    tokenType: TokenType;
    /**
     * Index into `token_entries` for `Tx`
     * chronik returns -1 for UTXOs, chronik-client
     * passes no entryIdx key for UTXOS
     */
    entryIdx?: number;
    /** Base token amount of the input/output */
    amount: string;
    /** Whether the token is a mint baton */
    isMintBaton: boolean;
}

/**
 * Script type queried in the `script` method.
 * - `other`: Script type not covered by the standard script types; payload is
 *   the raw hex.
 * - `p2pk`: Pay-to-Public-Key (`<pk> OP_CHECKSIG`), payload is the hex of the
 *   pubkey (compressed (33 bytes) or uncompressed (65 bytes)).
 * - `p2pkh`: Pay-to-Public-Key-Hash
 *   (`OP_DUP OP_HASH160 <pkh> OP_EQUALVERIFY OP_CHECKSIG`).
 *   Payload is the 20 byte public key hash.
 * - `p2sh`: Pay-to-Script-Hash (`OP_HASH160 <sh> OP_EQUAL`).
 *   Payload is the 20 byte script hash.
 */
export type ScriptType_InNode = 'other' | 'p2pk' | 'p2pkh' | 'p2sh';

/** Message returned from the WebSocket, translated to be more human-readable for client */
export type WsMsgClient = Error_InNode | MsgBlockClient | MsgTxClient;

/** Block got connected, disconnected, finalized, etc.*/
export interface MsgBlockClient {
    type: 'Block';
    /** What happened to the block */
    msgType: BlockMsgType;
    /** Hash of the block (human-readable big-endian) */
    blockHash: string;
    /** Height of the block */
    blockHeight: number;
}

/** Block message types that can come from chronik */
export type BlockMsgType =
    | 'BLK_CONNECTED'
    | 'BLK_DISCONNECTED'
    | 'BLK_FINALIZED'
    | 'UNRECOGNIZED';

const BLK_MSG_TYPES: BlockMsgType[] = [
    'BLK_CONNECTED',
    'BLK_DISCONNECTED',
    'BLK_FINALIZED',
    'UNRECOGNIZED',
];

/** Tx got added to/removed from mempool, or confirmed in a block, etc.*/
export interface MsgTxClient {
    type: 'Tx';
    /** What happened to the tx */
    msgType: TxMsgType;
    /** Txid of the tx (human-readable big-endian) */
    txid: string;
}

/** Tx message types that can come from chronik */
export type TxMsgType =
    | 'TX_ADDED_TO_MEMPOOL'
    | 'TX_REMOVED_FROM_MEMPOOL'
    | 'TX_CONFIRMED'
    | 'TX_FINALIZED'
    | 'UNRECOGNIZED';

const TX_MSG_TYPES: TxMsgType[] = [
    'TX_ADDED_TO_MEMPOOL',
    'TX_REMOVED_FROM_MEMPOOL',
    'TX_CONFIRMED',
    'TX_FINALIZED',
    'UNRECOGNIZED',
];

/* The script type and its associated payload for a chronik-client subscribeToScript subscription */
export interface WsSubScriptClient {
    /** Script type to subscribe to ("p2pkh", "p2sh", "p2pk", "other"). */
    scriptType: ScriptType_InNode;
    /**
     * Payload for the given script type:
     * - 20-byte hash for "p2pkh" and "p2sh"
     * - 33-byte or 65-byte pubkey for "p2pk"
     * - Serialized script for "other"
     */
    payload: string;
}

export interface Error_InNode {
    type: 'Error';
    msg: string;
}

/** List of UTXOs */
export interface TokenIdUtxos {
    /** TokenId used to fetch these utxos */
    tokenId: string;
    /** UTXOs */
    utxos: Utxo_InNode[];
}

/** Info about a token */
export interface TokenInfo {
    /**
     * Hex token_id (in big-endian, like usually displayed to users) of the token.
     * This is not `bytes` because SLP and ALP use different endiannnes,
     * so to avoid this we use hex, which conventionally implies big-endian in a bitcoin context.
     */
    tokenId: string;
    /** Token type of the token */
    tokenType: TokenType;
    /** Info found in the token's GENESIS tx */
    genesisInfo: GenesisInfo;
    /** Block of the GENESIS tx, if it's mined already */
    block?: BlockMetadata_InNode;
    /** Time the GENESIS tx has first been seen by the indexer */
    timeFirstSeen: number;
}

/** Genesis info found in GENESIS txs of tokens */
export interface GenesisInfo {
    /** token_ticker of the token */
    tokenTicker: string;
    /** token_name of the token */
    tokenName: string;
    /** URL of the token */
    url: string;
    /** token_document_hash of the token (only on SLP) */
    hash?: string;
    /** mint_vault_scripthash (only on SLP V2 Mint Vault) */
    mintVaultScripthash?: string;
    /** Arbitray payload data of the token (only on ALP) */
    data?: Uint8Array;
    /** auth_pubkey of the token (only on ALP) */
    authPubkey?: string;
    /** decimals of the token, i.e. how many decimal places the token should be displayed with. */
    decimals: number;
}

interface WsSubscriptions {
    /** Subscriptions to scripts */
    scripts: WsSubScriptClient[];
    /** Subscriptions to tokens by tokenId */
    tokens: string[];
    /** Subscriptions to lokadIds */
    lokadIds: string[];
    /** Subscription to blocks */
    blocks: boolean;
}
