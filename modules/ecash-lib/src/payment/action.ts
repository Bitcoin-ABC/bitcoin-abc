// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { GenesisInfo, TokenType } from '../token/common.js';
import { PaymentOutput } from './output.js';
import { OutPoint } from '../tx.js';

/**
 * Action
 *
 * Interface used to organize onchain intentions
 * in human-constructable terms that can be parsed
 * into onchain action(s), i.e. anything that can
 * be done in one or multiple XEC txs
 *
 * This is a dev-friendly and computer-understandable
 * language you speak when you ask the eCash network to do something
 */
export interface Action {
    /**
     * Transaction outputs
     * For single-tx actions, the indices of PaymentOutput[]
     * correspond to the outIdx values of the transaction outputs
     */
    outputs: PaymentOutput[];
    /**
     * Token actions, if any, associated with this Action
     * Note that we may also accept a "DataAction" here for an
     * ALP token Action. This is still a tokenAction since it is only
     * added here if it is being combined with an ALP action
     *
     * Custom OP_RETURN fields are constructed in PaymentOutput[]
     * Any Action that includes tokenActions must have the OP_RETURN
     * blank output, i.e. {sats: 0n}, at index 0 of Action.outputs[]
     */
    tokenActions?: TokenAction[];
    /**
     * A user may optionally specify any utxos that wish to be included in the action by
     * passing their OutPoint(s)
     *
     * Use cases
     * - Apps that support 0-conf and want to make sure a return tx includes the payment utxo,
     *   so that if the payment is doublespent, both txs are invalidated
     * - Users looking to build a chained tx, where the change of 1 tx provides the input for
     *   the next tx in the chain
     * - Unknown future use cases where some tx or app actions may require specific utxos
     *   for a spec not yet supported by ecash-wallet or ecash-lib
     *
     * If requiredUtxos is specified, the Action will include every ScriptUtxo specified in the
     * first tx of the built action. If it is unable to do so due to fee or size constraints,
     * it will throw an error rather than partially exclude specified inputs
     *
     * We specify these utxos by OutPoint which uniquely identifies them. ecash-wallet still must
     * check that these utxos are actually available in the wallet.
     */
    requiredUtxos?: OutPoint[];
    /**
     * If true, the Action will not include any change outputs in the built txs
     * For power users who want to exactly specify the inputs and outputs of a tx,
     * and to support building deterministic chained txs
     *
     * If unspecified, ecash-wallet will always automatically include change
     *
     * Note that if noChange is specified as true, unless the outputs specify reasonable change or
     * just so happen to about correspond with input + fee, we are likely to get an
     * error on build or broadcast from the fee being too crazy
     *
     * TODO extend this to also block token change when we add support for chained
     * token send txs, as we also want these to be deterministic
     */
    noChange?: boolean;
    /** Dust sats associated with this tx, defaults to DEFAULT_DUST_SATS */
    dustSats?: bigint;
    /** Fee per kb to be used for tx(s) of this action, defaults to DEFAULT_FEE_SATS_PER_KB */
    feePerKb?: bigint;
    /** Maximum tx sersize to be used for tx(s) of this action, defaults to MAX_TX_SERSIZE */
    maxTxSersize?: number;
}

/**
 * Instructions for token actions within a given Action
 * For EMPP OP_RETURNs, the EMPP pushes will be made
 * in the same order these actions are specified
 */
export type TokenAction =
    | GenesisAction
    | BurnAction
    | MintAction
    | SendAction
    | DataAction;

/**
 * We do not yet know the tokenId of a token involved in a GenesisAction
 * We use a placeholder token to distinguish GENESIS PaymentTokenOutput[] from MINT
 * PaymentTokenOutput[]; see payment/output.ts
 */
export const GENESIS_TOKEN_ID_PLACEHOLDER = 'GENESIS_TOKEN_ID_PLACEHOLDER';

/**
 * Instructions to create a new token in this Action
 * An Action with tokenActions specified and a GenesisAction
 * specified must have it at tokenActions[0], and it must
 * be the only GenesisAction
 */
export interface GenesisAction {
    type: 'GENESIS';
    tokenType: TokenType;
    genesisInfo: GenesisInfo;
    /** Only for SLP_TOKEN_TYPE_NFT1_CHILD tokens */
    groupTokenId?: string;
}

/**
 * Instructions to execute a MINT action for a given tokenId
 * The actual mint quantities (and mint batons) are specfied
 * in the "outputs" key of Action
 *
 * NB we cannot SEND and MINT the same tokenId in the same tx
 */
export interface MintAction {
    type: 'MINT';
    tokenId: string;
    tokenType: TokenType;
}

/**
 * Instructions to execute a SEND action for a given tokenId
 * The actual send quantities are specfied in the "outputs"
 * key of Action
 *
 * NB we cannot SEND and MINT the same tokenId in the same tx
 */
export interface SendAction {
    type: 'SEND';
    tokenId: string;
    tokenType: TokenType;
}

/**
 * Instructions to execute a BURN action for a given tokenId
 * May or may not be combined with a SEND action
 *
 * If no SEND action is present, there must also be no outputs
 * specified for the token, and the tx will burn all inputs
 * of this tokenId
 */
export interface BurnAction {
    type: 'BURN';
    tokenId: string;
    tokenType: TokenType;
    /** The number of atoms of this token to burn in this Action */
    burnAtoms: bigint;
}

/**
 * Arbitrary data push to be included for token types that support EMPP
 * Not associated with PaymentOutput[]
 */
export interface DataAction {
    type: 'DATA';
    data: Uint8Array;
}
