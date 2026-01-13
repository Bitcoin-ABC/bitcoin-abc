// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import { getOvermindEmpp, EmppAction } from './empp';

const expect = chai.expect;

describe('empp', () => {
    describe('getOvermindEmpp', () => {
        it('should generate CLAIM action EMPP data without msgId bytes', () => {
            const data = getOvermindEmpp(EmppAction.CLAIM);

            // Should be 6 bytes: 4 (lokadId) + 1 (version) + 1 (action) - no msgId bytes
            expect(data.length).to.equal(6);

            // First 4 bytes should be 'XOVM' (0x584F564D)
            expect(data[0]).to.equal(0x58); // 'X'
            expect(data[1]).to.equal(0x4f); // 'O'
            expect(data[2]).to.equal(0x56); // 'V'
            expect(data[3]).to.equal(0x4d); // 'M'

            // Version byte (index 4)
            expect(data[4]).to.equal(0x00);

            // Action byte (index 5) - CLAIM = 0x00
            expect(data[5]).to.equal(0x00);

            // No msgId bytes - data ends here
        });

        it('should generate LIKE action EMPP data with msgId', () => {
            const msgId = 12345;
            const data = getOvermindEmpp(EmppAction.LIKE, msgId);

            expect(data.length).to.equal(10);

            // First 4 bytes should be 'XOVM'
            expect(data[0]).to.equal(0x58);
            expect(data[1]).to.equal(0x4f);
            expect(data[2]).to.equal(0x56);
            expect(data[3]).to.equal(0x4d);

            // Version byte
            expect(data[4]).to.equal(0x00);

            // Action byte - LIKE = 0x01
            expect(data[5]).to.equal(0x01);

            // msgId should be 12345 in little-endian (0x00003039)
            expect(data[6]).to.equal(0x39); // 0x39 = 57
            expect(data[7]).to.equal(0x30); // 0x30 = 48
            expect(data[8]).to.equal(0x00);
            expect(data[9]).to.equal(0x00);
        });

        it('should generate DISLIKE action EMPP data with msgId', () => {
            const msgId = 67890;
            const data = getOvermindEmpp(EmppAction.DISLIKE, msgId);

            expect(data.length).to.equal(10);

            // Action byte - DISLIKE = 0x02
            expect(data[5]).to.equal(0x02);

            // msgId should be 67890 in little-endian (0x00010932)
            expect(data[6]).to.equal(0x32);
            expect(data[7]).to.equal(0x09);
            expect(data[8]).to.equal(0x01);
            expect(data[9]).to.equal(0x00);
        });

        it('should generate DISLIKED action EMPP data with msgId', () => {
            const msgId = 99999;
            const data = getOvermindEmpp(EmppAction.DISLIKED, msgId);

            expect(data.length).to.equal(10);

            // Action byte - DISLIKED = 0x03
            expect(data[5]).to.equal(0x03);

            // msgId should be 99999 in little-endian (0x0001869f)
            expect(data[6]).to.equal(0x9f);
            expect(data[7]).to.equal(0x86);
            expect(data[8]).to.equal(0x01);
            expect(data[9]).to.equal(0x00);
        });

        it('should handle large msgId values', () => {
            const msgId = 0xffffffff; // Max u32
            const data = getOvermindEmpp(EmppAction.LIKE, msgId);

            expect(data.length).to.equal(10);
            expect(data[5]).to.equal(0x01); // LIKE action

            // msgId should be 0xffffffff in little-endian
            expect(data[6]).to.equal(0xff);
            expect(data[7]).to.equal(0xff);
            expect(data[8]).to.equal(0xff);
            expect(data[9]).to.equal(0xff);
        });

        it('should require msgId for non-CLAIM actions', () => {
            expect(() => getOvermindEmpp(EmppAction.LIKE)).to.throw(
                'msgId is required for action',
            );
            expect(() => getOvermindEmpp(EmppAction.DISLIKE)).to.throw(
                'msgId is required for action',
            );
            expect(() => getOvermindEmpp(EmppAction.DISLIKED)).to.throw(
                'msgId is required for action',
            );
        });

        it('should ignore msgId for CLAIM action even if provided', () => {
            const data1 = getOvermindEmpp(EmppAction.CLAIM);
            const data2 = getOvermindEmpp(EmppAction.CLAIM, 12345);

            // Both should produce identical data (6 bytes, no msgId)
            expect(data1).to.deep.equal(data2);
            expect(data1.length).to.equal(6);
        });

        it('should generate RESPAWN action EMPP data without msgId bytes', () => {
            const data = getOvermindEmpp(EmppAction.RESPAWN);

            // Should be 6 bytes: 4 (lokadId) + 1 (version) + 1 (action) - no msgId bytes
            expect(data.length).to.equal(6);

            // First 4 bytes should be 'XOVM' (0x584F564D)
            expect(data[0]).to.equal(0x58); // 'X'
            expect(data[1]).to.equal(0x4f); // 'O'
            expect(data[2]).to.equal(0x56); // 'V'
            expect(data[3]).to.equal(0x4d); // 'M'

            // Version byte (index 4)
            expect(data[4]).to.equal(0x00);

            // Action byte (index 5) - RESPAWN = 0x04
            expect(data[5]).to.equal(0x04);

            // No msgId bytes - data ends here
        });

        it('should ignore msgId for RESPAWN action even if provided', () => {
            const data1 = getOvermindEmpp(EmppAction.RESPAWN);
            const data2 = getOvermindEmpp(EmppAction.RESPAWN, 12345);

            // Both should produce identical data (6 bytes, no msgId)
            expect(data1).to.deep.equal(data2);
            expect(data1.length).to.equal(6);
        });
    });
});
