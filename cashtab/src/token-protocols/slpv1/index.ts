// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import appConfig from 'config/app';
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
import { TokenUtxo, CashtabUtxo, SlpDecimals } from 'wallet';
import {
    TOKEN_DUST_CHANGE_OUTPUT,
    TokenInputInfo,
    TokenTargetOutput,
} from 'token-protocols';
// Constants for SLP 1 token types as returned by chronik-client
export const SLP_1_PROTOCOL_NUMBER = 1;
export const SLP_1_NFT_COLLECTION_PROTOCOL_NUMBER = 129;
export const SLP_1_NFT_PROTOCOL_NUMBER = 65;

export const MAX_OUTPUT_AMOUNT_SLP_ATOMS = 0xffffffffffffffffn;

const DUMMY_TXID =
    '1111111111111111111111111111111111111111111111111111111111111111';

// For SLPv1 Mint txs, Cashtab always puts the mint baton at mintBatonVout 2
const CASHTAB_SLP1_MINT_MINTBATON_VOUT = 2;

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
): TokenTargetOutput[] => {
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
    targetOutputs.push({ sats: 0n, script });

    // Per SLP v1 spec, genesis tx is minted to output at index 1
    // In Cashtab, we mint genesis txs to our own Path1899 address
    // Expected behavior for Cashtab tx building is to add change address to output
    // with no address
    targetOutputs.push(TOKEN_DUST_CHANGE_OUTPUT);

    // If the user specified the creation of a mint baton, add it
    // Note: Cashtab only supports the creation of one mint baton at index 2
    if (typeof mintBatonOutIdx !== 'undefined' && mintBatonOutIdx === 2) {
        targetOutputs.push({
            sats: BigInt(appConfig.dustSats),
        });
    }

    return targetOutputs;
};

/**
 * Get targetOutput(s) for a SLP v1 BURN tx
 * Note: a burn tx is a special case of a send tx where you have no destination output
 * You always have a change output as an eCash tx must have at least dust output
 *
 * @param tokenInputInfo
 * @throws if invalid input params are passed to TokenType1.send
 * @returns targetOutputs with a change output, even if all utxos are consumed
 * [{sats: 0n, script: <encoded slp burn script>}, {sats: 546n}]
 */
export const getSlpBurnTargetOutputs = (
    tokenInputInfo: TokenInputInfo,
    tokenType: number,
): TokenTargetOutput[] => {
    const { tokenId, sendAmounts } = tokenInputInfo;

    // If we have change from the getSendTokenInputs call, we want to SEND it to ourselves
    // If we have no change, we want to SEND ourselves 0

    const hasChange = sendAmounts.length > 1;
    const tokenChange = hasChange ? sendAmounts[1] : 0n;

    // This step is what makes the tx a burn and not a send (no destination output)
    const script = slpSend(tokenId, tokenType, [tokenChange]);

    // Build targetOutputs per slpv1 spec
    // https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#send---spend-transaction
    // Script must be at index 0
    // We need a token utxo even if change is 0
    // We will probably always have an XEC change output, but always including a token output
    // that is either change or a "send" qty of 0 is a simple standard that allows us to keep
    // burn tx logic separate from ecash tx creation logic
    // But lets just add the min output

    return [{ sats: 0n, script }, TOKEN_DUST_CHANGE_OUTPUT];
};

/**
 * Get mint baton(s) for a given token
 * @param utxos
 * @param tokenId
 */
export const getMintBatons = (
    utxos: CashtabUtxo[],
    tokenId: string,
): TokenUtxo[] => {
    // From an array of chronik utxos, return only token utxos related to a given tokenId
    return utxos.filter(
        utxo =>
            utxo.token?.tokenId === tokenId && // UTXO matches the token ID.
            utxo.token?.isMintBaton === true, // UTXO is a minting baton.
    ) as TokenUtxo[];
};

/**
 * Get the maximum (decimalized) qty of SLP tokens that can be
 * represented in a single SLP tx (mint, send, burn, or agora partial list)
 * @param decimals
 * @returns decimalized max amount
 */
export const getMaxDecimalizedSlpQty = (decimals: SlpDecimals): string => {
    // Convert to string so we can get decimalized values
    const MAX_OUTPUT_AMOUNT_SLP_ATOMS_STRING =
        MAX_OUTPUT_AMOUNT_SLP_ATOMS.toString();
    // The max amount depends on token decimals
    // e.g. if decimals are 0, it's the same
    // if decimals are 9, it's 18446744073.709551615
    if (decimals === 0) {
        return MAX_OUTPUT_AMOUNT_SLP_ATOMS_STRING;
    }
    const stringBeforeDecimalPoint = MAX_OUTPUT_AMOUNT_SLP_ATOMS_STRING.slice(
        0,
        MAX_OUTPUT_AMOUNT_SLP_ATOMS_STRING.length - decimals,
    );
    const stringAfterDecimalPoint = MAX_OUTPUT_AMOUNT_SLP_ATOMS_STRING.slice(
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
): TokenTargetOutput[] => {
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
    targetOutputs.push({ sats: 0n, script });

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
 * @returns targetOutput(s), e.g. [{sats: 0n, script: <encoded slp send script>}, {sats: 546n}, {sats: 546n}]
 * Note: we always return minted qty at index 1
 * Note we always return a mint baton at index 2
 */
export const getNftParentMintTargetOutputs = (
    tokenId: string,
    mintQty: bigint,
): TokenTargetOutput[] => {
    const script = slpMint(
        tokenId,
        SLP_1_NFT_COLLECTION_PROTOCOL_NUMBER,
        mintQty,
        CASHTAB_SLP1_MINT_MINTBATON_VOUT,
    );

    return [
        // SLP Script
        { sats: 0n, script },
        // Dust output to hold mint qty
        TOKEN_DUST_CHANGE_OUTPUT,
        // Dust output to hold mint baton
        TOKEN_DUST_CHANGE_OUTPUT,
    ];
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
export const getNft = (tokenId: string, slpUtxos: TokenUtxo[]): TokenUtxo[] => {
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
 * Test if a given targetOutput is TOKEN_DUST_CHANGE_OUTPUT
 * Such an output needs 'script' added for the sending wallet's address
 * @param targetOutput
 */
export const isTokenDustChangeOutput = (
    targetOutput: TokenTargetOutput,
): boolean => {
    return (
        // We have only one key
        Object.keys(targetOutput).length === 1 &&
        // It's "value"
        'sats' in targetOutput &&
        // it's equal to 546n
        targetOutput.sats === BigInt(appConfig.dustSats)
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
    satsPerKb: bigint,
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
                        sats: 100000n,
                        redeemScript,
                    },
                },
                signatory,
            },
        ],
        outputs: offerOutputs,
    });
    const measureTx = dummyOfferTx.sign({ ecc: new EccDummy() });

    const dummyOfferTxSats = Math.ceil(
        (measureTx.serSize() * Number(satsPerKb)) / 1000,
    );

    return dummyOfferTxSats;
};
