// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { PriceRequest, PriceResponse } from './types';

/**
 * Abstract interface for price providers
 * All price providers must implement this interface
 *
 * Provider-specific configuration should be passed to the provider's constructor,
 * as each provider will have different configuration requirements (API keys, endpoints, etc.)
 */
export interface PriceProvider {
    /**
     * Unique identifier for this provider
     */
    readonly id: string;

    /**
     * Human-readable name of the provider
     */
    readonly name: string;

    /**
     * Get string representation of the provider
     * Used for template literals, string concatenation, and general string conversion
     * @returns Provider as a string
     */
    toString(): string;

    /**
     * Get JSON-serializable representation of the provider
     * JSON.stringify() will automatically call this method
     * @returns Provider as a string for JSON serialization
     */
    toJSON(): string;

    /**
     * Fetch prices for the given request
     *
     * @param request - Price request, can contain multiple quote currencies
     * @returns Price response with price data for each requested quote
     *          Each PriceData entry may have an error field if that quote failed
     */
    fetchPrices(request: PriceRequest): Promise<PriceResponse>;
}
