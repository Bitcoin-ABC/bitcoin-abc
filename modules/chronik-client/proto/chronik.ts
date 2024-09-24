/* eslint-disable */
import Long from 'long';
import _m0 from 'protobufjs/minimal';

export const protobufPackage = 'chronik';

/** Status of a token tx */
export enum TokenStatus {
    /**
     * TOKEN_STATUS_NON_TOKEN - Tx involves no tokens whatsover, i.e. neither any burns nor any failed
     * parsing/coloring or any tokens being created / moved.
     */
    TOKEN_STATUS_NON_TOKEN = 0,
    /** TOKEN_STATUS_NORMAL - Tx involves tokens but no unintentional burns or failed parsings/colorings */
    TOKEN_STATUS_NORMAL = 1,
    /** TOKEN_STATUS_NOT_NORMAL - Tx involves tokens but contains unintentional burns or failed parsings/colorings */
    TOKEN_STATUS_NOT_NORMAL = 2,
    UNRECOGNIZED = -1,
}

export function tokenStatusFromJSON(object: any): TokenStatus {
    switch (object) {
        case 0:
        case 'TOKEN_STATUS_NON_TOKEN':
            return TokenStatus.TOKEN_STATUS_NON_TOKEN;
        case 1:
        case 'TOKEN_STATUS_NORMAL':
            return TokenStatus.TOKEN_STATUS_NORMAL;
        case 2:
        case 'TOKEN_STATUS_NOT_NORMAL':
            return TokenStatus.TOKEN_STATUS_NOT_NORMAL;
        case -1:
        case 'UNRECOGNIZED':
        default:
            return TokenStatus.UNRECOGNIZED;
    }
}

export function tokenStatusToJSON(object: TokenStatus): string {
    switch (object) {
        case TokenStatus.TOKEN_STATUS_NON_TOKEN:
            return 'TOKEN_STATUS_NON_TOKEN';
        case TokenStatus.TOKEN_STATUS_NORMAL:
            return 'TOKEN_STATUS_NORMAL';
        case TokenStatus.TOKEN_STATUS_NOT_NORMAL:
            return 'TOKEN_STATUS_NOT_NORMAL';
        case TokenStatus.UNRECOGNIZED:
        default:
            return 'UNRECOGNIZED';
    }
}

/** ALP token type */
export enum AlpTokenType {
    /** ALP_TOKEN_TYPE_STANDARD - Standard ALP token type */
    ALP_TOKEN_TYPE_STANDARD = 0,
    UNRECOGNIZED = -1,
}

export function alpTokenTypeFromJSON(object: any): AlpTokenType {
    switch (object) {
        case 0:
        case 'ALP_TOKEN_TYPE_STANDARD':
            return AlpTokenType.ALP_TOKEN_TYPE_STANDARD;
        case -1:
        case 'UNRECOGNIZED':
        default:
            return AlpTokenType.UNRECOGNIZED;
    }
}

export function alpTokenTypeToJSON(object: AlpTokenType): string {
    switch (object) {
        case AlpTokenType.ALP_TOKEN_TYPE_STANDARD:
            return 'ALP_TOKEN_TYPE_STANDARD';
        case AlpTokenType.UNRECOGNIZED:
        default:
            return 'UNRECOGNIZED';
    }
}

/** SLP token type */
export enum SlpTokenType {
    /** SLP_TOKEN_TYPE_NONE - Unknown "0" token type */
    SLP_TOKEN_TYPE_NONE = 0,
    /** SLP_TOKEN_TYPE_FUNGIBLE - SLP V1 token type */
    SLP_TOKEN_TYPE_FUNGIBLE = 1,
    /** SLP_TOKEN_TYPE_MINT_VAULT - SLP V2 mint vault token type */
    SLP_TOKEN_TYPE_MINT_VAULT = 2,
    /** SLP_TOKEN_TYPE_NFT1_GROUP - NFT1 group token type */
    SLP_TOKEN_TYPE_NFT1_GROUP = 129,
    /** SLP_TOKEN_TYPE_NFT1_CHILD - NFT1 child token type */
    SLP_TOKEN_TYPE_NFT1_CHILD = 65,
    UNRECOGNIZED = -1,
}

export function slpTokenTypeFromJSON(object: any): SlpTokenType {
    switch (object) {
        case 0:
        case 'SLP_TOKEN_TYPE_NONE':
            return SlpTokenType.SLP_TOKEN_TYPE_NONE;
        case 1:
        case 'SLP_TOKEN_TYPE_FUNGIBLE':
            return SlpTokenType.SLP_TOKEN_TYPE_FUNGIBLE;
        case 2:
        case 'SLP_TOKEN_TYPE_MINT_VAULT':
            return SlpTokenType.SLP_TOKEN_TYPE_MINT_VAULT;
        case 129:
        case 'SLP_TOKEN_TYPE_NFT1_GROUP':
            return SlpTokenType.SLP_TOKEN_TYPE_NFT1_GROUP;
        case 65:
        case 'SLP_TOKEN_TYPE_NFT1_CHILD':
            return SlpTokenType.SLP_TOKEN_TYPE_NFT1_CHILD;
        case -1:
        case 'UNRECOGNIZED':
        default:
            return SlpTokenType.UNRECOGNIZED;
    }
}

export function slpTokenTypeToJSON(object: SlpTokenType): string {
    switch (object) {
        case SlpTokenType.SLP_TOKEN_TYPE_NONE:
            return 'SLP_TOKEN_TYPE_NONE';
        case SlpTokenType.SLP_TOKEN_TYPE_FUNGIBLE:
            return 'SLP_TOKEN_TYPE_FUNGIBLE';
        case SlpTokenType.SLP_TOKEN_TYPE_MINT_VAULT:
            return 'SLP_TOKEN_TYPE_MINT_VAULT';
        case SlpTokenType.SLP_TOKEN_TYPE_NFT1_GROUP:
            return 'SLP_TOKEN_TYPE_NFT1_GROUP';
        case SlpTokenType.SLP_TOKEN_TYPE_NFT1_CHILD:
            return 'SLP_TOKEN_TYPE_NFT1_CHILD';
        case SlpTokenType.UNRECOGNIZED:
        default:
            return 'UNRECOGNIZED';
    }
}

/** SLP/ALP tx type */
export enum TokenTxType {
    /** NONE - No tx type, e.g. when input tokens are burned */
    NONE = 0,
    /** UNKNOWN - Unknown tx type, i.e. for unknown token types */
    UNKNOWN = 1,
    /** GENESIS - GENESIS tx */
    GENESIS = 2,
    /** SEND - SEND tx */
    SEND = 3,
    /** MINT - MINT tx */
    MINT = 4,
    /** BURN - BURN tx */
    BURN = 5,
    UNRECOGNIZED = -1,
}

export function tokenTxTypeFromJSON(object: any): TokenTxType {
    switch (object) {
        case 0:
        case 'NONE':
            return TokenTxType.NONE;
        case 1:
        case 'UNKNOWN':
            return TokenTxType.UNKNOWN;
        case 2:
        case 'GENESIS':
            return TokenTxType.GENESIS;
        case 3:
        case 'SEND':
            return TokenTxType.SEND;
        case 4:
        case 'MINT':
            return TokenTxType.MINT;
        case 5:
        case 'BURN':
            return TokenTxType.BURN;
        case -1:
        case 'UNRECOGNIZED':
        default:
            return TokenTxType.UNRECOGNIZED;
    }
}

export function tokenTxTypeToJSON(object: TokenTxType): string {
    switch (object) {
        case TokenTxType.NONE:
            return 'NONE';
        case TokenTxType.UNKNOWN:
            return 'UNKNOWN';
        case TokenTxType.GENESIS:
            return 'GENESIS';
        case TokenTxType.SEND:
            return 'SEND';
        case TokenTxType.MINT:
            return 'MINT';
        case TokenTxType.BURN:
            return 'BURN';
        case TokenTxType.UNRECOGNIZED:
        default:
            return 'UNRECOGNIZED';
    }
}

/** Type of message for the block */
export enum BlockMsgType {
    /** BLK_CONNECTED - Block connected to the blockchain */
    BLK_CONNECTED = 0,
    /** BLK_DISCONNECTED - Block disconnected from the blockchain */
    BLK_DISCONNECTED = 1,
    /** BLK_FINALIZED - Block has been finalized by Avalanche */
    BLK_FINALIZED = 2,
    /** BLK_INVALIDATED - Block has been invalidated by Avalanche */
    BLK_INVALIDATED = 3,
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
        case 3:
        case 'BLK_INVALIDATED':
            return BlockMsgType.BLK_INVALIDATED;
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
        case BlockMsgType.BLK_INVALIDATED:
            return 'BLK_INVALIDATED';
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

/** Header on the blockchain */
export interface BlockHeader {
    /** Raw data */
    rawHeader: Uint8Array;
    /** Merkle root */
    root: Uint8Array;
    /** Merkle branch of header up to root, deepest pairing first */
    branch: Uint8Array[];
}

/** Range of headers */
export interface BlockHeaders {
    /** Queried headers */
    headers: BlockHeader[];
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
    /** Token value attached to this UTXO */
    token: Token | undefined;
    /** Data attached to this output by plugins */
    plugins: { [key: string]: PluginEntry };
}

export interface ScriptUtxo_PluginsEntry {
    key: string;
    value: PluginEntry | undefined;
}

/** UTXO, but with a script attached. */
export interface Utxo {
    /** txid and out_idx of the unspent output. */
    outpoint: OutPoint | undefined;
    /** Block height of the UTXO, or -1 if in mempool. */
    blockHeight: number;
    /** Whether the UTXO has been created in a coinbase tx. */
    isCoinbase: boolean;
    /** Value of the output, in satoshis. */
    value: string;
    /** Bytecode of the script of the output */
    script: Uint8Array;
    /** Whether the UTXO has been finalized by Avalanche. */
    isFinal: boolean;
    /** Token value attached to this UTXO */
    token: Token | undefined;
    /** Data attached to this output by plugins */
    plugins: { [key: string]: PluginEntry };
}

export interface Utxo_PluginsEntry {
    key: string;
    value: PluginEntry | undefined;
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
    /** Token value attached to this input */
    token: Token | undefined;
    /** Data attached to this output by plugins */
    plugins: { [key: string]: PluginEntry };
}

export interface TxInput_PluginsEntry {
    key: string;
    value: PluginEntry | undefined;
}

/** CTxOut, creates a new coin. */
export interface TxOutput {
    /** Value of the coin, in satoshis. */
    value: string;
    /** scriptPubKey, script locking the output. */
    outputScript: Uint8Array;
    /** Which tx and input spent this output, if any. */
    spentBy: SpentBy | undefined;
    /** Token value attached to this output */
    token: Token | undefined;
    /** Data attached to this output by plugins */
    plugins: { [key: string]: PluginEntry };
}

export interface TxOutput_PluginsEntry {
    key: string;
    value: PluginEntry | undefined;
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

/** SLP/ALP token type */
export interface TokenType {
    /** SLP token type. Can have unknown values for unknown token types */
    slp?: SlpTokenType | undefined;
    /** ALP token type. Can have unknown values for unknown token types */
    alp?: AlpTokenType | undefined;
}

/** Info about a token */
export interface TokenInfo {
    /**
     * Hex token_id (in big-endian, like usually displayed to users) of the token.
     * This is not `bytes` because SLP and ALP use different endiannnes, so to avoid this we use hex, which conventionally implies big-endian in a bitcoin context.
     */
    tokenId: string;
    /** Token type of the token */
    tokenType: TokenType | undefined;
    /** Info found in the token's GENESIS tx */
    genesisInfo: GenesisInfo | undefined;
    /** Block of the GENESIS tx, if it's mined already */
    block: BlockMetadata | undefined;
    /** Time the GENESIS tx has first been seen by the indexer */
    timeFirstSeen: string;
}

/** Token involved in a transaction */
export interface TokenEntry {
    /**
     * Hex token_id (in big-endian, like usually displayed to users) of the token.
     * This is not `bytes` because SLP and ALP use different endiannes, so to avoid
     * this we use hex, which conventionally implies big-endian in a bitcoin context.
     */
    tokenId: string;
    /** Token type of the token */
    tokenType: TokenType | undefined;
    /** Tx type of the token; NONE if there's no section that introduced it (e.g. in an accidental burn) */
    txType: TokenTxType;
    /** For NFT1 Child tokens: group ID */
    groupTokenId: string;
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
    /** Burn amount the user explicitly opted into */
    intentionalBurn: string;
    /** Whether any mint batons have been burned of this token */
    burnsMintBatons: boolean;
}

/** Genesis info found in GENESIS txs of tokens */
export interface GenesisInfo {
    /** token_ticker of the token */
    tokenTicker: Uint8Array;
    /** token_name of the token */
    tokenName: Uint8Array;
    /** URL of the token */
    url: Uint8Array;
    /** token_document_hash of the token (only on SLP) */
    hash: Uint8Array;
    /** mint_vault_scripthash (only on SLP V2 Mint Vault) */
    mintVaultScripthash: Uint8Array;
    /** Arbitray payload data of the token (only on ALP) */
    data: Uint8Array;
    /** auth_pubkey of the token (only on ALP) */
    authPubkey: Uint8Array;
    /** decimals of the token, i.e. how many decimal places the token should be displayed with. */
    decimals: number;
}

/** Token coloring an input or output */
export interface Token {
    /** Hex token_id of the token, see `TokenInfo` for details */
    tokenId: string;
    /** Token type of the token */
    tokenType: TokenType | undefined;
    /** Index into `token_entries` for `Tx`. -1 for UTXOs */
    entryIdx: number;
    /** Base token amount of the input/output */
    amount: string;
    /** Whether the token is a mint baton */
    isMintBaton: boolean;
}

/**
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
    bytes: Uint8Array;
    /** Human-readable message of what went wrong */
    error: string;
}

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

/** Data attached by a plugin to an output */
export interface PluginEntry {
    /** Groups assigned to this output */
    groups: Uint8Array[];
    /** Data assigned to the output */
    data: Uint8Array[];
}

/** Data about a plugin group */
export interface PluginGroup {
    /** Group bytes */
    group: Uint8Array;
}

/** List of plugin groups */
export interface PluginGroups {
    /** Groups */
    groups: PluginGroup[];
    /**
     * Group that if specified as `start` will give us the next groups,
     * or empty if groups have been exausted.
     */
    nextStart: Uint8Array;
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

/** List of UTXOs */
export interface Utxos {
    /** UTXOs */
    utxos: Utxo[];
}

/** Broadcast a single tx */
export interface BroadcastTxRequest {
    /** Serialized tx */
    rawTx: Uint8Array;
    /** Whether to skip token checks and broadcast even if tokens are unintentionally burned */
    skipTokenChecks: boolean;
}

/** Response of broadcasting the tx */
export interface BroadcastTxResponse {
    /** TxId of the broadcast tx */
    txid: Uint8Array;
}

/** Broadcast multiple txs. If one of the txs fails token validation, the entire batch will not be broadcast. */
export interface BroadcastTxsRequest {
    /** Serialized txs. */
    rawTxs: Uint8Array[];
    /** Whether to skip token checks and broadcast even if tokens are unintentionally burned */
    skipTokenChecks: boolean;
}

/** Response of broadcasting txs */
export interface BroadcastTxsResponse {
    /** TxIds of the broadcast txs */
    txids: Uint8Array[];
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
    /** Subscription to a token ID */
    tokenId?: WsSubTokenId | undefined;
    /** Subscription to a lokad ID */
    lokadId?: WsSubLokadId | undefined;
    /** Subscription to a plugin group */
    plugin?: WsPlugin | undefined;
}

/**
 * Subscription to blocks. They will be sent any time a block got connected,
 * disconnected or finalized.
 */
export interface WsSubBlocks {}

/**
 * Subscription to a script. They will be sent every time a tx spending the
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

/**
 * Subscription to a token ID. They will be sent every time a tx spending or
 * sending tokens with the token ID.
 */
export interface WsSubTokenId {
    /** Hex token ID to subscribe to. */
    tokenId: string;
}

/**
 * Subscription to a LOKAD ID. They will be sent every time a tx matches the given LOKAD ID in one of the following ways:
 * - `OP_RETURN <LOKAD ID> ...`: The first output has an OP_RETURN with the given LOKAD ID as first pushop
 * - `OP_RETURN OP_RESERVED "<LOKAD_ID>..." "<LOKAD_ID>..." ...`: The first output has an eMPP encoded OP_RETURN, and one (or more) of the pushops has the LOKAD ID as prefix.
 * - `<LOKAD ID> ...`: An input's scriptSig has the given LOKAD ID as the first pushop
 */
export interface WsSubLokadId {
    /** 4-byte LOKAD ID. */
    lokadId: Uint8Array;
}

/** Subscription to a group assigned by a plugin to outputs. */
export interface WsPlugin {
    /** Name of the plugin to subscribe to */
    pluginName: string;
    /** Group assigned by the plugin to subscribe to */
    group: Uint8Array;
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

/** The relevant coinbase data */
export interface CoinbaseData {
    /** The coinbase input scriptsig */
    coinbaseScriptsig: Uint8Array;
    /** Outputs of the coinbase tx */
    coinbaseOutputs: TxOutput[];
}

/** Block got connected, disconnected, finalized, invalidated, etc. */
export interface MsgBlock {
    /** What happened to the block */
    msgType: BlockMsgType;
    /** Hash of the block (little-endian) */
    blockHash: Uint8Array;
    /** Height of the block */
    blockHeight: number;
    /** Timestamp field of the block */
    blockTimestamp: string;
    /**
     * The coinbase data, only available of the block is disconnected or
     * invalidated
     */
    coinbaseData: CoinbaseData | undefined;
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
                    if (tag !== 10) {
                        break;
                    }

                    message.blockInfo = BlockInfo.decode(
                        reader,
                        reader.uint32(),
                    );
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
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
        if (message.blockInfo !== undefined) {
            obj.blockInfo = BlockInfo.toJSON(message.blockInfo);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<Block>, I>>(base?: I): Block {
        return Block.fromPartial(base ?? ({} as any));
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
                    if (tag !== 10) {
                        break;
                    }

                    message.blocks.push(
                        BlockInfo.decode(reader, reader.uint32()),
                    );
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): Blocks {
        return {
            blocks: globalThis.Array.isArray(object?.blocks)
                ? object.blocks.map((e: any) => BlockInfo.fromJSON(e))
                : [],
        };
    },

    toJSON(message: Blocks): unknown {
        const obj: any = {};
        if (message.blocks?.length) {
            obj.blocks = message.blocks.map(e => BlockInfo.toJSON(e));
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<Blocks>, I>>(base?: I): Blocks {
        return Blocks.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<Blocks>, I>>(object: I): Blocks {
        const message = createBaseBlocks();
        message.blocks =
            object.blocks?.map(e => BlockInfo.fromPartial(e)) || [];
        return message;
    },
};

function createBaseBlockHeader(): BlockHeader {
    return {
        rawHeader: new Uint8Array(0),
        root: new Uint8Array(0),
        branch: [],
    };
}

export const BlockHeader = {
    encode(
        message: BlockHeader,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.rawHeader.length !== 0) {
            writer.uint32(10).bytes(message.rawHeader);
        }
        if (message.root.length !== 0) {
            writer.uint32(18).bytes(message.root);
        }
        for (const v of message.branch) {
            writer.uint32(26).bytes(v!);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): BlockHeader {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBlockHeader();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.rawHeader = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.root = reader.bytes();
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }

                    message.branch.push(reader.bytes());
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): BlockHeader {
        return {
            rawHeader: isSet(object.rawHeader)
                ? bytesFromBase64(object.rawHeader)
                : new Uint8Array(0),
            root: isSet(object.root)
                ? bytesFromBase64(object.root)
                : new Uint8Array(0),
            branch: globalThis.Array.isArray(object?.branch)
                ? object.branch.map((e: any) => bytesFromBase64(e))
                : [],
        };
    },

    toJSON(message: BlockHeader): unknown {
        const obj: any = {};
        if (message.rawHeader.length !== 0) {
            obj.rawHeader = base64FromBytes(message.rawHeader);
        }
        if (message.root.length !== 0) {
            obj.root = base64FromBytes(message.root);
        }
        if (message.branch?.length) {
            obj.branch = message.branch.map(e => base64FromBytes(e));
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<BlockHeader>, I>>(
        base?: I,
    ): BlockHeader {
        return BlockHeader.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<BlockHeader>, I>>(
        object: I,
    ): BlockHeader {
        const message = createBaseBlockHeader();
        message.rawHeader = object.rawHeader ?? new Uint8Array(0);
        message.root = object.root ?? new Uint8Array(0);
        message.branch = object.branch?.map(e => e) || [];
        return message;
    },
};

function createBaseBlockHeaders(): BlockHeaders {
    return { headers: [] };
}

export const BlockHeaders = {
    encode(
        message: BlockHeaders,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        for (const v of message.headers) {
            BlockHeader.encode(v!, writer.uint32(10).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): BlockHeaders {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBlockHeaders();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.headers.push(
                        BlockHeader.decode(reader, reader.uint32()),
                    );
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): BlockHeaders {
        return {
            headers: globalThis.Array.isArray(object?.headers)
                ? object.headers.map((e: any) => BlockHeader.fromJSON(e))
                : [],
        };
    },

    toJSON(message: BlockHeaders): unknown {
        const obj: any = {};
        if (message.headers?.length) {
            obj.headers = message.headers.map(e => BlockHeader.toJSON(e));
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<BlockHeaders>, I>>(
        base?: I,
    ): BlockHeaders {
        return BlockHeaders.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<BlockHeaders>, I>>(
        object: I,
    ): BlockHeaders {
        const message = createBaseBlockHeaders();
        message.headers =
            object.headers?.map(e => BlockHeader.fromPartial(e)) || [];
        return message;
    },
};

function createBaseBlockchainInfo(): BlockchainInfo {
    return { tipHash: new Uint8Array(0), tipHeight: 0 };
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
                    if (tag !== 10) {
                        break;
                    }

                    message.tipHash = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 16) {
                        break;
                    }

                    message.tipHeight = reader.int32();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
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
                : new Uint8Array(0),
            tipHeight: isSet(object.tipHeight)
                ? globalThis.Number(object.tipHeight)
                : 0,
        };
    },

    toJSON(message: BlockchainInfo): unknown {
        const obj: any = {};
        if (message.tipHash.length !== 0) {
            obj.tipHash = base64FromBytes(message.tipHash);
        }
        if (message.tipHeight !== 0) {
            obj.tipHeight = Math.round(message.tipHeight);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<BlockchainInfo>, I>>(
        base?: I,
    ): BlockchainInfo {
        return BlockchainInfo.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<BlockchainInfo>, I>>(
        object: I,
    ): BlockchainInfo {
        const message = createBaseBlockchainInfo();
        message.tipHash = object.tipHash ?? new Uint8Array(0);
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
                    if (tag !== 10) {
                        break;
                    }

                    message.version = reader.string();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): ChronikInfo {
        return {
            version: isSet(object.version)
                ? globalThis.String(object.version)
                : '',
        };
    },

    toJSON(message: ChronikInfo): unknown {
        const obj: any = {};
        if (message.version !== '') {
            obj.version = message.version;
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<ChronikInfo>, I>>(
        base?: I,
    ): ChronikInfo {
        return ChronikInfo.fromPartial(base ?? ({} as any));
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
        hash: new Uint8Array(0),
        prevHash: new Uint8Array(0),
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
                    if (tag !== 10) {
                        break;
                    }

                    message.hash = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.prevHash = reader.bytes();
                    continue;
                case 3:
                    if (tag !== 24) {
                        break;
                    }

                    message.height = reader.int32();
                    continue;
                case 4:
                    if (tag !== 32) {
                        break;
                    }

                    message.nBits = reader.uint32();
                    continue;
                case 5:
                    if (tag !== 40) {
                        break;
                    }

                    message.timestamp = longToString(reader.int64() as Long);
                    continue;
                case 14:
                    if (tag !== 112) {
                        break;
                    }

                    message.isFinal = reader.bool();
                    continue;
                case 6:
                    if (tag !== 48) {
                        break;
                    }

                    message.blockSize = longToString(reader.uint64() as Long);
                    continue;
                case 7:
                    if (tag !== 56) {
                        break;
                    }

                    message.numTxs = longToString(reader.uint64() as Long);
                    continue;
                case 8:
                    if (tag !== 64) {
                        break;
                    }

                    message.numInputs = longToString(reader.uint64() as Long);
                    continue;
                case 9:
                    if (tag !== 72) {
                        break;
                    }

                    message.numOutputs = longToString(reader.uint64() as Long);
                    continue;
                case 10:
                    if (tag !== 80) {
                        break;
                    }

                    message.sumInputSats = longToString(reader.int64() as Long);
                    continue;
                case 11:
                    if (tag !== 88) {
                        break;
                    }

                    message.sumCoinbaseOutputSats = longToString(
                        reader.int64() as Long,
                    );
                    continue;
                case 12:
                    if (tag !== 96) {
                        break;
                    }

                    message.sumNormalOutputSats = longToString(
                        reader.int64() as Long,
                    );
                    continue;
                case 13:
                    if (tag !== 104) {
                        break;
                    }

                    message.sumBurnedSats = longToString(
                        reader.int64() as Long,
                    );
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
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
                : new Uint8Array(0),
            prevHash: isSet(object.prevHash)
                ? bytesFromBase64(object.prevHash)
                : new Uint8Array(0),
            height: isSet(object.height) ? globalThis.Number(object.height) : 0,
            nBits: isSet(object.nBits) ? globalThis.Number(object.nBits) : 0,
            timestamp: isSet(object.timestamp)
                ? globalThis.String(object.timestamp)
                : '0',
            isFinal: isSet(object.isFinal)
                ? globalThis.Boolean(object.isFinal)
                : false,
            blockSize: isSet(object.blockSize)
                ? globalThis.String(object.blockSize)
                : '0',
            numTxs: isSet(object.numTxs)
                ? globalThis.String(object.numTxs)
                : '0',
            numInputs: isSet(object.numInputs)
                ? globalThis.String(object.numInputs)
                : '0',
            numOutputs: isSet(object.numOutputs)
                ? globalThis.String(object.numOutputs)
                : '0',
            sumInputSats: isSet(object.sumInputSats)
                ? globalThis.String(object.sumInputSats)
                : '0',
            sumCoinbaseOutputSats: isSet(object.sumCoinbaseOutputSats)
                ? globalThis.String(object.sumCoinbaseOutputSats)
                : '0',
            sumNormalOutputSats: isSet(object.sumNormalOutputSats)
                ? globalThis.String(object.sumNormalOutputSats)
                : '0',
            sumBurnedSats: isSet(object.sumBurnedSats)
                ? globalThis.String(object.sumBurnedSats)
                : '0',
        };
    },

    toJSON(message: BlockInfo): unknown {
        const obj: any = {};
        if (message.hash.length !== 0) {
            obj.hash = base64FromBytes(message.hash);
        }
        if (message.prevHash.length !== 0) {
            obj.prevHash = base64FromBytes(message.prevHash);
        }
        if (message.height !== 0) {
            obj.height = Math.round(message.height);
        }
        if (message.nBits !== 0) {
            obj.nBits = Math.round(message.nBits);
        }
        if (message.timestamp !== '0') {
            obj.timestamp = message.timestamp;
        }
        if (message.isFinal === true) {
            obj.isFinal = message.isFinal;
        }
        if (message.blockSize !== '0') {
            obj.blockSize = message.blockSize;
        }
        if (message.numTxs !== '0') {
            obj.numTxs = message.numTxs;
        }
        if (message.numInputs !== '0') {
            obj.numInputs = message.numInputs;
        }
        if (message.numOutputs !== '0') {
            obj.numOutputs = message.numOutputs;
        }
        if (message.sumInputSats !== '0') {
            obj.sumInputSats = message.sumInputSats;
        }
        if (message.sumCoinbaseOutputSats !== '0') {
            obj.sumCoinbaseOutputSats = message.sumCoinbaseOutputSats;
        }
        if (message.sumNormalOutputSats !== '0') {
            obj.sumNormalOutputSats = message.sumNormalOutputSats;
        }
        if (message.sumBurnedSats !== '0') {
            obj.sumBurnedSats = message.sumBurnedSats;
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<BlockInfo>, I>>(base?: I): BlockInfo {
        return BlockInfo.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<BlockInfo>, I>>(
        object: I,
    ): BlockInfo {
        const message = createBaseBlockInfo();
        message.hash = object.hash ?? new Uint8Array(0);
        message.prevHash = object.prevHash ?? new Uint8Array(0);
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
        txid: new Uint8Array(0),
        version: 0,
        inputs: [],
        outputs: [],
        lockTime: 0,
        block: undefined,
        timeFirstSeen: '0',
        size: 0,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 0,
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
        for (const v of message.tokenEntries) {
            TokenEntry.encode(v!, writer.uint32(106).fork()).ldelim();
        }
        for (const v of message.tokenFailedParsings) {
            TokenFailedParsing.encode(v!, writer.uint32(114).fork()).ldelim();
        }
        if (message.tokenStatus !== 0) {
            writer.uint32(120).int32(message.tokenStatus);
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
                    if (tag !== 10) {
                        break;
                    }

                    message.txid = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 16) {
                        break;
                    }

                    message.version = reader.int32();
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }

                    message.inputs.push(
                        TxInput.decode(reader, reader.uint32()),
                    );
                    continue;
                case 4:
                    if (tag !== 34) {
                        break;
                    }

                    message.outputs.push(
                        TxOutput.decode(reader, reader.uint32()),
                    );
                    continue;
                case 5:
                    if (tag !== 40) {
                        break;
                    }

                    message.lockTime = reader.uint32();
                    continue;
                case 8:
                    if (tag !== 66) {
                        break;
                    }

                    message.block = BlockMetadata.decode(
                        reader,
                        reader.uint32(),
                    );
                    continue;
                case 9:
                    if (tag !== 72) {
                        break;
                    }

                    message.timeFirstSeen = longToString(
                        reader.int64() as Long,
                    );
                    continue;
                case 11:
                    if (tag !== 88) {
                        break;
                    }

                    message.size = reader.uint32();
                    continue;
                case 12:
                    if (tag !== 96) {
                        break;
                    }

                    message.isCoinbase = reader.bool();
                    continue;
                case 13:
                    if (tag !== 106) {
                        break;
                    }

                    message.tokenEntries.push(
                        TokenEntry.decode(reader, reader.uint32()),
                    );
                    continue;
                case 14:
                    if (tag !== 114) {
                        break;
                    }

                    message.tokenFailedParsings.push(
                        TokenFailedParsing.decode(reader, reader.uint32()),
                    );
                    continue;
                case 15:
                    if (tag !== 120) {
                        break;
                    }

                    message.tokenStatus = reader.int32() as any;
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
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
                : new Uint8Array(0),
            version: isSet(object.version)
                ? globalThis.Number(object.version)
                : 0,
            inputs: globalThis.Array.isArray(object?.inputs)
                ? object.inputs.map((e: any) => TxInput.fromJSON(e))
                : [],
            outputs: globalThis.Array.isArray(object?.outputs)
                ? object.outputs.map((e: any) => TxOutput.fromJSON(e))
                : [],
            lockTime: isSet(object.lockTime)
                ? globalThis.Number(object.lockTime)
                : 0,
            block: isSet(object.block)
                ? BlockMetadata.fromJSON(object.block)
                : undefined,
            timeFirstSeen: isSet(object.timeFirstSeen)
                ? globalThis.String(object.timeFirstSeen)
                : '0',
            size: isSet(object.size) ? globalThis.Number(object.size) : 0,
            isCoinbase: isSet(object.isCoinbase)
                ? globalThis.Boolean(object.isCoinbase)
                : false,
            tokenEntries: globalThis.Array.isArray(object?.tokenEntries)
                ? object.tokenEntries.map((e: any) => TokenEntry.fromJSON(e))
                : [],
            tokenFailedParsings: globalThis.Array.isArray(
                object?.tokenFailedParsings,
            )
                ? object.tokenFailedParsings.map((e: any) =>
                      TokenFailedParsing.fromJSON(e),
                  )
                : [],
            tokenStatus: isSet(object.tokenStatus)
                ? tokenStatusFromJSON(object.tokenStatus)
                : 0,
        };
    },

    toJSON(message: Tx): unknown {
        const obj: any = {};
        if (message.txid.length !== 0) {
            obj.txid = base64FromBytes(message.txid);
        }
        if (message.version !== 0) {
            obj.version = Math.round(message.version);
        }
        if (message.inputs?.length) {
            obj.inputs = message.inputs.map(e => TxInput.toJSON(e));
        }
        if (message.outputs?.length) {
            obj.outputs = message.outputs.map(e => TxOutput.toJSON(e));
        }
        if (message.lockTime !== 0) {
            obj.lockTime = Math.round(message.lockTime);
        }
        if (message.block !== undefined) {
            obj.block = BlockMetadata.toJSON(message.block);
        }
        if (message.timeFirstSeen !== '0') {
            obj.timeFirstSeen = message.timeFirstSeen;
        }
        if (message.size !== 0) {
            obj.size = Math.round(message.size);
        }
        if (message.isCoinbase === true) {
            obj.isCoinbase = message.isCoinbase;
        }
        if (message.tokenEntries?.length) {
            obj.tokenEntries = message.tokenEntries.map(e =>
                TokenEntry.toJSON(e),
            );
        }
        if (message.tokenFailedParsings?.length) {
            obj.tokenFailedParsings = message.tokenFailedParsings.map(e =>
                TokenFailedParsing.toJSON(e),
            );
        }
        if (message.tokenStatus !== 0) {
            obj.tokenStatus = tokenStatusToJSON(message.tokenStatus);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<Tx>, I>>(base?: I): Tx {
        return Tx.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<Tx>, I>>(object: I): Tx {
        const message = createBaseTx();
        message.txid = object.txid ?? new Uint8Array(0);
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
        message.tokenEntries =
            object.tokenEntries?.map(e => TokenEntry.fromPartial(e)) || [];
        message.tokenFailedParsings =
            object.tokenFailedParsings?.map(e =>
                TokenFailedParsing.fromPartial(e),
            ) || [];
        message.tokenStatus = object.tokenStatus ?? 0;
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
        token: undefined,
        plugins: {},
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
        if (message.token !== undefined) {
            Token.encode(message.token, writer.uint32(90).fork()).ldelim();
        }
        Object.entries(message.plugins).forEach(([key, value]) => {
            ScriptUtxo_PluginsEntry.encode(
                { key: key as any, value },
                writer.uint32(98).fork(),
            ).ldelim();
        });
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
                    if (tag !== 10) {
                        break;
                    }

                    message.outpoint = OutPoint.decode(reader, reader.uint32());
                    continue;
                case 2:
                    if (tag !== 16) {
                        break;
                    }

                    message.blockHeight = reader.int32();
                    continue;
                case 3:
                    if (tag !== 24) {
                        break;
                    }

                    message.isCoinbase = reader.bool();
                    continue;
                case 5:
                    if (tag !== 40) {
                        break;
                    }

                    message.value = longToString(reader.int64() as Long);
                    continue;
                case 10:
                    if (tag !== 80) {
                        break;
                    }

                    message.isFinal = reader.bool();
                    continue;
                case 11:
                    if (tag !== 90) {
                        break;
                    }

                    message.token = Token.decode(reader, reader.uint32());
                    continue;
                case 12:
                    if (tag !== 98) {
                        break;
                    }

                    const entry12 = ScriptUtxo_PluginsEntry.decode(
                        reader,
                        reader.uint32(),
                    );
                    if (entry12.value !== undefined) {
                        message.plugins[entry12.key] = entry12.value;
                    }
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
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
                ? globalThis.Number(object.blockHeight)
                : 0,
            isCoinbase: isSet(object.isCoinbase)
                ? globalThis.Boolean(object.isCoinbase)
                : false,
            value: isSet(object.value) ? globalThis.String(object.value) : '0',
            isFinal: isSet(object.isFinal)
                ? globalThis.Boolean(object.isFinal)
                : false,
            token: isSet(object.token)
                ? Token.fromJSON(object.token)
                : undefined,
            plugins: isObject(object.plugins)
                ? Object.entries(object.plugins).reduce<{
                      [key: string]: PluginEntry;
                  }>((acc, [key, value]) => {
                      acc[key] = PluginEntry.fromJSON(value);
                      return acc;
                  }, {})
                : {},
        };
    },

    toJSON(message: ScriptUtxo): unknown {
        const obj: any = {};
        if (message.outpoint !== undefined) {
            obj.outpoint = OutPoint.toJSON(message.outpoint);
        }
        if (message.blockHeight !== 0) {
            obj.blockHeight = Math.round(message.blockHeight);
        }
        if (message.isCoinbase === true) {
            obj.isCoinbase = message.isCoinbase;
        }
        if (message.value !== '0') {
            obj.value = message.value;
        }
        if (message.isFinal === true) {
            obj.isFinal = message.isFinal;
        }
        if (message.token !== undefined) {
            obj.token = Token.toJSON(message.token);
        }
        if (message.plugins) {
            const entries = Object.entries(message.plugins);
            if (entries.length > 0) {
                obj.plugins = {};
                entries.forEach(([k, v]) => {
                    obj.plugins[k] = PluginEntry.toJSON(v);
                });
            }
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<ScriptUtxo>, I>>(base?: I): ScriptUtxo {
        return ScriptUtxo.fromPartial(base ?? ({} as any));
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
        message.token =
            object.token !== undefined && object.token !== null
                ? Token.fromPartial(object.token)
                : undefined;
        message.plugins = Object.entries(object.plugins ?? {}).reduce<{
            [key: string]: PluginEntry;
        }>((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = PluginEntry.fromPartial(value);
            }
            return acc;
        }, {});
        return message;
    },
};

function createBaseScriptUtxo_PluginsEntry(): ScriptUtxo_PluginsEntry {
    return { key: '', value: undefined };
}

export const ScriptUtxo_PluginsEntry = {
    encode(
        message: ScriptUtxo_PluginsEntry,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.key !== '') {
            writer.uint32(10).string(message.key);
        }
        if (message.value !== undefined) {
            PluginEntry.encode(
                message.value,
                writer.uint32(18).fork(),
            ).ldelim();
        }
        return writer;
    },

    decode(
        input: _m0.Reader | Uint8Array,
        length?: number,
    ): ScriptUtxo_PluginsEntry {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseScriptUtxo_PluginsEntry();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.key = reader.string();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.value = PluginEntry.decode(reader, reader.uint32());
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): ScriptUtxo_PluginsEntry {
        return {
            key: isSet(object.key) ? globalThis.String(object.key) : '',
            value: isSet(object.value)
                ? PluginEntry.fromJSON(object.value)
                : undefined,
        };
    },

    toJSON(message: ScriptUtxo_PluginsEntry): unknown {
        const obj: any = {};
        if (message.key !== '') {
            obj.key = message.key;
        }
        if (message.value !== undefined) {
            obj.value = PluginEntry.toJSON(message.value);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<ScriptUtxo_PluginsEntry>, I>>(
        base?: I,
    ): ScriptUtxo_PluginsEntry {
        return ScriptUtxo_PluginsEntry.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<ScriptUtxo_PluginsEntry>, I>>(
        object: I,
    ): ScriptUtxo_PluginsEntry {
        const message = createBaseScriptUtxo_PluginsEntry();
        message.key = object.key ?? '';
        message.value =
            object.value !== undefined && object.value !== null
                ? PluginEntry.fromPartial(object.value)
                : undefined;
        return message;
    },
};

function createBaseUtxo(): Utxo {
    return {
        outpoint: undefined,
        blockHeight: 0,
        isCoinbase: false,
        value: '0',
        script: new Uint8Array(0),
        isFinal: false,
        token: undefined,
        plugins: {},
    };
}

export const Utxo = {
    encode(
        message: Utxo,
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
            writer.uint32(32).int64(message.value);
        }
        if (message.script.length !== 0) {
            writer.uint32(42).bytes(message.script);
        }
        if (message.isFinal === true) {
            writer.uint32(48).bool(message.isFinal);
        }
        if (message.token !== undefined) {
            Token.encode(message.token, writer.uint32(58).fork()).ldelim();
        }
        Object.entries(message.plugins).forEach(([key, value]) => {
            Utxo_PluginsEntry.encode(
                { key: key as any, value },
                writer.uint32(66).fork(),
            ).ldelim();
        });
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): Utxo {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseUtxo();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.outpoint = OutPoint.decode(reader, reader.uint32());
                    continue;
                case 2:
                    if (tag !== 16) {
                        break;
                    }

                    message.blockHeight = reader.int32();
                    continue;
                case 3:
                    if (tag !== 24) {
                        break;
                    }

                    message.isCoinbase = reader.bool();
                    continue;
                case 4:
                    if (tag !== 32) {
                        break;
                    }

                    message.value = longToString(reader.int64() as Long);
                    continue;
                case 5:
                    if (tag !== 42) {
                        break;
                    }

                    message.script = reader.bytes();
                    continue;
                case 6:
                    if (tag !== 48) {
                        break;
                    }

                    message.isFinal = reader.bool();
                    continue;
                case 7:
                    if (tag !== 58) {
                        break;
                    }

                    message.token = Token.decode(reader, reader.uint32());
                    continue;
                case 8:
                    if (tag !== 66) {
                        break;
                    }

                    const entry8 = Utxo_PluginsEntry.decode(
                        reader,
                        reader.uint32(),
                    );
                    if (entry8.value !== undefined) {
                        message.plugins[entry8.key] = entry8.value;
                    }
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): Utxo {
        return {
            outpoint: isSet(object.outpoint)
                ? OutPoint.fromJSON(object.outpoint)
                : undefined,
            blockHeight: isSet(object.blockHeight)
                ? globalThis.Number(object.blockHeight)
                : 0,
            isCoinbase: isSet(object.isCoinbase)
                ? globalThis.Boolean(object.isCoinbase)
                : false,
            value: isSet(object.value) ? globalThis.String(object.value) : '0',
            script: isSet(object.script)
                ? bytesFromBase64(object.script)
                : new Uint8Array(0),
            isFinal: isSet(object.isFinal)
                ? globalThis.Boolean(object.isFinal)
                : false,
            token: isSet(object.token)
                ? Token.fromJSON(object.token)
                : undefined,
            plugins: isObject(object.plugins)
                ? Object.entries(object.plugins).reduce<{
                      [key: string]: PluginEntry;
                  }>((acc, [key, value]) => {
                      acc[key] = PluginEntry.fromJSON(value);
                      return acc;
                  }, {})
                : {},
        };
    },

    toJSON(message: Utxo): unknown {
        const obj: any = {};
        if (message.outpoint !== undefined) {
            obj.outpoint = OutPoint.toJSON(message.outpoint);
        }
        if (message.blockHeight !== 0) {
            obj.blockHeight = Math.round(message.blockHeight);
        }
        if (message.isCoinbase === true) {
            obj.isCoinbase = message.isCoinbase;
        }
        if (message.value !== '0') {
            obj.value = message.value;
        }
        if (message.script.length !== 0) {
            obj.script = base64FromBytes(message.script);
        }
        if (message.isFinal === true) {
            obj.isFinal = message.isFinal;
        }
        if (message.token !== undefined) {
            obj.token = Token.toJSON(message.token);
        }
        if (message.plugins) {
            const entries = Object.entries(message.plugins);
            if (entries.length > 0) {
                obj.plugins = {};
                entries.forEach(([k, v]) => {
                    obj.plugins[k] = PluginEntry.toJSON(v);
                });
            }
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<Utxo>, I>>(base?: I): Utxo {
        return Utxo.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<Utxo>, I>>(object: I): Utxo {
        const message = createBaseUtxo();
        message.outpoint =
            object.outpoint !== undefined && object.outpoint !== null
                ? OutPoint.fromPartial(object.outpoint)
                : undefined;
        message.blockHeight = object.blockHeight ?? 0;
        message.isCoinbase = object.isCoinbase ?? false;
        message.value = object.value ?? '0';
        message.script = object.script ?? new Uint8Array(0);
        message.isFinal = object.isFinal ?? false;
        message.token =
            object.token !== undefined && object.token !== null
                ? Token.fromPartial(object.token)
                : undefined;
        message.plugins = Object.entries(object.plugins ?? {}).reduce<{
            [key: string]: PluginEntry;
        }>((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = PluginEntry.fromPartial(value);
            }
            return acc;
        }, {});
        return message;
    },
};

function createBaseUtxo_PluginsEntry(): Utxo_PluginsEntry {
    return { key: '', value: undefined };
}

export const Utxo_PluginsEntry = {
    encode(
        message: Utxo_PluginsEntry,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.key !== '') {
            writer.uint32(10).string(message.key);
        }
        if (message.value !== undefined) {
            PluginEntry.encode(
                message.value,
                writer.uint32(18).fork(),
            ).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): Utxo_PluginsEntry {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseUtxo_PluginsEntry();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.key = reader.string();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.value = PluginEntry.decode(reader, reader.uint32());
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): Utxo_PluginsEntry {
        return {
            key: isSet(object.key) ? globalThis.String(object.key) : '',
            value: isSet(object.value)
                ? PluginEntry.fromJSON(object.value)
                : undefined,
        };
    },

    toJSON(message: Utxo_PluginsEntry): unknown {
        const obj: any = {};
        if (message.key !== '') {
            obj.key = message.key;
        }
        if (message.value !== undefined) {
            obj.value = PluginEntry.toJSON(message.value);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<Utxo_PluginsEntry>, I>>(
        base?: I,
    ): Utxo_PluginsEntry {
        return Utxo_PluginsEntry.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<Utxo_PluginsEntry>, I>>(
        object: I,
    ): Utxo_PluginsEntry {
        const message = createBaseUtxo_PluginsEntry();
        message.key = object.key ?? '';
        message.value =
            object.value !== undefined && object.value !== null
                ? PluginEntry.fromPartial(object.value)
                : undefined;
        return message;
    },
};

function createBaseOutPoint(): OutPoint {
    return { txid: new Uint8Array(0), outIdx: 0 };
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
                    if (tag !== 10) {
                        break;
                    }

                    message.txid = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 16) {
                        break;
                    }

                    message.outIdx = reader.uint32();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
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
                : new Uint8Array(0),
            outIdx: isSet(object.outIdx) ? globalThis.Number(object.outIdx) : 0,
        };
    },

    toJSON(message: OutPoint): unknown {
        const obj: any = {};
        if (message.txid.length !== 0) {
            obj.txid = base64FromBytes(message.txid);
        }
        if (message.outIdx !== 0) {
            obj.outIdx = Math.round(message.outIdx);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<OutPoint>, I>>(base?: I): OutPoint {
        return OutPoint.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<OutPoint>, I>>(
        object: I,
    ): OutPoint {
        const message = createBaseOutPoint();
        message.txid = object.txid ?? new Uint8Array(0);
        message.outIdx = object.outIdx ?? 0;
        return message;
    },
};

function createBaseSpentBy(): SpentBy {
    return { txid: new Uint8Array(0), inputIdx: 0 };
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
                    if (tag !== 10) {
                        break;
                    }

                    message.txid = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 16) {
                        break;
                    }

                    message.inputIdx = reader.uint32();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
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
                : new Uint8Array(0),
            inputIdx: isSet(object.inputIdx)
                ? globalThis.Number(object.inputIdx)
                : 0,
        };
    },

    toJSON(message: SpentBy): unknown {
        const obj: any = {};
        if (message.txid.length !== 0) {
            obj.txid = base64FromBytes(message.txid);
        }
        if (message.inputIdx !== 0) {
            obj.inputIdx = Math.round(message.inputIdx);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<SpentBy>, I>>(base?: I): SpentBy {
        return SpentBy.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<SpentBy>, I>>(object: I): SpentBy {
        const message = createBaseSpentBy();
        message.txid = object.txid ?? new Uint8Array(0);
        message.inputIdx = object.inputIdx ?? 0;
        return message;
    },
};

function createBaseTxInput(): TxInput {
    return {
        prevOut: undefined,
        inputScript: new Uint8Array(0),
        outputScript: new Uint8Array(0),
        value: '0',
        sequenceNo: 0,
        token: undefined,
        plugins: {},
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
        if (message.token !== undefined) {
            Token.encode(message.token, writer.uint32(66).fork()).ldelim();
        }
        Object.entries(message.plugins).forEach(([key, value]) => {
            TxInput_PluginsEntry.encode(
                { key: key as any, value },
                writer.uint32(74).fork(),
            ).ldelim();
        });
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
                    if (tag !== 10) {
                        break;
                    }

                    message.prevOut = OutPoint.decode(reader, reader.uint32());
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.inputScript = reader.bytes();
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }

                    message.outputScript = reader.bytes();
                    continue;
                case 4:
                    if (tag !== 32) {
                        break;
                    }

                    message.value = longToString(reader.int64() as Long);
                    continue;
                case 5:
                    if (tag !== 40) {
                        break;
                    }

                    message.sequenceNo = reader.uint32();
                    continue;
                case 8:
                    if (tag !== 66) {
                        break;
                    }

                    message.token = Token.decode(reader, reader.uint32());
                    continue;
                case 9:
                    if (tag !== 74) {
                        break;
                    }

                    const entry9 = TxInput_PluginsEntry.decode(
                        reader,
                        reader.uint32(),
                    );
                    if (entry9.value !== undefined) {
                        message.plugins[entry9.key] = entry9.value;
                    }
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
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
                : new Uint8Array(0),
            outputScript: isSet(object.outputScript)
                ? bytesFromBase64(object.outputScript)
                : new Uint8Array(0),
            value: isSet(object.value) ? globalThis.String(object.value) : '0',
            sequenceNo: isSet(object.sequenceNo)
                ? globalThis.Number(object.sequenceNo)
                : 0,
            token: isSet(object.token)
                ? Token.fromJSON(object.token)
                : undefined,
            plugins: isObject(object.plugins)
                ? Object.entries(object.plugins).reduce<{
                      [key: string]: PluginEntry;
                  }>((acc, [key, value]) => {
                      acc[key] = PluginEntry.fromJSON(value);
                      return acc;
                  }, {})
                : {},
        };
    },

    toJSON(message: TxInput): unknown {
        const obj: any = {};
        if (message.prevOut !== undefined) {
            obj.prevOut = OutPoint.toJSON(message.prevOut);
        }
        if (message.inputScript.length !== 0) {
            obj.inputScript = base64FromBytes(message.inputScript);
        }
        if (message.outputScript.length !== 0) {
            obj.outputScript = base64FromBytes(message.outputScript);
        }
        if (message.value !== '0') {
            obj.value = message.value;
        }
        if (message.sequenceNo !== 0) {
            obj.sequenceNo = Math.round(message.sequenceNo);
        }
        if (message.token !== undefined) {
            obj.token = Token.toJSON(message.token);
        }
        if (message.plugins) {
            const entries = Object.entries(message.plugins);
            if (entries.length > 0) {
                obj.plugins = {};
                entries.forEach(([k, v]) => {
                    obj.plugins[k] = PluginEntry.toJSON(v);
                });
            }
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<TxInput>, I>>(base?: I): TxInput {
        return TxInput.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<TxInput>, I>>(object: I): TxInput {
        const message = createBaseTxInput();
        message.prevOut =
            object.prevOut !== undefined && object.prevOut !== null
                ? OutPoint.fromPartial(object.prevOut)
                : undefined;
        message.inputScript = object.inputScript ?? new Uint8Array(0);
        message.outputScript = object.outputScript ?? new Uint8Array(0);
        message.value = object.value ?? '0';
        message.sequenceNo = object.sequenceNo ?? 0;
        message.token =
            object.token !== undefined && object.token !== null
                ? Token.fromPartial(object.token)
                : undefined;
        message.plugins = Object.entries(object.plugins ?? {}).reduce<{
            [key: string]: PluginEntry;
        }>((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = PluginEntry.fromPartial(value);
            }
            return acc;
        }, {});
        return message;
    },
};

function createBaseTxInput_PluginsEntry(): TxInput_PluginsEntry {
    return { key: '', value: undefined };
}

export const TxInput_PluginsEntry = {
    encode(
        message: TxInput_PluginsEntry,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.key !== '') {
            writer.uint32(10).string(message.key);
        }
        if (message.value !== undefined) {
            PluginEntry.encode(
                message.value,
                writer.uint32(18).fork(),
            ).ldelim();
        }
        return writer;
    },

    decode(
        input: _m0.Reader | Uint8Array,
        length?: number,
    ): TxInput_PluginsEntry {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseTxInput_PluginsEntry();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.key = reader.string();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.value = PluginEntry.decode(reader, reader.uint32());
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): TxInput_PluginsEntry {
        return {
            key: isSet(object.key) ? globalThis.String(object.key) : '',
            value: isSet(object.value)
                ? PluginEntry.fromJSON(object.value)
                : undefined,
        };
    },

    toJSON(message: TxInput_PluginsEntry): unknown {
        const obj: any = {};
        if (message.key !== '') {
            obj.key = message.key;
        }
        if (message.value !== undefined) {
            obj.value = PluginEntry.toJSON(message.value);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<TxInput_PluginsEntry>, I>>(
        base?: I,
    ): TxInput_PluginsEntry {
        return TxInput_PluginsEntry.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<TxInput_PluginsEntry>, I>>(
        object: I,
    ): TxInput_PluginsEntry {
        const message = createBaseTxInput_PluginsEntry();
        message.key = object.key ?? '';
        message.value =
            object.value !== undefined && object.value !== null
                ? PluginEntry.fromPartial(object.value)
                : undefined;
        return message;
    },
};

function createBaseTxOutput(): TxOutput {
    return {
        value: '0',
        outputScript: new Uint8Array(0),
        spentBy: undefined,
        token: undefined,
        plugins: {},
    };
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
        if (message.token !== undefined) {
            Token.encode(message.token, writer.uint32(42).fork()).ldelim();
        }
        Object.entries(message.plugins).forEach(([key, value]) => {
            TxOutput_PluginsEntry.encode(
                { key: key as any, value },
                writer.uint32(50).fork(),
            ).ldelim();
        });
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
                    if (tag !== 8) {
                        break;
                    }

                    message.value = longToString(reader.int64() as Long);
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.outputScript = reader.bytes();
                    continue;
                case 4:
                    if (tag !== 34) {
                        break;
                    }

                    message.spentBy = SpentBy.decode(reader, reader.uint32());
                    continue;
                case 5:
                    if (tag !== 42) {
                        break;
                    }

                    message.token = Token.decode(reader, reader.uint32());
                    continue;
                case 6:
                    if (tag !== 50) {
                        break;
                    }

                    const entry6 = TxOutput_PluginsEntry.decode(
                        reader,
                        reader.uint32(),
                    );
                    if (entry6.value !== undefined) {
                        message.plugins[entry6.key] = entry6.value;
                    }
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): TxOutput {
        return {
            value: isSet(object.value) ? globalThis.String(object.value) : '0',
            outputScript: isSet(object.outputScript)
                ? bytesFromBase64(object.outputScript)
                : new Uint8Array(0),
            spentBy: isSet(object.spentBy)
                ? SpentBy.fromJSON(object.spentBy)
                : undefined,
            token: isSet(object.token)
                ? Token.fromJSON(object.token)
                : undefined,
            plugins: isObject(object.plugins)
                ? Object.entries(object.plugins).reduce<{
                      [key: string]: PluginEntry;
                  }>((acc, [key, value]) => {
                      acc[key] = PluginEntry.fromJSON(value);
                      return acc;
                  }, {})
                : {},
        };
    },

    toJSON(message: TxOutput): unknown {
        const obj: any = {};
        if (message.value !== '0') {
            obj.value = message.value;
        }
        if (message.outputScript.length !== 0) {
            obj.outputScript = base64FromBytes(message.outputScript);
        }
        if (message.spentBy !== undefined) {
            obj.spentBy = SpentBy.toJSON(message.spentBy);
        }
        if (message.token !== undefined) {
            obj.token = Token.toJSON(message.token);
        }
        if (message.plugins) {
            const entries = Object.entries(message.plugins);
            if (entries.length > 0) {
                obj.plugins = {};
                entries.forEach(([k, v]) => {
                    obj.plugins[k] = PluginEntry.toJSON(v);
                });
            }
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<TxOutput>, I>>(base?: I): TxOutput {
        return TxOutput.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<TxOutput>, I>>(
        object: I,
    ): TxOutput {
        const message = createBaseTxOutput();
        message.value = object.value ?? '0';
        message.outputScript = object.outputScript ?? new Uint8Array(0);
        message.spentBy =
            object.spentBy !== undefined && object.spentBy !== null
                ? SpentBy.fromPartial(object.spentBy)
                : undefined;
        message.token =
            object.token !== undefined && object.token !== null
                ? Token.fromPartial(object.token)
                : undefined;
        message.plugins = Object.entries(object.plugins ?? {}).reduce<{
            [key: string]: PluginEntry;
        }>((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = PluginEntry.fromPartial(value);
            }
            return acc;
        }, {});
        return message;
    },
};

function createBaseTxOutput_PluginsEntry(): TxOutput_PluginsEntry {
    return { key: '', value: undefined };
}

export const TxOutput_PluginsEntry = {
    encode(
        message: TxOutput_PluginsEntry,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.key !== '') {
            writer.uint32(10).string(message.key);
        }
        if (message.value !== undefined) {
            PluginEntry.encode(
                message.value,
                writer.uint32(18).fork(),
            ).ldelim();
        }
        return writer;
    },

    decode(
        input: _m0.Reader | Uint8Array,
        length?: number,
    ): TxOutput_PluginsEntry {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseTxOutput_PluginsEntry();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.key = reader.string();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.value = PluginEntry.decode(reader, reader.uint32());
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): TxOutput_PluginsEntry {
        return {
            key: isSet(object.key) ? globalThis.String(object.key) : '',
            value: isSet(object.value)
                ? PluginEntry.fromJSON(object.value)
                : undefined,
        };
    },

    toJSON(message: TxOutput_PluginsEntry): unknown {
        const obj: any = {};
        if (message.key !== '') {
            obj.key = message.key;
        }
        if (message.value !== undefined) {
            obj.value = PluginEntry.toJSON(message.value);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<TxOutput_PluginsEntry>, I>>(
        base?: I,
    ): TxOutput_PluginsEntry {
        return TxOutput_PluginsEntry.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<TxOutput_PluginsEntry>, I>>(
        object: I,
    ): TxOutput_PluginsEntry {
        const message = createBaseTxOutput_PluginsEntry();
        message.key = object.key ?? '';
        message.value =
            object.value !== undefined && object.value !== null
                ? PluginEntry.fromPartial(object.value)
                : undefined;
        return message;
    },
};

function createBaseBlockMetadata(): BlockMetadata {
    return {
        height: 0,
        hash: new Uint8Array(0),
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
                    if (tag !== 8) {
                        break;
                    }

                    message.height = reader.int32();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.hash = reader.bytes();
                    continue;
                case 3:
                    if (tag !== 24) {
                        break;
                    }

                    message.timestamp = longToString(reader.int64() as Long);
                    continue;
                case 4:
                    if (tag !== 32) {
                        break;
                    }

                    message.isFinal = reader.bool();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): BlockMetadata {
        return {
            height: isSet(object.height) ? globalThis.Number(object.height) : 0,
            hash: isSet(object.hash)
                ? bytesFromBase64(object.hash)
                : new Uint8Array(0),
            timestamp: isSet(object.timestamp)
                ? globalThis.String(object.timestamp)
                : '0',
            isFinal: isSet(object.isFinal)
                ? globalThis.Boolean(object.isFinal)
                : false,
        };
    },

    toJSON(message: BlockMetadata): unknown {
        const obj: any = {};
        if (message.height !== 0) {
            obj.height = Math.round(message.height);
        }
        if (message.hash.length !== 0) {
            obj.hash = base64FromBytes(message.hash);
        }
        if (message.timestamp !== '0') {
            obj.timestamp = message.timestamp;
        }
        if (message.isFinal === true) {
            obj.isFinal = message.isFinal;
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<BlockMetadata>, I>>(
        base?: I,
    ): BlockMetadata {
        return BlockMetadata.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<BlockMetadata>, I>>(
        object: I,
    ): BlockMetadata {
        const message = createBaseBlockMetadata();
        message.height = object.height ?? 0;
        message.hash = object.hash ?? new Uint8Array(0);
        message.timestamp = object.timestamp ?? '0';
        message.isFinal = object.isFinal ?? false;
        return message;
    },
};

function createBaseTokenType(): TokenType {
    return { slp: undefined, alp: undefined };
}

export const TokenType = {
    encode(
        message: TokenType,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.slp !== undefined) {
            writer.uint32(8).int32(message.slp);
        }
        if (message.alp !== undefined) {
            writer.uint32(16).int32(message.alp);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): TokenType {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseTokenType();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 8) {
                        break;
                    }

                    message.slp = reader.int32() as any;
                    continue;
                case 2:
                    if (tag !== 16) {
                        break;
                    }

                    message.alp = reader.int32() as any;
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): TokenType {
        return {
            slp: isSet(object.slp)
                ? slpTokenTypeFromJSON(object.slp)
                : undefined,
            alp: isSet(object.alp)
                ? alpTokenTypeFromJSON(object.alp)
                : undefined,
        };
    },

    toJSON(message: TokenType): unknown {
        const obj: any = {};
        if (message.slp !== undefined) {
            obj.slp = slpTokenTypeToJSON(message.slp);
        }
        if (message.alp !== undefined) {
            obj.alp = alpTokenTypeToJSON(message.alp);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<TokenType>, I>>(base?: I): TokenType {
        return TokenType.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<TokenType>, I>>(
        object: I,
    ): TokenType {
        const message = createBaseTokenType();
        message.slp = object.slp ?? undefined;
        message.alp = object.alp ?? undefined;
        return message;
    },
};

function createBaseTokenInfo(): TokenInfo {
    return {
        tokenId: '',
        tokenType: undefined,
        genesisInfo: undefined,
        block: undefined,
        timeFirstSeen: '0',
    };
}

export const TokenInfo = {
    encode(
        message: TokenInfo,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.tokenId !== '') {
            writer.uint32(10).string(message.tokenId);
        }
        if (message.tokenType !== undefined) {
            TokenType.encode(
                message.tokenType,
                writer.uint32(18).fork(),
            ).ldelim();
        }
        if (message.genesisInfo !== undefined) {
            GenesisInfo.encode(
                message.genesisInfo,
                writer.uint32(26).fork(),
            ).ldelim();
        }
        if (message.block !== undefined) {
            BlockMetadata.encode(
                message.block,
                writer.uint32(34).fork(),
            ).ldelim();
        }
        if (message.timeFirstSeen !== '0') {
            writer.uint32(40).int64(message.timeFirstSeen);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): TokenInfo {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseTokenInfo();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.tokenId = reader.string();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.tokenType = TokenType.decode(
                        reader,
                        reader.uint32(),
                    );
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }

                    message.genesisInfo = GenesisInfo.decode(
                        reader,
                        reader.uint32(),
                    );
                    continue;
                case 4:
                    if (tag !== 34) {
                        break;
                    }

                    message.block = BlockMetadata.decode(
                        reader,
                        reader.uint32(),
                    );
                    continue;
                case 5:
                    if (tag !== 40) {
                        break;
                    }

                    message.timeFirstSeen = longToString(
                        reader.int64() as Long,
                    );
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): TokenInfo {
        return {
            tokenId: isSet(object.tokenId)
                ? globalThis.String(object.tokenId)
                : '',
            tokenType: isSet(object.tokenType)
                ? TokenType.fromJSON(object.tokenType)
                : undefined,
            genesisInfo: isSet(object.genesisInfo)
                ? GenesisInfo.fromJSON(object.genesisInfo)
                : undefined,
            block: isSet(object.block)
                ? BlockMetadata.fromJSON(object.block)
                : undefined,
            timeFirstSeen: isSet(object.timeFirstSeen)
                ? globalThis.String(object.timeFirstSeen)
                : '0',
        };
    },

    toJSON(message: TokenInfo): unknown {
        const obj: any = {};
        if (message.tokenId !== '') {
            obj.tokenId = message.tokenId;
        }
        if (message.tokenType !== undefined) {
            obj.tokenType = TokenType.toJSON(message.tokenType);
        }
        if (message.genesisInfo !== undefined) {
            obj.genesisInfo = GenesisInfo.toJSON(message.genesisInfo);
        }
        if (message.block !== undefined) {
            obj.block = BlockMetadata.toJSON(message.block);
        }
        if (message.timeFirstSeen !== '0') {
            obj.timeFirstSeen = message.timeFirstSeen;
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<TokenInfo>, I>>(base?: I): TokenInfo {
        return TokenInfo.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<TokenInfo>, I>>(
        object: I,
    ): TokenInfo {
        const message = createBaseTokenInfo();
        message.tokenId = object.tokenId ?? '';
        message.tokenType =
            object.tokenType !== undefined && object.tokenType !== null
                ? TokenType.fromPartial(object.tokenType)
                : undefined;
        message.genesisInfo =
            object.genesisInfo !== undefined && object.genesisInfo !== null
                ? GenesisInfo.fromPartial(object.genesisInfo)
                : undefined;
        message.block =
            object.block !== undefined && object.block !== null
                ? BlockMetadata.fromPartial(object.block)
                : undefined;
        message.timeFirstSeen = object.timeFirstSeen ?? '0';
        return message;
    },
};

function createBaseTokenEntry(): TokenEntry {
    return {
        tokenId: '',
        tokenType: undefined,
        txType: 0,
        groupTokenId: '',
        isInvalid: false,
        burnSummary: '',
        failedColorings: [],
        actualBurnAmount: '',
        intentionalBurn: '0',
        burnsMintBatons: false,
    };
}

export const TokenEntry = {
    encode(
        message: TokenEntry,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.tokenId !== '') {
            writer.uint32(10).string(message.tokenId);
        }
        if (message.tokenType !== undefined) {
            TokenType.encode(
                message.tokenType,
                writer.uint32(18).fork(),
            ).ldelim();
        }
        if (message.txType !== 0) {
            writer.uint32(24).int32(message.txType);
        }
        if (message.groupTokenId !== '') {
            writer.uint32(34).string(message.groupTokenId);
        }
        if (message.isInvalid === true) {
            writer.uint32(40).bool(message.isInvalid);
        }
        if (message.burnSummary !== '') {
            writer.uint32(50).string(message.burnSummary);
        }
        for (const v of message.failedColorings) {
            TokenFailedColoring.encode(v!, writer.uint32(58).fork()).ldelim();
        }
        if (message.actualBurnAmount !== '') {
            writer.uint32(66).string(message.actualBurnAmount);
        }
        if (message.intentionalBurn !== '0') {
            writer.uint32(72).uint64(message.intentionalBurn);
        }
        if (message.burnsMintBatons === true) {
            writer.uint32(80).bool(message.burnsMintBatons);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): TokenEntry {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseTokenEntry();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.tokenId = reader.string();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.tokenType = TokenType.decode(
                        reader,
                        reader.uint32(),
                    );
                    continue;
                case 3:
                    if (tag !== 24) {
                        break;
                    }

                    message.txType = reader.int32() as any;
                    continue;
                case 4:
                    if (tag !== 34) {
                        break;
                    }

                    message.groupTokenId = reader.string();
                    continue;
                case 5:
                    if (tag !== 40) {
                        break;
                    }

                    message.isInvalid = reader.bool();
                    continue;
                case 6:
                    if (tag !== 50) {
                        break;
                    }

                    message.burnSummary = reader.string();
                    continue;
                case 7:
                    if (tag !== 58) {
                        break;
                    }

                    message.failedColorings.push(
                        TokenFailedColoring.decode(reader, reader.uint32()),
                    );
                    continue;
                case 8:
                    if (tag !== 66) {
                        break;
                    }

                    message.actualBurnAmount = reader.string();
                    continue;
                case 9:
                    if (tag !== 72) {
                        break;
                    }

                    message.intentionalBurn = longToString(
                        reader.uint64() as Long,
                    );
                    continue;
                case 10:
                    if (tag !== 80) {
                        break;
                    }

                    message.burnsMintBatons = reader.bool();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): TokenEntry {
        return {
            tokenId: isSet(object.tokenId)
                ? globalThis.String(object.tokenId)
                : '',
            tokenType: isSet(object.tokenType)
                ? TokenType.fromJSON(object.tokenType)
                : undefined,
            txType: isSet(object.txType)
                ? tokenTxTypeFromJSON(object.txType)
                : 0,
            groupTokenId: isSet(object.groupTokenId)
                ? globalThis.String(object.groupTokenId)
                : '',
            isInvalid: isSet(object.isInvalid)
                ? globalThis.Boolean(object.isInvalid)
                : false,
            burnSummary: isSet(object.burnSummary)
                ? globalThis.String(object.burnSummary)
                : '',
            failedColorings: globalThis.Array.isArray(object?.failedColorings)
                ? object.failedColorings.map((e: any) =>
                      TokenFailedColoring.fromJSON(e),
                  )
                : [],
            actualBurnAmount: isSet(object.actualBurnAmount)
                ? globalThis.String(object.actualBurnAmount)
                : '',
            intentionalBurn: isSet(object.intentionalBurn)
                ? globalThis.String(object.intentionalBurn)
                : '0',
            burnsMintBatons: isSet(object.burnsMintBatons)
                ? globalThis.Boolean(object.burnsMintBatons)
                : false,
        };
    },

    toJSON(message: TokenEntry): unknown {
        const obj: any = {};
        if (message.tokenId !== '') {
            obj.tokenId = message.tokenId;
        }
        if (message.tokenType !== undefined) {
            obj.tokenType = TokenType.toJSON(message.tokenType);
        }
        if (message.txType !== 0) {
            obj.txType = tokenTxTypeToJSON(message.txType);
        }
        if (message.groupTokenId !== '') {
            obj.groupTokenId = message.groupTokenId;
        }
        if (message.isInvalid === true) {
            obj.isInvalid = message.isInvalid;
        }
        if (message.burnSummary !== '') {
            obj.burnSummary = message.burnSummary;
        }
        if (message.failedColorings?.length) {
            obj.failedColorings = message.failedColorings.map(e =>
                TokenFailedColoring.toJSON(e),
            );
        }
        if (message.actualBurnAmount !== '') {
            obj.actualBurnAmount = message.actualBurnAmount;
        }
        if (message.intentionalBurn !== '0') {
            obj.intentionalBurn = message.intentionalBurn;
        }
        if (message.burnsMintBatons === true) {
            obj.burnsMintBatons = message.burnsMintBatons;
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<TokenEntry>, I>>(base?: I): TokenEntry {
        return TokenEntry.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<TokenEntry>, I>>(
        object: I,
    ): TokenEntry {
        const message = createBaseTokenEntry();
        message.tokenId = object.tokenId ?? '';
        message.tokenType =
            object.tokenType !== undefined && object.tokenType !== null
                ? TokenType.fromPartial(object.tokenType)
                : undefined;
        message.txType = object.txType ?? 0;
        message.groupTokenId = object.groupTokenId ?? '';
        message.isInvalid = object.isInvalid ?? false;
        message.burnSummary = object.burnSummary ?? '';
        message.failedColorings =
            object.failedColorings?.map(e =>
                TokenFailedColoring.fromPartial(e),
            ) || [];
        message.actualBurnAmount = object.actualBurnAmount ?? '';
        message.intentionalBurn = object.intentionalBurn ?? '0';
        message.burnsMintBatons = object.burnsMintBatons ?? false;
        return message;
    },
};

function createBaseGenesisInfo(): GenesisInfo {
    return {
        tokenTicker: new Uint8Array(0),
        tokenName: new Uint8Array(0),
        url: new Uint8Array(0),
        hash: new Uint8Array(0),
        mintVaultScripthash: new Uint8Array(0),
        data: new Uint8Array(0),
        authPubkey: new Uint8Array(0),
        decimals: 0,
    };
}

export const GenesisInfo = {
    encode(
        message: GenesisInfo,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.tokenTicker.length !== 0) {
            writer.uint32(10).bytes(message.tokenTicker);
        }
        if (message.tokenName.length !== 0) {
            writer.uint32(18).bytes(message.tokenName);
        }
        if (message.url.length !== 0) {
            writer.uint32(26).bytes(message.url);
        }
        if (message.hash.length !== 0) {
            writer.uint32(34).bytes(message.hash);
        }
        if (message.mintVaultScripthash.length !== 0) {
            writer.uint32(42).bytes(message.mintVaultScripthash);
        }
        if (message.data.length !== 0) {
            writer.uint32(50).bytes(message.data);
        }
        if (message.authPubkey.length !== 0) {
            writer.uint32(58).bytes(message.authPubkey);
        }
        if (message.decimals !== 0) {
            writer.uint32(64).uint32(message.decimals);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): GenesisInfo {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseGenesisInfo();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.tokenTicker = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.tokenName = reader.bytes();
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }

                    message.url = reader.bytes();
                    continue;
                case 4:
                    if (tag !== 34) {
                        break;
                    }

                    message.hash = reader.bytes();
                    continue;
                case 5:
                    if (tag !== 42) {
                        break;
                    }

                    message.mintVaultScripthash = reader.bytes();
                    continue;
                case 6:
                    if (tag !== 50) {
                        break;
                    }

                    message.data = reader.bytes();
                    continue;
                case 7:
                    if (tag !== 58) {
                        break;
                    }

                    message.authPubkey = reader.bytes();
                    continue;
                case 8:
                    if (tag !== 64) {
                        break;
                    }

                    message.decimals = reader.uint32();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): GenesisInfo {
        return {
            tokenTicker: isSet(object.tokenTicker)
                ? bytesFromBase64(object.tokenTicker)
                : new Uint8Array(0),
            tokenName: isSet(object.tokenName)
                ? bytesFromBase64(object.tokenName)
                : new Uint8Array(0),
            url: isSet(object.url)
                ? bytesFromBase64(object.url)
                : new Uint8Array(0),
            hash: isSet(object.hash)
                ? bytesFromBase64(object.hash)
                : new Uint8Array(0),
            mintVaultScripthash: isSet(object.mintVaultScripthash)
                ? bytesFromBase64(object.mintVaultScripthash)
                : new Uint8Array(0),
            data: isSet(object.data)
                ? bytesFromBase64(object.data)
                : new Uint8Array(0),
            authPubkey: isSet(object.authPubkey)
                ? bytesFromBase64(object.authPubkey)
                : new Uint8Array(0),
            decimals: isSet(object.decimals)
                ? globalThis.Number(object.decimals)
                : 0,
        };
    },

    toJSON(message: GenesisInfo): unknown {
        const obj: any = {};
        if (message.tokenTicker.length !== 0) {
            obj.tokenTicker = base64FromBytes(message.tokenTicker);
        }
        if (message.tokenName.length !== 0) {
            obj.tokenName = base64FromBytes(message.tokenName);
        }
        if (message.url.length !== 0) {
            obj.url = base64FromBytes(message.url);
        }
        if (message.hash.length !== 0) {
            obj.hash = base64FromBytes(message.hash);
        }
        if (message.mintVaultScripthash.length !== 0) {
            obj.mintVaultScripthash = base64FromBytes(
                message.mintVaultScripthash,
            );
        }
        if (message.data.length !== 0) {
            obj.data = base64FromBytes(message.data);
        }
        if (message.authPubkey.length !== 0) {
            obj.authPubkey = base64FromBytes(message.authPubkey);
        }
        if (message.decimals !== 0) {
            obj.decimals = Math.round(message.decimals);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<GenesisInfo>, I>>(
        base?: I,
    ): GenesisInfo {
        return GenesisInfo.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<GenesisInfo>, I>>(
        object: I,
    ): GenesisInfo {
        const message = createBaseGenesisInfo();
        message.tokenTicker = object.tokenTicker ?? new Uint8Array(0);
        message.tokenName = object.tokenName ?? new Uint8Array(0);
        message.url = object.url ?? new Uint8Array(0);
        message.hash = object.hash ?? new Uint8Array(0);
        message.mintVaultScripthash =
            object.mintVaultScripthash ?? new Uint8Array(0);
        message.data = object.data ?? new Uint8Array(0);
        message.authPubkey = object.authPubkey ?? new Uint8Array(0);
        message.decimals = object.decimals ?? 0;
        return message;
    },
};

function createBaseToken(): Token {
    return {
        tokenId: '',
        tokenType: undefined,
        entryIdx: 0,
        amount: '0',
        isMintBaton: false,
    };
}

export const Token = {
    encode(
        message: Token,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.tokenId !== '') {
            writer.uint32(10).string(message.tokenId);
        }
        if (message.tokenType !== undefined) {
            TokenType.encode(
                message.tokenType,
                writer.uint32(18).fork(),
            ).ldelim();
        }
        if (message.entryIdx !== 0) {
            writer.uint32(24).int32(message.entryIdx);
        }
        if (message.amount !== '0') {
            writer.uint32(32).uint64(message.amount);
        }
        if (message.isMintBaton === true) {
            writer.uint32(40).bool(message.isMintBaton);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): Token {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseToken();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.tokenId = reader.string();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.tokenType = TokenType.decode(
                        reader,
                        reader.uint32(),
                    );
                    continue;
                case 3:
                    if (tag !== 24) {
                        break;
                    }

                    message.entryIdx = reader.int32();
                    continue;
                case 4:
                    if (tag !== 32) {
                        break;
                    }

                    message.amount = longToString(reader.uint64() as Long);
                    continue;
                case 5:
                    if (tag !== 40) {
                        break;
                    }

                    message.isMintBaton = reader.bool();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): Token {
        return {
            tokenId: isSet(object.tokenId)
                ? globalThis.String(object.tokenId)
                : '',
            tokenType: isSet(object.tokenType)
                ? TokenType.fromJSON(object.tokenType)
                : undefined,
            entryIdx: isSet(object.entryIdx)
                ? globalThis.Number(object.entryIdx)
                : 0,
            amount: isSet(object.amount)
                ? globalThis.String(object.amount)
                : '0',
            isMintBaton: isSet(object.isMintBaton)
                ? globalThis.Boolean(object.isMintBaton)
                : false,
        };
    },

    toJSON(message: Token): unknown {
        const obj: any = {};
        if (message.tokenId !== '') {
            obj.tokenId = message.tokenId;
        }
        if (message.tokenType !== undefined) {
            obj.tokenType = TokenType.toJSON(message.tokenType);
        }
        if (message.entryIdx !== 0) {
            obj.entryIdx = Math.round(message.entryIdx);
        }
        if (message.amount !== '0') {
            obj.amount = message.amount;
        }
        if (message.isMintBaton === true) {
            obj.isMintBaton = message.isMintBaton;
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<Token>, I>>(base?: I): Token {
        return Token.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<Token>, I>>(object: I): Token {
        const message = createBaseToken();
        message.tokenId = object.tokenId ?? '';
        message.tokenType =
            object.tokenType !== undefined && object.tokenType !== null
                ? TokenType.fromPartial(object.tokenType)
                : undefined;
        message.entryIdx = object.entryIdx ?? 0;
        message.amount = object.amount ?? '0';
        message.isMintBaton = object.isMintBaton ?? false;
        return message;
    },
};

function createBaseTokenFailedParsing(): TokenFailedParsing {
    return { pushdataIdx: 0, bytes: new Uint8Array(0), error: '' };
}

export const TokenFailedParsing = {
    encode(
        message: TokenFailedParsing,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.pushdataIdx !== 0) {
            writer.uint32(8).int32(message.pushdataIdx);
        }
        if (message.bytes.length !== 0) {
            writer.uint32(18).bytes(message.bytes);
        }
        if (message.error !== '') {
            writer.uint32(26).string(message.error);
        }
        return writer;
    },

    decode(
        input: _m0.Reader | Uint8Array,
        length?: number,
    ): TokenFailedParsing {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseTokenFailedParsing();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 8) {
                        break;
                    }

                    message.pushdataIdx = reader.int32();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.bytes = reader.bytes();
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }

                    message.error = reader.string();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): TokenFailedParsing {
        return {
            pushdataIdx: isSet(object.pushdataIdx)
                ? globalThis.Number(object.pushdataIdx)
                : 0,
            bytes: isSet(object.bytes)
                ? bytesFromBase64(object.bytes)
                : new Uint8Array(0),
            error: isSet(object.error) ? globalThis.String(object.error) : '',
        };
    },

    toJSON(message: TokenFailedParsing): unknown {
        const obj: any = {};
        if (message.pushdataIdx !== 0) {
            obj.pushdataIdx = Math.round(message.pushdataIdx);
        }
        if (message.bytes.length !== 0) {
            obj.bytes = base64FromBytes(message.bytes);
        }
        if (message.error !== '') {
            obj.error = message.error;
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<TokenFailedParsing>, I>>(
        base?: I,
    ): TokenFailedParsing {
        return TokenFailedParsing.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<TokenFailedParsing>, I>>(
        object: I,
    ): TokenFailedParsing {
        const message = createBaseTokenFailedParsing();
        message.pushdataIdx = object.pushdataIdx ?? 0;
        message.bytes = object.bytes ?? new Uint8Array(0);
        message.error = object.error ?? '';
        return message;
    },
};

function createBaseTokenFailedColoring(): TokenFailedColoring {
    return { pushdataIdx: 0, error: '' };
}

export const TokenFailedColoring = {
    encode(
        message: TokenFailedColoring,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.pushdataIdx !== 0) {
            writer.uint32(8).int32(message.pushdataIdx);
        }
        if (message.error !== '') {
            writer.uint32(26).string(message.error);
        }
        return writer;
    },

    decode(
        input: _m0.Reader | Uint8Array,
        length?: number,
    ): TokenFailedColoring {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseTokenFailedColoring();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 8) {
                        break;
                    }

                    message.pushdataIdx = reader.int32();
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }

                    message.error = reader.string();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): TokenFailedColoring {
        return {
            pushdataIdx: isSet(object.pushdataIdx)
                ? globalThis.Number(object.pushdataIdx)
                : 0,
            error: isSet(object.error) ? globalThis.String(object.error) : '',
        };
    },

    toJSON(message: TokenFailedColoring): unknown {
        const obj: any = {};
        if (message.pushdataIdx !== 0) {
            obj.pushdataIdx = Math.round(message.pushdataIdx);
        }
        if (message.error !== '') {
            obj.error = message.error;
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<TokenFailedColoring>, I>>(
        base?: I,
    ): TokenFailedColoring {
        return TokenFailedColoring.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<TokenFailedColoring>, I>>(
        object: I,
    ): TokenFailedColoring {
        const message = createBaseTokenFailedColoring();
        message.pushdataIdx = object.pushdataIdx ?? 0;
        message.error = object.error ?? '';
        return message;
    },
};

function createBasePluginEntry(): PluginEntry {
    return { groups: [], data: [] };
}

export const PluginEntry = {
    encode(
        message: PluginEntry,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        for (const v of message.groups) {
            writer.uint32(10).bytes(v!);
        }
        for (const v of message.data) {
            writer.uint32(18).bytes(v!);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): PluginEntry {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePluginEntry();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.groups.push(reader.bytes());
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.data.push(reader.bytes());
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): PluginEntry {
        return {
            groups: globalThis.Array.isArray(object?.groups)
                ? object.groups.map((e: any) => bytesFromBase64(e))
                : [],
            data: globalThis.Array.isArray(object?.data)
                ? object.data.map((e: any) => bytesFromBase64(e))
                : [],
        };
    },

    toJSON(message: PluginEntry): unknown {
        const obj: any = {};
        if (message.groups?.length) {
            obj.groups = message.groups.map(e => base64FromBytes(e));
        }
        if (message.data?.length) {
            obj.data = message.data.map(e => base64FromBytes(e));
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<PluginEntry>, I>>(
        base?: I,
    ): PluginEntry {
        return PluginEntry.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<PluginEntry>, I>>(
        object: I,
    ): PluginEntry {
        const message = createBasePluginEntry();
        message.groups = object.groups?.map(e => e) || [];
        message.data = object.data?.map(e => e) || [];
        return message;
    },
};

function createBasePluginGroup(): PluginGroup {
    return { group: new Uint8Array(0) };
}

export const PluginGroup = {
    encode(
        message: PluginGroup,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.group.length !== 0) {
            writer.uint32(10).bytes(message.group);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): PluginGroup {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePluginGroup();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.group = reader.bytes();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): PluginGroup {
        return {
            group: isSet(object.group)
                ? bytesFromBase64(object.group)
                : new Uint8Array(0),
        };
    },

    toJSON(message: PluginGroup): unknown {
        const obj: any = {};
        if (message.group.length !== 0) {
            obj.group = base64FromBytes(message.group);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<PluginGroup>, I>>(
        base?: I,
    ): PluginGroup {
        return PluginGroup.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<PluginGroup>, I>>(
        object: I,
    ): PluginGroup {
        const message = createBasePluginGroup();
        message.group = object.group ?? new Uint8Array(0);
        return message;
    },
};

function createBasePluginGroups(): PluginGroups {
    return { groups: [], nextStart: new Uint8Array(0) };
}

export const PluginGroups = {
    encode(
        message: PluginGroups,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        for (const v of message.groups) {
            PluginGroup.encode(v!, writer.uint32(10).fork()).ldelim();
        }
        if (message.nextStart.length !== 0) {
            writer.uint32(18).bytes(message.nextStart);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): PluginGroups {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePluginGroups();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.groups.push(
                        PluginGroup.decode(reader, reader.uint32()),
                    );
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.nextStart = reader.bytes();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): PluginGroups {
        return {
            groups: globalThis.Array.isArray(object?.groups)
                ? object.groups.map((e: any) => PluginGroup.fromJSON(e))
                : [],
            nextStart: isSet(object.nextStart)
                ? bytesFromBase64(object.nextStart)
                : new Uint8Array(0),
        };
    },

    toJSON(message: PluginGroups): unknown {
        const obj: any = {};
        if (message.groups?.length) {
            obj.groups = message.groups.map(e => PluginGroup.toJSON(e));
        }
        if (message.nextStart.length !== 0) {
            obj.nextStart = base64FromBytes(message.nextStart);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<PluginGroups>, I>>(
        base?: I,
    ): PluginGroups {
        return PluginGroups.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<PluginGroups>, I>>(
        object: I,
    ): PluginGroups {
        const message = createBasePluginGroups();
        message.groups =
            object.groups?.map(e => PluginGroup.fromPartial(e)) || [];
        message.nextStart = object.nextStart ?? new Uint8Array(0);
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
                    if (tag !== 10) {
                        break;
                    }

                    message.txs.push(Tx.decode(reader, reader.uint32()));
                    continue;
                case 2:
                    if (tag !== 16) {
                        break;
                    }

                    message.numPages = reader.uint32();
                    continue;
                case 3:
                    if (tag !== 24) {
                        break;
                    }

                    message.numTxs = reader.uint32();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): TxHistoryPage {
        return {
            txs: globalThis.Array.isArray(object?.txs)
                ? object.txs.map((e: any) => Tx.fromJSON(e))
                : [],
            numPages: isSet(object.numPages)
                ? globalThis.Number(object.numPages)
                : 0,
            numTxs: isSet(object.numTxs) ? globalThis.Number(object.numTxs) : 0,
        };
    },

    toJSON(message: TxHistoryPage): unknown {
        const obj: any = {};
        if (message.txs?.length) {
            obj.txs = message.txs.map(e => Tx.toJSON(e));
        }
        if (message.numPages !== 0) {
            obj.numPages = Math.round(message.numPages);
        }
        if (message.numTxs !== 0) {
            obj.numTxs = Math.round(message.numTxs);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<TxHistoryPage>, I>>(
        base?: I,
    ): TxHistoryPage {
        return TxHistoryPage.fromPartial(base ?? ({} as any));
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
    return { script: new Uint8Array(0), utxos: [] };
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
                    if (tag !== 10) {
                        break;
                    }

                    message.script = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.utxos.push(
                        ScriptUtxo.decode(reader, reader.uint32()),
                    );
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
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
                : new Uint8Array(0),
            utxos: globalThis.Array.isArray(object?.utxos)
                ? object.utxos.map((e: any) => ScriptUtxo.fromJSON(e))
                : [],
        };
    },

    toJSON(message: ScriptUtxos): unknown {
        const obj: any = {};
        if (message.script.length !== 0) {
            obj.script = base64FromBytes(message.script);
        }
        if (message.utxos?.length) {
            obj.utxos = message.utxos.map(e => ScriptUtxo.toJSON(e));
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<ScriptUtxos>, I>>(
        base?: I,
    ): ScriptUtxos {
        return ScriptUtxos.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<ScriptUtxos>, I>>(
        object: I,
    ): ScriptUtxos {
        const message = createBaseScriptUtxos();
        message.script = object.script ?? new Uint8Array(0);
        message.utxos = object.utxos?.map(e => ScriptUtxo.fromPartial(e)) || [];
        return message;
    },
};

function createBaseUtxos(): Utxos {
    return { utxos: [] };
}

export const Utxos = {
    encode(
        message: Utxos,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        for (const v of message.utxos) {
            Utxo.encode(v!, writer.uint32(10).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): Utxos {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseUtxos();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.utxos.push(Utxo.decode(reader, reader.uint32()));
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): Utxos {
        return {
            utxos: globalThis.Array.isArray(object?.utxos)
                ? object.utxos.map((e: any) => Utxo.fromJSON(e))
                : [],
        };
    },

    toJSON(message: Utxos): unknown {
        const obj: any = {};
        if (message.utxos?.length) {
            obj.utxos = message.utxos.map(e => Utxo.toJSON(e));
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<Utxos>, I>>(base?: I): Utxos {
        return Utxos.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<Utxos>, I>>(object: I): Utxos {
        const message = createBaseUtxos();
        message.utxos = object.utxos?.map(e => Utxo.fromPartial(e)) || [];
        return message;
    },
};

function createBaseBroadcastTxRequest(): BroadcastTxRequest {
    return { rawTx: new Uint8Array(0), skipTokenChecks: false };
}

export const BroadcastTxRequest = {
    encode(
        message: BroadcastTxRequest,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.rawTx.length !== 0) {
            writer.uint32(10).bytes(message.rawTx);
        }
        if (message.skipTokenChecks === true) {
            writer.uint32(16).bool(message.skipTokenChecks);
        }
        return writer;
    },

    decode(
        input: _m0.Reader | Uint8Array,
        length?: number,
    ): BroadcastTxRequest {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBroadcastTxRequest();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.rawTx = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 16) {
                        break;
                    }

                    message.skipTokenChecks = reader.bool();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): BroadcastTxRequest {
        return {
            rawTx: isSet(object.rawTx)
                ? bytesFromBase64(object.rawTx)
                : new Uint8Array(0),
            skipTokenChecks: isSet(object.skipTokenChecks)
                ? globalThis.Boolean(object.skipTokenChecks)
                : false,
        };
    },

    toJSON(message: BroadcastTxRequest): unknown {
        const obj: any = {};
        if (message.rawTx.length !== 0) {
            obj.rawTx = base64FromBytes(message.rawTx);
        }
        if (message.skipTokenChecks === true) {
            obj.skipTokenChecks = message.skipTokenChecks;
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<BroadcastTxRequest>, I>>(
        base?: I,
    ): BroadcastTxRequest {
        return BroadcastTxRequest.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<BroadcastTxRequest>, I>>(
        object: I,
    ): BroadcastTxRequest {
        const message = createBaseBroadcastTxRequest();
        message.rawTx = object.rawTx ?? new Uint8Array(0);
        message.skipTokenChecks = object.skipTokenChecks ?? false;
        return message;
    },
};

function createBaseBroadcastTxResponse(): BroadcastTxResponse {
    return { txid: new Uint8Array(0) };
}

export const BroadcastTxResponse = {
    encode(
        message: BroadcastTxResponse,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.txid.length !== 0) {
            writer.uint32(10).bytes(message.txid);
        }
        return writer;
    },

    decode(
        input: _m0.Reader | Uint8Array,
        length?: number,
    ): BroadcastTxResponse {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBroadcastTxResponse();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.txid = reader.bytes();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): BroadcastTxResponse {
        return {
            txid: isSet(object.txid)
                ? bytesFromBase64(object.txid)
                : new Uint8Array(0),
        };
    },

    toJSON(message: BroadcastTxResponse): unknown {
        const obj: any = {};
        if (message.txid.length !== 0) {
            obj.txid = base64FromBytes(message.txid);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<BroadcastTxResponse>, I>>(
        base?: I,
    ): BroadcastTxResponse {
        return BroadcastTxResponse.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<BroadcastTxResponse>, I>>(
        object: I,
    ): BroadcastTxResponse {
        const message = createBaseBroadcastTxResponse();
        message.txid = object.txid ?? new Uint8Array(0);
        return message;
    },
};

function createBaseBroadcastTxsRequest(): BroadcastTxsRequest {
    return { rawTxs: [], skipTokenChecks: false };
}

export const BroadcastTxsRequest = {
    encode(
        message: BroadcastTxsRequest,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        for (const v of message.rawTxs) {
            writer.uint32(10).bytes(v!);
        }
        if (message.skipTokenChecks === true) {
            writer.uint32(16).bool(message.skipTokenChecks);
        }
        return writer;
    },

    decode(
        input: _m0.Reader | Uint8Array,
        length?: number,
    ): BroadcastTxsRequest {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBroadcastTxsRequest();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.rawTxs.push(reader.bytes());
                    continue;
                case 2:
                    if (tag !== 16) {
                        break;
                    }

                    message.skipTokenChecks = reader.bool();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): BroadcastTxsRequest {
        return {
            rawTxs: globalThis.Array.isArray(object?.rawTxs)
                ? object.rawTxs.map((e: any) => bytesFromBase64(e))
                : [],
            skipTokenChecks: isSet(object.skipTokenChecks)
                ? globalThis.Boolean(object.skipTokenChecks)
                : false,
        };
    },

    toJSON(message: BroadcastTxsRequest): unknown {
        const obj: any = {};
        if (message.rawTxs?.length) {
            obj.rawTxs = message.rawTxs.map(e => base64FromBytes(e));
        }
        if (message.skipTokenChecks === true) {
            obj.skipTokenChecks = message.skipTokenChecks;
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<BroadcastTxsRequest>, I>>(
        base?: I,
    ): BroadcastTxsRequest {
        return BroadcastTxsRequest.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<BroadcastTxsRequest>, I>>(
        object: I,
    ): BroadcastTxsRequest {
        const message = createBaseBroadcastTxsRequest();
        message.rawTxs = object.rawTxs?.map(e => e) || [];
        message.skipTokenChecks = object.skipTokenChecks ?? false;
        return message;
    },
};

function createBaseBroadcastTxsResponse(): BroadcastTxsResponse {
    return { txids: [] };
}

export const BroadcastTxsResponse = {
    encode(
        message: BroadcastTxsResponse,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        for (const v of message.txids) {
            writer.uint32(10).bytes(v!);
        }
        return writer;
    },

    decode(
        input: _m0.Reader | Uint8Array,
        length?: number,
    ): BroadcastTxsResponse {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBroadcastTxsResponse();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.txids.push(reader.bytes());
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): BroadcastTxsResponse {
        return {
            txids: globalThis.Array.isArray(object?.txids)
                ? object.txids.map((e: any) => bytesFromBase64(e))
                : [],
        };
    },

    toJSON(message: BroadcastTxsResponse): unknown {
        const obj: any = {};
        if (message.txids?.length) {
            obj.txids = message.txids.map(e => base64FromBytes(e));
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<BroadcastTxsResponse>, I>>(
        base?: I,
    ): BroadcastTxsResponse {
        return BroadcastTxsResponse.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<BroadcastTxsResponse>, I>>(
        object: I,
    ): BroadcastTxsResponse {
        const message = createBaseBroadcastTxsResponse();
        message.txids = object.txids?.map(e => e) || [];
        return message;
    },
};

function createBaseRawTx(): RawTx {
    return { rawTx: new Uint8Array(0) };
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
                    if (tag !== 10) {
                        break;
                    }

                    message.rawTx = reader.bytes();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
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
                : new Uint8Array(0),
        };
    },

    toJSON(message: RawTx): unknown {
        const obj: any = {};
        if (message.rawTx.length !== 0) {
            obj.rawTx = base64FromBytes(message.rawTx);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<RawTx>, I>>(base?: I): RawTx {
        return RawTx.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<RawTx>, I>>(object: I): RawTx {
        const message = createBaseRawTx();
        message.rawTx = object.rawTx ?? new Uint8Array(0);
        return message;
    },
};

function createBaseWsSub(): WsSub {
    return {
        isUnsub: false,
        blocks: undefined,
        script: undefined,
        tokenId: undefined,
        lokadId: undefined,
        plugin: undefined,
    };
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
        if (message.tokenId !== undefined) {
            WsSubTokenId.encode(
                message.tokenId,
                writer.uint32(34).fork(),
            ).ldelim();
        }
        if (message.lokadId !== undefined) {
            WsSubLokadId.encode(
                message.lokadId,
                writer.uint32(42).fork(),
            ).ldelim();
        }
        if (message.plugin !== undefined) {
            WsPlugin.encode(message.plugin, writer.uint32(50).fork()).ldelim();
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
                    if (tag !== 8) {
                        break;
                    }

                    message.isUnsub = reader.bool();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.blocks = WsSubBlocks.decode(
                        reader,
                        reader.uint32(),
                    );
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }

                    message.script = WsSubScript.decode(
                        reader,
                        reader.uint32(),
                    );
                    continue;
                case 4:
                    if (tag !== 34) {
                        break;
                    }

                    message.tokenId = WsSubTokenId.decode(
                        reader,
                        reader.uint32(),
                    );
                    continue;
                case 5:
                    if (tag !== 42) {
                        break;
                    }

                    message.lokadId = WsSubLokadId.decode(
                        reader,
                        reader.uint32(),
                    );
                    continue;
                case 6:
                    if (tag !== 50) {
                        break;
                    }

                    message.plugin = WsPlugin.decode(reader, reader.uint32());
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): WsSub {
        return {
            isUnsub: isSet(object.isUnsub)
                ? globalThis.Boolean(object.isUnsub)
                : false,
            blocks: isSet(object.blocks)
                ? WsSubBlocks.fromJSON(object.blocks)
                : undefined,
            script: isSet(object.script)
                ? WsSubScript.fromJSON(object.script)
                : undefined,
            tokenId: isSet(object.tokenId)
                ? WsSubTokenId.fromJSON(object.tokenId)
                : undefined,
            lokadId: isSet(object.lokadId)
                ? WsSubLokadId.fromJSON(object.lokadId)
                : undefined,
            plugin: isSet(object.plugin)
                ? WsPlugin.fromJSON(object.plugin)
                : undefined,
        };
    },

    toJSON(message: WsSub): unknown {
        const obj: any = {};
        if (message.isUnsub === true) {
            obj.isUnsub = message.isUnsub;
        }
        if (message.blocks !== undefined) {
            obj.blocks = WsSubBlocks.toJSON(message.blocks);
        }
        if (message.script !== undefined) {
            obj.script = WsSubScript.toJSON(message.script);
        }
        if (message.tokenId !== undefined) {
            obj.tokenId = WsSubTokenId.toJSON(message.tokenId);
        }
        if (message.lokadId !== undefined) {
            obj.lokadId = WsSubLokadId.toJSON(message.lokadId);
        }
        if (message.plugin !== undefined) {
            obj.plugin = WsPlugin.toJSON(message.plugin);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<WsSub>, I>>(base?: I): WsSub {
        return WsSub.fromPartial(base ?? ({} as any));
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
        message.tokenId =
            object.tokenId !== undefined && object.tokenId !== null
                ? WsSubTokenId.fromPartial(object.tokenId)
                : undefined;
        message.lokadId =
            object.lokadId !== undefined && object.lokadId !== null
                ? WsSubLokadId.fromPartial(object.lokadId)
                : undefined;
        message.plugin =
            object.plugin !== undefined && object.plugin !== null
                ? WsPlugin.fromPartial(object.plugin)
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
            if ((tag & 7) === 4 || tag === 0) {
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
        return WsSubBlocks.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<WsSubBlocks>, I>>(
        _: I,
    ): WsSubBlocks {
        const message = createBaseWsSubBlocks();
        return message;
    },
};

function createBaseWsSubScript(): WsSubScript {
    return { scriptType: '', payload: new Uint8Array(0) };
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
                    if (tag !== 10) {
                        break;
                    }

                    message.scriptType = reader.string();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.payload = reader.bytes();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): WsSubScript {
        return {
            scriptType: isSet(object.scriptType)
                ? globalThis.String(object.scriptType)
                : '',
            payload: isSet(object.payload)
                ? bytesFromBase64(object.payload)
                : new Uint8Array(0),
        };
    },

    toJSON(message: WsSubScript): unknown {
        const obj: any = {};
        if (message.scriptType !== '') {
            obj.scriptType = message.scriptType;
        }
        if (message.payload.length !== 0) {
            obj.payload = base64FromBytes(message.payload);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<WsSubScript>, I>>(
        base?: I,
    ): WsSubScript {
        return WsSubScript.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<WsSubScript>, I>>(
        object: I,
    ): WsSubScript {
        const message = createBaseWsSubScript();
        message.scriptType = object.scriptType ?? '';
        message.payload = object.payload ?? new Uint8Array(0);
        return message;
    },
};

function createBaseWsSubTokenId(): WsSubTokenId {
    return { tokenId: '' };
}

export const WsSubTokenId = {
    encode(
        message: WsSubTokenId,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.tokenId !== '') {
            writer.uint32(10).string(message.tokenId);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): WsSubTokenId {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWsSubTokenId();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.tokenId = reader.string();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): WsSubTokenId {
        return {
            tokenId: isSet(object.tokenId)
                ? globalThis.String(object.tokenId)
                : '',
        };
    },

    toJSON(message: WsSubTokenId): unknown {
        const obj: any = {};
        if (message.tokenId !== '') {
            obj.tokenId = message.tokenId;
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<WsSubTokenId>, I>>(
        base?: I,
    ): WsSubTokenId {
        return WsSubTokenId.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<WsSubTokenId>, I>>(
        object: I,
    ): WsSubTokenId {
        const message = createBaseWsSubTokenId();
        message.tokenId = object.tokenId ?? '';
        return message;
    },
};

function createBaseWsSubLokadId(): WsSubLokadId {
    return { lokadId: new Uint8Array(0) };
}

export const WsSubLokadId = {
    encode(
        message: WsSubLokadId,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.lokadId.length !== 0) {
            writer.uint32(10).bytes(message.lokadId);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): WsSubLokadId {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWsSubLokadId();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.lokadId = reader.bytes();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): WsSubLokadId {
        return {
            lokadId: isSet(object.lokadId)
                ? bytesFromBase64(object.lokadId)
                : new Uint8Array(0),
        };
    },

    toJSON(message: WsSubLokadId): unknown {
        const obj: any = {};
        if (message.lokadId.length !== 0) {
            obj.lokadId = base64FromBytes(message.lokadId);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<WsSubLokadId>, I>>(
        base?: I,
    ): WsSubLokadId {
        return WsSubLokadId.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<WsSubLokadId>, I>>(
        object: I,
    ): WsSubLokadId {
        const message = createBaseWsSubLokadId();
        message.lokadId = object.lokadId ?? new Uint8Array(0);
        return message;
    },
};

function createBaseWsPlugin(): WsPlugin {
    return { pluginName: '', group: new Uint8Array(0) };
}

export const WsPlugin = {
    encode(
        message: WsPlugin,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.pluginName !== '') {
            writer.uint32(10).string(message.pluginName);
        }
        if (message.group.length !== 0) {
            writer.uint32(18).bytes(message.group);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): WsPlugin {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWsPlugin();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.pluginName = reader.string();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.group = reader.bytes();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): WsPlugin {
        return {
            pluginName: isSet(object.pluginName)
                ? globalThis.String(object.pluginName)
                : '',
            group: isSet(object.group)
                ? bytesFromBase64(object.group)
                : new Uint8Array(0),
        };
    },

    toJSON(message: WsPlugin): unknown {
        const obj: any = {};
        if (message.pluginName !== '') {
            obj.pluginName = message.pluginName;
        }
        if (message.group.length !== 0) {
            obj.group = base64FromBytes(message.group);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<WsPlugin>, I>>(base?: I): WsPlugin {
        return WsPlugin.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<WsPlugin>, I>>(
        object: I,
    ): WsPlugin {
        const message = createBaseWsPlugin();
        message.pluginName = object.pluginName ?? '';
        message.group = object.group ?? new Uint8Array(0);
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
                    if (tag !== 10) {
                        break;
                    }

                    message.error = Error.decode(reader, reader.uint32());
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.block = MsgBlock.decode(reader, reader.uint32());
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }

                    message.tx = MsgTx.decode(reader, reader.uint32());
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
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
        if (message.error !== undefined) {
            obj.error = Error.toJSON(message.error);
        }
        if (message.block !== undefined) {
            obj.block = MsgBlock.toJSON(message.block);
        }
        if (message.tx !== undefined) {
            obj.tx = MsgTx.toJSON(message.tx);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<WsMsg>, I>>(base?: I): WsMsg {
        return WsMsg.fromPartial(base ?? ({} as any));
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

function createBaseCoinbaseData(): CoinbaseData {
    return { coinbaseScriptsig: new Uint8Array(0), coinbaseOutputs: [] };
}

export const CoinbaseData = {
    encode(
        message: CoinbaseData,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.coinbaseScriptsig.length !== 0) {
            writer.uint32(10).bytes(message.coinbaseScriptsig);
        }
        for (const v of message.coinbaseOutputs) {
            TxOutput.encode(v!, writer.uint32(18).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): CoinbaseData {
        const reader =
            input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseCoinbaseData();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }

                    message.coinbaseScriptsig = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.coinbaseOutputs.push(
                        TxOutput.decode(reader, reader.uint32()),
                    );
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): CoinbaseData {
        return {
            coinbaseScriptsig: isSet(object.coinbaseScriptsig)
                ? bytesFromBase64(object.coinbaseScriptsig)
                : new Uint8Array(0),
            coinbaseOutputs: globalThis.Array.isArray(object?.coinbaseOutputs)
                ? object.coinbaseOutputs.map((e: any) => TxOutput.fromJSON(e))
                : [],
        };
    },

    toJSON(message: CoinbaseData): unknown {
        const obj: any = {};
        if (message.coinbaseScriptsig.length !== 0) {
            obj.coinbaseScriptsig = base64FromBytes(message.coinbaseScriptsig);
        }
        if (message.coinbaseOutputs?.length) {
            obj.coinbaseOutputs = message.coinbaseOutputs.map(e =>
                TxOutput.toJSON(e),
            );
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<CoinbaseData>, I>>(
        base?: I,
    ): CoinbaseData {
        return CoinbaseData.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<CoinbaseData>, I>>(
        object: I,
    ): CoinbaseData {
        const message = createBaseCoinbaseData();
        message.coinbaseScriptsig =
            object.coinbaseScriptsig ?? new Uint8Array(0);
        message.coinbaseOutputs =
            object.coinbaseOutputs?.map(e => TxOutput.fromPartial(e)) || [];
        return message;
    },
};

function createBaseMsgBlock(): MsgBlock {
    return {
        msgType: 0,
        blockHash: new Uint8Array(0),
        blockHeight: 0,
        blockTimestamp: '0',
        coinbaseData: undefined,
    };
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
        if (message.blockTimestamp !== '0') {
            writer.uint32(32).int64(message.blockTimestamp);
        }
        if (message.coinbaseData !== undefined) {
            CoinbaseData.encode(
                message.coinbaseData,
                writer.uint32(42).fork(),
            ).ldelim();
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
                    if (tag !== 8) {
                        break;
                    }

                    message.msgType = reader.int32() as any;
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.blockHash = reader.bytes();
                    continue;
                case 3:
                    if (tag !== 24) {
                        break;
                    }

                    message.blockHeight = reader.int32();
                    continue;
                case 4:
                    if (tag !== 32) {
                        break;
                    }

                    message.blockTimestamp = longToString(
                        reader.int64() as Long,
                    );
                    continue;
                case 5:
                    if (tag !== 42) {
                        break;
                    }

                    message.coinbaseData = CoinbaseData.decode(
                        reader,
                        reader.uint32(),
                    );
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
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
                : new Uint8Array(0),
            blockHeight: isSet(object.blockHeight)
                ? globalThis.Number(object.blockHeight)
                : 0,
            blockTimestamp: isSet(object.blockTimestamp)
                ? globalThis.String(object.blockTimestamp)
                : '0',
            coinbaseData: isSet(object.coinbaseData)
                ? CoinbaseData.fromJSON(object.coinbaseData)
                : undefined,
        };
    },

    toJSON(message: MsgBlock): unknown {
        const obj: any = {};
        if (message.msgType !== 0) {
            obj.msgType = blockMsgTypeToJSON(message.msgType);
        }
        if (message.blockHash.length !== 0) {
            obj.blockHash = base64FromBytes(message.blockHash);
        }
        if (message.blockHeight !== 0) {
            obj.blockHeight = Math.round(message.blockHeight);
        }
        if (message.blockTimestamp !== '0') {
            obj.blockTimestamp = message.blockTimestamp;
        }
        if (message.coinbaseData !== undefined) {
            obj.coinbaseData = CoinbaseData.toJSON(message.coinbaseData);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<MsgBlock>, I>>(base?: I): MsgBlock {
        return MsgBlock.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<MsgBlock>, I>>(
        object: I,
    ): MsgBlock {
        const message = createBaseMsgBlock();
        message.msgType = object.msgType ?? 0;
        message.blockHash = object.blockHash ?? new Uint8Array(0);
        message.blockHeight = object.blockHeight ?? 0;
        message.blockTimestamp = object.blockTimestamp ?? '0';
        message.coinbaseData =
            object.coinbaseData !== undefined && object.coinbaseData !== null
                ? CoinbaseData.fromPartial(object.coinbaseData)
                : undefined;
        return message;
    },
};

function createBaseMsgTx(): MsgTx {
    return { msgType: 0, txid: new Uint8Array(0) };
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
                    if (tag !== 8) {
                        break;
                    }

                    message.msgType = reader.int32() as any;
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }

                    message.txid = reader.bytes();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
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
                : new Uint8Array(0),
        };
    },

    toJSON(message: MsgTx): unknown {
        const obj: any = {};
        if (message.msgType !== 0) {
            obj.msgType = txMsgTypeToJSON(message.msgType);
        }
        if (message.txid.length !== 0) {
            obj.txid = base64FromBytes(message.txid);
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<MsgTx>, I>>(base?: I): MsgTx {
        return MsgTx.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<MsgTx>, I>>(object: I): MsgTx {
        const message = createBaseMsgTx();
        message.msgType = object.msgType ?? 0;
        message.txid = object.txid ?? new Uint8Array(0);
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
            if ((tag & 7) === 4 || tag === 0) {
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
        return Empty.fromPartial(base ?? ({} as any));
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
                    if (tag !== 18) {
                        break;
                    }

                    message.msg = reader.string();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },

    fromJSON(object: any): Error {
        return { msg: isSet(object.msg) ? globalThis.String(object.msg) : '' };
    },

    toJSON(message: Error): unknown {
        const obj: any = {};
        if (message.msg !== '') {
            obj.msg = message.msg;
        }
        return obj;
    },

    create<I extends Exact<DeepPartial<Error>, I>>(base?: I): Error {
        return Error.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<Error>, I>>(object: I): Error {
        const message = createBaseError();
        message.msg = object.msg ?? '';
        return message;
    },
};

function bytesFromBase64(b64: string): Uint8Array {
    if (globalThis.Buffer) {
        return Uint8Array.from(globalThis.Buffer.from(b64, 'base64'));
    } else {
        const bin = globalThis.atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; ++i) {
            arr[i] = bin.charCodeAt(i);
        }
        return arr;
    }
}

function base64FromBytes(arr: Uint8Array): string {
    if (globalThis.Buffer) {
        return globalThis.Buffer.from(arr).toString('base64');
    } else {
        const bin: string[] = [];
        arr.forEach(byte => {
            bin.push(globalThis.String.fromCharCode(byte));
        });
        return globalThis.btoa(bin.join(''));
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
    : T extends globalThis.Array<infer U>
    ? globalThis.Array<DeepPartial<U>>
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

function isObject(value: any): boolean {
    return typeof value === 'object' && value !== null;
}

function isSet(value: any): boolean {
    return value !== null && value !== undefined;
}
