// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { DEFAULT_DUST_LIMIT } from 'ecash-lib';

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
        // TODO: Actually calculate the script length
        // Random placeholder to ensure tests aren't dependent on this
        this.scriptLen = Math.floor(Math.random() * 1000);
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
}
