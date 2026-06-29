// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Wallet } from 'ecash-wallet';
import { Address, Script, DEFAULT_DUST_SATS, OP_RETURN } from 'ecash-lib';
import type { AssetDefinition } from './supported-assets';

// Wallet date that we can't retrieve from ecash-wallet.
// For now it's just the mnemonic.
export interface WalletData {
    mnemonic: string;
}

// Build a wallet action with the given parameters
export function buildAction(
    wallet: Wallet,
    recipientAddress: string,
    sats: number,
    opReturnRaw?: string,
) {
    // Build outputs array
    const outputs = [];

    // Add OP_RETURN output at first position if opReturnRaw is provided
    if (opReturnRaw) {
        // Prepend the OP_RETURN opcode and convert to Uint8Array
        const opReturnData = Uint8Array.from(
            Buffer.from(OP_RETURN.toString(16) + opReturnRaw, 'hex'),
        );

        // Add OP_RETURN output (must have 0 sats)
        outputs.push({
            sats: 0n,
            script: new Script(opReturnData),
        });
    }

    outputs.push({
        address: recipientAddress,
        sats: BigInt(sats),
    });

    // Create the action with outputs
    return wallet.action({ outputs });
}

/**
 * Build a wallet action that sends tokens (ALP, SLP, etc.).
 */
export function buildTokenSendAction(
    wallet: Wallet,
    recipientAddress: string,
    atoms: bigint,
    token: AssetDefinition,
) {
    const { tokenId, tokenType } = token;
    if (!tokenId || !tokenType) {
        throw new Error('Token send requires tokenId and tokenType');
    }
    const recipientScript = Address.parse(recipientAddress).toScript();
    return wallet.action({
        outputs: [
            { sats: 0n },
            {
                sats: DEFAULT_DUST_SATS,
                script: recipientScript,
                tokenId,
                atoms,
            },
        ],
        tokenActions: [
            {
                type: 'SEND',
                tokenId,
                tokenType,
            },
        ],
    });
}
