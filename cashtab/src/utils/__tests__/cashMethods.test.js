// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    convertToEcashPrefix,
    convertEtokenToEcashAddr,
    convertEcashtoEtokenAddr,
    getHashArrayFromWallet,
    getWalletBalanceFromUtxos,
    sumOneToManyXec,
} from 'utils/cashMethods';
import { utxosLoadedFromCache } from '../__mocks__/mockCachedUtxos';
import {
    pre20221123validStoredWallet,
    validStoredWalletAfter20221123Streamline,
} from '../__mocks__/mockStoredWallets';
import mockLegacyWallets from 'hooks/__mocks__/mockLegacyWallets';

it(`sumOneToManyXec() correctly parses the value for a valid one to many send XEC transaction`, () => {
    const destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,1',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,2',
        'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,3',
    ];
    expect(sumOneToManyXec(destinationAddressAndValueArray)).toStrictEqual(6);
});
it(`sumOneToManyXec() correctly parses the value for a valid one to many send XEC transaction with decimals`, () => {
    const destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,1.23',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,2.45',
        'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,3.67',
    ];
    expect(sumOneToManyXec(destinationAddressAndValueArray)).toStrictEqual(
        7.35,
    );
});
it(`sumOneToManyXec() returns NaN for an address and value array that is partially typed or has invalid format`, () => {
    const destinationAddressAndValueArray = [
        'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48,1',
        'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx,',
    ];
    expect(sumOneToManyXec(destinationAddressAndValueArray)).toStrictEqual(NaN);
});

describe('Correctly executes cash utility functions', () => {
    it(`Correctly determines a wallet's balance from its set of non-eToken utxos (nonSlpUtxos)`, () => {
        expect(
            getWalletBalanceFromUtxos(
                validStoredWalletAfter20221123Streamline.state.nonSlpUtxos,
            ),
        ).toStrictEqual(pre20221123validStoredWallet.state.balances);
    });
    it(`Correctly determines a wallet's zero balance from its empty set of non-eToken utxos (nonSlpUtxos)`, () => {
        expect(
            getWalletBalanceFromUtxos(utxosLoadedFromCache.nonSlpUtxos),
        ).toStrictEqual(utxosLoadedFromCache.balances);
    });
    it(`convertToEcashPrefix converts a bitcoincash: prefixed address to an ecash: prefixed address`, () => {
        expect(
            convertToEcashPrefix(
                'bitcoincash:qz2708636snqhsxu8wnlka78h6fdp77ar5ulhz04hr',
            ),
        ).toBe('ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035');
    });
    it(`convertToEcashPrefix returns an ecash: prefix address unchanged`, () => {
        expect(
            convertToEcashPrefix(
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            ),
        ).toBe('ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035');
    });

    test('convertEtokenToEcashAddr successfully converts a valid eToken address to eCash', async () => {
        const result = convertEtokenToEcashAddr(
            'etoken:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gcldpffcs',
        );
        expect(result).toStrictEqual(
            'ecash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8',
        );
    });

    test('convertEtokenToEcashAddr successfully converts prefixless eToken address as input', async () => {
        const result = convertEtokenToEcashAddr(
            'qpatql05s9jfavnu0tv6lkjjk25n6tmj9gcldpffcs',
        );
        expect(result).toStrictEqual(
            'ecash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8',
        );
    });

    test('convertEtokenToEcashAddr throws error with an invalid eToken address as input', async () => {
        const result = convertEtokenToEcashAddr('etoken:qpj9gcldpffcs');
        expect(result).toStrictEqual(
            new Error(
                'cashMethods.convertToEcashAddr() error: etoken:qpj9gcldpffcs is not a valid etoken address',
            ),
        );
    });

    test('convertEtokenToEcashAddr throws error with an ecash address as input', async () => {
        const result = convertEtokenToEcashAddr(
            'ecash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8',
        );
        expect(result).toStrictEqual(
            new Error(
                'cashMethods.convertToEcashAddr() error: ecash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8 is not a valid etoken address',
            ),
        );
    });

    test('convertEtokenToEcashAddr throws error with null input', async () => {
        const result = convertEtokenToEcashAddr(null);
        expect(result).toStrictEqual(
            new Error(
                'cashMethods.convertToEcashAddr() error: No etoken address provided',
            ),
        );
    });

    test('convertEtokenToEcashAddr throws error with empty string input', async () => {
        const result = convertEtokenToEcashAddr('');
        expect(result).toStrictEqual(
            new Error(
                'cashMethods.convertToEcashAddr() error: No etoken address provided',
            ),
        );
    });

    test('convertEcashtoEtokenAddr successfully converts a valid ecash address into an etoken address', async () => {
        const eCashAddress = 'ecash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8';
        const eTokenAddress =
            'etoken:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gcldpffcs';
        const result = convertEcashtoEtokenAddr(eCashAddress);
        expect(result).toStrictEqual(eTokenAddress);
    });

    test('convertEcashtoEtokenAddr successfully converts a valid prefix-less ecash address into an etoken address', async () => {
        const eCashAddress = 'qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8';
        const eTokenAddress =
            'etoken:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gcldpffcs';
        const result = convertEcashtoEtokenAddr(eCashAddress);
        expect(result).toStrictEqual(eTokenAddress);
    });

    test('convertEcashtoEtokenAddr throws error with invalid ecash address input', async () => {
        const eCashAddress = 'ecash:qpaNOTVALIDADDRESSwu8';
        const result = convertEcashtoEtokenAddr(eCashAddress);
        expect(result).toStrictEqual(
            new Error(eCashAddress + ' is not a valid ecash address'),
        );
    });

    test('convertEcashtoEtokenAddr throws error with a valid etoken address input', async () => {
        const eTokenAddress =
            'etoken:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gcldpffcs';
        const result = convertEcashtoEtokenAddr(eTokenAddress);
        expect(result).toStrictEqual(
            new Error(eTokenAddress + ' is not a valid ecash address'),
        );
    });

    test('convertEcashtoEtokenAddr throws error with a valid bitcoincash address input', async () => {
        const bchAddress =
            'bitcoincash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9g0vsgy56s';
        const result = convertEcashtoEtokenAddr(bchAddress);
        expect(result).toStrictEqual(
            new Error(bchAddress + ' is not a valid ecash address'),
        );
    });

    test('convertEcashtoEtokenPrefix throws error with null ecash address input', async () => {
        const eCashAddress = null;
        const result = convertEcashtoEtokenAddr(eCashAddress);
        expect(result).toStrictEqual(
            new Error(eCashAddress + ' is not a valid ecash address'),
        );
    });

    it(`getHashArrayFromWallet returns false for a legacy wallet`, () => {
        expect(
            getHashArrayFromWallet(mockLegacyWallets.legacyAlphaMainnet),
        ).toBe(false);
    });
    it(`Successfully extracts a hash160 array from a migrated wallet object`, () => {
        expect(
            getHashArrayFromWallet(
                mockLegacyWallets.migratedLegacyAlphaMainnet,
            ),
        ).toStrictEqual([
            '960c9ed561f1699f0c49974d50b3bb7cdc118625',
            '2be0e0c999e7e77a443ea726f82c441912fca92b',
            'ba8257db65f40359989c7b894c5e88ed7b6344f6',
        ]);
    });
});
