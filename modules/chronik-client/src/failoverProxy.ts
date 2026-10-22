// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import axios, { AxiosResponse } from 'axios';
import WebSocket from 'isomorphic-ws';
import * as ws from 'ws';
import * as proto from '../proto/chronik';
import { WsEndpoint } from './ChronikClient';

type MessageEvent = ws.MessageEvent | { data: Blob };

/** A pair of Chronik HTTP and WebSocket endpoint urls */
interface Endpoint {
    /** URL for Chronik's HTTP interface */
    url: string;
    /** URL for Chronik's WebSocket interface */
    wsUrl: string;
}

const WEBSOCKET_TIMEOUT_MS = 5000;
/**
 * Wait before a failed reconnect is tried again. The first reconnect after a
 * disconnect is immediate so a live failover peer is subscribed before the
 * next block. Doubles on each failed attempt.
 */
const WS_RECONNECT_BASE_DELAY_MS = 500;
/** Longest wait between reconnect attempts during an outage. */
const WS_RECONNECT_MAX_DELAY_MS = 30_000;

/**
 * Build the ErrorEvent shape `WsConfig.onError` already accepts.
 * `target` may be missing when every endpoint failed before a socket existed.
 */
/**
 * Destroy a socket immediately. `close()` waits for a handshake that a dead
 * Chronik peer never completes, and that wait keeps the process alive.
 */
function terminateWs(socket: WebSocket): void {
    const terminator = socket as WebSocket & { terminate?: () => void };
    try {
        if (typeof terminator.terminate === 'function') {
            terminator.terminate();
            return;
        }
        socket.close();
    } catch {
        // The socket may already be gone.
    }
}

function wsErrorEvent(
    err: unknown,
    target: ws.WebSocket | undefined,
): ws.ErrorEvent {
    const message = err instanceof Error ? err.message : String(err);
    return {
        error: err,
        message,
        type: 'error',
        target: target as ws.WebSocket,
    };
}

/**
 * Send a reconnect failure to onError. Log it when the caller did not
 * register a handler, so the outage is visible without crashing the process.
 */
function emitWsError(wsEndpoint: WsEndpoint, err: unknown): void {
    if (wsEndpoint.onError === undefined) {
        console.error('Chronik websocket reconnect failed:', err);
        return;
    }
    try {
        wsEndpoint.onError(wsErrorEvent(err, wsEndpoint.ws));
    } catch (callbackErr) {
        console.error(
            'Chronik websocket onError callback failed:',
            callbackErr,
        );
    }
}

// Converts an array of chronik http/https urls into
// websocket equivalents and combines them into an object array
export function appendWsUrls(urls: string[]): Endpoint[] {
    const combinedUrls = [];
    for (const thisUrl of urls) {
        if (thisUrl.startsWith('https://')) {
            combinedUrls.push({
                url: thisUrl,
                wsUrl: 'wss://' + thisUrl.substring('https://'.length) + '/ws',
            });
        } else if (thisUrl.startsWith('http://')) {
            combinedUrls.push({
                url: thisUrl,
                wsUrl: 'ws://' + thisUrl.substring('http://'.length) + '/ws',
            });
        } else {
            throw new Error(`Invalid url found in array: ${thisUrl}`);
        }
    }

    return combinedUrls;
}

/**
 * Handles the networking to Chronik `Endpoint`s, including cycling
 * through both types of endpoints.
 */
export class FailoverProxy {
    private _endpointArray: Endpoint[];
    private _workingIndex: number;
    /** Live-socket handshake timeout. Unit tests shorten this. */
    private _wsOpenTimeoutMs = WEBSOCKET_TIMEOUT_MS;

    constructor(urls: string | string[]) {
        // Validate url input
        const urlsArray = typeof urls === 'string' ? [urls] : urls;
        if (urlsArray.length === 0) {
            throw new Error('Url array must not be empty');
        }

        // Validate each entry in the url array
        for (const url of urlsArray) {
            if (url.endsWith('/')) {
                throw new Error("`url` cannot end with '/', got: " + url);
            }
            if (!url.startsWith('https://') && !url.startsWith('http://')) {
                throw new Error(
                    "`url` must start with 'https://' or 'http://', got: " +
                        url,
                );
            }
        }

        // Initializes _endpointArray with an object Array containing
        // 'url' and 'wsUrl' props
        this._endpointArray = appendWsUrls(urlsArray);
        this._workingIndex = 0;
    }

    // For unit test verification
    public getEndpointArray(): Endpoint[] {
        return this._endpointArray;
    }
    // Derives the endpoint array index based on _workingIndex
    // This is set to public for unit testing purposes
    public deriveEndpointIndex(loopIndex: number) {
        return (this._workingIndex + loopIndex) % this._endpointArray.length;
    }
    // Overriding working index for unit testing purposes
    public setWorkingIndex(newIndex: number) {
        this._workingIndex = newIndex;
    }

    public async post(path: string, data: Uint8Array): Promise<Uint8Array> {
        return this._request(path, 'POST', data);
    }

    public async get(path: string): Promise<Uint8Array> {
        return this._request(path, 'GET');
    }

    /**
     * Returns a Get or POST axios response from the Chronik indexer
     *
     * @param {string} path the path to the Chronik API endpoint
     * @param {string} requestType the flag indicating whether this is a get or post request
     * @param {string} data the optional axios request data specific to post requests
     * @returns {Uint8Array} returns the axios response data from Chronik
     * @throws {error} throws error on non-responsive server or valid error responses
     */
    public async _request(
        path: string,
        requestType: 'GET' | 'POST',
        data?: Uint8Array,
    ): Promise<Uint8Array> {
        // Cycle through known Chronik instances
        for (let i = 0; i < this._endpointArray.length; i += 1) {
            const index = this.deriveEndpointIndex(i);
            const thisProxyUrl = this._endpointArray[index].url;
            try {
                const response = await this._callAxios(
                    thisProxyUrl,
                    path,
                    requestType,
                    data,
                );
                // If no errors thrown in the above call then set this index to state
                this._workingIndex = index;
                return response;
            } catch (err) {
                if (
                    err instanceof Error &&
                    ('code' in err ||
                        err
                            .toString()
                            .includes(
                                'Unable to decode error msg, chronik server is indexing or in error state',
                            ) ||
                        // We can see this type of error msg from an indexing server
                        // Observed when a chronik node is down (e.g. bitcoin-cli stop) but
                        // server is reachable, nginx running
                        err.toString().trim().endsWith(':'))
                ) {
                    // Server outage, skip to next url in loop
                    // Connection error msgs have a 'code' key of 'ECONNREFUSED'
                    // Error messages from the chronik server (i.e. error
                    // messages that should not trigger a 'try next server'
                    // attempt) are of the chronik proto Error type, which has no 'code' key
                    continue;
                }
                // Throw upon all other valid error responses from chronik
                throw err;
            }
        }
        // All known Chronik instances have not been responsive
        throw new Error(`Error connecting to known Chronik instances`);
    }

    /**
     * Calls axios for a GET or POST response
     *
     * @param {string} url the singular chronik url
     * @param {string} path the path to the Chronik API endpoint
     * @param {string} requestType the flag indicating whether this is a get or post request
     * @param {string} data the optional axios request data for post requests
     * @returns {Uint8Array} returns the axios response data from Chronik
     * @throws {error} throws error on non-responsive server or valid error responses
     */
    public async _callAxios(
        url: string,
        path: string,
        requestType: 'GET' | 'POST',
        data?: Uint8Array,
    ) {
        let response: AxiosResponse;
        if (requestType === 'GET') {
            response = await axios.get(`${url}${path}`, {
                responseType: 'arraybuffer',
                validateStatus: undefined,
            });
        } else if (requestType === 'POST') {
            response = await axios.post(`${url}${path}`, data, {
                responseType: 'arraybuffer',
                validateStatus: undefined,
                // Prevents Axios encoding the Uint8Array as JSON or something
                transformRequest: x => x,
                headers: {
                    'Content-Type': 'application/x-protobuf',
                },
            });
        } else {
            throw new Error('Impossible by types');
        }

        // Parse for valid error responses (e.g. txid not found)
        this.ensureResponseErrorThrown(response, path);
        return new Uint8Array(response.data);
    }

    public ensureResponseErrorThrown(response: AxiosResponse, path: string) {
        if (response.status != 200) {
            let errorCanBeDecoded = false;
            let error;
            try {
                // If we can decode this error with proto, it is an expected chronik error
                // from a working server and we should return it to the user
                error = proto.Error.decode(new Uint8Array(response.data));
                errorCanBeDecoded = true;
            } catch {
                // If we can't decode this error with proto, something is wrong with this server instance
                // It may be indexing
                // In this case, we should try the next server
                throw new Error(
                    'Unable to decode error msg, chronik server is indexing or in error state',
                );
            }
            if (errorCanBeDecoded) {
                throw new Error(`Failed getting ${path}: ${error.msg}`);
            }
        }
    }

    /** Probe sockets keyed by the endpoint that started them. */
    private _probes = new Map<WsEndpoint, Set<WebSocket>>();

    private _trackProbe(wsEndpoint: WsEndpoint, testWs: WebSocket): void {
        let probes = this._probes.get(wsEndpoint);
        if (probes === undefined) {
            probes = new Set();
            this._probes.set(wsEndpoint, probes);
        }
        probes.add(testWs);
    }

    private _untrackProbe(wsEndpoint: WsEndpoint, testWs: WebSocket): void {
        const probes = this._probes.get(wsEndpoint);
        if (probes === undefined) {
            return;
        }
        probes.delete(testWs);
        if (probes.size === 0) {
            this._probes.delete(wsEndpoint);
        }
    }

    /**
     * Drop probe sockets for one endpoint. `close()` and `pause()` call this
     * so an in-flight liveness check cannot keep the process alive.
     */
    public discardProbes(wsEndpoint: WsEndpoint): void {
        const probes = this._probes.get(wsEndpoint);
        if (probes === undefined) {
            return;
        }
        this._probes.delete(wsEndpoint);
        for (const probe of probes) {
            terminateWs(probe);
        }
    }

    /** Destroy the live socket, if any. */
    public terminateSocket(socket: WebSocket | undefined): void {
        if (socket !== undefined) {
            terminateWs(socket);
        }
    }

    /**
     * Check if a given websocket URL connects.
     * There is no msg from chronik confirming a connection, and waiting for a
     * block or a transaction is impractical here, so this only checks that the
     * URL accepts a websocket.
     */
    private async _websocketUrlConnects(
        wsEndpoint: WsEndpoint,
        wsUrl: string,
    ): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            // If we do not connect in appropriate timeframe,
            // call it a failure and try the next websocket
            const testWs = new WebSocket(wsUrl);
            this._trackProbe(wsEndpoint, testWs);
            let settled = false;
            const finish = (connected: boolean) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timeoutFailure);
                this._untrackProbe(wsEndpoint, testWs);
                terminateWs(testWs);
                resolve(connected);
            };
            const timeoutFailure = setTimeout(() => {
                finish(false);
            }, WEBSOCKET_TIMEOUT_MS);
            testWs.onerror = () => {
                finish(false);
            };
            testWs.onopen = () => {
                finish(true);
            };
        }).catch(() => {
            return false;
        });
    }

    /**
     * Delay before reconnect attempt `attempt` (0-based).
     * Public so unit tests can stub a shorter schedule.
     */
    public reconnectDelayMs(attempt: number): number {
        // attempt 0 is the reconnect for the socket that just closed.
        if (attempt <= 0) {
            return 0;
        }
        const exponent = Math.min(attempt - 1, 16);
        return Math.min(
            WS_RECONNECT_BASE_DELAY_MS * 2 ** exponent,
            WS_RECONNECT_MAX_DELAY_MS,
        );
    }

    /**
     * A deliberate close, or a pause, must not open another socket.
     * `autoReconnect` only suppresses reconnects, not the first connectWs.
     */
    private _connectionAborted(
        wsEndpoint: WsEndpoint,
        isReconnect: boolean,
    ): boolean {
        return (
            wsEndpoint.manuallyClosed ||
            (isReconnect && !wsEndpoint.autoReconnect)
        );
    }

    private _clearReconnectTimer(wsEndpoint: WsEndpoint): void {
        if (typeof wsEndpoint._clearReconnectTimer === 'function') {
            wsEndpoint._clearReconnectTimer();
            return;
        }
        if (wsEndpoint._reconnectTimer !== undefined) {
            clearTimeout(wsEndpoint._reconnectTimer);
            wsEndpoint._reconnectTimer = undefined;
        }
    }

    private _scheduleReconnect(wsEndpoint: WsEndpoint): void {
        this._clearReconnectTimer(wsEndpoint);
        const attempt = wsEndpoint._reconnectAttempt ?? 0;
        const delay = this.reconnectDelayMs(attempt);
        wsEndpoint._reconnectAttempt = attempt + 1;
        const timer = setTimeout(() => {
            if (wsEndpoint._reconnectTimer === timer) {
                wsEndpoint._reconnectTimer = undefined;
            }
            void this._reconnectAfterDelay(wsEndpoint);
        }, delay);
        wsEndpoint._reconnectTimer = timer;
    }

    /**
     * Run one reconnect. Failures are caught here so a down Chronik does not
     * surface as an unhandled rejection from the socket's onclose handler.
     */
    private async _reconnectAfterDelay(wsEndpoint: WsEndpoint): Promise<void> {
        if (this._connectionAborted(wsEndpoint, true)) {
            return;
        }
        try {
            await this.connectWs(wsEndpoint, true);
        } catch (err) {
            if (this._connectionAborted(wsEndpoint, true)) {
                return;
            }
            emitWsError(wsEndpoint, err);
            if (this._connectionAborted(wsEndpoint, true)) {
                return;
            }
            this._scheduleReconnect(wsEndpoint);
        }
    }

    // Iterates through available websocket urls and attempts connection.
    // Upon a successful connection it handles the various websocket callbacks.
    // Upon an unsuccessful connection it iterates to the next websocket url in the array.
    // isReconnect is set for backoff retries. The first connect still runs when
    // autoReconnect is false; that flag only skips later attempts.
    public async connectWs(wsEndpoint: WsEndpoint, isReconnect = false) {
        // An explicit connect (waitForOpen / resume) cancels a pending backoff.
        // If that connect cannot reach any endpoint, the backoff is re-armed
        // below so auto-reconnect does not stop.
        const hadPendingRetry = wsEndpoint._reconnectTimer !== undefined;
        this._clearReconnectTimer(wsEndpoint);
        for (let i = 0; i < this._endpointArray.length; i += 1) {
            if (this._connectionAborted(wsEndpoint, isReconnect)) {
                throw new Error('Chronik websocket connection aborted');
            }
            const index = this.deriveEndpointIndex(i);
            const thisProxyWsUrl = this._endpointArray[index].wsUrl;
            const websocketUrlConnects = await this._websocketUrlConnects(
                wsEndpoint,
                thisProxyWsUrl,
            );
            if (!websocketUrlConnects) {
                continue;
            }
            if (this._connectionAborted(wsEndpoint, isReconnect)) {
                throw new Error('Chronik websocket connection aborted');
            }
            // Set this index to state
            this._workingIndex = index;

            const ws = new WebSocket(thisProxyWsUrl);
            // Assign before handlers so a synchronous close is not treated
            // as a stale socket.
            wsEndpoint.ws = ws;

            let settled = false;
            let openTimeout: ReturnType<typeof setTimeout> | undefined;
            const clearOpenTimeout = () => {
                if (openTimeout !== undefined) {
                    clearTimeout(openTimeout);
                    openTimeout = undefined;
                }
            };

            const connected = new Promise<ws.Event>((resolve, reject) => {
                const rejectConnected = (err: Error) => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    clearOpenTimeout();
                    reject(err);
                };
                const resolveConnected = (msg: ws.Event) => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    clearOpenTimeout();
                    wsEndpoint._reconnectAttempt = 0;
                    // Send-only restore of this.subs, including plugins
                    wsEndpoint._resubscribeAll();
                    resolve(msg);
                    if (wsEndpoint.onConnect !== undefined) {
                        wsEndpoint.onConnect(msg);
                    }
                    // If no errors thrown from above call then set this index to state
                    this._workingIndex = index;
                };

                openTimeout = setTimeout(() => {
                    rejectConnected(
                        new Error('Timed out connecting to Chronik websocket'),
                    );
                    terminateWs(ws);
                }, this._wsOpenTimeoutMs);

                ws.onopen = (msg: ws.Event) => {
                    resolveConnected(msg);
                };
                ws.onmessage = (e: MessageEvent) => {
                    // handleMsg is async. Catch so a thrown application
                    // callback is not an unhandled rejection. Decode failures
                    // close the socket inside handleMsg; a callback error
                    // must leave it open.
                    wsEndpoint.handleMsg(e as MessageEvent, ws).catch(err => {
                        console.error(
                            'Chronik websocket message handler failed:',
                            err,
                        );
                    });
                };
                // Report the error and leave the socket up. close() would set
                // manuallyClosed and disable reconnect for every app that logs
                // onError. onclose decides whether to reconnect.
                ws.onerror = (event: ws.ErrorEvent) => {
                    if (wsEndpoint.onError === undefined) {
                        return;
                    }
                    try {
                        wsEndpoint.onError(event);
                    } catch (callbackErr) {
                        console.error(
                            'Chronik websocket onError callback failed:',
                            callbackErr,
                        );
                    }
                };
                ws.onclose = (e: ws.CloseEvent) => {
                    clearOpenTimeout();
                    if (!settled) {
                        rejectConnected(
                            new Error(
                                'Chronik websocket closed before it opened',
                            ),
                        );
                    }
                    // A replaced socket must not reconnect or reject the new
                    // attempt. Its own promise was already settled above.
                    if (wsEndpoint.ws !== undefined && wsEndpoint.ws !== ws) {
                        return;
                    }
                    // End if manually closed or no auto-reconnect
                    if (this._connectionAborted(wsEndpoint, true)) {
                        if (wsEndpoint.onEnd !== undefined) {
                            wsEndpoint.onEnd(e as ws.Event);
                        }
                        return;
                    }
                    if (wsEndpoint.onReconnect !== undefined) {
                        wsEndpoint.onReconnect(e as ws.Event);
                    }
                    // close() or pause() from onReconnect cancels the retry.
                    if (this._connectionAborted(wsEndpoint, true)) {
                        return;
                    }

                    this._workingIndex =
                        (this._workingIndex + 1) % this._endpointArray.length;

                    this._scheduleReconnect(wsEndpoint);
                };
            });
            // A later retry may reject this with nobody awaiting it.
            // The handler marks that rejection handled; waitForOpen still sees it.
            void connected.catch(() => undefined);
            wsEndpoint.connected = connected;
            return;
        }
        // If no websocket URLs connect, throw error
        const err = new Error(`Error connecting to known Chronik websockets`);
        if (
            hadPendingRetry &&
            !isReconnect &&
            !this._connectionAborted(wsEndpoint, true)
        ) {
            emitWsError(wsEndpoint, err);
            this._scheduleReconnect(wsEndpoint);
        }
        throw err;
    }
}
