const extension = require('extensionizer');

const NOTIFICATION_HEIGHT = 600;
const NOTIFICATION_WIDTH = 400;

let popupIsOpen = false;
let notificationIsOpen = false;
const openMetamaskTabsIDs = {};
const requestAccountTabIds = {};

// This starts listening to the port created with `extension.runtime.connect` in contentscript.js
extension.runtime.onConnect.addListener(function (port) {
    console.assert(port.name == 'cashtabPort');
    port.onMessage.addListener(function (msg) {
        console.log('msg received in background.js');
        console.log(`here's what we received in background.js`, msg);
        console.log(msg.text);
        if (msg.text == `Cashtab` && msg.txInfo) {
            console.log(`Caught, opening popup`);
            triggerUi(msg.txInfo);
        }
        if (msg.text === `Cashtab` && msg.addressRequest) {
            console.log(`User is requesting extension address`);
            // Can you get the source from this?
            console.log(`msg requesting address looks like this`, msg);
            // get the tab this message came from
            let requestingTab;
            // Note that chrome extension does not support making this listener async, so need to use this syntax
            getCurrentActiveTab().then(
                result => {
                    console.log(
                        `here's what we get from getCurrentActiveTab`,
                        result,
                    );
                    requestingTab = result;
                    console.log(`requestingTab`, requestingTab);
                    triggerApprovalModal('addressRequest', requestingTab);
                },
                err => {
                    console.log('what?', err);
                },
            );
        }
        if (
            msg.text === `Cashtab` &&
            Object.keys(msg).includes('addressRequestApproved')
        ) {
            console.log(`User address approval/reject message`, msg);
            // if good, then share the address
            if (msg.addressRequestApproved) {
                fetchAddress(msg.tabId);
            } else {
                // Let the webpage know that the user denied this request
                handleDeniedAddressRequest(msg.tabId);
            }
        }
    });
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
                    console.log(`get these tabs`, tabs);
                    resolve(tabs[0]);
                },
            );
        } catch (err) {
            console.log(`err`, err);
            reject(err);
        }
    });
};

// Fetch the active extension address from extension storage API
async function fetchAddress(tabId) {
    console.log(`fetchAddress called in background.js`);
    const fetchedAddress = await getObjectFromExtensionStorage(['address']);
    console.log(
        `background.js fetched address from extension storage`,
        fetchedAddress,
    );
    // Send this info back to the browser
    extension.tabs.sendMessage(Number(tabId), { address: fetchedAddress });
}

async function handleDeniedAddressRequest(tabId) {
    console.log(`User denied request, responding with msg, tabUrl is`, tabId);
    // Need to remove `currentWindow: true` here otherwise you get an empty array for tabs
    // This suggests that it's only the async request for the address coming first which allows this to work in fetchAddress()

    extension.tabs.sendMessage(Number(tabId), {
        address: 'Address request denied by user',
    });
}

async function triggerApprovalModal(request, tab) {
    console.log(`triggerApprovalModal called`);
    // Open a pop-up
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
    console.log(`background.js queryString`, queryString);

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

/**
 * Opens the browser popup for user confirmation
 */
/*
Breaking this function down
1) Get all active tabs in browser
2) Determine if the extension UI is currently open
3) If extension is not open AND no other UI triggered popups are open, then open one

Eventually will need similar model. Note that it actually goes much deeper than this in MetaMask.

To start, just open a popup
*/
async function triggerUi(txInfo) {
    /*
  const tabs = await extension.getActiveTabs();
  const currentlyActiveCashtabTab = Boolean(tabs.find(tab => openMetamaskTabsIDs[tab.id]));
  if (!popupIsOpen && !currentlyActiveCashtabTab) {
    await notificationManager.showPopup();
  }
  */
    // Open a pop-up
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

    console.log(`txInfo`);
    console.log(txInfo);

    const queryString = Object.keys(txInfo)
        .map(key => key + '=' + txInfo[key])
        .join('&');

    // create new notification popup
    const popupWindow = await openWindow({
        url: `index.html#/send?${queryString}`,
        type: 'popup',
        width: NOTIFICATION_WIDTH,
        height: NOTIFICATION_HEIGHT,
        left,
        top,
    });
}

async function openWindow(options) {
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
