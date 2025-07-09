// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export interface CashtabMessage {
    text?: string;
    type?: string;
    addressRequest?: boolean;
    txInfo?: Record<string, string>;
    id?: string;
    txResponse?: {
        approved: boolean;
        txid?: string;
        reason?: string;
    };
}

export interface AddressResponse {
    success: boolean;
    address?: string;
    reason?: string;
}

export interface TransactionResponse {
    success: boolean;
    txid?: string;
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

export class CashtabTransactionDeniedError extends Error {
    constructor(reason?: string) {
        super(reason || 'User denied transaction request');
        this.name = 'CashtabTransactionDeniedError';
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
                    const addressListener =
                        this.messageListeners.get('address');
                    if (addressListener) {
                        // New format: success, address, reason
                        if (typeof event.data.success !== 'undefined') {
                            addressListener({
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
                                    addressListener({
                                        success: true,
                                        address: event.data.address,
                                    });
                                } else {
                                    // Address not provided in old format - this is an error
                                    addressListener({
                                        success: false,
                                        address: undefined,
                                        reason: 'Address not provided in response',
                                    });
                                }
                            } else {
                                // User denied
                                addressListener({
                                    success: false,
                                    address: undefined,
                                    reason: 'User denied the address request',
                                });
                            }
                            this.messageListeners.delete('address');
                        }
                        // Old format: explicit denial
                        else if (event.data.addressRequestApproved === false) {
                            addressListener({
                                success: false,
                                address: undefined,
                                reason: 'User denied the address request',
                            });
                            this.messageListeners.delete('address');
                        }
                    }

                    // Handle transaction response
                    const transactionListener =
                        this.messageListeners.get('transaction');
                    if (transactionListener && event.data.txResponse) {
                        transactionListener({
                            success: event.data.txResponse.approved,
                            txid: event.data.txResponse.txid,
                            reason: event.data.txResponse.reason,
                        });
                        this.messageListeners.delete('transaction');
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
                this.messageListeners.delete('transaction');
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

    // When a web page creates a transaction, a response is expected
    private sendTransactionMessage(
        message: CashtabMessage,
    ): Promise<TransactionResponse> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.messageListeners.delete('transaction');
                reject(new CashtabTimeoutError());
            }, this.timeout);

            this.messageListeners.set('transaction', response => {
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
     * @returns Promise that resolves with transaction response
     */
    async createTransactionFromBip21(
        bip21Uri: string,
    ): Promise<TransactionResponse> {
        const request: CashtabMessage = {
            text: 'Cashtab',
            type: 'FROM_PAGE',
            txInfo: { bip21: bip21Uri },
        };

        const response = await this.sendTransactionMessage(request);

        if (!response.success) {
            throw new CashtabTransactionDeniedError(response.reason);
        }

        return response;
    }

    /**
     * Send XEC to an address using Cashtab (dev-friendly)
     * @param address - eCash address
     * @param amount - Amount in XEC (string or number)
     * @returns Promise that resolves with transaction response
     */
    async sendXec(
        address: string,
        amount: string | number,
    ): Promise<TransactionResponse> {
        const bip21 = `${address}?amount=${amount}`;
        return this.sendBip21(bip21);
    }

    /**
     * Send a token using Cashtab (dev-friendly)
     * @param address - eCash address
     * @param tokenId - Token ID
     * @param tokenDecimalizedQty - Decimalized token quantity (string or number)
     * @returns Promise that resolves with transaction response
     */
    async sendToken(
        address: string,
        tokenId: string,
        tokenDecimalizedQty: string | number,
    ): Promise<TransactionResponse> {
        const bip21 = `${address}?token_id=${tokenId}&token_decimalized_qty=${tokenDecimalizedQty}`;
        return this.sendBip21(bip21);
    }

    /**
     * Send a raw BIP21 string using Cashtab
     * @param bip21 - BIP21 URI string
     * @returns Promise that resolves with transaction response
     */
    async sendBip21(bip21: string): Promise<TransactionResponse> {
        const request: CashtabMessage = {
            text: 'Cashtab',
            type: 'FROM_PAGE',
            txInfo: { bip21 },
        };

        const response = await this.sendTransactionMessage(request);

        if (!response.success) {
            throw new CashtabTransactionDeniedError(response.reason);
        }

        return response;
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
