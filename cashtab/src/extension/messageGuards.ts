// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Message-sender and page-relay guards for the Cashtab extension.
 *
 * The service worker and content script cannot import this module (they are
 * compiled as classic scripts). Keep the copies in
 * `extension/src/service_worker.ts` and `extension/src/contentscript.ts` in
 * sync with these functions. `pageFrameFromSender` and
 * `frameDeliveryFromApproval` are copied into the service worker.
 */

/**
 * Chrome documentId, safe to round-trip in an extension popup query.
 * The service worker keeps its own copy; React screens import this one.
 */
export const DOCUMENT_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export interface ExtensionMessageSender {
    id?: string;
    origin?: string;
    url?: string;
}

export interface CashtabPageMessage {
    text?: string;
    type?: string;
    addressRequest?: boolean;
    addressRequestApproved?: boolean;
    txInfo?: Record<string, string>;
    txResponse?: unknown;
}

export type RelayedPageMessage =
    | { text: 'Cashtab'; addressRequest: true }
    | { text: 'Cashtab'; txInfo: Record<string, string> };

/**
 * True when `sender` is a Cashtab extension page (popup), not a content
 * script running on a web page.
 *
 * Content scripts share `sender.id` with the extension, so origin/url must
 * be the `chrome-extension://` page origin.
 */
export const isExtensionPageSender = (
    sender: ExtensionMessageSender,
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

/**
 * True for messages that approve/deny address sharing or return a tx result.
 * These must only be accepted from extension pages.
 */
export const isPrivilegedExtensionMessage = (
    message: CashtabPageMessage,
): boolean => {
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

/**
 * Sanitize a same-window FROM_PAGE postMessage into an allowlisted request.
 * Privileged fields are never forwarded.
 */
export const getRelayedPageMessage = (
    data: CashtabPageMessage,
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

export interface PageMessageSender {
    tab?: { id?: number };
    frameId?: number;
    url?: string;
    origin?: string;
    documentId?: string;
}

export interface PageFrameTarget {
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
 */
export const pageFrameFromSender = (
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

export interface FrameDelivery {
    tabId: number;
    frameId: number;
    documentId?: string;
}

export interface FrameDeliveryMessage {
    tabId?: number;
    frameId?: number;
    documentId?: string;
}

/**
 * Tab and frame echoed by the extension popup.
 * A missing frameId must not fall back to a tab-wide broadcast.
 */
export const frameDeliveryFromApproval = (
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

/**
 * True when a page postMessage is from the same window and origin.
 */
export const isTrustedPageMessageEvent = (
    event: { source: unknown; origin: string },
    expectedSource: unknown,
    pageOrigin: string,
): boolean => {
    return event.source === expectedSource && event.origin === pageOrigin;
};

/**
 * Drop extension routing keys that were appended with `&`.
 *
 * A payment URI can start its own query with `?documentId=`. Leave that
 * alone. Removing the `?` form would also drop a later `&amount=`.
 */
export const stripExtensionRoutingParams = (bip21Uri: string): string => {
    return bip21Uri
        .replace(/&tabId=\d+/g, '')
        .replace(/&frameId=\d+/g, '')
        .replace(/&documentId=[A-Za-z0-9_-]*/g, '');
};

/**
 * Last value of a query key. The service worker appends routing keys after
 * the payment URI, so an earlier copy inside that URI does not win.
 */
export const lastQueryParam = (query: string, key: string): string | null => {
    const values = new URLSearchParams(query).getAll(key);
    if (values.length === 0) {
        return null;
    }
    return values[values.length - 1];
};
