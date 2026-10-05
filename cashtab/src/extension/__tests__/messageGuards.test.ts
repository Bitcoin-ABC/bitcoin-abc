// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { readFileSync } from 'fs';
import path from 'path';
import {
    DOCUMENT_ID_RE,
    frameDeliveryFromApproval,
    getRelayedPageMessage,
    isExtensionPageSender,
    isPrivilegedExtensionMessage,
    isTrustedPageMessageEvent,
    lastQueryParam,
    pageFrameFromSender,
    stripExtensionRoutingParams,
} from 'extension/messageGuards';

const EXTENSION_ID = 'obldfcmebhllhjlhjbnghaipekcppeag';
const EXTENSION_ORIGIN = `chrome-extension://${EXTENSION_ID}`;

describe('isExtensionPageSender', () => {
    it('accepts the Cashtab popup origin', () => {
        expect(
            isExtensionPageSender(
                {
                    id: EXTENSION_ID,
                    origin: EXTENSION_ORIGIN,
                    url: `${EXTENSION_ORIGIN}/index.html#/wallet`,
                },
                EXTENSION_ID,
            ),
        ).toBe(true);
    });

    it('accepts an extension page URL when origin is missing', () => {
        expect(
            isExtensionPageSender(
                {
                    id: EXTENSION_ID,
                    url: `${EXTENSION_ORIGIN}/index.html#/send`,
                },
                EXTENSION_ID,
            ),
        ).toBe(true);
    });

    it('rejects a content script on an attacker page', () => {
        expect(
            isExtensionPageSender(
                {
                    id: EXTENSION_ID,
                    origin: 'https://evil.example',
                    url: 'https://evil.example/pay',
                },
                EXTENSION_ID,
            ),
        ).toBe(false);
    });

    it('rejects a sender from another extension', () => {
        expect(
            isExtensionPageSender(
                {
                    id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                    origin: 'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                    url: 'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/popup.html',
                },
                EXTENSION_ID,
            ),
        ).toBe(false);
    });

    it('rejects an empty extension id', () => {
        expect(
            isExtensionPageSender(
                { id: EXTENSION_ID, origin: EXTENSION_ORIGIN },
                '',
            ),
        ).toBe(false);
    });
});

describe('isPrivilegedExtensionMessage', () => {
    it('flags address approvals and tx responses', () => {
        expect(
            isPrivilegedExtensionMessage({
                text: 'Cashtab',
                addressRequestApproved: true,
            }),
        ).toBe(true);
        expect(
            isPrivilegedExtensionMessage({
                text: 'Cashtab',
                addressRequestApproved: false,
            }),
        ).toBe(true);
        expect(
            isPrivilegedExtensionMessage({
                text: 'Cashtab',
                txResponse: { approved: true, txid: 'abc' },
            }),
        ).toBe(true);
    });

    it('does not flag page-initiated requests', () => {
        expect(
            isPrivilegedExtensionMessage({
                text: 'Cashtab',
                addressRequest: true,
            }),
        ).toBe(false);
        expect(
            isPrivilegedExtensionMessage({
                text: 'Cashtab',
                txInfo: { bip21: 'ecash:qptest' },
            }),
        ).toBe(false);
    });
});

describe('getRelayedPageMessage', () => {
    it('allowlists address and tx requests', () => {
        expect(
            getRelayedPageMessage({
                type: 'FROM_PAGE',
                text: 'Cashtab',
                addressRequest: true,
            }),
        ).toEqual({ text: 'Cashtab', addressRequest: true });
        expect(
            getRelayedPageMessage({
                type: 'FROM_PAGE',
                text: 'Cashtab',
                txInfo: { bip21: 'ecash:qptest?amount=1' },
            }),
        ).toEqual({
            text: 'Cashtab',
            txInfo: { bip21: 'ecash:qptest?amount=1' },
        });
    });

    it('drops forged approvals and tx responses from the page', () => {
        expect(
            getRelayedPageMessage({
                type: 'FROM_PAGE',
                text: 'Cashtab',
                addressRequestApproved: true,
                addressRequest: true,
            }),
        ).toBeNull();
        expect(
            getRelayedPageMessage({
                type: 'FROM_PAGE',
                text: 'Cashtab',
                txResponse: { approved: true, txid: 'forged' },
                txInfo: { bip21: 'ecash:qptest' },
            }),
        ).toBeNull();
    });

    it('ignores unrelated postMessages', () => {
        expect(
            getRelayedPageMessage({ type: 'FROM_PAGE', text: 'other' }),
        ).toBeNull();
        expect(
            getRelayedPageMessage({ type: 'FROM_CASHTAB', text: 'Cashtab' }),
        ).toBeNull();
    });
});

describe('isTrustedPageMessageEvent', () => {
    const page = { origin: 'https://pay.example' };

    it('accepts same-window same-origin messages', () => {
        expect(
            isTrustedPageMessageEvent(
                { source: page, origin: page.origin },
                page,
                page.origin,
            ),
        ).toBe(true);
    });

    it('rejects a different window or origin', () => {
        expect(
            isTrustedPageMessageEvent(
                { source: {}, origin: page.origin },
                page,
                page.origin,
            ),
        ).toBe(false);
        expect(
            isTrustedPageMessageEvent(
                { source: page, origin: 'https://evil.example' },
                page,
                page.origin,
            ),
        ).toBe(false);
    });
});

describe('pageFrameFromSender', () => {
    it('identifies an iframe by its own url and frameId', () => {
        expect(
            pageFrameFromSender({
                tab: { id: 4 },
                frameId: 12,
                url: 'https://evil.example/frame.html',
                origin: 'https://evil.example',
                documentId: 'ABCDEF0123456789',
            }),
        ).toEqual({
            tabId: 4,
            frameId: 12,
            url: 'https://evil.example/frame.html',
            documentId: 'ABCDEF0123456789',
        });
    });

    it('identifies the top frame when frameId is 0', () => {
        expect(
            pageFrameFromSender({
                tab: { id: 4 },
                frameId: 0,
                url: 'https://pay.example/checkout',
                origin: 'https://pay.example',
            }),
        ).toEqual({
            tabId: 4,
            frameId: 0,
            url: 'https://pay.example/checkout',
        });
    });

    it('rejects a sender with no tab or frame', () => {
        expect(
            pageFrameFromSender({
                frameId: 0,
                url: 'https://pay.example/',
                origin: 'https://pay.example',
            }),
        ).toBeNull();
        expect(
            pageFrameFromSender({
                tab: { id: 4 },
                url: 'https://pay.example/',
                origin: 'https://pay.example',
            }),
        ).toBeNull();
    });

    it('rejects an origin that does not match the frame url', () => {
        expect(
            pageFrameFromSender({
                tab: { id: 4 },
                frameId: 2,
                url: 'https://evil.example/ad.html',
                origin: 'https://pay.example',
            }),
        ).toBeNull();
        expect(
            pageFrameFromSender({
                tab: { id: 4 },
                frameId: 2,
                url: 'https://evil.example/ad.html',
                origin: 'null',
            }),
        ).toBeNull();
    });

    it('rejects non-page urls and a bad document id', () => {
        expect(
            pageFrameFromSender({
                tab: { id: 4 },
                frameId: 0,
                url: 'chrome-extension://obldfcmebhllhjlhjbnghaipekcppeag/index.html',
                origin: 'chrome-extension://obldfcmebhllhjlhjbnghaipekcppeag',
            }),
        ).toBeNull();
        expect(
            pageFrameFromSender({
                tab: { id: 4 },
                frameId: 1,
                url: 'about:srcdoc',
                origin: 'https://pay.example',
            }),
        ).toBeNull();
        expect(
            pageFrameFromSender({
                tab: { id: 4 },
                frameId: 0,
                url: 'https://pay.example/',
                origin: 'https://pay.example',
                documentId: 'not a document id',
            }),
        ).toBeNull();
    });
});

describe('frameDeliveryFromApproval', () => {
    it('keeps a top-frame target and an iframe target', () => {
        expect(frameDeliveryFromApproval({ tabId: 4, frameId: 0 })).toEqual({
            tabId: 4,
            frameId: 0,
        });
        expect(
            frameDeliveryFromApproval({
                tabId: 4,
                frameId: 12,
                documentId: 'ABCDEF0123456789',
            }),
        ).toEqual({
            tabId: 4,
            frameId: 12,
            documentId: 'ABCDEF0123456789',
        });
    });

    it('rejects a missing frame so the reply cannot be broadcast', () => {
        expect(frameDeliveryFromApproval({ tabId: 4 })).toBeNull();
        expect(
            frameDeliveryFromApproval({ tabId: 4, frameId: 1.5 }),
        ).toBeNull();
        expect(
            frameDeliveryFromApproval({
                tabId: 4,
                frameId: 1,
                documentId: '../other',
            }),
        ).toBeNull();
    });
});

const ADDR = 'ecash:qr4vamgywn8ll05kqqjuslfl7k4dw9q4qut8funqv9';

describe('stripExtensionRoutingParams', () => {
    it('leaves a payment documentId that starts with ?', () => {
        const payment = `${ADDR}?documentId=1234&amount=1`;
        const popupQuery = `${payment}&tabId=4&frameId=0&documentId=`;

        expect(stripExtensionRoutingParams(payment)).toBe(payment);
        expect(stripExtensionRoutingParams(popupQuery)).toBe(payment);
        // Stripping the ? form would glue amount on with & and break it.
        expect(payment.replace(/\?documentId=[A-Za-z0-9_-]*/g, '')).toBe(
            `${ADDR}&amount=1`,
        );
    });

    it('removes routing keys appended after a bare address', () => {
        expect(
            stripExtensionRoutingParams(
                `${ADDR}&tabId=4&frameId=0&documentId=`,
            ),
        ).toBe(ADDR);
    });

    it('uses the appended documentId, not one inside the payment link', () => {
        const query = `bip21=${ADDR}?documentId=1234&tabId=4&frameId=0&documentId=`;
        expect(lastQueryParam(query, 'documentId')).toBe('');
        expect(DOCUMENT_ID_RE.test('')).toBe(false);
        expect(lastQueryParam(query, 'tabId')).toBe('4');
        expect(lastQueryParam(query, 'frameId')).toBe('0');
    });
});

describe('extension sources enforce the same policy', () => {
    const serviceWorker = readFileSync(
        path.join(process.cwd(), 'extension/src/service_worker.ts'),
        'utf8',
    );
    const contentScript = readFileSync(
        path.join(process.cwd(), 'extension/src/contentscript.ts'),
        'utf8',
    );

    it('service worker replies only to the requesting frame', () => {
        expect(serviceWorker).not.toContain('getCurrentActiveTab');
        expect(serviceWorker).not.toMatch(/active:\s*true/);
        expect(serviceWorker).toContain('pageFrameFromSender(sender)');
        expect(serviceWorker).toContain('frameId: target.frameId');
        const sendCalls =
            serviceWorker.match(/chrome\.tabs\.sendMessage\(/g) || [];
        expect(sendCalls).toHaveLength(1);
    });

    it('service worker validates sender for privileged messages', () => {
        expect(serviceWorker).toMatch(
            /onMessage\.addListener\(function \(\s*request: ChromeMessage,\s*sender/,
        );
        expect(serviceWorker).toContain('isExtensionPageSender(sender');
        expect(serviceWorker).toContain('chrome-extension://');
    });

    it('content script relays only sanitized page requests', () => {
        expect(contentScript).toContain('getRelayedPageMessage');
        expect(contentScript).toContain(
            'event.origin !== window.location.origin',
        );
        expect(contentScript).not.toMatch(
            /chrome\.runtime\.sendMessage\(\s*data\s*\)/,
        );
        expect(contentScript).not.toMatch(
            /if \(typeof message\.addressRequestApproved/,
        );
    });
});
