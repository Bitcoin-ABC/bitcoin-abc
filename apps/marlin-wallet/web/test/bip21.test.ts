// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import { createBip21Uri, parseBip21Uri } from '../src/bip21';

const expect = chai.expect;

describe('bip21.ts', function () {
    describe('createBip21Uri', function () {
        it('Should create BIP21 URI with address only', function () {
            const address = 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
            const uri = createBip21Uri(address);
            expect(uri).to.equal(
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
            );
        });

        it('Should create BIP21 URI with address and amount', function () {
            const address = 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
            const amountSats = 12345; // 100 XEC
            const uri = createBip21Uri(address, amountSats);
            expect(uri).to.equal(
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07?amount=123.45',
            );
        });

        it('Should handle address without prefix', function () {
            const address = 'prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
            const uri = createBip21Uri(address);
            expect(uri).to.equal(
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
            );
        });

        it('Should not include amount if zero or negative', function () {
            const address = 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
            expect(createBip21Uri(address, 0)).to.not.include('amount');
            expect(createBip21Uri(address, -100)).to.not.include('amount');
        });
    });

    describe('parseBip21Uri', function () {
        it('Should parse BIP21 URI with address only', function () {
            const uri = 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
            const result = parseBip21Uri(uri);

            expect(result).to.not.be.equal(null);
            expect(result!.address).to.equal(
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
            );
            expect(result!.sats).to.be.equal(undefined);
        });

        it('Should parse BIP21 URI with amount', function () {
            const uri =
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07?amount=100.42';
            const result = parseBip21Uri(uri);

            expect(result).to.not.be.equal(null);
            expect(result!.address).to.equal(
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
            );
            expect(result!.sats).to.equal(10042); // 100.42 XEC = 10042 sats
        });

        it('Should parse BIP21 URI with OP_RETURN data', function () {
            const uri =
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07?op_return_raw=0450415900';
            const result = parseBip21Uri(uri);

            expect(result).to.not.be.equal(null);
            expect(result!.address).to.equal(
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
            );
            expect(result!.opReturnRaw).to.equal('0450415900');
        });

        it('Should parse BIP21 URI with both amount and OP_RETURN', function () {
            const uri =
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07?amount=50.00&op_return_raw=045041590A';
            const result = parseBip21Uri(uri);

            expect(result).to.not.be.equal(null);
            expect(result!.address).to.equal(
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
            );
            expect(result!.sats).to.equal(5000);
            expect(result!.opReturnRaw).to.equal('045041590A');
        });

        it('Should reject invalid protocol', function () {
            const uri = 'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
            const result = parseBip21Uri(uri);
            expect(result).to.be.equal(null);
        });

        it('Should reject invalid address format', function () {
            const uri = 'ecash:invalid-address';
            const result = parseBip21Uri(uri);
            expect(result).to.be.equal(null);
        });

        it('Should reject invalid amount', function () {
            const uri =
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07?amount=invalid';
            const result = parseBip21Uri(uri);
            expect(result).to.not.be.equal(null);
            expect(result!.sats).to.be.equal(undefined); // Invalid amount should be ignored
        });

        it('Should reject negative amount', function () {
            const uri =
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07?amount=-10.00';
            const result = parseBip21Uri(uri);
            expect(result).to.not.be.equal(null);
            expect(result!.sats).to.be.equal(undefined); // Negative amount should be ignored
        });

        it('Should reject invalid OP_RETURN hex', function () {
            const uri =
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07?op_return_raw=invalid';
            const result = parseBip21Uri(uri);
            expect(result).to.not.be.equal(null);
            expect(result!.opReturnRaw).to.be.equal(undefined); // Invalid hex should be ignored
        });

        it('Should reject OP_RETURN with odd number of hex characters', function () {
            const uri =
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07?op_return_raw=045041590';
            const result = parseBip21Uri(uri);
            expect(result).to.not.be.equal(null);
            expect(result!.opReturnRaw).to.be.equal(undefined); // Odd length should be ignored
        });

        it('Should handle lowercase hex in OP_RETURN', function () {
            const uri =
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07?op_return_raw=045041590a';
            const result = parseBip21Uri(uri);
            expect(result).to.not.be.equal(null);
            expect(result!.opReturnRaw).to.equal('045041590A');
        });

        it('Should ignore unknown query parameters', function () {
            const uri =
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07?amount=100.00&unknown=param';
            const result = parseBip21Uri(uri);
            expect(result).to.not.be.equal(null);
            expect(result!.sats).to.equal(10000);
        });

        it('Should handle malformed URI gracefully', function () {
            const uri = 'not-a-valid-uri';
            const result = parseBip21Uri(uri);
            expect(result).to.be.equal(null);
        });
    });
});
