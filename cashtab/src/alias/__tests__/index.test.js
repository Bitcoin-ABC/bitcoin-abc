// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
import { queryAliasServer } from 'alias';
import {
    mockAddressApiResponse,
    mockAliasApiResponse,
    mockUnregisteredAliasApiResponse,
} from 'alias/fixtures/mocks';
import { when } from 'jest-when';
import aliasSettings from 'config/alias';

test('queryAliasServer() correctly throws a network error for server downtime or a malformed fetch url', async () => {
    const endPoint = 'address';
    const address = 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj';
    const fetchUrl = `bad-url-to-simulate-server-downtime/${endPoint}/${address}`;
    const expectedError = 'Network request failed';

    // mock the fetch call to alias-server's '/address' endpoint
    global.fetch = jest.fn();
    when(fetch)
        .calledWith(fetchUrl)
        .mockResolvedValue({ error: expectedError });

    await expect(queryAliasServer(endPoint, address)).rejects.toThrow(
        expectedError,
    );
});

test('queryAliasServer() correctly returns an array of alias objects for a valid eCash address that has registered aliases', async () => {
    const endPoint = 'address';
    const address = 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj';
    const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/${endPoint}/${address}`;

    // mock the fetch call to alias-server's '/address' endpoint
    global.fetch = jest.fn();
    when(fetch)
        .calledWith(fetchUrl)
        .mockResolvedValue({
            json: () => Promise.resolve({ mockAddressApiResponse }),
        });

    expect(await queryAliasServer(endPoint, address)).toEqual({
        mockAddressApiResponse,
    });
});

test('queryAliasServer() correctly returns an array of alias objects for a valid prefix-less eCash address that has registered aliases', async () => {
    const endPoint = 'address';
    const address = 'qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj';
    const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/${endPoint}/${address}`;

    // mock the fetch call to alias-server's '/address' endpoint
    global.fetch = jest.fn();
    when(fetch)
        .calledWith(fetchUrl)
        .mockResolvedValue({
            json: () => Promise.resolve({ mockAddressApiResponse }),
        });

    expect(await queryAliasServer(endPoint, address)).toEqual({
        mockAddressApiResponse,
    });
});

test('queryAliasServer() returns an empty array for a valid eCash address with no aliases', async () => {
    const endPoint = 'address';
    const address = 'ecash:qr2nyffmenvrzea3aqhqw0rd3ckk0kkcrgsrugzjph';
    const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/${endPoint}/${address}`;

    // mock the fetch call to alias-server's '/address' endpoint
    global.fetch = jest.fn();
    when(fetch)
        .calledWith(fetchUrl)
        .mockResolvedValue({
            json: () => Promise.resolve([]),
        });

    expect(await queryAliasServer(endPoint, address)).toEqual([]);
});

test('queryAliasServer() throws an error for an invalid eCash address', async () => {
    const endPoint = 'address';
    const invalidAddress = 'qpmytrdsaINVALIDDDDDDD7cjctmjasj';
    const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/${endPoint}/${invalidAddress}`;
    const expectedError = `Error fetching /address/${invalidAddress}: Input must be a valid eCash address`;

    // mock the fetch call to alias-server's '/address' endpoint
    global.fetch = jest.fn();
    when(fetch)
        .calledWith(fetchUrl)
        .mockResolvedValue({ error: expectedError });

    await expect(queryAliasServer(endPoint, invalidAddress)).rejects.toThrow(
        expectedError,
    );
});

test('queryAliasServer() returns an alias object for a registered alias', async () => {
    const endPoint = 'alias';
    const alias = 'twelvechar12';
    const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/${endPoint}/${alias}`;

    // mock the fetch call to alias-server's '/alias' endpoint
    global.fetch = jest.fn();
    when(fetch)
        .calledWith(fetchUrl)
        .mockResolvedValue({
            json: () => Promise.resolve({ mockAliasApiResponse }),
        });

    expect(await queryAliasServer(endPoint, alias)).toEqual({
        mockAliasApiResponse,
    });
});

test('queryAliasServer() returns an api error for a non-alphanumeric alias', async () => {
    const endPoint = 'alias';
    const alias = '@@@@@@@@@@@@';
    const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/${endPoint}/${alias}`;
    const expectedError = `Error fetching /alias/${alias}: alias param cannot contain non-alphanumeric characters`;

    // mock the fetch call to alias-server's '/alias' endpoint
    global.fetch = jest.fn();
    when(fetch)
        .calledWith(fetchUrl)
        .mockResolvedValue({ error: expectedError });

    await expect(queryAliasServer(endPoint, alias)).rejects.toThrow(
        expectedError,
    );
});

test('queryAliasServer() returns a valid object for an unregistered alias', async () => {
    const endPoint = 'alias';
    const alias = 'foobar';
    const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/${endPoint}/${alias}`;

    // mock the fetch call to alias-server's '/alias' endpoint
    global.fetch = jest.fn();
    when(fetch)
        .calledWith(fetchUrl)
        .mockResolvedValue({
            json: () => Promise.resolve({ mockUnregisteredAliasApiResponse }),
        });

    expect(await queryAliasServer(endPoint, alias)).toEqual({
        mockUnregisteredAliasApiResponse,
    });
});

test('queryAliasServer() returns an error for an alias longer than 21 characters', async () => {
    const endPoint = 'alias';
    const alias = 'foobarrrrrrrrrrrrrrrrrrrrrrrrrrr';
    const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/${endPoint}/${alias}`;
    const expectedError = `Error fetching /alias/${alias}: alias param must be between 1 and 21 characters in length`;

    // mock the fetch call to alias-server's '/alias' endpoint
    global.fetch = jest.fn();
    when(fetch)
        .calledWith(fetchUrl)
        .mockResolvedValue({ error: expectedError });

    await expect(queryAliasServer(endPoint, alias)).rejects.toThrow(
        expectedError,
    );
});
