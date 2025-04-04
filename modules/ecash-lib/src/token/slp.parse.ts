// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { bytesToStr } from '../io/str.js';
import { toHex } from '../io/hex.js';
import { OP_RETURN } from '../opcode.js';
import { isPushOp } from '../op.js';
import { Script, ScriptOpIter } from '../script.js';
import {
    BURN_STR,
    GENESIS_STR,
    GenesisInfo,
    MAX_DECIMALS,
    MINT_STR,
    SEND_STR,
    TOKEN_ID_NUM_BYTES,
    UNKNOWN_STR,
} from './common.js';
import {
    SLP_ATOMS_NUM_BYTES,
    SLP_FUNGIBLE,
    SLP_GENESIS_HASH_NUM_BYTES,
    SLP_LOKAD_ID_STR,
    SLP_MAX_SEND_OUTPUTS,
    SLP_MINT_VAULT,
    SLP_MINT_VAULT_SCRIPTHASH_NUM_BYTES,
    SLP_NFT1_CHILD,
    SLP_NFT1_GROUP,
    SlpTokenType,
} from './slp.js';

/** Parsed SLP GENESIS OP_RETURN Script */
export interface SlpGenesis {
    /** "GENESIS" */
    txType: typeof GENESIS_STR;
    /** Token type of the token to create */
    tokenType: SlpTokenType;
    /** Info about the token */
    genesisInfo: GenesisInfo;
    /** Number of token atoms to initially mint to out_idx=1 */
    initialAtoms: bigint;
    /** Output index to send the mint baton to, or undefined if none */
    mintBatonOutIdx?: number;
}

/**
 * Parsed SLP MINT (token type 0x01 and 0x81) OP_RETURN Script.
 * Note: Token type 0x41 has no mint batons.
 **/
export interface SlpMintClassic {
    /** "MINT" */
    txType: typeof MINT_STR;
    /** Token type of the token to mint */
    tokenType: typeof SLP_FUNGIBLE | typeof SLP_NFT1_GROUP;
    /** Token ID of the token to mint */
    tokenId: string;
    /** Number of token atoms to mint to out_idx=1 */
    additionalAtoms: bigint;
    /** Output index to send the mint baton to, or undefined to destroy it */
    mintBatonOutIdx?: number;
}

/** Parsed SLP MINT (token type 0x02) OP_RETURN Script */
export interface SlpMintVault {
    /** "MINT" */
    txType: typeof MINT_STR;
    /** Token type of the token to mint (0x02) */
    tokenType: typeof SLP_MINT_VAULT;
    /** Token ID of the token to mint */
    tokenId: string;
    /** Array of the number of token atoms to mint to the outputs at 1 to N */
    additionalAtomsArray: bigint[];
}

/** Parsed SLP MINT OP_RETURN Script */
export type SlpMint = SlpMintClassic | SlpMintVault;

/** Parsed SLP SEND OP_RETURN Script */
export interface SlpSend {
    /** "SEND" */
    txType: typeof SEND_STR;
    /** Token type of the token to send */
    tokenType: SlpTokenType;
    /** Token ID of the token to send */
    tokenId: string;
    /** Array of the number of token atoms to send to the outputs at 1 to N */
    sendAtomsArray: bigint[];
}

/** Parsed SLP BURN OP_RETURN Script */
export interface SlpBurn {
    /** "BURN" */
    txType: typeof BURN_STR;
    /** Token type of the token to burn */
    tokenType: SlpTokenType;
    /** Token ID of the token to burn */
    tokenId: string;
    /** How many tokens should be burned */
    burnAtoms: bigint;
}

/** New unknown SLP token type or tx type */
export interface SlpUnknown {
    /** Placeholder for unknown token type or tx type */
    txType: typeof UNKNOWN_STR;
    /** Token type number */
    tokenType: number;
}

/** Parsed SLP OP_RETURN Script */
export type SlpData = SlpGenesis | SlpMint | SlpSend | SlpBurn | SlpUnknown;

/**
 * Parse the given SLP OP_RETURN Script.
 *
 * For data that's clearly not SLP it will return `undefined`.
 * For example, if the OP_RETURN or LOKAD ID is missing.
 *
 * For an unknown token type, it'll return SlpUnknown.
 *
 * For a known token type, it'll parse the remaining data, or throw an error if
 * the format is invalid or if there's an unknown tx type.
 *
 * This behavior mirrors that of Chronik for consistency.
 **/
export function parseSlp(opreturnScript: Script): SlpData | undefined {
    const ops = opreturnScript.ops();
    const opreturnOp = ops.next();

    // Return undefined if not OP_RETURN
    if (
        opreturnOp === undefined ||
        isPushOp(opreturnOp) ||
        opreturnOp !== OP_RETURN
    ) {
        return undefined;
    }

    // Return undefined if LOKAD ID is not "SLP\0"
    const lokadId = ops.next();
    if (lokadId === undefined || !isPushOp(lokadId)) {
        return undefined;
    }
    if (bytesToStr(lokadId.data) !== SLP_LOKAD_ID_STR) {
        return undefined;
    }

    // Parse token type
    const tokenTypeBytes = nextBytes(ops);
    if (tokenTypeBytes === undefined) {
        throw new Error('Missing tokenType');
    }
    if (tokenTypeBytes.length !== 1) {
        throw new Error('tokenType must be exactly 1 byte');
    }
    const tokenType = tokenTypeBytes[0];
    if (
        tokenType !== SLP_FUNGIBLE &&
        tokenType !== SLP_MINT_VAULT &&
        tokenType !== SLP_NFT1_GROUP &&
        tokenType !== SLP_NFT1_CHILD
    ) {
        return {
            txType: UNKNOWN_STR,
            tokenType,
        };
    }

    // Parse tx type (GENESIS, MINT, SEND, BURN)
    const txTypeBytes = nextBytes(ops);
    if (txTypeBytes === undefined) {
        throw new Error('Missing txType');
    }
    const txType = bytesToStr(txTypeBytes);

    // Handle tx type specific parsing.
    // Advances the `ops` Script iterator
    switch (txType) {
        case GENESIS_STR:
            return nextGenesis(ops, tokenType);
        case MINT_STR:
            return nextMint(ops, tokenType);
        case SEND_STR:
            return nextSend(ops, tokenType);
        case BURN_STR:
            return nextBurn(ops, tokenType);
        default:
            throw new Error('Unknown txType');
    }
}

function nextGenesis(ops: ScriptOpIter, tokenType: SlpTokenType): SlpGenesis {
    // Parse genesis info
    const tokenTicker = bytesToStr(nextBytesRequired(ops, 'tokenTicker'));
    const tokenName = bytesToStr(nextBytesRequired(ops, 'tokenName'));
    const url = bytesToStr(nextBytesRequired(ops, 'url'));
    const hash = nextBytesRequired(ops, 'hash');
    if (hash.length !== 0 && hash.length !== SLP_GENESIS_HASH_NUM_BYTES) {
        throw new Error(
            `hash must be either 0 or ${SLP_GENESIS_HASH_NUM_BYTES} bytes`,
        );
    }
    const decimalsBytes = nextBytesRequired(ops, 'decimals');
    if (decimalsBytes.length !== 1) {
        throw new Error('decimals must be exactly 1 byte');
    }
    const decimals = decimalsBytes[0];
    if (decimals > MAX_DECIMALS) {
        throw new Error(`decimals must be at most ${MAX_DECIMALS}`);
    }

    // Parse mint data
    let mintVaultScripthash: string | undefined = undefined;
    let mintBatonOutIdx: number | undefined = undefined;
    if (tokenType === SLP_MINT_VAULT) {
        const scripthashBytes = nextBytesRequired(ops, 'mintVaultScripthash');
        if (scripthashBytes.length !== SLP_MINT_VAULT_SCRIPTHASH_NUM_BYTES) {
            throw new Error(
                `mintVaultScripthash must be exactly ${SLP_MINT_VAULT_SCRIPTHASH_NUM_BYTES} ` +
                    'bytes long',
            );
        }
        mintVaultScripthash = toHex(scripthashBytes);
    } else {
        mintBatonOutIdx = nextMintOutIdx(ops, tokenType);
    }
    const initialAtoms = parseSlpAtoms(nextBytesRequired(ops, 'initialAtoms'));
    nextEnd(ops, 'GENESIS');
    return {
        txType: GENESIS_STR,
        tokenType,
        genesisInfo: {
            tokenTicker,
            tokenName,
            url,
            hash: hash.length !== 0 ? toHex(hash) : undefined,
            mintVaultScripthash,
            decimals,
        },
        initialAtoms,
        mintBatonOutIdx,
    };
}

function nextMint(ops: ScriptOpIter, tokenType: SlpTokenType): SlpMint {
    const tokenId = nextTokenId(ops);
    if (tokenType === SLP_MINT_VAULT) {
        const additionalAtomsArray = nextSlpAtomsArray(ops);
        return {
            txType: MINT_STR,
            tokenType,
            tokenId,
            additionalAtomsArray,
        };
    } else if (tokenType === SLP_NFT1_CHILD) {
        throw new Error('SLP_NFT1_CHILD cannot have MINT transactions');
    } else {
        const mintBatonOutIdx = nextMintOutIdx(ops, tokenType);
        const additionalAtoms = parseSlpAtoms(
            nextBytesRequired(ops, 'additionalAtoms'),
        );
        nextEnd(ops, 'MINT');
        return {
            txType: MINT_STR,
            tokenType,
            tokenId,
            additionalAtoms,
            mintBatonOutIdx,
        };
    }
}

function nextSend(ops: ScriptOpIter, tokenType: SlpTokenType): SlpSend {
    const tokenId = nextTokenId(ops);
    const sendAtomsArray = nextSlpAtomsArray(ops);
    return {
        txType: SEND_STR,
        tokenType,
        tokenId,
        sendAtomsArray,
    };
}

function nextBurn(ops: ScriptOpIter, tokenType: SlpTokenType): SlpBurn {
    const tokenId = nextTokenId(ops);
    const burnAtoms = parseSlpAtoms(nextBytesRequired(ops, 'burnAtoms'));
    nextEnd(ops, 'BURN');
    return {
        txType: BURN_STR,
        tokenType,
        tokenId,
        burnAtoms,
    };
}

function nextBytes(iter: ScriptOpIter): Uint8Array | undefined {
    const op = iter.next();
    if (op === undefined) {
        return undefined;
    }
    if (!isPushOp(op)) {
        throw new Error('SLP only supports push-ops');
    }
    return op.data;
}

function nextBytesRequired(iter: ScriptOpIter, name: string): Uint8Array {
    const bytes = nextBytes(iter);
    if (bytes === undefined) {
        throw new Error('Missing ' + name);
    }
    return bytes;
}

function nextMintOutIdx(
    iter: ScriptOpIter,
    tokenType: number,
): number | undefined {
    const outIdxBytes = nextBytesRequired(iter, 'mintBatonOutIdx');
    if (outIdxBytes.length > 1) {
        throw new Error('mintBatonOutIdx must be at most 1 byte long');
    }
    if (outIdxBytes.length === 1) {
        if (tokenType === SLP_NFT1_CHILD) {
            throw new Error('SLP_NFT1_CHILD cannot have a mint baton');
        }
        const mintBatonOutIdx = outIdxBytes[0];
        if (mintBatonOutIdx < 2) {
            throw new Error('mintBatonOutIdx must be at least 2');
        }
        return mintBatonOutIdx;
    }
    return undefined;
}

function nextTokenId(iter: ScriptOpIter): string {
    const tokenIdBytes = nextBytesRequired(iter, 'tokenId');
    if (tokenIdBytes.length !== TOKEN_ID_NUM_BYTES) {
        throw new Error(
            `tokenId must be exactly ${TOKEN_ID_NUM_BYTES} bytes long`,
        );
    }
    // Note: SLP token ID endianness is big-endian
    return toHex(tokenIdBytes);
}

function nextSlpAtomsArray(iter: ScriptOpIter): bigint[] {
    const atomsArray = [];
    let bytes: Uint8Array | undefined = undefined;
    while ((bytes = nextBytes(iter)) !== undefined) {
        atomsArray.push(parseSlpAtoms(bytes));
    }
    if (atomsArray.length === 0) {
        throw new Error('atomsArray cannot be empty');
    }
    if (atomsArray.length > SLP_MAX_SEND_OUTPUTS) {
        throw new Error(
            `atomsArray can at most be ${SLP_MAX_SEND_OUTPUTS} items long`,
        );
    }
    return atomsArray;
}

function nextEnd(iter: ScriptOpIter, txType: string) {
    if (iter.next() !== undefined) {
        throw new Error(`Superfluous ${txType} bytes`);
    }
}

function parseSlpAtoms(bytes: Uint8Array): bigint {
    if (bytes.length !== SLP_ATOMS_NUM_BYTES) {
        throw new Error(
            `SLP atoms must be exactly ${SLP_ATOMS_NUM_BYTES} bytes long`,
        );
    }
    let number = 0n;
    for (let i = 0; i < SLP_ATOMS_NUM_BYTES; ++i) {
        number <<= 8n;
        number |= BigInt(bytes[i]);
    }
    return number;
}
