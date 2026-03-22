// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * PSBT test vectors shared with the Bitcoin ABC node (see `test/functional/data/rpc_psbt.json`
 * and `src/wallet/test/psbt_wallet_tests.cpp`). Ensures ecash-lib stays aligned with BIP 174
 * wire format and node-produced blobs for the fields we support.
 *
 * Cross-check: same filled PSBT bytes as `electrum/electrumabc/tests/test_psbt.py` (`psbt_data`)
 * and `BOOST_CHECK_EQUAL(final_hex, …)` in `src/wallet/test/psbt_wallet_tests.cpp` after `FillPSBT`.
 */

import { expect } from 'chai';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import './initNodeJs.js';
import { Psbt } from './psbt.js';
import { fromHex, toHex } from './io/hex.js';

/**
 * Filled PSBT from wallet tests — byte-identical to `psbt_data` in
 * `electrum/electrumabc/tests/test_psbt.py` and `final_hex` in
 * `src/wallet/test/psbt_wallet_tests.cpp` (`psbt_updater_test`).
 */
const PSBT_WALLET_TESTS_FILLED_HEX =
    '70736274ff0100a0020000000258e87a21b56daf0c23be8e7070456c336f7cbaa5c8757924f545887bb2abdd750000000000ffffffff6b04ec37326fbac8e468a73bf952c8877f84f96c3f9deadeab246455e34fe0cd0100000000ffffffff0270aaf008000000001976a914d85c2b71d0060b09c9886aeb815e50991dda124d88ac00e1f505000000001976a91400aea9a2e5f0f876a588df5546e8742d1d87008f88ac000000000001002080f0fa020000000017a9140fb9463421696b82c833af241c78c17ddbde4934870104475221029583bf39ae0a609747ad199addd634fa6108559d6c5cd39b4c2183f1ab96e07f2102dab61ff49a14db6a7d02b0cd1fbb78fc4b18312b5b4e54dae4dba2fbfef536d752ae2206029583bf39ae0a609747ad199addd634fa6108559d6c5cd39b4c2183f1ab96e07f10d90c6a4f000000800000008000000080220602dab61ff49a14db6a7d02b0cd1fbb78fc4b18312b5b4e54dae4dba2fbfef536d710d90c6a4f0000008000000080010000800001002000c2eb0b0000000017a914f6539307e3a48d1e0136d061f5d1fe19e1a2408987010447522103089dc10c7ac6db54f91329af617333db388cead0c231f723379d1b99030b02dc21023add904f3d6dcf59ddb906b0dee23529b7ffb9ed50e5e86151926860221f0e7352ae2206023add904f3d6dcf59ddb906b0dee23529b7ffb9ed50e5e86151926860221f0e7310d90c6a4f000000800000008003000080220603089dc10c7ac6db54f91329af617333db388cead0c231f723379d1b99030b02dc10d90c6a4f00000080000000800200008000220203a9a4c37f5996d3aa25dbac6b570af0650394492942460b354753ed9eeca5877110d90c6a4f000000800000008004000080002202027f6399757d2eff55a136ad02c684b1838b6556e5f1b6b34282a94b6b5005109610d90c6a4f00000080000000800500008000';

/** Global unsigned tx hex — must match `section0.keypairs[0].valuedata.hex()` in `test_psbt.py`. */
const PSBT_WALLET_TESTS_UNSIGNED_TX_HEX =
    '020000000258e87a21b56daf0c23be8e7070456c336f7cbaa5c8757924f545887bb2abdd750000000000ffffffff6b04ec37326fbac8e468a73bf952c8877f84f96c3f9deadeab246455e34fe0cd0100000000ffffffff0270aaf008000000001976a914d85c2b71d0060b09c9886aeb815e50991dda124d88ac00e1f505000000001976a91400aea9a2e5f0f876a588df5546e8742d1d87008f88ac00000000';

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

/** Path to `bitcoin-abc/test/functional/data/rpc_psbt.json` (npm test cwd is `modules/ecash-lib`). */
function rpcPsbtJsonPath(): string {
    const p = join(process.cwd(), '../../test/functional/data/rpc_psbt.json');
    if (!existsSync(p)) {
        throw new Error(
            `rpc_psbt.json not found at ${p} (run tests from modules/ecash-lib)`,
        );
    }
    return p;
}

describe('Psbt vectors (node rpc_psbt.json)', () => {
    const data = JSON.parse(readFileSync(rpcPsbtJsonPath(), 'utf8')) as {
        valid: string[];
        invalid: string[];
        creator: { result: string }[];
    };

    it('decodes every PSBT the node marks as valid (decodepsbt)', () => {
        for (let i = 0; i < data.valid.length; i++) {
            const buf = Buffer.from(data.valid[i]!, 'base64');
            expect(() => Psbt.fromBytes(new Uint8Array(buf))).to.not.throw();
        }
    });

    it('rejects every PSBT the node marks as invalid (decodepsbt)', () => {
        for (let i = 0; i < data.invalid.length; i++) {
            const buf = Buffer.from(data.invalid[i]!, 'base64');
            expect(() => Psbt.fromBytes(new Uint8Array(buf))).to.throw();
        }
    });

    it('creator PSBT round-trips bytes (walletcreatefundedpsbt shape)', () => {
        const b64 = data.creator[0]!.result;
        const buf = Buffer.from(b64, 'base64');
        const p = Psbt.fromBytes(new Uint8Array(buf));
        expect(Buffer.from(p.toBytes()).equals(buf)).to.equal(true);
        expect(p.inputWitnessIncomplete.every(Boolean)).to.equal(true);
    });

    it('toBytes → fromBytes preserves unsigned tx for valid vectors', () => {
        for (const b64 of data.valid) {
            const buf = Buffer.from(b64, 'base64');
            const p = Psbt.fromBytes(new Uint8Array(buf));
            const p2 = Psbt.fromBytes(p.toBytes());
            expect(p2.unsignedTx.toHex()).to.equal(p.unsignedTx.toHex());
        }
    });

    /**
     * Initial PSBT hex from `src/wallet/test/psbt_wallet_tests.cpp` (before FillPSBT).
     * Same shape as functional `creator` result: global unsigned tx + empty per-input maps.
     */
    it('decodes C++ wallet test PSBT (pre-FillPSBT)', () => {
        const hex =
            '70736274ff0100a0020000000258e87a21b56daf0c23be8e7070456c336f7cbaa5c8757924f545887bb2abdd750000000000ffffffff6b04ec37326fbac8e468a73bf952c8877f84f96c3f9deadeab246455e34fe0cd0100000000ffffffff0270aaf008000000001976a914d85c2b71d0060b09c9886aeb815e50991dda124d88ac00e1f505000000001976a91400aea9a2e5f0f876a588df5546e8742d1d87008f88ac000000000000000000';
        const p = Psbt.fromBytes(fromHex(hex));
        expect(p.unsignedTx.inputs).to.have.length(2);
        expect(p.inputWitnessIncomplete.every(Boolean)).to.equal(true);
    });

    /**
     * Shared with ElectrumABC (`test_psbt.test_deserialize` / `test_round_trip`) and C++
     * `psbt_updater_test`: we decode the same global unsigned tx and preserve the full blob.
     */
    it('matches electrumabc + psbt_wallet_tests.cpp filled PSBT (unsigned tx + round-trip)', () => {
        const raw = fromHex(PSBT_WALLET_TESTS_FILLED_HEX);
        const p = Psbt.fromBytes(raw);
        expect(p.unsignedTx.toHex()).to.equal(
            PSBT_WALLET_TESTS_UNSIGNED_TX_HEX,
        );
        expect(p.inputWitnessIncomplete).to.deep.equal([false, false]);
        expect(bytesEqual(p.toBytes(), raw)).to.equal(
            true,
            `round-trip mismatch; got ${toHex(p.toBytes())}`,
        );
    });
});
