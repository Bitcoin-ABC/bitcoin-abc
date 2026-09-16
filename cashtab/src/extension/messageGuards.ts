// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Message-sender and page-relay guards for the Cashtab extension.
 *
 * The service worker and content script cannot import this module (they are
 * compiled as classic scripts). Keep the copies in
 * `extension/src/service_worker.ts` and `extension/src/contentscript.ts` in
 * sync with these functions.
 */

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
