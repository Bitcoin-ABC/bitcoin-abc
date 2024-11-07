// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import appConfig from 'config/app';
import { undecimalizeTokenAmount, decimalizeTokenAmount } from 'wallet';
import {
    Script,
    slpGenesis,
    slpSend,
    slpMint,
    TxBuilder,
    EccDummy,
    Signatory,
    TxBuilderOutput,
} from 'ecash-lib';
import { GenesisInfo } from 'chronik-client';
import { SlpUtxo, CashtabUtxo, SlpDecimals } from 'wallet';
// Constants for SLP 1 token types as returned by chronik-client
export const SLP_1_PROTOCOL_NUMBER = 1;
export const SLP_1_NFT_COLLECTION_PROTOCOL_NUMBER = 129;
export const SLP_1_NFT_PROTOCOL_NUMBER = 65;

// Note we have to specify the numbers here and not the constants for ts lint reasons
type SUPPORTED_MINT_TYPES = 1 | 129;

// 0xffffffffffffffff
export const MAX_MINT_AMOUNT_TOKEN_SATOSHIS = '18446744073709551615';

const DUMMY_TXID =
    '1111111111111111111111111111111111111111111111111111111111111111';

// Cashtab spec
// This is how Cashtab defines a token utxo to be received
// by the wallet broadcasting this transaction.
export const TOKEN_DUST_CHANGE_OUTPUT = { value: appConfig.dustSats };
// SLP1 supports up to 19 outputs
// https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#send--transfer
// This value is defined by the spec, i.e. an SLP1 SEND tx with more outputs is invalid
// Rationale behind spec decision: OP_RETURN is limited to 223 bytes. A 19-output SLP Send tx requires
// 217 bytes in the OP_RETURN. Each output requires an additional 9 bytes (1 byte pushdata, 8 bytes value)
// So any more than 19 would be over the currently prevailing 223-byte OP_RETURN limit
const SLP1_SEND_MAX_OUTPUTS = 19;

// For SLPv1 Mint txs, Cashtab always puts the mint baton at mintBatonVout 2
const CASHTAB_SLP1_MINT_MINTBATON_VOUT = 2;

// To mint NFTs in a Collection (i.e. NFT Child from NFT Parent), you must spend this qty of NFT Parent
// This is a spec value
export const SLP1_NFT_CHILD_GENESIS_AMOUNT = '1';

interface SlpTargetOutput {
    value: number;
    script?: Script;
}
/**
 * Get targetOutput for a SLP v1 genesis tx
 * @param genesisInfo object containing token info for genesis tx
 * @param initialQuantity
 * @param mintBatonOutIdx
 * @throws if invalid input params are passed to TokenType1.genesis
 */
export const getSlpGenesisTargetOutput = (
    genesisInfo: GenesisInfo,
    initialQuantity: bigint,
    mintBatonOutIdx: 2 | undefined = undefined,
): SlpTargetOutput[] => {
    if (typeof mintBatonOutIdx !== 'undefined' && mintBatonOutIdx !== 2) {
        throw new Error(
            'Cashtab only supports slpv1 genesis txs for fixed supply tokens or tokens with mint baton at index 2',
        );
    }

    const targetOutputs = [];

    const script = slpGenesis(
        SLP_1_PROTOCOL_NUMBER,
        genesisInfo,
        initialQuantity,
        mintBatonOutIdx,
    );

    // Per SLP v1 spec, OP_RETURN must be at index 0
    // https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#genesis---token-genesis-transaction
    targetOutputs.push({ value: 0, script });

    // Per SLP v1 spec, genesis tx is minted to output at index 1
    // In Cashtab, we mint genesis txs to our own Path1899 address
    // Expected behavior for Cashtab tx building is to add change address to output
    // with no address
    targetOutputs.push(TOKEN_DUST_CHANGE_OUTPUT);

    // If the user specified the creation of a mint baton, add it
    // Note: Cashtab only supports the creation of one mint baton at index 2
    if (typeof mintBatonOutIdx !== 'undefined' && mintBatonOutIdx === 2) {
        targetOutputs.push({
            value: appConfig.dustSats,
        });
    }

    return targetOutputs;
};

interface TokenInputInfo {
    tokenInputs: SlpUtxo[];
    sendAmounts: bigint[];
    tokenId: string;
}
/**
 * Get targetOutput(s) for a SLP v1 SEND tx
 * @param tokenInputInfo of getSendTokenInputs
 * @param destinationAddress address where the tokens are being sent
 * @throws if invalid input params are passed to TokenType1.send
 * @returns targetOutput(s), e.g. [{value: 0, script: <encoded slp send script>}]
 * or [{value: 0, script: <encoded slp send script>}, {value: 546}]
 * if token change
 * Change output has no address key
 */
export const getSlpSendTargetOutputs = (
    tokenInputInfo: TokenInputInfo,
    destinationAddress: string,
): SlpTargetOutput[] => {
    const { tokenInputs, sendAmounts } = tokenInputInfo;

    // Get tokenId from the tokenUtxo

    const tokenId = tokenInputs[0].token.tokenId;

    const script = slpSend(tokenId, SLP_1_PROTOCOL_NUMBER, sendAmounts);

    // Build targetOutputs per slpv1 spec
    // https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#send---spend-transaction

    // Initialize with OP_RETURN at 0 index, per spec
    const targetOutputs: SlpTargetOutput[] = [{ value: 0, script }];

    // Add first 'to' amount to 1 index. This could be any index between 1 and 19.
    targetOutputs.push({
        value: appConfig.dustSats,
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
 * Get all available token utxos for an SLP v1 SEND tx from in-node formatted chronik utxos
 * @param utxos array of utxos from an in-node instance of chronik
 * @param tokenId
 * @returns tokenUtxos, all utxos that can be used for slpv1 send tx
 * mint batons are intentionally excluded
 */
export const getAllSendUtxos = (
    utxos: CashtabUtxo[],
    tokenId: string,
): SlpUtxo[] => {
    // From an array of chronik utxos, return only token utxos related to a given tokenId
    return utxos.filter(
        utxo =>
            utxo.token?.tokenId === tokenId && // UTXO matches the token ID.
            utxo.token?.isMintBaton === false, // UTXO is not a minting baton.
    ) as SlpUtxo[];
};

/**
 * Get send token inputs from in-node input data
 * @param utxos
 * @param tokenId tokenId of the token you want to send
 * @param sendQty
 * @param decimals 0-9 inclusive, integer. Decimals of this token.
 * Note: you need to get decimals from cache or from chronik.
 */
export const getSendTokenInputs = (
    utxos: CashtabUtxo[],
    tokenId: string,
    sendQty: string,
    decimals: -1 | SlpDecimals = -1,
): TokenInputInfo => {
    if (sendQty === '') {
        throw new Error(
            'Invalid sendQty empty string. sendQty must be a decimalized number as a string.',
        );
    }

    // Get all slp send utxos for this tokenId
    const allSendUtxos = getAllSendUtxos(utxos, tokenId);

    if (allSendUtxos.length === 0) {
        throw new Error(`No token utxos for tokenId "${tokenId}"`);
    }

    if (!Number.isInteger(decimals) || decimals > 9 || decimals < 0) {
        // We get there if we call this function without specifying decimals
        throw new Error(
            `Invalid decimals ${decimals} for tokenId ${tokenId}. Decimals must be an integer 0-9.`,
        );
    }

    // Convert user input (decimalized string)
    const sendQtyBigInt = BigInt(
        undecimalizeTokenAmount(sendQty, decimals as SlpDecimals),
    );

    // We calculate totalTokenInputUtxoQty with the same basis (token satoshis) -- no adjustment for decimals
    // as the value of this token utxo is already indexed at this basis
    let totalTokenInputUtxoQty = 0n;

    const tokenInputs = [];
    for (const utxo of allSendUtxos) {
        totalTokenInputUtxoQty =
            totalTokenInputUtxoQty + BigInt(utxo.token.amount);

        tokenInputs.push(utxo);
        if (totalTokenInputUtxoQty >= sendQtyBigInt) {
            // If we have enough to send what we want, no more input utxos
            break;
        }
    }

    if (totalTokenInputUtxoQty < sendQtyBigInt) {
        throw new Error(
            `tokenUtxos have insufficient balance ${decimalizeTokenAmount(
                totalTokenInputUtxoQty.toString(),
                decimals as SlpDecimals,
            )} to send ${decimalizeTokenAmount(
                sendQtyBigInt.toString(),
                decimals as SlpDecimals,
            )}`,
        );
    }

    const sendAmounts = [sendQtyBigInt];
    const change = totalTokenInputUtxoQty - sendQtyBigInt;
    if (change > 0n) {
        sendAmounts.push(change);
    }

    // We return this interesting object due to expected input shape of slp-mdm
    // NB sendAmounts must be an array of BNs, each one decimalized to the tokens decimal places
    return { tokenInputs, tokenId, sendAmounts };
};

/**
 * Get targetOutput(s) for a SLP v1 BURN tx
 * Note: a burn tx is a special case of a send tx where you have no destination output
 * You always have a change output as an eCash tx must have at least dust output
 *
 * @param tokenInputInfo
 * @throws if invalid input params are passed to TokenType1.send
 * @returns targetOutputs with a change output, even if all utxos are consumed
 * [{value: 0, script: <encoded slp burn script>}, {value: 546}]
 */
export const getSlpBurnTargetOutputs = (
    tokenInputInfo: TokenInputInfo,
): SlpTargetOutput[] => {
    const { tokenId, sendAmounts } = tokenInputInfo;

    // If we have change from the getSendTokenInputs call, we want to SEND it to ourselves
    // If we have no change, we want to SEND ourselves 0

    const hasChange = sendAmounts.length > 1;
    const tokenChange = hasChange ? sendAmounts[1] : 0n;

    // This step is what makes the tx a burn and not a send, see getSlpSendTargetOutputs
    const script = slpSend(tokenId, SLP_1_PROTOCOL_NUMBER, [tokenChange]);

    // Build targetOutputs per slpv1 spec
    // https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#send---spend-transaction
    // Script must be at index 0
    // We need a token utxo even if change is 0
    // We will probably always have an XEC change output, but always including a token output
    // that is either change or a "send" qty of 0 is a simple standard that allows us to keep
    // burn tx logic separate from ecash tx creation logic
    // But lets just add the min output

    return [{ value: 0, script }, TOKEN_DUST_CHANGE_OUTPUT];
};

/**
 * Get mint baton(s) for a given token
 * @param utxos
 * @param tokenId
 */
export const getMintBatons = (
    utxos: CashtabUtxo[],
    tokenId: string,
): SlpUtxo[] => {
    // From an array of chronik utxos, return only token utxos related to a given tokenId
    return utxos.filter(
        utxo =>
            utxo.token?.tokenId === tokenId && // UTXO matches the token ID.
            utxo.token?.isMintBaton === true, // UTXO is a minting baton.
    ) as SlpUtxo[];
};

/**
 * Get targetOutput(s) for a SLP v1 MINT tx
 * Note: Cashtab only supports slpv1 mints that preserve the baton at the wallet's address
 * Spec: https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#mint---extended-minting-transaction
 * @param tokenId
 * @param decimals decimals for this tokenId
 * @param mintQty decimalized string for token qty
 * @throws if invalid input params are passed to TokenType1.mint
 * @returns targetOutput(s), e.g. [{value: 0, script: <encoded slp send script>}, {value: 546}, {value: 546}]
 * Note: we always return minted qty at index 1
 * Note we always return a mint baton at index 2
 */
export const getMintTargetOutputs = (
    tokenId: string,
    decimals: SlpDecimals,
    mintQty: string,
    tokenProtocolNumber: SUPPORTED_MINT_TYPES,
): SlpTargetOutput[] => {
    // slp-mdm expects values in token satoshis, so we must undecimalize mintQty

    // Get undecimalized string, i.e. "token satoshis"
    const tokenSatoshis = BigInt(undecimalizeTokenAmount(mintQty, decimals));

    const script = slpMint(
        tokenId,
        tokenProtocolNumber,
        tokenSatoshis,
        CASHTAB_SLP1_MINT_MINTBATON_VOUT,
    );

    // Build targetOutputs per slpv1 spec
    // Dust output at v1 receives the minted qty (per spec)
    // Dust output at v2 for mint baton (per Cashtab)

    return [
        // SLP 1 script
        { value: 0, script },
        // Dust output for mint qty
        TOKEN_DUST_CHANGE_OUTPUT,
        // Dust output for mint baton
        TOKEN_DUST_CHANGE_OUTPUT,
    ];
};

/**
 * Get the maximum (decimalized) qty of SLP tokens that can be
 * represented in a single SLP tx (mint, send, burn, or agora partial list)
 * @param decimals
 * @returns decimalized max amount
 */
export const getMaxDecimalizedSlpQty = (decimals: SlpDecimals): string => {
    // The max amount depends on token decimals
    // e.g. if decimals are 0, it's the same
    // if decimals are 9, it's 18446744073.709551615
    if (decimals === 0) {
        return MAX_MINT_AMOUNT_TOKEN_SATOSHIS;
    }
    const stringBeforeDecimalPoint = MAX_MINT_AMOUNT_TOKEN_SATOSHIS.slice(
        0,
        MAX_MINT_AMOUNT_TOKEN_SATOSHIS.length - decimals,
    );
    const stringAfterDecimalPoint = MAX_MINT_AMOUNT_TOKEN_SATOSHIS.slice(
        -1 * decimals,
    );
    return `${stringBeforeDecimalPoint}.${stringAfterDecimalPoint}`;
};

/**
 * Get targetOutput for a SLP v1 NFT Parent (aka Group) genesis tx
 * @param genesisInfo object containing token info for genesis tx
 * @param initialQuantity
 * @param mintBatonOutIdx
 * @throws if invalid input params are passed to TokenType1.genesis
 * @returns
 */
export const getNftParentGenesisTargetOutputs = (
    genesisInfo: GenesisInfo,
    initialQuantity: bigint,
    mintBatonOutIdx: 2 | undefined = undefined,
): SlpTargetOutput[] => {
    if (typeof mintBatonOutIdx !== 'undefined' && mintBatonOutIdx !== 2) {
        throw new Error(
            'Cashtab only supports slpv1 genesis txs for fixed supply tokens or tokens with mint baton at index 2',
        );
    }

    const targetOutputs = [];

    const script = slpGenesis(
        SLP_1_NFT_COLLECTION_PROTOCOL_NUMBER,
        genesisInfo,
        initialQuantity,
        mintBatonOutIdx,
    );

    // Per SLP v1 spec, OP_RETURN must be at index 0
    // https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#genesis---token-genesis-transaction
    targetOutputs.push({ value: 0, script });

    // Per SLP v1 spec, genesis tx is minted to output at index 1
    // In Cashtab, we mint genesis txs to our own Path1899 address
    // If an output does not have an address, Cashtab will add its change address
    targetOutputs.push(TOKEN_DUST_CHANGE_OUTPUT);

    // If the user specified the creation of a mint baton, add it
    // Note: Cashtab only supports the creation of one mint baton at index 2
    if (typeof mintBatonOutIdx !== 'undefined' && mintBatonOutIdx === 2) {
        targetOutputs.push(TOKEN_DUST_CHANGE_OUTPUT);
    }

    return targetOutputs;
};

/**
 * TODO note this function is still not implemented
 * Get targetOutput(s) for a SLPv1 NFT Parent MINT tx
 * Note: Cashtab only supports slpv1 mints that preserve the baton at the wallet's address
 * Note: Cashtab only supports NFT1 parents with decimals of 0
 * @param tokenId
 * @param mintQty
 * @throws if invalid input params are passed to TokenType1.mint
 * @returns targetOutput(s), e.g. [{value: 0, script: <encoded slp send script>}, {value: 546}, {value: 546}]
 * Note: we always return minted qty at index 1
 * Note we always return a mint baton at index 2
 */
export const getNftParentMintTargetOutputs = (
    tokenId: string,
    mintQty: bigint,
): SlpTargetOutput[] => {
    const script = slpMint(
        tokenId,
        SLP_1_NFT_COLLECTION_PROTOCOL_NUMBER,
        mintQty,
        CASHTAB_SLP1_MINT_MINTBATON_VOUT,
    );

    return [
        // SLP Script
        { value: 0, script },
        // Dust output to hold mint qty
        TOKEN_DUST_CHANGE_OUTPUT,
        // Dust output to hold mint baton
        TOKEN_DUST_CHANGE_OUTPUT,
    ];
};

/**
 * Get inputs to make an NFT parent fan tx
 * We need to make fan txs as minting an NFT1 child nft requires burning exactly 1 of the parent
 * Well, the spec will let you do it if you burn more than one. But our users can be expected
 * to appreciate our economy in this regard. *
 * In practice, we are getting token utxos for tokenId that are not mint batons and have qty > 1
 * @param tokenId tokenId of NFT1 Parent (aka Group aka Collection) token we want to mint child NFTs for
 * @param slpUtxos What Cashtab stores at the wallet.state.slpUtxos key
 */
export const getNftParentFanInputs = (
    tokenId: string,
    slpUtxos: SlpUtxo[],
): SlpUtxo[] => {
    return slpUtxos.filter(utxo => {
        // UTXO matches the token ID
        return (
            utxo.token?.tokenId === tokenId &&
            // UTXO is not already of the correct qty to be an NftParentFanInput
            // Note: not expected to ever have this amount be '0' unless we have a mint baton
            // If we do (somehow) get a 0 amount, no harm using it as an input...should
            // consolidate it away anyhow
            utxo.token?.amount !== SLP1_NFT_CHILD_GENESIS_AMOUNT &&
            // UTXO is not a minting baton
            utxo.token?.isMintBaton === false
        );
    });
};

/**
 * Get target outputs for an NFT 1 parent fan tx,
 * i.e. a tx that creates as many token utxos as possible with amount === 1
 * @param fanInputs result from getNftParentFanUtxos
 * @returns array of target outputs, including script output at index 0, and dust outputs after
 * as many as 19 dust outputs
 */
export const getNftParentFanTxTargetOutputs = (
    fanInputs: SlpUtxo[],
): SlpTargetOutput[] => {
    if (fanInputs.length === 0) {
        throw new Error('No eligible inputs for this NFT parent fan tx');
    }
    // Iterate over eligible nft parent fan utxos (the output of getNftParentFanUtxos)
    // Create as many minting utxos as possible in one tx (per spec, 19)
    const fanInputsThisTx = [];
    let totalInputAmount = 0n;
    let maxOutputs = false;
    for (const input of fanInputs) {
        fanInputsThisTx.push(input);
        // Note that all fanInputs have token.amount
        totalInputAmount = totalInputAmount + BigInt(input.token.amount);
        if (totalInputAmount >= SLP1_SEND_MAX_OUTPUTS) {
            maxOutputs = true;
            // We have enough inputs to create max outputs
            break;
        }
    }
    // Note we may also get here with a qty less than SLP1_SEND_MAX_OUTPUTS
    // The user might not have 19 NFTs left to mint for this token
    // Note we do not need a BN for fanOutputs. totalInputAmount needs BN because it could be enormous.
    // But here, fanOutputs will be less than or equal to 19
    const fanOutputs = maxOutputs
        ? SLP1_SEND_MAX_OUTPUTS
        : Number(totalInputAmount);

    // We only expect change if we have totalInputAmount of > 19
    // We send amount 1 to as many outputs as we can
    // If we have change and maxOutputs === true, this is 18
    // Otherwise it's fanOutputs, which could be 19, or less if the user does not have 19 of this token left
    const MAX_OUTPUTS_IF_CHANGE = SLP1_SEND_MAX_OUTPUTS - 1;
    const change = maxOutputs
        ? totalInputAmount - BigInt(MAX_OUTPUTS_IF_CHANGE)
        : 0n;
    const hasChange = change > 0n;

    const sendAmounts = Array(
        hasChange && maxOutputs ? MAX_OUTPUTS_IF_CHANGE : fanOutputs,
    ).fill(1n);
    if (hasChange) {
        // Add change as the last output bc it feels weird adding it first
        sendAmounts.push(change);
    }

    const targetOutputs = [];
    const script = slpSend(
        fanInputs[0].token.tokenId,
        SLP_1_NFT_COLLECTION_PROTOCOL_NUMBER,
        sendAmounts,
    );

    // Add OP_RETURN output at index 0
    targetOutputs.push({ value: 0, script });

    // Add dust outputs
    // Note that Cashtab will add the creating wallet's change address
    // to any output not including an address or script key
    for (let i = 0; i < fanOutputs; i += 1) {
        targetOutputs.push(TOKEN_DUST_CHANGE_OUTPUT);
    }

    return targetOutputs;
};

/**
 * We need to get a parent utxo with qty of exactly 1
 * This is burned to mint a child nft
 * Ref https://github.com/simpleledger/slp-specifications/blob/master/slp-nft-1.md
 * If we cannot find any utxos with qty of exactly 1, will need to create some with a fan-out tx
 * This is handled by a separate function
 * @param tokenId tokenId of the parent aka Group
 * @param slpUtxos What Cashtab stores at the wallet.state.slpUtxos key
 * @returns Array of ONLY ONE cashtab utxo where tokenId === tokenId and token.amount === 1, if it exists
 * Otherwise an empty array
 */
export const getNftChildGenesisInput = (
    tokenId: string,
    slpUtxos: SlpUtxo[],
): SlpUtxo[] => {
    // Note that we do not use .filter() as we do in most "getInput" functions for SLP,
    // because in this case we only want exactly 1 utxo
    for (const utxo of slpUtxos) {
        if (
            utxo.token?.tokenId === tokenId &&
            utxo.token?.isMintBaton === false &&
            utxo.token?.amount === SLP1_NFT_CHILD_GENESIS_AMOUNT
        ) {
            return [utxo];
        }
    }
    // We have not found a utxo that meets our conditions
    // Return empty array
    return [];
};

/**
 * Get target outputs for minting an NFT
 * Note that we get these inputs separately, from getNftChildGenesisInput and, if that fails,
 * from making a fan-out tx
 * Note we do not need the group tokenId, as this is implied in the tx by the input
 * @param genesisInfo
 */
export const getNftChildGenesisTargetOutputs = (
    genesisInfo: GenesisInfo,
): SlpTargetOutput[] => {
    const script = slpGenesis(
        SLP_1_NFT_PROTOCOL_NUMBER,
        genesisInfo,
        1, // We always mint exactly 1 NFT
        undefined, // We never mint an NFT with a child mint baton
    );
    // We always mint exactly 1 NFT per child genesis tx, so no change is expected
    // Will always have exactly 1 dust utxo at index 1 to hold this NFT
    return [{ value: 0, script }, TOKEN_DUST_CHANGE_OUTPUT];
};

/**
 * We are effectively getting this NFT
 * The NFT is stored at a dust utxo from a previous NFT Child send tx or its NFT Child genesis tx
 * Because this is an NFT, "there can be only one" of these utxos. The wallet either has it or it does not.
 * @param tokenId tokenId of the NFT (SLP1 NFT Child)
 * @param slpUtxos What Cashtab stores at the wallet.state.slpUtxos key
 * @returns Array of ONLY ONE cashtab utxo where tokenId === tokenId
 * Otherwise an empty array
 *
 * Function could be called "getNftChildSendInput" -- however, we will probably use this function
 * for more than simply getting the required input for sending an NFT
 *
 * NOTE
 * We do not "check" to see if we have more than one utxo of this NFT
 * This is not expected to happen -- though it could happen if this function is used in the wrong context,
 * for example called with a tokenId of a token that is not an NFT1 child
 * Dev responsibly -- imo it is not worth performing this check every time the function is called
 * Only use this function when sending a type1 NFT child
 */
export const getNft = (tokenId: string, slpUtxos: SlpUtxo[]): SlpUtxo[] => {
    // Note that we do not use .filter() as we do in most "getInput" functions for SLP,
    // because in this case we only want exactly 1 utxo
    for (const utxo of slpUtxos) {
        if (utxo.token?.tokenId === tokenId) {
            return [utxo];
        }
    }
    // We have not found a utxo that meets our conditions
    // Return empty array
    return [];
};

/**
 * Cashtab only supports sending one NFT1 child at a time
 * Which child is sent is determined by input selection
 * So, the user interface for input selection is what mostly drives this tx
 * @param tokenId tokenId of the Parent (aka Group)
 */
export const getNftChildSendTargetOutputs = (
    tokenId: string,
    destinationAddress: string,
): SlpTargetOutput[] => {
    // We only ever send 1 NFT
    const SEND_ONE_CHILD = [1n];
    const script = slpSend(tokenId, SLP_1_NFT_PROTOCOL_NUMBER, SEND_ONE_CHILD);

    // Implementation notes
    // - Cashtab only supports sending one NFT at a time
    // - All NFT Child inputs will have amount of 1
    // Therefore, we will have no change, and every send tx will have only one token utxo output
    return [
        { value: 0, script },
        {
            script: Script.fromAddress(destinationAddress),
            value: appConfig.dustSats,
        },
    ];
};

/**
 * Test if a given targetOutput is TOKEN_DUST_CHANGE_OUTPUT
 * Such an output needs 'script' added for the sending wallet's address
 * @param targetOutput
 */
export const isTokenDustChangeOutput = (
    targetOutput: SlpTargetOutput,
): boolean => {
    return (
        // We have only one key
        Object.keys(targetOutput).length === 1 &&
        // It's "value"
        'value' in targetOutput &&
        // it's equal to 546
        targetOutput.value === appConfig.dustSats
    );
};

/**
 * For ecash-agora SLP1 listings txs, an "ad setup tx" is required before
 * we can actually broadcast the offer
 *
 * We want to minimize the amount of XEC we need to make these two required txs
 *
 * So, we calculate the fee needed to send the 2nd tx (the offer tx)
 * We will then use this fee to size the output of the first tx to exactly
 * cover the 2nd tx
 */
export const getAgoraAdFuelSats = (
    redeemScript: Script,
    signatory: Signatory,
    offerOutputs: TxBuilderOutput[],
    satsPerKb: number,
) => {
    // First, get the size of the listing tx
    const dummyOfferTx = new TxBuilder({
        inputs: [
            {
                input: {
                    prevOut: {
                        // Use a placeholder 32-byte txid
                        txid: DUMMY_TXID,
                        // The outIdx will always be 1 in Cashtab
                        // In practice, this does not impact the tx size calculation
                        outIdx: 1,
                    },
                    signData: {
                        // Arbitrary value that we know will cover the fee for this tx,
                        // which will always have only one input in Cashtab
                        value: 10000,
                        redeemScript,
                    },
                },
                signatory,
            },
        ],
        outputs: offerOutputs,
    });
    const measureTx = dummyOfferTx.sign(new EccDummy());

    const dummyOfferTxSats = Math.ceil(
        (measureTx.serSize() * satsPerKb) / 1000,
    );

    return dummyOfferTxSats;
};
