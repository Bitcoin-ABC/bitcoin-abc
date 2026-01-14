// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import { getOvermindEmpp, EmppAction, parseEmppActionCode } from './empp';

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

        it('should generate WITHDRAW action EMPP data without msgId bytes', () => {
            const data = getOvermindEmpp(EmppAction.WITHDRAW);

            // Should be 6 bytes: 4 (lokadId) + 1 (version) + 1 (action) - no msgId bytes
            expect(data.length).to.equal(6);

            // First 4 bytes should be 'XOVM' (0x584F564D)
            expect(data[0]).to.equal(0x58); // 'X'
            expect(data[1]).to.equal(0x4f); // 'O'
            expect(data[2]).to.equal(0x56); // 'V'
            expect(data[3]).to.equal(0x4d); // 'M'

            // Version byte (index 4)
            expect(data[4]).to.equal(0x00);

            // Action byte (index 5) - WITHDRAW = 0x05
            expect(data[5]).to.equal(0x05);

            // No msgId bytes - data ends here
        });

        it('should ignore msgId for WITHDRAW action even if provided', () => {
            const data1 = getOvermindEmpp(EmppAction.WITHDRAW);
            const data2 = getOvermindEmpp(EmppAction.WITHDRAW, 12345);

            // Both should produce identical data (6 bytes, no msgId)
            expect(data1).to.deep.equal(data2);
            expect(data1.length).to.equal(6);
        });
    });

    describe('parseEmppActionCode', () => {
        it('should parse CLAIM action code from valid EMPP data', () => {
            const data = getOvermindEmpp(EmppAction.CLAIM);
            const actionCode = parseEmppActionCode(data);

            expect(actionCode).to.equal(EmppAction.CLAIM);
        });

        it('should parse LIKE action code from valid EMPP data', () => {
            const data = getOvermindEmpp(EmppAction.LIKE, 12345);
            const actionCode = parseEmppActionCode(data);

            expect(actionCode).to.equal(EmppAction.LIKE);
        });

        it('should parse DISLIKE action code from valid EMPP data', () => {
            const data = getOvermindEmpp(EmppAction.DISLIKE, 67890);
            const actionCode = parseEmppActionCode(data);

            expect(actionCode).to.equal(EmppAction.DISLIKE);
        });

        it('should parse DISLIKED action code from valid EMPP data', () => {
            const data = getOvermindEmpp(EmppAction.DISLIKED, 99999);
            const actionCode = parseEmppActionCode(data);

            expect(actionCode).to.equal(EmppAction.DISLIKED);
        });

        it('should parse RESPAWN action code from valid EMPP data', () => {
            const data = getOvermindEmpp(EmppAction.RESPAWN);
            const actionCode = parseEmppActionCode(data);

            expect(actionCode).to.equal(EmppAction.RESPAWN);
        });

        it('should parse WITHDRAW action code from valid EMPP data', () => {
            const data = getOvermindEmpp(EmppAction.WITHDRAW);
            const actionCode = parseEmppActionCode(data);

            expect(actionCode).to.equal(EmppAction.WITHDRAW);
        });

        it('should return null for data that is too short', () => {
            const shortData = new Uint8Array([0x58, 0x4f, 0x56, 0x4d, 0x00]); // Only 5 bytes
            const actionCode = parseEmppActionCode(shortData);

            expect(actionCode).to.equal(null);
        });

        it('should return null for empty data', () => {
            const emptyData = new Uint8Array([]);
            const actionCode = parseEmppActionCode(emptyData);

            expect(actionCode).to.equal(null);
        });

        it('should return null for data with wrong LOKAD_ID', () => {
            const wrongData = new Uint8Array([
                0x41,
                0x42,
                0x43,
                0x44, // Wrong LOKAD_ID ('ABCD')
                0x00, // Version
                0x00, // Action
            ]);
            const actionCode = parseEmppActionCode(wrongData);

            expect(actionCode).to.equal(null);
        });

        it('should return null for data with wrong version byte', () => {
            const data = getOvermindEmpp(EmppAction.CLAIM);
            data[4] = 0x01; // Change version byte from 0x00 to 0x01
            const actionCode = parseEmppActionCode(data);

            expect(actionCode).to.equal(null);
        });

        it('should return null for data with correct LOKAD_ID but wrong version', () => {
            const wrongVersionData = new Uint8Array([
                0x58,
                0x4f,
                0x56,
                0x4d, // Correct LOKAD_ID ('XOVM')
                0x01, // Wrong version (should be 0x00)
                0x00, // Action
            ]);
            const actionCode = parseEmppActionCode(wrongVersionData);

            expect(actionCode).to.equal(null);
        });

        it('should correctly extract action code from data with msgId', () => {
            const data = getOvermindEmpp(EmppAction.LIKE, 12345);
            const actionCode = parseEmppActionCode(data);

            expect(actionCode).to.equal(EmppAction.LIKE);
            // Should work even though data has msgId bytes
        });

        it('should handle all action codes correctly', () => {
            const actions = [
                EmppAction.CLAIM,
                EmppAction.LIKE,
                EmppAction.DISLIKE,
                EmppAction.DISLIKED,
                EmppAction.RESPAWN,
                EmppAction.WITHDRAW,
            ];

            for (const action of actions) {
                const data =
                    action === EmppAction.CLAIM ||
                    action === EmppAction.RESPAWN ||
                    action === EmppAction.WITHDRAW
                        ? getOvermindEmpp(action)
                        : getOvermindEmpp(action, 12345);
                const parsedAction = parseEmppActionCode(data);

                expect(parsedAction).to.equal(action);
            }
        });
    });
});
