// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { FailoverProxy, appendWsUrls } from '../src/failoverProxy';
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
