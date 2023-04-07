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
            // Use self since it is not a reserved term in js
            // Can access self from inside a method and still get the class
            const self = this;
            const { type, hash } = cashaddr.decode(address, true);
            self._url = `https://mocked-chronik-instance/not-a-url/`;
            self._wsUrl = `wss://mocked-chronik-instance/not-a-url/`;
            self.txHistory = txHistory;
            self.blockDetails = {};

            self.mock = {};
            self.mock[type] = {};
            self.mock[type][hash] = {
                history: function (pageNumber = 0, pageSize) {
                    return self.getTxHistory(
                        pageNumber,
                        pageSize,
                        self.txHistory,
                    );
                },
            };
            // Return assigned script mocks
            self.script = function (type, hash) {
                return this.mock[type][hash];
            };

            // Allow user to set expected block mock response
            self.setBlock = function (blockhashOrHeight, blockDetails) {
                return (self.blockDetails[blockhashOrHeight] = blockDetails);
            };

            // Return assigned block mocks
            self.block = function (blockHashOrHeight) {
                return self.blockDetails[blockHashOrHeight];
            };
            self.wsSubscribeCalled = false;
            self.wsWaitForOpenCalled = false;
            self.ws = function (wsObj) {
                if (wsObj !== null) {
                    return {
                        onMessage: wsObj.onMessage,
                        waitForOpen: function () {
                            self.wsWaitForOpenCalled = true;
                        },
                        subscribe: function (type, hash) {
                            self.wsSubscribeCalled = { type, hash };
                        },
                        // Return object for unit test parsing
                        wsResult: { success: true, address },
                    };
                }
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
