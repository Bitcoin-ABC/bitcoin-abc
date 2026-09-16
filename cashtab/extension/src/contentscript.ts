// Copyright (c) 2024-2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

interface CashtabMessage {
    text?: string;
    type?: string;
    address?: string;
    addressRequest?: boolean;
    addressRequestApproved?: boolean;
    txInfo?: Record<string, string>;
    txResponse?: unknown;
}

interface ChromeMessage {
    text?: string;
    txInfo?: Record<string, string>;
    txResponse?: {
        approved: boolean;
        txid?: string;
        reason?: string;
    };
    addressRequest?: boolean;
    addressRequestApproved?: boolean;
    address?: string;
    tabId?: number;
    success?: boolean;
    reason?: string;
}

type RelayedPageMessage =
    | { text: 'Cashtab'; addressRequest: true }
    | { text: 'Cashtab'; txInfo: Record<string, string> };

/**
 * Sanitize a same-window FROM_PAGE postMessage into an allowlisted request.
 * Privileged approval/tx-response fields are never forwarded.
 * Keep in sync with src/extension/messageGuards.ts.
 */
const isPrivilegedExtensionMessage = (message: CashtabMessage): boolean => {
    if (message.text !== 'Cashtab') {
        return false;
    }
    if (
        Object.prototype.hasOwnProperty.call(message, 'addressRequestApproved')
    ) {
        return true;
    }
    return message.txResponse !== undefined;
};

const getRelayedPageMessage = (
    data: CashtabMessage,
): RelayedPageMessage | null => {
    if (data.type !== 'FROM_PAGE' || data.text !== 'Cashtab') {
        return null;
    }
    if (isPrivilegedExtensionMessage(data)) {
        return null;
    }
    if (data.addressRequest === true) {
        return { text: 'Cashtab', addressRequest: true };
    }
    if (
        data.txInfo !== undefined &&
        data.txInfo !== null &&
        typeof data.txInfo === 'object' &&
        !Array.isArray(data.txInfo)
    ) {
        return { text: 'Cashtab', txInfo: data.txInfo };
    }
    return null;
};

// Insert flag into window object to denote Cashtab is available and active as a browser extension
// Could use a div or other approach for now, but emulate MetaMask this way so it is extensible to other items
// Try window object approach
const cashTabInject = document.createElement('script') as HTMLScriptElement;
cashTabInject.src = chrome.runtime.getURL('script.js');
cashTabInject.onload = function () {
    document.head?.removeChild(cashTabInject);
};
(document.head || document.documentElement).appendChild(cashTabInject);

// Listen for messages from the webpage
// Supported types
// 1 - A web page requests a Cashtab user's address
// 2 - A web page requests opening a Cashtab window with a prepopulated transaction
// Privileged approval/tx-response messages are not relayed; only the popup
// may send those to the service worker.
window.addEventListener(
    'message',
    async function (event: MessageEvent) {
        if (event.source !== window) {
            return;
        }
        if (event.origin !== window.location.origin) {
            return;
        }

        const data = event.data as CashtabMessage;
        if (data === null || typeof data !== 'object') {
            return;
        }

        if (typeof data.text !== 'undefined') {
            console.log('Message received:', data.text);
            console.log(`Content script received an event`, event);
        }

        const relayed = getRelayedPageMessage(data);
        if (relayed !== null) {
            try {
                await chrome.runtime.sendMessage(relayed);
            } catch (err) {
                console.log('Failed to relay Cashtab page request', err);
            }
        }
    },
    false,
);

// Listen for msgs from the extension
// Supported types
// 1 - The extension service_worker sending the address to the web page if approved
// 2 - The extension service_worker sending transaction responses to the web page
chrome.runtime.onMessage.addListener((message: ChromeMessage) => {
    // Parse message for address request response
    if (typeof message.success !== 'undefined') {
        // Send structured response that webpage can listen for
        return window.postMessage(
            {
                type: 'FROM_CASHTAB',
                success: message.success,
                address: message.address,
                reason: message.reason,
            },
            '*',
        );
    }

    // Parse message for transaction response
    if (message.txResponse) {
        // Send structured response that webpage can listen for
        return window.postMessage(
            {
                type: 'FROM_CASHTAB',
                txResponse: message.txResponse,
            },
            '*',
        );
    }
    return true;
});
