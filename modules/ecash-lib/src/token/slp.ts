// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { fromHex } from '../io/hex.js';
import { strToBytes } from '../io/str.js';
import { Op, pushBytesOp } from '../op.js';
import { OP_PUSHDATA1, OP_RETURN } from '../opcode.js';
import { Script } from '../script.js';
import { BURN, GENESIS, GenesisInfo, MINT, SEND } from './common.js';

/** LOKAD ID for SLP */
export const SLP_LOKAD_ID_STR = 'SLP\0';
/** LOKAD ID for SLP */
export const SLP_LOKAD_ID = strToBytes(SLP_LOKAD_ID_STR);

/** SLP fungible token type number */
export const SLP_FUNGIBLE = 1;
/** SLP MINT Vault token type number */
export const SLP_MINT_VAULT = 2;
/** SLP NFT1 Child token type number */
export const SLP_NFT1_CHILD = 0x41;
/** SLP NFT1 Group token type number */
export const SLP_NFT1_GROUP = 0x81;

/** How many bytes the GENESIS `hash` field must have (or 0) */
export const SLP_GENESIS_HASH_NUM_BYTES = 32;

/** How many bytes the GENESIS `mintVaultScripthash` field must have */
export const SLP_MINT_VAULT_SCRIPTHASH_NUM_BYTES = 20;

/** How many outputs a SEND can specify at most */
export const SLP_MAX_SEND_OUTPUTS = 19;

/** How many bytes every atoms amount has */
export const SLP_ATOMS_NUM_BYTES = 8;

/** Supported SLP token types */
export type SlpTokenType =
    | typeof SLP_FUNGIBLE
    | typeof SLP_MINT_VAULT
    | typeof SLP_NFT1_CHILD
    | typeof SLP_NFT1_GROUP;

/** Build an SLP GENESIS OP_RETURN, creating a new SLP token */
export function slpGenesis(
    tokenType: number,
    genesisInfo: GenesisInfo,
    initialQuantity: bigint,
    mintBatonOutIdx?: number,
): Script {
    verifyTokenType(tokenType);
    const data: Uint8Array[] = [];
    data.push(SLP_LOKAD_ID);
    data.push(new Uint8Array([tokenType]));
    data.push(GENESIS);
    data.push(strToBytes(genesisInfo.tokenTicker ?? ''));
    data.push(strToBytes(genesisInfo.tokenName ?? ''));
    data.push(strToBytes(genesisInfo.url ?? ''));
    data.push(genesisInfo.hash ? fromHex(genesisInfo.hash) : new Uint8Array());
    data.push(new Uint8Array([genesisInfo.decimals ?? 0]));
    if (tokenType == SLP_MINT_VAULT) {
        if (genesisInfo.mintVaultScripthash === undefined) {
            throw new Error('Must set mintVaultScripthash for MINT VAULT');
        }
        data.push(fromHex(genesisInfo.mintVaultScripthash));
    } else {
        if (mintBatonOutIdx !== undefined) {
            if (mintBatonOutIdx < 2) {
                throw new Error('mintBatonOutIdx must be >= 2');
            }
            data.push(new Uint8Array([mintBatonOutIdx]));
        } else {
            data.push(new Uint8Array());
        }
    }
    data.push(slpAtoms(initialQuantity));
    return Script.fromOps([OP_RETURN as Op].concat(data.map(pushdataOpSlp)));
}

/**
 * Build an SLP MINT pushdata section, creating new SLP tokens and mint batons
 * of the given token ID.
 **/
export function slpMint(
    tokenId: string,
    tokenType: number,
    additionalAtoms: bigint,
    mintBatonOutIdx?: number,
): Script {
    verifyTokenType(tokenType);
    verifyTokenId(tokenId);
    return Script.fromOps([
        OP_RETURN,
        pushdataOpSlp(SLP_LOKAD_ID),
        pushdataOpSlp(new Uint8Array([tokenType])),
        pushdataOpSlp(MINT),
        pushdataOpSlp(fromHex(tokenId)),
        pushdataOpSlp(
            new Uint8Array(
                mintBatonOutIdx !== undefined ? [mintBatonOutIdx] : [],
            ),
        ),
        pushdataOpSlp(slpAtoms(additionalAtoms)),
    ]);
}

/**
 * Build an SLP MINT VAULT pushdata section, creating new SLP tokens and mint batons
 * of the given token ID.
 **/
export function slpMintVault(
    tokenId: string,
    additionalAtomsArray: bigint[],
): Script {
    verifyTokenId(tokenId);
    verifySendAtomsArray(additionalAtomsArray);
    return Script.fromOps(
        [
            OP_RETURN,
            pushdataOpSlp(SLP_LOKAD_ID),
            pushdataOpSlp(new Uint8Array([SLP_MINT_VAULT])),
            pushdataOpSlp(MINT),
            pushdataOpSlp(fromHex(tokenId)),
        ].concat(
            additionalAtomsArray.map(atoms => pushdataOpSlp(slpAtoms(atoms))),
        ),
    );
}

/**
 * Build an SLP SEND pushdata section, moving SLP tokens to different outputs
 **/
export function slpSend(
    tokenId: string,
    tokenType: number,
    sendAtomsArray: bigint[],
): Script {
    verifyTokenType(tokenType);
    verifyTokenId(tokenId);
    verifySendAtomsArray(sendAtomsArray);
    return Script.fromOps(
        [
            OP_RETURN,
            pushdataOpSlp(SLP_LOKAD_ID),
            pushdataOpSlp(new Uint8Array([tokenType])),
            pushdataOpSlp(SEND),
            pushdataOpSlp(fromHex(tokenId)),
        ].concat(sendAtomsArray.map(atoms => pushdataOpSlp(slpAtoms(atoms)))),
    );
}

/**
 * Build an SLP BURN pushdata section, intentionally burning SLP tokens.
 * See https://github.com/badger-cash/slp-self-mint-protocol/blob/master/token-type1-burn.md
 **/
export function slpBurn(
    tokenId: string,
    tokenType: number,
    burnAtoms: bigint,
): Script {
    verifyTokenType(tokenType);
    verifyTokenId(tokenId);
    return Script.fromOps([
        OP_RETURN,
        pushdataOpSlp(SLP_LOKAD_ID),
        pushdataOpSlp(new Uint8Array([tokenType])),
        pushdataOpSlp(BURN),
        pushdataOpSlp(fromHex(tokenId)),
        pushdataOpSlp(slpAtoms(burnAtoms)),
    ]);
}

function verifyTokenType(tokenType: number) {
    switch (tokenType) {
        case SLP_FUNGIBLE:
        case SLP_MINT_VAULT:
        case SLP_NFT1_GROUP:
        case SLP_NFT1_CHILD:
            return;
        default:
            throw new Error(`Unknown token type ${tokenType}`);
    }
}

function verifyTokenId(tokenId: string) {
    if (tokenId.length != 64) {
        throw new Error(
            `Token ID must be 64 hex characters in length, but got ${tokenId.length}`,
        );
    }
}

function verifySendAtomsArray(sendAtomsArray: bigint[]) {
    if (sendAtomsArray.length == 0) {
        throw new Error('sendAtomsArray cannot be empty');
    }
    if (sendAtomsArray.length > 19) {
        throw new Error(
            `Cannot use more than 19 amounts, but got ${sendAtomsArray.length}`,
        );
    }
}

function pushdataOpSlp(pushdata: Uint8Array): Op {
    if (pushdata.length == 0) {
        return {
            opcode: OP_PUSHDATA1,
            data: pushdata,
        };
    }
    if (pushdata.length < OP_PUSHDATA1) {
        return {
            opcode: pushdata.length,
            data: pushdata,
        };
    }
    return pushBytesOp(pushdata);
}

export function slpAtoms(atoms: bigint): Uint8Array {
    if (atoms < 0n || atoms > 0xffffffffffffffffn) {
        throw new Error(`Atoms out of range: ${atoms}`);
    }
    const atomsBytes = new Uint8Array(8);
    const view = new DataView(
        atomsBytes.buffer,
        atomsBytes.byteOffset,
        atomsBytes.byteLength,
    );
    view.setBigUint64(0, atoms, /*little endian=*/ false);
    return atomsBytes;
}
