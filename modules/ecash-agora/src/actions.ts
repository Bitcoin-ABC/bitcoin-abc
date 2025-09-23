// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    DEFAULT_DUST_SATS,
    payment,
    TokenType,
    Script,
    shaRmd160,
} from 'ecash-lib';
import { AgoraOfferVariant } from './agora.js';

/**
 * Action to request a payment.Action that will
 * create an Agora listing
 */
export interface ListAction {
    /** The type of agora action, used to distinguish between different spec-enabled actions */
    type: 'LIST';
    /**
     * While tokenType can be inferred from an agora partial,
     * it cannot be inferred from an agora ONESHOT,
     * so we need to specify it here
     */
    tokenType: TokenType;
    /** The variant of the agora action to be listed */
    variant: AgoraOfferVariant;
}

/**
 * Supported agora actions that can be converted to a payment.Action
 * for build and broadcast by ecash-wallet
 */
export type AgoraAction = ListAction;

export const getAgoraPaymentAction = (
    action: ListAction,
    dustSats = DEFAULT_DUST_SATS,
): payment.Action => {
    const { type, tokenType, variant } = action;

    switch (tokenType.protocol) {
        case 'SLP': {
            throw new Error('SLP is not currently supported.');
        }
        case 'ALP': {
            switch (type) {
                case 'LIST': {
                    /**
                     * Handle an ALP list action
                     *
                     * An ALP list action requires a data action and a send action
                     * Unlike SLP list actions, it can be completed in a single tx
                     */
                    if (variant.type === 'ONESHOT') {
                        throw new Error(
                            'ALP ONESHOT listings are not currently supported',
                        );
                    }

                    /**
                     * We only support AgoraPartial listings for ALP
                     *
                     * An AgoraPartial listing requires
                     * - A data tokenAction of agoraPartial.adPushdata() at the beginning of the EMPP OP_RETURN
                     * - A SEND tokenAction to send the listed tokens to the p2sh output
                     * - A blank OP_RETURN template output at index 0
                     * - A p2sh output to hold the listed tokens
                     *
                     * ecash-wallet can handle token change and XEC change, so we do not need to build it here
                     */

                    return {
                        outputs: [
                            { sats: 0n },
                            {
                                sats: dustSats,
                                script: Script.p2sh(
                                    shaRmd160(variant.params.script().bytecode),
                                ),
                                tokenId: variant.params.tokenId,
                                atoms: variant.params.offeredAtoms(),
                                isMintBaton: false,
                            },
                        ],
                        tokenActions: [
                            {
                                type: 'DATA',
                                data: variant.params.adPushdata(),
                            },
                            {
                                type: 'SEND',
                                tokenId: variant.params.tokenId,
                                tokenType: tokenType,
                            },
                        ],
                    };
                }
                default: {
                    // Cannot get here with valid typed input
                    throw new Error(`Unsupported agora action: ${type}`);
                }
            }
        }
        default: {
            throw new Error(
                `Unsupported token protocol: ${tokenType.protocol}`,
            );
        }
    }
};
