// Copyright (c) 2024-2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * transactions.ts
 * methods for building token reward transtaction
 */

import { Wallet } from 'ecash-wallet';
import {
    Script,
    DEFAULT_DUST_SATS,
    payment,
    SLP_TOKEN_TYPE_FUNGIBLE,
} from 'ecash-lib';

interface ChronikBroadcastTxResponse {
    txid: string;
}
export interface RewardBroadcastSuccess {
    hex: string;
    response: ChronikBroadcastTxResponse;
}
/**
 * Create and broadcast a token reward tx
 * @param chronik initialized instance of chronik-client
 * @param wallet
 * @param feeRate satoshis per byte
 * @param tokenId tokenId of token to send as reward
 * @param rewardAmountTokenSats qty of token to send as reward in lowest base unit for this token
 * @throws dust error, balance exceeded error, coinselect errors, and node broadcast errors
 * @returns
 */
export const sendReward = async (
    wallet: Wallet,
    tokenId: string,
    rewardAmountTokenSats: bigint,
    destinationAddress: string,
): Promise<{
    txid: string;
}> => {
    // Define your wallet action
    // For a CACHET reward, we are sending 100 CACHET to an eligible user
    const slpSendAction: payment.Action = {
        outputs: [
            /** Blank OP_RETURN at outIdx 0 */
            { sats: 0n },
            /** 100 CACHET at outIdx 1 */
            {
                sats: DEFAULT_DUST_SATS,
                script: Script.fromAddress(destinationAddress),
                tokenId,
                atoms: rewardAmountTokenSats,
            },
        ],
        tokenActions: [
            /** SLP send action */
            {
                type: 'SEND',
                tokenId,
                tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
            },
        ],
    };

    // Sync wallet to get latest utxo set
    await wallet.sync();

    return await wallet.action(slpSendAction).build().broadcast();
};

/**
 * Create and broadcast an XEC airdrop tx
 * @param wallet
 * @param xecAirdropAmountSats airdrop amount in satoshis
 * @param destinationAddress airdrop recipient
 * @throws dust error, balance exceeded error, coinselect errors, and node broadcast errors
 * @returns
 */
export const sendXecAirdrop = async (
    wallet: Wallet,
    xecAirdropAmountSats: bigint,
    destinationAddress: string,
): Promise<{ txid: string }> => {
    // Define your wallet action for an XEC reward
    // In cashtab-faucet, we send 42 XEC to an eligible user
    const xecSendAction: payment.Action = {
        outputs: [
            {
                script: Script.fromAddress(destinationAddress),
                sats: xecAirdropAmountSats,
            },
        ],
    };

    // Sync wallet to get latest utxo set
    await wallet.sync();

    return await wallet.action(xecSendAction).build().broadcast();
};
