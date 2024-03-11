// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Tx_InNode } from 'chronik-client';
import {
    hasInputsFromOutputScript,
    addressReceivedToken,
    getTxTimestamp,
} from './chronik/parse';

/**
 * rewards.ts
 * Methods to determine eligibility of an address for token rewards
 */

/**
 * Determine if a given address is eligible for rewards at the time of an API call
 *
 * An address is eligible for token rewards if the address has not received
 * any tokens from the rewards server in >= config.eligibilityResetSeconds
 * We keep eligibilityWindowSeconds as a param and not a constant to support
 * testing, since we would like to confirm if different windows would work
 *
 * @param address the address we are checking for token reward eligibility
 * @param tokenId tokenId of the token we are checking for reward eligibility
 * @param tokenServerOutputScript the outputScript of tokenServer's hot wallet
 * @param historySinceEligibilityTimestamp tx history of checkedOutputScript, including only txs AFTER eligibility timestamp *
 * @returns true if eligible, timestamp of last reward if ineligible
 */
export function isAddressEligibleForTokenReward(
    address: string,
    tokenId: string,
    tokenServerOutputScript: string,
    historySinceEligibilityTimestamp: Tx_InNode[],
): boolean | number {
    // If there is no tx history, the checkedOutputScript is eligible
    if (historySinceEligibilityTimestamp.length === 0) {
        return true;
    }
    for (const tx of historySinceEligibilityTimestamp) {
        if (!hasInputsFromOutputScript(tx, tokenServerOutputScript)) {
            // If this tx was not sent by the rewards server, check the next tx
            // address can receive token txs of tokenId without
            // impacting eligibility, provided they were not from us
            continue;
        }

        if (addressReceivedToken(tx, address, tokenId)) {
            // If a tx from historySinceEligibilityTimestamp received this token
            // AND it received it from us
            // The address is not yet eligible for token rewards

            // Return timestamp of disqualifying tx
            return getTxTimestamp(tx);
        }
    }
    // If none of the txs in historySinceEligibilityTimestamp sent the given tokenId
    // from tokenServerOutputScript to address, then the address is eligible for token rewards
    return true;
}
