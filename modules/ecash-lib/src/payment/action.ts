// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { GenesisInfo, TokenType } from '../token/common.js';
import { PaymentOutput } from './output.js';

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
    /** Dust sats associated with this tx, defaults to DEFAULT_DUST_SATS */
    dustSats?: bigint;
    /** Fee per kb to be used for tx(s) of this action, defaults to DEFAULT_FEE_SATS_PER_KB */
    feePerKb?: bigint;
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
