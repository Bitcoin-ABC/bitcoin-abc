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
});
