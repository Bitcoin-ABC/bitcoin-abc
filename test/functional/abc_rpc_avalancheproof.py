# Copyright (c) 2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test building avalanche proofs and using them to add avalanche peers."""
import base64
from decimal import Decimal

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE, base58_to_byte
from test_framework.avatools import (
    avalanche_proof_from_hex,
    create_coinbase_stakes,
    create_stakes,
    get_proof_ids,
    wait_for_proof,
)
from test_framework.blocktools import COINBASE_MATURITY
from test_framework.cashaddr import PUBKEY_TYPE, encode_full
from test_framework.key import ECKey
from test_framework.messages import (
    AvalancheDelegation,
    AvalancheDelegationLevel,
    AvalancheProof,
    FromHex,
    msg_avaproof,
)
from test_framework.p2p import P2PInterface, p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.test_node import ErrorMatch
from test_framework.util import (
    append_config,
    assert_equal,
    assert_raises_rpc_error,
    uint256_hex,
)
from test_framework.wallet_util import bytes_to_wif

AVALANCHE_MAX_PROOF_STAKES = 1000

PROOF_DUST_THRESHOLD = 1000000.0
"""Minimum amount per UTXO in a proof (in coins, not in satoshis)"""

# From delegation.h
MAX_DELEGATION_LEVELS = 20


def add_interface_node(test_node) -> str:
    """Create a mininode, connect it to test_node, return the nodeid
    of the mininode as registered by test_node.
    """
    n = P2PInterface()
    test_node.add_p2p_connection(n)
    n.wait_for_verack()
    return test_node.getpeerinfo()[-1]["id"]


class AvalancheProofTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 2
        self.noban_tx_relay = True
        self.extra_args = [
            [
                f"-avaproofstakeutxodustthreshold={PROOF_DUST_THRESHOLD}",
                "-avaproofstakeutxoconfirmations=1",
                "-avalancheconflictingproofcooldown=0",
                "-avacooldown=0",
            ]
        ] * self.num_nodes
        self.supports_cli = False
        self.rpc_timeout = 120

    def run_test(self):
        # Turn off node 1 while node 0 mines blocks to generate stakes,
        # so that we can later try starting node 1 with an immature proof.
        self.stop_node(1)

        node = self.nodes[0]

        # FIXME Remove after the hardcoded addresses have been converted in the
        # LUT from test_node.py
        def legacy_to_ecash_p2pkh(legacy):
            payload, _ = base58_to_byte(legacy)
            return encode_full("ecregtest", PUBKEY_TYPE, payload)

        addrkey0 = node.get_deterministic_priv_key()
        node_ecash_addr = legacy_to_ecash_p2pkh(addrkey0.address)

        blockhashes = self.generatetoaddress(
            node, COINBASE_MATURITY, node_ecash_addr, sync_fun=self.no_op
        )

        self.log.info("Make build a valid proof and restart the node to use it")
        privkey = ECKey()
        privkey.set(
            bytes.fromhex(
                "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747"
            ),
            True,
        )
        wif_privkey = bytes_to_wif(privkey.get_bytes())

        def get_hex_pubkey(privkey):
            return privkey.get_pubkey().get_bytes().hex()

        proof_master = get_hex_pubkey(privkey)
        proof_sequence = 11
        proof_expiration = 0
        stakes = create_coinbase_stakes(node, [blockhashes[0]], addrkey0.key)
        proof = node.buildavalancheproof(
            proof_sequence,
            proof_expiration,
            wif_privkey,
            stakes,
            ADDRESS_ECREG_UNSPENDABLE,
        )

        self.log.info("Test decodeavalancheproof RPC")

        # Invalid hex (odd number of hex digits)
        assert_raises_rpc_error(
            -22,
            "Proof must be an hexadecimal string",
            node.decodeavalancheproof,
            proof[:-1],
        )
        # Valid hex but invalid proof
        assert_raises_rpc_error(
            -22, "Proof has invalid format", node.decodeavalancheproof, proof[:-2]
        )

        decoded_proof = node.decodeavalancheproof(proof)

        assert_equal(decoded_proof["sequence"], proof_sequence)
        assert_equal(decoded_proof["expiration"], proof_expiration)
        assert_equal(decoded_proof["master"], proof_master)
        assert_equal(
            decoded_proof["payoutscript"],
            {
                "asm": (
                    "OP_DUP OP_HASH160 0000000000000000000000000000000000000000"
                    " OP_EQUALVERIFY OP_CHECKSIG"
                ),
                "hex": "76a914000000000000000000000000000000000000000088ac",
                "reqSigs": 1,
                "type": "pubkeyhash",
                "addresses": [ADDRESS_ECREG_UNSPENDABLE],
            },
        )

        proofobj = FromHex(AvalancheProof(), proof)
        limited_id_hex = uint256_hex(proofobj.limited_proofid)
        proofid_hex = uint256_hex(proofobj.proofid)

        assert_equal(
            decoded_proof["signature"],
            base64.b64encode(proofobj.signature).decode("ascii"),
        )
        assert_equal(decoded_proof["proofid"], uint256_hex(proofobj.proofid))
        assert_equal(decoded_proof["limitedid"], uint256_hex(proofobj.limited_proofid))
        assert_equal(decoded_proof["staked_amount"], Decimal("50000000.00"))
        assert_equal(decoded_proof["score"], 5000)
        assert_equal(decoded_proof["stakes"][0]["txid"], stakes[0]["txid"])
        assert_equal(decoded_proof["stakes"][0]["vout"], stakes[0]["vout"])
        assert_equal(decoded_proof["stakes"][0]["height"], stakes[0]["height"])
        assert_equal(decoded_proof["stakes"][0]["iscoinbase"], stakes[0]["iscoinbase"])
        assert_equal(decoded_proof["stakes"][0]["address"], node_ecash_addr)
        assert_equal(
            decoded_proof["stakes"][0]["signature"],
            base64.b64encode(proofobj.stakes[0].sig).decode("ascii"),
        )

        # Restart the node with this proof
        self.restart_node(
            0,
            self.extra_args[0]
            + [
                f"-avaproof={proof}",
                "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
            ],
        )

        self.log.info(
            "The proof is registered at first chaintip update if we have inbounds"
        )
        assert_equal(len(node.getavalanchepeerinfo()), 0)
        self.generate(node, 1, sync_fun=self.no_op)
        node.syncwithvalidationinterfacequeue()
        assert_equal(len(node.getavalanchepeerinfo()), 0)

        # Add an inbound and check it now registers the proof
        node.add_p2p_connection(P2PInterface())
        self.generate(node, 1, sync_fun=self.no_op)
        self.wait_until(lambda: len(node.getavalanchepeerinfo()) == 1)

        # This case will occur for users building proofs with a third party
        # tool and then starting a new node that is not yet aware of the
        # transactions used for stakes.
        self.log.info("Start a node with an immature proof")

        stake_age = node.getblockcount() + 2
        self.restart_node(
            1,
            self.extra_args[0]
            + [
                f"-avaproofstakeutxoconfirmations={stake_age}",
                f"-avaproof={proof}",
                "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
            ],
        )

        self.connect_nodes(1, node.index)
        self.sync_blocks()

        # Add an inbound so the node proof can be registered and advertised
        self.nodes[1].add_p2p_connection(P2PInterface())
        # Mine a block to trigger an attempt at registering the proof
        self.generate(self.nodes[1], 1, sync_fun=self.no_op)
        wait_for_proof(self.nodes[1], proofid_hex, expect_status="immature")

        # Mine another block to make the proof mature
        self.generate(self.nodes[1], 1, sync_fun=self.no_op)
        self.wait_until(
            lambda: self.nodes[1].getrawavalancheproof(proofid_hex)["boundToPeer"]
            is True
        )

        self.log.info("Generate delegations for the proof, verify and decode them")

        # Stack up a few delegation levels
        def gen_privkey():
            pk = ECKey()
            pk.generate()
            return pk

        delegator_privkey = privkey
        delegation = None
        for i in range(MAX_DELEGATION_LEVELS):
            delegated_privkey = gen_privkey()
            delegated_pubkey = get_hex_pubkey(delegated_privkey)
            delegation = node.delegateavalancheproof(
                limited_id_hex,
                bytes_to_wif(delegator_privkey.get_bytes()),
                delegated_pubkey,
                delegation,
            )

            assert node.verifyavalanchedelegation(delegation)

            dg_info = node.decodeavalanchedelegation(delegation)
            assert_equal(dg_info["pubkey"], delegated_pubkey)
            assert_equal(dg_info["proofmaster"], proof_master)
            assert "delegationid" in dg_info.keys()
            assert_equal(dg_info["limitedid"], limited_id_hex)
            assert_equal(dg_info["proofid"], proofid_hex)
            assert_equal(dg_info["depth"], i + 1)
            assert_equal(len(dg_info["levels"]), dg_info["depth"])
            assert_equal(dg_info["levels"][-1]["pubkey"], delegated_pubkey)
            assert "signature" in dg_info["levels"][-1]

            delegator_privkey = delegated_privkey

        self.log.info("Check the delegation levels are limited")
        too_many_levels_privkey = gen_privkey()
        too_many_levels_delegation = node.delegateavalancheproof(
            limited_id_hex,
            bytes_to_wif(delegator_privkey.get_bytes()),
            get_hex_pubkey(too_many_levels_privkey),
            delegation,
        )

        assert_raises_rpc_error(
            -8,
            "too-many-levels",
            node.verifyavalanchedelegation,
            too_many_levels_delegation,
        )

        random_privkey = gen_privkey()
        random_pubkey = get_hex_pubkey(random_privkey)

        # Invalid proof
        no_stake = node.buildavalancheproof(
            proof_sequence, proof_expiration, wif_privkey, []
        )

        # Invalid privkey
        assert_raises_rpc_error(
            -5,
            "The private key is invalid",
            node.delegateavalancheproof,
            limited_id_hex,
            bytes_to_wif(bytes(32)),
            random_pubkey,
        )

        # Invalid delegation
        bad_dg = AvalancheDelegation()
        assert_raises_rpc_error(
            -8,
            "The delegation does not match the proof",
            node.delegateavalancheproof,
            limited_id_hex,
            bytes_to_wif(privkey.get_bytes()),
            random_pubkey,
            bad_dg.serialize().hex(),
        )

        # Still invalid, but with a matching proofid
        bad_dg.limited_proofid = proofobj.limited_proofid
        bad_dg.proof_master = proofobj.master
        bad_dg.levels = [AvalancheDelegationLevel()]
        assert_raises_rpc_error(
            -8,
            "The delegation is invalid",
            node.delegateavalancheproof,
            limited_id_hex,
            bytes_to_wif(privkey.get_bytes()),
            random_pubkey,
            bad_dg.serialize().hex(),
        )

        # Wrong privkey, match the proof but does not match the delegation
        assert_raises_rpc_error(
            -5,
            "The private key does not match the delegation",
            node.delegateavalancheproof,
            limited_id_hex,
            bytes_to_wif(privkey.get_bytes()),
            random_pubkey,
            delegation,
        )

        # Delegation not hex
        assert_raises_rpc_error(
            -22,
            "Delegation must be an hexadecimal string.",
            node.delegateavalancheproof,
            limited_id_hex,
            bytes_to_wif(privkey.get_bytes()),
            random_pubkey,
            "f00",
        )
        # Delegation is hex but ill-formed
        assert_raises_rpc_error(
            -22,
            "Delegation has invalid format",
            node.delegateavalancheproof,
            limited_id_hex,
            bytes_to_wif(privkey.get_bytes()),
            random_pubkey,
            "dead",
        )

        # Test invalid proofs
        dust = node.buildavalancheproof(
            proof_sequence,
            proof_expiration,
            wif_privkey,
            create_coinbase_stakes(node, [blockhashes[0]], addrkey0.key, amount="0"),
        )

        dust2 = node.buildavalancheproof(
            proof_sequence,
            proof_expiration,
            wif_privkey,
            create_coinbase_stakes(
                node,
                [blockhashes[0]],
                addrkey0.key,
                amount=f"{PROOF_DUST_THRESHOLD * 0.9999:.2f}",
            ),
        )

        missing_stake = node.buildavalancheproof(
            proof_sequence,
            proof_expiration,
            wif_privkey,
            [
                {
                    "txid": "0" * 64,
                    "vout": 0,
                    "amount": 10000000,
                    "height": 42,
                    "iscoinbase": False,
                    "privatekey": addrkey0.key,
                }
            ],
        )

        # The hardcoded proofs are extracted from proof_tests.cpp
        duplicate_stake = (
            "c964aa6fde575e4ce8404581c7be874e21023beefdde700a6bc02036335b4df141"
            "c8bc67bb05a971f5ac2745fd683797dde302d1e26c2287948bc6ab2b55945c591b"
            "8ba3ffa237f5d9164d30a4f10145a61f788e639b1480731e2aead30500bf846287"
            "2102449fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6"
            "806b8111af77e1076caba7cb76de29abae963b7f6a1879318e8e37ff488d5843b7"
            "83215fe9561431ac55ecef78ce214869aac0c271d35bee7fdb0858a7ddffe3b0d1"
            "e26c2287948bc6ab2b55945c591b8ba3ffa237f5d9164d30a4f10145a61f788e63"
            "9b1480731e2aead30500bf8462872102449fb5237efe8f647d32e8b64f06c22d1d"
            "40368eaca2a71ffc6a13ecc8bce6802f5c4b2a2ab7fb315d3b9e0318e4e90faa99"
            "7f28ea6fb31c3487332718079c10131da1acd028a093be651330679bb02bd47105"
            "3e18a590e373a08c2e60ca15f92321038439233261789dd340bdc1450172d9c671"
            "b72ee8c0b2736ed2a3a250760897fdac3dfb66133d94674a3a6565d8f84e1a31e2"
            "f79a4bb399c04adc802abcf8b395f62315d3ad8450ba57e11dfb61b1f5a7325094"
            "d5ffda1f5830e0990dcc2ebb9be8"
        )

        bad_sig = (
            "d97587e6c882615797011ec8f9a7b1c621023beefdde700a6bc02036335b4df141"
            "c8bc67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cff"
            "e53967e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a3"
            "2102449fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6"
            "8099f1e258ab54f960102c8b480e1dd5795422791bb8a7a19e5542fe8b6a76df7f"
            "a09a3fd4be62db750131f1fbea6f7bb978288f7fe941c39ef625aa80576e19fc43"
            "410469ab5a892ffa4bb104a3d5760dd893a5502512eea4ba32a6d6672767be4959"
            "c0f70489b803a47a3abf83f30e8d9da978de4027c70ce7e0d3b0ad62eb08edd8f9"
            "ac5995555107107e656abd8e2852f311ff0f5c4f606695b63ec44e04303e3378a2"
            "e21e16bf05727240ebee1334d2f858c6c2e3bdd8d289400b99d7f70b35f9d2fa"
        )

        wrong_order = (
            "00000000000000000000000000000000210253269c2f402b903876823d5dbe55e0"
            "7587ad1eabedab80a89197e9d3b869049e026e5c784de9870d66427124dd1c657b"
            "a38f783d3475d4d4e2f9efe5d05b2907fbfc1a6c5100c817a80400000014000000"
            "210253269c2f402b903876823d5dbe55e07587ad1eabedab80a89197e9d3b86904"
            "9e235eea7e3be14fab2c54e6333dc1307f990a88fd6106c2d0615d61fde200bc9a"
            "c0d7681ec9d49ece57c93208543ae8142ea878a5941ae917f01ccd3c8a9f3ec01e"
            "d1fb02e131c7c37451780836dfa281056ac22dae68031c655b591cbbbf9a9b08cd"
            "8a6000c817a80400000014000000210253269c2f402b903876823d5dbe55e07587"
            "ad1eabedab80a89197e9d3b869049e6d4ca3de37afe93f956d50f2455c11541f09"
            "f0dca8316fb119ab8a605ff7f5b866df91c1b3df17810b943253b38ac6fa1d8bfc"
            "cc1cc1151ff91e7d7d531c88911976a91400000000000000000000000000000000"
            "0000000088acc07fe1333c229902879510ef5c5081d793451aa88253a77b69688d"
            "01206c035b1c6a0db54d60bd840862030e9a2e35b2f82d92c0e0298e2cde435974"
            "998d95ed"
        )

        expired = node.buildavalancheproof(
            proof_sequence,
            1,
            wif_privkey,
            create_coinbase_stakes(node, [blockhashes[0]], addrkey0.key),
        )

        self.log.info("Check the verifyavalancheproof and sendavalancheproof RPCs")

        if self.is_wallet_compiled():
            self.import_deterministic_coinbase_privkeys()

            self.log.info("Check a proof with the maximum number of UTXO is valid")
            new_blocks = self.generate(
                node, AVALANCHE_MAX_PROOF_STAKES // 10 + 1, sync_fun=self.no_op
            )
            # confirm the coinbase UTXOs
            self.generate(node, 101, sync_fun=self.no_op)
            too_many_stakes = create_stakes(
                self, node, new_blocks, AVALANCHE_MAX_PROOF_STAKES + 1
            )
            # Make the newly split UTXOs mature
            self.generate(node, stake_age, sync_fun=self.no_op)

            maximum_stakes = too_many_stakes[:-1]
            good_proof = node.buildavalancheproof(
                proof_sequence, proof_expiration, wif_privkey, maximum_stakes
            )

            too_many_utxos = node.buildavalancheproof(
                proof_sequence, proof_expiration, wif_privkey, too_many_stakes
            )

            assert node.verifyavalancheproof(good_proof)

        for rpc in [node.verifyavalancheproof, node.sendavalancheproof]:
            assert_raises_rpc_error(
                -22, "Proof must be an hexadecimal string", rpc, "f00"
            )
            assert_raises_rpc_error(-22, "Proof has invalid format", rpc, "f00d")

            def check_rpc_failure(proof, message):
                assert_raises_rpc_error(
                    -8, f"The proof is invalid: {message}", rpc, proof
                )

            check_rpc_failure(no_stake, "no-stake")
            check_rpc_failure(dust, "amount-below-dust-threshold")
            check_rpc_failure(duplicate_stake, "duplicated-stake")
            check_rpc_failure(missing_stake, "utxo-missing-or-spent")
            check_rpc_failure(bad_sig, "invalid-stake-signature")
            check_rpc_failure(wrong_order, "wrong-stake-ordering")
            check_rpc_failure(expired, "expired-proof")
            if self.is_wallet_compiled():
                check_rpc_failure(too_many_utxos, "too-many-utxos")

        conflicting_utxo = node.buildavalancheproof(
            proof_sequence - 1, proof_expiration, wif_privkey, stakes
        )
        assert_raises_rpc_error(
            -8, "conflicting-utxos", node.sendavalancheproof, conflicting_utxo
        )

        # Clear the proof pool
        stake_age = node.getblockcount()
        self.restart_node(
            0,
            self.extra_args[0]
            + [
                f"-avaproofstakeutxoconfirmations={stake_age}",
                "-avalancheconflictingproofcooldown=0",
            ],
        )

        # Good proof
        assert node.verifyavalancheproof(proof)

        peer = node.add_p2p_connection(P2PInterface())

        proofid = FromHex(AvalancheProof(), proof).proofid
        node.sendavalancheproof(proof)
        assert proofid in get_proof_ids(node)

        def inv_found():
            with p2p_lock:
                return (
                    peer.last_message.get("inv")
                    and peer.last_message["inv"].inv[-1].hash == proofid
                )

        self.wait_until(inv_found)

        self.log.info("Check the getrawproof RPC")

        raw_proof = node.getrawavalancheproof(uint256_hex(proofid))
        assert_equal(raw_proof["proof"], proof)
        assert_equal(raw_proof["immature"], False)
        assert_equal(raw_proof["boundToPeer"], True)
        assert_equal(raw_proof["conflicting"], False)
        assert_equal(raw_proof["finalized"], False)

        assert_raises_rpc_error(
            -8, "Proof not found", node.getrawavalancheproof, "0" * 64
        )

        conflicting_proof = node.buildavalancheproof(
            proof_sequence - 1, proof_expiration, wif_privkey, stakes
        )
        conflicting_proofobj = avalanche_proof_from_hex(conflicting_proof)
        conflicting_proofid_hex = uint256_hex(conflicting_proofobj.proofid)

        msg = msg_avaproof()
        msg.proof = conflicting_proofobj
        peer.send_message(msg)
        wait_for_proof(node, conflicting_proofid_hex, expect_status="conflicting")

        raw_proof = node.getrawavalancheproof(conflicting_proofid_hex)
        assert_equal(raw_proof["proof"], conflicting_proof)
        assert_equal(raw_proof["immature"], False)
        assert_equal(raw_proof["boundToPeer"], False)
        assert_equal(raw_proof["conflicting"], True)
        assert_equal(raw_proof["finalized"], False)

        # Make the proof immature by switching to a shorter chain
        node.invalidateblock(node.getbestblockhash())
        # Although the chaintip has changed, updatedBlockTip does not get
        # called unless new chainwork needs evaluating, so invalidate another
        # block and then mine a new one.
        node.invalidateblock(node.getbestblockhash())
        node.setmocktime(node.getblock(node.getbestblockhash())["mediantime"] + 100)
        self.generate(node, 1, sync_fun=self.no_op)

        # Wait until UpdatedBlockTip has been called so we know the proof
        # validity has updated
        node.syncwithvalidationinterfacequeue()

        raw_proof = node.getrawavalancheproof(uint256_hex(proofid))
        assert_equal(raw_proof["proof"], proof)
        assert_equal(raw_proof["immature"], True)
        assert_equal(raw_proof["boundToPeer"], False)
        assert_equal(raw_proof["conflicting"], False)
        assert_equal(raw_proof["finalized"], False)

        self.log.info("Bad proof should be rejected at startup")

        self.stop_node(0)

        node.assert_start_raises_init_error(
            self.extra_args[0]
            + [
                "-avasessionkey=0",
            ],
            expected_msg="Error: The avalanche session key is invalid.",
        )

        node.assert_start_raises_init_error(
            self.extra_args[0]
            + [
                f"-avaproof={proof}",
            ],
            expected_msg=(
                "Error: The avalanche master key is missing for the avalanche proof."
            ),
        )

        node.assert_start_raises_init_error(
            self.extra_args[0]
            + [
                f"-avaproof={proof}",
                "-avamasterkey=0",
            ],
            expected_msg="Error: The avalanche master key is invalid.",
        )

        def check_proof_init_error(proof, message):
            node.assert_start_raises_init_error(
                self.extra_args[0]
                + [
                    f"-avaproof={proof}",
                    "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
                ],
                expected_msg=f"Error: {message}",
            )

        check_proof_init_error(no_stake, "The avalanche proof has no stake.")
        check_proof_init_error(dust, "The avalanche proof stake is too low.")
        check_proof_init_error(dust2, "The avalanche proof stake is too low.")
        check_proof_init_error(
            duplicate_stake, "The avalanche proof has duplicated stake."
        )
        check_proof_init_error(
            bad_sig, "The avalanche proof has invalid stake signatures."
        )
        if self.is_wallet_compiled():
            # The too many utxos case creates a proof which is that large that it
            # cannot fit on the command line
            append_config(node.datadir, [f"avaproof={too_many_utxos}"])
            node.assert_start_raises_init_error(
                self.extra_args[0]
                + [
                    "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
                ],
                expected_msg="Error: The avalanche proof has too many utxos.",
                match=ErrorMatch.PARTIAL_REGEX,
            )

        # Master private key mismatch
        random_privkey = ECKey()
        random_privkey.generate()
        node.assert_start_raises_init_error(
            self.extra_args[0]
            + [
                f"-avaproof={proof}",
                f"-avamasterkey={bytes_to_wif(random_privkey.get_bytes())}",
            ],
            expected_msg="Error: The master key does not match the proof public key.",
        )

        self.log.info("Bad delegation should be rejected at startup")

        def check_delegation_init_error(delegation, message):
            node.assert_start_raises_init_error(
                self.extra_args[0]
                + [
                    f"-avadelegation={delegation}",
                    f"-avaproof={proof}",
                    f"-avamasterkey={bytes_to_wif(delegated_privkey.get_bytes())}",
                    # Prevent the node from adding a delegation level
                    f"-avasessionkey={bytes_to_wif(delegated_privkey.get_bytes())}",
                ],
                expected_msg=f"Error: {message}",
            )

        check_delegation_init_error(
            AvalancheDelegation().serialize().hex(),
            "The delegation does not match the proof.",
        )

        bad_level_sig = FromHex(AvalancheDelegation(), delegation)
        # Tweak some key to cause the signature to mismatch
        bad_level_sig.levels[-2].pubkey = bytes.fromhex(proof_master)
        check_delegation_init_error(
            bad_level_sig.serialize().hex(),
            "The avalanche delegation has invalid signatures.",
        )

        node.assert_start_raises_init_error(
            self.extra_args[0]
            + [
                f"-avadelegation={delegation}",
                f"-avaproof={proof}",
                f"-avamasterkey={bytes_to_wif(random_privkey.get_bytes())}",
            ],
            expected_msg=(
                "Error: The master key does not match the delegation public key."
            ),
        )

        # The node stacks another delegation level at startup
        node.assert_start_raises_init_error(
            self.extra_args[0]
            + [
                f"-avadelegation={delegation}",
                f"-avaproof={proof}",
                f"-avamasterkey={bytes_to_wif(delegated_privkey.get_bytes())}",
            ],
            expected_msg=(
                "Error: The avalanche delegation has too many delegation levels."
            ),
        )

        node.assert_start_raises_init_error(
            self.extra_args[0]
            + [
                f"-avadelegation={too_many_levels_delegation}",
                f"-avaproof={proof}",
                f"-avamasterkey={bytes_to_wif(too_many_levels_privkey.get_bytes())}",
                f"-avasessionkey={bytes_to_wif(too_many_levels_privkey.get_bytes())}",
            ],
            expected_msg=(
                "Error: The avalanche delegation has too many delegation levels."
            ),
        )


if __name__ == "__main__":
    AvalancheProofTest().main()
