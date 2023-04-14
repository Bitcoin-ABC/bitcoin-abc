// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';

/* Mock chronik-client instance
 */
module.exports = {
    MockChronikClient: class {
        constructor(url = `mocked-chronik-instance/not-a-url/`) {
            // Use self since it is not a reserved term in js
            // Can access self from inside a method and still get the class
            const self = this;
            self._url = `https://${url}`;
            self._wsUrl = `wss://${url}`;

            // API call mock return objects
            // Can be set with self.setMock
            self.mockedResponses = {
                block: {},
                blockchainInfo: {},
                txHistory: [],
            };
            self.mockedMethods = { p2pkh: {}, p2sh: {} };

            // API call mock functions
            // Return assigned block mocks
            self.block = function (blockHashOrHeight) {
                return self.mockedResponses.block[blockHashOrHeight];
            };
            self.blockchainInfo = function () {
                return self.mockedResponses.blockchainInfo;
            };
            // Return assigned script mocks
            self.script = function (type, hash) {
                return self.mockedMethods[type][hash];
            };

            // Flags to check if methods have been called
            self.wsSubscribeCalled = false;
            self.wsWaitForOpenCalled = false;

            // public chronik methods
            // todo see latest failing unit test
            self.ws = function (wsObj) {
                if (wsObj !== null) {
                    const returnedWs = {
                        onMessage: wsObj.onMessage, // may be undefined
                        onConnect: wsObj.onConnect, // may be undefined
                        onReconnect: wsObj.onReconnect, // may be undefined
                        onEnd: wsObj.onEnd, // may be undefined
                        autoReconnect: wsObj.autoReconnect || true, // default to true if unset
                        _manuallyClosed: false,
                        _subs: [],
                        waitForOpen: function () {
                            self.wsWaitForOpenCalled = true;
                        },
                        subscribe: function (type, hash) {
                            returnedWs._subs.push({
                                scriptType: type,
                                scriptPayload: hash,
                            });
                            self.wsSubscribeCalled = true;
                        },
                    };
                    return returnedWs;
                }
            };

            // Allow user to set expected chronik call response
            self.setMock = function (call, options) {
                // e.g. ('block', {input: '', output: ''})
                const { input, output } = options;
                if (input) {
                    self.mockedResponses[call][input] = output;
                } else {
                    self.mockedResponses[call] = output;
                }
            };
            // script calls need to be set differently
            self.setTxHistory = function (txHistory) {
                self.mockedResponses.txHistory = txHistory;
            };
            // Allow users to set expected chronik script call responses
            // For now, just history
            self.setScript = function (type, hash) {
                self.mockedMethods[type][hash] = {
                    history: async function (pageNumber = 0, pageSize) {
                        return self.getTxHistory(
                            pageNumber,
                            pageSize,
                            self.mockedResponses.txHistory,
                        );
                    },
                };
            };
        }
        // Method to get paginated tx history with same variables as chronik
        getTxHistory(pageNumber = 0, pageSize, txHistory) {
            // Return chronik shaped responses
            const startSliceOnePage = pageNumber * pageSize;
            const endSliceOnePage = startSliceOnePage + pageSize;
            const thisPage = txHistory.slice(
                startSliceOnePage,
                endSliceOnePage,
            );
            const response = {};

            response.txs = thisPage;
            response.numPages = Math.ceil(txHistory.length / pageSize);
            return response;
        }
    },
};
