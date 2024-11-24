// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { fromHex, fromHexRev } from '../io/hex.js';
import { strToBytes } from '../io/str.js';
import { Writer } from '../io/writer.js';
import { WriterBytes } from '../io/writerbytes.js';
import { WriterLength } from '../io/writerlength.js';
import { Amount, BURN, GENESIS, GenesisInfo, MINT, SEND } from './common.js';

/** LOKAD ID for ALP */
export const ALP_LOKAD_ID = strToBytes('SLP2');

/** ALP standard token type number */
export const ALP_STANDARD = 0;

/** Mint data specifying mint amounts and batons of a GENESIS/MINT tx */
export interface MintData {
    /**
     * List of amounts to be minted by this tx, each having their own tx output.
     */
    amounts: Amount[];
    /** Number of mint batons to create, each having their own tx output. */
    numBatons: number;
}

/** Build an ALP GENESIS pushdata section, creating a new ALP token */
export function alpGenesis(
    tokenType: number,
    genesisInfo: GenesisInfo,
    mintData: MintData,
): Uint8Array {
    const writeSection = (writer: Writer) => {
        writer.putBytes(ALP_LOKAD_ID);
        writer.putU8(tokenType);
        putVarBytes(GENESIS, writer);
        putVarBytes(strToBytes(genesisInfo.tokenTicker ?? ''), writer);
        putVarBytes(strToBytes(genesisInfo.tokenName ?? ''), writer);
        putVarBytes(strToBytes(genesisInfo.url ?? ''), writer);
        putVarBytes(fromHex(genesisInfo.data ?? ''), writer);
        putVarBytes(fromHex(genesisInfo.authPubkey ?? ''), writer);
        writer.putU8(genesisInfo.decimals ?? 0);
        putMintData(mintData, writer);
    };
    const writerLength = new WriterLength();
    writeSection(writerLength);
    const writerBytes = new WriterBytes(writerLength.length);
    writeSection(writerBytes);
    return writerBytes.data;
}

/**
 * Build an ALP MINT pushdata section, creating new ALP tokens and mint batons
 * of the given token ID.
 **/
export function alpMint(
    tokenId: string,
    tokenType: number,
    mintData: MintData,
): Uint8Array {
    const tokenIdBytes = fromHexRev(tokenId);
    const writeSection = (writer: Writer) => {
        writer.putBytes(ALP_LOKAD_ID);
        writer.putU8(tokenType);
        putVarBytes(MINT, writer);
        writer.putBytes(tokenIdBytes);
        putMintData(mintData, writer);
    };
    const writerLength = new WriterLength();
    writeSection(writerLength);
    const writerBytes = new WriterBytes(writerLength.length);
    writeSection(writerBytes);
    return writerBytes.data;
}

/**
 * Build an ALP SEND pushdata section, moving ALP tokens to different outputs
 **/
export function alpSend(
    tokenId: string,
    tokenType: number,
    sendAmounts: Amount[],
): Uint8Array {
    const tokenIdBytes = fromHexRev(tokenId);
    const writeSection = (writer: Writer) => {
        writer.putBytes(ALP_LOKAD_ID);
        writer.putU8(tokenType);
        writer.putU8(SEND.length);
        writer.putBytes(SEND);
        writer.putBytes(tokenIdBytes);
        writer.putU8(sendAmounts.length);
        for (const amount of sendAmounts) {
            putAlpAmount(amount, writer);
        }
    };
    const writerLength = new WriterLength();
    writeSection(writerLength);
    const writerBytes = new WriterBytes(writerLength.length);
    writeSection(writerBytes);
    return writerBytes.data;
}

/** Build an ALP BURN pushdata section, intentionally burning ALP tokens. */
export function alpBurn(
    tokenId: string,
    tokenType: number,
    burnAmount: Amount,
): Uint8Array {
    const tokenIdBytes = fromHexRev(tokenId);
    const writeSection = (writer: Writer) => {
        writer.putBytes(ALP_LOKAD_ID);
        writer.putU8(tokenType);
        writer.putU8(BURN.length);
        writer.putBytes(BURN);
        writer.putBytes(tokenIdBytes);
        putAlpAmount(burnAmount, writer);
    };
    const writerLength = new WriterLength();
    writeSection(writerLength);
    const writerBytes = new WriterBytes(writerLength.length);
    writeSection(writerBytes);
    return writerBytes.data;
}

function putMintData(mintData: MintData, writer: Writer) {
    writer.putU8(mintData.amounts.length);
    for (const amount of mintData.amounts) {
        putAlpAmount(amount, writer);
    }
    writer.putU8(mintData.numBatons);
}

function putAlpAmount(amount: Amount, writer: Writer) {
    const amountN = BigInt(amount);
    writer.putU32(amountN & 0xffffffffn);
    writer.putU16(amountN >> 32n);
}

function putVarBytes(bytes: Uint8Array, writer: Writer) {
    if (bytes.length > 127) {
        throw new Error('Length of bytes must be between 0 and 127');
    }
    writer.putU8(bytes.length);
    writer.putBytes(bytes);
}
