// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import rewire from 'rewire';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { FailoverProxy, appendWsUrls } from '../src/failoverProxy';
import { isValidWsSubscription } from '../src/validation';
import vectors from './vectors';

// --- Rewire Setup ---
const chronikClientModule = rewire('../src/ChronikClient');
const sortNodesByLatency = chronikClientModule.__get__('sortNodesByLatency');

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

describe('useStrategy functionality tests', () => {
    const originalMeasureWebsocketLatency = chronikClientModule.__get__(
        'measureWebsocketLatency',
    );

    afterEach(() => {
        chronikClientModule.__set__(
            'measureWebsocketLatency',
            originalMeasureWebsocketLatency,
        );
    });

    it('sortNodesByLatency returns original order when all nodes timeout', async () => {
        const urls = [
            'https://chronik1.alitayin.com',
            'https://chronik2.alitayin.com',
            'https://chronik3.alitayin.com',
            'https://chronik4.alitayin.com',
            'https://chronik5.alitayin.com',
        ];

        chronikClientModule.__set__('measureWebsocketLatency', async () => {
            return Infinity;
        });

        const sortedUrls = await sortNodesByLatency(urls);

        expect(sortedUrls).to.deep.equal(urls);
    });

    it('sortNodesByLatency correctly sorts nodes by latency', async () => {
        const urls = [
            'https://chronik1.alitayin.com',
            'https://chronik2.alitayin.com',
            'https://chronik3.alitayin.com',
            'https://chronik4.alitayin.com',
            'https://chronik5.alitayin.com',
        ];

        chronikClientModule.__set__(
            'measureWebsocketLatency',
            async (wsUrl: string) => {
                if (wsUrl.includes('chronik3.alitayin.com')) return 50;
                if (wsUrl.includes('chronik1.alitayin.com')) return 100;
                if (wsUrl.includes('chronik5.alitayin.com')) return 100;
                return Infinity;
            },
        );

        const sortedUrls = await sortNodesByLatency(urls);

        expect(sortedUrls).to.deep.equal([
            'https://chronik3.alitayin.com',
            'https://chronik1.alitayin.com',
            'https://chronik5.alitayin.com',
            'https://chronik2.alitayin.com',
            'https://chronik4.alitayin.com',
        ]);
    });

    it('ChronikClient.useStrategy correctly uses sorted URLs with ClosestFirst strategy', async () => {
        const urls = [
            'https://chronik1.alitayin.com',
            'https://chronik2.alitayin.com',
            'https://chronik3.alitayin.com',
            'https://chronik4.alitayin.com',
            'https://chronik5.alitayin.com',
        ];

        chronikClientModule.__set__(
            'measureWebsocketLatency',
            async (wsUrl: string) => {
                if (wsUrl.includes('chronik3.alitayin.com')) return 50;
                if (wsUrl.includes('chronik1.alitayin.com')) return 100;
                if (wsUrl.includes('chronik4.alitayin.com')) return 100;
                return Infinity;
            },
        );

        const client = await chronikClientModule
            .__get__('ChronikClient')
            .useStrategy(
                chronikClientModule.__get__('ConnectionStrategy').ClosestFirst,
                urls,
            );

        const expectedOrder = [
            'https://chronik3.alitayin.com',
            'https://chronik1.alitayin.com',
            'https://chronik4.alitayin.com',
            'https://chronik2.alitayin.com',
            'https://chronik5.alitayin.com',
        ];
        const actualOrder = client
            .proxyInterface()
            .getEndpointArray()
            .map((endpoint: { url: string }) => endpoint.url);

        expect(actualOrder).to.deep.equal(expectedOrder);
    });

    it('ChronikClient constructor uses original URL order without strategy', async () => {
        const urls = [
            'https://chronik1.alitayin.com',
            'https://chronik2.alitayin.com',
            'https://chronik3.alitayin.com',
            'https://chronik4.alitayin.com',
            'https://chronik5.alitayin.com',
        ];

        chronikClientModule.__set__(
            'measureWebsocketLatency',
            async (wsUrl: string) => {
                if (wsUrl.includes('chronik3.alitayin.com')) return 50;
                if (wsUrl.includes('chronik1.alitayin.com')) return 100;
                if (wsUrl.includes('chronik2.alitayin.com')) return 150;
                return Infinity;
            },
        );

        const client = new (chronikClientModule.__get__('ChronikClient'))(urls);

        const actualOrder = client
            .proxyInterface()
            .getEndpointArray()
            .map((endpoint: { url: string }) => endpoint.url);

        expect(actualOrder).to.deep.equal(urls);
    });
});
