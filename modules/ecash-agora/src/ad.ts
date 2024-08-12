// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chronik from 'chronik-client';
import {
    Op,
    OutPoint,
    Script,
    TxInput,
    bytesToStr,
    fromHex,
    isPushOp,
    shaRmd160,
    slpSend,
    toHex,
} from 'ecash-lib';
import { AGORA_LOKAD_ID_STR } from './consts.js';
import { AgoraOneshot } from './oneshot.js';

type ParsedAdVariant = {
    type: 'ONESHOT';
    params: AgoraOneshot;
};

export interface ParsedAd extends ParsedAdVariant {
    outpoint: OutPoint;
    txBuilderInput: TxInput;
    spentBy: OutPoint | undefined;
}

export function parseAgoraTx(tx: chronik.Tx): ParsedAd | undefined {
    if (tx.inputs.length === 0) {
        return undefined;
    }
    if (tx.outputs.length < 2) {
        return undefined;
    }
    if (tx.tokenEntries.length === 0) {
        return undefined;
    }
    const adInput = tx.inputs[0];
    const offerOutput = tx.outputs[1];
    if (offerOutput.token === undefined) {
        return undefined;
    }
    const tokenEntry = tx.tokenEntries[0];
    let opreturnScript: Script;
    switch (tokenEntry.tokenType.protocol) {
        case 'SLP':
            opreturnScript = slpSend(
                tokenEntry.tokenId,
                tokenEntry.tokenType.number,
                [0, BigInt(offerOutput.token.amount)],
            );
            break;
        case 'ALP':
            // ALP not implemented yet
            return undefined;
    }
    const scriptSig = new Script(fromHex(adInput.inputScript));
    const parsedAd = parseAdScriptSig(scriptSig);
    if (parsedAd === undefined) {
        return undefined;
    }
    let variant: ParsedAdVariant;
    let expectedAgoraScript: Script;
    let expectedAgoraP2sh: Script;
    switch (parsedAd.covenantVariant) {
        case AgoraOneshot.COVENANT_VARIANT: {
            let agoraOneshot: AgoraOneshot;
            try {
                agoraOneshot = AgoraOneshot.fromRedeemScript(
                    parsedAd.redeemScript,
                    opreturnScript,
                );
            } catch (ex) {
                return undefined;
            }
            variant = {
                type: 'ONESHOT',
                params: agoraOneshot,
            };
            expectedAgoraScript = agoraOneshot.script();
            expectedAgoraP2sh = Script.p2sh(
                shaRmd160(expectedAgoraScript.bytecode),
            );
            break;
        }
        default:
            return undefined;
    }
    if (offerOutput.outputScript !== toHex(expectedAgoraP2sh.bytecode)) {
        return undefined;
    }
    const outpoint = {
        txid: tx.txid,
        outIdx: 1,
    };
    return {
        ...variant,
        outpoint,
        txBuilderInput: {
            prevOut: outpoint,
            signData: {
                value: offerOutput.value,
                redeemScript: expectedAgoraScript,
            },
        },
        spentBy: offerOutput.spentBy,
    };
}

interface ParsedAdSlp {
    covenantVariant: string;
    pushdata: Uint8Array[];
    redeemScript: Script;
}

/**
 * How many pushops we expect at least for an advertisement.
 * There has to be at least a LOKAD ID, a covenant variant and a redeemScript.
 **/
const MIN_NUM_SCRIPTSIG_PUSHOPS = 3;

function parseAdScriptSig(scriptSig: Script): ParsedAdSlp | undefined {
    const ops = scriptSig.ops();
    const pushdata = [];
    let op: Op | undefined;
    while ((op = ops.next())) {
        if (!isPushOp(op)) {
            return undefined;
        }
        pushdata.push(op.data);
    }
    if (pushdata.length < MIN_NUM_SCRIPTSIG_PUSHOPS) {
        return undefined;
    }
    const lokadId = pushdata[0];
    if (bytesToStr(lokadId) != AGORA_LOKAD_ID_STR) {
        return undefined;
    }
    const covenantVariant = bytesToStr(pushdata[1]);
    const parsedPushdata = pushdata.slice(2, -1);
    const redeemScript = new Script(pushdata[pushdata.length - 1]);
    return {
        covenantVariant,
        pushdata: parsedPushdata,
        redeemScript,
    };
}
