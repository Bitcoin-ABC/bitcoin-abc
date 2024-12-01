// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getOutputScriptFromAddress,
    encodeCashAddress,
    decodeCashAddress,
} from 'ecashaddrjs';
import {
    Block,
    TxHistoryPage,
    Tx,
    TokenInfo,
    BlockchainInfo,
    Utxo,
    TokenIdUtxos,
    ScriptUtxo,
    ScriptUtxos,
    WsConfig,
    WsMsgClient,
    WsSubScriptClient,
    WsSubPluginClient,
} from 'chronik-client';
import * as ws from 'ws';

const CHRONIK_DEFAULT_PAGESIZE = 25;

// Properly this should be AgoraOffer, but the mock will work with anything
// I do not think we should add ecash-agora as a dep just for this type
type MockAgoraOffer = Record<string, any>;

/**
 * MockAgora stores set responses in this object
 */
interface MockAgoraMockResponses {
    /** Supported Agora methods in MockAgora */
    offeredGroupTokenIds: string[] | Error;
    offeredFungibleTokenIds: string[] | Error;
    activeOffersByPubKey: { [key: string]: MockAgoraOffer[] | Error };
    activeOffersByGroupTokenId: {
        [key: string]: MockAgoraOffer[] | Error;
    };
    activeOffersByTokenId: {
        [key: string]: MockAgoraOffer[] | Error;
    };
}

export type AgoraQueryParamVariants =
    | {
          type: 'TOKEN_ID';
          tokenId: string;
      }
    | {
          type: 'GROUP_TOKEN_ID';
          groupTokenId: string;
      }
    | {
          type: 'PUBKEY';
          pubkeyHex: string;
      };

interface MockAgoraInterface {
    mockedResponses: MockAgoraMockResponses;
    /** Methods used to set expected responses */
    setOfferedGroupTokenIds: (expectedResponse: string[] | Error) => void;
    setOfferedFungibleTokenIds: (expectedResponse: string[] | Error) => void;
    setActiveOffersByPubKey: (
        pubKey: string,
        expectedResponse: MockAgoraOffer[] | Error,
    ) => void;
    setActiveOffersByGroupTokenId: (
        groupTokenId: string,
        expectedResponse: MockAgoraOffer[] | Error,
    ) => void;
    setActiveOffersByTokenId: (
        tokenId: string,
        expectedResponse: MockAgoraOffer[] | Error,
    ) => void;
    /** Supported Agora methods */
    offeredGroupTokenIds: () => void;
    offeredFungibleTokenIds: () => void;
    activeOffersByPubKey: (pubKey: string) => void;
    activeOffersByGroupTokenId: (groupTokenId: string) => void;
    activeOffersByTokenId: (tokenId: string) => void;
    subscribeWs: (ws: MockWsEndpoint, params: AgoraQueryParamVariants) => void;
    unsubscribeWs: (
        ws: MockWsEndpoint,
        params: AgoraQueryParamVariants,
    ) => void;
}

export const TOKEN_ID_PREFIX = '54'; // toHex(strToBytes('T'));
export const PUBKEY_PREFIX = '50'; // toHex(strToBytes('P'));
export const GROUP_TOKEN_ID_PREFIX = '47'; // toHex(strToBytes('G'));
export const PLUGIN_NAME = 'agora';

/**
 * MockAgora
 * Useful test mock for writing unit tests for functions that use the Agora
 * class from the ecash-agora library. Drop-in replacement for Agora object
 * to unit test functions that accept an intialized Agora object as a param.
 * In this way, can write unit tests without hitting an actual chronik API.
 *
 * Mock calls to chronik nodes indexed with the ecash-agora plugin
 *
 * See Cashtab and ecash-herald for implementation examples.
 *
 * Note: not all Agora methods are mocked, can be extended as needed
 */
export class MockAgora implements MockAgoraInterface {
    mockedResponses: MockAgoraMockResponses;

    // Agora can make specialized chronik-client calls to a chronik-client instance
    // running the agora plugin
    // For the purposes of unit testing, we only need to re-create how this object
    // is initialized and support getting and setting of expected responses
    constructor() {
        // API call mock return objects
        // Can be set with self.setMock
        this.mockedResponses = {
            offeredGroupTokenIds: [],
            offeredFungibleTokenIds: [],
            activeOffersByPubKey: {},
            activeOffersByGroupTokenId: {},
            activeOffersByTokenId: {},
        };
    }

    // Allow user to set supported agora query responses
    setOfferedGroupTokenIds = (expectedResponse: string[] | Error) => {
        this.mockedResponses.offeredGroupTokenIds = expectedResponse;
    };
    setOfferedFungibleTokenIds = (expectedResponse: string[] | Error) => {
        this.mockedResponses.offeredFungibleTokenIds = expectedResponse;
    };
    setActiveOffersByPubKey = (
        pubKey: string,
        expectedResponse: MockAgoraOffer[] | Error,
    ) => {
        this.mockedResponses.activeOffersByPubKey[pubKey] = expectedResponse;
    };
    setActiveOffersByGroupTokenId = (
        groupTokenId: string,
        expectedResponse: MockAgoraOffer[] | Error,
    ) => {
        this.mockedResponses.activeOffersByGroupTokenId[groupTokenId] =
            expectedResponse;
    };
    setActiveOffersByTokenId = (
        tokenId: string,
        expectedResponse: MockAgoraOffer[] | Error,
    ) => {
        this.mockedResponses.activeOffersByTokenId[tokenId] = expectedResponse;
    };

    offeredGroupTokenIds = async () => {
        return this._throwOrReturnValue(
            this.mockedResponses.offeredGroupTokenIds,
        );
    };
    offeredFungibleTokenIds = async () => {
        return this._throwOrReturnValue(
            this.mockedResponses.offeredFungibleTokenIds,
        );
    };
    activeOffersByPubKey = async (pubKey: string) => {
        return this._throwOrReturnValue(
            this.mockedResponses.activeOffersByPubKey[pubKey],
        );
    };
    activeOffersByGroupTokenId = async (groupTokenId: string) => {
        return this._throwOrReturnValue(
            this.mockedResponses.activeOffersByGroupTokenId[groupTokenId],
        );
    };
    activeOffersByTokenId = async (tokenId: string) => {
        return this._throwOrReturnValue(
            this.mockedResponses.activeOffersByTokenId[tokenId],
        );
    };

    /** Subscribe to updates from the websocket for some params */
    subscribeWs = (ws: MockWsEndpoint, params: AgoraQueryParamVariants) => {
        const groupHex = this._groupHex(params);
        ws.subscribeToPlugin(PLUGIN_NAME, groupHex);
    };

    /** Unsubscribe from updates from the websocket for some params */
    unsubscribeWs = (ws: MockWsEndpoint, params: AgoraQueryParamVariants) => {
        const groupHex = this._groupHex(params);
        ws.unsubscribeFromPlugin(PLUGIN_NAME, groupHex);
    };

    private _groupHex = (params: AgoraQueryParamVariants): string => {
        switch (params.type) {
            case 'TOKEN_ID':
                return TOKEN_ID_PREFIX + params.tokenId;
            case 'GROUP_TOKEN_ID':
                return GROUP_TOKEN_ID_PREFIX + params.groupTokenId;
            case 'PUBKEY':
                return PUBKEY_PREFIX + params.pubkeyHex;
            default:
                throw new Error('Unsupported type');
        }
    };

    // Checks whether the user set this mock response to be an error.
    // If so, throw it to simulate an API error response.
    private _throwOrReturnValue<T>(mockResponse: T): T {
        if (mockResponse instanceof Error) {
            throw mockResponse;
        }
        return mockResponse as T;
    }
}

type AddressType = 'p2sh' | 'p2pkh';

/**
 * Object where we store expected the values we want to get when
 * we make ChronikClient calls
 */
interface MockChronikClientMockedResponses {
    block: { [key: string | number]: Block | Error };
    blockTxs: { [key: string | number]: { history: Tx[] | Error } };
    tx: { [key: string | number]: Tx | Error };
    token: { [key: string | number]: TokenInfo | Error };
    broadcastTx: { [key: string | number]: { txid: string } | Error };
    blockchainInfo: BlockchainInfo | Error | {};
    chronikInfo: { version: string } | Error;
    script: {
        p2pkh: {
            [key: string | number]: {
                history: Tx[] | Error;
                utxos: ScriptUtxo[] | Error;
            };
        };
        p2sh: {
            [key: string | number]: {
                history: Tx[] | Error;
                utxos: ScriptUtxo[] | Error;
            };
        };
    };
    address: {
        [key: string | number]: {
            history: Tx[] | Error;
            utxos: ScriptUtxo[] | Error;
        };
    };
    tokenId: {
        [key: string | number]: {
            history: Tx[] | Error;
            // Note that getting utxo by tokenId returns a utxo with script as a key
            utxos: Utxo[] | Error;
        };
    };
    lokadId: {
        [key: string | number]: {
            history: Tx[] | Error;
            utxos: ScriptUtxo[] | Error;
        };
    };
}

/**
 * Object where we store "deeper" methods
 * ChronikClient API supports methods that take params
 * So, when we call chronik.address(address).utxos, we
 * want the utxos for that address
 * And we want to also be able to set and get utxos for
 * another address in the mock
 */
interface MockChronikClientMockedMethods {
    script: {
        p2pkh: {
            [key: string]: {
                history: (
                    pageNumer?: number,
                    pageSize?: number,
                ) => Promise<TxHistoryPage | Error>;
                utxos: () => Promise<ScriptUtxos | Error>;
            };
        };
        p2sh: {
            [key: string]: {
                history: (
                    pageNumer?: number,
                    pageSize?: number,
                ) => Promise<TxHistoryPage | Error>;
                utxos: () => Promise<ScriptUtxos | Error>;
            };
        };
    };
    address: {
        [key: string]: {
            history: (
                pageNumer?: number,
                pageSize?: number,
            ) => Promise<TxHistoryPage | Error>;
            utxos: () => Promise<ScriptUtxos | Error>;
        };
    };
    tokenId: {
        [key: string]: {
            history: (
                pageNumer?: number,
                pageSize?: number,
            ) => Promise<TxHistoryPage | Error>;
            utxos: () => Promise<TokenIdUtxos | Error>;
        };
    };
    lokadId: {
        [key: string]: {
            history: (
                pageNumer?: number,
                pageSize?: number,
            ) => Promise<TxHistoryPage | Error>;
        };
    };
}

/**
 * MockChronikClient
 * Drop-in replacement for ChronikClient in unit tests
 *
 * See Cashtab, token-server, ecash-herald for implementation
 *
 * Can set expected return values to test ChronikClient functions
 * without hitting an API
 */
export class MockChronikClient {
    mockedResponses: MockChronikClientMockedResponses;
    mockedMethods: MockChronikClientMockedMethods;

    constructor() {
        // API call mock return objects
        // Can be set with self.setMock
        this.mockedResponses = {
            block: {},
            blockTxs: {},
            tx: {},
            token: {},
            blockchainInfo: {},
            chronikInfo: { version: 'unset' },
            address: {},
            tokenId: {},
            lokadId: {},
            script: { p2sh: {}, p2pkh: {} },
            broadcastTx: {},
        };
        this.mockedMethods = {
            script: { p2pkh: {}, p2sh: {} },
            address: {},
            tokenId: {},
            lokadId: {},
        };
    }

    // Public methods from ChronikClient that are mocked by MockChronikClient
    // Note that there are often peculiar / specific ways to set these mocks
    // See tests for examples
    block = async (blockHashOrHeight: string | number) => {
        return this._throwOrReturnValue(
            this.mockedResponses.block[blockHashOrHeight],
        );
    };

    tx = async (txid: string) => {
        return this._throwOrReturnValue(this.mockedResponses.tx[txid]);
    };

    token = async (tokenId: string) => {
        return this._throwOrReturnValue(this.mockedResponses.token[tokenId]);
    };

    blockTxs = async (
        hashOrHeight: number | string,
        pageNumber = 0,
        pageSize = CHRONIK_DEFAULT_PAGESIZE,
    ) => {
        if (
            this.mockedResponses.blockTxs[hashOrHeight].history instanceof Error
        ) {
            throw this.mockedResponses.blockTxs[hashOrHeight].history;
        }
        return this._getTxHistory(
            pageNumber,
            pageSize,
            this.mockedResponses.blockTxs[hashOrHeight].history as Tx[],
        );
    };

    broadcastTx = async (txHex: string) => {
        return this._throwOrReturnValue(
            this.mockedResponses.broadcastTx[txHex],
        );
    };
    broadcastTxs = async (txsHex: string[]) => {
        const returns = [];
        for (const txHex of txsHex) {
            if (this.mockedResponses.broadcastTx[txHex] instanceof Error) {
                throw this.mockedResponses.broadcastTx[txHex];
            } else {
                returns.push(this.mockedResponses.broadcastTx[txHex]);
            }
        }
        return returns;
    };
    blockchainInfo = async () => {
        return this._throwOrReturnValue(this.mockedResponses.blockchainInfo);
    };

    // Return assigned script mocks
    script = (type: AddressType, hash: string) => {
        return this.mockedMethods.script[type][hash];
    };

    // Return assigned address mocked methods
    address = (address: string) => {
        return this.mockedMethods.address[address];
    };

    // Return assigned tokenId mocked methods
    tokenId = (tokenId: string) => {
        return this.mockedMethods.tokenId[tokenId];
    };

    // Return assigned lokadId mocked methods
    lokadId = (lokadId: string) => {
        return this.mockedMethods.lokadId[lokadId];
    };

    // Websocket mocks
    ws = (wsConfig: WsConfig) => {
        const returnedWs = new MockWsEndpoint(wsConfig);
        return returnedWs;
    };

    setBlock = (hashOrHeight: string | number, block: Block | Error) => {
        this.mockedResponses.block[hashOrHeight] = block;
    };

    setTx = (txid: string, tx: Tx | Error) => {
        this.mockedResponses.tx[txid] = tx;
    };

    setToken = (tokenId: string, token: TokenInfo | Error) => {
        this.mockedResponses.token[tokenId] = token;
    };

    setBlockchainInfo = (blockchainInfo: BlockchainInfo | Error) => {
        this.mockedResponses.blockchainInfo = blockchainInfo;
    };

    setChronikInfo = (versionInfo: { version: string } | Error) => {
        this.mockedResponses.chronikInfo = versionInfo;
    };
    chronikInfo = async () => {
        return this._throwOrReturnValue(this.mockedResponses.chronikInfo);
    };

    setBroadcastTx = (rawTx: string, txidOrError: string | Error) => {
        this.mockedResponses.broadcastTx[rawTx] =
            typeof txidOrError === 'string'
                ? { txid: txidOrError }
                : txidOrError;
    };

    setTxHistoryByScript = (
        type: AddressType,
        hash: string,
        history: Tx[] | Error,
    ) => {
        this._setScript(type, hash);
        this.mockedResponses.script[type][hash].history = history;
    };

    setTxHistoryByAddress = (address: string, history: Tx[] | Error) => {
        this._setAddress(address);
        this.mockedResponses.address[address].history = history;
    };

    setTxHistoryByTokenId = (tokenId: string, history: Tx[] | Error) => {
        this._setTokenId(tokenId);
        this.mockedResponses.tokenId[tokenId].history = history;
    };

    setTxHistoryByLokadId = (lokadId: string, history: Tx[] | Error) => {
        this._setLokadId(lokadId);
        this.mockedResponses.lokadId[lokadId].history = history;
    };

    setTxHistoryByBlock = (
        hashOrHeight: string | number,
        history: Tx[] | Error,
    ) => {
        // Set all expected tx history as array where it can be accessed by mock method
        this.mockedResponses.blockTxs[hashOrHeight] = { history };
    };

    // Set utxos to custom response; must be called after setScript
    setUtxosByScript = (
        type: AddressType,
        hash: string,
        utxos: ScriptUtxo[] | Error,
    ) => {
        this._setScript(type, hash);
        this.mockedResponses.script[type][hash].utxos = utxos;
    };

    // Set utxos to custom response; must be called after setAddress
    setUtxosByAddress = (address: string, utxos: ScriptUtxo[] | Error) => {
        this._setAddress(address);
        this.mockedResponses.address[address].utxos = utxos;
    };

    // Set utxos to custom response; must be called after setTokenId
    setUtxosByTokenId = (tokenId: string, utxos: Utxo[] | Error) => {
        this._setTokenId(tokenId);
        this.mockedResponses.tokenId[tokenId].utxos = utxos;
    };

    // We need to give mockedChronik a plugin function
    // This is required for creating a new Agora(mockedChronik)
    plugin = () => 'dummy plugin';
    // Dummy values not supported by MockChronikClient
    private _proxyInterface: unknown = {};
    proxyInterface = {};
    // Methods not supported by MockChronikClient
    blocks = () => {
        console.info('MockChronikClient does not support blocks');
    };
    rawTx = () => {
        console.info('MockChronikClient does not support rawTx');
    };

    // Allow users to set expected chronik address call responses
    private _setAddress(address: string) {
        // Do not overwrite existing history, but initialize if nothing is there
        if (typeof this.mockedResponses.address[address] === 'undefined') {
            this.mockedResponses.address[address] = {
                history: [],
                utxos: [],
            };
        }

        this.mockedMethods.address[address] = {
            history: async (
                pageNumber = 0,
                pageSize = CHRONIK_DEFAULT_PAGESIZE,
            ): Promise<TxHistoryPage> => {
                if (
                    this.mockedResponses.address[address].history instanceof
                    Error
                ) {
                    throw this.mockedResponses.address[address].history;
                }
                return this._getTxHistory(
                    pageNumber,
                    pageSize,
                    this.mockedResponses.address[address].history as Tx[],
                );
            },
            utxos: async (): Promise<ScriptUtxos> => {
                if (
                    this.mockedResponses.address[address].utxos instanceof Error
                ) {
                    throw this.mockedResponses.address[address].utxos;
                }
                return this._getAddressUtxos(
                    address,
                    this.mockedResponses.address[address].utxos as ScriptUtxo[],
                );
            },
        };
    }

    // Allow users to set expected chronik tokenId call responses
    private _setTokenId(tokenId: string) {
        if (typeof this.mockedResponses.tokenId[tokenId] === 'undefined') {
            this.mockedResponses.tokenId[tokenId] = {
                history: [],
                utxos: [],
            };
        }

        this.mockedMethods.tokenId[tokenId] = {
            history: async (
                pageNumber = 0,
                pageSize = CHRONIK_DEFAULT_PAGESIZE,
            ): Promise<TxHistoryPage> => {
                if (
                    this.mockedResponses.tokenId[tokenId].history instanceof
                    Error
                ) {
                    throw this.mockedResponses.tokenId[tokenId].history;
                }
                return this._getTxHistory(
                    pageNumber,
                    pageSize,
                    this.mockedResponses.tokenId[tokenId].history as Tx[],
                );
            },
            utxos: async (): Promise<TokenIdUtxos> => {
                if (
                    this.mockedResponses.tokenId[tokenId].utxos instanceof Error
                ) {
                    throw this.mockedResponses.tokenId[tokenId].utxos;
                }
                return this._getTokenIdUtxos(
                    tokenId,
                    this.mockedResponses.tokenId[tokenId].utxos as Utxo[],
                );
            },
        };
    }

    // Allow users to set expected chronik lokadId call responses
    private _setLokadId(lokadId: string) {
        if (typeof this.mockedResponses.lokadId[lokadId] === 'undefined') {
            this.mockedResponses.lokadId[lokadId] = {
                history: [],
                utxos: [],
            };
        }

        this.mockedMethods.lokadId[lokadId] = {
            history: async (
                pageNumber = 0,
                pageSize = CHRONIK_DEFAULT_PAGESIZE,
            ): Promise<TxHistoryPage> => {
                if (
                    this.mockedResponses.lokadId[lokadId].history instanceof
                    Error
                ) {
                    throw this.mockedResponses.lokadId[lokadId].history;
                }
                return this._getTxHistory(
                    pageNumber,
                    pageSize,
                    this.mockedResponses.lokadId[lokadId].history as Tx[],
                );
            },
        };
    }

    private _setScript(type: AddressType, hash: string) {
        if (typeof this.mockedResponses.script[type][hash] === 'undefined') {
            this.mockedResponses.script[type][hash] = {
                history: [],
                utxos: [],
            };
        }

        this.mockedMethods.script[type][hash] = {
            history: async (
                pageNumber = 0,
                pageSize = CHRONIK_DEFAULT_PAGESIZE,
            ): Promise<TxHistoryPage> => {
                if (
                    this.mockedResponses.script[type][hash].history instanceof
                    Error
                ) {
                    throw this.mockedResponses.script[type][hash].history;
                }
                return this._getTxHistory(
                    pageNumber,
                    pageSize,
                    this.mockedResponses.script[type][hash].history as Tx[],
                );
            },
            utxos: async (): Promise<ScriptUtxos> => {
                if (
                    this.mockedResponses.script[type][hash].utxos instanceof
                    Error
                ) {
                    throw this.mockedResponses.script[type][hash].utxos;
                }
                return this._getScriptUtxos(
                    type,
                    hash,
                    this.mockedResponses.script[type][hash]
                        .utxos as ScriptUtxo[],
                );
            },
        };
    }

    private _getScriptUtxos(
        type: AddressType,
        hash: string,
        utxos: ScriptUtxo[],
    ): ScriptUtxos {
        const outputScript = getOutputScriptFromAddress(
            encodeCashAddress('ecash', type, hash),
        );
        return { outputScript, utxos };
    }

    private _getAddressUtxos(
        address: string,
        utxos: ScriptUtxo[],
    ): ScriptUtxos {
        const outputScript = getOutputScriptFromAddress(address);
        return { outputScript, utxos };
    }
    private _getTokenIdUtxos(tokenId: string, utxos: Utxo[]): TokenIdUtxos {
        return { tokenId, utxos };
    }

    // Method to get paginated tx history with same variables as chronik
    private _getTxHistory(pageNumber = 0, pageSize: number, history: Tx[]) {
        // Return chronik shaped responses
        const startSliceOnePage = pageNumber * pageSize;
        const endSliceOnePage = startSliceOnePage + pageSize;
        const thisPage = history.slice(startSliceOnePage, endSliceOnePage);
        const response: TxHistoryPage = {
            txs: [],
            numPages: 0,
            numTxs: 0,
        };

        response.txs = thisPage;
        response.numPages = Math.ceil(history.length / pageSize);
        response.numTxs = history.length;
        return response;
    }

    // Checks whether the user set this mock response to be an error.
    // If so, throw it to simulate an API error response.
    private _throwOrReturnValue<T>(mockResponse: T): T {
        if (mockResponse instanceof Error) {
            throw mockResponse;
        }
        return mockResponse as T;
    }
}

interface WsSubscriptions {
    /** Subscriptions to scripts */
    scripts: WsSubScriptClient[];
    /** Subscriptions to tokens by tokenId */
    tokens: string[];
    /** Subscriptions to lokadIds */
    lokadIds: string[];
    /** Subscriptions to plugins */
    plugins: WsSubPluginClient[];
    /** Subscription to blocks */
    blocks: boolean;
}
/**
 * Mock WsEndpoint for MockChronikClient.
 * Based on WsEndpoint in chronik-client.
 * We do not test network functionality
 * Useful for testing that methods are called as expected,
 * ws is opened and closed as expected, subscriptions are added
 * and removed as expected
 *
 * See Cashtab and token-server tests for implemented examples
 */
export class MockWsEndpoint {
    /** Fired when a message is sent from the WebSocket. */
    public onMessage?: (msg: WsMsgClient) => void;

    /** Fired when a connection has been (re)established. */
    public onConnect?: (e: ws.Event) => void;

    /**
     * Fired after a connection has been unexpectedly closed, and before a
     * reconnection attempt is made. Only fired if `autoReconnect` is true.
     */
    public onReconnect?: (e: ws.Event) => void;

    /** Fired when an error with the WebSocket occurs. */
    public onError?: (e: ws.ErrorEvent) => void;

    /**
     * Fired after a connection has been manually closed, or if `autoReconnect`
     * is false, if the WebSocket disconnects for any reason.
     */
    public onEnd?: (e: ws.Event) => void;

    /** Whether to automatically reconnect on disconnect, default true. */
    public autoReconnect: boolean;

    public ws: ws.WebSocket | undefined;
    public connected: Promise<ws.Event> | undefined;
    public manuallyClosed: boolean;
    public waitForOpenCalled: boolean;
    public subs: WsSubscriptions;

    constructor(config: WsConfig) {
        this.onMessage = config.onMessage;
        this.onConnect = config.onConnect;
        this.onReconnect = config.onReconnect;
        this.onEnd = config.onEnd;
        this.autoReconnect =
            config.autoReconnect !== undefined ? config.autoReconnect : true;
        this.manuallyClosed = false;

        this.subs = {
            scripts: [],
            tokens: [],
            lokadIds: [],
            plugins: [],
            blocks: false,
        };
        this.waitForOpenCalled = false;
    }

    /** Wait for the WebSocket to be connected. */
    public async waitForOpen() {
        // We just set a flag that tests can use
        this.waitForOpenCalled = true;
        await this.connected;
    }

    /**
     * Subscribe to block messages
     */
    public subscribeToBlocks() {
        this.subs.blocks = true;
        this._subUnsubBlocks(false);
    }

    /**
     * Unsubscribe from block messages
     */
    public unsubscribeFromBlocks() {
        this.subs.blocks = false;
        this._subUnsubBlocks(true);
    }

    /**
     * Subscribe to the given script type and payload.
     * For "p2pkh", `scriptPayload` is the 20 byte public key hash.
     */
    public subscribeToScript(type: AddressType, payload: string) {
        // Build sub according to chronik expected type
        const subscription: WsSubScriptClient = {
            scriptType: type,
            payload,
        };

        this.subs.scripts.push(subscription as WsSubScriptClient);
    }

    /** Unsubscribe from the given script type and payload. */
    public unsubscribeFromScript(type: AddressType, payload: string) {
        // Find the requested unsub script and remove it
        const unsubIndex = this.subs.scripts.findIndex(
            sub => sub.scriptType === type && sub.payload === payload,
        );
        if (unsubIndex === -1) {
            // If we cannot find this subscription in this.subs, throw an error
            // We do not want an app developer thinking they have unsubscribed from something
            throw new Error(`No existing sub at ${type}, ${payload}`);
        }

        // Remove the requested subscription from this.subs
        this.subs.scripts.splice(unsubIndex, 1);
    }

    /**
     * Subscribe to an address
     * Method can be used for p2pkh or p2sh addresses
     */
    public subscribeToAddress(address: string) {
        // Get type and hash
        const { type, hash } = decodeCashAddress(address);

        // Subscribe to script
        this.subscribeToScript(type as 'p2pkh' | 'p2sh', hash as string);
    }

    /** Unsubscribe from the given address */
    public unsubscribeFromAddress(address: string) {
        // Get type and hash
        const { type, hash } = decodeCashAddress(address);

        // Unsubscribe from script
        this.unsubscribeFromScript(type as 'p2pkh' | 'p2sh', hash as string);
    }

    /** Subscribe to a lokadId */
    public subscribeToLokadId(lokadId: string) {
        // Update ws.subs to include this lokadId
        this.subs.lokadIds.push(lokadId);
    }

    /** Unsubscribe from the given lokadId */
    public unsubscribeFromLokadId(lokadId: string) {
        // Find the requested unsub lokadId and remove it
        const unsubIndex = this.subs.lokadIds.findIndex(
            thisLokadId => thisLokadId === lokadId,
        );
        if (unsubIndex === -1) {
            // If we cannot find this subscription in this.subs.lokadIds, throw an error
            // We do not want an app developer thinking they have unsubscribed from something if no action happened
            throw new Error(`No existing sub at lokadId "${lokadId}"`);
        }

        // Remove the requested lokadId subscription from this.subs.lokadIds
        this.subs.lokadIds.splice(unsubIndex, 1);
    }

    /** Subscribe to a tokenId */
    public subscribeToTokenId(tokenId: string) {
        // Update ws.subs to include this tokenId
        this.subs.tokens.push(tokenId);
    }

    /** Unsubscribe from the given tokenId */
    public unsubscribeFromTokenId(tokenId: string) {
        // Find the requested unsub tokenId and remove it
        const unsubIndex = this.subs.tokens.findIndex(
            thisTokenId => thisTokenId === tokenId,
        );
        if (unsubIndex === -1) {
            // If we cannot find this subscription in this.subs.tokens, throw an error
            // We do not want an app developer thinking they have unsubscribed from something if no action happened
            throw new Error(`No existing sub at tokenId "${tokenId}"`);
        }

        // Remove the requested tokenId subscription from this.subs.tokens
        this.subs.tokens.splice(unsubIndex, 1);
    }

    /** Subscribe to a plugin */
    public subscribeToPlugin(pluginName: string, group: string) {
        // Build sub according to chronik expected type
        const subscription: WsSubPluginClient = {
            pluginName,
            group,
        };

        // Update ws.subs to include this plugin
        this.subs.plugins.push(subscription);
    }

    /** Unsubscribe from the given plugin */
    public unsubscribeFromPlugin(pluginName: string, group: string) {
        // Find the requested unsub script and remove it
        const unsubIndex = this.subs.plugins.findIndex(
            sub => sub.pluginName === pluginName && sub.group === group,
        );
        if (unsubIndex === -1) {
            // If we cannot find this subscription in this.subs.plugins, throw an error
            // We do not want an app developer thinking they have unsubscribed from something
            throw new Error(
                `No existing sub at pluginName="${pluginName}", group="${group}"`,
            );
        }

        // Remove the requested subscription from this.subs.plugins
        this.subs.plugins.splice(unsubIndex, 1);
    }

    /**
     * Close the WebSocket connection and prevent any future reconnection
     * attempts.
     */
    public close() {
        this.manuallyClosed = true;
        this.ws?.close();
    }

    private _subUnsubBlocks(isUnsub: boolean) {
        // Blocks subscription is empty object
        this.subs.blocks = !isUnsub;
    }
}
