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
        console.log(msg.text);
        if (msg.text == `CashTab` && msg.txInfo) {
            console.log(`Caught, opening popup`);
            triggerUi(msg.txInfo);
        }
    });
});

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
