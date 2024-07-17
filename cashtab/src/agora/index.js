// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    toHex,
    OP_RETURN,
    SLP_LOKAD_ID,
    SLP_NFT1_CHILD,
    SEND,
    slpAmount,
} from 'ecash-lib';

/**
 * Parse an array of ParsedAds from ecash-agora for Cashtab display and sales
 * Why are we parsing something that is already a "parsed" ad:
 * - Remove any agora txs that are not ONESHOT
 * - Remove any agora txs that are already spent
 * - Remove any agora txs that have enforced outputs not supported by Cashtab
 * - Separate listings into two maps, myListings and offeredListings
 *   Cashtab user can cancel myListings and buy offeredListings
 * @param {{ParsedAd | undefined}[]} agoraTx ParsedAd (see ecash-agora types) or undefined
 * @param {Uint8Array} publicKey
 * @returns {object} {myListings: {tokenId => {agoraInfo}, offeredListings: {tokenId => {agoraInfo}}}
 */
export const getTokenOfferMaps = (agoraTxs, publicKey) => {
    // Make sure function called with a publicKey, as this must be calculated in the calling screen
    // We do not do full validation for the publicKey, as this is tested in ecash-lib which is calculating it
    // We just make sure it is specified
    if (typeof publicKey === 'undefined') {
        throw new Error('getTokenOfferMaps called with undefined publicKey');
    }
    const VALID_LENGTH_SLP1_NFT = 64;
    const TOKEN_ID_BYTES = 32;
    // We do not define a function to parse a single agoraTx
    // We always get agoraTxs as an array, and some may be undefined
    // So, we need to conver this batch into a batch that is useful for rendering listed NFTs
    const myListings = new Map();
    const offeredListings = new Map();

    for (const agoraTx of agoraTxs) {
        if (
            typeof agoraTx !== 'undefined' &&
            typeof agoraTx.spentBy === 'undefined' &&
            agoraTx.type === 'ONESHOT'
        ) {
            // If this an agoraTx that has not yet been spent (i.e. bought or canceled)
            // (note: this implies it has params key with an enforcedOutputs key,
            // each enforcedOutput having value and script keys, see ParsedAd interface in ecash-agora)
            if (agoraTx.params.enforcedOutputs.length === 2) {
                // slpv1 NFTs listed by Cashtab are created with 2 enforced outputs
                if (agoraTx.params.enforcedOutputs[0].value === 0n) {
                    const { script } = agoraTx.params.enforcedOutputs[0];
                    if (script.bytecode.length !== VALID_LENGTH_SLP1_NFT) {
                        // Byte length does not match SLP type 1 NFT OP_RETURN
                        // Do not include this agoraTx in tokenOfferMap
                        continue;
                    }

                    const ops = script.ops();
                    if (ops.next() !== OP_RETURN) {
                        // Index 0 script is not OP_RETURN
                        // Do not include this agoraTx in tokenOfferMap
                        continue;
                    }
                    if (!isEqualTypedArray(ops.next().data, SLP_LOKAD_ID)) {
                        // First push is not SLP 1 LOKAD ID
                        // Do not include this agoraTx in tokenOfferMap
                        continue;
                    }
                    const typeByte = ops.next();
                    if (
                        typeByte.opcode !== 1 ||
                        typeByte.data[0] !== SLP_NFT1_CHILD
                    ) {
                        // Second push is not NFT child
                        // Do not include this agoraTx in tokenOfferMap
                        continue;
                    }
                    if (!isEqualTypedArray(ops.next().data, SEND)) {
                        // Third push is not a SEND
                        // Do not include this agoraTx in tokenOfferMap
                        continue;
                    }
                    const tokenIdPush = ops.next();
                    const { opcode, data } = tokenIdPush;
                    if (opcode !== TOKEN_ID_BYTES) {
                        // Fourth push is not a valid tokenId
                        // Do not include this agoraTx in tokenOfferMap
                        continue;
                    }
                    const tokenId = toHex(data);
                    if (!isEqualTypedArray(ops.next().data, slpAmount(0n))) {
                        // Fifth push is not expected 0 amount for Cashtab NFT agora offer
                        // Do not include this agoraTx in tokenOfferMap
                        continue;
                    }
                    if (!isEqualTypedArray(ops.next().data, slpAmount(1n))) {
                        // Sixth push is not expected 1 amount for Cashtab NFT agora offer
                        // Do not include this agoraTx in tokenOfferMap
                        continue;
                    }
                    if (typeof ops.next() !== 'undefined') {
                        // We do not expect any more pushes than what we have checked above
                        // If we have more, invalid
                        // Do not include this agoraTx in tokenOfferMap
                        continue;
                    }
                    // If we are here, it is a valid offer
                    const { params, txBuilderInput } = agoraTx;
                    const offerInfo = { params, txBuilderInput };

                    if (isEqualTypedArray(params.cancelPk, publicKey)) {
                        myListings.set(tokenId, offerInfo);
                    } else {
                        offeredListings.set(tokenId, offerInfo);
                    }
                }
            }
        }
    }
    return { myListings, offeredListings };
};

/**
 * Compare script pushes
 * JS does not have a way to compare typed arrays
 * ref https://stackoverflow.com/questions/76127214/compare-equality-of-two-uint8array
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @returns {boolean}
 */
export const isEqualTypedArray = (a, b) => {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
};
