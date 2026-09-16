// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { readFileSync } from 'fs';
import path from 'path';
import {
    getRelayedPageMessage,
    isExtensionPageSender,
    isPrivilegedExtensionMessage,
    isTrustedPageMessageEvent,
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

describe('extension sources enforce the same policy', () => {
    const serviceWorker = readFileSync(
        path.join(process.cwd(), 'extension/src/service_worker.ts'),
        'utf8',
    );
    const contentScript = readFileSync(
        path.join(process.cwd(), 'extension/src/contentscript.ts'),
        'utf8',
    );

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
