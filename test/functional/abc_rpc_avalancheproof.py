#!/usr/bin/env python3
# Copyright (c) 2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test building avalanche proofs and using them to add avalanche peers."""
import base64
from decimal import Decimal

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.avatools import (
    create_coinbase_stakes,
    create_stakes,
    get_proof_ids,
    wait_for_proof,
)
from test_framework.key import ECKey
from test_framework.messages import (
    AvalancheDelegation,
    AvalancheDelegationLevel,
    FromHex,
    LegacyAvalancheProof,
)
from test_framework.p2p import P2PInterface, p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.test_node import ErrorMatch
from test_framework.util import (
    append_config,
    assert_equal,
    assert_raises_rpc_error,
    connect_nodes,
)
from test_framework.wallet_util import bytes_to_wif

AVALANCHE_MAX_PROOF_STAKES = 1000

PROOF_DUST_THRESHOLD = 1000000.0
"""Minimum amount per UTXO in a proof (in coins, not in satoshis)"""


def add_interface_node(test_node) -> str:
    """Create a mininode, connect it to test_node, return the nodeid
    of the mininode as registered by test_node.
    """
    n = P2PInterface()
    test_node.add_p2p_connection(n)
    n.wait_for_verack()
    return test_node.getpeerinfo()[-1]['id']


class LegacyAvalancheProofTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 2
        self.extra_args = [['-enableavalanche=1', '-avacooldown=0'],
                           ['-enableavalanche=1', '-avacooldown=0']]
        self.supports_cli = False
        self.rpc_timeout = 120

    def run_test(self):
        # Turn off node 1 while node 0 mines blocks to generate stakes,
        # so that we can later try starting node 1 with an orphan proof.
        self.stop_node(1)

        node = self.nodes[0]

        addrkey0 = node.get_deterministic_priv_key()
        blockhashes = node.generatetoaddress(100, addrkey0.address)

        self.log.info(
            "Make build a valid proof and restart the node to use it")
        privkey = ECKey()
        privkey.set(bytes.fromhex(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747"), True)
        wif_privkey = bytes_to_wif(privkey.get_bytes())

        def get_hex_pubkey(privkey):
            return privkey.get_pubkey().get_bytes().hex()

        proof_master = get_hex_pubkey(privkey)
        proof_sequence = 11
        proof_expiration = 12
        stakes = create_coinbase_stakes(node, [blockhashes[0]], addrkey0.key)
        proof = node.buildavalancheproof(
            proof_sequence, proof_expiration, wif_privkey, stakes)

        self.log.info("Test decodeavalancheproof RPC")
        proofobj = FromHex(LegacyAvalancheProof(), proof)
        decodedproof = node.decodeavalancheproof(proof)
        limited_id_hex = f"{proofobj.limited_proofid:0{64}x}"
        assert_equal(decodedproof["sequence"], proof_sequence)
        assert_equal(decodedproof["expiration"], proof_expiration)
        assert_equal(decodedproof["master"], proof_master)
        assert_equal(decodedproof["proofid"], f"{proofobj.proofid:0{64}x}")
        assert_equal(decodedproof["limitedid"], limited_id_hex)
        assert_equal(decodedproof["stakes"][0]["txid"], stakes[0]["txid"])
        assert_equal(decodedproof["stakes"][0]["vout"], stakes[0]["vout"])
        assert_equal(decodedproof["stakes"][0]["height"], stakes[0]["height"])
        assert_equal(
            decodedproof["stakes"][0]["iscoinbase"],
            stakes[0]["iscoinbase"])
        assert_equal(
            decodedproof["stakes"][0]["signature"],
            base64.b64encode(proofobj.stakes[0].sig).decode("ascii"))

        # Invalid hex (odd number of hex digits)
        assert_raises_rpc_error(-22, "Proof must be an hexadecimal string",
                                node.decodeavalancheproof, proof[:-1])
        # Valid hex but invalid proof
        assert_raises_rpc_error(-22, "Proof has invalid format",
                                node.decodeavalancheproof, proof[:-2])

        # Restart the node with this proof
        self.restart_node(0, self.extra_args[0] + [
            "-avaproof={}".format(proof),
            "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
        ])

        self.log.info("The proof is registered at first chaintip update")
        assert_equal(len(node.getavalanchepeerinfo()), 0)
        node.generate(1)
        self.wait_until(lambda: len(node.getavalanchepeerinfo()) == 1,
                        timeout=5)

        # This case will occur for users building proofs with a third party
        # tool and then starting a new node that is not yet aware of the
        # transactions used for stakes.
        self.log.info("Start a node with an orphan proof")

        self.start_node(1, self.extra_args[0] + [
            "-avaproof={}".format(proof),
            "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
        ])
        # Mine a block to trigger an attempt at registering the proof
        self.nodes[1].generate(1)
        wait_for_proof(self.nodes[1], f"{proofobj.proofid:0{64}x}",
                       expect_orphan=True)

        self.log.info("Connect to an up-to-date node to unorphan the proof")
        connect_nodes(self.nodes[1], node)
        self.sync_all()
        wait_for_proof(self.nodes[1], f"{proofobj.proofid:0{64}x}",
                       expect_orphan=False)

        self.log.info("Generate delegations for the proof")

        # Stack up a few delegation levels
        def gen_privkey():
            pk = ECKey()
            pk.generate()
            return pk

        delegator_privkey = privkey
        delegation = None
        for _ in range(10):
            delegated_privkey = gen_privkey()
            delegation = node.delegateavalancheproof(
                limited_id_hex,
                bytes_to_wif(delegator_privkey.get_bytes()),
                get_hex_pubkey(delegated_privkey),
                delegation,
            )
            delegator_privkey = delegated_privkey

        random_privkey = gen_privkey()
        random_pubkey = get_hex_pubkey(random_privkey)

        # Invalid proof
        no_stake = node.buildavalancheproof(proof_sequence, proof_expiration,
                                            wif_privkey, [])

        # Invalid privkey
        assert_raises_rpc_error(-5, "The private key is invalid",
                                node.delegateavalancheproof,
                                limited_id_hex,
                                bytes_to_wif(bytes(32)),
                                random_pubkey,
                                )

        # Invalid delegation
        bad_dg = AvalancheDelegation()
        assert_raises_rpc_error(-8, "The delegation does not match the proof",
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
        assert_raises_rpc_error(-8, "The delegation is invalid",
                                node.delegateavalancheproof,
                                limited_id_hex,
                                bytes_to_wif(privkey.get_bytes()),
                                random_pubkey,
                                bad_dg.serialize().hex(),
                                )

        # Wrong privkey, match the proof but does not match the delegation
        assert_raises_rpc_error(-5, "The private key does not match the delegation",
                                node.delegateavalancheproof,
                                limited_id_hex,
                                bytes_to_wif(privkey.get_bytes()),
                                random_pubkey,
                                delegation,
                                )

        # Delegation not hex
        assert_raises_rpc_error(-22, "Delegation must be an hexadecimal string.",
                                node.delegateavalancheproof,
                                limited_id_hex,
                                bytes_to_wif(privkey.get_bytes()),
                                random_pubkey,
                                "f00",
                                )
        # Delegation is hex but ill-formed
        assert_raises_rpc_error(-22, "Delegation has invalid format",
                                node.delegateavalancheproof,
                                limited_id_hex,
                                bytes_to_wif(privkey.get_bytes()),
                                random_pubkey,
                                "dead",
                                )

        # Test invalid proofs
        dust = node.buildavalancheproof(
            proof_sequence, proof_expiration, wif_privkey,
            create_coinbase_stakes(node, [blockhashes[0]], addrkey0.key, amount="0"))

        dust_amount = Decimal(f"{PROOF_DUST_THRESHOLD * 0.9999:.4f}")
        dust2 = node.buildavalancheproof(
            proof_sequence, proof_expiration, wif_privkey,
            create_coinbase_stakes(node, [blockhashes[0]], addrkey0.key,
                                   amount=str(dust_amount)))

        missing_stake = node.buildavalancheproof(
            proof_sequence, proof_expiration, wif_privkey, [{
                'txid': '0' * 64,
                'vout': 0,
                'amount': 10000000,
                'height': 42,
                'iscoinbase': False,
                'privatekey': addrkey0.key,
            }]
        )

        duplicate_stake = ("0b000000000000000c0000000000000021030b4c866585dd868"
                           "a9d62348a9cd008d6a312937048fff31670e7e920cfc7a74402"
                           "05c5f72f5d6da3085583e75ee79340eb4eff208c89988e7ed0e"
                           "fb30b87298fa30000000000f2052a0100000003000000210227"
                           "d85ba011276cf25b51df6a188b75e604b38770a462b2d0e9fb2"
                           "fc839ef5d3f86076def2e8bc3c40671c1a0eb505da5857a950a"
                           "0cf4625a80018cdd75ac62e61273ff8142f747de67e73f6368c"
                           "8648942b0ef6c065d72a81ad7438a23c11cca05c5f72f5d6da3"
                           "085583e75ee79340eb4eff208c89988e7ed0efb30b87298fa30"
                           "000000000f2052a0100000003000000210227d85ba011276cf2"
                           "5b51df6a188b75e604b38770a462b2d0e9fb2fc839ef5d3f860"
                           "76def2e8bc3c40671c1a0eb505da5857a950a0cf4625a80018c"
                           "dd75ac62e61273ff8142f747de67e73f6368c8648942b0ef6c0"
                           "65d72a81ad7438a23c11cca")

        bad_sig = ("0b000000000000000c0000000000000021030b4c866585dd868a9d62348"
                   "a9cd008d6a312937048fff31670e7e920cfc7a7440105c5f72f5d6da3085"
                   "583e75ee79340eb4eff208c89988e7ed0efb30b87298fa30000000000f20"
                   "52a0100000003000000210227d85ba011276cf25b51df6a188b75e604b3"
                   "8770a462b2d0e9fb2fc839ef5d3faf07f001dd38e9b4a43d07d5d449cc0"
                   "f7d2888d96b82962b3ce516d1083c0e031773487fc3c4f2e38acd1db974"
                   "1321b91a79b82d1c2cfd47793261e4ba003cf5")

        wrong_order = ("c964aa6fde575e4ce8404581c7be874e21023beefdde700a6bc0203"
                       "6335b4df141c8bc67bb05a971f5ac2745fd683797dde30305d427b7"
                       "06705a5d4b6a368a231d6db62abacf8c29bc32b61e7f65a0a6976aa"
                       "8b86b687bc0260e821e4f0200b9d3bf6d2102449fb5237efe8f647d"
                       "32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68052365271b"
                       "6c71189f5cd7e3b694b77b579080f0b35bae567b96590ab6aa3019b"
                       "018ff9f061f52f1426bdb195d4b6d4dff5114cee90e33dabf0c588e"
                       "badf7774418f54247f6390791706af36fac782302479898b5273f9e"
                       "51a92cb1fb5af43deeb6c8c269403d30ffcb380300134398c42103e"
                       "49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0"
                       "f9e645efa08e97ea0c60e1f0a064fbf08989c084707082727e85dcb"
                       "9f79bb503f76ee6c8dad42a07ef15c89b3750a5631d604b21fafff0"
                       "f4de354ade95c2f28160ae549af0d4ce48c4ca9d0714b1fa5192027"
                       "0f8575e0af610f07b4e602a018ecdbb649b64fff614c0026e9fc8e0"
                       "030092533d422103aac52f4cfca700e7e9824298e0184755112e32f"
                       "359c832f5f6ad2ef62a2c024af812d6d7f2ecc6223a774e19bce1fb"
                       "20d94d6b01ea693638f55c74fdaa5358fa9239d03e4caf3d817e8f7"
                       "48ccad55a27b9d365db06ad5a0b779ac385f3dc8710")

        self.log.info(
            "Check the verifyavalancheproof and sendavalancheproof RPCs")

        if self.is_wallet_compiled():
            self.log.info(
                "Check a proof with the maximum number of UTXO is valid")
            new_blocks = node.generate(AVALANCHE_MAX_PROOF_STAKES // 10 + 1)
            # confirm the coinbase UTXOs
            node.generate(101)
            too_many_stakes = create_stakes(
                node, new_blocks, AVALANCHE_MAX_PROOF_STAKES + 1)
            maximum_stakes = too_many_stakes[:-1]

            good_proof = node.buildavalancheproof(
                proof_sequence, proof_expiration,
                wif_privkey, maximum_stakes)

            too_many_utxos = node.buildavalancheproof(
                proof_sequence, proof_expiration,
                wif_privkey, too_many_stakes)

            assert node.verifyavalancheproof(good_proof)

        for rpc in [node.verifyavalancheproof, node.sendavalancheproof]:
            assert_raises_rpc_error(-22, "Proof must be an hexadecimal string",
                                    rpc, "f00")
            assert_raises_rpc_error(-22, "Proof has invalid format",
                                    rpc, "f00d")

            def check_rpc_failure(proof, message):
                assert_raises_rpc_error(-8, "The proof is invalid: " + message,
                                        rpc, proof)

            check_rpc_failure(no_stake, "no-stake")
            check_rpc_failure(dust, "amount-below-dust-threshold")
            check_rpc_failure(duplicate_stake, "duplicated-stake")
            check_rpc_failure(missing_stake, "utxo-missing-or-spent")
            check_rpc_failure(bad_sig, "invalid-stake-signature")
            check_rpc_failure(wrong_order, "wrong-stake-ordering")
            if self.is_wallet_compiled():
                check_rpc_failure(too_many_utxos, "too-many-utxos")

        conflicting_utxo = node.buildavalancheproof(
            proof_sequence + 1, proof_expiration, wif_privkey, stakes)
        assert_raises_rpc_error(-8, "The proof has conflicting utxo with an existing proof",
                                    node.sendavalancheproof, conflicting_utxo)

        # Good proof
        assert node.verifyavalancheproof(proof)

        peer = node.add_p2p_connection(P2PInterface())

        proofid = FromHex(LegacyAvalancheProof(), proof).proofid
        node.sendavalancheproof(proof)
        assert proofid in get_proof_ids(node)

        def inv_found():
            with p2p_lock:
                return peer.last_message.get(
                    "inv") and peer.last_message["inv"].inv[-1].hash == proofid
        self.wait_until(inv_found)

        self.log.info("Check the getrawproof RPC")

        raw_proof = node.getrawavalancheproof("{:064x}".format(proofid))
        assert_equal(raw_proof['proof'], proof)
        assert_equal(raw_proof['orphan'], False)

        assert_raises_rpc_error(-8, "Proof not found",
                                node.getrawavalancheproof, '0' * 64)

        # Orphan the proof by sending the stake
        raw_tx = node.createrawtransaction(
            [{"txid": stakes[-1]["txid"], "vout": 0}],
            {ADDRESS_ECREG_UNSPENDABLE: stakes[-1]
                ["amount"] - Decimal('10000')}
        )
        signed_tx = node.signrawtransactionwithkey(raw_tx, [addrkey0.key])
        node.sendrawtransaction(signed_tx["hex"])
        node.generate(1)
        self.wait_until(lambda: proofid not in get_proof_ids(node))

        raw_proof = node.getrawavalancheproof("{:064x}".format(proofid))
        assert_equal(raw_proof['proof'], proof)
        assert_equal(raw_proof['orphan'], True)

        self.log.info("Bad proof should be rejected at startup")

        self.stop_node(0)

        node.assert_start_raises_init_error(
            self.extra_args[0] + [
                "-avasessionkey=0",
            ],
            expected_msg="Error: The avalanche session key is invalid.",
        )

        node.assert_start_raises_init_error(
            self.extra_args[0] + [
                "-avaproof={}".format(proof),
            ],
            expected_msg="Error: The avalanche master key is missing for the avalanche proof.",
        )

        node.assert_start_raises_init_error(
            self.extra_args[0] + [
                "-avaproof={}".format(proof),
                "-avamasterkey=0",
            ],
            expected_msg="Error: The avalanche master key is invalid.",
        )

        def check_proof_init_error(proof, message):
            node.assert_start_raises_init_error(
                self.extra_args[0] + [
                    "-avaproof={}".format(proof),
                    "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
                ],
                expected_msg="Error: " + message,
            )

        check_proof_init_error(no_stake,
                               "The avalanche proof has no stake.")
        check_proof_init_error(dust,
                               "The avalanche proof stake is too low.")
        check_proof_init_error(dust2,
                               "The avalanche proof stake is too low.")
        check_proof_init_error(duplicate_stake,
                               "The avalanche proof has duplicated stake.")
        check_proof_init_error(bad_sig,
                               "The avalanche proof has invalid stake signatures.")
        if self.is_wallet_compiled():
            # The too many utxos case creates a proof which is that large that it
            # cannot fit on the command line
            append_config(node.datadir, ["avaproof={}".format(too_many_utxos)])
            node.assert_start_raises_init_error(
                self.extra_args[0] + [
                    "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
                ],
                expected_msg="Error: The avalanche proof has too many utxos.",
                match=ErrorMatch.PARTIAL_REGEX,
            )

        # Master private key mismatch
        random_privkey = ECKey()
        random_privkey.generate()
        node.assert_start_raises_init_error(
            self.extra_args[0] + [
                "-avaproof={}".format(proof),
                "-avamasterkey={}".format(
                    bytes_to_wif(random_privkey.get_bytes())),
            ],
            expected_msg="Error: The master key does not match the proof public key.",
        )

        self.log.info("Bad delegation should be rejected at startup")

        def check_delegation_init_error(delegation, message):
            node.assert_start_raises_init_error(
                self.extra_args[0] + [
                    "-avadelegation={}".format(delegation),
                    "-avaproof={}".format(proof),
                    "-avamasterkey={}".format(
                        bytes_to_wif(delegated_privkey.get_bytes())),
                ],
                expected_msg="Error: " + message,
            )

        check_delegation_init_error(
            AvalancheDelegation().serialize().hex(),
            "The delegation does not match the proof.")

        bad_level_sig = FromHex(AvalancheDelegation(), delegation)
        # Tweak some key to cause the signature to mismatch
        bad_level_sig.levels[-2].pubkey = bytes.fromhex(proof_master)
        check_delegation_init_error(bad_level_sig.serialize().hex(),
                                    "The avalanche delegation has invalid signatures.")

        node.assert_start_raises_init_error(
            self.extra_args[0] + [
                "-avadelegation={}".format(delegation),
                "-avaproof={}".format(proof),
                "-avamasterkey={}".format(
                    bytes_to_wif(random_privkey.get_bytes())),
            ],
            expected_msg="Error: The master key does not match the delegation public key.",
        )


if __name__ == '__main__':
    LegacyAvalancheProofTest().main()
