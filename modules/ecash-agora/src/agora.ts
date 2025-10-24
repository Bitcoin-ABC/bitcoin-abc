// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    ChronikClient,
    PluginEndpoint,
    PluginEntry,
    Token,
    TxHistoryPage,
    Utxo,
    WsEndpoint,
} from 'chronik-client';
import {
    alpSend,
    Bytes,
    DEFAULT_DUST_SATS,
    DEFAULT_FEE_SATS_PER_KB,
    EccDummy,
    emppScript,
    fromHex,
    Op,
    OP_0,
    OutPoint,
    readTxOutput,
    Script,
    shaRmd160,
    Signatory,
    slpSend,
    strToBytes,
    toHex,
    Tx,
    TxBuilder,
    TxBuilderInput,
    TxBuilderOutput,
    TxInput,
    TxOutput,
} from 'ecash-lib';

import {
    AgoraOneshot,
    AgoraOneshotCancelSignatory,
    AgoraOneshotSignatory,
} from './oneshot.js';
import {
    AgoraPartial,
    AgoraPartialCancelSignatory,
    AgoraPartialParams,
    AgoraPartialSignatory,
} from './partial.js';

const TOKEN_ID_PREFIX = toHex(strToBytes('T'));
const PUBKEY_PREFIX = toHex(strToBytes('P'));
const FUNGIBLE_TOKEN_ID_PREFIX = toHex(strToBytes('F'));
const GROUP_TOKEN_ID_PREFIX = toHex(strToBytes('G'));
const PLUGIN_NAME = 'agora';

const ONESHOT_HEX = toHex(strToBytes(AgoraOneshot.COVENANT_VARIANT));
const PARTIAL_HEX = toHex(strToBytes(AgoraPartial.COVENANT_VARIANT));

const PLUGIN_GROUPS_MAX_PAGE_SIZE = 50;

/** Offer variant, determines the Script used to enforce the offer */
export type AgoraOfferVariant =
    | {
          type: 'ONESHOT';
          params: AgoraOneshot;
      }
    | {
          type: 'PARTIAL';
          params: AgoraPartial;
      };

/** Status of the offer, i.e. if it open/taken/canceled */
export type AgoraOfferStatus = 'OPEN' | 'TAKEN' | 'CANCELED';

/** If an offer is TAKEN */
export interface TakenInfo {
    /** satoshis paid in taking an offer */
    sats: bigint;
    /**
     * amount of token purchased in atoms aka base tokens
     */
    atoms: bigint;
    /** taker outputScript as a hex string*/
    takerScriptHex: string;
}

/**
 * Individual token offer on the Agora, i.e. one UTXO offering tokens.
 *
 * It can be used to accept or cancel the offer.
 */
export class AgoraOffer {
    public variant: AgoraOfferVariant;
    public outpoint: OutPoint;
    public txBuilderInput: TxInput;
    public token: Token;
    public status: AgoraOfferStatus;
    public takenInfo?: TakenInfo;

    public constructor(params: {
        variant: AgoraOfferVariant;
        outpoint: OutPoint;
        txBuilderInput: TxInput;
        token: Token;
        status: AgoraOfferStatus;
        takenInfo?: TakenInfo;
    }) {
        this.variant = params.variant;
        this.outpoint = params.outpoint;
        this.txBuilderInput = params.txBuilderInput;
        this.token = params.token;
        this.status = params.status;
        if (typeof this.takenInfo !== 'undefined') {
            this.takenInfo = params.takenInfo;
        }
    }

    /**
     * Build a tx accepting this offer.
     *
     * Agora offers are UTXOs on the blockchain that can be accepted by anyone
     * sending sufficient satoshis to a required output.
     *
     * `fuelInputs` has to provide enough sats for this offer to cover ask + tx fee.
     * */
    public acceptTx(params: {
        /**
         * Arbitrary secret key to sign the accept tx with. Recommended to set
         * this to a random key. Must be paired with covenantSk.
         **/
        covenantSk: Uint8Array;
        /**
         * Arbitrary public key to sign the accept tx with, must be paired with
         * covenantSk.
         **/
        covenantPk: Uint8Array;
        /**
         * Inputs fueling this tx to cover tx fee and asked sats for the
         * enforced outputs. Must have signatory and input.signData set
         * correctly. If it is set incorrectly, may fail silently and build an
         * invalid tx, failing at broadcast.
         *
         * The free sats of these inputs must be at least askedSats + acceptFeeSats.
         **/
        fuelInputs: TxBuilderInput[];
        /** Script to send the tokens and the leftover sats (if any) to. */
        recipientScript: Script;
        /** For partial offers: Number of accepted atoms (base tokens) */
        acceptedAtoms?: bigint;
        /** Dust amount to use for the token output. */
        dustSats?: bigint;
        /** Fee per kB to use when building the tx. */
        feePerKb?: bigint;
        /** Allow accepting an offer such that the remaining quantity is unacceptable */
        allowUnspendable?: boolean;
    }): Tx {
        const dustSats = params.dustSats ?? DEFAULT_DUST_SATS;
        const feePerKb = params.feePerKb ?? DEFAULT_FEE_SATS_PER_KB;
        const allowUnspendable = params.allowUnspendable ?? false;
        const txBuild = this._acceptTxBuilder({
            covenantSk: params.covenantSk,
            covenantPk: params.covenantPk,
            fuelInputs: params.fuelInputs,
            extraOutputs: [
                {
                    sats: dustSats,
                    script: params.recipientScript,
                },
                params.recipientScript,
            ],
            acceptedAtoms: params.acceptedAtoms,
            allowUnspendable,
        });
        return txBuild.sign({ feePerKb, dustSats });
    }

    /**
     * How many extra satoshis are required to fuel this offer so it can be
     * broadcast on the network, excluding the asked sats.
     * This should be displayed to the user as network fee.
     * The total required input amount is askedSats + acceptFeeSats.
     **/
    public acceptFeeSats(params: {
        /** Script to send the tokens and the leftover sats (if any) to. */
        recipientScript: Script;
        /** Extra inputs */
        extraInputs?: TxBuilderInput[];
        /** Fee per kB to use when building the tx. */
        feePerKb?: bigint;
        acceptedAtoms?: bigint;
    }): bigint {
        const feePerKb = params.feePerKb ?? DEFAULT_FEE_SATS_PER_KB;
        const txBuild = this._acceptTxBuilder({
            covenantSk: new Uint8Array(32),
            covenantPk: new Uint8Array(33),
            fuelInputs: params.extraInputs ?? [],
            extraOutputs: [
                {
                    sats: 0n,
                    script: params.recipientScript,
                },
            ],
            acceptedAtoms: params.acceptedAtoms,
            /** We do not need to validate for this condition when we get the fee */
            allowUnspendable: true,
        });
        const measureTx = txBuild.sign({ ecc: new EccDummy() });
        return BigInt(
            Math.ceil((measureTx.serSize() * Number(feePerKb)) / 1000),
        );
    }

    private _acceptTxBuilder(params: {
        covenantSk: Uint8Array;
        covenantPk: Uint8Array;
        fuelInputs: TxBuilderInput[];
        extraOutputs: TxBuilderOutput[];
        acceptedAtoms?: bigint;
        allowUnspendable?: boolean;
    }): TxBuilder {
        switch (this.variant.type) {
            case 'ONESHOT':
                return new TxBuilder({
                    inputs: [
                        ...params.fuelInputs,
                        {
                            input: this.txBuilderInput,
                            signatory: AgoraOneshotSignatory(
                                params.covenantSk,
                                params.covenantPk,
                                this.variant.params.enforcedOutputs.length,
                            ),
                        },
                    ],
                    outputs: [
                        ...this.variant.params.enforcedOutputs,
                        ...params.extraOutputs,
                    ],
                });
            case 'PARTIAL': {
                if (params.acceptedAtoms === undefined) {
                    throw new Error(
                        'Must set acceptedAtoms for partial offers',
                    );
                }
                const txBuild = new TxBuilder();
                const agoraPartial = this.variant.params;
                const truncFactor =
                    1n << BigInt(8 * agoraPartial.numAtomsTruncBytes);
                if (params.acceptedAtoms % truncFactor != 0n) {
                    throw new Error(
                        `Must acceptedAtoms must be a multiple of ${truncFactor}`,
                    );
                }

                if (
                    params.allowUnspendable === false ||
                    typeof params.allowUnspendable === 'undefined'
                ) {
                    // Prevent creation of unacceptable offer
                    agoraPartial.preventUnacceptableRemainder(
                        params.acceptedAtoms,
                    );
                }

                txBuild.inputs.push({
                    input: this.txBuilderInput,
                    signatory: AgoraPartialSignatory(
                        agoraPartial,
                        params.acceptedAtoms / truncFactor,
                        params.covenantSk,
                        params.covenantPk,
                    ),
                });
                txBuild.inputs.push(...params.fuelInputs);
                const sendAtomsArray: bigint[] = [0n];
                const offeredAtoms = this.token.atoms;
                if (offeredAtoms > params.acceptedAtoms) {
                    sendAtomsArray.push(offeredAtoms - params.acceptedAtoms);
                }
                sendAtomsArray.push(params.acceptedAtoms);
                if (agoraPartial.tokenProtocol === 'SLP') {
                    txBuild.outputs.push({
                        sats: 0n,
                        script: slpSend(
                            this.token.tokenId,
                            this.token.tokenType.number,
                            sendAtomsArray,
                        ),
                    });
                } else if (agoraPartial.tokenProtocol === 'ALP') {
                    txBuild.outputs.push({
                        sats: 0n,
                        script: emppScript([
                            agoraPartial.adPushdata(),
                            alpSend(
                                this.token.tokenId,
                                this.token.tokenType.number,
                                sendAtomsArray,
                            ),
                        ]),
                    });
                } else {
                    throw new Error('Not implemented');
                }
                txBuild.outputs.push({
                    sats: agoraPartial.askedSats(params.acceptedAtoms),
                    script: Script.p2pkh(shaRmd160(agoraPartial.makerPk)),
                });
                if (offeredAtoms > params.acceptedAtoms) {
                    const newAgoraPartial = new AgoraPartial({
                        ...agoraPartial,
                        truncAtoms:
                            (offeredAtoms - params.acceptedAtoms) / truncFactor,
                    });
                    txBuild.outputs.push({
                        sats: agoraPartial.dustSats,
                        script: Script.p2sh(
                            shaRmd160(newAgoraPartial.script().bytecode),
                        ),
                    });
                }
                txBuild.outputs.push(...params.extraOutputs);
                txBuild.locktime = agoraPartial.enforcedLockTime;
                return txBuild;
            }
            default:
                throw new Error('Not implemented');
        }
    }

    /**
     * Build a tx canceling the offer.
     *
     * An offer can only be cancelled using the secret key that created it.
     *
     * `fuelInputs` must cover the tx fee, you can calculate it with cancelFeeSats.
     **/
    public cancelTx(params: {
        /**
         * Cancel secret key of the offer, must be paired with the cancelPk of
         * the offer.
         **/
        cancelSk: Uint8Array;
        /**
         * Inputs fueling this tx with sats. Must have signatory and
         * input.signData set correctly. If it is set incorrectly, may fail
         * silently and build an invalid tx, failing at broadcast.
         *
         * The free sats of these inputs must be at least cancelFeeSats.
         **/
        fuelInputs: TxBuilderInput[];
        /** Script to send canceled tokens and the leftover sats (if any) to. */
        recipientScript: Script;
        /** Dust amount to use for the token output. */
        dustSats?: bigint;
        /** Fee per kB to use when building the tx. */
        feePerKb?: bigint;
    }): Tx {
        const dustSats = params.dustSats ?? DEFAULT_DUST_SATS;
        const feePerKb = params.feePerKb ?? DEFAULT_FEE_SATS_PER_KB;
        const txBuild = this._cancelTxBuilder({
            cancelSk: params.cancelSk,
            fuelInputs: params.fuelInputs,
            extraOutputs: [
                {
                    sats: dustSats,
                    script: params.recipientScript,
                },
                params.recipientScript,
            ],
        });
        return txBuild.sign({ feePerKb, dustSats });
    }

    /**
     * How many extra satoshis are required to fuel cancelling this offer,
     * so the cancel tx can be broadcast on the network, excluding the asked
     * sats and a dust amount to receive the tokens.
     *
     * extraInputs can be used to add an ad input so we have the correct
     * estimate in case of a cancel + reoffer.
     *
     * This should be displayed to the user as cancellation network fee.
     * The total required sats input amount is returned by this function.
     **/
    public cancelFeeSats(params: {
        /** Script to send the tokens and the leftover sats (if any) to. */
        recipientScript: Script;
        /** Extra inputs */
        extraInputs?: TxBuilderInput[];
        /** Fee per kB to use when building the tx. */
        feePerKb?: bigint;
    }): bigint {
        const feePerKb = params.feePerKb ?? DEFAULT_FEE_SATS_PER_KB;
        const txBuild = this._cancelTxBuilder({
            cancelSk: new Uint8Array(32),
            fuelInputs: params.extraInputs ?? [],
            extraOutputs: [
                {
                    sats: 0n,
                    script: params.recipientScript,
                },
            ],
        });
        const measureTx = txBuild.sign({ ecc: new EccDummy() });
        return BigInt(
            Math.ceil((measureTx.serSize() * Number(feePerKb)) / 1000),
        );
    }

    private _cancelTxBuilder(params: {
        cancelSk: Uint8Array;
        fuelInputs: TxBuilderInput[];
        extraOutputs: TxBuilderOutput[];
    }) {
        let signatory: Signatory;
        let tokenProtocol: 'SLP' | 'ALP';
        switch (this.variant.type) {
            case 'ONESHOT':
                signatory = AgoraOneshotCancelSignatory(params.cancelSk);
                tokenProtocol = 'SLP';
                break;
            case 'PARTIAL':
                tokenProtocol = this.variant.params.tokenProtocol;
                signatory = AgoraPartialCancelSignatory(
                    params.cancelSk,
                    tokenProtocol,
                );
                break;
            default:
                throw new Error('Not implemented');
        }
        const outputs: TxBuilderOutput[] = [];
        switch (tokenProtocol) {
            case 'SLP':
                outputs.push({
                    sats: 0n,
                    script: slpSend(
                        this.token.tokenId,
                        this.token.tokenType.number,
                        [this.token.atoms],
                    ),
                });
                break;
            case 'ALP':
                outputs.push({
                    sats: 0n,
                    script: emppScript([
                        alpSend(
                            this.token.tokenId,
                            this.token.tokenType.number,
                            [this.token.atoms],
                        ),
                    ]),
                });
                break;
        }
        outputs.push(...params.extraOutputs);
        return new TxBuilder({
            inputs: [
                ...params.fuelInputs,
                {
                    input: this.txBuilderInput,
                    signatory,
                },
            ],
            outputs,
        });
    }

    /**
     * How many satoshis are asked to accept this offer, excluding tx fees.
     * This is what should be displayed to the user as the price.
     **/
    public askedSats(acceptedAtoms?: bigint): bigint {
        switch (this.variant.type) {
            case 'ONESHOT':
                return this.variant.params.askedSats();
            case 'PARTIAL':
                if (acceptedAtoms === undefined) {
                    throw new Error(
                        'Must provide acceptedAtoms for PARTIAL offers',
                    );
                }
                return this.variant.params.askedSats(acceptedAtoms);
            default:
                throw new Error('Not implemented');
        }
    }
}

/** Which txs to query (confirmed, unconfirmed, reverse history) */
export type TxHistoryTable = 'CONFIRMED' | 'UNCONFIRMED' | 'HISTORY';

export type AgoraQueryParamVariants =
    | {
          type: 'TOKEN_ID';
          tokenId: string;
      }
    | {
          type: 'GROUP_TOKEN_ID';
          groupTokenId: string;
      }
    | {
          type: 'PUBKEY';
          pubkeyHex: string;
      };

/** Params which Agora txs to query */
export type AgoraHistoryParams = AgoraQueryParamVariants & {
    table: TxHistoryTable;
    page?: number;
    pageSize?: number;
};

/** Queried offers from the history */
export interface AgoraHistoryResult {
    offers: AgoraOffer[];
    numTxs: number;
    numPages: number;
}

/**
 * Enables access to Agora, via Chronik instances that have the "agora" plugin
 * loaded.
 *
 * See agora.py.
 **/
export class Agora {
    private chronik: ChronikClient;
    private plugin: PluginEndpoint;
    private dustSats: bigint;

    /**
     * Create an Agora instance. The provided Chronik instance must have the
     * "agora" plugin loaded.
     **/
    public constructor(chronik: ChronikClient, dustSats?: bigint) {
        this.chronik = chronik;
        this.plugin = chronik.plugin(PLUGIN_NAME);
        this.dustSats = dustSats ?? DEFAULT_DUST_SATS;
    }

    /**
     * Query all the token IDs, fungible and non-fungible ones, that have active
     * Agora offers.
     **/
    public async allOfferedTokenIds(): Promise<string[]> {
        return await this._allTokenIdsByPrefix(TOKEN_ID_PREFIX);
    }

    /** Query all fungible token IDs that have active Agora offers. */
    public async offeredFungibleTokenIds(): Promise<string[]> {
        return await this._allTokenIdsByPrefix(FUNGIBLE_TOKEN_ID_PREFIX);
    }

    /**
     * Query all token IDs of groups of non-fungible tokens that have active
     * Agora offers.
     **/
    public async offeredGroupTokenIds(): Promise<string[]> {
        return await this._allTokenIdsByPrefix(GROUP_TOKEN_ID_PREFIX);
    }

    /** Query all active offers by token ID. */
    public async activeOffersByTokenId(tokenId: string): Promise<AgoraOffer[]> {
        return await this._activeOffersByGroup(TOKEN_ID_PREFIX + tokenId);
    }

    /** Query all active offers by group token ID. */
    public async activeOffersByGroupTokenId(
        groupTokenId: string,
    ): Promise<AgoraOffer[]> {
        return await this._activeOffersByGroup(
            GROUP_TOKEN_ID_PREFIX + groupTokenId,
        );
    }

    /** Query all active offers with the given cancel pubkey. */
    public async activeOffersByPubKey(
        pubkeyHex: string,
    ): Promise<AgoraOffer[]> {
        return await this._activeOffersByGroup(PUBKEY_PREFIX + pubkeyHex);
    }

    /**
     * Query historic offers (paginated)
     *
     * These are basically the "candlesticks" of a specific token (and also the
     * cancelled offers, but those would have to be ignored).
     * Offers can also be queried by pubkey, giving a history of user's offers.
     **/
    public async historicOffers(
        params: AgoraHistoryParams,
    ): Promise<AgoraHistoryResult> {
        const groupHex = this._groupHex(params);
        let result: TxHistoryPage;
        switch (params.table) {
            case 'CONFIRMED':
                result = await this.plugin.confirmedTxs(
                    groupHex,
                    params.page,
                    params.pageSize,
                );
                break;
            case 'UNCONFIRMED':
                result = await this.plugin.unconfirmedTxs(
                    groupHex,
                    params.page,
                    params.pageSize,
                );
                break;
            case 'HISTORY':
                result = await this.plugin.history(
                    groupHex,
                    params.page,
                    params.pageSize,
                );
                break;
            default:
                throw new Error('Unsupported table');
        }
        const offers = result.txs.flatMap(tx => {
            return tx.inputs.flatMap(input => {
                if (
                    input.plugins === undefined ||
                    input.plugins[PLUGIN_NAME] === undefined
                ) {
                    return [];
                }
                const ops = scriptOps(new Script(fromHex(input.inputScript)));
                // isCanceled is always the last pushop (before redeemScript)
                const opIsCanceled = ops[ops.length - 2];
                const isCanceled = opIsCanceled === OP_0;
                // If isCanceled, then offer.token.atoms is the canceled amount
                let takenInfo: undefined | TakenInfo;
                if (!isCanceled) {
                    // If this tx is not canceling an agora offer
                    if (
                        typeof tx.outputs[1].plugins !== 'undefined' &&
                        'agora' in tx.outputs[1].plugins
                    ) {
                        // If this tx creates a new agora offer at index 1 of outputs
                        // then it is NOT creating the "change" offer from a partial accept
                        // It is creating a new offer and just happens to have a spent agora utxo
                        // from a full accept in its inputs

                        // So, we do not parse in historicOffers; we parse this offer in the tx that
                        // accepts or cancels it

                        // If this is an offer tx with a TAKEN inputScript
                        // but it was not created by a buy or cancel
                        //
                        // We can get an offer with a buy or cancel as an input even tho
                        // that particular input does not mean this tx is the buy or cancel
                        // just the way utxos have worked out
                        // Examples
                        // a156d668965294aee6d8ebbe2b7b6e2c574bdf006b19842b3836b4e580825aca
                        // ec73d56ba0b5acf9f3023124a227a19e0794c2da6e4860fb76181b2737e62c61
                        // fbd288aad796753c672c9bbce9badbf02ff62f12f023163bbc034608b249d21a

                        // Do not include this in historicOffers, we will pick it up by its buy or cancel
                        return [];
                    }
                    // If this is TAKEN, provide useful parsed info from the tx
                    // The taken qty is the token amount in the outputs that is not rolled into another agora offer
                    // i.e. the token amount that goes to a p2pkh address
                    // The price paid is the XEC that goes to the offer creator

                    // In practice, we can get these amounts by following the rules below
                    // Note we may see AgoraOffer change in the future and need to update this parsing

                    // The purchase price is satoshis that go to the offer creator
                    // Index 1 output
                    const sats = tx.outputs[1].sats;

                    // The taker receives the purchased tokens at a p2pkh address
                    // This is at index 2 for a buy of the full offer and index 3 for a partial buy
                    // If tx.outputs[2].outputScript is p2sh, that means partialbuy and takerBuyIndex is 3
                    const takerBuyIndex = tx.outputs[2].outputScript.startsWith(
                        '76a914',
                    )
                        ? 2
                        : 3;

                    const takerScriptHex =
                        tx.outputs[takerBuyIndex].outputScript;

                    const atoms = tx.outputs[takerBuyIndex].token?.atoms;
                    if (typeof atoms === 'bigint') {
                        // Should always be true but we may have different kinds of agora
                        // offers in the future
                        // So, we only set if we have the info we expect
                        takenInfo = {
                            sats,
                            atoms,
                            takerScriptHex,
                        };
                    }
                }
                delete input.token?.entryIdx; // UTXO token has no entryIdx
                const offer = this._parseOfferUtxo(
                    {
                        outpoint: input.prevOut,
                        blockHeight: tx.block?.height ?? -1,
                        isCoinbase: tx.isCoinbase,
                        sats: input.sats,
                        script: input.outputScript!,
                        isFinal: false,
                        plugins: input.plugins,
                        token: input.token,
                    },
                    isCanceled ? 'CANCELED' : 'TAKEN',
                );
                if (offer === undefined) {
                    return [];
                }
                if (typeof takenInfo !== 'undefined') {
                    // Add takenInfo for taken offers
                    offer.takenInfo = takenInfo;
                }
                return [offer];
            });
        });
        return {
            offers,
            numTxs: result.numTxs,
            numPages: result.numPages,
        };
    }

    /** Subscribe to updates from the websocket for some params */
    public subscribeWs(ws: WsEndpoint, params: AgoraQueryParamVariants) {
        const groupHex = this._groupHex(params);
        ws.subscribeToPlugin(PLUGIN_NAME, groupHex);
    }

    /** Unsubscribe from updates from the websocket for some params */
    public unsubscribeWs(ws: WsEndpoint, params: AgoraQueryParamVariants) {
        const groupHex = this._groupHex(params);
        ws.unsubscribeFromPlugin(PLUGIN_NAME, groupHex);
    }

    /**
     * Build a safe AgoraPartial for the given parameters.
     *
     * This looks at the blockchain to avoid creating an identical offer, by
     * tweaking the enforcedLockTime.
     */
    public async selectParams(
        params: Omit<AgoraPartialParams, 'enforcedLockTime'> | AgoraPartial,
        scriptIntegerBits: bigint = 32n,
    ): Promise<AgoraPartial> {
        // Assumes MTP is not more than 14 days in the past
        const maxLockTime = new Date().getTime() / 1000 - 14 * 24 * 3600;
        const minLockTime = 500000000;

        // The probability of requiring a re-roll is only ~10^-9, but that's
        // still high enough so we have to do it.
        // If someone were to create 1000 identical offers, the probability of
        // picking two conflicting locktimes would be 0.04%, and for 10000 it's
        // even 4%, so we definitely have to check for duplicates.
        // See https://www.bdayprob.com/, where D = 1200000000 and N = 1000
        // (or 10000), and solve for P(D,N).

        for (;;) {
            const enforcedLockTime =
                Math.floor(Math.random() * (maxLockTime - minLockTime)) +
                minLockTime;
            const newParams =
                params instanceof AgoraPartial
                    ? new AgoraPartial({ ...params, enforcedLockTime })
                    : AgoraPartial.approximateParams(
                          {
                              ...params,
                              enforcedLockTime,
                          },
                          scriptIntegerBits,
                      );
            const agoraScript = newParams.script();
            const utxos = await this.chronik
                .script('p2sh', toHex(shaRmd160(agoraScript.bytecode)))
                .utxos();
            if (utxos.utxos.length === 0) {
                return newParams;
            }
        }
    }

    private _groupHex(params: AgoraQueryParamVariants): string {
        switch (params.type) {
            case 'TOKEN_ID':
                return TOKEN_ID_PREFIX + params.tokenId;
            case 'GROUP_TOKEN_ID':
                return GROUP_TOKEN_ID_PREFIX + params.groupTokenId;
            case 'PUBKEY':
                return PUBKEY_PREFIX + params.pubkeyHex;
            default:
                throw new Error('Unsupported type');
        }
    }

    private async _allTokenIdsByPrefix(prefixHex: string): Promise<string[]> {
        const tokenIds: string[] = [];
        let nextStart: string | undefined = undefined;
        while (nextStart !== '') {
            const groups = await this.plugin.groups(
                prefixHex,
                nextStart,
                PLUGIN_GROUPS_MAX_PAGE_SIZE,
            );
            tokenIds.push(
                ...groups.groups.map(({ group }) =>
                    group.substring(prefixHex.length),
                ),
            );
            nextStart = groups.nextStart;
        }
        return tokenIds;
    }

    private async _activeOffersByGroup(
        groupHex: string,
    ): Promise<AgoraOffer[]> {
        const utxos = await this.plugin.utxos(groupHex);
        return utxos.utxos.flatMap(utxo => {
            const offer = this._parseOfferUtxo(utxo, 'OPEN');
            return offer ? [offer] : [];
        });
    }

    private _parseOfferUtxo(
        utxo: Utxo,
        status: AgoraOfferStatus,
    ): AgoraOffer | undefined {
        if (utxo.plugins === undefined) {
            return undefined;
        }
        const plugin = utxo.plugins[PLUGIN_NAME];
        if (plugin === undefined) {
            return undefined;
        }
        const covenantVariant = plugin.data[0];
        switch (covenantVariant) {
            case ONESHOT_HEX:
                return this._parseOneshotOfferUtxo(utxo, plugin, status);
            case PARTIAL_HEX:
                return this._parsePartialOfferUtxo(utxo, plugin, status);
            default:
                return undefined;
        }
    }

    private _parseOneshotOfferUtxo(
        utxo: Utxo,
        plugin: PluginEntry,
        status: AgoraOfferStatus,
    ): AgoraOffer | undefined {
        if (utxo.token?.tokenType.protocol !== 'SLP') {
            // Currently only SLP supported
            return undefined;
        }
        const outputsSerHex = plugin.data[1];
        const outputsSerBytes = new Bytes(fromHex(outputsSerHex));
        const enforcedOutputs: TxOutput[] = [
            {
                sats: 0n,
                script: slpSend(
                    utxo.token.tokenId,
                    utxo.token.tokenType.number,
                    [0n, utxo.token.atoms],
                ),
            },
        ];
        while (outputsSerBytes.data.length > outputsSerBytes.idx) {
            enforcedOutputs.push(readTxOutput(outputsSerBytes));
        }
        const cancelPkGroupHex = plugin.groups.find(group =>
            group.startsWith(PUBKEY_PREFIX),
        );
        if (cancelPkGroupHex === undefined) {
            return undefined;
        }
        const cancelPk = fromHex(
            cancelPkGroupHex.substring(PUBKEY_PREFIX.length),
        );
        const agoraOneshot = new AgoraOneshot({
            enforcedOutputs,
            cancelPk,
        });
        return new AgoraOffer({
            variant: {
                type: 'ONESHOT',
                params: agoraOneshot,
            },
            outpoint: utxo.outpoint,
            txBuilderInput: {
                prevOut: utxo.outpoint,
                signData: {
                    sats: utxo.sats,
                    redeemScript: agoraOneshot.script(),
                },
            },
            token: utxo.token,
            status,
        });
    }

    private _parsePartialOfferUtxo(
        utxo: Utxo,
        plugin: PluginEntry,
        status: AgoraOfferStatus,
    ): AgoraOffer | undefined {
        if (utxo.token === undefined) {
            return undefined;
        }

        // Plugin gives us the offer data in this form
        const [
            _,
            numAtomsTruncBytesHex,
            numSatsTruncBytesHex,
            atomsScaleFactorHex,
            scaledTruncAtomsPerTruncSatHex,
            minAcceptedScaledTruncAtomsHex,
            enforcedLockTimeHex,
        ] = plugin.data;

        if (enforcedLockTimeHex === undefined) {
            throw new Error('Outdated plugin');
        }

        const numAtomsTruncBytes = fromHex(numAtomsTruncBytesHex)[0];
        const numSatsTruncBytes = fromHex(numSatsTruncBytesHex)[0];
        const atomsScaleFactor = new Bytes(
            fromHex(atomsScaleFactorHex),
        ).readU64();
        const scaledTruncAtomsPerTruncSat = new Bytes(
            fromHex(scaledTruncAtomsPerTruncSatHex),
        ).readU64();
        const minAcceptedScaledTruncAtoms = new Bytes(
            fromHex(minAcceptedScaledTruncAtomsHex),
        ).readU64();
        const enforcedLockTime = new Bytes(
            fromHex(enforcedLockTimeHex),
        ).readU32();

        const makerPkGroupHex = plugin.groups.find(group =>
            group.startsWith(PUBKEY_PREFIX),
        );
        if (makerPkGroupHex === undefined) {
            return undefined;
        }
        if (utxo.token.tokenType.protocol == 'UNKNOWN') {
            return undefined;
        }
        const makerPk = fromHex(
            makerPkGroupHex.substring(PUBKEY_PREFIX.length),
        );

        const agoraPartial = new AgoraPartial({
            truncAtoms: utxo.token.atoms >> (8n * BigInt(numAtomsTruncBytes)),
            numAtomsTruncBytes,
            atomsScaleFactor,
            scaledTruncAtomsPerTruncSat,
            numSatsTruncBytes,
            makerPk,
            minAcceptedScaledTruncAtoms,
            tokenId: utxo.token.tokenId,
            tokenType: utxo.token.tokenType.number,
            tokenProtocol: utxo.token.tokenType.protocol,
            scriptLen: 0x7f,
            enforcedLockTime,
            dustSats: this.dustSats,
        });
        agoraPartial.updateScriptLen();
        return new AgoraOffer({
            variant: {
                type: 'PARTIAL',
                params: agoraPartial,
            },
            outpoint: utxo.outpoint,
            txBuilderInput: {
                prevOut: utxo.outpoint,
                signData: {
                    sats: utxo.sats,
                    redeemScript: agoraPartial.script(),
                },
            },
            token: utxo.token,
            status,
        });
    }
}

export function scriptOps(script: Script): Op[] {
    const opsIter = script.ops();
    const ops: Op[] = [];
    let op;
    while ((op = opsIter.next()) !== undefined) {
        ops.push(op);
    }
    return ops;
}
