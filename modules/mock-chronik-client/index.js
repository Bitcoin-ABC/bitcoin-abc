// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const cashaddr = require('ecashaddrjs');

const CHRONIK_DEFAULT_PAGESIZE = 25;

module.exports = {
    MockAgora: class {
        // Agora can make specialized chronik-client calls to a chronik-client instance
        // running the agora plugin
        // For the purposes of unit testing, we only need to re-create how this object
        // is initialized and support getting and setting of expected responses
        constructor() {
            // Use self since it is not a reserved term in js
            // Can access self from inside a method and still get the class
            const self = this;
            // API call mock return objects
            // Can be set with self.setMock
            self.mockedResponses = {
                offeredGroupTokenIds: {},
                offeredFungibleTokenIds: {},
                activeOffersByPubKey: {},
                activeOffersByGroupTokenId: {},
                activeOffersByTokenId: {},
            };

            // Allow user to set supported agora query responses
            self.setOfferedGroupTokenIds = function (response) {
                self.mockedResponses.offeredGroupTokenIds = response;
            };
            self.setOfferedFungibleTokenIds = function (response) {
                self.mockedResponses.offeredFungibleTokenIds = response;
            };
            self.setActiveOffersByPubKey = function (pubKey, response) {
                self.mockedResponses.activeOffersByPubKey[pubKey] = response;
            };
            self.setActiveOffersByGroupTokenId = function (
                groupTokenId,
                response,
            ) {
                self.mockedResponses.activeOffersByGroupTokenId[groupTokenId] =
                    response;
            };
            self.setActiveOffersByTokenId = function (tokenId, response) {
                self.mockedResponses.activeOffersByTokenId[tokenId] = response;
            };

            // Checks whether the user set this mock response to be an error.
            // If so, throw it to simulate an API error response.
            function throwOrReturnValue(mockResponse) {
                if (mockResponse instanceof Error) {
                    throw mockResponse;
                }
                return mockResponse;
            }

            self.offeredGroupTokenIds = async function () {
                return throwOrReturnValue(
                    self.mockedResponses.offeredGroupTokenIds,
                );
            };
            self.offeredFungibleTokenIds = async function () {
                return throwOrReturnValue(
                    self.mockedResponses.offeredFungibleTokenIds,
                );
            };
            self.activeOffersByPubKey = async function (pubKey) {
                return throwOrReturnValue(
                    self.mockedResponses.activeOffersByPubKey[pubKey],
                );
            };
            self.activeOffersByGroupTokenId = async function (groupTokenId) {
                return throwOrReturnValue(
                    self.mockedResponses.activeOffersByGroupTokenId[
                        groupTokenId
                    ],
                );
            };
            self.activeOffersByTokenId = async function (tokenId) {
                return throwOrReturnValue(
                    self.mockedResponses.activeOffersByTokenId[tokenId],
                );
            };
        }
    },
    MockChronikClient: class {
        constructor() {
            // Use self since it is not a reserved term in js
            // Can access self from inside a method and still get the class
            const self = this;

            // API call mock return objects
            // Can be set with self.setMock
            self.mockedResponses = {
                block: {},
                blockTxs: {},
                blockchainInfo: {},
                txHistory: [],
                tx: {},
                token: {},
                p2sh: {},
                p2pkh: {},
                broadcastTx: {},
            };
            self.mockedMethods = { p2pkh: {}, p2sh: {} };
            self.manuallyClosed = false;

            // API call mock functions
            self.block = async function (blockHashOrHeight) {
                return throwOrReturnValue(
                    self.mockedResponses.block[blockHashOrHeight],
                );
            };
            self.blockTxs = async function (
                hashOrHeight,
                pageNumber = 0,
                pageSize = CHRONIK_DEFAULT_PAGESIZE,
            ) {
                if (
                    self.mockedResponses[hashOrHeight].txHistory instanceof
                    Error
                ) {
                    throw self.mockedResponses[hashOrHeight].txHistory;
                }
                return self.getTxHistory(
                    pageNumber,
                    pageSize,
                    self.mockedResponses[hashOrHeight].txHistory,
                );
            };
            self.tx = async function (txid) {
                return throwOrReturnValue(self.mockedResponses.tx[txid]);
            };
            self.token = async function (tokenId) {
                return throwOrReturnValue(self.mockedResponses.token[tokenId]);
            };
            self.broadcastTx = async function (txHex) {
                return throwOrReturnValue(
                    self.mockedResponses.broadcastTx[txHex],
                );
            };
            self.blockchainInfo = async function () {
                return throwOrReturnValue(self.mockedResponses.blockchainInfo);
            };

            // Return assigned script mocks
            self.script = function (type, hash) {
                return self.mockedMethods[type][hash];
            };

            // Return assigned address mocks
            self.address = function (address) {
                return self.mockedMethods[address];
            };

            // Return assigned tokenId mocks
            self.tokenId = function (tokenId) {
                return self.mockedMethods[tokenId];
            };

            // Return assigned lokadId mocks
            self.lokadId = function (lokadId) {
                return self.mockedMethods[lokadId];
            };

            // Checks whether the user set this mock response to be an error.
            // If so, throw it to simulate an API error response.
            function throwOrReturnValue(mockResponse) {
                if (mockResponse instanceof Error) {
                    throw mockResponse;
                }
                return mockResponse;
            }

            // Flags to check if ws methods have been called
            self.wsSubscribeCalled = false;
            self.wsWaitForOpenCalled = false;

            // Websocket mocks
            self.ws = function (wsObj) {
                if (wsObj !== null) {
                    const returnedWs = {
                        onMessage: wsObj.onMessage, // may be undefined
                        onConnect: wsObj.onConnect, // may be undefined
                        onReconnect: wsObj.onReconnect, // may be undefined
                        onEnd: wsObj.onEnd, // may be undefined
                        autoReconnect: wsObj.autoReconnect || true, // default to true if unset
                        manuallyClosed: false,
                        subs: {
                            blocks: false,
                            tokens: [],
                            lokadIds: [],
                            scripts: [],
                        },
                        isSubscribedBlocks: false,
                        waitForOpen: async function () {
                            self.wsWaitForOpenCalled = true;
                        },
                        // Note: subscribe is a legacy NNG method
                        subscribe: function (type, hash) {
                            this.subs.scripts.push({
                                scriptType: type,
                                scriptPayload: hash,
                            });
                            self.wsSubscribeCalled = true;
                        },
                        // Note: unsubscribe is a legacy NNG method
                        unsubscribe: function (type, hash) {
                            const thisSubInSubsIndex =
                                this.subs.scripts.findIndex(
                                    sub =>
                                        sub.scriptType === type &&
                                        sub.scriptPayload === hash,
                                );

                            if (typeof thisSubInSubsIndex !== 'undefined') {
                                // Remove from subs
                                this.subs.scripts.splice(thisSubInSubsIndex, 1);
                            }
                            // Otherwise do nothing
                        },
                        subscribeToScript: function (type, hash) {
                            // in-node only
                            if (Array.isArray(this.subs)) {
                                this.subs = { scripts: [] };
                            }
                            this.subs.scripts.push({
                                scriptType: type,
                                payload: hash,
                            });
                            self.wsSubscribeCalled = true;
                        },
                        unsubscribeFromScript: function (type, hash) {
                            const thisSubInSubsIndex =
                                this.subs.scripts.findIndex(
                                    sub =>
                                        sub.scriptType === type &&
                                        sub.payload === hash,
                                );

                            if (typeof thisSubInSubsIndex !== 'undefined') {
                                // Remove from subs
                                this.subs.scripts.splice(thisSubInSubsIndex, 1);
                            }
                            // Otherwise do nothing
                        },
                        subscribeToAddress: function (address) {
                            // in-node only
                            if (Array.isArray(this.subs)) {
                                this.subs = { scripts: [] };
                            }
                            const { type, hash } = cashaddr.decode(
                                address,
                                true,
                            );
                            this.subs.scripts.push({
                                scriptType: type,
                                payload: hash,
                            });
                        },
                        unsubscribeFromAddress: function (address) {
                            const { type, hash } = cashaddr.decode(
                                address,
                                true,
                            );
                            // Find the requested unsub script and remove it
                            const unsubIndex = this.subs.scripts.findIndex(
                                sub =>
                                    sub.scriptType === type &&
                                    sub.payload === hash,
                            );
                            if (unsubIndex === -1) {
                                // If we cannot find this subscription in this.subs, throw an error
                                // We do not want an app developer thinking they have unsubscribed from something
                                throw new Error(
                                    `No existing sub at ${type}, ${hash}`,
                                );
                            }

                            // Remove the requested subscription from this.subs
                            this.subs.scripts.splice(unsubIndex, 1);
                        },
                        subscribeToBlocks: function () {
                            this.subs.blocks = true;
                        },
                        unsubscribeFromBlocks: function () {
                            this.subs.blocks = false;
                        },
                    };
                    return returnedWs;
                }
            };
            self.wsClose = function () {
                self.manuallyClosed = true;
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
            self.setTxHistory = function (type, hash, txHistory) {
                self.mockedResponses[type][hash].txHistory = txHistory;
            };

            self.setTxHistoryByAddress = function (address, txHistory) {
                self.mockedResponses[address].txHistory = txHistory;
            };

            self.setTxHistoryByTokenId = function (tokenId, txHistory) {
                self.mockedResponses[tokenId].txHistory = txHistory;
            };

            self.setTxHistoryByLokadId = function (lokadId, txHistory) {
                self.mockedResponses[lokadId].txHistory = txHistory;
            };

            self.setTxHistoryByBlock = function (hashOrHeight, txHistory) {
                // Set all expected tx history as array where it can be accessed by mock method
                self.mockedResponses[hashOrHeight] = { txHistory };
            };

            /**
             * Set utxos to custom response; must be called after setScript
             * @param {string} type 'p2sh' or 'p2pkh'
             * @param {string} hash hash of an eCash address
             * @param {array} utxos mocked response of chronik.script(type,hash).utxos()
             */
            self.setUtxos = function (type, hash, utxos) {
                self.mockedResponses[type][hash].utxos = utxos;
            };

            /**
             * Set utxos to custom response; must be called after setAddress
             * @param {string} address 'p2sh' or 'p2pkh' address
             * @param {array} utxos mocked response of chronik.address(address).utxos()
             */
            self.setUtxosByAddress = function (address, utxos) {
                self.mockedResponses[address].utxos = utxos;
            };

            /**
             * Set utxos to custom response; must be called after setTokenId
             * @param {string} tokenId a tokenId
             * @param {array} utxos mocked response of chronik.tokenId(tokenId).utxos()
             */
            self.setUtxosByTokenId = function (tokenId, utxos) {
                self.mockedResponses[tokenId].utxos = utxos;
            };

            // Allow users to set expected chronik script call responses
            self.setScript = function (type, hash) {
                // Initialize object that will hold utxos if set
                self.mockedResponses[type][hash] = {};

                self.mockedMethods[type][hash] = {
                    history: async function (
                        pageNumber = 0,
                        pageSize = CHRONIK_DEFAULT_PAGESIZE,
                    ) {
                        if (
                            self.mockedResponses[type][hash]
                                .txHistory instanceof Error
                        ) {
                            throw self.mockedResponses[type][hash].txHistory;
                        }
                        return self.getTxHistory(
                            pageNumber,
                            pageSize,
                            self.mockedResponses[type][hash].txHistory,
                        );
                    },
                    utxos: async function () {
                        return throwOrReturnValue(
                            self.mockedResponses[type][hash].utxos,
                        );
                    },
                };
            };

            // Allow users to set expected chronik address call responses
            self.setAddress = function (address) {
                // Initialize object that will hold utxos if set
                self.mockedResponses[address] = {};

                self.mockedMethods[address] = {
                    history: async function (
                        pageNumber = 0,
                        pageSize = CHRONIK_DEFAULT_PAGESIZE,
                    ) {
                        if (
                            self.mockedResponses[address].txHistory instanceof
                            Error
                        ) {
                            throw self.mockedResponses[address].txHistory;
                        }
                        return self.getTxHistory(
                            pageNumber,
                            pageSize,
                            self.mockedResponses[address].txHistory,
                        );
                    },
                    utxos: async function () {
                        return throwOrReturnValue(
                            self.mockedResponses[address].utxos,
                        );
                    },
                };
            };

            // Allow users to set expected chronik tokenId call responses
            self.setTokenId = function (tokenId) {
                // Initialize object that will hold utxos if set
                self.mockedResponses[tokenId] = {};

                self.mockedMethods[tokenId] = {
                    history: async function (
                        pageNumber = 0,
                        pageSize = CHRONIK_DEFAULT_PAGESIZE,
                    ) {
                        if (
                            self.mockedResponses[tokenId].txHistory instanceof
                            Error
                        ) {
                            throw self.mockedResponses[tokenId].txHistory;
                        }
                        return self.getTxHistory(
                            pageNumber,
                            pageSize,
                            self.mockedResponses[tokenId].txHistory,
                        );
                    },
                    utxos: async function () {
                        return throwOrReturnValue(
                            self.mockedResponses[tokenId].utxos,
                        );
                    },
                };
            };

            // Allow users to set expected chronik lokadId call responses
            self.setLokadId = function (lokadId) {
                // Initialize object that will hold utxos if set
                self.mockedResponses[lokadId] = {};

                self.mockedMethods[lokadId] = {
                    history: async function (
                        pageNumber = 0,
                        pageSize = CHRONIK_DEFAULT_PAGESIZE,
                    ) {
                        if (
                            self.mockedResponses[lokadId].txHistory instanceof
                            Error
                        ) {
                            throw self.mockedResponses[lokadId].txHistory;
                        }
                        return self.getTxHistory(
                            pageNumber,
                            pageSize,
                            self.mockedResponses[lokadId].txHistory,
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
            response.numTxs = txHistory.length;
            return response;
        }
    },
};
