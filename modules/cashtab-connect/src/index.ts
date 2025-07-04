// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export interface CashtabMessage {
    text?: string;
    type?: string;
    addressRequest?: boolean;
    txInfo?: Record<string, string>;
    id?: string;
}

export interface AddressResponse {
    success: boolean;
    address?: string;
    reason?: string;
}

export class CashtabExtensionUnavailableError extends Error {
    constructor(message?: string) {
        super(message || 'Cashtab extension is not available');
        this.name = 'CashtabExtensionUnavailableError';
    }
}

export class CashtabAddressDeniedError extends Error {
    constructor(reason?: string) {
        super(reason || 'User denied address request');
        this.name = 'CashtabAddressDeniedError';
    }
}

export class CashtabTimeoutError extends Error {
    constructor() {
        super('Request timed out');
        this.name = 'CashtabTimeoutError';
    }
}

export class CashtabConnect {
    private timeout: number;
    private messageListeners: Map<string, (response: any) => void> = new Map();

    constructor(timeout: number = 30000) {
        this.timeout = timeout;
        this.setupMessageListener();
    }

    private setupMessageListener(): void {
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('message', event => {
                if (event.source !== window) return;
                if (event.data && event.data.type === 'FROM_CASHTAB') {
                    // Handle address response - support both new and old formats
                    const listener = this.messageListeners.get('address');
                    if (listener) {
                        // New format: success, address, reason
                        if (typeof event.data.success !== 'undefined') {
                            listener({
                                success: event.data.success,
                                address: event.data.address,
                                reason: event.data.reason,
                            });
                            this.messageListeners.delete('address');
                        }
                        // Old format: approval
                        else if (typeof event.data.address !== 'undefined') {
                            if (
                                event.data.address !==
                                'Address request denied by user'
                            ) {
                                // User approved - address should be available
                                if (event.data.address) {
                                    listener({
                                        success: true,
                                        address: event.data.address,
                                    });
                                } else {
                                    // Address not provided in old format - this is an error
                                    listener({
                                        success: false,
                                        address: undefined,
                                        reason: 'Address not provided in response',
                                    });
                                }
                            } else {
                                // User denied
                                listener({
                                    success: false,
                                    address: undefined,
                                    reason: 'User denied the address request',
                                });
                            }
                            this.messageListeners.delete('address');
                        }
                        // Old format: explicit denial
                        else if (event.data.addressRequestApproved === false) {
                            listener({
                                success: false,
                                address: undefined,
                                reason: 'User denied the address request',
                            });
                            this.messageListeners.delete('address');
                        }
                    }
                }
            });
        }
    }

    private async checkExtensionAvailability(): Promise<boolean> {
        // Check if the extension is available in the window object
        const isAvailable =
            typeof window !== 'undefined' &&
            (window as any).bitcoinAbc === 'cashtab';

        return isAvailable;
    }

    // When a web page requests the user address, a response is expected
    private sendMessage(message: CashtabMessage): Promise<any> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.messageListeners.delete('address');
                reject(new CashtabTimeoutError());
            }, this.timeout);

            this.messageListeners.set('address', response => {
                clearTimeout(timeoutId);
                resolve(response);
            });

            if (typeof window !== 'undefined' && window.postMessage) {
                window.postMessage(message, '*');
            } else {
                reject(new CashtabExtensionUnavailableError());
            }
        });
    }

    // No response is expect when a web page creates a transaction
    // TODO expect response of the txid or cancel notice
    private sendMessageNoResponse(message: CashtabMessage): void {
        if (typeof window !== 'undefined' && window.postMessage) {
            window.postMessage(message, '*');
        } else {
            throw new CashtabExtensionUnavailableError();
        }
    }

    async requestAddress(): Promise<string> {
        const request: CashtabMessage = {
            text: 'Cashtab',
            type: 'FROM_PAGE',
            addressRequest: true,
        };

        const response: AddressResponse = await this.sendMessage(request);

        if (!response.success) {
            throw new CashtabAddressDeniedError(response.reason);
        }

        if (!response.address) {
            throw new Error('No address received from extension');
        }

        return response.address;
    }

    /**
     * Create a transaction using a BIP21 URI directly
     * @param bip21Uri - The BIP21 URI (e.g., "ecash:address?amount=0.001&memo=Payment")
     */
    async createTransactionFromBip21(bip21Uri: string): Promise<void> {
        const request: CashtabMessage = {
            text: 'Cashtab',
            type: 'FROM_PAGE',
            txInfo: { bip21: bip21Uri },
        };

        this.sendMessageNoResponse(request);
    }

    /**
     * Send XEC to an address using Cashtab (dev-friendly)
     * @param address - eCash address
     * @param amount - Amount in XEC (string or number)
     */
    async sendXec(address: string, amount: string | number): Promise<void> {
        const bip21 = `${address}?amount=${amount}`;
        return this.sendBip21(bip21);
    }

    /**
     * Send a token using Cashtab (dev-friendly)
     * @param address - eCash address
     * @param tokenId - Token ID
     * @param tokenDecimalizedQty - Decimalized token quantity (string or number)
     */
    async sendToken(
        address: string,
        tokenId: string,
        tokenDecimalizedQty: string | number,
    ): Promise<void> {
        const bip21 = `${address}?token_id=${tokenId}&token_decimalized_qty=${tokenDecimalizedQty}`;
        return this.sendBip21(bip21);
    }

    /**
     * Send a raw BIP21 string using Cashtab
     * @param bip21 - BIP21 URI string
     */
    async sendBip21(bip21: string): Promise<void> {
        const request: CashtabMessage = {
            text: 'Cashtab',
            type: 'FROM_PAGE',
            txInfo: { bip21 },
        };
        this.sendMessageNoResponse(request);
    }

    destroy(): void {
        this.messageListeners.clear();
    }

    /**
     * Wait for the extension to become available
     * In practice this takes less than 1s
     * @param timeout - Maximum time to wait in milliseconds (default: 3000)
     * @returns Promise that resolves when extension is available or rejects on timeout
     */
    public async waitForExtension(timeout: number = 3000): Promise<void> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            if (await this.checkExtensionAvailability()) {
                return;
            }

            // Wait a bit before checking again
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        throw new CashtabExtensionUnavailableError(
            'Extension did not become available within the timeout period',
        );
    }

    /**
     * Check if the extension is currently available
     * @returns Promise that resolves to true if extension is available, false otherwise
     */
    public async isExtensionAvailable(): Promise<boolean> {
        return this.checkExtensionAvailability();
    }
}
