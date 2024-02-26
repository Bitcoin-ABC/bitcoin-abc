import {
    isValidStoredWallet,
    convertToEcashPrefix,
    isLegacyMigrationRequired,
    convertEtokenToEcashAddr,
    convertEcashtoEtokenAddr,
    getHashArrayFromWallet,
    isActiveWebsocket,
    getWalletBalanceFromUtxos,
    sumOneToManyXec,
} from 'utils/cashMethods';
import { utxosLoadedFromCache } from '../__mocks__/mockCachedUtxos';
import {
    pre20221123validStoredWallet,
    invalidStoredWallet,
    invalidpreChronikStoredWallet,
    validStoredWalletAfter20221123Streamline,
    invalidStoredWalletMissingPath1899AndMnemonic,
} from '../__mocks__/mockStoredWallets';
import {
    missingPath1899Wallet,
    missingPublicKeyInPath1899Wallet,
    missingPublicKeyInPath145Wallet,
    missingPublicKeyInPath245Wallet,
    notLegacyWalletWithXecPrefixes,
    notLegacyWalletWithPath145OnBchPrefix,
    notLegacyWalletWithPath1899OnBchPrefix,
    notLegacyWalletWithPath245OnBchPrefix,
    missingHash160,
} from '../__mocks__/mockLegacyWalletsUtils';
import mockLegacyWallets from 'hooks/__mocks__/mockLegacyWallets';
import {
    activeWebsocketAlpha,
    disconnectedWebsocketAlpha,
    unsubscribedWebsocket,
} from '../__mocks__/chronikWs';

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
    it(`A wallet with format from before the 20221123 migration is invalid`, () => {
        expect(isValidStoredWallet(pre20221123validStoredWallet)).toBe(false);
    });
    it(`Recognizes a stored wallet as valid if it has all required fields in 20221123 updated format`, () => {
        expect(
            isValidStoredWallet(validStoredWalletAfter20221123Streamline),
        ).toBe(true);
    });
    it(`Recognizes a stored wallet as invalid if it is missing required fields`, () => {
        expect(isValidStoredWallet(invalidStoredWallet)).toBe(false);
    });
    it(`Recognizes a stored wallet as invalid if it includes hydratedUtxoDetails in the state field`, () => {
        expect(isValidStoredWallet(invalidpreChronikStoredWallet)).toBe(false);
    });
    it(`Recognizes a stored wallet as invalid if it's missing the Path1899 and mnemonic keys`, () => {
        expect(
            isValidStoredWallet(invalidStoredWalletMissingPath1899AndMnemonic),
        ).toBe(false);
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
    it(`Recognizes a wallet with missing Path1889 is a Legacy Wallet and requires migration`, () => {
        expect(isLegacyMigrationRequired(missingPath1899Wallet)).toBe(true);
    });
    it(`Recognizes a wallet with missing PublicKey in Path1889 is a Legacy Wallet and requires migration`, () => {
        expect(
            isLegacyMigrationRequired(missingPublicKeyInPath1899Wallet),
        ).toBe(true);
    });
    it(`Recognizes a wallet with missing PublicKey in Path145 is a Legacy Wallet and requires migration`, () => {
        expect(isLegacyMigrationRequired(missingPublicKeyInPath145Wallet)).toBe(
            true,
        );
    });
    it(`Recognizes a wallet with missing PublicKey in Path245 is a Legacy Wallet and requires migration`, () => {
        expect(isLegacyMigrationRequired(missingPublicKeyInPath245Wallet)).toBe(
            true,
        );
    });
    it(`Recognizes a wallet with missing Hash160 values is a Legacy Wallet and requires migration`, () => {
        expect(isLegacyMigrationRequired(missingHash160)).toBe(true);
    });
    it(`Recognizes a latest, current wallet that does not require migration`, () => {
        expect(isLegacyMigrationRequired(notLegacyWalletWithXecPrefixes)).toBe(
            false,
        );
    });
    it(`Recognizes a non-eCash prefixed Path245 address and requires migration`, () => {
        expect(
            isLegacyMigrationRequired(notLegacyWalletWithPath245OnBchPrefix),
        ).toBe(true);
    });
    it(`Recognizes a non-eCash prefixed Path1899 address and requires migration`, () => {
        expect(
            isLegacyMigrationRequired(notLegacyWalletWithPath1899OnBchPrefix),
        ).toBe(true);
    });
    it(`Recognizes a non-eCash prefixed Path145 address and requires migration`, () => {
        expect(
            isLegacyMigrationRequired(notLegacyWalletWithPath145OnBchPrefix),
        ).toBe(true);
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
    it(`isActiveWebsocket returns true for an active chronik websocket connection`, () => {
        expect(isActiveWebsocket(activeWebsocketAlpha)).toBe(true);
    });
    it(`isActiveWebsocket returns false for a disconnected chronik websocket connection`, () => {
        expect(isActiveWebsocket(disconnectedWebsocketAlpha)).toBe(false);
    });
    it(`isActiveWebsocket returns false for a null chronik websocket connection`, () => {
        expect(isActiveWebsocket(null)).toBe(false);
    });
    it(`isActiveWebsocket returns false for an active websocket connection with no subscriptions`, () => {
        expect(isActiveWebsocket(unsubscribedWebsocket)).toBe(false);
    });
});
