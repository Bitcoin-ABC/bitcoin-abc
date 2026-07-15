// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { getOutputScriptFromAddress } from 'ecashaddrjs';

/**
 * Legacy coordinator (alp-swap) platform fee payout addresses.
 * Historical settles may still include this out; standalone alp-dex does not.
 */
export const ALP_SWAP_PLATFORM_FEE_ADDRESSES = [
    'ecash:qqfuy9k04vxglgqy8v5f6p89ks7h94msycf95lpern',
] as const;

/**
 * Known alp-dex maker/LP fee payout addresses (HD account 2 / FEE_ADDRESS).
 * Unknown fee outs on a settle still classify as makerFee by structure.
 */
export const ALP_DEX_MAKER_FEE_ADDRESSES = [
    'ecash:qqk7skx0u94avx4znwfj2ryv49plngf855v32pfn3c',
    // Legacy analytics fee addresses
    'ecash:qzw8yukk99r23mv5zc9ryshvek9tlqt0f52yhsuru8',
    'ecash:qqlrju5xpcrhxke2lt60q6nrjfnpsgqjw52ajykxth',
] as const;

export const ALP_SWAP_PLATFORM_FEE_SCRIPT_SET = new Set(
    ALP_SWAP_PLATFORM_FEE_ADDRESSES.map(addr =>
        getOutputScriptFromAddress(addr),
    ),
);

export const ALP_DEX_MAKER_FEE_SCRIPT_SET = new Set(
    ALP_DEX_MAKER_FEE_ADDRESSES.map(addr => getOutputScriptFromAddress(addr)),
);
