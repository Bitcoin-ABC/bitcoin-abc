// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { BN, TokenType1, NFT1 } from 'slp-mdm';
import appConfig from 'config/app';
import { undecimalizeTokenAmount } from 'wallet';

// Constants for SLP 1 token types as returned by chronik-client
export const SLP_1_PROTOCOL_NUMBER = 1;
export const SLP_1_NFT_COLLECTION_PROTOCOL_NUMBER = 129;
export const SLP_1_NFT_PROTOCOL_NUMBER = 65;
// 0xffffffffffffffff
export const MAX_MINT_AMOUNT_TOKEN_SATOSHIS = '18446744073709551615';
// SLP1 supports up to 19 outputs
// https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#send--transfer
// This value is defined by the spec, i.e. an SLP1 SEND tx with more outputs is invalid
// Rationale behind spec decision: OP_RETURN is limited to 223 bytes. A 19-output SLP Send tx requires
// 217 bytes in the OP_RETURN. Each output requires an additional 9 bytes (1 byte pushdata, 8 bytes value)
// So any more than 19 would be over the currently prevailing 223-byte OP_RETURN limit
const SLP1_SEND_MAX_OUTPUTS = 19;

// Note: NFT1 spec supports non-zero decimals, but 0 is recommended
// Cashtab follows the recommendation and will only mint 0-decimal NFT1 parent tokens
const NFT1_PARENT_DECIMALS = 0;

// For SLPv1 Mint txs, Cashtab always puts the mint baton at mintBatonVout 2
const CASHTAB_SLP1_MINT_MINTBATON_VOUT = 2;

// To mint NFTs in a Collection (i.e. NFT Child from NFT Parent), you must spend this qty of NFT Parent
// This is a spec value
export const SLP1_NFT_CHILD_GENESIS_AMOUNT = '1';

/**
 * Get targetOutput for a SLP v1 genesis tx
 * @param {object} genesisConfig object containing token info for genesis tx
 * @throws {error} if invalid input params are passed to TokenType1.genesis
 * @returns {object} targetOutput, e.g. {value: 0, script: <encoded slp genesis script>}
 */
export const getSlpGenesisTargetOutput = genesisConfig => {
    const {
        ticker,
        name,
        documentUrl,
        documentHash,
        decimals,
        mintBatonVout,
        genesisQty,
    } = genesisConfig;

    if (mintBatonVout !== null && mintBatonVout !== 2) {
        throw new Error(
            'Cashtab only supports slpv1 genesis txs for fixed supply tokens or tokens with mint baton at index 2',
        );
    }

    const targetOutputs = [];

    // Note that this function handles validation; will throw an error on invalid inputs
    const script = TokenType1.genesis(
        ticker,
        name,
        documentUrl,
        documentHash,
        decimals,
        mintBatonVout,
        // Per spec, this must be BN of an integer
        // It may actually be a decimal value, but this is determined by the decimals param
        new BN(genesisQty).times(10 ** decimals),
    );

    // Per SLP v1 spec, OP_RETURN must be at index 0
    // https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#genesis---token-genesis-transaction
    targetOutputs.push({ value: 0, script });

    // Per SLP v1 spec, genesis tx is minted to output at index 1
    // In Cashtab, we mint genesis txs to our own Path1899 address
    // Expected behavior for Cashtab tx building is to add change address to output
    // with no address
    targetOutputs.push({
        value: appConfig.dustSats,
    });

    // If the user specified the creation of a mint baton, add it
    // Note: Cashtab only supports the creation of one mint baton at index 2
    if (mintBatonVout !== null) {
        targetOutputs.push({
            value: appConfig.dustSats,
        });
    }

    return targetOutputs;
};

/**
 * Get targetOutput(s) for a SLP v1 SEND tx
 * @param {array} tokenInputInfo {tokenUtxos: utxos[], sendAmount: BigNumber[]}; Output of getSendTokenInputs
 * @param {string} destinationAddress address where the tokens are being sent
 * @throws {error} if invalid input params are passed to TokenType1.send
 * @returns {array} targetOutput(s), e.g. [{value: 0, script: <encoded slp send script>}]
 * or [{value: 0, script: <encoded slp send script>}, {value: 546}]
 * if token change
 * Change output has no address key
 */
export const getSlpSendTargetOutputs = (tokenInputInfo, destinationAddress) => {
    const { tokenInputs, sendAmounts } = tokenInputInfo;

    // Get tokenId from the tokenUtxo

    const tokenId = tokenInputs[0].token.tokenId;

    const script = TokenType1.send(tokenId, sendAmounts);

    // Build targetOutputs per slpv1 spec
    // https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#send---spend-transaction

    // Initialize with OP_RETURN at 0 index, per spec
    const targetOutputs = [{ value: 0, script }];

    // Add first 'to' amount to 1 index. This could be any index between 1 and 19.
    targetOutputs.push({
        value: appConfig.dustSats,
        address: destinationAddress,
    });

    // sendAmounts can only be length 1 or 2
    if (sendAmounts.length > 1) {
        // Add another targetOutput
        // Note that change addresses are added in the sendXec function
        // Change output is denoted by lack of address key
        targetOutputs.push({
            value: appConfig.dustSats,
        });
    }

    return targetOutputs;
};

/**
 * Get all available token utxos for an SLP v1 SEND tx from in-node formatted chronik utxos
 * @param {ScriptUtxo_InNode[]} utxos array of utxos from an in-node instance of chronik
 * @param {string} tokenId
 * @returns {array} tokenUtxos, all utxos that can be used for slpv1 send tx
 * mint batons are intentionally excluded
 */
export const getAllSendUtxos = (utxos, tokenId) => {
    // From an array of chronik utxos, return only token utxos related to a given tokenId
    return utxos.filter(utxo => {
        if (
            utxo.token?.tokenId === tokenId && // UTXO matches the token ID.
            utxo.token?.isMintBaton === false // UTXO is not a minting baton.
        ) {
            return true;
        }
        return false;
    });
};

/**
 * Get send token inputs from in-node input data
 * @param {ScriptUtxo_InNode[]} utxos
 * @param {string} tokenId tokenId of the token you want to send
 * @param {string} sendQty
 * @param {number} decimals 0-9 inclusive, integer. Decimals of this token.
 * Note: you need to get decimals from cache or from chronik.
 * @returns {object} {tokenInputs: utxo[], sendAmounts: BN[]}
 */
export const getSendTokenInputs = (utxos, tokenId, sendQty, decimals = -1) => {
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

    // slp-mdm requires sendQty to be in token satoshis, i.e. an integer for this token's smallest unit of account
    sendQty = new BN(sendQty).times(10 ** decimals);

    // We calculate totalTokenInputUtxoQty with the same basis (token satoshis) -- no adjustment for decimals
    // as the value of this token utxo is already indexed at this basis
    let totalTokenInputUtxoQty = new BN(0);

    const tokenInputs = [];
    for (const utxo of allSendUtxos) {
        totalTokenInputUtxoQty = totalTokenInputUtxoQty.plus(utxo.token.amount);

        tokenInputs.push(utxo);
        if (totalTokenInputUtxoQty.gte(sendQty)) {
            // If we have enough to send what we want, no more input utxos
            break;
        }
    }

    if (totalTokenInputUtxoQty.lt(sendQty)) {
        throw new Error(
            `tokenUtxos have insufficient balance ${totalTokenInputUtxoQty
                .shiftedBy(-1 * decimals)
                .toFixed(decimals)} to send ${sendQty
                .shiftedBy(-1 * decimals)
                .toFixed(decimals)}`,
        );
    }

    const sendAmounts = [sendQty];
    const change = totalTokenInputUtxoQty.minus(sendQty);
    if (change.gt(0)) {
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
 * @param {array} tokenInputInfo {tokenUtxos: utxos[], sendAmount: BigNumber[]}; Output of getSendTokenInputs *
 * @throws {error} if invalid input params are passed to TokenType1.send
 * @returns {object} targetOutputs with a change output, even if all utxos are consumed
 * [{value: 0, script: <encoded slp burn script>}, {value: 546}]
 */
export const getSlpBurnTargetOutputs = tokenInputInfo => {
    const { tokenId, sendAmounts } = tokenInputInfo;

    // If we have change from the getSendTokenInputs call, we want to SEND it to ourselves
    // If we have no change, we want to SEND ourselves 0

    const hasChange = sendAmounts.length > 1;
    const tokenChange = hasChange ? sendAmounts[1] : new BN(0);

    // This step is what makes the tx a burn and not a send, see getSlpSendTargetOutputs
    const script = TokenType1.send(tokenId, [tokenChange]);

    // Build targetOutputs per slpv1 spec
    // https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#send---spend-transaction
    // Script must be at index 0
    // We need a token utxo even if change is 0
    // We will probably always have an XEC change output, but always including a token output
    // that is either change or a "send" qty of 0 is a simple standard that allows us to keep
    // burn tx logic separate from ecash tx creation logic
    // But lets just add the min output

    return [{ value: 0, script }, { value: appConfig.dustSats }];
};

/**
 * Get mint baton(s) for a given token
 * @param {ScriptUtxo_InNode[]} utxos
 * @param {string} tokenId
 * @returns {ScriptUtxo_InNode[]}
 */
export const getMintBatons = (utxos, tokenId) => {
    // From an array of chronik utxos, return only token utxos related to a given tokenId
    return utxos.filter(utxo => {
        if (
            utxo.token?.tokenId === tokenId && // UTXO matches the token ID.
            utxo.token?.isMintBaton === true // UTXO is a minting baton.
        ) {
            return true;
        }
        return false;
    });
};
/**
 * Get targetOutput(s) for a SLP v1 MINT tx
 * Note: Cashtab only supports slpv1 mints that preserve the baton at the wallet's address
 * Spec: https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#mint---extended-minting-transaction
 * @param {string} tokenId
 * @param {number} decimals decimals for this tokenId
 * @param {string} mintQty decimalized string for token qty *
 * @throws {error} if invalid input params are passed to TokenType1.mint
 * @returns {array} targetOutput(s), e.g. [{value: 0, script: <encoded slp send script>}, {value: 546}, {value: 546}]
 * Note: we always return minted qty at index 1
 * Note we always return a mint baton at index 2
 */
export const getMintTargetOutputs = (tokenId, decimals, mintQty) => {
    // slp-mdm expects values in token satoshis, so we must undecimalize mintQty

    // Get undecimalized string, i.e. "token satoshis"
    const tokenSatoshis = undecimalizeTokenAmount(mintQty, decimals);

    // Convert to BN as this is what slp-mdm expects
    const mintQtyBigNumber = new BN(tokenSatoshis);

    const script = TokenType1.mint(
        tokenId,
        CASHTAB_SLP1_MINT_MINTBATON_VOUT,
        mintQtyBigNumber,
    );

    // Build targetOutputs per slpv1 spec
    // Dust output at v1 receives the minted qty (per spec)
    // Dust output at v2 for mint baton (per Cashtab)

    // Initialize with OP_RETURN at 0 index, per spec
    // Note we do not include an address in outputs
    // Cashtab behavior adds the wallet's change address if no output is added
    const targetOutputs = [{ value: 0, script }];

    // Add mint amount at index 1
    targetOutputs.push({
        value: appConfig.dustSats,
    });

    // Add mint baton at index 2
    targetOutputs.push({
        value: appConfig.dustSats,
    });

    return targetOutputs;
};

export const getMaxMintAmount = decimals => {
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
 * @param {object} genesisConfig object containing token info for genesis tx
 * @throws {error} if invalid input params are passed to TokenType1.genesis
 * @returns {object} targetOutput, e.g. {value: 0, script: <encoded slp genesis script>}
 */
export const getNftParentGenesisTargetOutputs = genesisConfig => {
    const {
        ticker,
        name,
        documentUrl,
        documentHash,
        mintBatonVout,
        genesisQty,
    } = genesisConfig;

    if (mintBatonVout !== null && mintBatonVout !== 2) {
        throw new Error(
            'Cashtab only supports slpv1 genesis txs for fixed supply tokens or tokens with mint baton at index 2',
        );
    }

    const targetOutputs = [];

    // Note that this function handles validation; will throw an error on invalid inputs
    const script = NFT1.Group.genesis(
        ticker,
        name,
        documentUrl,
        documentHash,
        NFT1_PARENT_DECIMALS,
        mintBatonVout,
        // Per spec, this must be BN of an integer
        // This function will throw an error if genesisQty is not an integer
        new BN(genesisQty),
    );

    // Per SLP v1 spec, OP_RETURN must be at index 0
    // https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md#genesis---token-genesis-transaction
    targetOutputs.push({ value: 0, script });

    // Per SLP v1 spec, genesis tx is minted to output at index 1
    // In Cashtab, we mint genesis txs to our own Path1899 address
    // If an output does not have an address, Cashtab will add its change address
    targetOutputs.push({
        value: appConfig.dustSats,
    });

    // If the user specified the creation of a mint baton, add it
    // Note: Cashtab only supports the creation of one mint baton at index 2
    if (mintBatonVout !== null) {
        targetOutputs.push({
            value: appConfig.dustSats,
        });
    }

    return targetOutputs;
};

/**
 * Get targetOutput(s) for a SLPv1 NFT Parent MINT tx
 * Note: Cashtab only supports slpv1 mints that preserve the baton at the wallet's address
 * Note: Cashtab only supports NFT1 parents with decimals of 0
 * @param {string} tokenId
 * @param {string} mintQty decimalized string for token qty. Must be an integer.
 * @throws {error} if invalid input params are passed to TokenType1.mint
 * @returns {array} targetOutput(s), e.g. [{value: 0, script: <encoded slp send script>}, {value: 546}, {value: 546}]
 * Note: we always return minted qty at index 1
 * Note we always return a mint baton at index 2
 */
export const getNftParentMintTargetOutputs = (tokenId, mintQty) => {
    // slp-mdm expects values in token satoshis, so we must undecimalize mintQty

    const script = NFT1.Group.mint(
        tokenId,
        CASHTAB_SLP1_MINT_MINTBATON_VOUT,
        new BN(mintQty),
    );

    // Build targetOutputs per slpv1 spec
    // Dust output at v1 receives the minted qty (per spec)
    // Dust output at v2 for mint baton (per Cashtab)

    // Initialize with OP_RETURN at 0 index, per spec
    // Note we do not include an address in outputs
    // Cashtab behavior adds the wallet's change address if no output is added
    const targetOutputs = [{ value: 0, script }];

    // Add mint amount at index 1
    targetOutputs.push({
        value: appConfig.dustSats,
    });

    // Add mint baton at index 2
    targetOutputs.push({
        value: appConfig.dustSats,
    });

    return targetOutputs;
};

/**
 * Get inputs to make an NFT parent fan tx
 * We need to make fan txs as minting an NFT1 child nft requires burning exactly 1 of the parent
 * Well, the spec will let you do it if you burn more than one. But our users can be expected
 * to appreciate our economy in this regard. *
 * In practice, we are getting token utxos for tokenId that are not mint batons and have qty > 1
 * @param {string} tokenId tokenId of NFT1 Parent (aka Group aka Collection) token we want to mint child NFTs for
 * @param {CashtabUtxo[]} slpUtxos What Cashtab stores at the wallet.state.slpUtxos key
 * @returns {CashtabUtxo[]}
 */
export const getNftParentFanInputs = (tokenId, slpUtxos) => {
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
 * @param {CashtabUtxo[]} fanInputs result from getNftParentFanUtxos
 * @returns {Array} array of target outputs, including script output at index 0, and dust outputs after
 * as many as 19 dust outputs
 */
export const getNftParentFanTxTargetOutputs = fanInputs => {
    if (fanInputs.length === 0) {
        throw new Error('No eligible inputs for this NFT parent fan tx');
    }
    // Iterate over eligible nft parent fan utxos (the output of getNftParentFanUtxos)
    // Create as many minting utxos as possible in one tx (per spec, 19)
    const fanInputsThisTx = [];
    let totalInputAmount = new BN(0);
    let maxOutputs = false;
    for (const input of fanInputs) {
        fanInputsThisTx.push(input);
        // Note that all fanInputs have token.amount
        totalInputAmount = totalInputAmount.plus(new BN(input.token.amount));
        if (totalInputAmount.gte(SLP1_SEND_MAX_OUTPUTS)) {
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
        : totalInputAmount.toNumber();

    // We only expect change if we have totalInputAmount of > 19
    // We send amount 1 to as many outputs as we can
    // If we have change and maxOutputs === true, this is 18
    // Otherwise it's fanOutputs, which could be 19, or less if the user does not have 19 of this token left
    const MAX_OUTPUTS_IF_CHANGE = SLP1_SEND_MAX_OUTPUTS - 1;
    const change = maxOutputs
        ? totalInputAmount.minus(MAX_OUTPUTS_IF_CHANGE)
        : new BN(0);
    const hasChange = change.gt(0);

    const sendAmounts = Array(
        hasChange && maxOutputs ? MAX_OUTPUTS_IF_CHANGE : fanOutputs,
    ).fill(new BN(1));
    if (hasChange) {
        // Add change as the last output bc it feels weird adding it first
        sendAmounts.push(change);
    }

    const targetOutputs = [];
    const script = NFT1.Group.send(fanInputs[0].token.tokenId, sendAmounts);

    // Add OP_RETURN output at index 0
    targetOutputs.push({ value: 0, script });

    // Add dust outputs
    // Note that Cashtab will add the creating wallet's change address
    // to any output not including an address or script key
    for (let i = 0; i < fanOutputs; i += 1) {
        targetOutputs.push({ value: appConfig.dustSats });
    }

    return targetOutputs;
};

/**
 * We need to get a parent utxo with qty of exactly 1
 * This is burned to mint a child nft
 * Ref https://github.com/simpleledger/slp-specifications/blob/master/slp-nft-1.md
 * If we cannot find any utxos with qty of exactly 1, will need to create some with a fan-out tx
 * This is handled by a separate function
 * @param {string} tokenId tokenId of the parent aka Group
 * @param {CashtabUtxo[]} slpUtxos What Cashtab stores at the wallet.state.slpUtxos key
 * @returns {[CashtabUtxo] | []} Array of ONLY ONE cashtab utxo where tokenId === tokenId and token.amount === 1, if it exists
 * Otherwise an empty array
 */
export const getNftChildGenesisInput = (tokenId, slpUtxos) => {
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
 * @param {object} childGenesisInfo
 */
export const getNftChildGenesisTargetOutputs = childGenesisConfig => {
    const { ticker, name, documentUrl, documentHash } = childGenesisConfig;
    const script = NFT1.Child.genesis(ticker, name, documentUrl, documentHash);
    // We always mint exactly 1 NFT per child genesis tx, so no change is expected
    // Will always have exactly 1 dust utxo at index 1 to hold this NFT
    return [{ value: 0, script }, { value: appConfig.dustSats }];
};

/**
 * We are effectively getting this NFT
 * The NFT is stored at a dust utxo from a previous NFT Child send tx or its NFT Child genesis tx
 * Because this is an NFT, "there can be only one" of these utxos. The wallet either has it or it does not.
 * @param {string} tokenId tokenId of the NFT (SLP1 NFT Child)
 * @param {CashtabUtxo[]} slpUtxos What Cashtab stores at the wallet.state.slpUtxos key
 * @returns {[CashtabUtxo] | []} Array of ONLY ONE cashtab utxo where tokenId === tokenId
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
export const getNft = (tokenId, slpUtxos) => {
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
 * @param {string} tokenId tokenId of the Parent (aka Group)
 */
export const getNftChildSendTargetOutputs = (tokenId, destinationAddress) => {
    // slp-mdm accepts an array of BN for send amounts
    const SEND_ONE_CHILD = [new BN(1)];
    const script = NFT1.Child.send(tokenId, SEND_ONE_CHILD);

    // Implementation notes
    // - Cashtab only supports sending one NFT at a time
    // - All NFT Child inputs will have amount of 1
    // Therefore, we will have no change, and every send tx will have only one token utxo output
    return [
        { value: 0, script },
        { address: destinationAddress, value: 546 },
    ];
};
