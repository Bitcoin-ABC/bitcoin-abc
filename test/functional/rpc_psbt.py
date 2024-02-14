# Copyright (c) 2018 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the Partially Signed Transaction RPCs.
"""

import json
import os
from decimal import Decimal

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_approx,
    assert_equal,
    assert_raises_rpc_error,
    find_output,
)

# Create one-input, one-output, no-fee transaction:


class PSBTTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 3
        self.supports_cli = False

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def run_test(self):
        # Create and fund a raw tx for sending 10 BTC
        psbtx1 = self.nodes[0].walletcreatefundedpsbt(
            [], {self.nodes[2].getnewaddress(): 10000000}
        )["psbt"]

        # If inputs are specified, do not automatically add more:
        utxo1 = self.nodes[0].listunspent()[0]
        assert_raises_rpc_error(
            -4,
            "Insufficient funds",
            self.nodes[0].walletcreatefundedpsbt,
            [{"txid": utxo1["txid"], "vout": utxo1["vout"]}],
            {self.nodes[2].getnewaddress(): 90000000},
        )

        psbtx1 = self.nodes[0].walletcreatefundedpsbt(
            [{"txid": utxo1["txid"], "vout": utxo1["vout"]}],
            {self.nodes[2].getnewaddress(): 90000000},
            0,
            {"add_inputs": True},
        )["psbt"]
        assert_equal(len(self.nodes[0].decodepsbt(psbtx1)["tx"]["vin"]), 2)

        # Inputs argument can be null
        self.nodes[0].walletcreatefundedpsbt(None, {self.nodes[2].getnewaddress(): 10})

        # Node 1 should not be able to add anything to it but still return the
        # psbtx same as before
        psbtx = self.nodes[1].walletprocesspsbt(psbtx1)["psbt"]
        assert_equal(psbtx1, psbtx)

        # Sign the transaction and send
        signed_tx = self.nodes[0].walletprocesspsbt(psbtx)["psbt"]
        final_tx = self.nodes[0].finalizepsbt(signed_tx)["hex"]
        self.nodes[0].sendrawtransaction(final_tx)

        # Manually selected inputs can be locked:
        assert_equal(len(self.nodes[0].listlockunspent()), 0)
        utxo1 = self.nodes[0].listunspent()[0]
        psbtx1 = self.nodes[0].walletcreatefundedpsbt(
            [{"txid": utxo1["txid"], "vout": utxo1["vout"]}],
            {self.nodes[2].getnewaddress(): 1_000_000},
            0,
            {"lockUnspents": True},
        )["psbt"]
        assert_equal(len(self.nodes[0].listlockunspent()), 1)

        # Locks are ignored for manually selected inputs
        self.nodes[0].walletcreatefundedpsbt(
            [{"txid": utxo1["txid"], "vout": utxo1["vout"]}],
            {self.nodes[2].getnewaddress(): 1_000_000},
            0,
        )

        # Create p2sh, p2pkh addresses
        pubkey0 = self.nodes[0].getaddressinfo(self.nodes[0].getnewaddress())["pubkey"]
        pubkey1 = self.nodes[1].getaddressinfo(self.nodes[1].getnewaddress())["pubkey"]
        pubkey2 = self.nodes[2].getaddressinfo(self.nodes[2].getnewaddress())["pubkey"]
        p2sh = self.nodes[1].addmultisigaddress(2, [pubkey0, pubkey1, pubkey2], "")[
            "address"
        ]
        p2pkh = self.nodes[1].getnewaddress("")

        # fund those addresses
        rawtx = self.nodes[0].createrawtransaction(
            [], {p2sh: 10000000, p2pkh: 10000000}
        )
        rawtx = self.nodes[0].fundrawtransaction(rawtx, {"changePosition": 0})
        signed_tx = self.nodes[0].signrawtransactionwithwallet(rawtx["hex"])["hex"]
        txid = self.nodes[0].sendrawtransaction(signed_tx)
        self.generate(self.nodes[0], 6)

        # Find the output pos
        p2sh_pos = -1
        p2pkh_pos = -1
        decoded = self.nodes[0].decoderawtransaction(signed_tx)
        for out in decoded["vout"]:
            if out["scriptPubKey"]["addresses"][0] == p2sh:
                p2sh_pos = out["n"]
            elif out["scriptPubKey"]["addresses"][0] == p2pkh:
                p2pkh_pos = out["n"]

        # spend single key from node 1
        rawtx = self.nodes[1].walletcreatefundedpsbt(
            [{"txid": txid, "vout": p2pkh_pos}],
            {self.nodes[1].getnewaddress(): 9990000},
        )["psbt"]
        walletprocesspsbt_out = self.nodes[1].walletprocesspsbt(rawtx)
        # Make sure it has UTXOs
        decoded = self.nodes[1].decodepsbt(walletprocesspsbt_out["psbt"])
        assert "utxo" in decoded["inputs"][0]
        assert_equal(walletprocesspsbt_out["complete"], True)
        self.nodes[1].sendrawtransaction(
            self.nodes[1].finalizepsbt(walletprocesspsbt_out["psbt"])["hex"]
        )

        inputs = [{"txid": txid, "vout": p2sh_pos}, {"txid": txid, "vout": p2pkh_pos}]
        output = {self.nodes[1].getnewaddress(): 29_990_000}

        self.log.info(
            "Test walletcreatefundedpsbt feeRate of 100,000 XEC/kB produces a "
            "total fee at or slightly below -maxtxfee"
        )
        res = self.nodes[1].walletcreatefundedpsbt(
            inputs, output, 0, {"feeRate": 100_000, "add_inputs": True}
        )
        assert_approx(res["fee"], 65000, 5000)

        self.log.info(
            "Test walletcreatefundedpsbt feeRate of 10,000,000 XEC/kB  produces "
            "a total fee well above -maxtxfee and raises RPC error"
        )
        # previously this was silently capped at -maxtxfee
        for bool_add, output_ in (
            (True, output),
            (False, {self.nodes[1].getnewaddress(): 1_000_000}),
        ):
            assert_raises_rpc_error(
                -4,
                "Fee exceeds maximum configured by user (e.g. -maxtxfee, maxfeerate)",
                self.nodes[1].walletcreatefundedpsbt,
                inputs,
                output_,
                0,
                {"feeRate": 10_000_000, "add_inputs": bool_add},
            )

        self.log.info("Test various PSBT operations")
        # partially sign multisig things with node 1
        psbtx = self.nodes[1].walletcreatefundedpsbt(
            [{"txid": txid, "vout": p2sh_pos}], {self.nodes[1].getnewaddress(): 9990000}
        )["psbt"]
        walletprocesspsbt_out = self.nodes[1].walletprocesspsbt(psbtx)
        psbtx = walletprocesspsbt_out["psbt"]
        assert_equal(walletprocesspsbt_out["complete"], False)

        # partially sign with node 2. This should be complete and sendable
        walletprocesspsbt_out = self.nodes[2].walletprocesspsbt(psbtx)
        assert_equal(walletprocesspsbt_out["complete"], True)
        self.nodes[2].sendrawtransaction(
            self.nodes[2].finalizepsbt(walletprocesspsbt_out["psbt"])["hex"]
        )

        # check that walletprocesspsbt fails to decode a non-psbt
        rawtx = self.nodes[1].createrawtransaction(
            [{"txid": txid, "vout": p2pkh_pos}],
            {self.nodes[1].getnewaddress(): 9990000},
        )
        assert_raises_rpc_error(
            -22, "TX decode failed", self.nodes[1].walletprocesspsbt, rawtx
        )

        # Convert a non-psbt to psbt and make sure we can decode it
        rawtx = self.nodes[0].createrawtransaction(
            [], {self.nodes[1].getnewaddress(): 10000000}
        )
        rawtx = self.nodes[0].fundrawtransaction(rawtx)
        new_psbt = self.nodes[0].converttopsbt(rawtx["hex"])
        self.nodes[0].decodepsbt(new_psbt)

        # Make sure that a non-psbt with signatures cannot be converted
        # Error is "Inputs must not have scriptSigs"
        signedtx = self.nodes[0].signrawtransactionwithwallet(rawtx["hex"])
        assert_raises_rpc_error(-22, "", self.nodes[0].converttopsbt, signedtx["hex"])
        assert_raises_rpc_error(
            -22, "", self.nodes[0].converttopsbt, signedtx["hex"], False
        )
        # Unless we allow it to convert and strip signatures
        self.nodes[0].converttopsbt(signedtx["hex"], True)

        # Explicilty allow converting non-empty txs
        new_psbt = self.nodes[0].converttopsbt(rawtx["hex"])
        self.nodes[0].decodepsbt(new_psbt)

        # Create outputs to nodes 1 and 2
        node1_addr = self.nodes[1].getnewaddress()
        node2_addr = self.nodes[2].getnewaddress()
        txid1 = self.nodes[0].sendtoaddress(node1_addr, 13000000)
        txid2 = self.nodes[0].sendtoaddress(node2_addr, 13000000)
        blockhash = self.generate(self.nodes[0], 6)[0]
        vout1 = find_output(self.nodes[1], txid1, 13000000, blockhash=blockhash)
        vout2 = find_output(self.nodes[2], txid2, 13000000, blockhash=blockhash)

        # Create a psbt spending outputs from nodes 1 and 2
        psbt_orig = self.nodes[0].createpsbt(
            [{"txid": txid1, "vout": vout1}, {"txid": txid2, "vout": vout2}],
            {self.nodes[0].getnewaddress(): 25999000},
        )

        # Update psbts, should only have data for one input and not the other
        psbt1 = self.nodes[1].walletprocesspsbt(psbt_orig, False, "ALL|FORKID")["psbt"]
        psbt1_decoded = self.nodes[0].decodepsbt(psbt1)
        assert psbt1_decoded["inputs"][0] and not psbt1_decoded["inputs"][1]
        # Check that BIP32 path was added
        assert "bip32_derivs" in psbt1_decoded["inputs"][0]
        psbt2 = self.nodes[2].walletprocesspsbt(psbt_orig, False, "ALL|FORKID", False)[
            "psbt"
        ]
        psbt2_decoded = self.nodes[0].decodepsbt(psbt2)
        assert not psbt2_decoded["inputs"][0] and psbt2_decoded["inputs"][1]
        # Check that BIP32 paths were not added
        assert "bip32_derivs" not in psbt2_decoded["inputs"][1]

        # Sign PSBTs (workaround issue #18039)
        psbt1 = self.nodes[1].walletprocesspsbt(psbt_orig)["psbt"]
        psbt2 = self.nodes[2].walletprocesspsbt(psbt_orig)["psbt"]

        # Combine, finalize, and send the psbts
        combined = self.nodes[0].combinepsbt([psbt1, psbt2])
        finalized = self.nodes[0].finalizepsbt(combined)["hex"]
        self.nodes[0].sendrawtransaction(finalized)
        self.generate(self.nodes[0], 6)

        block_height = self.nodes[0].getblockcount()
        unspent = self.nodes[0].listunspent()[0]

        # Make sure change address wallet does not have P2SH innerscript access to results in success
        # when attempting BnB coin selection
        self.nodes[0].walletcreatefundedpsbt(
            [],
            [{self.nodes[2].getnewaddress(): unspent["amount"] + 1000000}],
            block_height + 2,
            {"changeAddress": self.nodes[1].getnewaddress()},
            False,
        )

        # Regression test for 14473 (mishandling of already-signed
        # transaction):
        psbtx_info = self.nodes[0].walletcreatefundedpsbt(
            [{"txid": unspent["txid"], "vout": unspent["vout"]}],
            [{self.nodes[2].getnewaddress(): unspent["amount"] + 1000000}],
            0,
            {"add_inputs": True},
        )
        complete_psbt = self.nodes[0].walletprocesspsbt(psbtx_info["psbt"])
        double_processed_psbt = self.nodes[0].walletprocesspsbt(complete_psbt["psbt"])
        assert_equal(complete_psbt, double_processed_psbt)
        # We don't care about the decode result, but decoding must succeed.
        self.nodes[0].decodepsbt(double_processed_psbt["psbt"])

        # Make sure unsafe inputs are included if specified
        self.nodes[2].createwallet(wallet_name="unsafe")
        wunsafe = self.nodes[2].get_wallet_rpc("unsafe")
        self.nodes[0].sendtoaddress(wunsafe.getnewaddress(), 2_000_000)
        self.sync_mempools()
        assert_raises_rpc_error(
            -4,
            "Insufficient funds",
            wunsafe.walletcreatefundedpsbt,
            [],
            [{self.nodes[0].getnewaddress(): 1_000_000}],
        )
        wunsafe.walletcreatefundedpsbt(
            [],
            [{self.nodes[0].getnewaddress(): 1_000_000}],
            0,
            {"include_unsafe": True},
        )

        # BIP 174 Test Vectors

        # Check that unknown values are just passed through
        unknown_psbt = "cHNidP8BAD8CAAAAAf//////////////////////////////////////////AAAAAAD/////AQAAAAAAAAAAA2oBAAAAAAAACg8BAgMEBQYHCAkPAQIDBAUGBwgJCgsMDQ4PAAA="
        unknown_out = self.nodes[0].walletprocesspsbt(unknown_psbt)["psbt"]
        assert_equal(unknown_psbt, unknown_out)

        # Open the data file
        with open(
            os.path.join(
                os.path.dirname(os.path.realpath(__file__)), "data/rpc_psbt.json"
            ),
            encoding="utf-8",
        ) as f:
            d = json.load(f)
            invalids = d["invalid"]
            valids = d["valid"]
            creators = d["creator"]
            signers = d["signer"]
            combiners = d["combiner"]
            finalizers = d["finalizer"]
            extractors = d["extractor"]

        # Invalid PSBTs
        for invalid in invalids:
            assert_raises_rpc_error(
                -22, "TX decode failed", self.nodes[0].decodepsbt, invalid
            )

        # Valid PSBTs
        for valid in valids:
            self.nodes[0].decodepsbt(valid)

        # Creator Tests
        for creator in creators:
            created_tx = self.nodes[0].createpsbt(creator["inputs"], creator["outputs"])
            assert_equal(created_tx, creator["result"])

        # Signer tests
        for i, signer in enumerate(signers):
            self.nodes[2].createwallet(f"wallet{i}")
            wrpc = self.nodes[2].get_wallet_rpc(f"wallet{i}")
            for key in signer["privkeys"]:
                wrpc.importprivkey(key)
            signed_tx = wrpc.walletprocesspsbt(signer["psbt"])["psbt"]
            assert_equal(signed_tx, signer["result"])

        # Combiner test
        for combiner in combiners:
            combined = self.nodes[2].combinepsbt(combiner["combine"])
            assert_equal(combined, combiner["result"])

        # Empty combiner test
        assert_raises_rpc_error(
            -8, "Parameter 'txs' cannot be empty", self.nodes[0].combinepsbt, []
        )

        # Finalizer test
        for finalizer in finalizers:
            finalized = self.nodes[2].finalizepsbt(finalizer["finalize"], False)["psbt"]
            assert_equal(finalized, finalizer["result"])

        # Extractor test
        for extractor in extractors:
            extracted = self.nodes[2].finalizepsbt(extractor["extract"], True)["hex"]
            assert_equal(extracted, extractor["result"])

        # Test decoding error: invalid base64
        assert_raises_rpc_error(
            -22,
            "TX decode failed invalid base64",
            self.nodes[0].decodepsbt,
            ";definitely not base64;",
        )

        # Test that psbts with p2pkh outputs are created properly
        p2pkh = self.nodes[0].getnewaddress()
        psbt = self.nodes[1].walletcreatefundedpsbt(
            [], [{p2pkh: 1000000}], 0, {"includeWatching": True}, True
        )
        self.nodes[0].decodepsbt(psbt["psbt"])

        # Send to all types of addresses
        addr1 = self.nodes[1].getnewaddress("")  # originally bech32
        txid1 = self.nodes[0].sendtoaddress(addr1, 11000000)
        vout1 = find_output(self.nodes[0], txid1, 11000000)
        addr2 = self.nodes[1].getnewaddress("")  # originally legacy
        txid2 = self.nodes[0].sendtoaddress(addr2, 11000000)
        vout2 = find_output(self.nodes[0], txid2, 11000000)
        addr3 = self.nodes[1].getnewaddress("")  # originally p2sh-segwit
        txid3 = self.nodes[0].sendtoaddress(addr3, 11000000)
        vout3 = find_output(self.nodes[0], txid3, 11000000)
        self.sync_all()

        def test_psbt_input_keys(psbt_input, keys):
            """Check that the psbt input has only the expected keys."""
            assert_equal(set(keys), set(psbt_input.keys()))

        # Create a PSBT. None of the inputs are filled initially
        psbt = self.nodes[1].createpsbt(
            [
                {"txid": txid1, "vout": vout1},
                {"txid": txid2, "vout": vout2},
                {"txid": txid3, "vout": vout3},
            ],
            {self.nodes[0].getnewaddress(): 32999000},
        )
        decoded = self.nodes[1].decodepsbt(psbt)
        test_psbt_input_keys(decoded["inputs"][0], [])
        test_psbt_input_keys(decoded["inputs"][1], [])
        test_psbt_input_keys(decoded["inputs"][2], [])

        # Update a PSBT with UTXOs from the node
        updated = self.nodes[1].utxoupdatepsbt(psbt)
        decoded = self.nodes[1].decodepsbt(updated)
        test_psbt_input_keys(decoded["inputs"][1], [])
        test_psbt_input_keys(decoded["inputs"][2], [])

        # Try again, now while providing descriptors
        descs = [
            self.nodes[1].getaddressinfo(addr)["desc"] for addr in [addr1, addr2, addr3]
        ]
        updated = self.nodes[1].utxoupdatepsbt(psbt=psbt, descriptors=descs)
        decoded = self.nodes[1].decodepsbt(updated)
        test_psbt_input_keys(decoded["inputs"][1], [])

        # Two PSBTs with a common input should not be joinable
        psbt1 = self.nodes[1].createpsbt(
            [{"txid": txid1, "vout": vout1}],
            {self.nodes[0].getnewaddress(): Decimal("10999000")},
        )
        assert_raises_rpc_error(
            -8, "exists in multiple PSBTs", self.nodes[1].joinpsbts, [psbt1, updated]
        )

        # Join two distinct PSBTs
        addr4 = self.nodes[1].getnewaddress("")
        txid4 = self.nodes[0].sendtoaddress(addr4, 5000000)
        vout4 = find_output(self.nodes[0], txid4, 5000000)
        self.generate(self.nodes[0], 6)
        psbt2 = self.nodes[1].createpsbt(
            [{"txid": txid4, "vout": vout4}],
            {self.nodes[0].getnewaddress(): Decimal("4999000")},
        )
        psbt2 = self.nodes[1].walletprocesspsbt(psbt2)["psbt"]
        psbt2_decoded = self.nodes[0].decodepsbt(psbt2)
        assert "final_scriptSig" in psbt2_decoded["inputs"][0]
        joined = self.nodes[0].joinpsbts([psbt, psbt2])
        joined_decoded = self.nodes[0].decodepsbt(joined)
        assert (
            len(joined_decoded["inputs"]) == 4
            and len(joined_decoded["outputs"]) == 2
            and "final_scriptSig" not in joined_decoded["inputs"][3]
        )

        # Fail when trying to join less than two PSBTs
        assert_raises_rpc_error(
            -8,
            "At least two PSBTs are required to join PSBTs.",
            self.nodes[1].joinpsbts,
            [],
        )
        assert_raises_rpc_error(
            -8,
            "At least two PSBTs are required to join PSBTs.",
            self.nodes[1].joinpsbts,
            [psbt2],
        )

        # Check that joining shuffles the inputs and outputs
        # 10 attempts should be enough to get a shuffled join
        shuffled = False
        for _ in range(10):
            shuffled_joined = self.nodes[0].joinpsbts([psbt, psbt2])
            shuffled |= joined != shuffled_joined
            if shuffled:
                break
        assert shuffled

        # Newly created PSBT needs UTXOs and updating
        addr = self.nodes[1].getnewaddress("")
        txid = self.nodes[0].sendtoaddress(addr, 7000000)
        blockhash = self.generate(self.nodes[0], 6)[0]
        vout = find_output(self.nodes[0], txid, 7000000, blockhash=blockhash)
        psbt = self.nodes[1].createpsbt(
            [{"txid": txid, "vout": vout}],
            {self.nodes[0].getnewaddress(""): Decimal("6999000")},
        )
        analyzed = self.nodes[0].analyzepsbt(psbt)
        assert (
            not analyzed["inputs"][0]["has_utxo"]
            and not analyzed["inputs"][0]["is_final"]
            and analyzed["inputs"][0]["next"] == "updater"
            and analyzed["next"] == "updater"
        )

        # After update with wallet, only needs signing
        updated = self.nodes[1].walletprocesspsbt(psbt, False, "ALL|FORKID", True)[
            "psbt"
        ]
        analyzed = self.nodes[0].analyzepsbt(updated)
        assert (
            analyzed["inputs"][0]["has_utxo"]
            and not analyzed["inputs"][0]["is_final"]
            and analyzed["inputs"][0]["next"] == "signer"
            and analyzed["next"] == "signer"
        )

        # Check fee and size things
        assert (
            analyzed["fee"] == Decimal("1000")
            and analyzed["estimated_vsize"] == 191
            and analyzed["estimated_feerate"] == Decimal("5235.60")
        )

        # After signing and finalizing, needs extracting
        signed = self.nodes[1].walletprocesspsbt(updated)["psbt"]
        analyzed = self.nodes[0].analyzepsbt(signed)
        assert (
            analyzed["inputs"][0]["has_utxo"]
            and analyzed["inputs"][0]["is_final"]
            and analyzed["next"] == "extractor"
        )

        self.log.info(
            "PSBT spending unspendable outputs should have error message and Creator as"
            " next"
        )
        analysis = self.nodes[0].analyzepsbt(
            "cHNidP8BAJoCAAAAAljoeiG1ba8MI76OcHBFbDNvfLqlyHV5JPVFiHuyq911AAAAAAD/////g40EJ9DsZQpoqka7CwmK6kQiwHGyyng1Kgd5WdB86h0BAAAAAP////8CcKrwCAAAAAAWAEHYXCtx0AYLCcmIauuBXlCZHdoSTQDh9QUAAAAAFv8/wADXYP/7//////8JxOh0LR2HAI8AAAAAAAEAIADC6wsAAAAAF2oUt/X69ELjeX2nTof+fZ10l+OyAokDAQcJAwEHEAABAACAAAEAIADC6wsAAAAAF2oUt/X69ELjeX2nTof+fZ10l+OyAokDAQcJAwEHENkMak8AAAAA"
        )
        assert_equal(analysis["next"], "creator")
        assert_equal(
            analysis["error"], "PSBT is not valid. Input 0 spends unspendable output"
        )

        self.log.info(
            "PSBT with invalid values should have error message and Creator as next"
        )
        analysis = self.nodes[0].analyzepsbt(
            "cHNidP8BAHECAAAAAfA00BFgAm6tp86RowwH6BMImQNL5zXUcTT97XoLGz0BAAAAAAD/////AgD5ApUAAAAAFgAUKNw0x8HRctAgmvoevm4u1SbN7XL87QKVAAAAABYAFPck4gF7iL4NL4wtfRAKgQbghiTUAAAAAAABAB8AgIFq49AHABYAFJUDtxf2PHo641HEOBOAIvFMNTr2AAAA"
        )
        assert_equal(analysis["next"], "creator")
        assert_equal(analysis["error"], "PSBT is not valid. Input 0 has invalid value")

        self.log.info(
            "PSBT with signed, but not finalized, inputs should have Finalizer as next"
        )
        analysis = self.nodes[0].analyzepsbt(finalizers[0]["finalize"])
        assert_equal(analysis["next"], "finalizer")

        analysis = self.nodes[0].analyzepsbt(
            "cHNidP8BAHECAAAAAfA00BFgAm6tp86RowwH6BMImQNL5zXUcTT97XoLGz0BAAAAAAD/////AgCAgWrj0AcAFgAUKNw0x8HRctAgmvoevm4u1SbN7XL87QKVAAAAABYAFPck4gF7iL4NL4wtfRAKgQbghiTUAAAAAAABAB8A8gUqAQAAABYAFJUDtxf2PHo641HEOBOAIvFMNTr2AAAA"
        )
        assert_equal(analysis["next"], "creator")
        assert_equal(analysis["error"], "PSBT is not valid. Output amount invalid")


if __name__ == "__main__":
    PSBTTest().main()
