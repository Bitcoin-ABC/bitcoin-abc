// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
import { currency } from 'components/Common/Ticker';
import { getAliasesForAddress } from 'utils/aliasUtils';
import { getAliasDetails } from 'utils/aliasUtils';
import { mockAddressApiResponse } from '../__mocks__/mockAliasServerResponses';
import { mockAliasApiResponse } from '../__mocks__/mockAliasServerResponses';
import { when } from 'jest-when';

test('getAliasesForAddress() correctly returns an array of alias objects for a valid eCash address that has registered aliases', async () => {
    const address = 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj';
    const fetchUrl = `${currency.aliasSettings.aliasServerBaseUrl}/address/${address}`;

    // mock the fetch call to alias-server's '/address' endpoint
    global.fetch = jest.fn();
    when(fetch).calledWith(fetchUrl).mockResolvedValue(mockAddressApiResponse);

    expect(await getAliasesForAddress(address)).toEqual(mockAddressApiResponse);
});

test('getAliasesForAddress() correctly returns an array of alias objects for a valid prefix-less eCash address that has registered aliases', async () => {
    const address = 'qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj';
    const fetchUrl = `${currency.aliasSettings.aliasServerBaseUrl}/address/${address}`;

    // mock the fetch call to alias-server's '/address' endpoint
    global.fetch = jest.fn();
    when(fetch).calledWith(fetchUrl).mockResolvedValue(mockAddressApiResponse);

    expect(await getAliasesForAddress(address)).toEqual(mockAddressApiResponse);
});

test('getAliasesForAddress() returns an empty array for a valid eCash address with no aliases', async () => {
    const address = 'ecash:qr2nyffmenvrzea3aqhqw0rd3ckk0kkcrgsrugzjph';
    const fetchUrl = `${currency.aliasSettings.aliasServerBaseUrl}/address/${address}`;

    // mock the fetch call to alias-server's '/address' endpoint
    global.fetch = jest.fn();
    when(fetch).calledWith(fetchUrl).mockResolvedValue([]);

    expect(await getAliasesForAddress(address)).toEqual([]);
});

test('getAliasesForAddress() throws an api error for an invalid eCash address', async () => {
    const invalidAddress = 'qpmytrdsaINVALIDDDDDDD7cjctmjasj';
    const fetchUrl = `${currency.aliasSettings.aliasServerBaseUrl}/address/${invalidAddress}`;
    const expectedError = `Error fetching /address/${invalidAddress}: Input must be a valid eCash address`;

    // mock the fetch call to alias-server's '/address' endpoint
    global.fetch = jest.fn();
    when(fetch)
        .calledWith(fetchUrl)
        .mockResolvedValue({ error: expectedError });

    await expect(getAliasesForAddress(invalidAddress)).rejects.toThrow(
        expectedError,
    );
});

test('getAliasDetails() returns an alias object for a registered alias', async () => {
    const alias = 'twelvechar12';
    const fetchUrl = `${currency.aliasSettings.aliasServerBaseUrl}/alias/${alias}`;

    // mock the fetch call to alias-server's '/alias' endpoint
    global.fetch = jest.fn();
    when(fetch).calledWith(fetchUrl).mockResolvedValue(mockAliasApiResponse);

    expect(await getAliasDetails(alias)).toEqual(mockAliasApiResponse);
});

test('getAliasDetails() returns an api error for a non-alphanumeric alias', async () => {
    const alias = '@@@@@@@@@@@@';
    const fetchUrl = `${currency.aliasSettings.aliasServerBaseUrl}/alias/${alias}`;
    const expectedError = `Error fetching /alias/${alias}: alias param cannot contain non-alphanumeric characters`;

    // mock the fetch call to alias-server's '/alias' endpoint
    global.fetch = jest.fn();
    when(fetch)
        .calledWith(fetchUrl)
        .mockResolvedValue({ error: expectedError });

    await expect(getAliasDetails(alias)).rejects.toThrow(expectedError);
});

test('getAliasDetails() returns an object with isRegistered as false for an unregistered alias', async () => {
    const alias = 'foobar';
    const fetchUrl = `${currency.aliasSettings.aliasServerBaseUrl}/alias/${alias}`;
    const expectedResult = {
        alias: alias,
        isRegistered: false,
    };

    // mock the fetch call to alias-server's '/alias' endpoint
    global.fetch = jest.fn();
    when(fetch).calledWith(fetchUrl).mockResolvedValue(expectedResult);

    expect(await getAliasDetails(alias)).toEqual(expectedResult);
});

test('getAliasDetails() returns an api error for an alias longer than 21 characters', async () => {
    const alias = 'foobarrrrrrrrrrrrrrrrrrrrrrrrrrr';
    const fetchUrl = `${currency.aliasSettings.aliasServerBaseUrl}/alias/${alias}`;
    const expectedError = `Error fetching /alias/${alias}: alias param must be between 1 and 21 characters in length`;

    // mock the fetch call to alias-server's '/alias' endpoint
    global.fetch = jest.fn();
    when(fetch)
        .calledWith(fetchUrl)
        .mockResolvedValue({ error: expectedError });

    await expect(getAliasDetails(alias)).rejects.toThrow(expectedError);
});
