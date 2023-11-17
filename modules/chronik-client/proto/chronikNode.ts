/* eslint-disable */
import Long from 'long';
import _m0 from 'protobufjs/minimal';

export const protobufPackage = 'chronik';

/** Type of message for the block */
export enum BlockMsgType {
    /** BLK_CONNECTED - Block connected to the blockchain */
    BLK_CONNECTED = 0,
    /** BLK_DISCONNECTED - Block disconnected from the blockchain */
    BLK_DISCONNECTED = 1,
    /** BLK_FINALIZED - Block has been finalized by Avalanche */
    BLK_FINALIZED = 2,
    UNRECOGNIZED = -1,
}

export function blockMsgTypeFromJSON(object: any): BlockMsgType {
    switch (object) {
        case 0:
        case 'BLK_CONNECTED':
            return BlockMsgType.BLK_CONNECTED;
        case 1:
        case 'BLK_DISCONNECTED':
            return BlockMsgType.BLK_DISCONNECTED;
        case 2:
        case 'BLK_FINALIZED':
            return BlockMsgType.BLK_FINALIZED;
        case -1:
        case 'UNRECOGNIZED':
        default:
            return BlockMsgType.UNRECOGNIZED;
    }
}

export function blockMsgTypeToJSON(object: BlockMsgType): string {
    switch (object) {
        case BlockMsgType.BLK_CONNECTED:
            return 'BLK_CONNECTED';
        case BlockMsgType.BLK_DISCONNECTED:
            return 'BLK_DISCONNECTED';
        case BlockMsgType.BLK_FINALIZED:
            return 'BLK_FINALIZED';
        case BlockMsgType.UNRECOGNIZED:
        default:
            return 'UNRECOGNIZED';
    }
}

/** Type of message for a tx */
export enum TxMsgType {
    /** TX_ADDED_TO_MEMPOOL - Tx added to the mempool */
    TX_ADDED_TO_MEMPOOL = 0,
    /** TX_REMOVED_FROM_MEMPOOL - Tx removed from the mempool */
    TX_REMOVED_FROM_MEMPOOL = 1,
    /** TX_CONFIRMED - Tx confirmed in a block */
    TX_CONFIRMED = 2,
    /** TX_FINALIZED - Tx finalized by Avalanche */
    TX_FINALIZED = 3,
    UNRECOGNIZED = -1,
}

export function txMsgTypeFromJSON(object: any): TxMsgType {
    switch (object) {
        case 0:
        case 'TX_ADDED_TO_MEMPOOL':
            return TxMsgType.TX_ADDED_TO_MEMPOOL;
        case 1:
        case 'TX_REMOVED_FROM_MEMPOOL':
            return TxMsgType.TX_REMOVED_FROM_MEMPOOL;
        case 2:
        case 'TX_CONFIRMED':
            return TxMsgType.TX_CONFIRMED;
        case 3:
        case 'TX_FINALIZED':
            return TxMsgType.TX_FINALIZED;
        case -1:
        case 'UNRECOGNIZED':
        default:
            return TxMsgType.UNRECOGNIZED;
    }
}

export function txMsgTypeToJSON(object: TxMsgType): string {
    switch (object) {
        case TxMsgType.TX_ADDED_TO_MEMPOOL:
            return 'TX_ADDED_TO_MEMPOOL';
        case TxMsgType.TX_REMOVED_FROM_MEMPOOL:
            return 'TX_REMOVED_FROM_MEMPOOL';
        case TxMsgType.TX_CONFIRMED:
            return 'TX_CONFIRMED';
        case TxMsgType.TX_FINALIZED:
            return 'TX_FINALIZED';
        case TxMsgType.UNRECOGNIZED:
        default:
            return 'UNRECOGNIZED';
    }
}

/** Block on the blockchain */
export interface Block {
    /** Info about the block */
    blockInfo: BlockInfo | undefined;
}

/** Range of blocks */
export interface Blocks {
    /** Queried blocks */
    blocks: BlockInfo[];
}

/** Info about the state of the blockchain. */
export interface BlockchainInfo {
    /** Hash (little-endian) of the current tip */
    tipHash: Uint8Array;
    /** Height of the current tip (genesis has height = 0) */
    tipHeight: number;
}

/** Info about the chronik software this server is running */
export interface ChronikInfo {
    /** chronik server version from chronik-http/Cargo.toml */
    version: string;
}

/** Info about a block */
export interface BlockInfo {
    /** Hash (little-endian) */
    hash: Uint8Array;
    /** Hash of the previous block (little-endian) */
    prevHash: Uint8Array;
    /** Height in the chain */
    height: number;
    /** nBits field encoding the target */
    nBits: number;
    /** Timestamp field of the block */
    timestamp: string;
    /** Whether the block has been finalized by Avalanche */
    isFinal: boolean;
    /** Block size of this block in bytes (including headers etc.) */
    blockSize: string;
    /** Number of txs in this block */
    numTxs: string;
    /** Total number of tx inputs in block (including coinbase) */
    numInputs: string;
    /** Total number of tx output in block (including coinbase) */
    numOutputs: string;
    /** Total number of satoshis spent by tx inputs */
    sumInputSats: string;
    /** Block reward for this block */
    sumCoinbaseOutputSats: string;
    /** Total number of satoshis in non-coinbase tx outputs */
    sumNormalOutputSats: string;
    /** Total number of satoshis burned using OP_RETURN */
    sumBurnedSats: string;
}

/** Details about a transaction */
export interface Tx {
    /** TxId (little-endian) of the tx */
    txid: Uint8Array;
    /** nVersion */
    version: number;
    /** Inputs of the tx (aka. `vin`) */
    inputs: TxInput[];
    /** Outputs of the tx (aka. `vout`) */
    outputs: TxOutput[];
    /** nLockTime */
    lockTime: number;
    /** Which block this tx is in, or None, if in the mempool */
    block: BlockMetadata | undefined;
    /** Time this tx has first been added to the mempool, or 0 if unknown */
    timeFirstSeen: string;
    /** Serialized size of the tx */
    size: number;
    /** Whether this tx is a coinbase tx */
    isCoinbase: boolean;
}

/** UTXO of a script. */
export interface ScriptUtxo {
    /** txid and out_idx of the unspent output. */
    outpoint: OutPoint | undefined;
    /** Block height of the UTXO, or -1 if in mempool. */
    blockHeight: number;
    /** Whether the UTXO has been created in a coinbase tx. */
    isCoinbase: boolean;
    /** Value of the output, in satoshis. */
    value: string;
    /** Whether the UTXO has been finalized by Avalanche. */
    isFinal: boolean;
}

/** COutPoint, points to a coin being spent by an input. */
export interface OutPoint {
    /** TxId of the tx of the output being spent. */
    txid: Uint8Array;
    /** Index of the output spent within the transaction. */
    outIdx: number;
}

/** Points to an input spending a coin. */
export interface SpentBy {
    /** TxId of the tx with the input. */
    txid: Uint8Array;
    /** Index in the inputs of the tx. */
    inputIdx: number;
}

/** CTxIn, spends a coin. */
export interface TxInput {
    /** Reference to the coin being spent. */
    prevOut: OutPoint | undefined;
    /** scriptSig, script unlocking the coin. */
    inputScript: Uint8Array;
    /** scriptPubKey, script of the output locking the coin. */
    outputScript: Uint8Array;
    /** value of the output being spent, in satoshis. */
    value: string;
    /** nSequence of the input. */
    sequenceNo: number;
}

/** CTxOut, creates a new coin. */
export interface TxOutput {
    /** Value of the coin, in satoshis. */
    value: string;
    /** scriptPubKey, script locking the output. */
    outputScript: Uint8Array;
    /** Which tx and input spent this output, if any. */
    spentBy: SpentBy | undefined;
}

/** Data about a block which a Tx is in. */
export interface BlockMetadata {
    /** Height of the block the tx is in. */
    height: number;
    /** Hash of the block the tx is in. */
    hash: Uint8Array;
    /** nTime of the block the tx is in. */
    timestamp: string;
    /** Whether the block has been finalized by Avalanche. */
    isFinal: boolean;
}

/** Page with txs */
export interface TxHistoryPage {
    /** Txs of the page */
    txs: Tx[];
    /** How many pages there are total */
    numPages: number;
    /** How many txs there are total */
    numTxs: number;
}

/** List of UTXOs of a script */
export interface ScriptUtxos {
    /** The serialized script of the UTXOs */
    script: Uint8Array;
    /** UTXOs of the script. */
    utxos: ScriptUtxo[];
}

/** Raw serialized tx. */
export interface RawTx {
    /** Bytes of the serialized tx. */
    rawTx: Uint8Array;
}

/** Subscription to WebSocket updates. */
export interface WsSub {
    /** Set this to `true` to unsubscribe from the event. */
    isUnsub: boolean;
    /** Subscription to block updates */
    blocks?: WsSubBlocks | undefined;
    /** Subscription to a script */
    script?: WsSubScript | undefined;
}

/**
 * Subscription to blocks. They will be sent any time a block got connected,
 * disconnected or finalized.
 */
export interface WsSubBlocks {}

/**
 * Subscription to a script. They will be send every time a tx spending the
 * given script or sending to the given script has been added to/removed from
 * the mempool, or confirmed in a block.
 */
export interface WsSubScript {
    /** Script type to subscribe to ("p2pkh", "p2sh", "p2pk", "other"). */
    scriptType: string;
    /**
     * Payload for the given script type:
     * - 20-byte hash for "p2pkh" and "p2sh"
     * - 33-byte or 65-byte pubkey for "p2pk"
     * - Serialized script for "other"
     */
    payload: Uint8Array;
}

/** Message coming from the WebSocket */
export interface WsMsg {
    /** Error, e.g. when a bad message has been sent into the WebSocket. */
    error?: Error | undefined;
    /** Block got connected, disconnected, finalized, etc. */
    block?: MsgBlock | undefined;
    /** Tx got added to/removed from the mempool, or confirmed in a block. */
    tx?: MsgTx | undefined;
}

/** Block got connected, disconnected, finalized, etc. */
export interface MsgBlock {
    /** What happened to the block */
    msgType: BlockMsgType;
    /** Hash of the block (little-endian) */
    blockHash: Uint8Array;
    /** Height of the block */
    blockHeight: number;
}

/** Tx got added to/removed from mempool, or confirmed in a block, etc. */
export interface MsgTx {
    /** What happened to the tx */
    msgType: TxMsgType;
    /** Txid of the tx (little-endian) */
    txid: Uint8Array;
}

/** Empty msg without any data */
export interface Empty {}

/** Error message returned from our APIs. */
export interface Error {
    /** 2, as legacy chronik uses this for the message so we're still compatible. */
    msg: string;
}

function createBaseBlock(): Block {
    return { blockInfo: undefined };
}

export const Block = {
    encode(
        message: Block,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.blockInfo !== undefined) {
            BlockInfo.encode(
                message.blockInfo,
                writer.uint32(10).fork(),
            ).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): Block {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBlock();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 10) {
                        break;
                    }

                    message.blockInfo = BlockInfo.decode(
                        reader,
                        reader.uint32(),
                    );
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): Block {
        return {
            blockInfo: isSet(object.blockInfo)
                ? BlockInfo.fromJSON(object.blockInfo)
                : undefined,
        };
    },

    toJSON(message: Block): unknown {
        const obj: any = {};
        message.blockInfo !== undefined &&
            (obj.blockInfo = message.blockInfo
                ? BlockInfo.toJSON(message.blockInfo)
                : undefined);
        return obj;
    },

    create<I extends Exact<DeepPartial<Block>, I>>(base?: I): Block {
        return Block.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<Block>, I>>(object: I): Block {
        const message = createBaseBlock();
        message.blockInfo =
            object.blockInfo !== undefined && object.blockInfo !== null
                ? BlockInfo.fromPartial(object.blockInfo)
                : undefined;
        return message;
    },
};

function createBaseBlocks(): Blocks {
    return { blocks: [] };
}

export const Blocks = {
    encode(
        message: Blocks,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        for (const v of message.blocks) {
            BlockInfo.encode(v!, writer.uint32(10).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): Blocks {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBlocks();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 10) {
                        break;
                    }

                    message.blocks.push(
                        BlockInfo.decode(reader, reader.uint32()),
                    );
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): Blocks {
        return {
            blocks: Array.isArray(object?.blocks)
                ? object.blocks.map((e: any) => BlockInfo.fromJSON(e))
                : [],
        };
    },

    toJSON(message: Blocks): unknown {
        const obj: any = {};
        if (message.blocks) {
            obj.blocks = message.blocks.map(e =>
                e ? BlockInfo.toJSON(e) : undefined,
            );
        } else {
            obj.blocks = [];
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<Blocks>, I>>(base?: I): Blocks {
        return Blocks.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<Blocks>, I>>(object: I): Blocks {
        const message = createBaseBlocks();
        message.blocks =
            object.blocks?.map(e => BlockInfo.fromPartial(e)) || [];
        return message;
    },
};

function createBaseBlockchainInfo(): BlockchainInfo {
    return { tipHash: new Uint8Array(), tipHeight: 0 };
}

export const BlockchainInfo = {
    encode(
        message: BlockchainInfo,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.tipHash.length !== 0) {
            writer.uint32(10).bytes(message.tipHash);
        }
        if (message.tipHeight !== 0) {
            writer.uint32(16).int32(message.tipHeight);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): BlockchainInfo {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBlockchainInfo();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 10) {
                        break;
                    }

                    message.tipHash = reader.bytes();
                    continue;
                case 2:
                    if (tag != 16) {
                        break;
                    }

                    message.tipHeight = reader.int32();
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): BlockchainInfo {
        return {
            tipHash: isSet(object.tipHash)
                ? bytesFromBase64(object.tipHash)
                : new Uint8Array(),
            tipHeight: isSet(object.tipHeight) ? Number(object.tipHeight) : 0,
        };
    },

    toJSON(message: BlockchainInfo): unknown {
        const obj: any = {};
        message.tipHash !== undefined &&
            (obj.tipHash = base64FromBytes(
                message.tipHash !== undefined
                    ? message.tipHash
                    : new Uint8Array(),
            ));
        message.tipHeight !== undefined &&
            (obj.tipHeight = Math.round(message.tipHeight));
        return obj;
    },

    create<I extends Exact<DeepPartial<BlockchainInfo>, I>>(
        base?: I,
    ): BlockchainInfo {
        return BlockchainInfo.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<BlockchainInfo>, I>>(
        object: I,
    ): BlockchainInfo {
        const message = createBaseBlockchainInfo();
        message.tipHash = object.tipHash ?? new Uint8Array();
        message.tipHeight = object.tipHeight ?? 0;
        return message;
    },
};

function createBaseChronikInfo(): ChronikInfo {
    return { version: '' };
}

export const ChronikInfo = {
    encode(
        message: ChronikInfo,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.version !== '') {
            writer.uint32(10).string(message.version);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): ChronikInfo {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseChronikInfo();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 10) {
                        break;
                    }

                    message.version = reader.string();
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): ChronikInfo {
        return { version: isSet(object.version) ? String(object.version) : '' };
    },

    toJSON(message: ChronikInfo): unknown {
        const obj: any = {};
        message.version !== undefined && (obj.version = message.version);
        return obj;
    },

    create<I extends Exact<DeepPartial<ChronikInfo>, I>>(
        base?: I,
    ): ChronikInfo {
        return ChronikInfo.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<ChronikInfo>, I>>(
        object: I,
    ): ChronikInfo {
        const message = createBaseChronikInfo();
        message.version = object.version ?? '';
        return message;
    },
};

function createBaseBlockInfo(): BlockInfo {
    return {
        hash: new Uint8Array(),
        prevHash: new Uint8Array(),
        height: 0,
        nBits: 0,
        timestamp: '0',
        isFinal: false,
        blockSize: '0',
        numTxs: '0',
        numInputs: '0',
        numOutputs: '0',
        sumInputSats: '0',
        sumCoinbaseOutputSats: '0',
        sumNormalOutputSats: '0',
        sumBurnedSats: '0',
    };
}

export const BlockInfo = {
    encode(
        message: BlockInfo,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.hash.length !== 0) {
            writer.uint32(10).bytes(message.hash);
        }
        if (message.prevHash.length !== 0) {
            writer.uint32(18).bytes(message.prevHash);
        }
        if (message.height !== 0) {
            writer.uint32(24).int32(message.height);
        }
        if (message.nBits !== 0) {
            writer.uint32(32).uint32(message.nBits);
        }
        if (message.timestamp !== '0') {
            writer.uint32(40).int64(message.timestamp);
        }
        if (message.isFinal === true) {
            writer.uint32(112).bool(message.isFinal);
        }
        if (message.blockSize !== '0') {
            writer.uint32(48).uint64(message.blockSize);
        }
        if (message.numTxs !== '0') {
            writer.uint32(56).uint64(message.numTxs);
        }
        if (message.numInputs !== '0') {
            writer.uint32(64).uint64(message.numInputs);
        }
        if (message.numOutputs !== '0') {
            writer.uint32(72).uint64(message.numOutputs);
        }
        if (message.sumInputSats !== '0') {
            writer.uint32(80).int64(message.sumInputSats);
        }
        if (message.sumCoinbaseOutputSats !== '0') {
            writer.uint32(88).int64(message.sumCoinbaseOutputSats);
        }
        if (message.sumNormalOutputSats !== '0') {
            writer.uint32(96).int64(message.sumNormalOutputSats);
        }
        if (message.sumBurnedSats !== '0') {
            writer.uint32(104).int64(message.sumBurnedSats);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): BlockInfo {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBlockInfo();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 10) {
                        break;
                    }

                    message.hash = reader.bytes();
                    continue;
                case 2:
                    if (tag != 18) {
                        break;
                    }

                    message.prevHash = reader.bytes();
                    continue;
                case 3:
                    if (tag != 24) {
                        break;
                    }

                    message.height = reader.int32();
                    continue;
                case 4:
                    if (tag != 32) {
                        break;
                    }

                    message.nBits = reader.uint32();
                    continue;
                case 5:
                    if (tag != 40) {
                        break;
                    }

                    message.timestamp = longToString(reader.int64() as Long);
                    continue;
                case 14:
                    if (tag != 112) {
                        break;
                    }

                    message.isFinal = reader.bool();
                    continue;
                case 6:
                    if (tag != 48) {
                        break;
                    }

                    message.blockSize = longToString(reader.uint64() as Long);
                    continue;
                case 7:
                    if (tag != 56) {
                        break;
                    }

                    message.numTxs = longToString(reader.uint64() as Long);
                    continue;
                case 8:
                    if (tag != 64) {
                        break;
                    }

                    message.numInputs = longToString(reader.uint64() as Long);
                    continue;
                case 9:
                    if (tag != 72) {
                        break;
                    }

                    message.numOutputs = longToString(reader.uint64() as Long);
                    continue;
                case 10:
                    if (tag != 80) {
                        break;
                    }

                    message.sumInputSats = longToString(reader.int64() as Long);
                    continue;
                case 11:
                    if (tag != 88) {
                        break;
                    }

                    message.sumCoinbaseOutputSats = longToString(
                        reader.int64() as Long,
                    );
                    continue;
                case 12:
                    if (tag != 96) {
                        break;
                    }

                    message.sumNormalOutputSats = longToString(
                        reader.int64() as Long,
                    );
                    continue;
                case 13:
                    if (tag != 104) {
                        break;
                    }

                    message.sumBurnedSats = longToString(
                        reader.int64() as Long,
                    );
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): BlockInfo {
        return {
            hash: isSet(object.hash)
                ? bytesFromBase64(object.hash)
                : new Uint8Array(),
            prevHash: isSet(object.prevHash)
                ? bytesFromBase64(object.prevHash)
                : new Uint8Array(),
            height: isSet(object.height) ? Number(object.height) : 0,
            nBits: isSet(object.nBits) ? Number(object.nBits) : 0,
            timestamp: isSet(object.timestamp) ? String(object.timestamp) : '0',
            isFinal: isSet(object.isFinal) ? Boolean(object.isFinal) : false,
            blockSize: isSet(object.blockSize) ? String(object.blockSize) : '0',
            numTxs: isSet(object.numTxs) ? String(object.numTxs) : '0',
            numInputs: isSet(object.numInputs) ? String(object.numInputs) : '0',
            numOutputs: isSet(object.numOutputs)
                ? String(object.numOutputs)
                : '0',
            sumInputSats: isSet(object.sumInputSats)
                ? String(object.sumInputSats)
                : '0',
            sumCoinbaseOutputSats: isSet(object.sumCoinbaseOutputSats)
                ? String(object.sumCoinbaseOutputSats)
                : '0',
            sumNormalOutputSats: isSet(object.sumNormalOutputSats)
                ? String(object.sumNormalOutputSats)
                : '0',
            sumBurnedSats: isSet(object.sumBurnedSats)
                ? String(object.sumBurnedSats)
                : '0',
        };
    },

    toJSON(message: BlockInfo): unknown {
        const obj: any = {};
        message.hash !== undefined &&
            (obj.hash = base64FromBytes(
                message.hash !== undefined ? message.hash : new Uint8Array(),
            ));
        message.prevHash !== undefined &&
            (obj.prevHash = base64FromBytes(
                message.prevHash !== undefined
                    ? message.prevHash
                    : new Uint8Array(),
            ));
        message.height !== undefined &&
            (obj.height = Math.round(message.height));
        message.nBits !== undefined && (obj.nBits = Math.round(message.nBits));
        message.timestamp !== undefined && (obj.timestamp = message.timestamp);
        message.isFinal !== undefined && (obj.isFinal = message.isFinal);
        message.blockSize !== undefined && (obj.blockSize = message.blockSize);
        message.numTxs !== undefined && (obj.numTxs = message.numTxs);
        message.numInputs !== undefined && (obj.numInputs = message.numInputs);
        message.numOutputs !== undefined &&
            (obj.numOutputs = message.numOutputs);
        message.sumInputSats !== undefined &&
            (obj.sumInputSats = message.sumInputSats);
        message.sumCoinbaseOutputSats !== undefined &&
            (obj.sumCoinbaseOutputSats = message.sumCoinbaseOutputSats);
        message.sumNormalOutputSats !== undefined &&
            (obj.sumNormalOutputSats = message.sumNormalOutputSats);
        message.sumBurnedSats !== undefined &&
            (obj.sumBurnedSats = message.sumBurnedSats);
        return obj;
    },

    create<I extends Exact<DeepPartial<BlockInfo>, I>>(base?: I): BlockInfo {
        return BlockInfo.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<BlockInfo>, I>>(
        object: I,
    ): BlockInfo {
        const message = createBaseBlockInfo();
        message.hash = object.hash ?? new Uint8Array();
        message.prevHash = object.prevHash ?? new Uint8Array();
        message.height = object.height ?? 0;
        message.nBits = object.nBits ?? 0;
        message.timestamp = object.timestamp ?? '0';
        message.isFinal = object.isFinal ?? false;
        message.blockSize = object.blockSize ?? '0';
        message.numTxs = object.numTxs ?? '0';
        message.numInputs = object.numInputs ?? '0';
        message.numOutputs = object.numOutputs ?? '0';
        message.sumInputSats = object.sumInputSats ?? '0';
        message.sumCoinbaseOutputSats = object.sumCoinbaseOutputSats ?? '0';
        message.sumNormalOutputSats = object.sumNormalOutputSats ?? '0';
        message.sumBurnedSats = object.sumBurnedSats ?? '0';
        return message;
    },
};

function createBaseTx(): Tx {
    return {
        txid: new Uint8Array(),
        version: 0,
        inputs: [],
        outputs: [],
        lockTime: 0,
        block: undefined,
        timeFirstSeen: '0',
        size: 0,
        isCoinbase: false,
    };
}

export const Tx = {
    encode(message: Tx, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.txid.length !== 0) {
            writer.uint32(10).bytes(message.txid);
        }
        if (message.version !== 0) {
            writer.uint32(16).int32(message.version);
        }
        for (const v of message.inputs) {
            TxInput.encode(v!, writer.uint32(26).fork()).ldelim();
        }
        for (const v of message.outputs) {
            TxOutput.encode(v!, writer.uint32(34).fork()).ldelim();
        }
        if (message.lockTime !== 0) {
            writer.uint32(40).uint32(message.lockTime);
        }
        if (message.block !== undefined) {
            BlockMetadata.encode(
                message.block,
                writer.uint32(66).fork(),
            ).ldelim();
        }
        if (message.timeFirstSeen !== '0') {
            writer.uint32(72).int64(message.timeFirstSeen);
        }
        if (message.size !== 0) {
            writer.uint32(88).uint32(message.size);
        }
        if (message.isCoinbase === true) {
            writer.uint32(96).bool(message.isCoinbase);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): Tx {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseTx();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 10) {
                        break;
                    }

                    message.txid = reader.bytes();
                    continue;
                case 2:
                    if (tag != 16) {
                        break;
                    }

                    message.version = reader.int32();
                    continue;
                case 3:
                    if (tag != 26) {
                        break;
                    }

                    message.inputs.push(
                        TxInput.decode(reader, reader.uint32()),
                    );
                    continue;
                case 4:
                    if (tag != 34) {
                        break;
                    }

                    message.outputs.push(
                        TxOutput.decode(reader, reader.uint32()),
                    );
                    continue;
                case 5:
                    if (tag != 40) {
                        break;
                    }

                    message.lockTime = reader.uint32();
                    continue;
                case 8:
                    if (tag != 66) {
                        break;
                    }

                    message.block = BlockMetadata.decode(
                        reader,
                        reader.uint32(),
                    );
                    continue;
                case 9:
                    if (tag != 72) {
                        break;
                    }

                    message.timeFirstSeen = longToString(
                        reader.int64() as Long,
                    );
                    continue;
                case 11:
                    if (tag != 88) {
                        break;
                    }

                    message.size = reader.uint32();
                    continue;
                case 12:
                    if (tag != 96) {
                        break;
                    }

                    message.isCoinbase = reader.bool();
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): Tx {
        return {
            txid: isSet(object.txid)
                ? bytesFromBase64(object.txid)
                : new Uint8Array(),
            version: isSet(object.version) ? Number(object.version) : 0,
            inputs: Array.isArray(object?.inputs)
                ? object.inputs.map((e: any) => TxInput.fromJSON(e))
                : [],
            outputs: Array.isArray(object?.outputs)
                ? object.outputs.map((e: any) => TxOutput.fromJSON(e))
                : [],
            lockTime: isSet(object.lockTime) ? Number(object.lockTime) : 0,
            block: isSet(object.block)
                ? BlockMetadata.fromJSON(object.block)
                : undefined,
            timeFirstSeen: isSet(object.timeFirstSeen)
                ? String(object.timeFirstSeen)
                : '0',
            size: isSet(object.size) ? Number(object.size) : 0,
            isCoinbase: isSet(object.isCoinbase)
                ? Boolean(object.isCoinbase)
                : false,
        };
    },

    toJSON(message: Tx): unknown {
        const obj: any = {};
        message.txid !== undefined &&
            (obj.txid = base64FromBytes(
                message.txid !== undefined ? message.txid : new Uint8Array(),
            ));
        message.version !== undefined &&
            (obj.version = Math.round(message.version));
        if (message.inputs) {
            obj.inputs = message.inputs.map(e =>
                e ? TxInput.toJSON(e) : undefined,
            );
        } else {
            obj.inputs = [];
        }
        if (message.outputs) {
            obj.outputs = message.outputs.map(e =>
                e ? TxOutput.toJSON(e) : undefined,
            );
        } else {
            obj.outputs = [];
        }
        message.lockTime !== undefined &&
            (obj.lockTime = Math.round(message.lockTime));
        message.block !== undefined &&
            (obj.block = message.block
                ? BlockMetadata.toJSON(message.block)
                : undefined);
        message.timeFirstSeen !== undefined &&
            (obj.timeFirstSeen = message.timeFirstSeen);
        message.size !== undefined && (obj.size = Math.round(message.size));
        message.isCoinbase !== undefined &&
            (obj.isCoinbase = message.isCoinbase);
        return obj;
    },

    create<I extends Exact<DeepPartial<Tx>, I>>(base?: I): Tx {
        return Tx.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<Tx>, I>>(object: I): Tx {
        const message = createBaseTx();
        message.txid = object.txid ?? new Uint8Array();
        message.version = object.version ?? 0;
        message.inputs = object.inputs?.map(e => TxInput.fromPartial(e)) || [];
        message.outputs =
            object.outputs?.map(e => TxOutput.fromPartial(e)) || [];
        message.lockTime = object.lockTime ?? 0;
        message.block =
            object.block !== undefined && object.block !== null
                ? BlockMetadata.fromPartial(object.block)
                : undefined;
        message.timeFirstSeen = object.timeFirstSeen ?? '0';
        message.size = object.size ?? 0;
        message.isCoinbase = object.isCoinbase ?? false;
        return message;
    },
};

function createBaseScriptUtxo(): ScriptUtxo {
    return {
        outpoint: undefined,
        blockHeight: 0,
        isCoinbase: false,
        value: '0',
        isFinal: false,
    };
}

export const ScriptUtxo = {
    encode(
        message: ScriptUtxo,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.outpoint !== undefined) {
            OutPoint.encode(
                message.outpoint,
                writer.uint32(10).fork(),
            ).ldelim();
        }
        if (message.blockHeight !== 0) {
            writer.uint32(16).int32(message.blockHeight);
        }
        if (message.isCoinbase === true) {
            writer.uint32(24).bool(message.isCoinbase);
        }
        if (message.value !== '0') {
            writer.uint32(40).int64(message.value);
        }
        if (message.isFinal === true) {
            writer.uint32(80).bool(message.isFinal);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): ScriptUtxo {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseScriptUtxo();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 10) {
                        break;
                    }

                    message.outpoint = OutPoint.decode(reader, reader.uint32());
                    continue;
                case 2:
                    if (tag != 16) {
                        break;
                    }

                    message.blockHeight = reader.int32();
                    continue;
                case 3:
                    if (tag != 24) {
                        break;
                    }

                    message.isCoinbase = reader.bool();
                    continue;
                case 5:
                    if (tag != 40) {
                        break;
                    }

                    message.value = longToString(reader.int64() as Long);
                    continue;
                case 10:
                    if (tag != 80) {
                        break;
                    }

                    message.isFinal = reader.bool();
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): ScriptUtxo {
        return {
            outpoint: isSet(object.outpoint)
                ? OutPoint.fromJSON(object.outpoint)
                : undefined,
            blockHeight: isSet(object.blockHeight)
                ? Number(object.blockHeight)
                : 0,
            isCoinbase: isSet(object.isCoinbase)
                ? Boolean(object.isCoinbase)
                : false,
            value: isSet(object.value) ? String(object.value) : '0',
            isFinal: isSet(object.isFinal) ? Boolean(object.isFinal) : false,
        };
    },

    toJSON(message: ScriptUtxo): unknown {
        const obj: any = {};
        message.outpoint !== undefined &&
            (obj.outpoint = message.outpoint
                ? OutPoint.toJSON(message.outpoint)
                : undefined);
        message.blockHeight !== undefined &&
            (obj.blockHeight = Math.round(message.blockHeight));
        message.isCoinbase !== undefined &&
            (obj.isCoinbase = message.isCoinbase);
        message.value !== undefined && (obj.value = message.value);
        message.isFinal !== undefined && (obj.isFinal = message.isFinal);
        return obj;
    },

    create<I extends Exact<DeepPartial<ScriptUtxo>, I>>(base?: I): ScriptUtxo {
        return ScriptUtxo.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<ScriptUtxo>, I>>(
        object: I,
    ): ScriptUtxo {
        const message = createBaseScriptUtxo();
        message.outpoint =
            object.outpoint !== undefined && object.outpoint !== null
                ? OutPoint.fromPartial(object.outpoint)
                : undefined;
        message.blockHeight = object.blockHeight ?? 0;
        message.isCoinbase = object.isCoinbase ?? false;
        message.value = object.value ?? '0';
        message.isFinal = object.isFinal ?? false;
        return message;
    },
};

function createBaseOutPoint(): OutPoint {
    return { txid: new Uint8Array(), outIdx: 0 };
}

export const OutPoint = {
    encode(
        message: OutPoint,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.txid.length !== 0) {
            writer.uint32(10).bytes(message.txid);
        }
        if (message.outIdx !== 0) {
            writer.uint32(16).uint32(message.outIdx);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): OutPoint {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseOutPoint();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 10) {
                        break;
                    }

                    message.txid = reader.bytes();
                    continue;
                case 2:
                    if (tag != 16) {
                        break;
                    }

                    message.outIdx = reader.uint32();
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): OutPoint {
        return {
            txid: isSet(object.txid)
                ? bytesFromBase64(object.txid)
                : new Uint8Array(),
            outIdx: isSet(object.outIdx) ? Number(object.outIdx) : 0,
        };
    },

    toJSON(message: OutPoint): unknown {
        const obj: any = {};
        message.txid !== undefined &&
            (obj.txid = base64FromBytes(
                message.txid !== undefined ? message.txid : new Uint8Array(),
            ));
        message.outIdx !== undefined &&
            (obj.outIdx = Math.round(message.outIdx));
        return obj;
    },

    create<I extends Exact<DeepPartial<OutPoint>, I>>(base?: I): OutPoint {
        return OutPoint.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<OutPoint>, I>>(
        object: I,
    ): OutPoint {
        const message = createBaseOutPoint();
        message.txid = object.txid ?? new Uint8Array();
        message.outIdx = object.outIdx ?? 0;
        return message;
    },
};

function createBaseSpentBy(): SpentBy {
    return { txid: new Uint8Array(), inputIdx: 0 };
}

export const SpentBy = {
    encode(
        message: SpentBy,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.txid.length !== 0) {
            writer.uint32(10).bytes(message.txid);
        }
        if (message.inputIdx !== 0) {
            writer.uint32(16).uint32(message.inputIdx);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): SpentBy {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseSpentBy();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 10) {
                        break;
                    }

                    message.txid = reader.bytes();
                    continue;
                case 2:
                    if (tag != 16) {
                        break;
                    }

                    message.inputIdx = reader.uint32();
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): SpentBy {
        return {
            txid: isSet(object.txid)
                ? bytesFromBase64(object.txid)
                : new Uint8Array(),
            inputIdx: isSet(object.inputIdx) ? Number(object.inputIdx) : 0,
        };
    },

    toJSON(message: SpentBy): unknown {
        const obj: any = {};
        message.txid !== undefined &&
            (obj.txid = base64FromBytes(
                message.txid !== undefined ? message.txid : new Uint8Array(),
            ));
        message.inputIdx !== undefined &&
            (obj.inputIdx = Math.round(message.inputIdx));
        return obj;
    },

    create<I extends Exact<DeepPartial<SpentBy>, I>>(base?: I): SpentBy {
        return SpentBy.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<SpentBy>, I>>(object: I): SpentBy {
        const message = createBaseSpentBy();
        message.txid = object.txid ?? new Uint8Array();
        message.inputIdx = object.inputIdx ?? 0;
        return message;
    },
};

function createBaseTxInput(): TxInput {
    return {
        prevOut: undefined,
        inputScript: new Uint8Array(),
        outputScript: new Uint8Array(),
        value: '0',
        sequenceNo: 0,
    };
}

export const TxInput = {
    encode(
        message: TxInput,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.prevOut !== undefined) {
            OutPoint.encode(message.prevOut, writer.uint32(10).fork()).ldelim();
        }
        if (message.inputScript.length !== 0) {
            writer.uint32(18).bytes(message.inputScript);
        }
        if (message.outputScript.length !== 0) {
            writer.uint32(26).bytes(message.outputScript);
        }
        if (message.value !== '0') {
            writer.uint32(32).int64(message.value);
        }
        if (message.sequenceNo !== 0) {
            writer.uint32(40).uint32(message.sequenceNo);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): TxInput {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseTxInput();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 10) {
                        break;
                    }

                    message.prevOut = OutPoint.decode(reader, reader.uint32());
                    continue;
                case 2:
                    if (tag != 18) {
                        break;
                    }

                    message.inputScript = reader.bytes();
                    continue;
                case 3:
                    if (tag != 26) {
                        break;
                    }

                    message.outputScript = reader.bytes();
                    continue;
                case 4:
                    if (tag != 32) {
                        break;
                    }

                    message.value = longToString(reader.int64() as Long);
                    continue;
                case 5:
                    if (tag != 40) {
                        break;
                    }

                    message.sequenceNo = reader.uint32();
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): TxInput {
        return {
            prevOut: isSet(object.prevOut)
                ? OutPoint.fromJSON(object.prevOut)
                : undefined,
            inputScript: isSet(object.inputScript)
                ? bytesFromBase64(object.inputScript)
                : new Uint8Array(),
            outputScript: isSet(object.outputScript)
                ? bytesFromBase64(object.outputScript)
                : new Uint8Array(),
            value: isSet(object.value) ? String(object.value) : '0',
            sequenceNo: isSet(object.sequenceNo)
                ? Number(object.sequenceNo)
                : 0,
        };
    },

    toJSON(message: TxInput): unknown {
        const obj: any = {};
        message.prevOut !== undefined &&
            (obj.prevOut = message.prevOut
                ? OutPoint.toJSON(message.prevOut)
                : undefined);
        message.inputScript !== undefined &&
            (obj.inputScript = base64FromBytes(
                message.inputScript !== undefined
                    ? message.inputScript
                    : new Uint8Array(),
            ));
        message.outputScript !== undefined &&
            (obj.outputScript = base64FromBytes(
                message.outputScript !== undefined
                    ? message.outputScript
                    : new Uint8Array(),
            ));
        message.value !== undefined && (obj.value = message.value);
        message.sequenceNo !== undefined &&
            (obj.sequenceNo = Math.round(message.sequenceNo));
        return obj;
    },

    create<I extends Exact<DeepPartial<TxInput>, I>>(base?: I): TxInput {
        return TxInput.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<TxInput>, I>>(object: I): TxInput {
        const message = createBaseTxInput();
        message.prevOut =
            object.prevOut !== undefined && object.prevOut !== null
                ? OutPoint.fromPartial(object.prevOut)
                : undefined;
        message.inputScript = object.inputScript ?? new Uint8Array();
        message.outputScript = object.outputScript ?? new Uint8Array();
        message.value = object.value ?? '0';
        message.sequenceNo = object.sequenceNo ?? 0;
        return message;
    },
};

function createBaseTxOutput(): TxOutput {
    return { value: '0', outputScript: new Uint8Array(), spentBy: undefined };
}

export const TxOutput = {
    encode(
        message: TxOutput,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.value !== '0') {
            writer.uint32(8).int64(message.value);
        }
        if (message.outputScript.length !== 0) {
            writer.uint32(18).bytes(message.outputScript);
        }
        if (message.spentBy !== undefined) {
            SpentBy.encode(message.spentBy, writer.uint32(34).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): TxOutput {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseTxOutput();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 8) {
                        break;
                    }

                    message.value = longToString(reader.int64() as Long);
                    continue;
                case 2:
                    if (tag != 18) {
                        break;
                    }

                    message.outputScript = reader.bytes();
                    continue;
                case 4:
                    if (tag != 34) {
                        break;
                    }

                    message.spentBy = SpentBy.decode(reader, reader.uint32());
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): TxOutput {
        return {
            value: isSet(object.value) ? String(object.value) : '0',
            outputScript: isSet(object.outputScript)
                ? bytesFromBase64(object.outputScript)
                : new Uint8Array(),
            spentBy: isSet(object.spentBy)
                ? SpentBy.fromJSON(object.spentBy)
                : undefined,
        };
    },

    toJSON(message: TxOutput): unknown {
        const obj: any = {};
        message.value !== undefined && (obj.value = message.value);
        message.outputScript !== undefined &&
            (obj.outputScript = base64FromBytes(
                message.outputScript !== undefined
                    ? message.outputScript
                    : new Uint8Array(),
            ));
        message.spentBy !== undefined &&
            (obj.spentBy = message.spentBy
                ? SpentBy.toJSON(message.spentBy)
                : undefined);
        return obj;
    },

    create<I extends Exact<DeepPartial<TxOutput>, I>>(base?: I): TxOutput {
        return TxOutput.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<TxOutput>, I>>(
        object: I,
    ): TxOutput {
        const message = createBaseTxOutput();
        message.value = object.value ?? '0';
        message.outputScript = object.outputScript ?? new Uint8Array();
        message.spentBy =
            object.spentBy !== undefined && object.spentBy !== null
                ? SpentBy.fromPartial(object.spentBy)
                : undefined;
        return message;
    },
};

function createBaseBlockMetadata(): BlockMetadata {
    return {
        height: 0,
        hash: new Uint8Array(),
        timestamp: '0',
        isFinal: false,
    };
}

export const BlockMetadata = {
    encode(
        message: BlockMetadata,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.height !== 0) {
            writer.uint32(8).int32(message.height);
        }
        if (message.hash.length !== 0) {
            writer.uint32(18).bytes(message.hash);
        }
        if (message.timestamp !== '0') {
            writer.uint32(24).int64(message.timestamp);
        }
        if (message.isFinal === true) {
            writer.uint32(32).bool(message.isFinal);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): BlockMetadata {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBlockMetadata();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 8) {
                        break;
                    }

                    message.height = reader.int32();
                    continue;
                case 2:
                    if (tag != 18) {
                        break;
                    }

                    message.hash = reader.bytes();
                    continue;
                case 3:
                    if (tag != 24) {
                        break;
                    }

                    message.timestamp = longToString(reader.int64() as Long);
                    continue;
                case 4:
                    if (tag != 32) {
                        break;
                    }

                    message.isFinal = reader.bool();
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): BlockMetadata {
        return {
            height: isSet(object.height) ? Number(object.height) : 0,
            hash: isSet(object.hash)
                ? bytesFromBase64(object.hash)
                : new Uint8Array(),
            timestamp: isSet(object.timestamp) ? String(object.timestamp) : '0',
            isFinal: isSet(object.isFinal) ? Boolean(object.isFinal) : false,
        };
    },

    toJSON(message: BlockMetadata): unknown {
        const obj: any = {};
        message.height !== undefined &&
            (obj.height = Math.round(message.height));
        message.hash !== undefined &&
            (obj.hash = base64FromBytes(
                message.hash !== undefined ? message.hash : new Uint8Array(),
            ));
        message.timestamp !== undefined && (obj.timestamp = message.timestamp);
        message.isFinal !== undefined && (obj.isFinal = message.isFinal);
        return obj;
    },

    create<I extends Exact<DeepPartial<BlockMetadata>, I>>(
        base?: I,
    ): BlockMetadata {
        return BlockMetadata.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<BlockMetadata>, I>>(
        object: I,
    ): BlockMetadata {
        const message = createBaseBlockMetadata();
        message.height = object.height ?? 0;
        message.hash = object.hash ?? new Uint8Array();
        message.timestamp = object.timestamp ?? '0';
        message.isFinal = object.isFinal ?? false;
        return message;
    },
};

function createBaseTxHistoryPage(): TxHistoryPage {
    return { txs: [], numPages: 0, numTxs: 0 };
}

export const TxHistoryPage = {
    encode(
        message: TxHistoryPage,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        for (const v of message.txs) {
            Tx.encode(v!, writer.uint32(10).fork()).ldelim();
        }
        if (message.numPages !== 0) {
            writer.uint32(16).uint32(message.numPages);
        }
        if (message.numTxs !== 0) {
            writer.uint32(24).uint32(message.numTxs);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): TxHistoryPage {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseTxHistoryPage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 10) {
                        break;
                    }

                    message.txs.push(Tx.decode(reader, reader.uint32()));
                    continue;
                case 2:
                    if (tag != 16) {
                        break;
                    }

                    message.numPages = reader.uint32();
                    continue;
                case 3:
                    if (tag != 24) {
                        break;
                    }

                    message.numTxs = reader.uint32();
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): TxHistoryPage {
        return {
            txs: Array.isArray(object?.txs)
                ? object.txs.map((e: any) => Tx.fromJSON(e))
                : [],
            numPages: isSet(object.numPages) ? Number(object.numPages) : 0,
            numTxs: isSet(object.numTxs) ? Number(object.numTxs) : 0,
        };
    },

    toJSON(message: TxHistoryPage): unknown {
        const obj: any = {};
        if (message.txs) {
            obj.txs = message.txs.map(e => (e ? Tx.toJSON(e) : undefined));
        } else {
            obj.txs = [];
        }
        message.numPages !== undefined &&
            (obj.numPages = Math.round(message.numPages));
        message.numTxs !== undefined &&
            (obj.numTxs = Math.round(message.numTxs));
        return obj;
    },

    create<I extends Exact<DeepPartial<TxHistoryPage>, I>>(
        base?: I,
    ): TxHistoryPage {
        return TxHistoryPage.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<TxHistoryPage>, I>>(
        object: I,
    ): TxHistoryPage {
        const message = createBaseTxHistoryPage();
        message.txs = object.txs?.map(e => Tx.fromPartial(e)) || [];
        message.numPages = object.numPages ?? 0;
        message.numTxs = object.numTxs ?? 0;
        return message;
    },
};

function createBaseScriptUtxos(): ScriptUtxos {
    return { script: new Uint8Array(), utxos: [] };
}

export const ScriptUtxos = {
    encode(
        message: ScriptUtxos,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.script.length !== 0) {
            writer.uint32(10).bytes(message.script);
        }
        for (const v of message.utxos) {
            ScriptUtxo.encode(v!, writer.uint32(18).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): ScriptUtxos {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseScriptUtxos();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 10) {
                        break;
                    }

                    message.script = reader.bytes();
                    continue;
                case 2:
                    if (tag != 18) {
                        break;
                    }

                    message.utxos.push(
                        ScriptUtxo.decode(reader, reader.uint32()),
                    );
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): ScriptUtxos {
        return {
            script: isSet(object.script)
                ? bytesFromBase64(object.script)
                : new Uint8Array(),
            utxos: Array.isArray(object?.utxos)
                ? object.utxos.map((e: any) => ScriptUtxo.fromJSON(e))
                : [],
        };
    },

    toJSON(message: ScriptUtxos): unknown {
        const obj: any = {};
        message.script !== undefined &&
            (obj.script = base64FromBytes(
                message.script !== undefined
                    ? message.script
                    : new Uint8Array(),
            ));
        if (message.utxos) {
            obj.utxos = message.utxos.map(e =>
                e ? ScriptUtxo.toJSON(e) : undefined,
            );
        } else {
            obj.utxos = [];
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<ScriptUtxos>, I>>(
        base?: I,
    ): ScriptUtxos {
        return ScriptUtxos.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<ScriptUtxos>, I>>(
        object: I,
    ): ScriptUtxos {
        const message = createBaseScriptUtxos();
        message.script = object.script ?? new Uint8Array();
        message.utxos = object.utxos?.map(e => ScriptUtxo.fromPartial(e)) || [];
        return message;
    },
};

function createBaseRawTx(): RawTx {
    return { rawTx: new Uint8Array() };
}

export const RawTx = {
    encode(
        message: RawTx,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.rawTx.length !== 0) {
            writer.uint32(10).bytes(message.rawTx);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): RawTx {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseRawTx();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 10) {
                        break;
                    }

                    message.rawTx = reader.bytes();
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): RawTx {
        return {
            rawTx: isSet(object.rawTx)
                ? bytesFromBase64(object.rawTx)
                : new Uint8Array(),
        };
    },

    toJSON(message: RawTx): unknown {
        const obj: any = {};
        message.rawTx !== undefined &&
            (obj.rawTx = base64FromBytes(
                message.rawTx !== undefined ? message.rawTx : new Uint8Array(),
            ));
        return obj;
    },

    create<I extends Exact<DeepPartial<RawTx>, I>>(base?: I): RawTx {
        return RawTx.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<RawTx>, I>>(object: I): RawTx {
        const message = createBaseRawTx();
        message.rawTx = object.rawTx ?? new Uint8Array();
        return message;
    },
};

function createBaseWsSub(): WsSub {
    return { isUnsub: false, blocks: undefined, script: undefined };
}

export const WsSub = {
    encode(
        message: WsSub,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.isUnsub === true) {
            writer.uint32(8).bool(message.isUnsub);
        }
        if (message.blocks !== undefined) {
            WsSubBlocks.encode(
                message.blocks,
                writer.uint32(18).fork(),
            ).ldelim();
        }
        if (message.script !== undefined) {
            WsSubScript.encode(
                message.script,
                writer.uint32(26).fork(),
            ).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): WsSub {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWsSub();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 8) {
                        break;
                    }

                    message.isUnsub = reader.bool();
                    continue;
                case 2:
                    if (tag != 18) {
                        break;
                    }

                    message.blocks = WsSubBlocks.decode(
                        reader,
                        reader.uint32(),
                    );
                    continue;
                case 3:
                    if (tag != 26) {
                        break;
                    }

                    message.script = WsSubScript.decode(
                        reader,
                        reader.uint32(),
                    );
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): WsSub {
        return {
            isUnsub: isSet(object.isUnsub) ? Boolean(object.isUnsub) : false,
            blocks: isSet(object.blocks)
                ? WsSubBlocks.fromJSON(object.blocks)
                : undefined,
            script: isSet(object.script)
                ? WsSubScript.fromJSON(object.script)
                : undefined,
        };
    },

    toJSON(message: WsSub): unknown {
        const obj: any = {};
        message.isUnsub !== undefined && (obj.isUnsub = message.isUnsub);
        message.blocks !== undefined &&
            (obj.blocks = message.blocks
                ? WsSubBlocks.toJSON(message.blocks)
                : undefined);
        message.script !== undefined &&
            (obj.script = message.script
                ? WsSubScript.toJSON(message.script)
                : undefined);
        return obj;
    },

    create<I extends Exact<DeepPartial<WsSub>, I>>(base?: I): WsSub {
        return WsSub.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<WsSub>, I>>(object: I): WsSub {
        const message = createBaseWsSub();
        message.isUnsub = object.isUnsub ?? false;
        message.blocks =
            object.blocks !== undefined && object.blocks !== null
                ? WsSubBlocks.fromPartial(object.blocks)
                : undefined;
        message.script =
            object.script !== undefined && object.script !== null
                ? WsSubScript.fromPartial(object.script)
                : undefined;
        return message;
    },
};

function createBaseWsSubBlocks(): WsSubBlocks {
    return {};
}

export const WsSubBlocks = {
    encode(
        _: WsSubBlocks,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): WsSubBlocks {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWsSubBlocks();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(_: any): WsSubBlocks {
        return {};
    },

    toJSON(_: WsSubBlocks): unknown {
        const obj: any = {};
        return obj;
    },

    create<I extends Exact<DeepPartial<WsSubBlocks>, I>>(
        base?: I,
    ): WsSubBlocks {
        return WsSubBlocks.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<WsSubBlocks>, I>>(
        _: I,
    ): WsSubBlocks {
        const message = createBaseWsSubBlocks();
        return message;
    },
};

function createBaseWsSubScript(): WsSubScript {
    return { scriptType: '', payload: new Uint8Array() };
}

export const WsSubScript = {
    encode(
        message: WsSubScript,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.scriptType !== '') {
            writer.uint32(10).string(message.scriptType);
        }
        if (message.payload.length !== 0) {
            writer.uint32(18).bytes(message.payload);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): WsSubScript {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWsSubScript();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 10) {
                        break;
                    }

                    message.scriptType = reader.string();
                    continue;
                case 2:
                    if (tag != 18) {
                        break;
                    }

                    message.payload = reader.bytes();
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): WsSubScript {
        return {
            scriptType: isSet(object.scriptType)
                ? String(object.scriptType)
                : '',
            payload: isSet(object.payload)
                ? bytesFromBase64(object.payload)
                : new Uint8Array(),
        };
    },

    toJSON(message: WsSubScript): unknown {
        const obj: any = {};
        message.scriptType !== undefined &&
            (obj.scriptType = message.scriptType);
        message.payload !== undefined &&
            (obj.payload = base64FromBytes(
                message.payload !== undefined
                    ? message.payload
                    : new Uint8Array(),
            ));
        return obj;
    },

    create<I extends Exact<DeepPartial<WsSubScript>, I>>(
        base?: I,
    ): WsSubScript {
        return WsSubScript.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<WsSubScript>, I>>(
        object: I,
    ): WsSubScript {
        const message = createBaseWsSubScript();
        message.scriptType = object.scriptType ?? '';
        message.payload = object.payload ?? new Uint8Array();
        return message;
    },
};

function createBaseWsMsg(): WsMsg {
    return { error: undefined, block: undefined, tx: undefined };
}

export const WsMsg = {
    encode(
        message: WsMsg,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.error !== undefined) {
            Error.encode(message.error, writer.uint32(10).fork()).ldelim();
        }
        if (message.block !== undefined) {
            MsgBlock.encode(message.block, writer.uint32(18).fork()).ldelim();
        }
        if (message.tx !== undefined) {
            MsgTx.encode(message.tx, writer.uint32(26).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): WsMsg {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWsMsg();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 10) {
                        break;
                    }

                    message.error = Error.decode(reader, reader.uint32());
                    continue;
                case 2:
                    if (tag != 18) {
                        break;
                    }

                    message.block = MsgBlock.decode(reader, reader.uint32());
                    continue;
                case 3:
                    if (tag != 26) {
                        break;
                    }

                    message.tx = MsgTx.decode(reader, reader.uint32());
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): WsMsg {
        return {
            error: isSet(object.error)
                ? Error.fromJSON(object.error)
                : undefined,
            block: isSet(object.block)
                ? MsgBlock.fromJSON(object.block)
                : undefined,
            tx: isSet(object.tx) ? MsgTx.fromJSON(object.tx) : undefined,
        };
    },

    toJSON(message: WsMsg): unknown {
        const obj: any = {};
        message.error !== undefined &&
            (obj.error = message.error
                ? Error.toJSON(message.error)
                : undefined);
        message.block !== undefined &&
            (obj.block = message.block
                ? MsgBlock.toJSON(message.block)
                : undefined);
        message.tx !== undefined &&
            (obj.tx = message.tx ? MsgTx.toJSON(message.tx) : undefined);
        return obj;
    },

    create<I extends Exact<DeepPartial<WsMsg>, I>>(base?: I): WsMsg {
        return WsMsg.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<WsMsg>, I>>(object: I): WsMsg {
        const message = createBaseWsMsg();
        message.error =
            object.error !== undefined && object.error !== null
                ? Error.fromPartial(object.error)
                : undefined;
        message.block =
            object.block !== undefined && object.block !== null
                ? MsgBlock.fromPartial(object.block)
                : undefined;
        message.tx =
            object.tx !== undefined && object.tx !== null
                ? MsgTx.fromPartial(object.tx)
                : undefined;
        return message;
    },
};

function createBaseMsgBlock(): MsgBlock {
    return { msgType: 0, blockHash: new Uint8Array(), blockHeight: 0 };
}

export const MsgBlock = {
    encode(
        message: MsgBlock,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.msgType !== 0) {
            writer.uint32(8).int32(message.msgType);
        }
        if (message.blockHash.length !== 0) {
            writer.uint32(18).bytes(message.blockHash);
        }
        if (message.blockHeight !== 0) {
            writer.uint32(24).int32(message.blockHeight);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): MsgBlock {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseMsgBlock();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 8) {
                        break;
                    }

                    message.msgType = reader.int32() as any;
                    continue;
                case 2:
                    if (tag != 18) {
                        break;
                    }

                    message.blockHash = reader.bytes();
                    continue;
                case 3:
                    if (tag != 24) {
                        break;
                    }

                    message.blockHeight = reader.int32();
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): MsgBlock {
        return {
            msgType: isSet(object.msgType)
                ? blockMsgTypeFromJSON(object.msgType)
                : 0,
            blockHash: isSet(object.blockHash)
                ? bytesFromBase64(object.blockHash)
                : new Uint8Array(),
            blockHeight: isSet(object.blockHeight)
                ? Number(object.blockHeight)
                : 0,
        };
    },

    toJSON(message: MsgBlock): unknown {
        const obj: any = {};
        message.msgType !== undefined &&
            (obj.msgType = blockMsgTypeToJSON(message.msgType));
        message.blockHash !== undefined &&
            (obj.blockHash = base64FromBytes(
                message.blockHash !== undefined
                    ? message.blockHash
                    : new Uint8Array(),
            ));
        message.blockHeight !== undefined &&
            (obj.blockHeight = Math.round(message.blockHeight));
        return obj;
    },

    create<I extends Exact<DeepPartial<MsgBlock>, I>>(base?: I): MsgBlock {
        return MsgBlock.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<MsgBlock>, I>>(
        object: I,
    ): MsgBlock {
        const message = createBaseMsgBlock();
        message.msgType = object.msgType ?? 0;
        message.blockHash = object.blockHash ?? new Uint8Array();
        message.blockHeight = object.blockHeight ?? 0;
        return message;
    },
};

function createBaseMsgTx(): MsgTx {
    return { msgType: 0, txid: new Uint8Array() };
}

export const MsgTx = {
    encode(
        message: MsgTx,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.msgType !== 0) {
            writer.uint32(8).int32(message.msgType);
        }
        if (message.txid.length !== 0) {
            writer.uint32(18).bytes(message.txid);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): MsgTx {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseMsgTx();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag != 8) {
                        break;
                    }

                    message.msgType = reader.int32() as any;
                    continue;
                case 2:
                    if (tag != 18) {
                        break;
                    }

                    message.txid = reader.bytes();
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): MsgTx {
        return {
            msgType: isSet(object.msgType)
                ? txMsgTypeFromJSON(object.msgType)
                : 0,
            txid: isSet(object.txid)
                ? bytesFromBase64(object.txid)
                : new Uint8Array(),
        };
    },

    toJSON(message: MsgTx): unknown {
        const obj: any = {};
        message.msgType !== undefined &&
            (obj.msgType = txMsgTypeToJSON(message.msgType));
        message.txid !== undefined &&
            (obj.txid = base64FromBytes(
                message.txid !== undefined ? message.txid : new Uint8Array(),
            ));
        return obj;
    },

    create<I extends Exact<DeepPartial<MsgTx>, I>>(base?: I): MsgTx {
        return MsgTx.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<MsgTx>, I>>(object: I): MsgTx {
        const message = createBaseMsgTx();
        message.msgType = object.msgType ?? 0;
        message.txid = object.txid ?? new Uint8Array();
        return message;
    },
};

function createBaseEmpty(): Empty {
    return {};
}

export const Empty = {
    encode(_: Empty, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): Empty {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseEmpty();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(_: any): Empty {
        return {};
    },

    toJSON(_: Empty): unknown {
        const obj: any = {};
        return obj;
    },

    create<I extends Exact<DeepPartial<Empty>, I>>(base?: I): Empty {
        return Empty.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<Empty>, I>>(_: I): Empty {
        const message = createBaseEmpty();
        return message;
    },
};

function createBaseError(): Error {
    return { msg: '' };
}

export const Error = {
    encode(
        message: Error,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.msg !== '') {
            writer.uint32(18).string(message.msg);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): Error {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseError();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 2:
                    if (tag != 18) {
                        break;
                    }

                    message.msg = reader.string();
                    continue;
            }
            if ((tag & 7) == 4 || tag == 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): Error {
        return { msg: isSet(object.msg) ? String(object.msg) : '' };
    },

    toJSON(message: Error): unknown {
        const obj: any = {};
        message.msg !== undefined && (obj.msg = message.msg);
        return obj;
    },

    create<I extends Exact<DeepPartial<Error>, I>>(base?: I): Error {
        return Error.fromPartial(base ?? {});
    },

    fromPartial<I extends Exact<DeepPartial<Error>, I>>(object: I): Error {
        const message = createBaseError();
        message.msg = object.msg ?? '';
        return message;
    },
};

declare var self: any | undefined;
declare var window: any | undefined;
declare var global: any | undefined;
var tsProtoGlobalThis: any = (() => {
    if (typeof globalThis !== 'undefined') {
        return globalThis;
    }
    if (typeof self !== 'undefined') {
        return self;
    }
    if (typeof window !== 'undefined') {
        return window;
    }
    if (typeof global !== 'undefined') {
        return global;
    }
    throw 'Unable to locate global object';
})();

function bytesFromBase64(b64: string): Uint8Array {
    if (tsProtoGlobalThis.Buffer) {
        return Uint8Array.from(tsProtoGlobalThis.Buffer.from(b64, 'base64'));
    } else {
        const bin = tsProtoGlobalThis.atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; ++i) {
            arr[i] = bin.charCodeAt(i);
        }
        return arr;
    }
}

function base64FromBytes(arr: Uint8Array): string {
    if (tsProtoGlobalThis.Buffer) {
        return tsProtoGlobalThis.Buffer.from(arr).toString('base64');
    } else {
        const bin: string[] = [];
        arr.forEach(byte => {
            bin.push(String.fromCharCode(byte));
        });
        return tsProtoGlobalThis.btoa(bin.join(''));
    }
}

type Builtin =
    | Date
    | Function
    | Uint8Array
    | string
    | number
    | boolean
    | undefined;

export type DeepPartial<T> = T extends Builtin
    ? T
    : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T extends {}
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin
    ? P
    : P & { [K in keyof P]: Exact<P[K], I[K]> } & {
          [K in Exclude<keyof I, KeysOfUnion<P>>]: never;
      };

function longToString(long: Long) {
    return long.toString();
}

if (_m0.util.Long !== Long) {
    _m0.util.Long = Long as any;
    _m0.configure();
}

function isSet(value: any): boolean {
    return value !== null && value !== undefined;
}
