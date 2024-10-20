// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikClient } from 'chronik-client';
import {
    ALL_BIP143,
    Ecc,
    P2PKHSignatory,
    Script,
    shaRmd160,
    slpGenesis,
    slpSend,
    TxBuilder,
    TxBuilderInput,
} from 'ecash-lib';
import { expect } from 'chai';

import { AgoraPartial, AgoraPartialAdSignatory } from '../src/partial.js';
import { Agora, AgoraOffer } from '../src/agora.js';

export async function makeSlpOffer(params: {
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
                script: slpGenesis(
                    agoraPartial.tokenType,
                    {
                        tokenTicker: `SLP token type ${agoraPartial.tokenType}`,
                        decimals: 4,
                    },
                    agoraPartial.offeredTokens(),
                ),
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

    const adSetupSats = 1000n;
    const agoraAdScript = agoraPartial.adScript();
    const agoraAdP2sh = Script.p2sh(shaRmd160(agoraAdScript.bytecode));
    const txBuildAdSetup = new TxBuilder({
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
                script: slpSend(tokenId, agoraPartial.tokenType, [
                    agoraPartial.offeredTokens(),
                ]),
            },
            { value: adSetupSats, script: agoraAdP2sh },
        ],
    });
    const adSetupTx = txBuildAdSetup.sign(ecc);
    const adSetupTxid = (await chronik.broadcastTx(adSetupTx.ser())).txid;

    const agoraScript = agoraPartial.script();
    const agoraP2sh = Script.p2sh(shaRmd160(agoraScript.bytecode));
    const txBuildOffer = new TxBuilder({
        inputs: [
            {
                input: {
                    prevOut: {
                        txid: adSetupTxid,
                        outIdx: 1,
                    },
                    signData: {
                        value: adSetupSats,
                        redeemScript: agoraAdScript,
                    },
                },
                signatory: AgoraPartialAdSignatory(makerSk),
            },
        ],
        outputs: [
            {
                value: 0,
                script: slpSend(tokenId, agoraPartial.tokenType, [
                    agoraPartial.offeredTokens(),
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

export async function takeSlpOffer(params: {
    chronik: ChronikClient;
    ecc: Ecc;
    offer: AgoraOffer;
    takerSk: Uint8Array;
    takerInput: TxBuilderInput;
    acceptedTokens: bigint;
    allowUnspendable?: boolean;
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
        allowUnspendable: params.allowUnspendable,
    });
    const acceptTxid = (await params.chronik.broadcastTx(acceptTx.ser())).txid;
    return acceptTxid;
}
