// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getScores,
    makeDivisibleByThree,
    getScoreCardData,
    sortExchanges,
} from '../scores.js';

// example of api response shape
const mockExchangesApiResponse = {
    data: [
        {
            attributes: {
                name: 'Exchange_A',
                value_check: true,
                min_max: 1,
                trading_pairs: [0, 1, 2, 3],
                issues: '',
            },
        },
        {
            attributes: {
                name: 'Exchange_B',
                value_check: true,
                min_max: 2,
                trading_pairs: [0, 1, 2],
                issues: null,
            },
        },
        {
            attributes: {
                name: 'Exchange_C',
                value_check: false,
                min_max: 5,
                trading_pairs: [0, 1],
                issues: 'has issue',
            },
        },
        {
            attributes: {
                name: 'Exchange_D',
                value_check: false,
                min_max: 6,
                trading_pairs: [0],
                issues: 'has issue',
            },
        },
    ],
};

describe('getScores', () => {
    it('should add a score for each object in an array based on the scoring criteria', () => {
        const scoringCriteriaMock = [
            {
                attribute: 'value_check',
                value: true,
                score: 10,
            },
            {
                attribute: 'min_max',
                min: 1,
                max: 3,
                score: 10,
            },
            {
                attribute: 'trading_pairs',
                min: 2,
                score: 10,
            },
            {
                attribute: 'issues',
                score: 10,
            },
        ];
        const exchangesResult = getScores(
            mockExchangesApiResponse.data,
            scoringCriteriaMock,
        );
        expect(exchangesResult[0].attributes.score).toEqual(40);
        expect(exchangesResult[1].attributes.score).toEqual(40);
        expect(exchangesResult[2].attributes.score).toEqual(10);
        expect(exchangesResult[3].attributes.score).toEqual(0);
    });
});

describe('sortExchanges', () => {
    it('should sort a given array of exchange objects by name, then deposit confirmations, then score. Then will filter out any items with scores below the scoreThreshold or with invalid scores', () => {
        const testCases = [
            { scoreThreshold: -45, resultSlice: 5 },
            { scoreThreshold: 0, resultSlice: 5 },
            { scoreThreshold: 40.01, resultSlice: 4 },
            { scoreThreshold: 70, resultSlice: 3 },
            { scoreThreshold: 100, resultSlice: 1 },
        ];
        const scoredMockExchanges = [
            {
                attributes: {
                    name: 'Exchange_A',
                    deposit_confirmations: 1,
                    score: 100,
                },
            },
            {
                attributes: {
                    name: 'Exchange_C',
                    deposit_confirmations: 1,
                    score: 80,
                },
            },
            {
                attributes: {
                    name: 'Exchange_B',
                    deposit_confirmations: 3,
                    score: 80,
                },
            },
            {
                attributes: {
                    name: 'Exchange_D',
                    deposit_confirmations: 3,
                    score: 40.453,
                },
            },
            {
                attributes: {
                    name: 'Exchange_E',
                    deposit_confirmations: 6,
                    score: 0,
                },
            },
            {
                attributes: {
                    name: 'Exchange_F',
                    deposit_confirmations: 6,
                    score: -10,
                },
            },
            {
                attributes: {
                    name: 'Exchange_G',
                    score: null,
                },
            },
            {
                attributes: {
                    name: 'Exchange_H',
                    score: undefined,
                },
            },
            {
                attributes: {
                    name: 'Exchange_I',
                },
            },
        ];
        const shuffleArray = array => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };
        for (let i = 0; i < testCases.length; i++) {
            const result = sortExchanges(
                shuffleArray(scoredMockExchanges),
                testCases[i].scoreThreshold,
            );
            expect(result).toEqual(
                scoredMockExchanges.slice(0, testCases[i].resultSlice),
            );
        }
    });
});

describe('makeDivisibleByThree', () => {
    it('should add empty strings to the end of an array to make the total length divisble by three', () => {
        expect(makeDivisibleByThree(['one'])).toEqual(['one', '', '']);
    });

    it('should add empty strings to the end of an array to make the total length divisble by three with larger array', () => {
        expect(
            makeDivisibleByThree([
                'one',
                'two',
                'three',
                'four',
                'five',
                'six',
                'seven',
                'eight',
            ]),
        ).toEqual([
            'one',
            'two',
            'three',
            'four',
            'five',
            'six',
            'seven',
            'eight',
            '',
        ]);
    });

    it('should leave input array unchanged if length is divisible by 3', () => {
        expect(makeDivisibleByThree(['one', 'two', 'three'])).toEqual([
            'one',
            'two',
            'three',
        ]);
    });
});

describe('getScoreCardData', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });
    afterEach(() => {
        global.fetch.mockClear();
        delete global.fetch;
    });

    const mockExchangeData = { data: [] };
    const mockInstantExchangeData = { data: [] };
    const mockServicesData = { data: [] };

    it('successfully retrieves and processes data', async () => {
        global.fetch.mockImplementation(url => {
            if (url.includes('/api/exchanges')) {
                return Promise.resolve({
                    json: () => Promise.resolve(mockExchangeData),
                });
            }
            if (url.includes('/api/instant-exchanges')) {
                return Promise.resolve({
                    json: () => Promise.resolve(mockInstantExchangeData),
                });
            }
            if (url.includes('/api/apps-services')) {
                return Promise.resolve({
                    json: () => Promise.resolve(mockServicesData),
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const result = await getScoreCardData();

        expect(result).toHaveProperty('props');
        expect(result.props).toHaveProperty('exchanges');
        expect(result.props).toHaveProperty('instantExchanges');
        expect(result.props).toHaveProperty('services');

        expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw an error when API call fails', async () => {
        global.fetch.mockImplementation(() => {
            throw new Error('Failed to fetch api');
        });

        await expect(getScoreCardData()).rejects.toThrow('Failed to fetch api');
    });

    it('throw error if propsObj fails due to wrong data shape', async () => {
        global.fetch
            .mockResolvedValueOnce({
                json: () => Promise.resolve(mockExchangesApiResponse.data),
            }) // Mock an empty array response
            .mockResolvedValueOnce({
                json: () => Promise.resolve(mockExchangesApiResponse.data),
            }) // Mock an empty object response
            .mockResolvedValueOnce({ json: () => Promise.resolve(undefined) }); //undefined for example

        await expect(getScoreCardData()).rejects.toThrow(
            "TypeError: Cannot read properties of undefined (reading 'length')",
        );
    });
});
