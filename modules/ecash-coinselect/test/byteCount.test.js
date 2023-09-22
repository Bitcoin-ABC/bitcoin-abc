// Copyright (c) 2018 Daniel Cousens
// Copyright (c) 2023 Bitcoin ABC
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const { inputBytes, outputBytes } = require('../src/byteCount');

// Input constants from byteCount.js
const TX_INPUT_BASE = 32 + 4 + 1 + 4;
const TX_INPUT_PUBKEYHASH = 107;
// Sample input script
const P2PKH_INPUT_SCRIPT =
    '483045022100aac70814db602323543d8b5812d055d33df510f8ad580b4fbf4ed699f7a61da902204308e84d596ddc42f3eadef6fad1ec16c05aefd90655a0659351d20d12e67f0f412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6';

const TX_OUTPUT_BASE = 8 + 1;
const TX_OUTPUT_PUBKEYHASH = 25;
// Sample output script
const OP_RETURN_MAX_SIZE =
    '6a04007461624cd75f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f5f5f5f5f5f5f31305f5f323135';

describe('ecash-coinselect byteCount.js functions', async function () {
    it('inputBytes() returns expected estimate for a utxo without script defined', function () {
        const utxo = { value: 1000 };
        assert.strictEqual(
            inputBytes(utxo),
            TX_INPUT_BASE + TX_INPUT_PUBKEYHASH,
        );
    });
    it('inputBytes() returns expected estimate for a utxo with script specified as a hex string', function () {
        const utxo = { value: 1000, script: P2PKH_INPUT_SCRIPT };
        assert.strictEqual(
            inputBytes(utxo),
            TX_INPUT_BASE + P2PKH_INPUT_SCRIPT.length / 2,
        );
    });
    it('inputBytes() returns expected estimate for a utxo with script specified as a buffer', function () {
        const scriptBuffer = Buffer.from(P2PKH_INPUT_SCRIPT, 'hex');
        const utxo = {
            value: 1000,
            script: scriptBuffer,
        };
        assert.strictEqual(
            inputBytes(utxo),
            TX_INPUT_BASE + scriptBuffer.length,
        );
    });
    it('inputBytes() throws expected error if script is a string that is not a valid hexadecimal string', function () {
        const unrecognizedScriptType =
            'here is a string that is not hexadecimal';
        const utxo = {
            value: 1000,
            script: unrecognizedScriptType,
        };

        assert.throws(() => {
            inputBytes(utxo);
        }, Error('Unrecognized script type'));
    });
    it('inputBytes() throws expected error if script is specified as an unknown type', function () {
        const unrecognizedScriptType = ['one', 'two', 'three'];
        const utxo = {
            value: 1000,
            script: unrecognizedScriptType,
        };

        assert.throws(() => {
            inputBytes(utxo);
        }, Error('Unrecognized script type'));
    });
    it('outputBytes() returns expected estimate for an output without script defined', function () {
        const output = { value: 1000 };
        assert.strictEqual(
            outputBytes(output),
            TX_OUTPUT_BASE + TX_OUTPUT_PUBKEYHASH,
        );
    });
    it('outputBytes() returns expected estimate for an output with script specified as a hex string', function () {
        const output = { value: 1000, script: OP_RETURN_MAX_SIZE };
        assert.strictEqual(
            outputBytes(output),
            TX_OUTPUT_BASE + OP_RETURN_MAX_SIZE.length / 2,
        );
    });
    it('outputBytes() returns expected estimate for an output with script specified as a buffer', function () {
        // Note: While this library uses ArrayBuffer for type checking, it's important to support Buffer inputs
        // as existing node and React apps / libraries use this type
        const scriptBuffer = Buffer.from(OP_RETURN_MAX_SIZE, 'hex');
        const output = {
            value: 1000,
            script: scriptBuffer,
        };
        assert.strictEqual(
            outputBytes(output),
            TX_OUTPUT_BASE + scriptBuffer.length,
        );
    });
    it('outputBytes() returns expected estimate for an output with script specified as a uint8array', function () {
        const scriptBuffer = Buffer.from(OP_RETURN_MAX_SIZE, 'hex');

        // Convert to uint8array
        const scriptArrayBuffer = new ArrayBuffer(scriptBuffer.length);
        const scriptUint8Array = new Uint8Array(scriptArrayBuffer);
        for (let i = 0; i < scriptUint8Array.length; i += 1) {
            scriptUint8Array[i] = scriptBuffer[i];
        }

        const output = {
            value: 1000,
            script: scriptUint8Array,
        };
        assert.strictEqual(
            outputBytes(output),
            TX_OUTPUT_BASE + scriptUint8Array.length,
        );
    });
    it('outputBytes() throws expected error if script is a string that is not a valid hexadecimal string', function () {
        const unrecognizedScriptType =
            'here is a string that is not hexadecimal';
        const utxo = {
            value: 1000,
            script: unrecognizedScriptType,
        };

        assert.throws(() => {
            outputBytes(utxo);
        }, Error('Unrecognized script type'));
    });
    it('outputBytes() throws expected error if script is specified as an unknown type', function () {
        const unrecognizedScriptType = ['one', 'two', 'three'];
        const utxo = {
            value: 1000,
            script: unrecognizedScriptType,
        };

        assert.throws(() => {
            outputBytes(utxo);
        }, Error('Unrecognized script type'));
    });
});
