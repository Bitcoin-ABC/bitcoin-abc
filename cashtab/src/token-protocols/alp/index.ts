// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { SlpDecimals } from 'wallet';
import {
    ALP_STANDARD,
    emppScript,
    alpGenesis,
    alpSend,
    alpBurn,
    alpMint,
    Script,
    shaRmd160,
    fromHex,
} from 'ecash-lib';
import { AgoraPartial } from 'ecash-agora';
import { GenesisInfo } from 'chronik-client';
import {
    TokenInputInfo,
    TokenTargetOutput,
    TOKEN_DUST_CHANGE_OUTPUT,
} from 'token-protocols';
import appConfig from 'config/app';

/**
 * Cashtab methods to support ALP tx construction
 * Ref spec at https://ecashbuilders.notion.site/ALP-a862a4130877448387373b9e6a93dd97
 */

// Cashtab creates ALP tokens with user pub key as authPubkey
// Cashtab does not include information for the available ALP "data" key
export type CashtabAlpGenesisInfo = GenesisInfo & {
    authPubkey: string;
};

export const MAX_OUTPUT_AMOUNT_ALP_ATOMS = 0xffffffffffffn;
/**
 * Get the maximum (decimalized) qty of ALP tokens that can be
 * represented in a single ALP output (mint, send, burn, or agora partial list)
 * @param decimals
 * @returns decimalized max amount
 */
export const getMaxDecimalizedAlpQty = (decimals: SlpDecimals): string => {
    const MAX_OUTPUT_AMOUNT_ALP_ATOMS_STRING =
        MAX_OUTPUT_AMOUNT_ALP_ATOMS.toString();
    // The max amount depends on token decimals
    // e.g. if decimals are 0, it's 281474976710655
    // if decimals are 9, it's 281474.976710655
    if (decimals === 0) {
        return MAX_OUTPUT_AMOUNT_ALP_ATOMS_STRING;
    }
    const stringBeforeDecimalPoint = MAX_OUTPUT_AMOUNT_ALP_ATOMS_STRING.slice(
        0,
        MAX_OUTPUT_AMOUNT_ALP_ATOMS_STRING.length - decimals,
    );
    const stringAfterDecimalPoint = MAX_OUTPUT_AMOUNT_ALP_ATOMS_STRING.slice(
        -1 * decimals,
    );
    return `${stringBeforeDecimalPoint}.${stringAfterDecimalPoint}`;
};

/**
 * Get targetOutput for an ALP v1 genesis tx
 */
export const getAlpGenesisTargetOutputs = (
    genesisInfo: CashtabAlpGenesisInfo,
    initialQuantity: bigint,
    includeMintBaton = true,
): TokenTargetOutput[] => {
    const targetOutputs = [];

    const script = emppScript([
        alpGenesis(ALP_STANDARD, genesisInfo, {
            atomsArray: [initialQuantity],
            numBatons: includeMintBaton ? 1 : 0,
        }),
    ]);

    targetOutputs.push({ sats: 0n, script });

    // Per ALP spec, mint batons are minted at earlier outputs, then qty
    // Cashtab only supports ALP genesis with 1 output qty or ALP genesis with
    // 1 output qty and 1 mint baton
    // In Cashtab, we mint genesis txs to our own Path1899 address
    // Expected behavior for Cashtab tx building is to add change address to output
    // with no address
    targetOutputs.push(TOKEN_DUST_CHANGE_OUTPUT);

    if (includeMintBaton) {
        // We need another output if we have a mint baton
        // NB that, when we have a mint baton, ouputs are
        // [0] OP_RETURN
        // [1] Mint baton
        // [2] genesis qty
        targetOutputs.push(TOKEN_DUST_CHANGE_OUTPUT);
    }

    return targetOutputs;
};

/**
 * Get targetOutput(s) for an ALP v1 SEND tx
 * This is (almost) identical to getting SLP1 send target outputs
 * However, best practice to keep this a separate function
 * If we support token multisends, ALP and SLP will have different output rules
 *
 * firma
 * We support an (optional) additional empp push for ALP send txs in Cashtab
 * In theory we could support multiple additional empp pushes, but we do not (yet)
 * have a use case for this
 * firma must be a valid hex string
 * firma must not bump the size of the OP_RETURN script above 223 bytes
 * NB a node will prevent a tx broadcasting with OP_RETURN above 223 bytes, with
 * unhelpful error "scriptPubKey" -- so we validate here for the max bytes available
 * assuming we have a 2-output ALP token tx
 */
export const getAlpSendTargetOutputs = (
    tokenInputInfo: TokenInputInfo,
    destinationAddress: string,
    firma = '',
): TokenTargetOutput[] => {
    const { tokenId, sendAmounts } = tokenInputInfo;

    const emppScriptArr = [alpSend(tokenId, ALP_STANDARD, sendAmounts)];

    if (firma !== '') {
        emppScriptArr.push(fromHex(firma));
    }

    const script = emppScript(emppScriptArr);

    // Build targetOutputs per slpv1 spec
    // https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#send---spend-transaction

    // Initialize with OP_RETURN at 0 index, per spec
    const targetOutputs: TokenTargetOutput[] = [{ sats: 0n, script }];

    // Add first 'to' amount to 1 index. This could be any index between 1 and 19.
    targetOutputs.push({
        sats: BigInt(appConfig.dustSats),
        script: Script.fromAddress(destinationAddress),
    });

    // sendAmounts can only be length 1 or 2
    if (sendAmounts.length > 1) {
        // Add dust output to hold token change
        targetOutputs.push(TOKEN_DUST_CHANGE_OUTPUT);
    }

    return targetOutputs;
};

/**
 * Get targetOutput(s) for an ALP v1 BURN tx
 * Note: ALP supports intentional burns by adding another EMPP output
 */
export const getAlpBurnTargetOutputs = (
    tokenInputInfo: TokenInputInfo,
): TokenTargetOutput[] => {
    const { tokenId, sendAmounts } = tokenInputInfo;

    // If we have change from the getSendTokenInputs call, we want to SEND it to ourselves
    // If we have no change, we want to SEND ourselves 0

    const hasChange = sendAmounts.length > 1;
    const tokenChange = hasChange ? sendAmounts[1] : 0n;

    // Build EMPP script
    // Initialize with burn
    const burnEmpp = [alpBurn(tokenId as string, ALP_STANDARD, sendAmounts[0])];
    if (hasChange) {
        // Unburned token change is a send output
        burnEmpp.push(alpSend(tokenId as string, ALP_STANDARD, [tokenChange]));
    }
    const script = emppScript(burnEmpp);

    // We always include 1 change output
    // If we are burning a full utxo and we do not need a token change output,
    // We still need to ensure the tx has at least one output of dust satoshis to be valid
    // Using the token dust utxo is a convenient way of doing this
    return [{ sats: 0n, script }, TOKEN_DUST_CHANGE_OUTPUT];
};

/**
 * Get targetOutput(s) for an ALP MINT tx
 * Note: Cashtab only supports ALP mints that preserve the baton at the wallet's address
 */
export const getAlpMintTargetOutputs = (
    tokenId: string,
    mintQty: bigint,
): TokenTargetOutput[] => {
    const script = emppScript([
        alpMint(tokenId as string, ALP_STANDARD, {
            atomsArray: [mintQty],
            // Mint baton is consumed and reborn
            numBatons: 1,
        }),
    ]);

    return [
        // SLP 1 script
        { sats: 0n, script },
        // Dust output for mint qty
        TOKEN_DUST_CHANGE_OUTPUT,
        // Dust output for mint baton
        TOKEN_DUST_CHANGE_OUTPUT,
    ];
};

/**
 * Get targetOutput(s) for listing an Agora Partial
 * offer for ALP
 */
export const getAlpAgoraListTargetOutputs = (
    tokenInputInfo: TokenInputInfo,
    agoraPartial: AgoraPartial,
): TokenTargetOutput[] => {
    const { tokenId, sendAmounts } = tokenInputInfo;

    const agoraScript = agoraPartial.script();
    const agoraP2sh = Script.p2sh(shaRmd160(agoraScript.bytecode));

    const offerTargetOutputs: TokenTargetOutput[] = [
        {
            sats: 0n,
            // Note, unlike SLP
            // We will possibly have token change for the tx that creates the offer
            script: emppScript([
                agoraPartial.adPushdata(),
                alpSend(tokenId, agoraPartial.tokenType, sendAmounts),
            ]),
        },
        // Token utxo we are offering for sale
        { sats: BigInt(appConfig.dustSats), script: agoraP2sh },
    ];
    if (sendAmounts.length > 1) {
        offerTargetOutputs.push(TOKEN_DUST_CHANGE_OUTPUT);
    }

    return offerTargetOutputs;
};
