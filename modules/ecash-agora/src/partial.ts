// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    ALL_ANYONECANPAY_BIP143,
    ALL_BIP143,
    DEFAULT_DUST_LIMIT,
    Ecc,
    flagSignature,
    Op,
    OP_0,
    OP_0NOTEQUAL,
    OP_1,
    OP_12,
    OP_2,
    OP_2DUP,
    OP_2OVER,
    OP_2SWAP,
    OP_3DUP,
    OP_8,
    OP_9,
    OP_ADD,
    OP_BIN2NUM,
    OP_CAT,
    OP_CHECKDATASIGVERIFY,
    OP_CHECKSIG,
    OP_CHECKSIGVERIFY,
    OP_CODESEPARATOR,
    OP_DIV,
    OP_DROP,
    OP_DUP,
    OP_ELSE,
    OP_ENDIF,
    OP_EQUAL,
    OP_EQUALVERIFY,
    OP_FROMALTSTACK,
    OP_GREATERTHANOREQUAL,
    OP_HASH160,
    OP_HASH256,
    OP_IF,
    OP_MOD,
    OP_NIP,
    OP_NOTIF,
    OP_NUM2BIN,
    OP_OVER,
    OP_PICK,
    OP_PUSHDATA1,
    OP_REVERSEBYTES,
    OP_ROT,
    OP_SHA256,
    OP_SIZE,
    OP_SPLIT,
    OP_SUB,
    OP_SWAP,
    OP_TOALTSTACK,
    OP_TUCK,
    OP_VERIFY,
    pushBytesOp,
    pushNumberOp,
    Script,
    sha256d,
    Signatory,
    slpSend,
    strToBytes,
    UnsignedTxInput,
    Writer,
    WriterBytes,
    WriterLength,
    writeTxOutput,
} from 'ecash-lib';
import { AGORA_LOKAD_ID } from './consts.js';

/**
 * "Human viable" parameters for partial Agora offers, can serve as a basis to
 * approximate the actual Script parameters via AgoraPartial.approximateParams.
 **/
export interface AgoraPartialParams {
    /**
     * Offered tokens in base tokens. After param approximation, this may differ
     * from `AgoraPartial`.offeredTokens(), so make sure to use that when
     * preparing the offer!
     *
     * For SLP, the maximum allowed value here is 0xffffffffffffffff, for ALP it
     * is 0xffffffffffff.
     **/
    offeredTokens: bigint;
    /**
     * Price in nano sats per (base) token.
     * Using nsats allows users to specify a very large range of prices, from
     * tokens where billions of them cost a single sat, to offers where single
     * tokens can cost millions of XEC.
     **/
    priceNanoSatsPerToken: bigint;
    /**
     * Public key of the offering party.
     * This is the public key of the wallet, and it serves both as the pubkey to
     * cancel the offer, as well as the pubkey of the P2PKH script to send the
     * sats to.
     **/
    makerPk: Uint8Array;
    /**
     * Minimum number of tokens that can be accepted.
     * Can be used to avoid spam and prevent exploits with really small
     * accept amounts.
     * Also, small amounts can have very bad precision, and raising the minimum
     * amount can mitigate this.
     * It can also just be used to increase the minimum for which tokens are
     * available.
     * It is recommended to set this to 0.1% of the offered amount.
     **/
    minAcceptedTokens: bigint;
    /** Token ID of the offered token, in big-endian hex. */
    tokenId: string;
    /** Token type of the offered token. */
    tokenType: number;
    /** Token protocol of the offered token. */
    tokenProtocol: 'SLP' | 'ALP';
    /** Dust amount to be used by the script. */
    dustAmount?: number;
    /**
     * Minimum tokenScaleFactor when approximating numTokenTruncBytes.
     * It is recommended to leave this at the default (1000), but it is exposed
     * to either increase price precision and granularity of token amounts (by
     * raising the limit), or to lower price precision but allow more fine-
     * grained token amounts (by lowering the limit).
     **/
    minTokenScaleFactor?: bigint;
    /**
     * Minimum integer when representing the price
     * (scaledTruncTokensPerTruncSat), the approximation will truncate
     * additional sats bytes in order to make scaledTruncTokensPerTruncSat
     * bigger.
     * It is recommended to leave this at the default (1000), but it is exposed
     * for cases where a small number of tokens are offered for a big price,
     * this can be used to improve precision.
     **/
    minPriceInteger?: bigint;
    /**
     * Minimum ratio tokenScaleFactor / scaledTruncTokensPerTruncSat, this can
     * be used to limit the additional truncation introduced by minPriceInteger.
     * It is recommended to leave this at the default (1000), but it is exposed
     * for cases where the askedSats for small accept amounts are very
     * inaccurate.
     **/
    minScaleRatio?: bigint;
}

/**
 * An Agora offer that can partially be accepted.
 * In contrast to oneshot offers, these can be partially accepted, with the
 * remainder sent back to a new UTXO with the same terms but reduced token
 * amount.
 * This is useful for fungible tokens, where the maker doesn't know upfront how
 * many tokens the takers would like to acquire.
 *
 * The Script enforces that the taker re-creates an offer with the same terms
 * with tokens he didn't buy.
 * It calculates the required sats to accept the offer based on the price per
 * token, and the number of tokens requested by the taker, and enforces the
 * correct amount of satoshis are sent to the P2PKH of the maker of this offer.
 *
 * Offers can also be cancelled by the maker of the offer.
 *
 * One complication is the price calculation, due to eCash's limited precision
 * and range (31-bits plus 1 sign bit) of its Script integers.
 * We employ two strategies to increase precision and range:
 * - "Scaling": We scale up values to the maximum representable, such that we
 *   make full use of the 31 bits available. Values that have been scaled up
 *   have the prefix "scaled", and the scale factor is "tokenScaleFactor". We
 *   only scale token amounts.
 * - "Truncation": We cut off bytes at the "end" of numbers, essentially
 *   dividing them by 256 for each truncation, until they fit in 31 bits, so we
 *   can use arithmetic opcodes. Later we "un-truncate" values again by adding
 *   the bytes back. We use OP_CAT to un-truncate values, which doesn't care
 *   about the 31-bit limit. Values that have been truncated have the "trunc"
 *   prefix. We truncate both token amounts (by numTokenTruncBytes bytes) and
 *   sats amounts (by numSatsTruncBytes).
 *
 * Scaling and truncation can be combined, such that the token price is in
 * "scaledTruncTokensPerTruncSat".
 * Together, they give us a very large range of representable values, while
 * keeping a decent precision.
 *
 * Ideally, eCash can eventually raise the maximum integer size to e.g. 64-bits,
 * which would greatly increase the precision. The strategies employed are
 * useful there too, we simply get a much more accurate price calculation.
 **/
export class AgoraPartial {
    public static COVENANT_VARIANT = 'PARTIAL';

    /**
     * Truncated amount that's offered.
     * The last numTokenTruncBytes bytes are truncated to allow representing it
     * in Script or to increase precision.
     * This means that tokens can only be accepted at a granularity of
     * 2^(8*numTokenTruncBytes).
     * offeredTokens = truncTokens * 2^(8*numTokenTruncBytes).
     **/
    public truncTokens: bigint;
    /**
     * How many bytes are truncated from the real token amount, so it fits into
     * 31-bit ints, or to increase precision.
     **/
    public numTokenTruncBytes: number;
    /**
     * Factor token amounts will be multiplied with in the Script to improve
     * precision.
     **/
    public tokenScaleFactor: bigint;
    /**
     * Price in scaled trunc tokens per truncated sat.
     * This unit may seem a bit bizzare, but it is exactly what is needed in the
     * Script calculation: The "acceptedTokens" coming from the taker is both
     * scaled by tokenScaleFactor and also truncated by numTokenTruncBytes
     * bytes, so we only have to divide the acceptedTokens by this number to get
     * the required (truncated) sats. So we only have to un-truncate that and we
     * have the asked sats.
     **/
    public scaledTruncTokensPerTruncSat: bigint;
    /**
     * How many bytes are truncated from the real sats amount, so it fits into
     * 31-bit ints or to improve precision.
     **/
    public numSatsTruncBytes: number;
    /**
     * Where the sats for the tokens should go, and who can cancel the trade.
     **/
    public makerPk: Uint8Array;
    /**
     * How many tokens (scaled and truncated) at minimum have to be accepted.
     **/
    public minAcceptedScaledTruncTokens: bigint;
    /** Token of the contract, in big-endian hex. */
    public tokenId: string;
    /** Token type offered */
    public tokenType: number;
    /** Token protocol of the offered token */
    public tokenProtocol: 'SLP' | 'ALP';
    /** Byte length of the Script, after OP_CODESEPARATOR. */
    public scriptLen: number;
    /**
     * Dust amount of the network, the Script will enforce token outputs to have
     * this amount.
     **/
    public dustAmount: number;

    public constructor(params: {
        truncTokens: bigint;
        numTokenTruncBytes: number;
        tokenScaleFactor: bigint;
        scaledTruncTokensPerTruncSat: bigint;
        numSatsTruncBytes: number;
        makerPk: Uint8Array;
        minAcceptedScaledTruncTokens: bigint;
        tokenId: string;
        tokenType: number;
        tokenProtocol: 'SLP' | 'ALP';
        scriptLen: number;
        dustAmount: number;
    }) {
        this.truncTokens = params.truncTokens;
        this.numTokenTruncBytes = params.numTokenTruncBytes;
        this.tokenScaleFactor = params.tokenScaleFactor;
        this.scaledTruncTokensPerTruncSat = params.scaledTruncTokensPerTruncSat;
        this.numSatsTruncBytes = params.numSatsTruncBytes;
        this.makerPk = params.makerPk;
        this.minAcceptedScaledTruncTokens = params.minAcceptedScaledTruncTokens;
        this.tokenId = params.tokenId;
        this.tokenType = params.tokenType;
        this.tokenProtocol = params.tokenProtocol;
        this.scriptLen = params.scriptLen;
        this.dustAmount = params.dustAmount;
    }

    /**
     * Approximate good script parameters for the given offer params.
     * Note: This is not guaranteed to be optimal and is done on a best-effort
     * basis.
     * @param params Offer params to approximate, see AgoraPartialParams for
     *        details.
     * @param scriptIntegerBits How many bits Script integers have on the
     *        network. On XEC, this must be 32, but if it is raised in the
     *        future to e.g. 64-bit integers, this can be set to 64 to greatly
     *        increase accuracy.
     **/
    public static approximateParams(
        params: AgoraPartialParams,
        scriptIntegerBits: bigint = 32n,
    ): AgoraPartial {
        if (params.offeredTokens < 1n) {
            throw new Error('offeredTokens must be at least 1');
        }
        if (params.priceNanoSatsPerToken < 1n) {
            throw new Error('priceNanoSatsPerToken must be at least 1');
        }
        if (params.minAcceptedTokens < 1n) {
            throw new Error('minAcceptedTokens must be at least 1');
        }
        if (
            params.tokenProtocol == 'SLP' &&
            params.offeredTokens > 0xffffffffffffffffn
        ) {
            throw new Error(
                'For SLP, offeredTokens can be at most 0xffffffffffffffff',
            );
        }
        if (
            params.tokenProtocol == 'ALP' &&
            params.offeredTokens > 0xffffffffffffn
        ) {
            throw new Error(
                'For ALP, offeredTokens can be at most 0xffffffffffff',
            );
        }

        // Script uses 1 bit as sign bit, which we can't use in our calculation
        const scriptIntegerWithoutSignBits = scriptIntegerBits - 1n;
        // Max integer that can be represented in Script on the network
        const maxScriptInt = (1n << scriptIntegerWithoutSignBits) - 1n;

        // Edge case where price can be represented exactly,
        // no need to introduce extra approximation.
        const isPrecisePrice = 1000000000n % params.priceNanoSatsPerToken == 0n;

        const minTokenScaleFactor = isPrecisePrice
            ? 1n
            : params.minTokenScaleFactor ?? 1000n;

        // If we can't represent the offered tokens in a script int, we truncate 8
        // bits at a time until it fits.
        let truncTokens = params.offeredTokens;
        let numTokenTruncBytes = 0n;
        while (truncTokens * minTokenScaleFactor > maxScriptInt) {
            truncTokens >>= 8n;
            numTokenTruncBytes++;
        }

        // Required sats to fully accept the trade (rounded down)
        const requiredSats =
            (params.offeredTokens * params.priceNanoSatsPerToken) / 1000000000n;

        // For bigger trades (>=2^31 sats), we need also to truncate sats
        let requiredTruncSats = requiredSats;
        let numSatsTruncBytes = 0n;
        while (requiredTruncSats > maxScriptInt) {
            requiredTruncSats >>= 8n;
            numSatsTruncBytes++;
        }

        // We scale up the token values to get some extra precision
        let tokenScaleFactor = maxScriptInt / truncTokens;

        // How many scaled trunc tokens can be gotten for each trunc sat.
        // It is the inverse of the price specified by the user, and truncated +
        // scaled as required by the Script.
        const calcScaledTruncTokensPerTruncSat = () =>
            ((1n << (8n * numSatsTruncBytes)) *
                tokenScaleFactor *
                1000000000n) /
            ((1n << (8n * numTokenTruncBytes)) * params.priceNanoSatsPerToken);

        // For trades offering a few tokens for many sats, truncate the sats
        // amounts some more to increase precision.
        const minPriceInteger = params.minPriceInteger ?? 1000n;
        // However, only truncate sats if tokenScaleFactor is well above
        // scaledTruncTokensPerTruncSat, otherwise we lose precision because
        // we're rounding up for the sats calculation in the Script.
        const minScaleRatio = params.minScaleRatio ?? 1000n;
        let scaledTruncTokensPerTruncSat = calcScaledTruncTokensPerTruncSat();
        while (
            scaledTruncTokensPerTruncSat < minPriceInteger &&
            scaledTruncTokensPerTruncSat * minScaleRatio < tokenScaleFactor
        ) {
            numSatsTruncBytes++;
            scaledTruncTokensPerTruncSat = calcScaledTruncTokensPerTruncSat();
        }

        // Edge case where the sats calculation can go above the integer limit
        if (
            truncTokens * tokenScaleFactor + scaledTruncTokensPerTruncSat - 1n >
            maxScriptInt
        ) {
            if (
                truncTokens * tokenScaleFactor <=
                scaledTruncTokensPerTruncSat
            ) {
                // Case where we just overshot the tokenScaleFactor
                tokenScaleFactor /= 2n;
                scaledTruncTokensPerTruncSat =
                    calcScaledTruncTokensPerTruncSat();
            }
            const maxTruncTokens =
                maxScriptInt - scaledTruncTokensPerTruncSat + 1n;
            if (maxTruncTokens < 0n) {
                throw new Error('Parameters cannot be represented in Script');
            }
            if (truncTokens > maxTruncTokens) {
                // Case where truncTokens itself is close to maxScriptInt
                tokenScaleFactor = 1n;
                truncTokens = maxTruncTokens;
            } else {
                // Case where scaled tokens would exceed maxScriptInt
                tokenScaleFactor = maxTruncTokens / truncTokens;
            }
            // Recalculate price
            scaledTruncTokensPerTruncSat = calcScaledTruncTokensPerTruncSat();
        }

        // Scale + truncate the minimum accepted tokens
        let minAcceptedScaledTruncTokens =
            (params.minAcceptedTokens * tokenScaleFactor) >>
            (8n * numTokenTruncBytes);

        const agoraPartial = new AgoraPartial({
            truncTokens,
            numTokenTruncBytes: Number(numTokenTruncBytes),
            tokenScaleFactor,
            scaledTruncTokensPerTruncSat,
            numSatsTruncBytes: Number(numSatsTruncBytes),
            makerPk: params.makerPk,
            minAcceptedScaledTruncTokens,
            tokenId: params.tokenId,
            tokenType: params.tokenType,
            tokenProtocol: params.tokenProtocol,
            scriptLen: 0x7f,
            dustAmount: params.dustAmount ?? DEFAULT_DUST_LIMIT,
        });
        if (agoraPartial.minAcceptedTokens() < 1n) {
            throw new Error('minAcceptedTokens too small, got truncated to 0');
        }
        agoraPartial.updateScriptLen();
        return agoraPartial;
    }

    public updateScriptLen() {
        let measuredLength = this.script().cutOutCodesep(0).bytecode.length;
        if (measuredLength >= 0x80) {
            this.scriptLen = 0x80;
            measuredLength = this.script().cutOutCodesep(0).bytecode.length;
        }
        this.scriptLen = measuredLength;
    }

    /**
     * How many tokens are accually offered by the Script.
     * This may differ from the offeredTokens in the AgoraPartialParams used to
     * approximate this AgoraPartial.
     **/
    public offeredTokens(): bigint {
        return this.truncTokens << BigInt(8 * this.numTokenTruncBytes);
    }

    /**
     * Actual minimum acceptable tokens of this Script.
     * This may differ from the minAcceptedTokens in the AgoraPartialParams used
     * to approximate this AgoraPartial.
     **/
    public minAcceptedTokens(): bigint {
        return (
            (this.minAcceptedScaledTruncTokens <<
                BigInt(8 * this.numTokenTruncBytes)) /
            this.tokenScaleFactor
        );
    }

    /**
     * Calculate the actually asked satoshi amount for the given accepted number of tokens.
     * This is the exact amount that has to be sent to makerPk's P2PKH address
     * to accept the offer.
     * `acceptedTokens` must have the lowest numTokenTruncBytes bytes set to 0,
     * use prepareAcceptedTokens to do so.
     **/
    public askedSats(acceptedTokens: bigint): bigint {
        const numSatsTruncBits = BigInt(8 * this.numSatsTruncBytes);
        const numTokenTruncBits = BigInt(8 * this.numTokenTruncBytes);
        const acceptedTruncTokens = acceptedTokens >> numTokenTruncBits;
        if (acceptedTruncTokens << numTokenTruncBits != acceptedTokens) {
            throw new Error(
                `acceptedTokens must have the last ${numTokenTruncBits} bits ` +
                    'set to zero, use prepareAcceptedTokens to get a valid amount',
            );
        }
        // Divide rounding up
        const askedTruncSats =
            (acceptedTruncTokens * this.tokenScaleFactor +
                this.scaledTruncTokensPerTruncSat -
                1n) /
            this.scaledTruncTokensPerTruncSat;
        // Un-truncate sats
        return askedTruncSats << numSatsTruncBits;
    }

    /**
     * Prepare the given acceptedTokens amount for the Script; `acceptedTokens`
     * must have the lowest numTokenTruncBytes bytes set to 0 and this function
     * does this for us.
     **/
    public prepareAcceptedTokens(acceptedTokens: bigint): bigint {
        const numTokenTruncBits = BigInt(8 * this.numTokenTruncBytes);
        return (acceptedTokens >> numTokenTruncBits) << numTokenTruncBits;
    }

    /**
     * Calculate the actual priceNanoSatsPerToken of this offer, factoring in
     * all approximation inacurracies.
     * Due to the rounding, the price can change based on the accepted token
     * amount. By default it calculates the price per token for accepting the
     * entire offer.
     **/
    public priceNanoSatsPerToken(acceptedTokens?: bigint): bigint {
        acceptedTokens ??= this.offeredTokens();
        const prepared = this.prepareAcceptedTokens(acceptedTokens);
        const sats = this.askedSats(prepared);
        return (sats * 1000000000n) / prepared;
    }

    public adPushdata(): Uint8Array {
        const serAdPushdata = (writer: Writer) => {
            if (this.tokenProtocol == 'ALP') {
                throw new Error('Currently only SLP implemented');
            }
            writer.putU8(this.numTokenTruncBytes);
            writer.putU8(this.numSatsTruncBytes);
            writer.putU64(this.tokenScaleFactor);
            writer.putU64(this.scaledTruncTokensPerTruncSat);
            writer.putU64(this.minAcceptedScaledTruncTokens);
            writer.putBytes(this.makerPk);
        };
        const lengthWriter = new WriterLength();
        serAdPushdata(lengthWriter);
        const bytesWriter = new WriterBytes(lengthWriter.length);
        serAdPushdata(bytesWriter);
        return bytesWriter.data;
    }

    public covenantConsts(): [Uint8Array, number] {
        const adPushdata = this.adPushdata();
        // "Consts" is serialized data with the terms of the offer + the token
        // protocol intros.
        if (this.tokenProtocol == 'SLP') {
            const slpSendIntro = slpSend(this.tokenId, this.tokenType, [
                0,
            ]).bytecode;
            const covenantConstsWriter = new WriterBytes(
                slpSendIntro.length + adPushdata.length,
            );
            covenantConstsWriter.putBytes(slpSendIntro);
            covenantConstsWriter.putBytes(adPushdata);
            return [covenantConstsWriter.data, slpSendIntro.length];
        } else {
            throw new Error('Only SLP implemented');
        }
    }

    public script(): Script {
        const [covenantConsts, tokenIntroLen] = this.covenantConsts();

        // Serialize scaled tokens as 8-byte little endian.
        // Even though Script currently doesn't support 64-bit integers,
        // this allows us to eventually upgrade to 64-bit without changing this
        // Script at all.
        const scaledTruncTokens8LeWriter = new WriterBytes(8);
        scaledTruncTokens8LeWriter.putU64(
            this.truncTokens * this.tokenScaleFactor,
        );
        const scaledTruncTokens8Le = scaledTruncTokens8LeWriter.data;

        return Script.fromOps([
            // # Push consts
            pushBytesOp(covenantConsts),
            // # Push offered token amount as scaled trunc tokens, as u64 LE
            pushBytesOp(scaledTruncTokens8Le),
            // # Use OP_CODESEPERATOR to remove the above two (large) pushops
            // # from the sighash preimage (tx size optimization)
            OP_CODESEPARATOR,
            // OP_ROT(isPurchase, _, _)
            OP_ROT,
            // OP_IF(isPurchase)
            OP_IF,
            // scaledTruncTokens = OP_BIN2NUM(scaledTruncTokens8Le)
            OP_BIN2NUM,
            // OP_ROT(acceptedScaledTruncTokens, _, _)
            OP_ROT,

            // # Verify accepted amount doesn't exceed available amount
            // OP_2DUP(scaledTruncTokens, acceptedScaledTruncTokens)
            OP_2DUP,
            // isNotExcessive = OP_GREATERTHANOREQUAL(scaledTruncTokens,
            //                                        acceptedScaledTruncTokens)
            OP_GREATERTHANOREQUAL,
            // OP_VERIFY(isNotExcessive)
            OP_VERIFY,

            // # Verify accepted amount is above a required minimum
            // OP_DUP(acceptedScaledTruncTokens)
            OP_DUP,
            // # Ensure minimum accepted amount is not violated
            pushNumberOp(this.minAcceptedScaledTruncTokens),
            // isEnough = OP_GREATERTHANOREQUAL(acceptedScaledTruncTokens,
            //                                  minAcceptedScaledTruncTokens)
            OP_GREATERTHANOREQUAL,
            // OP_VERIFY(isEnough)
            OP_VERIFY,

            // # Verify accepted amount is scaled correctly, must be a
            // # multiple of tokenScaleFactor.
            // OP_DUP(acceptedScaledTruncTokens)
            OP_DUP,
            pushNumberOp(this.tokenScaleFactor),
            // scaleRemainder = OP_MOD(acceptedScaledTruncTokens,
            //                         tokenScaleFactor)
            OP_MOD,
            OP_0,
            // OP_EQUALVERIFY(scaleRemainder, 0)
            OP_EQUALVERIFY,

            // OP_TUCK(_, acceptedScaledTruncTokens);
            OP_TUCK,

            // # Calculate tokens left over after purchase
            // leftoverScaledTruncTokens = OP_SUB(scaledTruncTokens,
            //                                    acceptedScaledTruncTokens)
            OP_SUB,

            // # Get token intro from consts
            // depthConsts = depth_of(consts)
            pushNumberOp(2),
            // consts = OP_PICK(depthConsts);
            OP_PICK,

            // # Size of the token protocol intro
            pushNumberOp(tokenIntroLen),
            // tokenIntro, agoraIntro = OP_SPLIT(consts, introSize)
            OP_SPLIT,
            // OP_DROP(agoraIntro)
            OP_DROP,

            // OP_OVER(leftoverScaledTruncTokens, _)
            OP_OVER,

            // hasLeftover = OP_0NOTEQUAL(leftoverScaledTruncTokens)
            // # (SCRIPT_VERIFY_MINIMALIF is not on eCash, but better be safe)
            OP_0NOTEQUAL,

            // Insert (sub)script that builds the OP_RETURN for SLP/ALP
            ...this._scriptBuildOpReturn(),

            // # Add trunc padding for sats to un-truncate sats
            pushBytesOp(new Uint8Array(this.numSatsTruncBytes)),

            // outputsOpreturnPad = OP_CAT(opreturnOutput, truncPaddingSats)
            OP_CAT,

            // OP_ROT(acceptedScaledTruncTokens, _, _)
            OP_ROT,

            // # We divide rounding up when we calc sats, so add divisor - 1
            pushNumberOp(this.scaledTruncTokensPerTruncSat - 1n),
            OP_ADD,

            // # Price (scaled + truncated)
            pushNumberOp(this.scaledTruncTokensPerTruncSat),

            // # Calculate how many (truncated) sats the user has to pay
            // requiredTruncSats = OP_DIV(acceptedScaledTruncTokens,
            //                            scaledTruncTokensPerTruncSat)
            OP_DIV,

            // # Build the required sats with the correct byte length
            // truncLen = 8 - numSatsTruncBytes
            pushNumberOp(8 - this.numSatsTruncBytes),
            // requiredTruncSatsLe = OP_NUM2BIN(requiredTruncSats, truncLen)
            OP_NUM2BIN,
            // # Build OP_RETURN output + satoshi amount (8 bytes LE).
            // # We already added the padding to un-truncate sats in the
            // # previous OP_CAT to the output.
            // outputsOpreturnSats =
            //     OP_CAT(outputsOpreturnPad, requiredTruncSatsLe)
            OP_CAT,

            // # Build maker's P2PKH script
            // p2pkhIntro = [25, OP_DUP, OP_HASH160, 20]
            pushBytesOp(new Uint8Array([25, OP_DUP, OP_HASH160, 20])),
            // OP_2OVER(consts, leftoverScaledTruncTokens, _, _);
            OP_2OVER,
            // OP_DROP(leftoverScaledTruncTokens);
            OP_DROP,
            // # Slice out pubkey from the consts (always the last 33 bytes)
            // pubkeyIdx = consts.length - 33
            pushNumberOp(covenantConsts.length - 33),
            // rest, makerPk = OP_SPLIT(consts, pubkeyIdx)
            OP_SPLIT,
            // OP_NIP(rest, _)
            OP_NIP,
            // makerPkh = OP_HASH160(makerPk)
            OP_HASH160,
            // makerP2pkh1 = OP_CAT(p2pkhIntro, makerPkh)
            OP_CAT,
            // p2pkhOutro = [OP_EQUALVERIFY, OP_CHECKSIG]
            pushBytesOp(new Uint8Array([OP_EQUALVERIFY, OP_CHECKSIG])),
            // makerScript = OP_CAT(makerP2pkh1, p2pkhOutro)
            OP_CAT,

            // # Now we have the first 2 outputs: OP_RETURN + maker P2PKH
            // outputsOpreturnMaker = OP_CAT(outputsOpreturnSats, makerScript)
            OP_CAT,
            // # Move to altstack, we need it when calculating hashOutputs
            // OP_TOALTSTACK(outputsOpreturnMaker)
            OP_TOALTSTACK,

            // # Build loopback P2SH, will receive the leftover tokens with
            // # a Script with the same terms.
            // OP_TUCK(_, leftoverScaledTruncTokens);
            OP_TUCK,
            // P2SH has dust sats
            pushNumberOp(this.dustAmount),
            OP_8,
            // dustAmount8le = OP_NUM2BIN(dustAmount, 8)
            OP_NUM2BIN,
            // p2shIntro = [23, OP_HASH160, 20]
            pushBytesOp(new Uint8Array([23, OP_HASH160, 20])),
            // loopbackOutputIntro = OP_CAT(dustAmount8le, p2shIntro);
            OP_CAT,

            // # Build the new redeem script; same terms but different
            // # scaledTruncTokens8Le.

            // # Build opcode to push consts. Sometimes they get long and we
            // # need OP_PUSHDATA1.
            // pushConstsOpcode = if consts.length >= OP_PUSHDATA1 {
            //     [OP_PUSHDATA1, consts.length]
            // } else {
            //     [consts.length]
            // }
            pushBytesOp(
                new Uint8Array(
                    covenantConsts.length >= OP_PUSHDATA1
                        ? [OP_PUSHDATA1, covenantConsts.length]
                        : [covenantConsts.length],
                ),
            ),

            // OP_2SWAP(consts, leftoverScaledTruncTokens, _, _)
            OP_2SWAP,
            OP_8,
            // OP_TUCK(_, 8)
            OP_TUCK,
            // leftoverScaledTruncTokens8le =
            //     OP_NUM2BIN(leftoverScaledTruncTokens, 8)
            OP_NUM2BIN,
            // pushLeftoverScaledTruncTokens8le =
            //     OP_CAT(8, leftoverScaledTruncTokens8le)
            OP_CAT,
            // constsPushLeftover =
            //     OP_CAT(consts, pushLeftoverScaledTruncTokens8le)
            OP_CAT,
            // # The two ops that push consts plus amount
            // pushState = OP_CAT(pushConstsOpcode, constsPushLeftover)
            OP_CAT,
            // opcodesep = [OP_CODESEPARATOR]
            pushBytesOp(new Uint8Array([OP_CODESEPARATOR])),
            // loopbackScriptIntro = OP_CAT(pushState, opcodesep)
            OP_CAT,
            // depthPreimage4_10 = depth_of(preimage4_10);
            pushNumberOp(3),
            // preimage4_10 = OP_PICK(depthPreimage4_10);
            OP_PICK,
            // scriptCodeIdx = 36 + if scriptLen < 0xfd { 1 } else { 3 }
            pushNumberOp(36 + (this.scriptLen < 0xfd ? 1 : 3)),
            // outpoint, preimage5_10 = OP_SPLIT(preimage4_10, scriptCodeIdx)
            OP_SPLIT,
            // OP_NIP(outpoint, __)
            OP_NIP,
            // # Split out scriptCode
            pushNumberOp(this.scriptLen),
            // script_code, preimage6_10 = OP_SPLIT(preimage5_10, scriptLen)
            OP_SPLIT,

            // # Extract hashOutputs
            OP_12,
            // (preimage6_7, preimage8_10) = OP_SPLIT(preimage6_10, 12)
            OP_SPLIT,
            // OP_NIP(preimage6_7, _)
            OP_NIP,
            // # Split out hashOutputs
            pushNumberOp(32),
            // actualHashOutputs, preimage9_10 = OP_SPLIT(preimage8_10, 32)
            OP_SPLIT,
            // OP_DROP(preimage9_10)
            OP_DROP,
            // # Move to altstack, will be needed later
            // OP_TOALTSTACK(actualHashOutputs)
            OP_TOALTSTACK,

            // # Build redeemScript of loopback P2SH output
            // loopbackScript = OP_CAT(loopbackScriptIntro, scriptCode)
            OP_CAT,
            // # Calculate script hash for P2SH script
            // loopbackScriptHash = OP_HASH160(loopbackScript)
            OP_HASH160,
            // loopbackOutputIntroSh =
            //     OP_CAT(loopbackOutputIntro, loopbackScriptHash)
            OP_CAT,
            // p2shEnd = [OP_EQUAL]
            pushBytesOp(new Uint8Array([OP_EQUAL])),
            // # Build loopback P2SH output
            // loopbackOutput = OP_CAT(loopbackOutputIntroSh, p2shEnd)
            OP_CAT,

            // # Check if we have tokens left over and send them back
            // # It is cheaper (in bytes) to build the loopback output and then
            // # throw it away if needed than to not build it at all.
            // OP_SWAP(leftoverScaledTruncTokens, _)
            OP_SWAP,
            // hasLeftover = OP_0NOTEQUAL(leftoverScaledTruncTokens)
            OP_0NOTEQUAL,
            // OP_NOTIF(hasLeftover)
            OP_NOTIF,
            // OP_DROP(loopbackOutput)
            OP_DROP,
            // loopbackOutput = []
            pushBytesOp(new Uint8Array()),
            OP_ENDIF,

            // OP_ROT(buyerOutputs, _, _)
            OP_ROT,

            // # Verify user specified output, otherwise total burn on ALP
            // buyerOutputs, buyerOutputsSize = OP_SIZE(buyerOutputs)
            OP_SIZE,
            // isNotEmpty = OP_0NOTEQUAL(buyerOutputsSize)
            OP_0NOTEQUAL,
            // OP_VERIFY(isNotEmpty)
            OP_VERIFY,

            // # Loopback + taker outputs
            // outputsLoopbackTaker = OP_CAT(loopbackOutput, buyerOutputs)
            OP_CAT,

            // OP_FROMALTSTACK(actualHashOutputs)
            OP_FROMALTSTACK,
            // OP_FROMALTSTACK(outputsOpreturnMaker)
            OP_FROMALTSTACK,
            // OP_ROT(outputsLoopbackTaker, _, _)
            OP_ROT,
            // # Outputs expected by this Script
            // expectedOutputs = OP_CAT(outputsOpreturnMaker,
            //                          outputsLoopbackTaker)
            OP_CAT,
            // expectedHashOutputs = OP_HASH256(expectedOutputs)
            OP_HASH256,
            // # Verify tx has the expected outputs
            // OP_EQUALVERIFY(actualHashOutputs, expectedHashOutputs)
            OP_EQUALVERIFY,

            // # Build sighash preimage parts 1 to 3 via OP_NUM2BIN
            // txVersion = 2
            OP_2,
            // preimage1_3Len = 4 + 32 + 32
            pushNumberOp(4 + 32 + 32),
            // preimage1_3 = OP_NUM2BIN(txVersion, preimage1_3Len)
            OP_NUM2BIN,

            // # Build full sighash preimage
            // OP_SWAP(preimage4_10, preimage1_3)
            OP_SWAP,
            // preimage = OP_CAT(preimage1_3, preimage4_10)
            OP_CAT,

            // # Sighash for this covenant
            // preimageSha256 = OP_SHA256(preimage)
            OP_SHA256,

            // # Verify our sighash actually matches that of the transaction
            // OP_3DUP(covenantPk, covenantSig, preimageSha256)
            OP_3DUP,
            // OP_ROT(covenantPk, covenantSig, preimageSha256)
            OP_ROT,
            // OP_CHECKDATASIGVERIFY(covenantSig, preimageSha256, covenantPk)
            OP_CHECKDATASIGVERIFY,
            // OP_DROP(preimageSha256)
            OP_DROP,
            // sigHashFlags = [ALL_ANYONECANPAY_BIP143]
            pushBytesOp(new Uint8Array([ALL_ANYONECANPAY_BIP143.toInt()])),
            // covenantSigFlagged = OP_CAT(covenantSig, sigHashFlags)
            OP_CAT,
            // covenantSig, pk = OP_SWAP(covenantPk, covenantSigFlagged)
            OP_SWAP,

            OP_ELSE,

            // # "Cancel" branch, split out the maker pubkey and verify sig
            // # is for the maker pubkey.
            // OP_DROP(scaledTruncTokens8le);
            OP_DROP,
            // pubkeyIdx = consts.length - 33
            pushNumberOp(covenantConsts.length - 33),
            // rest, pk = OP_SPLIT(consts, pubkeyIdx)
            OP_SPLIT,
            // OP_NIP(rest, __)
            OP_NIP,

            OP_ENDIF,

            // # SLP and ALP differ at the end of the Script
            ...this._scriptOutro(),
        ]);
    }

    private _scriptBuildOpReturn(): Op[] {
        // Script takes in the token amounts and builds the OP_RETURN for the
        // corresponding protocol
        if (this.tokenProtocol == 'SLP') {
            return this._scriptBuildSlpOpReturn();
        } else {
            throw new Error('Only SLP implemented');
        }
    }

    private _scriptBuildSlpOpReturn(): Op[] {
        const scriptSerSlpTruncTokens = () => {
            // Serialize the number on the stack using the configured truncation
            if (this.numTokenTruncBytes == 5) {
                // Edge case where we only have 3 bytes space to serialize the
                // number, but if the MSB of the number is set, OP_NUM2BIN will
                // serialize using 4 bytes (with the last byte being just 0x00),
                // so we always serialize using 4 bytes and then cut the last
                // byte (that's always 0x00) off.
                return [
                    pushNumberOp(4),
                    OP_NUM2BIN,
                    pushNumberOp(3),
                    OP_SPLIT,
                    OP_DROP,
                ];
            } else {
                // If we have 4 or more bytes space, we can always serialize
                // just using normal OP_NUM2BIN.
                return [pushNumberOp(8 - this.numTokenTruncBytes), OP_NUM2BIN];
            }
        };
        return [
            // # If there's a leftover, append it to the token amounts
            // OP_IF(leftoverScaledTruncTokens)
            OP_IF,
            // # Size of an SLP amount
            OP_8,
            // tokenIntro8 = OP_CAT(tokenIntro, 8);
            OP_CAT,
            // OP_OVER(leftoverScaledTruncTokens, _)
            OP_OVER,
            // # Scale down the scaled leftover amount
            pushNumberOp(this.tokenScaleFactor),
            // leftoverTokensTrunc = OP_DIV(leftoverScaledTruncTokens,
            //                              tokenScaleFactor)
            OP_DIV,
            // # Serialize the leftover trunc tokens (overflow-safe)
            ...scriptSerSlpTruncTokens(),
            // # SLP uses big-endian, so we have to use OP_REVERSEBYTES
            // leftoverTokenTruncBe = OP_REVERSEBYTES(leftoverTokenTruncLe)
            OP_REVERSEBYTES,
            // # Bytes to un-truncate the leftover tokens
            pushBytesOp(new Uint8Array(this.numTokenTruncBytes)),
            // # Build the actual 8 byte big-endian leftover
            // leftoverToken8be = OP_CAT(leftoverTokenTruncBe, untruncatePad);
            OP_CAT,
            // # Append the leftover to the token intro
            // tokenScript = OP_CAT(tokenIntro8, leftoverToken8be);
            OP_CAT,

            OP_ENDIF,

            // # Append accepted token amount going to the taker
            // # Size of an SLP amount
            OP_8,
            // tokenScript = OP_CAT(tokenScript, 8)
            OP_CAT,
            // # Get the accepted token amount
            // depthAcceptedScaledTruncTokens =
            //     depth_of(acceptedScaledTruncTokens)
            pushNumberOp(2),
            // acceptedScaledTruncTokens =
            //     OP_PICK(depthAcceptedScaledTruncTokens)
            OP_PICK,
            // # Scale down the accepted token amount
            pushNumberOp(this.tokenScaleFactor),
            // acceptedTokensTrunc = OP_DIV(acceptedScaledTruncTokens,
            //                              tokenScaleFactor)
            OP_DIV,
            // # Serialize the accepted token amount (overflow-safe)
            ...scriptSerSlpTruncTokens(),
            // # SLP uses big-endian, so we have to use OP_REVERSEBYTES
            // acceptedTokensTruncBe = OP_REVERSEBYTES(acceptedTokensTruncLe);
            OP_REVERSEBYTES,
            // # Bytes to un-truncate the leftover tokens
            pushBytesOp(new Uint8Array(this.numTokenTruncBytes)),
            // acceptedTokens8be = OP_CAT(acceptedTokensTruncBe, untruncatePad);
            OP_CAT,

            // # Finished SLP token script
            // tokenScript = OP_CAT(tokenScript, acceptedTokens8be);
            OP_CAT,

            // # Build OP_RETURN script with 0u64 and size prepended
            // # tokenScript, tokenScriptSize = OP_SIZE(tokenScript)
            OP_SIZE,

            // # Build output value (0u64) + tokenScriptSize.
            // # In case the tokenScriptSize > 127, it will be represented as
            // # 0xXX00 in Script, but it should be just 0xXX.
            // # We could serialize to 2 bytes and then cut one off, but here we
            // # use a neat optimization: We serialize to 9 bytes (resulting in
            // # 0xXX0000000000000000) and then call OP_REVERSEBYTES, which
            // # will result in 0x0000000000000000XX, which is exactly what the
            // # first 9 bytes of the OP_RETURN output should look like.
            OP_9,
            // tokenScriptSize9Le = OP_NUM2BIN(tokenScriptSize, 9)
            OP_NUM2BIN,
            // opreturnValueSize = OP_REVERSEBYTES(tokenScriptSize9Le);
            OP_REVERSEBYTES,

            // OP_SWAP(tokenScript, opreturnValueSize);
            OP_SWAP,
            // opreturnOutput = OP_CAT(opreturnValueSize, tokenScript);
            OP_CAT,
        ];
    }

    private _scriptOutro(): Op[] {
        if (this.tokenProtocol == 'SLP') {
            // Verify the sig, and also ensure the first two push ops of the
            // scriptSig are "AGR0" "PARTIAL", which will always have to be the
            // first two ops because of the cleanstack rule.
            return [
                OP_CHECKSIGVERIFY,
                pushBytesOp(strToBytes(AgoraPartial.COVENANT_VARIANT)),
                OP_EQUALVERIFY,
                pushBytesOp(AGORA_LOKAD_ID),
                OP_EQUAL,
            ];
        } else {
            throw new Error('Only SLP implemented');
        }
    }
}
