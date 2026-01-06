// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Strategy for handling multiple providers
 */
export enum ProviderStrategy {
    /**
     * Fallback: Try providers in order, use the first successful response
     */
    FALLBACK = 'fallback',
}
