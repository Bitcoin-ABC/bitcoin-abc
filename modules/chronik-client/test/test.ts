// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { WebSocket, WebSocketServer } from 'ws';
import * as proto from '../proto/chronik';
import { ChronikClient, WsEndpoint } from '../src/ChronikClient';
import { FailoverProxy, appendWsUrls } from '../src/failoverProxy';
import { toHex } from '../src/hex';
import { isValidWsSubscription } from '../src/validation';
import vectors from './vectors';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('FailoverProxy', () => {
    it('appendWsUrls combines an object array of valid urls with wsUrls', () => {
        const urls = [
            'https://chronik.be.cash/xec',
            'https://chronik.fabien.cash',
            'https://chronik2.fabien.cash',
        ];
        const expectedResult = [
            {
                url: 'https://chronik.be.cash/xec',
                wsUrl: 'wss://chronik.be.cash/xec/ws',
            },
            {
                url: 'https://chronik.fabien.cash',
                wsUrl: 'wss://chronik.fabien.cash/ws',
            },
            {
                url: 'https://chronik2.fabien.cash',
                wsUrl: 'wss://chronik2.fabien.cash/ws',
            },
        ];
        expect(appendWsUrls(urls)).to.eql(expectedResult);
    });
    it('appendWsUrls combines an array of mixed valid https and http urls with wsUrls', () => {
        const urls = [
            'https://chronik.be.cash/xec',
            'http://chronik.fabien.cash',
            'https://chronik2.fabien.cash',
        ];
        const expectedResult = [
            {
                url: 'https://chronik.be.cash/xec',
                wsUrl: 'wss://chronik.be.cash/xec/ws',
            },
            {
                url: 'http://chronik.fabien.cash',
                wsUrl: 'ws://chronik.fabien.cash/ws',
            },
            {
                url: 'https://chronik2.fabien.cash',
                wsUrl: 'wss://chronik2.fabien.cash/ws',
            },
        ];
        expect(appendWsUrls(urls)).to.eql(expectedResult);
    });
    it('appendWsUrls returns an empty array for an empty input', () => {
        expect(appendWsUrls([])).to.eql([]);
    });
    it('appendWsUrls throws error on an invalid regular endpoint', () => {
        const oneBrokenUrl = [
            'https://chronik.fabien.cash',
            'not-a-valid-url',
            'https://chronik2.fabien.cash',
        ];
        expect(() => appendWsUrls(oneBrokenUrl)).to.throw(
            `Invalid url found in array: ${oneBrokenUrl[1]}`,
        );
    });
    it('FailoverProxy instantiates with a valid url array', () => {
        const urls = [
            'https://chronik.be.cash/xec',
            'http://chronik.fabien.cash',
            'https://chronik2.fabien.cash',
        ];
        const proxyInterface = new FailoverProxy(urls);
        const expectedProxyArray = [
            {
                url: 'https://chronik.be.cash/xec',
                wsUrl: 'wss://chronik.be.cash/xec/ws',
            },
            {
                url: 'http://chronik.fabien.cash',
                wsUrl: 'ws://chronik.fabien.cash/ws',
            },
            {
                url: 'https://chronik2.fabien.cash',
                wsUrl: 'wss://chronik2.fabien.cash/ws',
            },
        ];
        expect(proxyInterface.getEndpointArray()).to.eql(expectedProxyArray);
    });
    it('FailoverProxy constructor throws error on an invalid regular endpoint', () => {
        const oneBrokenUrl = [
            'https://chronik.fabien.cash',
            'not-a-valid-url',
            'https://chronik2.fabien.cash',
        ];
        expect(() => new FailoverProxy(oneBrokenUrl)).to.throw(
            "`url` must start with 'https://' or 'http://', got: " +
                oneBrokenUrl[1],
        );
    });
});

describe('deriveEndpointIndex', () => {
    it('deriveEndpointIndex iterates through a four element array with default working index', () => {
        const testArray = [
            'https://chronik.be.cash/xec',
            'http://chronik.fabien.cash',
            'https://chronik2.fabien.cash',
            'https://chronik3.fabien.cash',
        ];
        const proxyInterface = new FailoverProxy(testArray);

        const indexOrder = [];
        for (let i = 0; i < testArray.length; i += 1) {
            indexOrder.push(proxyInterface.deriveEndpointIndex(i));
        }
        expect(indexOrder).to.eql([0, 1, 2, 3]);
    });
    it('deriveEndpointIndex iterates through a four element array with working index set to 3', () => {
        const testArray = [
            'https://chronik.be.cash/xec',
            'http://chronik.fabien.cash',
            'https://chronik2.fabien.cash',
            'https://chronik3.fabien.cash',
        ];
        const proxyInterface = new FailoverProxy(testArray);

        // Override the working index to 3
        proxyInterface.setWorkingIndex(3);

        const indexOrder = [];
        for (let i = 0; i < testArray.length; i += 1) {
            indexOrder.push(proxyInterface.deriveEndpointIndex(i));
        }
        expect(indexOrder).to.eql([3, 0, 1, 2]);
    });
});

describe('isValidWsSubscription', () => {
    const { expectedReturns } = vectors.isValidWsSubscription;

    expectedReturns.forEach(expectedReturn => {
        const { description, subscription, result } = expectedReturn;
        it(`isValidWsSubscription: ${description}`, () => {
            expect(isValidWsSubscription(subscription)).to.eql(result);
        });
    });
});

describe('FailoverProxy.connectWs failover', () => {
    it('should cycle workingIndex through all endpoints on consecutive ws onclose', async () => {
        const urls = [
            'https://chronik1.alitayin.com',
            'https://chronik2.alitayin.com',
            'https://chronik3.alitayin.com',
            'https://chronik4.alitayin.com',
        ];
        const proxy = new FailoverProxy(urls);

        const originalConnectWs = proxy.connectWs;

        // This function prevents subsequent calls to connectWS from onclose handler - only the first call will execute
        let connectWsCallCount = 0;
        proxy.connectWs = async function (endpoint) {
            connectWsCallCount++;
            if (connectWsCallCount === 1) {
                return originalConnectWs.call(proxy, endpoint);
            }
            return Promise.resolve();
        };

        proxy['_websocketUrlConnects'] = async (_wsUrl: string) => {
            return true;
        };

        const wsEndpoint: any = {
            manuallyClosed: false,
            autoReconnect: true,
            subs: { scripts: [], lokadIds: [], tokens: [], blocks: false },
            _resubscribeAll: () => {},
        };

        await proxy.connectWs(wsEndpoint);
        expect(proxy['deriveEndpointIndex'](0)).to.equal(0);

        // Trigger onclose to update index
        wsEndpoint.ws.onclose({} as any);
        expect(proxy['deriveEndpointIndex'](0)).to.equal(1);

        wsEndpoint.ws.onclose({} as any);
        expect(proxy['deriveEndpointIndex'](0)).to.equal(2);

        wsEndpoint.ws.onclose({} as any);
        expect(proxy['deriveEndpointIndex'](0)).to.equal(3);

        wsEndpoint.ws.onclose({} as any);
        expect(proxy['deriveEndpointIndex'](0)).to.equal(0);

        if (wsEndpoint.ws) {
            wsEndpoint.ws.close();
            wsEndpoint.ws = null;
        }
    });
});

describe('FailoverProxy.connectWs with manuallyClosed', () => {
    it('should not cycle workingIndex when manuallyClosed is true', async () => {
        const urls = [
            'https://chronik4.alitayin.com',
            'https://chronik2.alitayin.com',
            'https://chronik3.alitayin.com',
            'https://chronik1.alitayin.com',
        ];
        const proxy = new FailoverProxy(urls);

        const originalConnectWs = proxy.connectWs;

        let connectWsCallCount = 0;
        proxy.connectWs = async function (endpoint) {
            connectWsCallCount++;
            if (connectWsCallCount === 1) {
                return originalConnectWs.call(proxy, endpoint);
            }
            return Promise.resolve();
        };

        proxy['_websocketUrlConnects'] = async (_wsUrl: string) => {
            return true;
        };

        const wsEndpoint: any = {
            manuallyClosed: false,
            autoReconnect: true,
            subs: { scripts: [], lokadIds: [], tokens: [], blocks: false },
            _resubscribeAll: () => {},
        };

        await proxy.connectWs(wsEndpoint);
        expect(proxy['deriveEndpointIndex'](0)).to.equal(0);

        wsEndpoint.ws.onclose({} as any);
        expect(proxy['deriveEndpointIndex'](0)).to.equal(1);

        wsEndpoint.manuallyClosed = true;

        wsEndpoint.ws.onclose({} as any);
        expect(proxy['deriveEndpointIndex'](0)).to.equal(1);

        wsEndpoint.ws.onclose({} as any);
        expect(proxy['deriveEndpointIndex'](0)).to.equal(1);

        if (wsEndpoint.ws) {
            wsEndpoint.ws.close();
            wsEndpoint.ws = null;
        }
    });
});

describe('WsEndpoint._resubscribeAll', () => {
    const SCRIPT_PAYLOAD = 'b8ae1c47effb58f72f7bca819fe7fc252f9e852e';
    const PLUGIN_NAME = 'my_plugin';
    const PLUGIN_GROUP = Buffer.from('a').toString('hex');

    // isomorphic-ws / browser WebSocket readyState values
    const WS_OPEN = 1;
    const WS_CLOSED = 3;

    const mockOpenWs = (sent: Uint8Array[]) =>
        ({
            readyState: WS_OPEN,
            send: (data: Uint8Array) => {
                sent.push(data);
            },
            close: function (this: { readyState: number }) {
                this.readyState = WS_CLOSED;
            },
        }) as any;

    const openWsEndpoint = () => {
        const chronik = new ChronikClient(['https://chronik.example.com']);
        const wsEndpoint = chronik.ws({});
        const sent: Uint8Array[] = [];
        wsEndpoint.ws = mockOpenWs(sent);
        return { wsEndpoint, sent };
    };

    const stubConnectWsOnResume = (
        wsEndpoint: WsEndpoint,
        sent: Uint8Array[],
        onOpen: (endpoint: WsEndpoint) => void,
    ) => {
        const proxy = (wsEndpoint as any)._proxyInterface;
        proxy.connectWs = async (endpoint: WsEndpoint) => {
            endpoint.ws = mockOpenWs(sent);
            onOpen(endpoint);
            endpoint.connected = Promise.resolve({} as any);
        };
    };

    const decodeSent = (sent: Uint8Array[]) =>
        sent.map(frame => proto.WsSub.decode(frame));

    it('does not grow this.subs after three reconnects and re-sends plugin frames', () => {
        const { wsEndpoint, sent } = openWsEndpoint();

        wsEndpoint.subscribeToScript('p2pkh', SCRIPT_PAYLOAD);
        wsEndpoint.subscribeToPlugin(PLUGIN_NAME, PLUGIN_GROUP);

        expect(wsEndpoint.subs.scripts).to.have.length(1);
        expect(wsEndpoint.subs.plugins).to.have.length(1);
        expect(sent).to.have.length(2);

        for (let i = 0; i < 3; i += 1) {
            wsEndpoint._resubscribeAll();
        }

        expect(wsEndpoint.subs.scripts).to.deep.equal([
            { scriptType: 'p2pkh', payload: SCRIPT_PAYLOAD },
        ]);
        expect(wsEndpoint.subs.plugins).to.deep.equal([
            { pluginName: PLUGIN_NAME, group: PLUGIN_GROUP },
        ]);

        // 1 initial subscribe + 3 reconnects for each kind
        expect(sent).to.have.length(8);

        const frames = decodeSent(sent);
        const pluginFrames = frames.filter(
            frame => typeof frame.plugin !== 'undefined',
        );
        const scriptFrames = frames.filter(
            frame => typeof frame.script !== 'undefined',
        );
        expect(pluginFrames).to.have.length(4);
        expect(scriptFrames).to.have.length(4);
        pluginFrames.forEach(frame => {
            expect(frame.isUnsub).to.equal(false);
            expect(frame.plugin?.pluginName).to.equal(PLUGIN_NAME);
            expect(toHex(frame.plugin!.group)).to.equal(PLUGIN_GROUP);
        });
        scriptFrames.forEach(frame => {
            expect(frame.isUnsub).to.equal(false);
            expect(frame.script?.scriptType).to.equal('p2pkh');
            expect(toHex(frame.script!.payload)).to.equal(SCRIPT_PAYLOAD);
        });
    });

    it('pause/resume via _resubscribeAll does not grow this.subs', async () => {
        const { wsEndpoint, sent } = openWsEndpoint();

        wsEndpoint.subscribeToScript('p2pkh', SCRIPT_PAYLOAD);
        wsEndpoint.subscribeToPlugin(PLUGIN_NAME, PLUGIN_GROUP);

        stubConnectWsOnResume(wsEndpoint, sent, endpoint =>
            endpoint._resubscribeAll(),
        );

        for (let i = 0; i < 3; i += 1) {
            wsEndpoint.pause();
            await wsEndpoint.resume();
        }

        expect(wsEndpoint.subs.scripts).to.have.length(1);
        expect(wsEndpoint.subs.plugins).to.have.length(1);
        const pluginFrames = decodeSent(sent).filter(
            frame => typeof frame.plugin !== 'undefined',
        );
        expect(pluginFrames).to.have.length(4);
    });
});

describe('WsEndpoint malformed frame', () => {
    const waitFor = async (predicate: () => boolean) => {
        const started = Date.now();
        while (!predicate()) {
            if (Date.now() - started > 1000) {
                throw new Error('timed out');
            }
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    };

    it('closes the socket and reconnects when a frame cannot be decoded', async () => {
        const wss = new WebSocketServer({ port: 0, host: '127.0.0.1' });
        await new Promise<void>(resolve => {
            wss.on('listening', () => resolve());
        });
        const address = wss.address();
        if (address === null || typeof address === 'string') {
            throw new Error('expected a TCP listen address');
        }

        const chronik = new ChronikClient([`http://127.0.0.1:${address.port}`]);
        const delivered: string[] = [];
        const endpoint = chronik.ws({
            onMessage: msg => {
                if (msg.type === 'Tx') {
                    delivered.push(msg.txid);
                }
            },
        });
        const proxy = chronik.proxyInterface();
        proxy['_websocketUrlConnects'] = async () => true;

        const originalConnectWs = proxy.connectWs.bind(proxy);
        let connectWsCallCount = 0;
        proxy.connectWs = async (ep: WsEndpoint) => {
            connectWsCallCount += 1;
            if (connectWsCallCount === 1) {
                return originalConnectWs(ep);
            }
        };

        const rejections: unknown[] = [];
        const onRejection = (reason: unknown) => {
            rejections.push(reason);
        };
        const originalConsoleError = console.error;
        console.error = () => {};
        process.on('unhandledRejection', onRejection);

        let serverSocket: import('ws').WebSocket | undefined;
        const serverConnected = new Promise<void>(resolve => {
            wss.once('connection', socket => {
                serverSocket = socket;
                resolve();
            });
        });

        try {
            await proxy.connectWs(endpoint);
            await endpoint.connected;
            await serverConnected;
            if (serverSocket === undefined) {
                throw new Error(
                    'websocket server did not accept the connection',
                );
            }

            const goodFrame = proto.WsMsg.encode({
                tx: {
                    msgType: proto.TxMsgType.TX_ADDED_TO_MEMPOOL,
                    txid: new Uint8Array(32).fill(0xab),
                    finalizationReason: undefined,
                },
            }).finish();
            serverSocket.send(goodFrame);
            await waitFor(() => delivered.length === 1);
            expect(delivered).to.eql(['ab'.repeat(32)]);
            expect(connectWsCallCount).to.equal(1);

            serverSocket.send(Buffer.from([0xff, 0xff, 0xff]));
            await waitFor(() => connectWsCallCount === 2);
            await new Promise(resolve => setImmediate(resolve));

            expect(rejections).to.eql([]);
            expect(delivered).to.eql(['ab'.repeat(32)]);
            expect(endpoint.manuallyClosed).to.equal(false);
        } finally {
            process.off('unhandledRejection', onRejection);
            console.error = originalConsoleError;
            endpoint.manuallyClosed = true;
            endpoint.ws?.close();
            await new Promise<void>((resolve, reject) => {
                wss.close(err => (err ? reject(err) : resolve()));
            });
        }
    });

    it('does not reconnect when the application callback throws', async () => {
        const wss = new WebSocketServer({ port: 0, host: '127.0.0.1' });
        await new Promise<void>(resolve => {
            wss.on('listening', () => resolve());
        });
        const address = wss.address();
        if (address === null || typeof address === 'string') {
            throw new Error('expected a TCP listen address');
        }

        const chronik = new ChronikClient([`http://127.0.0.1:${address.port}`]);
        const endpoint = chronik.ws({
            onMessage: () => {
                throw new Error('app failed');
            },
        });
        const proxy = chronik.proxyInterface();
        proxy['_websocketUrlConnects'] = async () => true;

        const originalConnectWs = proxy.connectWs.bind(proxy);
        let connectWsCallCount = 0;
        proxy.connectWs = async (ep: WsEndpoint) => {
            connectWsCallCount += 1;
            if (connectWsCallCount === 1) {
                return originalConnectWs(ep);
            }
        };

        const rejections: unknown[] = [];
        const onRejection = (reason: unknown) => {
            rejections.push(reason);
        };
        const originalConsoleError = console.error;
        console.error = () => {};
        process.on('unhandledRejection', onRejection);

        let serverSocket: import('ws').WebSocket | undefined;
        const serverConnected = new Promise<void>(resolve => {
            wss.once('connection', socket => {
                serverSocket = socket;
                resolve();
            });
        });

        try {
            await proxy.connectWs(endpoint);
            await endpoint.connected;
            await serverConnected;
            if (serverSocket === undefined) {
                throw new Error(
                    'websocket server did not accept the connection',
                );
            }

            const goodFrame = proto.WsMsg.encode({
                tx: {
                    msgType: proto.TxMsgType.TX_ADDED_TO_MEMPOOL,
                    txid: new Uint8Array(32).fill(0xab),
                    finalizationReason: undefined,
                },
            }).finish();
            serverSocket.send(goodFrame);
            await new Promise(resolve => setTimeout(resolve, 30));

            expect(rejections).to.eql([]);
            expect(connectWsCallCount).to.equal(1);
            expect(endpoint.ws?.readyState).to.equal(WebSocket.OPEN);
            expect(endpoint.manuallyClosed).to.equal(false);
        } finally {
            process.off('unhandledRejection', onRejection);
            console.error = originalConsoleError;
            endpoint.manuallyClosed = true;
            endpoint.ws?.close();
            await new Promise<void>((resolve, reject) => {
                wss.close(err => (err ? reject(err) : resolve()));
            });
        }
    });

    it('closes the socket that delivered the frame, not a later replacement', async () => {
        const chronik = new ChronikClient(['https://chronik.example.com']);
        const endpoint = chronik.ws({
            onMessage: () => {},
        });
        let replacementClosed = false;
        const replacement = {
            close: () => {
                replacementClosed = true;
            },
        };
        let sourceClosed = false;
        const source = {
            close: () => {
                sourceClosed = true;
            },
        };
        const originalConsoleError = console.error;
        console.error = () => {};
        const globalWithWindow = globalThis as { window?: unknown };
        const previousWindow = globalWithWindow.window;
        globalWithWindow.window = {};
        try {
            const frame = {
                data: {
                    arrayBuffer: async () => {
                        endpoint.ws = replacement as NonNullable<
                            WsEndpoint['ws']
                        >;
                        return new Uint8Array([0xff, 0xff, 0xff]).buffer;
                    },
                },
            } as Parameters<WsEndpoint['handleMsg']>[0];
            await endpoint.handleMsg(
                frame,
                source as NonNullable<WsEndpoint['ws']>,
            );
            expect(sourceClosed).to.equal(true);
            expect(replacementClosed).to.equal(false);
            expect(endpoint.manuallyClosed).to.equal(false);
        } finally {
            console.error = originalConsoleError;
            if (previousWindow === undefined) {
                delete globalWithWindow.window;
            } else {
                globalWithWindow.window = previousWindow;
            }
        }
    });
});
