// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import WebSocket from 'isomorphic-ws';
import * as ws from 'ws';
import * as proto from '../proto/chronik';
import { FailoverProxy } from './failoverProxy';
import { fromHex, fromHexRev, toHex, toHexRev } from './hex';

type MessageEvent = ws.MessageEvent | { data: Blob };

/**
 * Client to access a Chronik instance.Plain object, without any
 * connections.
 */
export class ChronikClient {
    private _proxyInterface: FailoverProxy;
    /**
     * Create a new client. This just creates an object, without any connections.
     *
     * @param {string | string[]} urls This param can be either an array of url strings or a singular
     * url string. A valid url comes with schema and without a trailing slash.
     * e.g. 'https://chronik.be.cash/xec'   or
     * '['https://chronik.be.cash/xec', 'https://chronik.fabien.cash']
     * The approach of accepting an array of urls as input is to ensure redundancy if the
     * first url encounters downtime. The single url string input will eventually be deprecated
     * for url arrays regardless of one or many urls being supplied.
     * @throws {error} throws error on invalid constructor inputs
     */
    constructor(urls: string | string[]) {
        // Instantiate FailoverProxy with the urls array
        this._proxyInterface = new FailoverProxy(urls);
    }

    // For unit test verification
    public proxyInterface(): FailoverProxy {
        return this._proxyInterface;
    }

    /**
     * Broadcasts the `rawTx` on the network.
     * If `skipSlpCheck` is false, it will be checked that the tx doesn't burn
     * any SLP tokens before broadcasting.
     */
    public async broadcastTx(
        rawTx: Uint8Array | string,
        skipSlpCheck = false,
    ): Promise<{ txid: string }> {
        const request = proto.BroadcastTxRequest.encode({
            rawTx: typeof rawTx === 'string' ? fromHex(rawTx) : rawTx,
            skipSlpCheck,
        }).finish();
        const data = await this._proxyInterface.post('/broadcast-tx', request);
        const broadcastResponse = proto.BroadcastTxResponse.decode(data);
        return {
            txid: toHexRev(broadcastResponse.txid),
        };
    }

    /**
     * Broadcasts the `rawTxs` on the network, only if all of them are valid.
     * If `skipSlpCheck` is false, it will be checked that the txs don't burn
     * any SLP tokens before broadcasting.
     */
    public async broadcastTxs(
        rawTxs: (Uint8Array | string)[],
        skipSlpCheck = false,
    ): Promise<{ txids: string[] }> {
        const request = proto.BroadcastTxsRequest.encode({
            rawTxs: rawTxs.map(rawTx =>
                typeof rawTx === 'string' ? fromHex(rawTx) : rawTx,
            ),
            skipSlpCheck,
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

    /** Fetch the block given hash or height. */
    public async block(hashOrHeight: string | number): Promise<Block> {
        const data = await this._proxyInterface.get(`/block/${hashOrHeight}`);
        const block = proto.Block.decode(data);
        return convertToBlock(block);
    }

    /**
     * Fetch block info of a range of blocks. `startHeight` and `endHeight` are
     * inclusive ranges.
     */
    public async blocks(
        startHeight: number,
        endHeight: number,
    ): Promise<BlockInfo[]> {
        const data = await this._proxyInterface.get(
            `/blocks/${startHeight}/${endHeight}`,
        );
        const blocks = proto.Blocks.decode(data);
        return blocks.blocks.map(convertToBlockInfo);
    }

    /** Fetch tx details given the txid. */
    public async tx(txid: string): Promise<Tx> {
        const data = await this._proxyInterface.get(`/tx/${txid}`);
        const tx = proto.Tx.decode(data);
        return convertToTx(tx);
    }

    /** Fetch token info and stats given the tokenId. */
    public async token(tokenId: string): Promise<Token> {
        const data = await this._proxyInterface.get(`/token/${tokenId}`);
        const token = proto.Token.decode(data);
        return convertToToken(token);
    }

    /**
     * Validate the given outpoints: whether they are unspent, spent or
     * never existed.
     */
    public async validateUtxos(outpoints: OutPoint[]): Promise<UtxoState[]> {
        const request = proto.ValidateUtxoRequest.encode({
            outpoints: outpoints.map(outpoint => ({
                txid: fromHexRev(outpoint.txid),
                outIdx: outpoint.outIdx,
            })),
        }).finish();
        const data = await this._proxyInterface.post(
            '/validate-utxos',
            request,
        );
        const validationStates = proto.ValidateUtxoResponse.decode(data);
        return validationStates.utxoStates.map(state => ({
            height: state.height,
            isConfirmed: state.isConfirmed,
            state: convertToUtxoStateVariant(state.state),
        }));
    }

    /** Create object that allows fetching script history or UTXOs. */
    public script(
        scriptType: ScriptType,
        scriptPayload: string,
    ): ScriptEndpoint {
        return new ScriptEndpoint(
            this._proxyInterface,
            scriptType,
            scriptPayload,
        );
    }

    /** Open a WebSocket connection to listen for updates. */
    public ws(config: WsConfig): WsEndpoint {
        return new WsEndpoint(this._proxyInterface, config);
    }
}

/** Allows fetching script history and UTXOs. */
export class ScriptEndpoint {
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
     * This means it's ordered by first-seen first. If the tx hasn't been seen
     * by the indexer before, it's ordered by the block timestamp.
     * @param page Page index of the tx history.
     * @param pageSize Number of txs per page.
     */
    public async history(
        page?: number,
        pageSize?: number,
    ): Promise<TxHistoryPage> {
        const query =
            page !== undefined && pageSize !== undefined
                ? `?page=${page}&page_size=${pageSize}`
                : page !== undefined
                ? `?page=${page}`
                : pageSize !== undefined
                ? `?page_size=${pageSize}`
                : '';
        const data = await this._proxyInterface.get(
            `/script/${this._scriptType}/${this._scriptPayload}/history${query}`,
        );
        const historyPage = proto.TxHistoryPage.decode(data);
        return {
            txs: historyPage.txs.map(convertToTx),
            numPages: historyPage.numPages,
        };
    }

    /**
     * Fetches the current UTXO set for this script.
     * It is grouped by output script, in case a script type can match multiple
     * different output scripts (e.g. Taproot on Lotus).
     */
    public async utxos(): Promise<ScriptUtxos[]> {
        const data = await this._proxyInterface.get(
            `/script/${this._scriptType}/${this._scriptPayload}/utxos`,
        );
        const utxos = proto.Utxos.decode(data);
        return utxos.scriptUtxos.map(scriptUtxos => ({
            outputScript: toHex(scriptUtxos.outputScript),
            utxos: scriptUtxos.utxos.map(convertToUtxo),
        }));
    }
}

/** Config for a WebSocket connection to Chronik. */
export interface WsConfig {
    /** Fired when a message is sent from the WebSocket. */
    onMessage?: (msg: SubscribeMsg) => void;

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
export class WsEndpoint {
    private _proxyInterface: FailoverProxy;

    /** Fired when a message is sent from the WebSocket. */
    public onMessage?: (msg: SubscribeMsg) => void;

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
    public subs: { scriptType: ScriptType; scriptPayload: string }[];

    constructor(proxyInterface: FailoverProxy, config: WsConfig) {
        this.onMessage = config.onMessage;
        this.onConnect = config.onConnect;
        this.onReconnect = config.onReconnect;
        this.onEnd = config.onEnd;
        this.autoReconnect =
            config.autoReconnect !== undefined ? config.autoReconnect : true;
        this.manuallyClosed = false;
        this.subs = [];
        this._proxyInterface = proxyInterface;
    }

    /** Wait for the WebSocket to be connected. */
    public async waitForOpen() {
        await this._proxyInterface.connectWs(this);
        await this.connected;
    }

    /**
     * Subscribe to the given script type and payload.
     * For "p2pkh", `scriptPayload` is the 20 byte public key hash.
     */
    public subscribe(scriptType: ScriptType, scriptPayload: string) {
        this.subs.push({ scriptType, scriptPayload });
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.subUnsub(true, scriptType, scriptPayload);
        }
    }

    /** Unsubscribe from the given script type and payload. */
    public unsubscribe(scriptType: ScriptType, scriptPayload: string) {
        this.subs = this.subs.filter(
            sub =>
                sub.scriptType !== scriptType ||
                sub.scriptPayload !== scriptPayload,
        );
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.subUnsub(false, scriptType, scriptPayload);
        }
    }

    /**
     * Close the WebSocket connection and prevent future any reconnection
     * attempts.
     */
    public close() {
        this.manuallyClosed = true;
        this.ws?.close();
    }

    public subUnsub(
        isSubscribe: boolean,
        scriptType: ScriptType,
        scriptPayload: string,
    ) {
        const encodedSubscription = proto.Subscription.encode({
            isSubscribe,
            scriptType,
            payload: fromHex(scriptPayload),
        }).finish();
        if (this.ws === undefined)
            throw new Error('Invalid state; ws is undefined');
        this.ws.send(encodedSubscription);
    }

    public async handleMsg(wsMsg: MessageEvent) {
        if (this.onMessage === undefined) {
            return;
        }
        const data =
            typeof window === 'undefined'
                ? // NodeJS
                  (wsMsg.data as Uint8Array)
                : // Browser
                  new Uint8Array(await (wsMsg.data as Blob).arrayBuffer());
        const msg = proto.SubscribeMsg.decode(data);
        if (msg.error) {
            this.onMessage({
                type: 'Error',
                ...msg.error,
            });
        } else if (msg.AddedToMempool) {
            this.onMessage({
                type: 'AddedToMempool',
                txid: toHexRev(msg.AddedToMempool.txid),
            });
        } else if (msg.RemovedFromMempool) {
            this.onMessage({
                type: 'RemovedFromMempool',
                txid: toHexRev(msg.RemovedFromMempool.txid),
            });
        } else if (msg.Confirmed) {
            this.onMessage({
                type: 'Confirmed',
                txid: toHexRev(msg.Confirmed.txid),
            });
        } else if (msg.Reorg) {
            this.onMessage({
                type: 'Reorg',
                txid: toHexRev(msg.Reorg.txid),
            });
        } else if (msg.BlockConnected) {
            this.onMessage({
                type: 'BlockConnected',
                blockHash: toHexRev(msg.BlockConnected.blockHash),
            });
        } else if (msg.BlockDisconnected) {
            this.onMessage({
                type: 'BlockDisconnected',
                blockHash: toHexRev(msg.BlockDisconnected.blockHash),
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

function convertToBlock(block: proto.Block): Block {
    if (block.blockInfo === undefined) {
        throw new Error('Block has no blockInfo');
    }
    if (block.blockDetails === undefined) {
        throw new Error('Block has no blockDetails');
    }
    return {
        blockInfo: convertToBlockInfo(block.blockInfo),
        blockDetails: convertToBlockDetails(block.blockDetails),
        rawHeader: toHex(block.rawHeader),
        txs: block.txs.map(convertToTx),
    };
}

function convertToTx(tx: proto.Tx): Tx {
    return {
        txid: toHexRev(tx.txid),
        version: tx.version,
        inputs: tx.inputs.map(convertToTxInput),
        outputs: tx.outputs.map(convertToTxOutput),
        lockTime: tx.lockTime,
        slpTxData: tx.slpTxData ? convertToSlpTxData(tx.slpTxData) : undefined,
        slpErrorMsg: tx.slpErrorMsg.length !== 0 ? tx.slpErrorMsg : undefined,
        block:
            tx.block !== undefined ? convertToBlockMeta(tx.block) : undefined,
        timeFirstSeen: tx.timeFirstSeen,
        size: tx.size,
        isCoinbase: tx.isCoinbase,
        network: convertToNetwork(tx.network),
    };
}

function convertToUtxo(utxo: proto.Utxo): Utxo {
    if (utxo.outpoint === undefined) {
        throw new Error('UTXO outpoint is undefined');
    }
    return {
        outpoint: {
            txid: toHexRev(utxo.outpoint.txid),
            outIdx: utxo.outpoint.outIdx,
        },
        blockHeight: utxo.blockHeight,
        isCoinbase: utxo.isCoinbase,
        value: utxo.value,
        slpMeta:
            utxo.slpMeta !== undefined
                ? convertToSlpMeta(utxo.slpMeta)
                : undefined,
        slpToken:
            utxo.slpToken !== undefined
                ? convertToSlpToken(utxo.slpToken)
                : undefined,
        network: convertToNetwork(utxo.network),
    };
}

function convertToToken(token: proto.Token): Token {
    if (token.slpTxData === undefined) {
        throw new Error('Invalid proto, no slpTxData');
    }
    if (token.tokenStats === undefined) {
        throw new Error('Invalid proto, no tokenStats');
    }
    return {
        slpTxData: convertToSlpTokenTxData(token.slpTxData),
        tokenStats: token.tokenStats,
        block:
            token.block !== undefined
                ? convertToBlockMeta(token.block)
                : undefined,
        timeFirstSeen: token.timeFirstSeen,
        initialTokenQuantity: token.initialTokenQuantity,
        containsBaton: token.containsBaton,
        network: convertToNetwork(token.network),
    };
}

function convertToTxInput(input: proto.TxInput): TxInput {
    if (input.prevOut === undefined) {
        throw new Error('Invalid proto, no prevOut');
    }
    return {
        prevOut: {
            txid: toHexRev(input.prevOut.txid),
            outIdx: input.prevOut.outIdx,
        },
        inputScript: toHex(input.inputScript),
        outputScript:
            input.outputScript.length > 0
                ? toHex(input.outputScript)
                : undefined,
        value: input.value,
        sequenceNo: input.sequenceNo,
        slpBurn:
            input.slpBurn !== undefined
                ? convertToSlpBurn(input.slpBurn)
                : undefined,
        slpToken:
            input.slpToken !== undefined
                ? convertToSlpToken(input.slpToken)
                : undefined,
    };
}

function convertToTxOutput(output: proto.TxOutput): TxOutput {
    return {
        value: output.value,
        outputScript: toHex(output.outputScript),
        slpToken:
            output.slpToken !== undefined
                ? convertToSlpToken(output.slpToken)
                : undefined,
        spentBy:
            output.spentBy !== undefined
                ? {
                      txid: toHexRev(output.spentBy.txid),
                      outIdx: output.spentBy.outIdx,
                  }
                : undefined,
    };
}

function convertToSlpTxData(slpTxData: proto.SlpTxData): SlpTxData {
    if (slpTxData.slpMeta === undefined) {
        throw new Error('Invalid slpTxData: slpMeta is undefined');
    }
    return {
        slpMeta: convertToSlpMeta(slpTxData.slpMeta),
        genesisInfo:
            slpTxData.genesisInfo !== undefined
                ? convertToSlpGenesisInfo(slpTxData.genesisInfo)
                : undefined,
    };
}

function convertToSlpTokenTxData(slpTxData: proto.SlpTxData): SlpTokenTxData {
    if (slpTxData.slpMeta === undefined) {
        throw new Error('Invalid slpTxData: slpMeta is undefined');
    }
    if (slpTxData.genesisInfo === undefined) {
        throw new Error('Invalid slpTxData: genesisInfo is undefined');
    }
    return {
        slpMeta: convertToSlpMeta(slpTxData.slpMeta),
        genesisInfo: convertToSlpGenesisInfo(slpTxData.genesisInfo),
    };
}

function convertToSlpMeta(slpMeta: proto.SlpMeta): SlpMeta {
    let tokenType: SlpTokenType;
    switch (slpMeta.tokenType) {
        case proto.SlpTokenType.FUNGIBLE:
            tokenType = 'FUNGIBLE';
            break;
        case proto.SlpTokenType.NFT1_GROUP:
            tokenType = 'NFT1_GROUP';
            break;
        case proto.SlpTokenType.NFT1_CHILD:
            tokenType = 'NFT1_CHILD';
            break;
        case proto.SlpTokenType.UNKNOWN_TOKEN_TYPE:
            tokenType = 'UNKNOWN_TOKEN_TYPE';
            break;
        default:
            throw new Error(`Invalid token type: ${slpMeta.tokenType}`);
    }
    let txType: SlpTxType;
    switch (slpMeta.txType) {
        case proto.SlpTxType.GENESIS:
            txType = 'GENESIS';
            break;
        case proto.SlpTxType.SEND:
            txType = 'SEND';
            break;
        case proto.SlpTxType.MINT:
            txType = 'MINT';
            break;
        case proto.SlpTxType.BURN:
            txType = 'BURN';
            break;
        case proto.SlpTxType.UNKNOWN_TX_TYPE:
            txType = 'UNKNOWN_TX_TYPE';
            break;
        default:
            throw new Error(`Invalid slp tx type: ${slpMeta.txType}`);
    }
    return {
        tokenType,
        txType,
        tokenId: toHex(slpMeta.tokenId),
        groupTokenId:
            slpMeta.groupTokenId.length == 32
                ? toHex(slpMeta.groupTokenId)
                : undefined,
    };
}

function convertToSlpGenesisInfo(info: proto.SlpGenesisInfo): SlpGenesisInfo {
    const decoder = new TextDecoder();
    return {
        tokenTicker: decoder.decode(info.tokenTicker),
        tokenName: decoder.decode(info.tokenName),
        tokenDocumentUrl: decoder.decode(info.tokenDocumentUrl),
        tokenDocumentHash: toHex(info.tokenDocumentHash),
        decimals: info.decimals,
    };
}

function convertToBlockMeta(block: proto.BlockMetadata): BlockMetadata {
    return {
        height: block.height,
        hash: toHexRev(block.hash),
        timestamp: block.timestamp,
    };
}

function convertToBlockInfo(block: proto.BlockInfo): BlockInfo {
    return {
        ...block,
        hash: toHexRev(block.hash),
        prevHash: toHexRev(block.prevHash),
    };
}

function convertToBlockDetails(blockDetails: proto.BlockDetails): BlockDetails {
    return {
        ...blockDetails,
        merkleRoot: toHexRev(blockDetails.merkleRoot),
    };
}

function convertToSlpBurn(burn: proto.SlpBurn): SlpBurn {
    if (burn.token === undefined) {
        throw new Error('Invalid burn: token is undefined');
    }
    return {
        token: convertToSlpToken(burn.token),
        tokenId: toHex(burn.tokenId),
    };
}

function convertToSlpToken(token: proto.SlpToken): SlpToken {
    return {
        amount: token.amount,
        isMintBaton: token.isMintBaton,
    };
}

function convertToNetwork(network: proto.Network): Network {
    switch (network) {
        case proto.Network.BCH:
            return 'BCH';
        case proto.Network.XEC:
            return 'XEC';
        case proto.Network.XPI:
            return 'XPI';
        case proto.Network.XRG:
            return 'XRG';
        default:
            throw new Error(`Unknown network: ${network}`);
    }
}

function convertToUtxoStateVariant(
    variant: proto.UtxoStateVariant,
): UtxoStateVariant {
    switch (variant) {
        case proto.UtxoStateVariant.UNSPENT:
            return 'UNSPENT';
        case proto.UtxoStateVariant.SPENT:
            return 'SPENT';
        case proto.UtxoStateVariant.NO_SUCH_TX:
            return 'NO_SUCH_TX';
        case proto.UtxoStateVariant.NO_SUCH_OUTPUT:
            return 'NO_SUCH_OUTPUT';
        default:
            throw new Error(`Unknown UtxoStateVariant: ${variant}`);
    }
}

/** Current state of the blockchain. */
export interface BlockchainInfo {
    /** Block hash of the current blockchain tip */
    tipHash: string;
    /** Current height of the blockchain */
    tipHeight: number;
}

/** A transaction on the blockchain or in the mempool. */
export interface Tx {
    /**
     * Transaction ID.
     * - On BCH, eCash and Ergon, this is the hash of the tx.
     * - On Lotus, this is a special serialization, omitting the input scripts.
     */
    txid: string;
    /** `version` field of the transaction. */
    version: number;
    /** Inputs of this transaction. */
    inputs: TxInput[];
    /** Outputs of this transaction. */
    outputs: TxOutput[];
    /** `locktime` field of the transaction, tx is not valid before this time. */
    lockTime: number;
    /** SLP data about this transaction, if valid. */
    slpTxData: SlpTxData | undefined;
    /** A human-readable message as to why this tx is not an SLP transaction,
     * unless trivially so. */
    slpErrorMsg: string | undefined;
    /** Block data for this tx, or undefined if not mined yet. */
    block: BlockMetadata | undefined;
    /**
     * UNIX timestamp when this tx has first been seen in the mempool.
     * 0 if unknown -> make sure to check.
     */
    timeFirstSeen: string;
    /** Serialized size of the tx. */
    size: number;
    /** Whether this tx is a coinbase tx. */
    isCoinbase: boolean;
    /** Which network this tx is on. */
    network: Network;
}

/** An unspent transaction output (aka. UTXO, aka. "Coin") of a script. */
export interface Utxo {
    /** Outpoint of the UTXO. */
    outpoint: OutPoint;
    /** Which block this UTXO is in, or -1 if in the mempool. */
    blockHeight: number;
    /**
     * Whether this UTXO is a coinbase UTXO
     * (make sure it's buried 100 blocks before spending!)
     */
    isCoinbase: boolean;
    /** Value of the UTXO in satoshis. */
    value: string;
    /** SLP data in this UTXO. */
    slpMeta: SlpMeta | undefined;
    /** SLP token of this UTXO (i.e. SLP amount + whether it's a mint baton). */
    slpToken: SlpToken | undefined;
    /** Which network this UTXO is on. */
    network: Network;
}

/** Data and stats about an SLP token. */
export interface Token {
    /** SLP data of the GENESIS transaction. */
    slpTxData: SlpTokenTxData;
    /** Current stats about this token, e.g. minted and burned amount. */
    tokenStats: TokenStats;
    /** Block the GENESIS transaction has been mined in, or undefined if not mined yet. */
    block: BlockMetadata | undefined;
    /**
     * UNIX timestamp when the GENESIS transaction has first been seen in the mempool.
     * 0 if unknown.
     */
    timeFirstSeen: string;
    /** How many tokens have been mined in the GENESIS transaction. */
    initialTokenQuantity: string;
    /**
     * Whether the GENESIS transaction created a mint baton.
     * Note: This doesn't indicate whether the mint baton is still alive.
     */
    containsBaton: boolean;
    /** Which network this token is on. */
    network: Network;
}

/** Block info about a block */
export interface BlockInfo {
    /** Block hash of the block, in 'human-readable' (big-endian) hex encoding. */
    hash: string;
    /**
     * Block hash of the previous block, in 'human-readable' (big-endian) hex
     * encoding.
     */
    prevHash: string;
    /** Height of the block; Genesis block has height 0. */
    height: number;
    /** nBits field of the block, encodes the target compactly. */
    nBits: number;
    /**
     * Timestamp of the block. Filled in by the miner, so might not be 100%
     * precise.
     */
    timestamp: string;
    /** Block size of this block in bytes (including headers etc.). */
    blockSize: string;
    /** Number of txs in this block. */
    numTxs: string;
    /** Total number of tx inputs in block (including coinbase). */
    numInputs: string;
    /** Total number of tx output in block (including coinbase). */
    numOutputs: string;
    /** Total number of satoshis spent by tx inputs. */
    sumInputSats: string;
    /** Total block reward for this block. */
    sumCoinbaseOutputSats: string;
    /** Total number of satoshis in non-coinbase tx outputs. */
    sumNormalOutputSats: string;
    /** Total number of satoshis burned using OP_RETURN. */
    sumBurnedSats: string;
}

/** Additional details about a block. */
export interface BlockDetails {
    /** nVersion field of the block. */
    version: number;
    /** Merkle root of the block. */
    merkleRoot: string;
    /** Nonce of the block (32-bit on XEC, 64-bit on XPI). */
    nonce: string;
    /** Median-time-past (MTP) of the last 11 blocks. */
    medianTimestamp: string;
}

/** Block on the blockchain. */
export interface Block {
    /** Info about the block. */
    blockInfo: BlockInfo;
    /** Details about the block. */
    blockDetails: BlockDetails;
    /** Header encoded as hex. */
    rawHeader: string;
    /**
     * Txs in this block, in canonical order
     * (at least on all supported chains).
     */
    txs: Tx[];
}

/** Group of UTXOs by output script. */
export interface ScriptUtxos {
    /** Output script in hex. */
    outputScript: string;
    /** UTXOs of the output script. */
    utxos: Utxo[];
}

/** Page of the transaction history. */
export interface TxHistoryPage {
    /** Txs of this page. */
    txs: Tx[];
    /**
     * Number of pages of the entire transaction history.
     * This changes based on the `pageSize` provided.
     */
    numPages: number;
}

/** SLP data about an SLP transaction. */
export interface SlpTxData {
    /** SLP metadata. */
    slpMeta: SlpMeta;
    /** Genesis info, only present for GENESIS txs. */
    genesisInfo: SlpGenesisInfo | undefined;
}

/** SLP data about an SLP transaction. */
export interface SlpTokenTxData {
    /** SLP metadata. */
    slpMeta: SlpMeta;
    /** Genesis info of the token. */
    genesisInfo: SlpGenesisInfo;
}

/** Metadata about an SLP tx or UTXO. */
export interface SlpMeta {
    /** Whether this token is a normal fungible token, or an NFT or unknown. */
    tokenType: SlpTokenType;
    /** Whether this tx is a GENESIS, MINT, SEND or UNKNOWN transaction. */
    txType: SlpTxType;
    /** Token ID of this tx/UTXO, in human-readable (big-endian) hex encoding. */
    tokenId: string;
    /**
     * Group token ID of this tx/UTXO, NFT only, in human-readable
     * (big-endian) hex encoding.
     * This is the token ID of the token that went into the GENESIS of this token
     * as first input.
     */
    groupTokenId: string | undefined;
}

/**
 * Stats about a token.
 *
 * `totalMinted` and `totalBurned` don't fit in a 64-bit integer, therefore we
 * use a string with the decimal representation.
 */
export interface TokenStats {
    /** Total number of tokens minted (including GENESIS). */
    totalMinted: string;
    /** Total number of tokens burned. */
    totalBurned: string;
}

/** Input of a tx, spends an output of a previous tx. */
export interface TxInput {
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
     */
    outputScript: string | undefined;
    /** Value of the output spent by this input, in satoshis. */
    value: string;
    /** `sequence` field of the input; can be used for relative time locking. */
    sequenceNo: number;
    /** SLP tokens burned by this input, or `undefined` if no burn occured. */
    slpBurn: SlpBurn | undefined;
    /**
     * SLP tokens spent by this input, or `undefined` if the tokens were burned
     * or if there were no tokens in the output spent by this input.
     */
    slpToken: SlpToken | undefined;
}

/** Output of a tx, creates new UTXOs. */
export interface TxOutput {
    /** Value of the output, in satoshis. */
    value: string;
    /**
     * Script of this output, locking the coins.
     * Aka. `scriptPubKey` in bitcoind parlance.
     */
    outputScript: string;
    /**
     * SLP tokens locked up in this output, or `undefined` if no tokens were sent
     * to this output.
     */
    slpToken: SlpToken | undefined;
    /**
     * Transaction & input index spending this output, or undefined if
     * unspent.
     */
    spentBy: OutPoint | undefined;
}

/** Metadata of a block, used in transaction data. */
export interface BlockMetadata {
    /** Height of the block. */
    height: number;
    /** Hash of the block. */
    hash: string;
    /**
     * Timestamp of the block; useful if `timeFirstSeen` of a transaction is
     * unknown.
     */
    timestamp: string;
}

/**
 * Outpoint referencing an output on the blockchain (or input for field
 * `spentBy`).
 */
export interface OutPoint {
    /** Transaction referenced by this outpoint. */
    txid: string;
    /**
     * Index of the output in the tx referenced by this outpoint
     * (or input index if used in field `spentBy`).
     */
    outIdx: number;
}

/** SLP amount or whether this is a mint baton, for inputs and outputs. */
export interface SlpToken {
    /** SLP amount of the input or output, in base units. */
    amount: string;
    /** Whether this input/output is a mint baton. */
    isMintBaton: boolean;
}

/** SLP burn; indicates burn of some tokens. */
export interface SlpBurn {
    /** SLP amount/mint baton burned by this burn. */
    token: SlpToken;
    /**
     * Token ID of the burned SLP tokens, in human-readable (big-endian) hex
     * encoding.
     */
    tokenId: string;
}

/** SLP info about a GENESIS transaction. */
export interface SlpGenesisInfo {
    /** Ticker of the token, decoded as UTF-8. */
    tokenTicker: string;
    /** Name of the token, decoded as UTF-8. */
    tokenName: string;
    /** URL of the token, decoded as UTF-8. */
    tokenDocumentUrl: string;
    /**
     * Document hash of the token, encoded in hex (byte order as occuring in the
     * OP_RETURN).
     */
    tokenDocumentHash: string;
    /** Number of decimals of the GENESIS transaction. */
    decimals: number;
}

/** State of a UTXO (from `validateUtxos`). */
export interface UtxoState {
    /**
     * Height of the UTXO. -1 if the tx doesn't exist or is unconfirmed.
     * If it's confirmed (or if the output doesn't exist but the tx does),
     * it's the height of the block confirming the tx.
     */
    height: number;
    /** Whether the UTXO or the transaction queried is confirmed. */
    isConfirmed: boolean;
    /**
     * State of the UTXO, can be unconfirmed, confirmed, tx doesn't exist or
     * output doesn't exist.
     */
    state: UtxoStateVariant;
}

/** Message returned from the WebSocket. */
export type SubscribeMsg =
    | Error
    | MsgAddedToMempool
    | MsgRemovedFromMempool
    | MsgConfirmed
    | MsgReorg
    | MsgBlockConnected
    | MsgBlockDisconnected;

/** A transaction has been added to the mempool. */
export interface MsgAddedToMempool {
    type: 'AddedToMempool';
    /** txid of the transaction, in 'human-readable' (big-endian) hex encoding. */
    txid: string;
}

/**
 * A transaction has been removed from the mempool,
 * but not because of a confirmation (e.g. expiry, conflict, etc.).
 */
export interface MsgRemovedFromMempool {
    type: 'RemovedFromMempool';
    /** txid of the transaction, in 'human-readable' (big-endian) hex encoding. */
    txid: string;
}

/** A transaction has been confirmed in a block. */
export interface MsgConfirmed {
    type: 'Confirmed';
    /** txid of the transaction, in 'human-readable' (big-endian) hex encoding. */
    txid: string;
}

/**
 * A transaction used to be part of a block but now got re-orged.
 * Usually, unless something malicious occurs, a "Confirmed" message is sent
 * immediately afterwards.
 */
export interface MsgReorg {
    type: 'Reorg';
    /** txid of the transaction, in 'human-readable' (big-endian) hex encoding. */
    txid: string;
}

/** A new block has been added to the chain. Sent regardless of subscriptions. */
export interface MsgBlockConnected {
    type: 'BlockConnected';
    /** block hash of the block, in 'human-readable' (big-endian) hex encoding. */
    blockHash: string;
}

/** A block has been removed from the chain. Sent regardless of subscriptions. */
export interface MsgBlockDisconnected {
    type: 'BlockDisconnected';
    /** block hash of the block, in 'human-readable' (big-endian) hex encoding. */
    blockHash: string;
}

/** Reports an error, e.g. when a subscription is malformed. */
export interface Error {
    type: 'Error';
    /** Code for this error, e.g. "tx-not-found". */
    errorCode: string;
    /** Human-readable message for this error. */
    msg: string;
    /**
     * Whether this error is presentable to an end-user.
     * This is somewhat subjective, but can be used as a good heuristic.
     */
    isUserError: boolean;
}

/**
 * Different networks of txs/blocks/UTXOs.
 * Supported are BCH, eCash, Lotus and Ergon.
 */
export type Network = 'BCH' | 'XEC' | 'XPI' | 'XRG';

/** Which SLP tx type. */
export type SlpTxType =
    | 'GENESIS'
    | 'SEND'
    | 'MINT'
    | 'BURN'
    | 'UNKNOWN_TX_TYPE';

/** Which SLP token type (normal fungible, NFT, unknown). */
export type SlpTokenType =
    | 'FUNGIBLE'
    | 'NFT1_GROUP'
    | 'NFT1_CHILD'
    | 'UNKNOWN_TOKEN_TYPE';

/**
 * State of a transaction output.
 * - `UNSPENT`: The UTXO is unspent.
 * - `SPENT`: The output is spent and no longer part of the UTXO set.
 * - `NO_SUCH_TX`: The tx queried does not exist.
 * - `NO_SUCH_OUTPUT`: The output queried does not exist, but the tx does exist.
 */
export type UtxoStateVariant =
    | 'UNSPENT'
    | 'SPENT'
    | 'NO_SUCH_TX'
    | 'NO_SUCH_OUTPUT';

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
 * - `p2tr-commitment`: Pay-to-Taproot
 *   (`OP_SCRIPTTYPE OP_1 <commitment> <state>?`), only on Lotus.
 *   Queries by the commitment. Payload is the 33 byte commitment.
 * - `p2tr-state`: Pay-to-Taproot (`OP_SCRIPTTYPE OP_1 <commitment> <state>`),
 *   only on Lotus. Queries by the state. Payload is the 32 byte state.
 */
export type ScriptType =
    | 'other'
    | 'p2pk'
    | 'p2pkh'
    | 'p2sh'
    | 'p2tr-commitment'
    | 'p2tr-state';
