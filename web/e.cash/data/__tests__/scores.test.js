// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getScores,
    makeDivisibleByThree,
    getScoreCardData,
    sortExchanges,
    exchangeScoringCriteria,
    instantExchangeScoringCriteria,
    servicesScoringCriteria,
} from '../scores.js';
import {
    mockExchanges,
    mockInstantExchanges,
    mockServices,
    scoredMockExchanges,
    scoredMockInstantExchanges,
    scoredMockServices,
    sortedMockExchanges,
    sortedMockInstantExchanges,
    sortedMockServices,
} from '../__mocks__/scoresMock.js';

describe('getScores', () => {
    it('should add a score for each object in an array based on the scoring criteria', () => {
        const exchangesResult = getScores(
            mockExchanges,
            exchangeScoringCriteria,
        );
        expect(exchangesResult).toEqual(scoredMockExchanges);

        const instantExchangesResult = getScores(
            mockInstantExchanges,
            instantExchangeScoringCriteria,
        );
        expect(instantExchangesResult).toEqual(scoredMockInstantExchanges);

        const servicesResult = getScores(mockServices, servicesScoringCriteria);
        expect(servicesResult).toEqual(scoredMockServices);
    });
});

describe('sortExchanges', () => {
    it('should sort a given array of exchange objects by name, then deposit confirmations, then score', () => {
        const exchangesResult = sortExchanges(scoredMockExchanges);
        expect(exchangesResult).toEqual(sortedMockExchanges);

        const instantExchangesResult = sortExchanges(
            scoredMockInstantExchanges,
        );
        expect(instantExchangesResult).toEqual(sortedMockInstantExchanges);

        const servicesResult = sortExchanges(scoredMockServices);
        expect(servicesResult).toEqual(sortedMockServices);
    });
});

describe('makeDivisibleByThree', () => {
    it('should add empty strings to the end of an array to make the total length divisble by three', () => {
        expect(makeDivisibleByThree(['one'])).toEqual(['one', '', '']);
    });

    it('should add empty strings to the end of an array to make the total length divisble by three', () => {
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

    it('should fetch api and return the response', async () => {
        jest.spyOn(global, 'fetch').mockImplementation(url => {
            if (url.includes('/exchanges')) {
                return Promise.resolve({
                    json: () => Promise.resolve(mockExchanges),
                });
            } else if (url.includes('/instant-exchanges')) {
                return Promise.resolve({
                    json: () => Promise.resolve(mockInstantExchanges),
                });
            } else if (url.includes('/apps-services')) {
                return Promise.resolve({
                    json: () => Promise.resolve(mockServices),
                });
            }
        });

        const result = await getScoreCardData();

        expect(global.fetch).toHaveBeenCalledTimes(3);
        expect(result).toEqual({
            props: {
                exchanges: makeDivisibleByThree(sortedMockExchanges),
                instantExchanges: makeDivisibleByThree(
                    sortedMockInstantExchanges,
                ),
                services: makeDivisibleByThree(sortedMockServices),
            },
        });
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
                json: () => Promise.resolve(mockExchanges),
            }) // Mock an empty array response
            .mockResolvedValueOnce({
                json: () => Promise.resolve(mockInstantExchanges),
            }) // Mock an empty object response
            .mockResolvedValueOnce({ json: () => Promise.resolve([]) }); //empty array for example

        await expect(getScoreCardData()).rejects.toThrow(
            "TypeError: Cannot read properties of undefined (reading 'length')",
        );
    });
});
