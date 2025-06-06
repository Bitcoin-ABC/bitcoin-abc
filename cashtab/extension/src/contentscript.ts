// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

interface CashtabMessage {
    text?: string;
    type?: string;
    address?: string;
    addressRequestApproved?: boolean;
}

interface ChromeMessage {
    text?: string;
    txInfo?: Record<string, string>;
    addressRequest?: boolean;
    addressRequestApproved?: boolean;
    address?: string;
    tabId?: number;
}

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
// Note we will pass every intercepted msg to service_worker.js to evaluate
window.addEventListener(
    'message',
    async function (event: MessageEvent) {
        const data = event.data as CashtabMessage;
        if (typeof data.text !== 'undefined') {
            console.log('Message received:', data.text);
            console.log(`Content script received an event`, event);
        }

        // We only accept messages from ourselves
        if (event.source != window) return;

        if (data.type && data.type == 'FROM_PAGE') {
            await chrome.runtime.sendMessage(data);
        }
    },
    false,
);

// Listen for msgs from the extension
// Supported types
// 1 - Extension pop-up window returning an address request approval / denial
// 2 - The extension service_worker sending the address to the web page if approved
chrome.runtime.onMessage.addListener((message: ChromeMessage) => {
    // Parse message for address
    if (typeof message.address !== 'undefined') {
        // Send as message that webpage can listen for
        return window.postMessage(
            {
                type: 'FROM_CASHTAB',
                address: message.address,
            },
            '*',
        );
    }
    if (typeof message.addressRequestApproved !== 'undefined') {
        // We need to get the address from service_worker.js
        return chrome.runtime.sendMessage(message);
    }
    return true;
});
