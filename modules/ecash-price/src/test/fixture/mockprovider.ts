// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { PriceProvider } from '../../provider';
import { Fiat, PriceResponse } from '../../types';

/**
 * Options for creating a MockProvider
 */
export interface MockProviderOptions {
    /**
     * Whether the provider should succeed (return valid price data)
     * Default: true
     */
    shouldSucceed?: boolean;
    /**
     * Whether the provider should throw an error
     * Default: false
     */
    shouldThrow?: boolean;
    /**
     * Custom price value to return (used when shouldSucceed is true and no response is provided)
     * Default: 1.241e-5
     */
    price?: number;
    /**
     * Custom response to return (overrides shouldSucceed behavior)
     */
    response?: PriceResponse;
}

/**
 * Mock provider for testing
 */
export class MockProvider implements PriceProvider {
    readonly id = 'mock';
    readonly name = 'Mock Provider';
    private shouldSucceed: boolean;
    private shouldThrow: boolean;
    private price: number;
    response?: PriceResponse;

    constructor(options: MockProviderOptions = {}) {
        this.shouldSucceed = options.shouldSucceed ?? true;
        this.shouldThrow = options.shouldThrow ?? false;
        this.price = options.price ?? 1.241e-5;
        this.response = options.response;
    }

    toString(): string {
        return this.name;
    }

    toJSON(): string {
        return this.id;
    }

    async fetchPrices(): Promise<PriceResponse> {
        if (this.shouldThrow) {
            throw new Error('Provider error');
        }

        if (this.response) {
            return this.response;
        }

        if (this.shouldSucceed) {
            return {
                prices: [
                    {
                        quote: Fiat.USD,
                        provider: this,
                        price: this.price,
                        lastUpdated: new Date(1767706673 * 1000),
                    },
                ],
            };
        }

        return {
            prices: [
                {
                    quote: Fiat.USD,
                    provider: this,
                    error: 'Mock provider error',
                },
            ],
        };
    }
}
