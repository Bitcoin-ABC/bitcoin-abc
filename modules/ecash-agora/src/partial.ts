// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    ALL_ANYONECANPAY_BIP143,
    ALL_BIP143,
    alpSend,
    DEFAULT_DUST_SATS,
    Ecc,
    emppScript,
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
    OP_3,
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
     * from `AgoraPartial`.offeredAtoms(), so make sure to use that when
     * preparing the offer!
     *
     * For SLP, the maximum allowed value here is 0xffffffffffffffff, for ALP it
     * is 0xffffffffffff.
     **/
    offeredAtoms: bigint;
    /**
     * Price in nano sats per atom (aka base token).
     * Using nsats allows users to specify a very large range of prices, from
     * tokens where billions of them cost a single sat, to offers where single
     * tokens can cost millions of XEC.
     **/
    priceNanoSatsPerAtom: bigint;
    /**
     * Public key of the offering party.
     * This is the public key of the wallet, and it serves both as the pubkey to
     * cancel the offer, as well as the pubkey of the P2PKH script to send the
     * sats to.
     **/
    makerPk: Uint8Array;
    /**
     * Minimum number of atoms that can be accepted.
     * Can be used to avoid spam and prevent exploits with really small
     * accept amounts.
     * Also, small amounts can have very bad precision, and raising the minimum
     * amount can mitigate this.
     * It can also just be used to increase the minimum for which tokens are
     * available.
     * It is recommended to set this to 0.1% of the offered amount.
     **/
    minAcceptedAtoms: bigint;
    /** Token ID of the offered token, in big-endian hex. */
    tokenId: string;
    /** Token type of the offered token. */
    tokenType: number;
    /** Token protocol of the offered token. */
    tokenProtocol: 'SLP' | 'ALP';
    /**
     * Locktime enforced by the Script. Used to make identical offers unique.
     *
     * Use Agora.selectParams to automatically select a good value for this,
     * only set this manually if you know what you're doing.
     *
     * If there's two offers with identical terms, it would be possible to burn
     * one of them by accepting both in one transaction.
     * To prevent this for identical offers, set to unique (past) locktimes.
     **/
    enforcedLockTime: number;
    /** Dust amount to be used by the script. */
    dustSats?: bigint;
    /**
     * Minimum atomsScaleFactor when approximating numAtomsTruncBytes.
     * It is recommended to leave this at the default (1000), but it is exposed
     * to either increase price precision and granularity of token amounts (by
     * raising the limit), or to lower price precision but allow more fine-
     * grained token amounts (by lowering the limit).
     **/
    minAtomsScaleFactor?: bigint;
    /**
     * Minimum integer when representing the price
     * (scaledTruncAtomsPerTruncSat), the approximation will truncate
     * additional sats bytes in order to make scaledTruncAtomsPerTruncSat
     * bigger.
     * It is recommended to leave this at the default (1000), but it is exposed
     * for cases where a small number of tokens are offered for a big price,
     * this can be used to improve precision.
     **/
    minPriceInteger?: bigint;
    /**
     * Minimum ratio atomsScaleFactor / scaledTruncAtomsPerTruncSat, this can
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
 *   have the prefix "scaled", and the scale factor is "atomsScaleFactor". We
 *   only scale token amounts.
 * - "Truncation": We cut off bytes at the "end" of numbers, essentially
 *   dividing them by 256 for each truncation, until they fit in 31 bits, so we
 *   can use arithmetic opcodes. Later we "un-truncate" values again by adding
 *   the bytes back. We use OP_CAT to un-truncate values, which doesn't care
 *   about the 31-bit limit. Values that have been truncated have the "trunc"
 *   prefix. We truncate both token amounts (by numAtomsTruncBytes bytes) and
 *   sats amounts (by numSatsTruncBytes).
 *
 * Scaling and truncation can be combined, such that the token price is in
 * "scaledTruncAtomsPerTruncSat".
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
     * The last numAtomsTruncBytes bytes are truncated to allow representing it
     * in Script or to increase precision.
     * This means that tokens can only be accepted at a granularity of
     * 2^(8*numAtomsTruncBytes).
     * offeredAtoms = truncAtoms * 2^(8*numAtomsTruncBytes).
     **/
    public truncAtoms: bigint;
    /**
     * How many bytes are truncated from the real token amount, so it fits into
     * 31-bit ints, or to increase precision.
     **/
    public numAtomsTruncBytes: number;
    /**
     * Factor token amounts will be multiplied with in the Script to improve
     * precision.
     **/
    public atomsScaleFactor: bigint;
    /**
     * Price in scaled trunc tokens per truncated sat.
     * This unit may seem a bit bizzare, but it is exactly what is needed in the
     * Script calculation: The "acceptedAtoms" coming from the taker is both
     * scaled by atomsScaleFactor and also truncated by numAtomsTruncBytes
     * bytes, so we only have to divide the acceptedAtoms by this number to get
     * the required (truncated) sats. So we only have to un-truncate that and we
     * have the asked sats.
     **/
    public scaledTruncAtomsPerTruncSat: bigint;
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
    public minAcceptedScaledTruncAtoms: bigint;
    /** Token of the contract, in big-endian hex. */
    public tokenId: string;
    /** Token type offered */
    public tokenType: number;
    /** Token protocol of the offered token */
    public tokenProtocol: 'SLP' | 'ALP';
    /** Byte length of the Script, after OP_CODESEPARATOR. */
    public scriptLen: number;
    /**
     * Locktime enforced by the Script. Used to make identical offers unique.
     *
     * Use Agora.selectParams to automatically select a good value for this,
     * only set this manually if you know what you're doing.
     *
     * If there's two offers with identical terms, it would be possible to burn
     * one of them by accepting both in one transaction.
     * To prevent this for identical offers, set to unique (past) locktimes.
     **/
    public enforcedLockTime: number;
    /**
     * Dust amount of the network, the Script will enforce token outputs to have
     * this amount.
     **/
    public dustSats: bigint;

    public constructor(params: {
        truncAtoms: bigint;
        numAtomsTruncBytes: number;
        atomsScaleFactor: bigint;
        scaledTruncAtomsPerTruncSat: bigint;
        numSatsTruncBytes: number;
        makerPk: Uint8Array;
        minAcceptedScaledTruncAtoms: bigint;
        tokenId: string;
        tokenType: number;
        tokenProtocol: 'SLP' | 'ALP';
        scriptLen: number;
        enforcedLockTime: number;
        dustSats: bigint;
    }) {
        this.truncAtoms = params.truncAtoms;
        this.numAtomsTruncBytes = params.numAtomsTruncBytes;
        this.atomsScaleFactor = params.atomsScaleFactor;
        this.scaledTruncAtomsPerTruncSat = params.scaledTruncAtomsPerTruncSat;
        this.numSatsTruncBytes = params.numSatsTruncBytes;
        this.makerPk = params.makerPk;
        this.minAcceptedScaledTruncAtoms = params.minAcceptedScaledTruncAtoms;
        this.tokenId = params.tokenId;
        this.tokenType = params.tokenType;
        this.tokenProtocol = params.tokenProtocol;
        this.scriptLen = params.scriptLen;
        this.enforcedLockTime = params.enforcedLockTime;
        this.dustSats = params.dustSats;
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
        if (params.offeredAtoms < 1n) {
            throw new Error('offeredAtoms must be at least 1');
        }
        if (params.priceNanoSatsPerAtom < 1n) {
            throw new Error('priceNanoSatsPerAtom must be at least 1');
        }
        if (params.minAcceptedAtoms < 1n) {
            throw new Error('minAcceptedAtoms must be at least 1');
        }
        if (
            params.tokenProtocol === 'SLP' &&
            params.offeredAtoms > 0xffffffffffffffffn
        ) {
            throw new Error(
                'For SLP, offeredAtoms can be at most 0xffffffffffffffff',
            );
        }
        if (
            params.tokenProtocol === 'ALP' &&
            params.offeredAtoms > 0xffffffffffffn
        ) {
            throw new Error(
                'For ALP, offeredAtoms can be at most 0xffffffffffff',
            );
        }

        if (params.offeredAtoms < params.minAcceptedAtoms) {
            throw new Error(
                'offeredAtoms must be greater than or equal to minAcceptedAtoms',
            );
        }

        // Script uses 1 bit as sign bit, which we can't use in our calculation
        const scriptIntegerWithoutSignBits = scriptIntegerBits - 1n;
        // Max integer that can be represented in Script on the network
        const maxScriptInt = (1n << scriptIntegerWithoutSignBits) - 1n;

        // Edge case where price can be represented exactly,
        // no need to introduce extra approximation.
        const isPrecisePrice = 1000000000n % params.priceNanoSatsPerAtom === 0n;
        // The Script can only handle a maximum level of truncation
        const maxTokenTruncBytes = params.tokenProtocol === 'SLP' ? 5 : 3;

        const minAtomsScaleFactor = isPrecisePrice
            ? 1n
            : params.minAtomsScaleFactor ?? 10000n;

        // If we can't represent the offered tokens in a script int, we truncate 8
        // bits at a time until it fits.
        let truncAtoms = params.offeredAtoms;
        let numAtomsTruncBytes = 0n;
        while (
            truncAtoms * minAtomsScaleFactor > maxScriptInt &&
            numAtomsTruncBytes < maxTokenTruncBytes
        ) {
            truncAtoms >>= 8n;
            numAtomsTruncBytes++;
        }

        // Required sats to fully accept the trade (rounded down)
        const requiredSats =
            (params.offeredAtoms * params.priceNanoSatsPerAtom) / 1000000000n;

        // For bigger trades (>=2^31 sats), we need also to truncate sats
        let requiredTruncSats = requiredSats;
        let numSatsTruncBytes = 0n;
        while (requiredTruncSats > maxScriptInt) {
            requiredTruncSats >>= 8n;
            numSatsTruncBytes++;
        }

        // We scale up the token values to get some extra precision
        let atomsScaleFactor = maxScriptInt / truncAtoms;

        // How many scaled trunc tokens can be gotten for each trunc sat.
        // It is the inverse of the price specified by the user, and truncated +
        // scaled as required by the Script.
        const calcScaledTruncAtomsPerTruncSat = () =>
            ((1n << (8n * numSatsTruncBytes)) *
                atomsScaleFactor *
                1000000000n) /
            ((1n << (8n * numAtomsTruncBytes)) * params.priceNanoSatsPerAtom);

        // For trades offering a few tokens for many sats, truncate the sats
        // amounts some more to increase precision.
        const minPriceInteger = params.minPriceInteger ?? 1000n;
        // However, only truncate sats if atomsScaleFactor is well above
        // scaledTruncAtomsPerTruncSat, otherwise we lose precision because
        // we're rounding up for the sats calculation in the Script.
        const minScaleRatio = params.minScaleRatio ?? 1000n;
        let scaledTruncAtomsPerTruncSat = calcScaledTruncAtomsPerTruncSat();
        while (
            scaledTruncAtomsPerTruncSat < minPriceInteger &&
            scaledTruncAtomsPerTruncSat * minScaleRatio < atomsScaleFactor
        ) {
            numSatsTruncBytes++;
            scaledTruncAtomsPerTruncSat = calcScaledTruncAtomsPerTruncSat();
        }

        // Edge case where the sats calculation can go above the integer limit
        if (
            truncAtoms * atomsScaleFactor + scaledTruncAtomsPerTruncSat - 1n >
            maxScriptInt
        ) {
            if (truncAtoms * atomsScaleFactor <= scaledTruncAtomsPerTruncSat) {
                // Case where we just overshot the atomsScaleFactor
                atomsScaleFactor /= 2n;
                scaledTruncAtomsPerTruncSat = calcScaledTruncAtomsPerTruncSat();
            }
            const maxTruncAtoms =
                maxScriptInt - scaledTruncAtomsPerTruncSat + 1n;
            if (maxTruncAtoms < 0n) {
                throw new Error('Parameters cannot be represented in Script');
            }
            if (truncAtoms > maxTruncAtoms) {
                // Case where truncAtoms itself is close to maxScriptInt
                atomsScaleFactor = 1n;
                truncAtoms = maxTruncAtoms;
            } else {
                // Case where scaled tokens would exceed maxScriptInt
                atomsScaleFactor = maxTruncAtoms / truncAtoms;
            }
            // Recalculate price
            scaledTruncAtomsPerTruncSat = calcScaledTruncAtomsPerTruncSat();
        }

        // Scale + truncate the minimum accepted tokens
        const minAcceptedScaledTruncAtoms =
            params.minAcceptedAtoms === params.offeredAtoms
                ? // If minAcceptedAtoms is intended to be the whole offer, set it this way.
                  // This prevents creating an unacceptable offer (minAcceptedAtoms > offeredAtoms)
                  truncAtoms * atomsScaleFactor
                : (params.minAcceptedAtoms * atomsScaleFactor) >>
                  (8n * numAtomsTruncBytes);

        const dustSats = params.dustSats ?? DEFAULT_DUST_SATS;
        const agoraPartial = new AgoraPartial({
            truncAtoms,
            numAtomsTruncBytes: Number(numAtomsTruncBytes),
            atomsScaleFactor,
            scaledTruncAtomsPerTruncSat,
            numSatsTruncBytes: Number(numSatsTruncBytes),
            makerPk: params.makerPk,
            minAcceptedScaledTruncAtoms,
            tokenId: params.tokenId,
            tokenType: params.tokenType,
            tokenProtocol: params.tokenProtocol,
            scriptLen: 0x7f,
            enforcedLockTime: params.enforcedLockTime,
            dustSats,
        });
        const minAcceptedAtoms = agoraPartial.minAcceptedAtoms();
        if (minAcceptedAtoms < 1n) {
            throw new Error('minAcceptedAtoms too small, got truncated to 0');
        }

        const minAskedSats = agoraPartial.askedSats(minAcceptedAtoms);
        if (minAskedSats < dustSats) {
            throw new Error(
                'minAcceptedAtoms would cost less than dust at this price',
            );
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
     * This may differ from the offeredAtoms in the AgoraPartialParams used to
     * approximate this AgoraPartial.
     **/
    public offeredAtoms(): bigint {
        return this.truncAtoms << BigInt(8 * this.numAtomsTruncBytes);
    }

    /**
     * Actual minimum acceptable tokens of this Script.
     * This may differ from the minAcceptedAtoms in the AgoraPartialParams used
     * to approximate this AgoraPartial.
     **/
    public minAcceptedAtoms(): bigint {
        const minAcceptedAtoms =
            (this.minAcceptedScaledTruncAtoms <<
                BigInt(8 * this.numAtomsTruncBytes)) /
            this.atomsScaleFactor;

        let preparedMinAcceptedAtoms =
            this.prepareAcceptedAtoms(minAcceptedAtoms);
        if (preparedMinAcceptedAtoms < minAcceptedAtoms) {
            // It's possible that, after adjusting for acceptable discrete intervals,
            // minAcceptedAtoms becomes less than the script minimum
            // In this case, we "round up" to the true min accepted tokens
            const tickSize =
                (this.atomsScaleFactor << BigInt(8 * this.numAtomsTruncBytes)) /
                this.atomsScaleFactor;
            preparedMinAcceptedAtoms += tickSize;
        }
        return preparedMinAcceptedAtoms;
    }

    /**
     * Calculate the actually asked satoshi amount for the given accepted number of tokens.
     * This is the exact amount that has to be sent to makerPk's P2PKH address
     * to accept the offer.
     * `acceptedAtoms` must have the lowest numAtomsTruncBytes bytes set to 0,
     * use prepareAcceptedAtoms to do so.
     **/
    public askedSats(acceptedAtoms: bigint): bigint {
        const numSatsTruncBits = BigInt(8 * this.numSatsTruncBytes);
        const numTokenTruncBits = BigInt(8 * this.numAtomsTruncBytes);
        const acceptedTruncAtoms = acceptedAtoms >> numTokenTruncBits;
        if (acceptedTruncAtoms << numTokenTruncBits != acceptedAtoms) {
            throw new Error(
                `acceptedAtoms must have the last ${numTokenTruncBits} bits ` +
                    'set to zero, use prepareAcceptedAtoms to get a valid amount',
            );
        }
        // Divide rounding up
        const askedTruncSats =
            (acceptedTruncAtoms * this.atomsScaleFactor +
                this.scaledTruncAtomsPerTruncSat -
                1n) /
            this.scaledTruncAtomsPerTruncSat;
        // Un-truncate sats
        return askedTruncSats << numSatsTruncBits;
    }

    /**
     * Throw an error if accept amount is invalid
     * Note we do not prepare amounts in this function
     * @param acceptedAtoms
     */
    public preventUnacceptableRemainder(acceptedAtoms: bigint) {
        // Validation to avoid creating an offer that cannot be accepted
        //
        // 1 - confirm the remaining offer amount is more than the
        //     min accept amount for this agora partial
        //
        // 2 - Confirm the cost of accepting the (full) remainder is
        //     at least dust. This is already confirmed...for offers
        //     created by this lib... as minAcceptedAtoms() must
        //     cost more than dust
        //
        //
        // If these condtions are not met, an AgoraOffer would be created
        // that is impossible to accept; can only be canceld by its maker

        // Get the token qty that would remain after this accept
        const offeredAtoms = this.offeredAtoms();
        const remainingTokens = offeredAtoms - acceptedAtoms;
        if (remainingTokens <= 0n) {
            return;
        }
        // Full accepts are always ok

        const minAcceptedAtoms = this.minAcceptedAtoms();
        const priceOfRemainingTokens = this.askedSats(remainingTokens);
        if (remainingTokens < minAcceptedAtoms) {
            throw new Error(
                `Accepting ${acceptedAtoms} token satoshis would leave an amount lower than the min acceptable by the terms of this contract, and hence unacceptable. Accept fewer tokens or the full offer.`,
            );
        }
        if (priceOfRemainingTokens < this.dustSats) {
            throw new Error(
                `Accepting ${acceptedAtoms} token satoshis would leave an amount priced lower than dust. Accept fewer tokens or the full offer.`,
            );
        }
    }

    /**
     * Prepare the given acceptedAtoms amount for the Script; `acceptedAtoms`
     * must have the lowest numAtomsTruncBytes bytes set to 0 and this function
     * does this for us.
     **/
    public prepareAcceptedAtoms(acceptedAtoms: bigint): bigint {
        const numTokenTruncBits = BigInt(8 * this.numAtomsTruncBytes);
        return (acceptedAtoms >> numTokenTruncBits) << numTokenTruncBits;
    }

    /**
     * Calculate the actual priceNanoSatsPerAtom of this offer, factoring in
     * all approximation inacurracies.
     * Due to the rounding, the price can change based on the accepted token
     * amount. By default it calculates the price per token for accepting the
     * entire offer.
     **/
    public priceNanoSatsPerAtom(acceptedAtoms?: bigint): bigint {
        acceptedAtoms ??= this.offeredAtoms();
        const prepared = this.prepareAcceptedAtoms(acceptedAtoms);
        const sats = this.askedSats(prepared);
        return (sats * 1000000000n) / prepared;
    }

    public adPushdata(): Uint8Array {
        const serAdPushdata = (writer: Writer) => {
            if (this.tokenProtocol === 'ALP') {
                // On ALP, we signal AGR0 in the pushdata
                writer.putBytes(AGORA_LOKAD_ID);
                writer.putU8(AgoraPartial.COVENANT_VARIANT.length);
                writer.putBytes(strToBytes(AgoraPartial.COVENANT_VARIANT));
            }
            writer.putU8(this.numAtomsTruncBytes);
            writer.putU8(this.numSatsTruncBytes);
            writer.putU64(this.atomsScaleFactor);
            writer.putU64(this.scaledTruncAtomsPerTruncSat);
            writer.putU64(this.minAcceptedScaledTruncAtoms);
            writer.putU32(this.enforcedLockTime);
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
        if (this.tokenProtocol === 'SLP') {
            const slpSendIntro = slpSend(this.tokenId, this.tokenType, [
                0n,
            ]).bytecode;
            const covenantConstsWriter = new WriterBytes(
                slpSendIntro.length + adPushdata.length,
            );
            covenantConstsWriter.putBytes(slpSendIntro);
            covenantConstsWriter.putBytes(adPushdata);
            return [covenantConstsWriter.data, slpSendIntro.length];
        } else if (this.tokenProtocol === 'ALP') {
            const alpSendTemplate = alpSend(this.tokenId, this.tokenType, []);
            // ALP SEND section, but without the num amounts
            const alpSendIntro = alpSendTemplate.slice(
                0,
                alpSendTemplate.length - 1,
            );
            // eMPP script with Agora ad, but without the ALP section
            const emppIntro = emppScript([adPushdata]);
            const covenantConstsWriter = new WriterBytes(
                alpSendIntro.length + emppIntro.bytecode.length,
            );
            covenantConstsWriter.putBytes(alpSendIntro);
            covenantConstsWriter.putBytes(emppIntro.bytecode);
            return [covenantConstsWriter.data, alpSendIntro.length];
        } else {
            throw new Error('Not implemented');
        }
    }

    public script(): Script {
        const [covenantConsts, tokenIntroLen] = this.covenantConsts();

        // Serialize scaled tokens as 8-byte little endian.
        // Even though Script currently doesn't support 64-bit integers,
        // this allows us to eventually upgrade to 64-bit without changing this
        // Script at all.
        const scaledTruncAtoms8LeWriter = new WriterBytes(8);
        scaledTruncAtoms8LeWriter.putU64(
            this.truncAtoms * this.atomsScaleFactor,
        );
        const scaledTruncAtoms8Le = scaledTruncAtoms8LeWriter.data;

        const enforcedLockTime4LeWriter = new WriterBytes(4);
        enforcedLockTime4LeWriter.putU32(this.enforcedLockTime);
        const enforcedLockTime4Le = enforcedLockTime4LeWriter.data;

        return Script.fromOps([
            // # Push consts
            pushBytesOp(covenantConsts),
            // # Push offered token amount as scaled trunc tokens, as u64 LE
            pushBytesOp(scaledTruncAtoms8Le),
            // # Use OP_CODESEPERATOR to remove the above two (large) pushops
            // # from the sighash preimage (tx size optimization)
            OP_CODESEPARATOR,
            // OP_ROT(isPurchase, _, _)
            OP_ROT,
            // OP_IF(isPurchase)
            OP_IF,
            // scaledTruncAtoms = OP_BIN2NUM(scaledTruncAtoms8Le)
            OP_BIN2NUM,
            // OP_ROT(acceptedScaledTruncAtoms, _, _)
            OP_ROT,

            // # Verify accepted amount doesn't exceed available amount
            // OP_2DUP(scaledTruncAtoms, acceptedScaledTruncAtoms)
            OP_2DUP,
            // isNotExcessive = OP_GREATERTHANOREQUAL(scaledTruncAtoms,
            //                                        acceptedScaledTruncAtoms)
            OP_GREATERTHANOREQUAL,
            // OP_VERIFY(isNotExcessive)
            OP_VERIFY,

            // # Verify accepted amount is above a required minimum
            // OP_DUP(acceptedScaledTruncAtoms)
            OP_DUP,
            // # Ensure minimum accepted amount is not violated
            pushNumberOp(this.minAcceptedScaledTruncAtoms),
            // isEnough = OP_GREATERTHANOREQUAL(acceptedScaledTruncAtoms,
            //                                  minAcceptedScaledTruncAtoms)
            OP_GREATERTHANOREQUAL,
            // OP_VERIFY(isEnough)
            OP_VERIFY,

            // # Verify accepted amount is scaled correctly, must be a
            // # multiple of atomsScaleFactor.
            // OP_DUP(acceptedScaledTruncAtoms)
            OP_DUP,
            pushNumberOp(this.atomsScaleFactor),
            // scaleRemainder = OP_MOD(acceptedScaledTruncAtoms,
            //                         atomsScaleFactor)
            OP_MOD,
            OP_0,
            // OP_EQUALVERIFY(scaleRemainder, 0)
            OP_EQUALVERIFY,

            // OP_TUCK(_, acceptedScaledTruncAtoms);
            OP_TUCK,

            // # Calculate tokens left over after purchase
            // leftoverScaledTruncAtoms = OP_SUB(scaledTruncAtoms,
            //                                    acceptedScaledTruncAtoms)
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

            // OP_OVER(leftoverScaledTruncAtoms, _)
            OP_OVER,

            // hasLeftover = OP_0NOTEQUAL(leftoverScaledTruncAtoms)
            // # (SCRIPT_VERIFY_MINIMALIF is not on eCash, but better be safe)
            OP_0NOTEQUAL,

            // Insert (sub)script that builds the OP_RETURN for SLP/ALP
            ...this._scriptBuildOpReturn(tokenIntroLen),

            // # Add trunc padding for sats to un-truncate sats
            pushBytesOp(new Uint8Array(this.numSatsTruncBytes)),

            // outputsOpreturnPad = OP_CAT(opreturnOutput, truncPaddingSats)
            OP_CAT,

            // OP_ROT(acceptedScaledTruncAtoms, _, _)
            OP_ROT,

            // # We divide rounding up when we calc sats, so add divisor - 1
            pushNumberOp(this.scaledTruncAtomsPerTruncSat - 1n),
            OP_ADD,

            // # Price (scaled + truncated)
            pushNumberOp(this.scaledTruncAtomsPerTruncSat),

            // # Calculate how many (truncated) sats the user has to pay
            // requiredTruncSats = OP_DIV(acceptedScaledTruncAtoms,
            //                            scaledTruncAtomsPerTruncSat)
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
            // OP_2OVER(consts, leftoverScaledTruncAtoms, _, _);
            OP_2OVER,
            // OP_DROP(leftoverScaledTruncAtoms);
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
            // OP_TUCK(_, leftoverScaledTruncAtoms);
            OP_TUCK,
            // P2SH has dust sats
            pushNumberOp(this.dustSats),
            OP_8,
            // dustSats8le = OP_NUM2BIN(dustSats, 8)
            OP_NUM2BIN,
            // p2shIntro = [23, OP_HASH160, 20]
            pushBytesOp(new Uint8Array([23, OP_HASH160, 20])),
            // loopbackOutputIntro = OP_CAT(dustSats8le, p2shIntro);
            OP_CAT,

            // # Build the new redeem script; same terms but different
            // # scaledTruncAtoms8Le.

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

            // OP_2SWAP(consts, leftoverScaledTruncAtoms, _, _)
            OP_2SWAP,
            OP_8,
            // OP_TUCK(_, 8)
            OP_TUCK,
            // leftoverScaledTruncAtoms8le =
            //     OP_NUM2BIN(leftoverScaledTruncAtoms, 8)
            OP_NUM2BIN,
            // pushLeftoverScaledTruncAtoms8le =
            //     OP_CAT(8, leftoverScaledTruncAtoms8le)
            OP_CAT,
            // constsPushLeftover =
            //     OP_CAT(consts, pushLeftoverScaledTruncAtoms8le)
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
            pushNumberOp(4),
            // actualLocktime4Le, sighashType = OP_SPLIT(preimage9_10)
            OP_SPLIT,
            // OP_DROP(preimage10)
            OP_DROP,
            pushBytesOp(enforcedLockTime4Le),
            // OP_EQUALVERIFY(actualLocktime4Le, enforcedLockTime4Le)
            OP_EQUALVERIFY,
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
            // OP_SWAP(leftoverScaledTruncAtoms, _)
            OP_SWAP,
            // hasLeftover = OP_0NOTEQUAL(leftoverScaledTruncAtoms)
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
            // OP_DROP(scaledTruncAtoms8le);
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

    private _scriptBuildOpReturn(tokenIntroLen: number): Op[] {
        // Script takes in the token amounts and builds the OP_RETURN for the
        // corresponding protocol
        if (this.tokenProtocol === 'SLP') {
            return this._scriptBuildSlpOpReturn();
        } else if (this.tokenProtocol === 'ALP') {
            return this._scriptBuildAlpOpReturn(tokenIntroLen);
        } else {
            throw new Error('Only SLP implemented');
        }
    }

    private _scriptBuildSlpOpReturn(): Op[] {
        return [
            // # If there's a leftover, append it to the token amounts
            // OP_IF(hasLeftover)
            OP_IF,
            // # Size of an SLP amount
            OP_8,
            // tokenIntro8 = OP_CAT(tokenIntro, 8);
            OP_CAT,
            // OP_OVER(leftoverScaledTruncAtoms, _)
            OP_OVER,
            // # Scale down the scaled leftover amount
            pushNumberOp(this.atomsScaleFactor),
            // leftoverTokensTrunc = OP_DIV(leftoverScaledTruncAtoms,
            //                              atomsScaleFactor)
            OP_DIV,
            // # Serialize the leftover trunc tokens (overflow-safe)
            ...this._scriptSerTruncAtoms(8),
            // # SLP uses big-endian, so we have to use OP_REVERSEBYTES
            // leftoverTokenTruncBe = OP_REVERSEBYTES(leftoverTokenTruncLe)
            OP_REVERSEBYTES,
            // # Bytes to un-truncate the leftover tokens
            pushBytesOp(new Uint8Array(this.numAtomsTruncBytes)),
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
            // depthAcceptedScaledTruncAtoms =
            //     depth_of(acceptedScaledTruncAtoms)
            pushNumberOp(2),
            // acceptedScaledTruncAtoms =
            //     OP_PICK(depthAcceptedScaledTruncAtoms)
            OP_PICK,
            // # Scale down the accepted token amount
            pushNumberOp(this.atomsScaleFactor),
            // acceptedAtomsTrunc = OP_DIV(acceptedScaledTruncAtoms,
            //                              atomsScaleFactor)
            OP_DIV,
            // # Serialize the accepted token amount (overflow-safe)
            ...this._scriptSerTruncAtoms(8),
            // # SLP uses big-endian, so we have to use OP_REVERSEBYTES
            // acceptedAtomsTruncBe = OP_REVERSEBYTES(acceptedAtomsTruncLe);
            OP_REVERSEBYTES,
            // # Bytes to un-truncate the leftover tokens
            pushBytesOp(new Uint8Array(this.numAtomsTruncBytes)),
            // acceptedAtoms8be = OP_CAT(acceptedAtomsTruncBe, untruncatePad);
            OP_CAT,

            // # Finished SLP token script
            // tokenScript = OP_CAT(tokenScript, acceptedAtoms8be);
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

    private _scriptBuildAlpOpReturn(tokenIntroLen: number): Op[] {
        // Script takes in the token amounts and builds the OP_RETURN for the
        // ALP token protocol
        return [
            // # If there's a leftover, add it to the token amounts
            // OP_IF(hasLeftover)
            OP_IF,

            // numTokenAmounts = 3
            OP_3,
            // # Append the number of token amounts + the first 0 amount +
            // # un-truncate padding for the 2nd output.
            // # We meld these three ops into one by using OP_NUM2BIN using
            // # 7 + numAtomsTruncBytes bytes, which gives us the number of
            // # amounts in the first byte, followed by 6 zero bytes for the
            // # first output, and then numAtomsTruncBytes bytes for the
            // # un-truncate padding.
            pushNumberOp(7 + this.numAtomsTruncBytes),
            // tokenAmounts1 = OP_NUM2BIN(numTokenAmounts, size)
            OP_NUM2BIN,
            // tokenIntro = OP_CAT(tokenIntro, tokenAmounts1)
            OP_CAT,
            // OP_OVER(leftoverScaledTruncAtoms, __)
            OP_OVER,
            // # Scale down the scaled leftover amount
            pushNumberOp(this.atomsScaleFactor),
            // nextSerValue = OP_DIV(leftoverScaledTruncAtoms,
            //                       atomsScaleFactor)
            OP_DIV,

            // # Serialize size for leftoverTokensTrunc, and also already add the un-truncate padding for the 3rd amount
            // # Combining these two ops also doesn't require us to serialize overflow-aware
            pushNumberOp(
                6 /*- this.numAtomsTruncBytes + this.numAtomsTruncBytes*/,
            ),

            OP_ELSE,

            // # Append the number of token amounts + the first 0 amount +
            // # un-truncate padding for the 3rd output.
            // nextSerValue = 2
            OP_2,
            // serializeSize = 7 + numAtomsTruncBytes
            pushNumberOp(7 + this.numAtomsTruncBytes),

            OP_ENDIF,

            // tokenAmounts2 = OP_NUM2BIN(numTokenAmounts, serializeSize)
            // # Serialize 1st/2nd output + padding for 2nd/3rd output
            OP_NUM2BIN,

            // # Build the part of the token section that has all the amounts
            // # for the maker (i.e. 0) and covenant loopback, and the
            // # un-truncate padding for the accepted token amount.
            // tokenSection1Pad = OP_CAT(tokenIntro, tokenAmounts2)
            OP_CAT,

            // depthAcceptedScaledTruncAtoms =
            //     depth_of(acceptedScaledTruncAtoms)
            pushNumberOp(2),
            // acceptedScaledTruncAtoms =
            //     OP_PICK(depthAcceptedScaledTruncAtoms)
            OP_PICK,

            // # Scale down the accepted token amount
            pushNumberOp(this.atomsScaleFactor),
            // acceptedAtomsTrunc = OP_DIV(acceptedScaledTruncAtoms,
            //                              atomsScaleFactor)
            OP_DIV,
            // # Serialize accepted token amount (overflow-safe)
            ...this._scriptSerTruncAtoms(6),

            // # Finished token section
            // tokenSection = OP_CAT(tokenSection1Pad, acceptedAtomsTruncLe);
            OP_CAT,

            // Turn token section into a pushdata op
            // tokenSection, tokenSectionSize = OP_SIZE(tokenSection)
            OP_SIZE,
            // OP_SWAP(tokenSection, tokenSectionSize)
            OP_SWAP,
            // let pushTokenSection = OP_CAT(tokenSectionSize, tokenSection);
            OP_CAT,

            // Get empp intro from consts
            // depthConsts = depth_of(consts)
            pushNumberOp(3),
            // consts = OP_PICK(depthConsts)
            OP_PICK,
            // # Split out the emppAgoraIntro to prepend it to the OP_RETURN
            pushNumberOp(tokenIntroLen),
            // tokenIntro, emppAgoraIntro = OP_SPLIT(consts, alpIntroSize)
            OP_SPLIT,
            // # We don't need the tokenIntro
            // OP_NIP(tokenIntro, _)
            OP_NIP,

            // Build OP_RETURN script with 0u64 and size prepended
            // OP_SWAP(pushTokenSection, _)
            OP_SWAP,
            // emppScript = OP_CAT(emppIntro, pushTokenSection)
            OP_CAT,
            // emppScript, emppScriptSize = OP_SIZE(emppScript)
            OP_SIZE,
            // # Build output value (0u64) + tokenScriptSize.
            // # See _scriptBuildSlpOpReturn for an explanation
            OP_9,
            // emppScriptSizeZero8 = OP_NUM2BIN(emppScriptSize, _9)
            OP_NUM2BIN,
            // zero8EmppScriptSize = OP_REVERSEBYTES(emppScriptSizeZero8)
            OP_REVERSEBYTES,
            // OP_SWAP(emppScript, zero8EmppScriptSize)
            OP_SWAP,
            // let opreturnOutput = OP_CAT(zero8EmppScriptSize, emppScript)
            OP_CAT,
        ];
    }

    private _scriptSerTruncAtoms(numSerBytes: number): Op[] {
        // Serialize the number on the stack using the configured truncation
        if (this.numAtomsTruncBytes === numSerBytes - 3) {
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
            return [
                pushNumberOp(numSerBytes - this.numAtomsTruncBytes),
                OP_NUM2BIN,
            ];
        }
    }

    private _scriptOutro(): Op[] {
        if (this.tokenProtocol === 'SLP') {
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
        } else if (this.tokenProtocol === 'ALP') {
            return [OP_CHECKSIG];
        } else {
            throw new Error('Only SLP implemented');
        }
    }

    /**
     * redeemScript of the Script advertizing this offer.
     * It requires a setup tx followed by the actual offer, which reveals
     * the covenantConsts.
     * The reason we have an OP_CHECKSIGVERIFY (as opposed to just leaving it
     * as "anyone can spend with this pushdata") is so that others on the
     * network can't spend this UTXO (and potentially take the tokens in it),
     * and only the maker can spend it.
     **/
    public adScript(): Script {
        const [covenantConsts, _] = this.covenantConsts();
        return Script.fromOps([
            pushBytesOp(covenantConsts),
            pushNumberOp(covenantConsts.length - 33),
            OP_SPLIT,
            OP_NIP,
            OP_CHECKSIGVERIFY,
            pushBytesOp(strToBytes(AgoraPartial.COVENANT_VARIANT)),
            OP_EQUALVERIFY,
            pushBytesOp(AGORA_LOKAD_ID),
            OP_EQUAL,
        ]);
    }
}

function makeScriptSigIntro(tokenProtocol: 'SLP' | 'ALP'): Op[] {
    switch (tokenProtocol) {
        case 'SLP':
            // For SLP, we need to add "AGR0" "PARTIAL" at the beginning of the
            // scriptSig, to advertize it via the LOKAD ID. ALP uses the
            // OP_RETURN, so there this is not needed.
            return [
                pushBytesOp(AGORA_LOKAD_ID),
                pushBytesOp(strToBytes(AgoraPartial.COVENANT_VARIANT)),
            ];
        default:
            return [];
    }
}

export const AgoraPartialSignatory = (
    params: AgoraPartial,
    acceptedTruncAtoms: bigint,
    covenantSk: Uint8Array,
    covenantPk: Uint8Array,
): Signatory => {
    return (ecc: Ecc, input: UnsignedTxInput) => {
        const preimage = input.sigHashPreimage(ALL_ANYONECANPAY_BIP143, 0);
        const sighash = sha256d(preimage.bytes);
        const covenantSig = ecc.schnorrSign(covenantSk, sighash);
        const hasLeftover = params.truncAtoms > acceptedTruncAtoms;
        const buyerOutputIdx = hasLeftover ? 3 : 2;
        const buyerOutputs = input.unsignedTx.tx.outputs.slice(buyerOutputIdx);

        const serTakerOutputs = (writer: Writer) => {
            for (const output of buyerOutputs) {
                writeTxOutput(output, writer);
            }
        };
        const writerLength = new WriterLength();
        serTakerOutputs(writerLength);
        const writer = new WriterBytes(writerLength.length);
        serTakerOutputs(writer);
        const buyerOutputsSer = writer.data;

        return Script.fromOps([
            ...makeScriptSigIntro(params.tokenProtocol),
            pushBytesOp(covenantPk),
            pushBytesOp(covenantSig),
            pushBytesOp(buyerOutputsSer),
            pushBytesOp(preimage.bytes.slice(4 + 32 + 32)), // preimage_4_10
            pushNumberOp(acceptedTruncAtoms * params.atomsScaleFactor),
            OP_1, // is_purchase = true
            pushBytesOp(preimage.redeemScript.bytecode),
        ]);
    };
};

export const AgoraPartialCancelSignatory = (
    makerSk: Uint8Array,
    tokenProtocol: 'SLP' | 'ALP',
): Signatory => {
    return (ecc: Ecc, input: UnsignedTxInput) => {
        const preimage = input.sigHashPreimage(ALL_BIP143, 0);
        const sighash = sha256d(preimage.bytes);
        const cancelSig = flagSignature(
            ecc.schnorrSign(makerSk, sighash),
            ALL_BIP143,
        );
        return Script.fromOps([
            ...makeScriptSigIntro(tokenProtocol),
            pushBytesOp(cancelSig),
            OP_0, // is_purchase = false
            pushBytesOp(preimage.redeemScript.bytecode),
        ]);
    };
};

export const AgoraPartialAdSignatory = (makerSk: Uint8Array) => {
    return (ecc: Ecc, input: UnsignedTxInput): Script => {
        const preimage = input.sigHashPreimage(ALL_BIP143);
        const sighash = sha256d(preimage.bytes);
        const makerSig = flagSignature(
            ecc.schnorrSign(makerSk, sighash),
            ALL_BIP143,
        );
        return Script.fromOps([
            pushBytesOp(AGORA_LOKAD_ID),
            pushBytesOp(strToBytes(AgoraPartial.COVENANT_VARIANT)),
            pushBytesOp(makerSig),
            pushBytesOp(preimage.redeemScript.bytecode),
        ]);
    };
};
