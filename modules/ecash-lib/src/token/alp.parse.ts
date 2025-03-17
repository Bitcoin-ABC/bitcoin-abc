// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { toHex, toHexRev } from '../io/hex.js';
import { bytesToStr } from '../io/str.js';
import { Bytes } from '../io/bytes.js';
import {
    ALP_LOKAD_ID,
    ALP_MAX_SIZE,
    ALP_STANDARD,
    AlpTokenType_Number,
    MintData,
} from './alp.js';
import {
    BURN_STR,
    GENESIS_STR,
    GenesisInfo,
    MINT_STR,
    SEND_STR,
    TOKEN_ID_NUM_BYTES,
    UNKNOWN_STR,
} from './common.js';

/**
 * Parsed ALP GENESIS pushdata.
 * Note: This must always be the first eMPP pushdata.
 **/
export interface AlpGenesis {
    /** "GENESIS" */
    txType: typeof GENESIS_STR;
    /** Token type of the token to create */
    tokenType: AlpTokenType_Number;
    /** Info about the token */
    genesisInfo: GenesisInfo;
    /** Which tokens/mint baton to create initially */
    mintData: MintData;
}

/** Parsed ALP MINT pushdata. */
export interface AlpMint {
    /** "MINT" */
    txType: typeof MINT_STR;
    /** Token type of the token to mint */
    tokenType: AlpTokenType_Number;
    /** Token ID of the token to mint */
    tokenId: string;
    /** Which tokens/mint baton to create  */
    mintData: MintData;
}

/** Parsed ALP SEND pushdata. */
export interface AlpSend {
    /** "SEND" */
    txType: typeof SEND_STR;
    /** Token type of the token to send */
    tokenType: AlpTokenType_Number;
    /** Token ID of the token to send */
    tokenId: string;
    /** Array of the number of token atoms to send to the outputs at 1 to N */
    sendAtomsArray: bigint[];
}

/** Parsed ALP BURN pushdata */
export interface AlpBurn {
    /** "BURN" */
    txType: typeof BURN_STR;
    /** Token type of the token to burn */
    tokenId: string;
    /** Token ID of the token to burn */
    tokenType: AlpTokenType_Number;
    /** How many tokens should be burned */
    burnAtoms: bigint;
}

/** New unknown ALP token type */
export interface AlpUnknown {
    /** Placeholder for unknown token type or tx type */
    txType: typeof UNKNOWN_STR;
    /** Token type number */
    tokenType: number;
}

/** Parsed ALP pushdata */
export type AlpData = AlpGenesis | AlpMint | AlpSend | AlpBurn | AlpUnknown;

/**
 * Parse the given ALP pushdata. eMPP allows multiple pushdata per OP_RETURN.
 *
 * For data that's clearly not ALP (i.e. doesn't start with LOKAD ID "SLP2"),
 * it will return `undefined`.
 *
 * For an unknown token type, it'll return AlpUnknown.
 *
 * For a known token type, it'll parse the remaining data, or throw an error if
 * the format is invalid or if there's an unknown tx type.
 *
 * This behavior mirrors that of Chronik for consistency.
 **/
export function parseAlp(pushdata: Uint8Array): AlpData | undefined {
    // Must have at least 4 bytes for the LOKAD ID
    if (pushdata.length < ALP_LOKAD_ID.length) {
        return undefined;
    }

    const bytes = new Bytes(pushdata);

    // If the pushdata doesn't start with "SLP2" (ALP's LOKAD ID), return undefined
    const lokadId = bytesToStr(bytes.readBytes(ALP_LOKAD_ID.length));
    if (lokadId != bytesToStr(ALP_LOKAD_ID)) {
        return undefined;
    }

    // Return UNKNOWN for unknown token types (only "STANDARD" known so far)
    const tokenType = readU8(bytes, 'tokenType');
    if (tokenType != ALP_STANDARD) {
        return {
            txType: 'UNKNOWN',
            tokenType,
        };
    }

    // Parse tx type (GENESIS, MINT, SEND, BURN)
    const txType = bytesToStr(readVarBytes(bytes, 'txType'));

    // Handle tx type specific parsing
    switch (txType) {
        case GENESIS_STR:
            return readGenesis(bytes, tokenType);
        case MINT_STR:
            return readMint(bytes, tokenType);
        case SEND_STR:
            return readSend(bytes, tokenType);
        case BURN_STR:
            return readBurn(bytes, tokenType);
        default:
            throw new Error('Unknown txType');
    }
}

function readGenesis(bytes: Bytes, tokenType: AlpTokenType_Number): AlpGenesis {
    const tokenTicker = bytesToStr(readVarBytes(bytes, 'tokenTicker'));
    const tokenName = bytesToStr(readVarBytes(bytes, 'tokenName'));
    const url = bytesToStr(readVarBytes(bytes, 'url'));
    const data = readVarBytes(bytes, 'data');
    const authPubkey = readVarBytes(bytes, 'authPubkey');
    const decimals = readU8(bytes, 'decimals');
    const mintData = readMintData(bytes);
    ensureEnd(bytes, 'GENESIS');
    return {
        txType: GENESIS_STR,
        tokenType,
        genesisInfo: {
            tokenTicker,
            tokenName,
            url,
            data: toHex(data),
            authPubkey: toHex(authPubkey),
            decimals,
        },
        mintData,
    };
}

function readMint(bytes: Bytes, tokenType: AlpTokenType_Number): AlpMint {
    const tokenId = readTokenId(bytes);
    const mintData = readMintData(bytes);
    ensureEnd(bytes, 'MINT');
    return {
        txType: MINT_STR,
        tokenType,
        tokenId,
        mintData,
    };
}

function readSend(bytes: Bytes, tokenType: AlpTokenType_Number): AlpSend {
    const tokenId = readTokenId(bytes);
    const sendAtomsArray = readAtomsArray(bytes, 'sendAtomsArray');
    ensureEnd(bytes, 'SEND');
    return {
        txType: SEND_STR,
        tokenType,
        tokenId,
        sendAtomsArray,
    };
}

function readBurn(bytes: Bytes, tokenType: AlpTokenType_Number): AlpBurn {
    const tokenId = readTokenId(bytes);
    const burnAtoms = readU48(bytes, 'burnAtoms');
    ensureEnd(bytes, 'BURN');
    return {
        txType: BURN_STR,
        tokenType,
        tokenId,
        burnAtoms,
    };
}

function readU8(bytes: Bytes, name: string): number {
    if (bytes.idx >= bytes.data.length) {
        throw new Error(`Missing ${name}`);
    }
    return bytes.readU8();
}

function readU48(bytes: Bytes, name: string): bigint {
    if (bytes.idx >= bytes.data.length) {
        throw new Error(`Missing ${name}`);
    }
    return bytes.readU48();
}

function readTokenId(bytes: Bytes): string {
    // Note: ALP token ID endianness is little-endian (like in prevOut)
    return toHexRev(bytes.readBytes(TOKEN_ID_NUM_BYTES));
}

function readSize(bytes: Bytes, name: string): number {
    const size = readU8(bytes, name);
    if (size > ALP_MAX_SIZE) {
        throw new Error(`Size must be between 0 and ${ALP_MAX_SIZE}`);
    }
    return size;
}

function readVarBytes(bytes: Bytes, name: string): Uint8Array {
    const numBytes = readSize(bytes, name);
    return bytes.readBytes(numBytes);
}

function readAtomsArray(bytes: Bytes, name: string): bigint[] {
    const numAtoms = readSize(bytes, name);
    const atomsArray = [];
    for (let i = 0; i < numAtoms; ++i) {
        atomsArray.push(bytes.readU48());
    }
    return atomsArray;
}

function readMintData(bytes: Bytes): MintData {
    const atomsArray = readAtomsArray(bytes, 'atomsArray');
    const numBatons = readU8(bytes, 'numBatons');
    if (numBatons > ALP_MAX_SIZE) {
        throw new Error(`numBatons must be between 0 and ${ALP_MAX_SIZE}`);
    }
    return {
        atomsArray,
        numBatons,
    };
}

function ensureEnd(bytes: Bytes, txType: string) {
    if (bytes.idx < bytes.data.length) {
        throw new Error(`Superfluous ${txType} bytes`);
    }
}
