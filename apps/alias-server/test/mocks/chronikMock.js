// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const cashaddr = require('ecashaddrjs');

/* Mock chronik-client instance
 * Must be initialized with type, hash, and full tx history
 * Will return expected paginated responses of chronik tx history
 */
module.exports = {
    MockChronikClient: class {
        constructor(address, txHistory) {
            const { type, hash } = cashaddr.decode(address, true);
            this._url = `https://mocked-chronik-instance/not-a-url/`;
            this._wsUrl = `wss://mocked-chronik-instance/not-a-url/`;
            this.txHistory = txHistory;

            // Method to get paginated tx history with same variables as chronik
            function getTxHistory(pageNumber = 0, pageSize) {
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
            this.mock = {};
            this.mock[type] = {};
            this.mock[type][hash] = {
                history: function (pageNumber = 0, pageSize) {
                    // return history
                    return getTxHistory(pageNumber, pageSize);
                },
            };
            // Return assigned mocks
            this.script = function (type, hash) {
                return this.mock[type][hash];
            };
            this.ws = function (wsObj) {
                if (wsObj !== null) {
                    return {
                        onMessage: wsObj.onMessage,
                        waitForOpen: function () {
                            return {
                                // Stub method
                                // Must be a function
                                waitForOpen: { called: true },
                            };
                        },
                        subscribe: function (type, hash) {
                            return {
                                // Stub method
                                // Must be a function that accepts expected parameters
                                subscribe: {
                                    called: true,
                                    params: { type, hash },
                                },
                            };
                        },
                        // Return object for unit test parsing
                        wsResult: { success: true, address },
                    };
                }
            };
        }
    },
};
