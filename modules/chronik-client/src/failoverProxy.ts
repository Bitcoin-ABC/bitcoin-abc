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

    /**
     * Check if a given websocket URL connects
     * Note: As of 20231110 there is no msg from chronik server confirming a connection to chronik
     * We would have to wait for a block or a transaction, which is impractical here
     * So, this is only testing whether or not a given URL is a live websocket or not
     * @param {string} wsUrl
     * @returns {bool}
     */
    private async _websocketUrlConnects(wsUrl: string) {
        return new Promise(resolve => {
            // If we do not connect in appropriate timeframe,
            // call it a failure and try the next websocket
            const timeoutFailure = setTimeout(() => {
                testWs.close();
                resolve(false);
            }, WEBSOCKET_TIMEOUT_MS);
            const testWs = new WebSocket(wsUrl);
            testWs.onerror = function () {
                testWs.close();
                clearTimeout(timeoutFailure);
                return resolve(false);
            };
            testWs.onopen = function () {
                testWs.close();
                clearTimeout(timeoutFailure);
                return resolve(true);
            };
        }).catch(() => {
            return false;
        });
    }

    // Iterates through available websocket urls and attempts connection.
    // Upon a successful connection it handles the various websocket callbacks.
    // Upon an unsuccessful connection it iterates to the next websocket url in the array.
    public async connectWs(wsEndpoint: WsEndpoint) {
        for (let i = 0; i < this._endpointArray.length; i += 1) {
            const index = this.deriveEndpointIndex(i);
            const thisProxyWsUrl = this._endpointArray[index].wsUrl;
            const websocketUrlConnects = await this._websocketUrlConnects(
                thisProxyWsUrl,
            );
            if (websocketUrlConnects) {
                // Set this index to state
                this._workingIndex = index;

                const ws = new WebSocket(thisProxyWsUrl);
                ws.onmessage = (e: MessageEvent) =>
                    wsEndpoint.handleMsg(e as MessageEvent);
                ws.onerror = () => {
                    if (wsEndpoint.onError !== undefined) {
                        wsEndpoint.close();
                    }
                };
                ws.onclose = (e: ws.CloseEvent) => {
                    // End if manually closed or no auto-reconnect
                    if (
                        wsEndpoint.manuallyClosed ||
                        !wsEndpoint.autoReconnect
                    ) {
                        if (wsEndpoint.onEnd !== undefined) {
                            wsEndpoint.onEnd(e as ws.Event);
                        }
                        return;
                    }
                    if (wsEndpoint.onReconnect !== undefined) {
                        wsEndpoint.onReconnect(e as ws.Event);
                    }

                    this._workingIndex =
                        (this._workingIndex + 1) % this._endpointArray.length;

                    this.connectWs(wsEndpoint);
                };
                wsEndpoint.ws = ws;
                wsEndpoint.connected = new Promise(resolve => {
                    ws.onopen = (msg: ws.Event) => {
                        // Subscribe to all previously-subscribed scripts
                        wsEndpoint.subs.scripts.forEach(sub =>
                            wsEndpoint.subscribeToScript(
                                sub.scriptType,
                                sub.payload,
                            ),
                        );
                        // Subscribe to all previously-subscribed lokadIds
                        wsEndpoint.subs.lokadIds.forEach(lokadId =>
                            wsEndpoint.subscribeToLokadId(lokadId),
                        );
                        // Subscribe to all previously-subscribed tokenIds
                        wsEndpoint.subs.tokens.forEach(tokenId =>
                            wsEndpoint.subscribeToTokenId(tokenId),
                        );
                        // Subscribe to all previously-subscribed txids
                        wsEndpoint.subs.txids.forEach(txid =>
                            wsEndpoint.subscribeToTxid(txid),
                        );

                        // Subscribe to blocks method, if previously subscribed
                        if (wsEndpoint.subs.blocks === true) {
                            wsEndpoint.subscribeToBlocks();
                        }
                        // Subscribe to txs method, if previously subscribed
                        if (wsEndpoint.subs.txs === true) {
                            wsEndpoint.subscribeToTxs();
                        }
                        resolve(msg);
                        if (wsEndpoint.onConnect !== undefined) {
                            wsEndpoint.onConnect(msg);
                        }
                        // If no errors thrown from above call then set this index to state
                        this._workingIndex = index;
                    };
                });
                return;
            }
        }
        // If no websocket URLs connect, throw error
        throw new Error(`Error connecting to known Chronik websockets`);
    }
}
