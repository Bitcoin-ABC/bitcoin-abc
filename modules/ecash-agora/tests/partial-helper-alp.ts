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
} from 'ecash-lib';
import { expect } from 'chai';

import { AgoraPartial } from '../src/partial.js';
import { Agora, AgoraOffer } from '../src/agora.js';

export async function makeAlpOffer(params: {
    chronik: ChronikClient;
    ecc: Ecc;
    agoraPartial: AgoraPartial;
    makerSk: Uint8Array;
    fuelInput: TxBuilderInput;
}): Promise<AgoraOffer> {
    const { chronik, ecc, agoraPartial, makerSk, fuelInput } = params;
    const makerPk = ecc.derivePubkey(makerSk);
    const makerPkh = shaRmd160(makerPk);
    const makerP2pkh = Script.p2pkh(makerPkh);

    const genesisOutputSats = 2000;
    const txBuildGenesisGroup = new TxBuilder({
        inputs: [fuelInput],
        outputs: [
            {
                value: 0,
                script: emppScript([
                    alpGenesis(
                        agoraPartial.tokenType,
                        {
                            tokenTicker: `ALP token type ${agoraPartial.tokenType}`,
                            decimals: 4,
                        },
                        {
                            numBatons: 0,
                            amounts: [agoraPartial.offeredTokens()],
                        },
                    ),
                ]),
            },
            { value: genesisOutputSats, script: makerP2pkh },
        ],
    });
    const genesisTx = txBuildGenesisGroup.sign(ecc);
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
                        value: genesisOutputSats,
                        outputScript: makerP2pkh,
                    },
                },
                signatory: P2PKHSignatory(makerSk, makerPk, ALL_BIP143),
            },
        ],
        outputs: [
            {
                value: 0,
                script: emppScript([
                    agoraPartial.adPushdata(),
                    alpSend(tokenId, agoraPartial.tokenType, [
                        agoraPartial.offeredTokens(),
                    ]),
                ]),
            },
            { value: 546, script: agoraP2sh },
        ],
    });
    const offerTx = txBuildOffer.sign(ecc);
    await chronik.broadcastTx(offerTx.ser());

    const agora = new Agora(chronik);
    expect(await agora.offeredFungibleTokenIds()).to.include(tokenId);
    const offers = await agora.activeOffersByTokenId(tokenId);
    expect(offers.length).to.equal(1);

    return offers[0];
}

export async function takeAlpOffer(params: {
    chronik: ChronikClient;
    ecc: Ecc;
    offer: AgoraOffer;
    takerSk: Uint8Array;
    takerInput: TxBuilderInput;
    acceptedTokens: bigint;
}) {
    const takerSk = params.takerSk;
    const takerPk = params.ecc.derivePubkey(takerSk);
    const takerPkh = shaRmd160(takerPk);
    const takerP2pkh = Script.p2pkh(takerPkh);
    const acceptTx = params.offer.acceptTx({
        ecc: params.ecc,
        covenantSk: params.takerSk,
        covenantPk: takerPk,
        fuelInputs: [params.takerInput],
        recipientScript: takerP2pkh,
        acceptedTokens: params.acceptedTokens,
    });
    const acceptTxid = (await params.chronik.broadcastTx(acceptTx.ser())).txid;
    return acceptTxid;
}
