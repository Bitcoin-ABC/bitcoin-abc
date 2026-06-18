// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Tx, TxInput, TxOutput, OutPoint } from 'chronik-client';
import { scriptOps, AgoraPartial, AgoraOffer } from 'ecash-agora';
import {
    Script,
    fromHex,
    OP_0,
    toHex,
    strToBytes,
    Bytes,
    DEFAULT_DUST_SATS,
} from 'ecash-lib';

const AGORA_OFFER_IDX = 1;
const PUBKEY_PREFIX = toHex(strToBytes('P'));
const PARTIAL_HEX = toHex(strToBytes(AgoraPartial.COVENANT_VARIANT));

export type AgoraAction = 'OFFER' | 'CANCEL' | 'BUY' | 'RELIST';

export interface ParsedAgoraTx {
    txid: string;
    action: AgoraAction;
    tokenId: string;
    atoms: bigint;
    price?: bigint;
}

export interface PartialOffer extends AgoraOffer {
    variant: {
        type: 'PARTIAL';
        params: AgoraPartial;
    };
}

export const isAgoraPartialInputOrOutput = (
    inputOrOutput: TxInput | TxOutput,
): boolean => {
    return (
        typeof inputOrOutput.plugins !== 'undefined' &&
        'agora' in inputOrOutput.plugins &&
        inputOrOutput.plugins.agora.data[0] === PARTIAL_HEX
    );
};

export const isAgoraTx = (tx: Tx): boolean => {
    for (const input of tx.inputs) {
        if (isAgoraPartialInputOrOutput(input)) {
            return true;
        }
    }
    for (const output of tx.outputs) {
        if (isAgoraPartialInputOrOutput(output)) {
            return true;
        }
    }
    return false;
};

const getAgoraOffer = (tx: Tx): PartialOffer | undefined => {
    const { txid, outputs } = tx;

    if (outputs.length < 2) {
        return;
    }

    const agoraOfferOutIdx = isAgoraPartialInputOrOutput(
        outputs[AGORA_OFFER_IDX],
    )
        ? AGORA_OFFER_IDX
        : 2;
    const agoraOutput = outputs[agoraOfferOutIdx];
    const { plugins, token, sats, spentBy } = agoraOutput;

    if (
        typeof spentBy !== 'undefined' ||
        typeof token === 'undefined' ||
        typeof plugins === 'undefined' ||
        !('agora' in plugins)
    ) {
        return;
    }

    const { groups, data } = plugins.agora;

    const makerPkHex: string | undefined = groups
        .find(group => group.startsWith(PUBKEY_PREFIX))
        ?.slice(2);

    if (typeof makerPkHex === 'undefined') {
        return;
    }
    const makerPk = fromHex(makerPkHex);

    const [
        ,
        numAtomsTruncBytesHex,
        numSatsTruncBytesHex,
        atomsScaleFactorHex,
        scaledTruncAtomsPerTruncSatHex,
        minAcceptedScaledTruncAtomsHex,
        enforcedLockTimeHex,
    ] = data;

    const numAtomsTruncBytes = fromHex(numAtomsTruncBytesHex)[0];
    const numSatsTruncBytes = fromHex(numSatsTruncBytesHex)[0];
    const atomsScaleFactor = new Bytes(fromHex(atomsScaleFactorHex)).readU64();
    const scaledTruncAtomsPerTruncSat = new Bytes(
        fromHex(scaledTruncAtomsPerTruncSatHex),
    ).readU64();
    const minAcceptedScaledTruncAtoms = new Bytes(
        fromHex(minAcceptedScaledTruncAtomsHex),
    ).readU64();
    const enforcedLockTime = new Bytes(fromHex(enforcedLockTimeHex)).readU32();

    const agoraPartial = new AgoraPartial({
        truncAtoms: token.atoms >> (8n * BigInt(numAtomsTruncBytes)),
        numAtomsTruncBytes,
        atomsScaleFactor,
        scaledTruncAtomsPerTruncSat,
        numSatsTruncBytes,
        makerPk,
        minAcceptedScaledTruncAtoms,
        tokenId: token.tokenId,
        tokenType: token.tokenType.number,
        tokenProtocol:
            token.tokenType.protocol === 'UNKNOWN'
                ? 'ALP'
                : token.tokenType.protocol,
        scriptLen: 0x7f,
        enforcedLockTime,
        dustSats: DEFAULT_DUST_SATS,
    });

    agoraPartial.updateScriptLen();

    const thisOfferOutpoint: OutPoint = { outIdx: agoraOfferOutIdx, txid };

    return new AgoraOffer({
        variant: {
            type: 'PARTIAL',
            params: agoraPartial,
        },
        outpoint: thisOfferOutpoint,
        txBuilderInput: {
            prevOut: thisOfferOutpoint,
            signData: {
                sats,
                redeemScript: agoraPartial.script(),
            },
        },
        token: token,
        status: 'OPEN',
    }) as PartialOffer;
};

export const parseAgoraTx = (tx: Tx): ParsedAgoraTx | undefined => {
    let action: AgoraAction | undefined;
    let atoms: bigint;
    let tokenId: string;
    const { txid, inputs, outputs } = tx;

    if (outputs.length < 2) {
        return undefined;
    }

    if (isAgoraPartialInputOrOutput(outputs[AGORA_OFFER_IDX])) {
        const { plugins, token } = outputs[1];
        if (typeof plugins !== 'undefined' && 'agora' in plugins) {
            action = 'OFFER';
            if (
                typeof token === 'undefined' ||
                typeof inputs[0].outputScript === 'undefined'
            ) {
                return;
            }
            atoms = token.atoms;
            tokenId = token.tokenId;

            const isRelist = isAgoraPartialInputOrOutput(inputs[0]);
            if (isRelist) {
                action = 'RELIST';
            }

            const parsedAgoraOfferTx: ParsedAgoraTx = {
                txid,
                action,
                tokenId,
                atoms,
            };

            const offer = getAgoraOffer(tx);
            if (typeof offer !== 'undefined') {
                parsedAgoraOfferTx.price = offer.askedSats(atoms);
            }

            return parsedAgoraOfferTx;
        }
    }

    for (const input of inputs) {
        if (isAgoraPartialInputOrOutput(input)) {
            const ops = scriptOps(new Script(fromHex(input.inputScript)));
            const opIsCanceled = ops[ops.length - 2];

            const isCanceled = opIsCanceled === OP_0;
            action = isCanceled ? 'CANCEL' : 'BUY';

            if (isCanceled) {
                const { token } = input;
                if (typeof token === 'undefined') {
                    return;
                }
                const cancelAtoms = token.atoms;
                tokenId = token.tokenId;
                for (const output of outputs) {
                    if (output.token?.atoms === cancelAtoms) {
                        return {
                            txid,
                            action,
                            tokenId,
                            atoms: cancelAtoms,
                        };
                    }
                }
            }
        }
    }

    if (typeof action === 'undefined') {
        return;
    }

    if (action === 'BUY') {
        const pricePaidSatoshis = outputs[1].sats;

        const isPartialBuy = isAgoraPartialInputOrOutput(outputs[2]);
        const takerBuyIndex = isPartialBuy ? 3 : 2;

        if (typeof outputs[takerBuyIndex].token === 'undefined') {
            return;
        }

        return {
            txid,
            action: 'BUY',
            tokenId: outputs[takerBuyIndex].token.tokenId,
            atoms: outputs[takerBuyIndex].token.atoms,
            price: pricePaidSatoshis,
        };
    }
};
