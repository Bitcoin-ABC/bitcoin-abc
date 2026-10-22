// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import * as sinon from 'sinon';
import { loadHdIndices, saveHdIndices } from '../src/hd-indices-storage';

const expect = chai.expect;

describe('hd-indices-storage', function () {
    let mockLocalStorage: {
        getItem: sinon.SinonStub;
        setItem: sinon.SinonStub;
    };

    beforeEach(function () {
        mockLocalStorage = {
            getItem: sinon.stub(),
            setItem: sinon.stub(),
        };
        (global as any).localStorage = mockLocalStorage;
    });

    afterEach(function () {
        delete (global as any).localStorage;
    });

    describe('loadHdIndices', function () {
        it('Should return zero indices when nothing is stored', function () {
            mockLocalStorage.getItem.returns(null);

            expect(loadHdIndices()).to.deep.equal({
                receiveIndex: 0,
                changeIndex: 0,
            });
        });

        it('Should load stored indices', function () {
            mockLocalStorage.getItem.returns(
                JSON.stringify({ receiveIndex: 5, changeIndex: 3 }),
            );

            expect(loadHdIndices()).to.deep.equal({
                receiveIndex: 5,
                changeIndex: 3,
            });
        });

        it('Should return zero indices for invalid stored values', function () {
            mockLocalStorage.getItem.returns(
                JSON.stringify({ receiveIndex: -1, changeIndex: 2 }),
            );

            expect(loadHdIndices()).to.deep.equal({
                receiveIndex: 0,
                changeIndex: 0,
            });
        });
    });

    describe('saveHdIndices', function () {
        it('Should persist indices to localStorage', function () {
            saveHdIndices({ receiveIndex: 7, changeIndex: 4 });

            expect(mockLocalStorage.setItem.calledOnce).to.be.equal(true);
            expect(mockLocalStorage.setItem.firstCall.args[0]).to.equal(
                'ecashwallet.hdIndices.1',
            );
            expect(
                JSON.parse(mockLocalStorage.setItem.firstCall.args[1]),
            ).to.deep.equal({
                receiveIndex: 7,
                changeIndex: 4,
            });
        });

        it('Should reject invalid indices', function () {
            expect(() =>
                saveHdIndices({ receiveIndex: 1.5, changeIndex: 0 }),
            ).to.throw('HD indices must be non-negative integers');
            expect(mockLocalStorage.setItem.called).to.be.equal(false);
        });

        it('Should throw when localStorage write fails', function () {
            const writeError = new Error('QuotaExceededError');
            mockLocalStorage.setItem.throws(writeError);

            expect(() =>
                saveHdIndices({ receiveIndex: 1, changeIndex: 0 }),
            ).to.throw(writeError);
        });
    });
});
