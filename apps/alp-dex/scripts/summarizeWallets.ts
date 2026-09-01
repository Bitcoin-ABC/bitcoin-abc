// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Print a Chronik UTXO snapshot of seller, slush, and fee addresses.
 *
 * Usage (from apps/alp-dex, with config.json):
 *   pnpm summarize-wallets
 */

import { loadTradedConfig } from '../src/config/tradedConfig';
import { createChronikClient } from '../src/chronik/createChronik';
import {
    classifySellerUtxos,
    type SellerUtxoLike,
} from '../src/inventory/classify';
import { inventoryUnitCount } from '../src/inventory/plan';
import { atomsToDecimalizedQty } from '../src/methods/atoms';
import { sumFungibleAtoms } from '../src/pricing/reserves';
import { loadTradedTokens } from '../src/tokens/tradedTokens';
import { createLpWallets } from '../src/wallet/accounts';

const toSellerLike = (utxo: {
    outpoint: { txid: string; outIdx: number };
    sats: bigint;
    token?: {
        tokenId: string;
        atoms: bigint;
        isMintBaton: boolean;
    };
}): SellerUtxoLike => ({
    outpoint: utxo.outpoint,
    sats: utxo.sats,
    token:
        utxo.token === undefined
            ? undefined
            : {
                  tokenId: utxo.token.tokenId,
                  atoms: utxo.token.atoms,
                  isMintBaton: utxo.token.isMintBaton,
              },
});

const sumSats = (utxos: Iterable<{ sats?: bigint } | undefined>): bigint => {
    let sum = 0n;
    for (const utxo of utxos) {
        if (utxo === undefined || utxo.sats === undefined) {
            continue;
        }
        sum += utxo.sats;
    }
    return sum;
};

const main = async (): Promise<void> => {
    const config = loadTradedConfig();
    const chronik = createChronikClient(config.chronikUrls);
    const { seller, slush, addresses } = createLpWallets(
        config.mnemonic,
        chronik,
        config.feeAddress,
    );
    const tradedTokens = await loadTradedTokens(chronik, config);

    await Promise.all([seller.sync(), slush.sync()]);

    let feeUtxos: SellerUtxoLike[] | undefined;
    let feeUtxosError: string | undefined;
    try {
        const feeResp = await chronik.address(addresses.feeAddress).utxos();
        feeUtxos = feeResp.utxos.map(toSellerLike);
    } catch (error: unknown) {
        feeUtxosError = error instanceof Error ? error.message : String(error);
        console.error(`fee address Chronik utxos failed: ${feeUtxosError}`);
    }

    const sellerClassified = classifySellerUtxos(seller.utxos, tradedTokens);

    console.log(`seller ${addresses.sellerAddress}`);
    console.log(
        `  utxos=${seller.utxos.length} sats=${sumSats(seller.utxos)} ` +
            `fillEligible=${sellerClassified.fillEligible.length} ` +
            `postage=${sellerClassified.postage.length} ` +
            `wrongSized=${sellerClassified.wrongSizedTraded.length} ` +
            `misc=${sellerClassified.misc.length} ` +
            `belowDust=${sellerClassified.belowDust.length} ` +
            `batons=${sellerClassified.skippedBatons.length}`,
    );

    console.log(`slush  ${addresses.slushAddress}`);
    console.log(
        `  utxos=${slush.utxos.length} sats=${sumSats(slush.utxos)} ` +
            `spendableXecUtxos=${slush.spendableSatsOnlyUtxos().length} ` +
            `spendableXecSats=${sumSats(slush.spendableSatsOnlyUtxos())}`,
    );

    console.log(`fee    ${addresses.feeAddress}`);
    if (feeUtxos === undefined) {
        console.error('  unavailable (Chronik utxos failed)');
        throw new Error(
            feeUtxosError === undefined
                ? 'fee address Chronik utxos failed'
                : `fee address Chronik utxos failed: ${feeUtxosError}`,
        );
    }
    console.log(`  utxos=${feeUtxos.length} sats=${sumSats(feeUtxos)}`);

    for (const token of tradedTokens.values()) {
        const sellerAtoms = sumFungibleAtoms(seller.utxos, token.tokenId);
        const slushAtoms = sumFungibleAtoms(slush.utxos, token.tokenId);
        const feeAtoms = sumFungibleAtoms(feeUtxos, token.tokenId);
        const sellerUnits = inventoryUnitCount(sellerAtoms, token.utxoAtoms);
        const slushUnits = inventoryUnitCount(slushAtoms, token.utxoAtoms);
        const sellerExact = seller.utxos.filter(
            utxo =>
                utxo.token?.tokenId.toLowerCase() === token.tokenId &&
                utxo.token.atoms === token.utxoAtoms &&
                !utxo.token.isMintBaton,
        ).length;
        console.log(
            `token  ${token.tokenTicker} ${token.tokenId} ` +
                `decimals=${token.decimals} utxoAtoms=${token.utxoAtoms} ` +
                `utxoQty=${token.utxoQty}`,
        );
        console.log(
            `  seller atoms=${sellerAtoms} ` +
                `(${atomsToDecimalizedQty(sellerAtoms, token.decimals)}) ` +
                `exactUtxos=${sellerExact} wholeUnits=${sellerUnits}`,
        );
        console.log(
            `  slush  atoms=${slushAtoms} ` +
                `(${atomsToDecimalizedQty(slushAtoms, token.decimals)}) ` +
                `wholeUnits=${slushUnits}`,
        );
        if (feeAtoms > 0n) {
            console.log(
                `  fee    atoms=${feeAtoms} ` +
                    `(${atomsToDecimalizedQty(feeAtoms, token.decimals)})`,
            );
        }
    }
};

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
