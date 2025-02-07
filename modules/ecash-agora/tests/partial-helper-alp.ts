// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikClient } from 'chronik-client';
import {
    ALL_BIP143,
    alpGenesis,
    alpSend,
    Ecc,
    emppScript,
    P2PKHSignatory,
    Script,
    shaRmd160,
    TxBuilder,
    TxBuilderInput,
    TxBuilderOutput,
} from 'ecash-lib';
import { expect } from 'chai';

import { AgoraPartial } from '../src/partial.js';
import { Agora, AgoraOffer } from '../src/agora.js';

export function makeAlpGenesis(params: {
    tokenType: number;
    fuelInput: TxBuilderInput;
    tokenAtomsArray: bigint[];
    extraOutputs: TxBuilderOutput[];
}) {
    const { tokenType, fuelInput } = params;
    const txBuildGenesisGroup = new TxBuilder({
        inputs: [fuelInput],
        outputs: [
            {
                sats: 0n,
                script: emppScript([
                    alpGenesis(
                        tokenType,
                        {
                            tokenTicker: `ALP token type ${tokenType}`,
                            decimals: 4,
                        },
                        {
                            numBatons: 0,
                            atomsArray: params.tokenAtomsArray,
                        },
                    ),
                ]),
            },
            ...params.extraOutputs,
        ],
    });
    return txBuildGenesisGroup.sign();
}

export async function makeAlpOffer(params: {
    chronik: ChronikClient;
    agoraPartial: AgoraPartial;
    makerSk: Uint8Array;
    fuelInput: TxBuilderInput;
}): Promise<AgoraOffer> {
    const { chronik, agoraPartial, makerSk, fuelInput } = params;
    const makerPk = new Ecc().derivePubkey(makerSk);
    const makerPkh = shaRmd160(makerPk);
    const makerP2pkh = Script.p2pkh(makerPkh);

    const genesisOutputSats = 2000n;
    const genesisTx = makeAlpGenesis({
        tokenType: agoraPartial.tokenType,
        fuelInput,
        tokenAtomsArray: [agoraPartial.offeredAtoms()],
        extraOutputs: [{ sats: genesisOutputSats, script: makerP2pkh }],
    });
    const genesisTxid = (await chronik.broadcastTx(genesisTx.ser())).txid;
    const tokenId = genesisTxid;
    agoraPartial.tokenId = tokenId;
    expect((await chronik.token(tokenId)).tokenType.number).to.equal(
        agoraPartial.tokenType,
    );

    const agoraScript = agoraPartial.script();
    const agoraP2sh = Script.p2sh(shaRmd160(agoraScript.bytecode));
    const txBuildOffer = new TxBuilder({
        inputs: [
            {
                input: {
                    prevOut: {
                        txid: genesisTxid,
                        outIdx: 1,
                    },
                    signData: {
                        sats: genesisOutputSats,
                        outputScript: makerP2pkh,
                    },
                },
                signatory: P2PKHSignatory(makerSk, makerPk, ALL_BIP143),
            },
        ],
        outputs: [
            {
                sats: 0n,
                script: emppScript([
                    agoraPartial.adPushdata(),
                    alpSend(tokenId, agoraPartial.tokenType, [
                        agoraPartial.offeredAtoms(),
                    ]),
                ]),
            },
            { sats: 546n, script: agoraP2sh },
        ],
    });
    const offerTx = txBuildOffer.sign();
    await chronik.broadcastTx(offerTx.ser());

    const agora = new Agora(chronik);
    expect(await agora.offeredFungibleTokenIds()).to.include(tokenId);
    const offers = await agora.activeOffersByTokenId(tokenId);
    expect(offers.length).to.equal(1);

    return offers[0];
}

export async function takeAlpOffer(params: {
    chronik: ChronikClient;
    offer: AgoraOffer;
    takerSk: Uint8Array;
    takerInput: TxBuilderInput;
    acceptedAtoms: bigint;
    allowUnspendable?: boolean;
}) {
    const takerSk = params.takerSk;
    const takerPk = new Ecc().derivePubkey(takerSk);
    const takerPkh = shaRmd160(takerPk);
    const takerP2pkh = Script.p2pkh(takerPkh);
    const acceptTx = params.offer.acceptTx({
        covenantSk: params.takerSk,
        covenantPk: takerPk,
        fuelInputs: [params.takerInput],
        recipientScript: takerP2pkh,
        acceptedAtoms: params.acceptedAtoms,
        allowUnspendable: params.allowUnspendable,
    });
    const acceptTxid = (await params.chronik.broadcastTx(acceptTx.ser())).txid;
    return acceptTxid;
}
