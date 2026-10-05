// Copyright (c) 2024-2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * We minimally redefine the stored CashtabWallet type here because
 * importing it from Cashtab src causes build issues with the extension
 *
 * Not ideal to define it in two places, but ultimately we will be migrating
 * Cashtab to ecash-wallet, and then it will be defined in a lib, which
 * will make much more sense
 */

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
    address?: string;
    tabId?: number;
    frameId?: number;
    documentId?: string;
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

/**
 * True when `sender` is a Cashtab extension page (popup), not a content
 * script on a web page. Keep in sync with src/extension/messageGuards.ts.
 */
const isExtensionPageSender = (
    sender: chrome.runtime.MessageSender,
    extensionId: string,
): boolean => {
    if (!extensionId || sender.id !== extensionId) {
        return false;
    }
    const extensionOrigin = `chrome-extension://${extensionId}`;
    if (sender.origin === extensionOrigin) {
        return true;
    }
    return Boolean(sender.url?.startsWith(`${extensionOrigin}/`));
};

/** Chrome documentId, safe to round-trip in an extension popup query. */
const DOCUMENT_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

interface PageMessageSender {
    tab?: { id?: number };
    frameId?: number;
    url?: string;
    origin?: string;
    documentId?: string;
}

interface PageFrameTarget {
    tabId: number;
    frameId: number;
    /** URL of the frame that sent the request. */
    url: string;
    documentId?: string;
}

/**
 * Frame that sent a dApp request.
 *
 * The active tab URL is the top-level page. An iframe content script must be
 * identified by `sender.url` (and answered at `sender.frameId`) so it cannot
 * inherit the host site's name or receive another frame's reply.
 * Keep in sync with src/extension/messageGuards.ts.
 */
const pageFrameFromSender = (
    sender: PageMessageSender,
): PageFrameTarget | null => {
    const tabId = sender.tab?.id;
    const frameId = sender.frameId;
    const url = sender.url;
    if (typeof tabId !== 'number' || !Number.isInteger(tabId) || tabId < 0) {
        return null;
    }
    if (
        typeof frameId !== 'number' ||
        !Number.isInteger(frameId) ||
        frameId < 0
    ) {
        return null;
    }
    if (typeof url !== 'string' || url.length === 0) {
        return null;
    }
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return null;
    }
    if (
        parsed.protocol !== 'https:' &&
        parsed.protocol !== 'http:' &&
        parsed.protocol !== 'file:'
    ) {
        return null;
    }
    // Require the frame origin to match its URL so a sandboxed or inherited
    // origin is not labeled as the embedded document's site.
    if (
        parsed.protocol !== 'file:' &&
        (typeof sender.origin !== 'string' || sender.origin !== parsed.origin)
    ) {
        return null;
    }
    const documentId = sender.documentId;
    if (documentId !== undefined && !DOCUMENT_ID_RE.test(documentId)) {
        return null;
    }
    if (documentId === undefined) {
        return { tabId, frameId, url };
    }
    return { tabId, frameId, url, documentId };
};

interface FrameDelivery {
    tabId: number;
    frameId: number;
    documentId?: string;
}

interface FrameDeliveryMessage {
    tabId?: number;
    frameId?: number;
    documentId?: string;
}

/**
 * Tab and frame echoed by the extension popup.
 * A missing frameId must not fall back to a tab-wide broadcast.
 * Keep in sync with src/extension/messageGuards.ts.
 */
const frameDeliveryFromApproval = (
    message: FrameDeliveryMessage,
): FrameDelivery | null => {
    const tabId = message.tabId;
    const frameId = message.frameId;
    const documentId = message.documentId;
    if (typeof tabId !== 'number' || !Number.isInteger(tabId) || tabId < 0) {
        return null;
    }
    if (
        typeof frameId !== 'number' ||
        !Number.isInteger(frameId) ||
        frameId < 0
    ) {
        return null;
    }
    if (documentId === undefined) {
        return { tabId, frameId };
    }
    if (!DOCUMENT_ID_RE.test(documentId)) {
        return null;
    }
    return { tabId, frameId, documentId };
};

const deliverToFrame = (
    target: FrameDelivery,
    message: Record<string, unknown>,
): void => {
    const options: chrome.tabs.MessageSendOptions = {
        frameId: target.frameId,
    };
    if (target.documentId !== undefined) {
        options.documentId = target.documentId;
    }
    chrome.tabs.sendMessage(target.tabId, message, options).catch(err => {
        console.log('Failed to deliver extension response to frame', err);
    });
};

chrome.runtime.onMessage.addListener(function (
    request: ChromeMessage,
    sender: chrome.runtime.MessageSender,
) {
    // Handle a transaction creation request
    if (request.text == `Cashtab` && request.txInfo) {
        console.log(
            `Received a transaction request, opening Cashtab extension`,
        );
        const page = pageFrameFromSender(sender);
        if (!page) {
            console.warn('Ignoring transaction request with no page frame');
            return;
        }
        openSendXec(request.txInfo, page).catch(err => {
            console.log('Error opening send for extension tx request', err);
        });
    }
    // Handle an address sharing request
    if (request.text === `Cashtab` && request.addressRequest) {
        // Note that chrome extension does not support making this listener async
        const page = pageFrameFromSender(sender);
        if (!page) {
            console.warn('Ignoring address request with no page frame');
            return;
        }
        openAddressShareApproval('addressRequest', page).catch(err => {
            console.log('Error opening address share approval', err);
        });
    }
    // Handle user approval / rejection of an ecash address sharing request
    if (
        request.text === `Cashtab` &&
        Object.keys(request).includes('addressRequestApproved')
    ) {
        // Pages can forge this payload via the content script. Only the
        // extension popup may resolve a pending address request.
        if (!isExtensionPageSender(sender, chrome.runtime.id)) {
            console.warn(
                'Ignoring addressRequestApproved from non-extension sender',
            );
            return;
        }
        const target = frameDeliveryFromApproval(request);
        if (!target) {
            console.warn('Ignoring address approval with no requesting frame');
            return;
        }
        // If approved, then share the address with the requesting frame only
        if (request.addressRequestApproved) {
            deliverToFrame(target, {
                success: true,
                address: request.address,
            });
        } else {
            // If denied, let the requesting frame know that the user denied this request
            deliverToFrame(target, {
                success: false,
                reason: 'User denied the request',
            });
        }
    }

    // Handle transaction response from Cashtab
    if (request.text === `Cashtab` && request.txResponse) {
        if (!isExtensionPageSender(sender, chrome.runtime.id)) {
            console.warn('Ignoring txResponse from non-extension sender');
            return;
        }
        const target = frameDeliveryFromApproval(request);
        if (!target) {
            console.warn('Ignoring txResponse with no requesting frame');
            return;
        }
        deliverToFrame(target, {
            type: 'FROM_CASHTAB',
            text: 'Cashtab',
            txResponse: request.txResponse,
        });
    }
});

// Open Cashtab extension with a request for address sharing
async function openAddressShareApproval(
    request: string,
    page: PageFrameTarget,
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

    const params = new URLSearchParams({
        request,
        tabId: String(page.tabId),
        frameId: String(page.frameId),
        tabUrl: page.url,
    });
    if (page.documentId !== undefined) {
        params.set('documentId', page.documentId);
    }
    const queryString = params.toString();

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
async function openSendXec(
    txInfo: Record<string, string>,
    page: PageFrameTarget,
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
        const { screenX, screenY, outerWidth } = globalThis;
        top = Math.max(screenY, 0);
        left = Math.max(screenX + (outerWidth - NOTIFICATION_WIDTH), 0);
    }

    // Always append documentId. A BIP21 value can already contain
    // &documentId=, and SendXec keeps the last occurrence. Omitting the key
    // when this frame has none would let that injected id win, and the reply
    // would target a document that never asked.
    const queryString =
        Object.keys(txInfo)
            .map(key => key + '=' + txInfo[key])
            .join('&') +
        `&tabId=${page.tabId}&frameId=${page.frameId}&documentId=${encodeURIComponent(page.documentId ?? '')}`;

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
