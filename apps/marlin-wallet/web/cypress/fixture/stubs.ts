// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/// <reference types="cypress" />

import * as proto from '../../../../../modules/chronik-client/proto/chronik';

import {
    applyChronikStubIntercepts,
    CHRONIK_PROTOBUF_HEADERS,
    chronikAsProtobufBody,
    chronikStubPath,
    cypressRequestBodyToUint8Array,
    encodeChronikWsMsgTx,
    lowerCaseTxidFromTxJson,
    randomTxidBase64ForProtobufJson,
    stubChronikGetTxFromFixtureJson,
    type ChronikStub,
    type ChronikStubRunContext,
} from './chronik-json-protobuf';

/**
 * Public surface of the Chronik `/ws` stub attached to
 * {@link WindowWithChronikWebSocketStub.__chronikWebSocketStub}.
 */
export interface ChronikWebSocketStub {
    emitTxWebsocket(
        txWsEventType: proto.TxMsgType,
        txJson: unknown,
        finalizationReasonType?: proto.TxFinalizationReasonType,
    ): void;
}

/**
 * Window augmented by {@link installChronikWebSocketStub} with the last
 * stub Chronik socket (only Chronik `/ws` URLs use the stub).
 */
export type WindowWithChronikWebSocketStub = Window &
    typeof globalThis & {
        __chronikWebSocketStub?: ChronikWebSocketStub;
    };

/**
 * Minimal WebSocket stub for Chronik: `onopen` on a microtask, `send` no-op,
 * delivers protobuf `WsMsg` frames via {@link ChronikWebSocketStub.emitTxWebsocket}
 * (which also registers the matching `GET /tx/…` intercept for a tx fixture).
 */
class ChronikWebSocketStubImpl implements ChronikWebSocketStub {
    /* WebSocket minimal implementation */
    binaryType: BinaryType = 'blob';
    bufferedAmount = 0;
    extensions = '';
    protocol = '';
    readyState: number;
    readonly url: string;

    onclose: ((event: CloseEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onopen: ((event: Event) => void) | null = null;

    constructor(url: string) {
        this.url = url;
        this.readyState = 0;
        queueMicrotask(() => {
            this.readyState = 1;
            if (this.onopen) {
                this.onopen(new Event('open'));
            }
        });
    }

    send(_data: string | ArrayBufferLike | Blob | ArrayBufferView): void {}

    close(_code?: number, _reason?: string): void {
        this.readyState = 3;
    }

    /**
     * Stub `GET …/tx/<id>` for this Chronik `Tx` protobuf-JSON fixture (see
     * {@link stubChronikGetTxFromFixtureJson}), then deliver a `WsMsg` with
     * `tx` payload and the given {@link proto.TxMsgType} on the wire (same
     * encoding as Chronik). Register intercepts after
     * {@link applyChronikStubIntercepts} so the `/tx/` route wins.
     */
    emitTxWebsocket(
        txWsEventType: proto.TxMsgType,
        txJson: unknown,
        finalizationReasonType?: proto.TxFinalizationReasonType,
    ): void {
        stubChronikGetTxFromFixtureJson(txJson);
        const txid = lowerCaseTxidFromTxJson(txJson);
        const u8 = encodeChronikWsMsgTx(
            txid,
            txWsEventType,
            finalizationReasonType,
        );
        if (!this.onmessage) {
            return;
        }
        const blob = new Blob([new Uint8Array(u8)]);
        this.onmessage({ data: blob } as MessageEvent);
    }
}

/**
 * Replace `window.WebSocket` so only Chronik `…/ws` connections use a stub; all
 * other URLs use the native implementation. Call from `cy.visit` `onBeforeLoad`
 * after saving `localStorage` and before the app bundle runs.
 */
export function installChronikWebSocketStub(
    win: WindowWithChronikWebSocketStub,
): void {
    const NativeWebSocket = win.WebSocket;

    const Replacement = function (
        this: unknown,
        url: string | URL,
        protocols?: string | string[],
    ): WebSocket {
        const urlStr = String(url);
        if (!urlStr.includes('/ws')) {
            return new NativeWebSocket(
                url,
                protocols as string | string[] | undefined,
            );
        }
        const stub = new ChronikWebSocketStubImpl(urlStr);
        win.__chronikWebSocketStub = stub;
        return stub as unknown as WebSocket;
    };
    Replacement.prototype = NativeWebSocket.prototype;
    win.WebSocket = Replacement as unknown as typeof WebSocket;
}

/**
 * Stub `POST …/broadcast-txs` with a successful `BroadcastTxsResponse`. Decodes
 * the request and returns one random txid per `rawTx` (same shape ecash-wallet
 * expects from {@link WalletAction.broadcast}).
 *
 * Register before `cy.visit` (e.g. inside `runWithChronik` after GET stubs).
 * Route alias: `chronikBroadcastsSuccess` (use `cy.wait('@chronikBroadcastsSuccess')`).
 *
 * Chronik’s `POST /broadcast-tx` (singular) is not stubbed; only the batched
 * endpoint used by ecash-wallet `broadcastTxs` is matched.
 */
export function stubChronikBroadcastsSuccess(): void {
    cy.intercept({ method: 'POST', url: /\/broadcast-txs(\?|$)/ }, req => {
        let rawTxCount: number;
        try {
            const decoded = proto.BroadcastTxsRequest.decode(
                cypressRequestBodyToUint8Array(req.body),
            );
            rawTxCount = decoded.rawTxs.length;
        } catch {
            req.continue();
            return;
        }
        const txidsJson = Array.from({ length: rawTxCount }, () =>
            randomTxidBase64ForProtobufJson(),
        );
        const out = proto.BroadcastTxsResponse.encode(
            proto.BroadcastTxsResponse.fromJSON({ txids: txidsJson }),
        ).finish();
        req.reply({
            statusCode: 200,
            headers: CHRONIK_PROTOBUF_HEADERS,
            body: chronikAsProtobufBody(out),
        });
    }).as('chronikBroadcastsSuccess');
}

/**
 * Stub `POST …/broadcast-txs` with a Chronik rejection (e.g. offline / mempool
 * reject). Route alias: `chronikBroadcastsFailure`.
 */
export function stubChronikBroadcastsFailure(
    errorMessage = 'Broadcast failed: Transaction rejected by mempool',
): void {
    cy.intercept({ method: 'POST', url: /\/broadcast-txs(\?|$)/ }, req => {
        req.reply({
            statusCode: 400,
            headers: { 'content-type': 'text/plain' },
            body: errorMessage,
        });
    }).as('chronikBroadcastsFailure');
}

/**
 * Load a Chronik stub JSON, intercept matching `history` and `/tx/*`, and run `body`.
 * `cy.readFile` parses `.json` into an object (Cypress default); see
 * `chronik-json-protobuf.ts`.
 */
export function runWithChronik(
    fileNameOrPath: string,
    body: (ctx: ChronikStubRunContext) => void,
): void {
    const path = chronikStubPath(fileNameOrPath);
    cy.readFile(path).then(data => {
        const stub = data as ChronikStub;
        applyChronikStubIntercepts(stub);
        body({ stub });
    });
}

/**
 * CoinGecko response shape for ecash-price CoinGeckoProvider (see
 * modules/ecash-price). Intercepting avoids flaky secondary balance when the
 * API is down or rate-limited. Replies include whichever vs_currencies the app
 * requested (usd and/or eur).
 */
export function stubCoingeckoXecFiatPrices(): void {
    cy.intercept(
        { method: 'GET', url: /api\.coingecko\.com\/api\/v3\/simple\/price/ },
        req => {
            const url = new URL(req.url);
            const vsRaw = url.searchParams.get('vs_currencies') || '';
            const parts = vsRaw
                .split(',')
                .map(s => s.trim().toLowerCase())
                .filter(Boolean);
            const lastUpdated = Math.floor(Date.now() / 1000);
            const ecash: Record<string, number> = {
                last_updated_at: lastUpdated,
            };
            if (parts.includes('usd')) {
                ecash.usd = 0.00005;
            }
            if (parts.includes('eur')) {
                ecash.eur = 0.000046;
            }
            req.reply({ statusCode: 200, body: { ecash } });
        },
    );
}
