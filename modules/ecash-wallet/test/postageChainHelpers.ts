// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Shared helpers for postage-chain integration tests (single-address and HD).
 */

import { expect } from 'chai';
import { ChronikClient } from 'chronik-client';
import {
    Script,
    fromHex,
    toHex,
    toHexRev,
    sha256d,
    payment,
    DEFAULT_DUST_SATS,
    ALP_TOKEN_TYPE_STANDARD,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';
import {
    Wallet,
    SatsSelectionStrategy,
    PostageChain,
    ChainedTxType,
} from '../src/wallet';

/** Deterministic p2pkh destination script from an integer seed. */
export const destScript = (i: number): Script => {
    const byte = (i % 256).toString(16).padStart(2, '0');
    return Script.p2pkh(fromHex(byte.repeat(20)));
};

/**
 * Split a fuel wallet into discrete stamp UTXOs, leaving headroom so the
 * split tx can cover its own fee.
 */
export const prepareFuelStamps = async (
    fuelWallet: Wallet,
    stampSats = 2_000n,
    leaveHeadroomSats = 50_000n,
): Promise<void> => {
    const createdFuelUtxos: { sats: bigint; script: Script }[] = [];
    let fuelWalletBalanceSats = fuelWallet
        .spendableSatsOnlyUtxos()
        .reduce((sum, utxo) => sum + utxo.sats, 0n);
    while (fuelWalletBalanceSats > leaveHeadroomSats) {
        createdFuelUtxos.push({
            sats: stampSats,
            script: fuelWallet.script,
        });
        fuelWalletBalanceSats -= stampSats;
    }
    if (createdFuelUtxos.length === 0) {
        throw new Error('prepareFuelStamps: no stamps created');
    }
    await fuelWallet.action({ outputs: createdFuelUtxos }).build().broadcast();
    await fuelWallet.sync();
};

/**
 * Fuel-complete every step of every chain without broadcasting, then
 * broadcast all prepared hexes in order (chains sequential; steps sequential).
 */
export const prepareAndBroadcastPostageChains = async (
    chains: PostageChain[],
    fuelWallet: Wallet,
    chronik: ChronikClient,
): Promise<string[]> => {
    const allPrepared: { hex: string; txid: string }[] = [];

    for (const chain of chains) {
        const prepared: { hex: string; txid: string }[] = [];
        for (let i = 0; i < chain.stepCount; i += 1) {
            const prevTxid = i > 0 ? prepared[i - 1].txid : undefined;
            const postageTx = chain.buildStepPostage(i, prevTxid);
            const prePostageInputSats = postageTx.txBuilder.inputs.reduce(
                (sum, input) => sum + (input.input.signData?.sats ?? 0n),
                0n,
            );
            const fueled = postageTx.addFuelAndSign(
                fuelWallet,
                prePostageInputSats,
            );
            const signedTx = fueled.txs[0];
            const txid = toHexRev(sha256d(signedTx.ser()));
            prepared.push({ hex: toHex(signedTx.ser()), txid });
        }
        allPrepared.push(...prepared);
    }

    const broadcastResp = await chronik.broadcastTxs(
        allPrepared.map(p => p.hex),
    );
    expect(broadcastResp.txids).to.deep.equal(allPrepared.map(p => p.txid));

    for (const txid of broadcastResp.txids) {
        const tx = await chronik.tx(txid);
        expect(tx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');
    }

    return broadcastResp.txids;
};

/** Genesis one ALP token to `tokenWallet` and return its tokenId. */
export const genesisAlpToken = async (
    tokenWallet: Wallet,
    ticker: string,
    mintQty: bigint,
): Promise<string> => {
    const genesisResp = await tokenWallet
        .action({
            outputs: [
                { sats: 0n },
                {
                    sats: DEFAULT_DUST_SATS,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: tokenWallet.script,
                    atoms: mintQty,
                },
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    genesisInfo: {
                        tokenTicker: ticker,
                        tokenName: `${ticker} Postage Chain Token`,
                        url: 'cashtab.com',
                        decimals: 0,
                    },
                },
            ],
        })
        .build()
        .broadcast();
    await tokenWallet.sync();
    return genesisResp.broadcasted[0];
};

/**
 * Fund `tokenWallet` (and optionally an HD receive script) plus a fuel wallet,
 * then prepare discrete fuel stamps.
 */
export const setupPostageWallets = async (
    runner: TestRunner,
    tokenWallet: Wallet,
    fuelWallet: Wallet,
    opts: {
        tokenWalletSats?: bigint;
        fuelWalletSats?: bigint;
        /** If set, fund this script instead of tokenWallet.script (HD receive). */
        tokenFundScript?: Script;
    } = {},
): Promise<void> => {
    const tokenWalletSats = opts.tokenWalletSats ?? 5_000_000_00n;
    const fuelWalletSats = opts.fuelWalletSats ?? 1_000_000n;
    const fundScript = opts.tokenFundScript ?? tokenWallet.script;
    await runner.sendToScript(tokenWalletSats, fundScript);
    await runner.sendToScript(fuelWalletSats, fuelWallet.script);
    await tokenWallet.sync();
    await fuelWallet.sync();
    await prepareFuelStamps(fuelWallet);
};

/** Build a multi-token ALP SEND action with `outputsPerToken` outputs per tokenId. */
export const buildMultiTokenSendAction = (
    tokenIds: string[],
    outputsPerToken: number,
    atomsPerOutput = 1n,
): payment.Action => {
    const outputs: payment.PaymentOutput[] = [{ sats: 0n }];
    const tokenActions: payment.SendAction[] = [];
    let destIdx = 0;
    for (const tokenId of tokenIds) {
        for (let i = 0; i < outputsPerToken; i += 1) {
            outputs.push({
                sats: DEFAULT_DUST_SATS,
                script: destScript(destIdx),
                tokenId,
                atoms: atomsPerOutput,
            });
            destIdx += 1;
        }
        tokenActions.push({
            type: 'SEND',
            tokenId,
            tokenType: ALP_TOKEN_TYPE_STANDARD,
        });
    }
    return { outputs, tokenActions };
};

export { ChainedTxType, SatsSelectionStrategy, PostageChain };
