// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import type { ChronikClient } from 'chronik-client';
import { MockChronikClient } from 'mock-chronik-client';
import {
    assertEcashAddress,
    createLpWallets,
    deriveRoleAddress,
    resolveLpAddresses,
    SELLER_ACCOUNT,
    SLUSH_ACCOUNT,
} from '../src/wallet/accounts';

/** Known vector from modules/ecash-wallet HD tests. */
const MNEMONIC =
    'shift satisfy hammer fit plunge swear athlete gentle tragic sorry blush cheap';

const SELLER = 'ecash:qq86jv6h0y97q8l63ndynvk3fn9aq8fqru3exew8gl';
const SLUSH = 'ecash:qp2m77hpkfz4zpeeqpfw4k0fs203yw6h7gxj6aydch';
/** Off-server fee address (different mnemonic); must not be seller/slush. */
const FEE = 'ecash:qrwzys2q6xq98vwz0kjn6ulu5m6yljr5fyc909kalg';

describe('wallet accounts', () => {
    it("derives seller/slush at m/44'/1899'/{0,1}'/0/0", () => {
        assert.strictEqual(deriveRoleAddress(MNEMONIC, SELLER_ACCOUNT), SELLER);
        assert.strictEqual(deriveRoleAddress(MNEMONIC, SLUSH_ACCOUNT), SLUSH);

        const addresses = resolveLpAddresses(MNEMONIC, FEE);
        assert.deepStrictEqual(addresses, {
            sellerAddress: SELLER,
            slushAddress: SLUSH,
            feeAddress: FEE,
        });
    });

    it('createLpWallets matches HD derivation via MockChronik', () => {
        const chronik = new MockChronikClient() as unknown as ChronikClient;
        const { seller, slush, addresses } = createLpWallets(
            MNEMONIC,
            chronik,
            FEE,
        );
        assert.strictEqual(seller.address, SELLER);
        assert.strictEqual(slush.address, SLUSH);
        assert.strictEqual(addresses.feeAddress, FEE);
    });

    it('rejects feeAddress colliding with seller or slush', () => {
        assert.throws(
            () => resolveLpAddresses(MNEMONIC, SELLER),
            /must not collide/,
        );
        assert.throws(
            () => resolveLpAddresses(MNEMONIC, SLUSH),
            /must not collide/,
        );
    });

    it('assertEcashAddress rejects invalid addresses', () => {
        assert.throws(() => assertEcashAddress('', 'feeAddress'), /non-empty/);
        assert.throws(
            () => assertEcashAddress('not-an-address', 'feeAddress'),
            /not a valid ecash address/,
        );
        assert.strictEqual(assertEcashAddress(SELLER, 'feeAddress'), SELLER);
    });

    it('deriveRoleAddress rejects invalid BIP39 with a clear error', () => {
        assert.throws(
            () =>
                deriveRoleAddress(
                    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon',
                    SELLER_ACCOUNT,
                ),
            /not a valid BIP39/,
        );
    });
});
