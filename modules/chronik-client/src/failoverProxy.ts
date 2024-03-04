// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import axios, { AxiosResponse } from 'axios';
import WebSocket from 'isomorphic-ws';
import * as ws from 'ws';
import * as proto from '../proto/chronik';
import { WsEndpoint } from './ChronikClient';
import { WsEndpoint_InNode } from './ChronikClientNode';

type MessageEvent = ws.MessageEvent | { data: Blob };

/** A pair of Chronik HTTP and WebSocket endpoint urls */
interface Endpoint {
    /** URL for Chronik's HTTP interface */
    url: string;
    /** URL for Chronik's WebSocket interface */
    wsUrl: string;
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
        this._endpointArray = this.appendWsUrls(urlsArray);
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

    // Converts an array of chronik http/https urls into
    // websocket equivalents and combines them into an object array
    // Note: this function is declared as public in order to access it
    // via unit tests to validate the websocket url parsing logic below.
    public appendWsUrls(urls: string[]): Endpoint[] {
        const combinedUrls = [];
        for (const thisUrl of urls) {
            if (thisUrl.startsWith('https://')) {
                combinedUrls.push({
                    url: thisUrl,
                    wsUrl:
                        'wss://' + thisUrl.substring('https://'.length) + '/ws',
                });
            } else if (thisUrl.startsWith('http://')) {
                combinedUrls.push({
                    url: thisUrl,
                    wsUrl:
                        'ws://' + thisUrl.substring('http://'.length) + '/ws',
                });
            } else {
                throw new Error(`Invalid url found in array: ${thisUrl}`);
            }
        }

        return combinedUrls;
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
                if (err instanceof Error && 'code' in err) {
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
            const error = proto.Error.decode(new Uint8Array(response.data));
            throw new Error(
                `Failed getting ${path} (${error.errorCode}): ${error.msg}`,
            );
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
            const testWs = new WebSocket(wsUrl);
            testWs.onerror = function () {
                testWs.close();
                resolve(false);
            };
            testWs.onopen = function () {
                testWs.close();
                resolve(true);
            };
        }).catch(() => {
            return false;
        });
    }

    // Iterates through available websocket urls and attempts connection.
    // Upon a successful connection it handles the various websocket callbacks.
    // Upon an unsuccessful connection it iterates to the next websocket url in the array.
    public async connectWs(wsEndpoint: WsEndpoint | WsEndpoint_InNode) {
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
                ws.onmessage = e => wsEndpoint.handleMsg(e as MessageEvent);
                ws.onerror = () => {
                    if (wsEndpoint.onError !== undefined) {
                        wsEndpoint.close();
                    }
                };
                ws.onclose = e => {
                    // End if manually closed or no auto-reconnect
                    if (
                        wsEndpoint.manuallyClosed ||
                        !wsEndpoint.autoReconnect
                    ) {
                        if (wsEndpoint.onEnd !== undefined) {
                            wsEndpoint.onEnd(e);
                        }
                        return;
                    }
                    if (wsEndpoint.onReconnect !== undefined) {
                        wsEndpoint.onReconnect(e);
                    }
                    this.connectWs(wsEndpoint);
                };
                wsEndpoint.ws = ws;
                wsEndpoint.connected =
                    wsEndpoint instanceof WsEndpoint
                        ? new Promise(resolve => {
                              ws.onopen = msg => {
                                  wsEndpoint.subs.forEach(sub =>
                                      wsEndpoint.subUnsub(
                                          true,
                                          sub.scriptType,
                                          sub.scriptPayload,
                                      ),
                                  );
                                  resolve(msg);
                                  if (wsEndpoint.onConnect !== undefined) {
                                      wsEndpoint.onConnect(msg);
                                  }
                              };
                          })
                        : new Promise(resolve => {
                              // WsEndpoint_InNode has a slightly different API vs NNG
                              ws.onopen = msg => {
                                  // Subscribe to all previously-subscribed endpoints
                                  wsEndpoint.subs.scripts.forEach(sub =>
                                      wsEndpoint.subscribeToScript(
                                          sub.scriptType,
                                          sub.payload,
                                      ),
                                  );
                                  // TODO subscribe to all tokenIds in subs.tokens

                                  // Subscribe to blocks method, if previously subscribed
                                  if (wsEndpoint.subs.blocks === true) {
                                      wsEndpoint.subscribeToBlocks();
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
