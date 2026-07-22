// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Print seller / slush / fee addresses from config.json.
 *
 * Usage:
 *   pnpm exec tsx scripts/printHdAddresses.ts
 */

import { loadTradedConfig } from '../src/config/tradedConfig';
import {
    resolveLpAddresses,
    SELLER_ACCOUNT,
    SLUSH_ACCOUNT,
} from '../src/wallet/accounts';

const config = loadTradedConfig();
const addresses = resolveLpAddresses(config.mnemonic, config.feeAddress);

console.log(`HD path template: m/44'/1899'/{account}'/0/0 (seller=0, slush=1)`);
console.log(`account ${SELLER_ACCOUNT} seller: ${addresses.sellerAddress}`);
console.log(`account ${SLUSH_ACCOUNT} slush:  ${addresses.slushAddress}`);
console.log(`fee:    ${addresses.feeAddress}`);
