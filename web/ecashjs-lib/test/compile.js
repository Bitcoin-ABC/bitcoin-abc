/*
  Tests to fix the compile issues with BITBOX.Script class.
*/

'use strict';

const mocha = require('mocha');
const chai = require('chai');
const assert = chai.assert;

const opcodes = require('ecash-ops');

var script = require('../src/script');

describe('#compile', () => {
    it('should correctly compile OP_RETURN SLP SEND transaction', () => {
        const scriptArr = [
            opcodes.OP_RETURN,
            Buffer.from('534c5000', 'hex'),
            Buffer.from('01', 'hex'),
            Buffer.from(`SEND`),
            Buffer.from(
                '73db55368981e4878440637e448d4abe7f661be5c3efdcbcb63bd86a01a76b5a',
                'hex',
            ),
            Buffer.from('00000001', 'hex'),
        ];

        const data = script.compile(scriptArr);

        // convert data to a hex string
        let str = '';
        for (let i = 0; i < data.length; i++) {
            let hex = Number(data[i]).toString(16);

            // zero pad when its a single digit.
            hex = '0' + hex;
            hex = hex.slice(-2);
            //console.log(`hex: ${hex}`)

            str += hex;
        }
        console.log(`Hex string: ${str}`);

        //console.log(`scriptArr: ${JSON.stringify(data,null,2)}`)

        const correctStr =
            '6a04534c500001010453454e442073db55368981e4878440637e448d4abe7f661be5c3efdcbcb63bd86a01a76b5a0400000001';

        assert.equal(str, correctStr);
    });
});
