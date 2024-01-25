import * as proto from '../proto/chronikNode';
import { BlockchainInfo, OutPoint } from './ChronikClient';
import { FailoverProxy } from './failoverProxy';
import { toHex, toHexRev } from './hex';

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

    /** Fetch tx details given the txid. */
    public async tx(txid: string): Promise<Tx_InNode> {
        const data = await this._proxyInterface.get(`/tx/${txid}`);
        const tx = proto.Tx.decode(data);
        return convertToTx(tx);
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
    return {
        txid: toHexRev(tx.txid),
        version: tx.version,
        inputs: tx.inputs.map(convertToTxInput),
        outputs: tx.outputs.map(convertToTxOutput),
        lockTime: tx.lockTime,
        block:
            tx.block !== undefined ? convertToBlockMeta(tx.block) : undefined,
        timeFirstSeen: parseInt(tx.timeFirstSeen),
        size: tx.size,
        isCoinbase: tx.isCoinbase,
    };
}

function convertToTxInput(input: proto.TxInput): TxInput_InNode {
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
        value: parseInt(input.value),
        sequenceNo: input.sequenceNo,
    };
}

function convertToTxOutput(output: proto.TxOutput): TxOutput_InNode {
    return {
        value: parseInt(output.value),
        outputScript: toHex(output.outputScript),
        spentBy:
            output.spentBy !== undefined
                ? {
                      txid: toHexRev(output.spentBy.txid),
                      outIdx: output.spentBy.inputIdx,
                  }
                : undefined,
    };
}

function convertToBlockMeta(block: proto.BlockMetadata): BlockMetadata_InNode {
    return {
        height: block.height,
        hash: toHexRev(block.hash),
        timestamp: parseInt(block.timestamp),
    };
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
    /** Block data for this tx, or undefined if not mined yet. */
    block: BlockMetadata_InNode | undefined;
    /**
     * UNIX timestamp when this tx has first been seen in the mempool.
     * 0 if unknown -> make sure to check.
     */
    timeFirstSeen: number;
    /** Serialized size of the tx. */
    size: number;
    /** Whether this tx is a coinbase tx. */
    isCoinbase: boolean;
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
     */
    outputScript: string | undefined;
    /** Value of the output spent by this input, in satoshis. */
    value: number;
    /** `sequence` field of the input; can be used for relative time locking. */
    sequenceNo: number;
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
     * Transaction & input index spending this output, or undefined if
     * unspent.
     */
    spentBy: OutPoint | undefined;
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
