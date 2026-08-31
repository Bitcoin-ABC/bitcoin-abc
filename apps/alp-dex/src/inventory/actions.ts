// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    ALP_TOKEN_TYPE_STANDARD,
    DEFAULT_DUST_SATS,
    payment,
    type Script,
} from 'ecash-lib';
import { POSTAGE_SATS } from '../constants';
import type { SellerUtxoLike } from './classify';
import { assertPositiveCountOrNone } from './plan';

const groupFungibleAtomsByToken = (
    utxos: SellerUtxoLike[],
): Map<string, bigint> => {
    const byToken = new Map<string, bigint>();
    for (const utxo of utxos) {
        const token = utxo.token;
        if (token === undefined || token.isMintBaton) {
            continue;
        }
        const id = token.tokenId.toLowerCase();
        byToken.set(id, (byToken.get(id) ?? 0n) + token.atoms);
    }
    return byToken;
};

/** One SEND per distinct tokenId present on the outputs. */
const tokenActionsForOutputs = (
    outputs: payment.PaymentOutput[],
): payment.TokenAction[] => {
    const seen = new Set<string>();
    const tokenActions: payment.TokenAction[] = [];
    for (const out of outputs) {
        if (!('tokenId' in out)) {
            continue;
        }
        const tokenId = out.tokenId.toLowerCase();
        if (seen.has(tokenId)) {
            continue;
        }
        seen.add(tokenId);
        tokenActions.push({
            type: 'SEND',
            tokenId,
            tokenType: ALP_TOKEN_TYPE_STANDARD,
        });
    }
    return tokenActions;
};

const buildTokenSendOutputs = (
    utxos: SellerUtxoLike[],
    destScript: Script,
): payment.PaymentOutput[] => {
    const byToken = groupFungibleAtomsByToken(utxos);
    const outputs: payment.PaymentOutput[] = [];
    for (const [tokenId, atoms] of byToken) {
        outputs.push({
            sats: DEFAULT_DUST_SATS,
            script: destScript,
            tokenId,
            atoms,
        });
    }
    return outputs;
};

/**
 * Seller → slush: consolidate traded-token UTXOs that are not exact inventory
 * size (wrong size from fills, external sends, etc.).
 *
 * Pins `requiredUtxos` so selection cannot spend fill-eligible inventory or
 * postage. Wallet chains if needed.
 */
export const actionCleanupSellerToSlush = (
    wrongSizedTraded: SellerUtxoLike[],
    slushScript: Script,
): payment.Action | null => {
    if (wrongSizedTraded.length === 0) {
        return null;
    }
    for (const utxo of wrongSizedTraded) {
        if (utxo.token === undefined || utxo.token.isMintBaton) {
            throw new Error(
                'wrongSizedTraded must be fungible traded-token UTXOs only',
            );
        }
    }

    const outputs = buildTokenSendOutputs(wrongSizedTraded, slushScript);

    return {
        outputs: [{ sats: 0n }, ...outputs],
        tokenActions: tokenActionsForOutputs(outputs),
        requiredUtxos: wrongSizedTraded.map(u => u.outpoint),
    };
};

/**
 * Slush → seller: create `unitCount` exact-size inventory UTXOs.
 *
 * Outputs + SEND only — ecash-wallet selects slush inputs, change, and chains
 * when the out count exceeds ALP policy limits.
 */
export const actionFundInventory = (
    tokenId: string,
    utxoAtoms: bigint,
    unitCount: number,
    sellerScript: Script,
): payment.Action | null => {
    if (!assertPositiveCountOrNone(unitCount, 'unitCount')) {
        return null;
    }
    if (utxoAtoms <= 0n) {
        throw new Error(`utxoAtoms must be positive (got ${utxoAtoms})`);
    }
    const id = tokenId.toLowerCase();
    const outputs: payment.PaymentOutput[] = [];
    for (let i = 0; i < unitCount; i++) {
        outputs.push({
            sats: DEFAULT_DUST_SATS,
            script: sellerScript,
            tokenId: id,
            atoms: utxoAtoms,
        });
    }
    return {
        outputs: [{ sats: 0n }, ...outputs],
        tokenActions: tokenActionsForOutputs(outputs),
    };
};

/**
 * Slush → seller: create postage stamps (XEC-only). Wallet selects inputs and
 * chains on tx size if needed.
 */
export const actionFundPostage = (
    stampCount: number,
    sellerScript: Script,
    postageSats: bigint = POSTAGE_SATS,
): payment.Action | null => {
    if (!assertPositiveCountOrNone(stampCount, 'stampCount')) {
        return null;
    }
    if (postageSats <= 0n) {
        throw new Error(`postageSats must be positive (got ${postageSats})`);
    }
    const outputs: payment.PaymentOutput[] = [];
    for (let i = 0; i < stampCount; i++) {
        outputs.push({
            sats: postageSats,
            script: sellerScript,
        });
    }
    return {
        outputs,
        tokenActions: [],
    };
};

/**
 * Seller → fee: sweep non-traded fungibles and odd (non-postage) XEC.
 * Batons must not appear in `misc`. Pins required outs so inventory/postage
 * are not selected.
 */
export const actionSweepMiscToFee = (
    misc: SellerUtxoLike[],
    feeScript: Script,
): payment.Action | null => {
    if (misc.length === 0) {
        return null;
    }
    for (const utxo of misc) {
        if (utxo.token?.isMintBaton) {
            throw new Error('misc must not include mint batons');
        }
    }

    const outputs: payment.PaymentOutput[] = [
        ...buildTokenSendOutputs(misc, feeScript),
    ];

    const xecSats = misc
        .filter(u => u.token === undefined)
        .reduce((sum, u) => sum + u.sats, 0n);
    // Sub-dust odd XEC stays on required inputs and is burned as fee.
    if (xecSats >= DEFAULT_DUST_SATS) {
        outputs.push({
            sats: xecSats,
            script: feeScript,
        });
    }

    if (outputs.length === 0) {
        return null;
    }

    const tokenActions = tokenActionsForOutputs(outputs);
    const action: payment.Action = {
        outputs: tokenActions.length > 0 ? [{ sats: 0n }, ...outputs] : outputs,
        requiredUtxos: misc.map(u => u.outpoint),
    };
    if (tokenActions.length > 0) {
        action.tokenActions = tokenActions;
    }
    return action;
};
