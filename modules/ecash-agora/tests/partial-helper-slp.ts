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
import { Wallet } from 'ecash-wallet';
import { expect } from 'chai';

import { AgoraPartial, AgoraPartialAdSignatory } from '../src/partial.js';
import { Agora, AgoraOffer } from '../src/agora.js';

export async function makeSlpOffer(params: {
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
    const txBuildGenesisGroup = new TxBuilder({
        inputs: [fuelInput],
        outputs: [
            {
                sats: 0n,
                script: slpGenesis(
                    agoraPartial.tokenType,
                    {
                        tokenTicker: `SLP token type ${agoraPartial.tokenType}`,
                        decimals: 4,
                    },
                    agoraPartial.offeredAtoms(),
                ),
            },
            { sats: genesisOutputSats, script: makerP2pkh },
        ],
    });
    const genesisTx = txBuildGenesisGroup.sign();
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
                script: slpSend(tokenId, agoraPartial.tokenType, [
                    agoraPartial.offeredAtoms(),
                ]),
            },
            { sats: adSetupSats, script: agoraAdP2sh },
        ],
    });
    const adSetupTx = txBuildAdSetup.sign();
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
                        sats: adSetupSats,
                        redeemScript: agoraAdScript,
                    },
                },
                signatory: AgoraPartialAdSignatory(makerSk),
            },
        ],
        outputs: [
            {
                sats: 0n,
                script: slpSend(tokenId, agoraPartial.tokenType, [
                    agoraPartial.offeredAtoms(),
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

export async function takeSlpOffer(params: {
    chronik: ChronikClient;
    offer: AgoraOffer;
    takerSk: Uint8Array;
    acceptedAtoms: bigint;
    allowUnspendable?: boolean;
}) {
    const takerSk = params.takerSk;
    const takerWallet = Wallet.fromSk(takerSk, params.chronik);
    const takerPk = takerWallet.pk;
    const takerP2pkh = takerWallet.script;
    await takerWallet.sync();
    const broadcastResult = await params.offer.take({
        wallet: takerWallet,
        covenantSk: takerSk,
        covenantPk: takerPk,
        recipientScript: takerP2pkh,
        acceptedAtoms: params.acceptedAtoms,
        allowUnspendable: params.allowUnspendable,
    });
    const acceptTxid = broadcastResult.broadcasted[0];
    return acceptTxid;
}
