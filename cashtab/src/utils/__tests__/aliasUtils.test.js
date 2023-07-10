// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
import { currency } from 'components/Common/Ticker';
import {
    queryAliasServer,
    getAliasByteSize,
    getAliasRegistrationFee,
} from 'utils/aliasUtils';
import { mockAddressApiResponse } from '../__mocks__/mockAliasServerResponses';
import { mockAliasApiResponse } from '../__mocks__/mockAliasServerResponses';
import { when } from 'jest-when';

test(`Alias byte length matches for an alias input with a single emoji`, () => {
    const aliasInput = '🙈';
    const opReturnAliasByteLength = getAliasByteSize(aliasInput);
    expect(opReturnAliasByteLength).toStrictEqual(4);
});

test(`Alias byte length matches for an alias input with characters and emojis`, () => {
    const aliasInput = 'monkey🙈';
    const opReturnAliasByteLength = getAliasByteSize(aliasInput);
    expect(opReturnAliasByteLength).toStrictEqual(10);
});

test(`Alias byte length matches for an alias input with special characters`, () => {
    const aliasInput = 'monkey©®ʕ•́ᴥ•̀ʔっ♡';
    const opReturnAliasByteLength = getAliasByteSize(aliasInput);
    expect(opReturnAliasByteLength).toStrictEqual(33);
});

test(`Alias byte length matches for an alias input with Korean characters`, () => {
    const aliasInput = '소주';
    const opReturnAliasByteLength = getAliasByteSize(aliasInput);
    expect(opReturnAliasByteLength).toStrictEqual(6);
});

test(`Alias byte length matches for an alias input with Arabic characters`, () => {
    const aliasInput = 'محيط';
    const opReturnAliasByteLength = getAliasByteSize(aliasInput);
    expect(opReturnAliasByteLength).toStrictEqual(8);
});

test(`Alias byte length matches for an alias input with Chinese characters`, () => {
    const aliasInput = '冰淇淋';
    const opReturnAliasByteLength = getAliasByteSize(aliasInput);
    expect(opReturnAliasByteLength).toStrictEqual(9);
});

test(`Alias byte length matches for an alias input with a mixture of symbols, multilingual characters and emojis`, () => {
    const aliasInput = '🙈©冰소주';
    const opReturnAliasByteLength = getAliasByteSize(aliasInput);
    expect(opReturnAliasByteLength).toStrictEqual(15);
});

test(`getAliasRegistrationFee() returns correct fee in sats for an alias input with 5 bytes`, () => {
    const aliasInput = 'panda'; // 5 bytes
    const regFeeResult = getAliasRegistrationFee(aliasInput);
    expect(regFeeResult).toStrictEqual(
        currency.aliasSettings.aliasRegistrationFeeInSats.fiveByte,
    );
});

test(`getAliasRegistrationFee() returns correct fee in sats for an alias input above 8 bytes`, () => {
    const aliasInput = 'pandapanda'; // 10 bytes
    const regFeeResult = getAliasRegistrationFee(aliasInput);
    expect(regFeeResult).toStrictEqual(
        currency.aliasSettings.aliasRegistrationFeeInSats.eightByte,
    );
});

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
    const fetchUrl = `${currency.aliasSettings.aliasServerBaseUrl}/${endPoint}/${address}`;

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
    const fetchUrl = `${currency.aliasSettings.aliasServerBaseUrl}/${endPoint}/${address}`;

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
    const fetchUrl = `${currency.aliasSettings.aliasServerBaseUrl}/${endPoint}/${address}`;

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
    const fetchUrl = `${currency.aliasSettings.aliasServerBaseUrl}/${endPoint}/${invalidAddress}`;
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
    const fetchUrl = `${currency.aliasSettings.aliasServerBaseUrl}/${endPoint}/${alias}`;

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
    const fetchUrl = `${currency.aliasSettings.aliasServerBaseUrl}/${endPoint}/${alias}`;
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

test('queryAliasServer() returns an object with isRegistered as false for an unregistered alias', async () => {
    const endPoint = 'alias';
    const alias = 'foobar';
    const fetchUrl = `${currency.aliasSettings.aliasServerBaseUrl}/${endPoint}/${alias}`;
    const expectedResult = {
        alias: alias,
        isRegistered: false,
    };

    // mock the fetch call to alias-server's '/alias' endpoint
    global.fetch = jest.fn();
    when(fetch)
        .calledWith(fetchUrl)
        .mockResolvedValue({
            json: () => Promise.resolve({ expectedResult }),
        });

    expect(await queryAliasServer(endPoint, alias)).toEqual({ expectedResult });
});

test('queryAliasServer() returns an error for an alias longer than 21 characters', async () => {
    const endPoint = 'alias';
    const alias = 'foobarrrrrrrrrrrrrrrrrrrrrrrrrrr';
    const fetchUrl = `${currency.aliasSettings.aliasServerBaseUrl}/${endPoint}/${alias}`;
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
