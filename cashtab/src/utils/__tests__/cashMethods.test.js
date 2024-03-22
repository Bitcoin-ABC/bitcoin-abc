// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { getHashArrayFromWallet, sumOneToManyXec } from 'utils/cashMethods';
import { walletWithXecAndTokens } from 'components/fixtures/mocks';

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
    it(`Successfully extracts a hash160 array from valid cashtab wallet`, () => {
        expect(getHashArrayFromWallet(walletWithXecAndTokens)).toStrictEqual([
            '3a5fb236934ec078b4507c303d3afd82067f8fc1',
            'a28f8852f868f88e71ec666c632d6f86e978f046',
            '600efb12a6f813eccf13171a8bc62055212d8d6c',
        ]);
    });
});
