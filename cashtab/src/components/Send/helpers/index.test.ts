// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { sumOneToManyXec, getFirmaRedeemFee } from './';
import {
    FIRMA_REDEEM_FEE_MIN,
    FIRMA_REDEEM_AMOUNT_THRESHOLD,
} from 'constants/tokens';

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

describe('getFirmaRedeemFee', () => {
    it('Returns min fee for threshold value', () => {
        expect(getFirmaRedeemFee(FIRMA_REDEEM_AMOUNT_THRESHOLD)).toEqual(
            FIRMA_REDEEM_FEE_MIN,
        );
    });
    it('Returns min fee for amount less than threshold value', () => {
        expect(getFirmaRedeemFee(FIRMA_REDEEM_AMOUNT_THRESHOLD - 100)).toEqual(
            FIRMA_REDEEM_FEE_MIN,
        );
    });
    it('Returns % fee for amount greater than threshold value', () => {
        expect(getFirmaRedeemFee(FIRMA_REDEEM_AMOUNT_THRESHOLD + 100)).toEqual(
            3,
        );
    });
});
