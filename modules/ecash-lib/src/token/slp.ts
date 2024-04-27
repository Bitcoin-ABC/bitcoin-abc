// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { fromHex } from '../io/hex.js';
import { strToBytes } from '../io/str.js';
import { Op, pushBytesOp } from '../op.js';
import { OP_PUSHDATA1, OP_RETURN } from '../opcode.js';
import { Script } from '../script.js';
import { Amount, BURN, GENESIS, GenesisInfo, MINT, SEND } from './common.js';

/** LOKAD ID for SLP */
export const SLP_LOKAD_ID = strToBytes('SLP\0');

/** SLP fungible token type number */
export const SLP_FUNGIBLE = 1;
/** SLP MINT Vault token type number */
export const SLP_MINT_VAULT = 2;
/** SLP NFT1 Child token type number */
export const SLP_NFT1_CHILD = 0x41;
/** SLP NFT1 Group token type number */
export const SLP_NFT1_GROUP = 0x81;

/** Build an SLP GENESIS OP_RETURN, creating a new SLP token */
export function slpGenesis(
    tokenType: number,
    genesisInfo: GenesisInfo,
    initialQuantity: Amount,
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
    data.push(slpAmount(initialQuantity));
    return Script.fromOps([OP_RETURN as Op].concat(data.map(pushdataOpSlp)));
}

/**
 * Build an SLP MINT pushdata section, creating new SLP tokens and mint batons
 * of the given token ID.
 **/
export function slpMint(
    tokenId: string,
    tokenType: number,
    additionalQuantity: Amount,
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
        pushdataOpSlp(slpAmount(additionalQuantity)),
    ]);
}

/**
 * Build an SLP MINT VAULT pushdata section, creating new SLP tokens and mint batons
 * of the given token ID.
 **/
export function slpMintVault(
    tokenId: string,
    additionalQuantities: Amount[],
): Script {
    verifyTokenId(tokenId);
    verifySendAmounts(additionalQuantities);
    return Script.fromOps(
        [
            OP_RETURN,
            pushdataOpSlp(SLP_LOKAD_ID),
            pushdataOpSlp(new Uint8Array([SLP_MINT_VAULT])),
            pushdataOpSlp(MINT),
            pushdataOpSlp(fromHex(tokenId)),
        ].concat(
            additionalQuantities.map(qty => pushdataOpSlp(slpAmount(qty))),
        ),
    );
}

/**
 * Build an SLP SEND pushdata section, moving SLP tokens to different outputs
 **/
export function slpSend(
    tokenId: string,
    tokenType: number,
    sendAmounts: Amount[],
): Script {
    verifyTokenType(tokenType);
    verifyTokenId(tokenId);
    verifySendAmounts(sendAmounts);
    return Script.fromOps(
        [
            OP_RETURN,
            pushdataOpSlp(SLP_LOKAD_ID),
            pushdataOpSlp(new Uint8Array([tokenType])),
            pushdataOpSlp(SEND),
            pushdataOpSlp(fromHex(tokenId)),
        ].concat(sendAmounts.map(qty => pushdataOpSlp(slpAmount(qty)))),
    );
}

/**
 * Build an SLP BURN pushdata section, intentionally burning SLP tokens.
 * See https://github.com/badger-cash/slp-self-mint-protocol/blob/master/token-type1-burn.md
 **/
export function slpBurn(
    tokenId: string,
    tokenType: number,
    burnAmount: Amount,
): Script {
    verifyTokenType(tokenType);
    verifyTokenId(tokenId);
    return Script.fromOps([
        OP_RETURN,
        pushdataOpSlp(SLP_LOKAD_ID),
        pushdataOpSlp(new Uint8Array([tokenType])),
        pushdataOpSlp(BURN),
        pushdataOpSlp(fromHex(tokenId)),
        pushdataOpSlp(slpAmount(burnAmount)),
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

function verifySendAmounts(sendAmounts: Amount[]) {
    if (sendAmounts.length == 0) {
        throw new Error('Send amount cannot be empty');
    }
    if (sendAmounts.length > 19) {
        throw new Error(
            `Cannot use more than 19 amounts, but got ${sendAmounts.length}`,
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

function slpAmount(amount: Amount): Uint8Array {
    if (amount < 0 || BigInt(amount) > 0xffffffffffffffffn) {
        throw new Error(`Amount out of range: ${amount}`);
    }
    const amountBytes = new Uint8Array(8);
    const view = new DataView(
        amountBytes.buffer,
        amountBytes.byteOffset,
        amountBytes.byteLength,
    );
    view.setBigUint64(0, BigInt(amount), /*little endian=*/ false);
    return amountBytes;
}
