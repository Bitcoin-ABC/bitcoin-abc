// Copyright (c) 2024-2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

interface ChromeWindow {
    id?: number;
    tabs?: chrome.tabs.Tab[];
    height?: number;
    width?: number;
    top?: number;
    left?: number;
}

interface WindowOptions {
    url: string;
    type: 'popup';
    width: number;
    height: number;
    left: number;
    top: number;
}

interface ChromeMessage {
    text?: string;
    txInfo?: Record<string, string>;
    addressRequest?: boolean;
    addressRequestApproved?: boolean;
    tabId?: number;
    txResponse?: {
        approved: boolean;
        txid?: string;
        reason?: string;
    };
}

const NOTIFICATION_HEIGHT = 950;
const NOTIFICATION_WIDTH = 450;
const EXTENSION_DEV_ID = 'aleabaopoakgpbijdnicepefdiglggfl';
const EXTENSION_PROD_ID = 'obldfcmebhllhjlhjbnghaipekcppeag';

chrome.runtime.onMessage.addListener(function (request: ChromeMessage) {
    // Handle a transaction creation request
    if (request.text == `Cashtab` && request.txInfo) {
        console.log(
            `Received a transaction request, opening Cashtab extension`,
        );
        openSendXec(request.txInfo);
    }
    // Handle an address sharing request
    if (request.text === `Cashtab` && request.addressRequest) {
        // get the tab this message came from
        // Note that chrome extension does not support making this listener async
        // so need to use this Promise.then() syntax
        getCurrentActiveTab().then(
            requestingTab => {
                openAddressShareApproval('addressRequest', requestingTab);
            },
            err => {
                console.log(
                    'Error in getCurrentActiveTab() triggered by ecash address request',
                    err,
                );
            },
        );
    }
    // Handle user approval / rejection of an ecash address sharing request
    if (
        request.text === `Cashtab` &&
        Object.keys(request).includes('addressRequestApproved')
    ) {
        // If approved, then share the address
        if (request.addressRequestApproved) {
            fetchAddress(request.tabId);
        } else {
            // If denied, let the webpage know that the user denied this request
            handleDeniedAddressRequest(request.tabId);
        }
    }

    // Handle transaction response from Cashtab
    if (request.text === `Cashtab` && request.txResponse) {
        handleTransactionResponse(request.tabId, request.txResponse);
    }
});

// Fetch item from extension storage and return it as a variable
const getObjectFromExtensionStorage = async function (
    key: string,
): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.get(
                key,
                function (value: { [key: string]: any }) {
                    resolve(value[key]);
                },
            );
        } catch (err) {
            reject(err);
        }
    });
};

// Get the current active tab
const getCurrentActiveTab = async function (): Promise<chrome.tabs.Tab> {
    return new Promise((resolve, reject) => {
        try {
            chrome.tabs.query(
                { active: true, currentWindow: true },
                function (tabs: chrome.tabs.Tab[]) {
                    resolve(tabs[0]);
                },
            );
        } catch (err) {
            console.log(`Error in getCurrentActiveTab()`, err);
            reject(err);
        }
    });
};

// Fetch the active extension address from extension storage API
async function fetchAddress(tabId?: number): Promise<void> {
    if (!tabId) return;
    const fetchedAddress = await getObjectFromExtensionStorage('address');
    // Send this info back to the browser
    chrome.tabs.sendMessage(Number(tabId), {
        address: fetchedAddress,
        success: true,
    });
}

async function handleDeniedAddressRequest(tabId?: number): Promise<void> {
    if (!tabId) return;
    chrome.tabs.sendMessage(Number(tabId), {
        success: false,
        reason: 'User denied the request',
    });
}

async function handleTransactionResponse(
    tabId?: number,
    txResponse?: {
        approved: boolean;
        txid?: string;
        reason?: string;
    },
): Promise<void> {
    if (!tabId || !txResponse) {
        return;
    }
    chrome.tabs.sendMessage(Number(tabId), {
        type: 'FROM_CASHTAB',
        text: 'Cashtab',
        txResponse: txResponse,
    });
}

// Open Cashtab extension with a request for address sharing
async function openAddressShareApproval(
    request: string,
    tab: chrome.tabs.Tab,
): Promise<void> {
    let left = 0;
    let top = 0;
    try {
        const lastFocused = await getLastFocusedWindow();
        // Position window in top right corner of lastFocused window.
        top = lastFocused.top || 0;
        left = Math.max(
            (lastFocused.left || 0) +
                ((lastFocused.width || 0) - NOTIFICATION_WIDTH),
            0,
        );
    } catch {
        // The following properties are more than likely 0, due to being
        // opened from the background chrome process for the extension that
        // has no physical dimensions
        const { screenX, screenY, outerWidth } = window;
        top = Math.max(screenY, 0);
        left = Math.max(screenX + (outerWidth - NOTIFICATION_WIDTH), 0);
    }

    const queryString = `request=${request}&tabId=${tab.id}&tabUrl=${tab.url}`;

    // create new notification popup
    await openWindow({
        url: `index.html#/wallet?${queryString}`,
        type: 'popup',
        width: NOTIFICATION_WIDTH,
        height: NOTIFICATION_HEIGHT,
        left,
        top,
    });
}

// Open Cashtab extension with transaction information in the query string
async function openSendXec(txInfo: Record<string, string>): Promise<void> {
    let left = 0;
    let top = 0;
    try {
        const lastFocused = await getLastFocusedWindow();
        // Position window in top right corner of lastFocused window.
        top = lastFocused.top || 0;
        left = Math.max(
            (lastFocused.left || 0) +
                ((lastFocused.width || 0) - NOTIFICATION_WIDTH),
            0,
        );
    } catch {
        // The following properties are more than likely 0, due to being
        // opened from the background chrome process for the extension that
        // has no physical dimensions
        const { screenX, screenY, outerWidth } = globalThis;
        top = Math.max(screenY, 0);
        left = Math.max(screenX + (outerWidth - NOTIFICATION_WIDTH), 0);
    }

    // Get the current active tab to pass the tabId
    const currentTab = await getCurrentActiveTab();
    const queryString =
        Object.keys(txInfo)
            .map(key => key + '=' + txInfo[key])
            .join('&') + `&tabId=${currentTab.id}`;

    // create new notification popup
    await openWindow({
        url: `index.html#/send?${queryString}`,
        type: 'popup',
        width: NOTIFICATION_WIDTH,
        height: NOTIFICATION_HEIGHT,
        left,
        top,
    });
}

function isCashtabWindow(window: ChromeWindow): boolean {
    return Boolean(
        window &&
            window.tabs &&
            window.tabs.length === 1 &&
            window.height === NOTIFICATION_HEIGHT &&
            window.width === NOTIFICATION_WIDTH &&
            (window.tabs[0].url?.includes(EXTENSION_DEV_ID) ||
                window.tabs[0].url?.includes(EXTENSION_PROD_ID)),
    );
}

async function openWindow(options: WindowOptions): Promise<ChromeWindow> {
    // Close existing windows before opening a new window
    const windows = await chrome.windows.getAll({ populate: true });
    for (const window of windows) {
        if (isCashtabWindow(window)) {
            await chrome.windows.remove(window.id!);
        }
    }

    return new Promise((resolve, reject) => {
        chrome.windows.create(options, newWindow => {
            const error = checkForError();
            if (error) {
                return reject(error);
            }
            if (!newWindow) {
                return reject(new Error('Failed to create window'));
            }
            return resolve(newWindow);
        });
    });
}

function checkForError(): Error | undefined {
    const { lastError } = chrome.runtime;
    if (!lastError) {
        return undefined;
    }
    // Create a new Error with the lastError message
    return new Error(lastError.message);
}

async function getLastFocusedWindow(): Promise<ChromeWindow> {
    return new Promise((resolve, reject) => {
        chrome.windows.getLastFocused(windowObject => {
            const error = checkForError();
            if (error) {
                return reject(error);
            }
            return resolve(windowObject);
        });
    });
}
