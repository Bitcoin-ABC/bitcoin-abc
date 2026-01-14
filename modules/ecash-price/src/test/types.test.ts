// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { Fiat } from '../types';

describe('Fiat', () => {
    describe('listAll', () => {
        it('should return an array with length greater than 0', () => {
            const allFiats = Fiat.listAll();
            expect(allFiats.length).to.be.greaterThan(0);
        });

        it('should contain USD', () => {
            const allFiats = Fiat.listAll();
            expect(allFiats).to.include(Fiat.USD);
        });

        it('should contain EUR', () => {
            const allFiats = Fiat.listAll();
            expect(allFiats).to.include(Fiat.EUR);
        });

        it('should contain only Fiat instances', () => {
            const allFiats = Fiat.listAll();
            allFiats.forEach(fiat => {
                expect(fiat).to.be.instanceOf(Fiat);
            });
        });
    });

    describe('name', () => {
        it('should return currency names for different locales', () => {
            expect(Fiat.USD.name('en-US')).to.be.equal('US Dollar');
            expect(Fiat.USD.name('fr-FR')).to.be.equal('dollar des États-Unis');

            expect(Fiat.EUR.name('en-US')).to.be.equal('Euro');
            expect(Fiat.EUR.name('fr-FR')).to.be.equal('euro');

            // The name is the code itself in both locales
            expect(new Fiat('foo').name('en-US')).to.equal('foo');
            expect(new Fiat('foo').name('fr-FR')).to.equal('foo');
        });
    });

    describe('symbol', () => {
        it('should return currency symbol for different locales', () => {
            expect(Fiat.USD.symbol('en-US')).to.be.equal('$');
            // Actually the same symbol in both locales
            expect(Fiat.USD.symbol('fr-FR')).to.be.equal('$');

            expect(Fiat.EUR.symbol('en-US')).to.be.equal('€');
            expect(Fiat.EUR.symbol('fr-FR')).to.be.equal('€');

            // When there is no symbol for the currency, the ticker is returned
            expect(new Fiat('foo').symbol('en-US')).to.be.equal('FOO');
            expect(new Fiat('foo').symbol('fr-FR')).to.be.equal('FOO');
        });
    });
});
