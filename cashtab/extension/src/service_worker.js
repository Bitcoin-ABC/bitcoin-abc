// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const extension = require('extensionizer');

const NOTIFICATION_HEIGHT = 750;
const NOTIFICATION_WIDTH = 450;
const EXTENSION_DEV_ID = 'aleabaopoakgpbijdnicepefdiglggfl';
const EXTENSION_PROD_ID = 'obldfcmebhllhjlhjbnghaipekcppeag';

extension.runtime.onMessage.addListener(function (request) {
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
});

// Fetch item from extension storage and return it as a variable
const getObjectFromExtensionStorage = async function (key) {
    return new Promise((resolve, reject) => {
        try {
            extension.storage.sync.get(key, function (value) {
                resolve(value[key]);
            });
        } catch (err) {
            reject(err);
        }
    });
};
// Get the current active tab
const getCurrentActiveTab = async function () {
    return new Promise((resolve, reject) => {
        try {
            extension.tabs.query(
                { active: true, currentWindow: true },
                function (tabs) {
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
async function fetchAddress(tabId) {
    const fetchedAddress = await getObjectFromExtensionStorage(['address']);
    // Send this info back to the browser
    extension.tabs.sendMessage(Number(tabId), { address: fetchedAddress });
}

async function handleDeniedAddressRequest(tabId) {
    extension.tabs.sendMessage(Number(tabId), {
        address: 'Address request denied by user',
    });
}

// Open Cashtab extension with a request for address sharing
async function openAddressShareApproval(request, tab) {
    let left = 0;
    let top = 0;
    try {
        const lastFocused = await getLastFocusedWindow();
        // Position window in top right corner of lastFocused window.
        top = lastFocused.top;
        left = lastFocused.left + (lastFocused.width - NOTIFICATION_WIDTH);
    } catch (_) {
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
async function openSendXec(txInfo) {
    let left = 0;
    let top = 0;
    try {
        const lastFocused = await getLastFocusedWindow();
        // Position window in top right corner of lastFocused window.
        top = lastFocused.top;
        left = lastFocused.left + (lastFocused.width - NOTIFICATION_WIDTH);
    } catch (_) {
        // The following properties are more than likely 0, due to being
        // opened from the background chrome process for the extension that
        // has no physical dimensions
        const { screenX, screenY, outerWidth } = window;
        top = Math.max(screenY, 0);
        left = Math.max(screenX + (outerWidth - NOTIFICATION_WIDTH), 0);
    }

    const queryString = Object.keys(txInfo)
        .map(key => key + '=' + txInfo[key])
        .join('&');

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

function isCashtabWindow(window) {
    return (
        window &&
        window.tabs &&
        window.tabs.length === 1 &&
        window.height === NOTIFICATION_HEIGHT &&
        window.width === NOTIFICATION_WIDTH &&
        (window.tabs[0].url.includes(EXTENSION_DEV_ID) ||
            window.tabs[0].url.includes(EXTENSION_PROD_ID))
    );
}

async function openWindow(options) {
    // Close existing windows before opening a new window
    const windows = await extension.windows.getAll({ populate: true });
    for (let window of windows) {
        if (isCashtabWindow(window)) {
            await extension.windows.remove(window.id);
        }
    }

    return new Promise((resolve, reject) => {
        extension.windows.create(options, newWindow => {
            const error = checkForError();
            if (error) {
                return reject(error);
            }
            return resolve(newWindow);
        });
    });
}

function checkForError() {
    const { lastError } = extension.runtime;
    if (!lastError) {
        return undefined;
    }
    // if it quacks like an Error, its an Error
    if (lastError.stack && lastError.message) {
        return lastError;
    }
    // repair incomplete error object (eg chromium v77)
    return new Error(lastError.message);
}

async function getLastFocusedWindow() {
    return new Promise((resolve, reject) => {
        extension.windows.getLastFocused(windowObject => {
            const error = checkForError();
            if (error) {
                return reject(error);
            }
            return resolve(windowObject);
        });
    });
}
