#!/usr/bin/env python3
# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the getavalancheinfo RPC."""
from decimal import Decimal

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.avatools import gen_proof, get_ava_p2p_interface
from test_framework.key import ECKey
from test_framework.messages import LegacyAvalancheProof
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet_util import bytes_to_wif


class GetAvalancheInfoTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [[
            '-enableavalanche=1',
            '-avacooldown=',
            '-avatimeout=100',
            '-enableavalanchepeerdiscovery=1',
            '-avaminquorumstake=250000000',
            '-avaminquorumconnectedstakeratio=0.9',
        ]]

    def run_test(self):
        node = self.nodes[0]

        privkey, proof = gen_proof(node)
        is_legacy = isinstance(proof, LegacyAvalancheProof)

        def handle_legacy_format(expected):
            # Add the payout address to the expected output if the legacy format
            # is diabled
            if not is_legacy and "local" in expected.keys():
                expected["local"]["payout_address"] = ADDRESS_ECREG_UNSPENDABLE

            return expected

        def assert_avalancheinfo(expected):
            assert_equal(
                node.getavalancheinfo(),
                handle_legacy_format(expected)
            )

        coinbase_amount = Decimal('25000000.00')

        self.log.info("The test node has no proof")

        assert_avalancheinfo({
            "active": False,
            "network": {
                "proof_count": 0,
                "connected_proof_count": 0,
                "total_stake_amount": Decimal('0.00'),
                "connected_stake_amount": Decimal('0.00'),
                "node_count": 0,
                "connected_node_count": 0,
                "pending_node_count": 0,
            }
        })

        self.log.info("The test node has a proof")

        self.restart_node(0, self.extra_args[0] + [
            '-enableavalanche=1',
            '-avaproof={}'.format(proof.serialize().hex()),
            '-avamasterkey={}'.format(bytes_to_wif(privkey.get_bytes()))
        ])
        assert_avalancheinfo({
            "active": False,
            "local": {
                "live": False,
                "proofid": f"{proof.proofid:0{64}x}",
                "limited_proofid": f"{proof.limited_proofid:0{64}x}",
                "master": privkey.get_pubkey().get_bytes().hex(),
                "stake_amount": coinbase_amount,
            },
            "network": {
                "proof_count": 0,
                "connected_proof_count": 0,
                "total_stake_amount": Decimal('0.00'),
                "connected_stake_amount": Decimal('0.00'),
                "node_count": 0,
                "connected_node_count": 0,
                "pending_node_count": 0,
            }
        })

        # Mine a block to trigger proof validation
        node.generate(1)
        self.wait_until(
            lambda: node.getavalancheinfo() == handle_legacy_format({
                "active": False,
                "local": {
                    "live": True,
                    "proofid": f"{proof.proofid:0{64}x}",
                    "limited_proofid": f"{proof.limited_proofid:0{64}x}",
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                },
                "network": {
                    "proof_count": 0,
                    "connected_proof_count": 0,
                    "total_stake_amount": Decimal('0.00'),
                    "connected_stake_amount": Decimal('0.00'),
                    "node_count": 0,
                    "connected_node_count": 0,
                    "pending_node_count": 0,
                }
            })
        )

        self.log.info("Connect a bunch of peers and nodes")

        N = 10
        for _ in range(N):
            _privkey, _proof = gen_proof(node)
            n = get_ava_p2p_interface(node)
            success = node.addavalanchenode(
                n.nodeid, _privkey.get_pubkey().get_bytes().hex(), _proof.serialize().hex())
            assert success is True

        assert_avalancheinfo({
            "active": True,
            "local": {
                "live": True,
                "proofid": f"{proof.proofid:0{64}x}",
                "limited_proofid": f"{proof.limited_proofid:0{64}x}",
                "master": privkey.get_pubkey().get_bytes().hex(),
                "stake_amount": coinbase_amount,
            },
            "network": {
                "proof_count": N,
                "connected_proof_count": N,
                "total_stake_amount": coinbase_amount * N,
                "connected_stake_amount": coinbase_amount * N,
                "node_count": N,
                "connected_node_count": N,
                "pending_node_count": 0,
            }
        })

        self.log.info("Disconnect some nodes")

        D = 3
        for _ in range(D):
            n = node.p2ps.pop()
            n.peer_disconnect()
            n.wait_for_disconnect()

        self.wait_until(
            lambda: node.getavalancheinfo() == handle_legacy_format({
                "active": True,
                "local": {
                    "live": True,
                    "proofid": f"{proof.proofid:0{64}x}",
                    "limited_proofid": f"{proof.limited_proofid:0{64}x}",
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                },
                "network": {
                    "proof_count": N,
                    "connected_proof_count": N - D,
                    "total_stake_amount": coinbase_amount * N,
                    "connected_stake_amount": coinbase_amount * (N - D),
                    "node_count": N - D,
                    "connected_node_count": N - D,
                    "pending_node_count": 0,
                }
            })
        )

        self.log.info("Add some pending nodes")

        P = 3
        for _ in range(P):
            dg_priv = ECKey()
            dg_priv.generate()
            dg_pub = dg_priv.get_pubkey().get_bytes().hex()

            _privkey, _proof = gen_proof(node)
            delegation = node.delegateavalancheproof(
                f"{_proof.limited_proofid:0{64}x}",
                bytes_to_wif(_privkey.get_bytes()),
                dg_pub,
                None
            )

            n = get_ava_p2p_interface(node)
            n.send_avahello(delegation, dg_priv)
            # Make sure we completed at least one time the ProcessMessage or we
            # might miss the last pending node for the following assert
            n.sync_with_ping()

        assert_avalancheinfo({
            "active": True,
            "local": {
                "live": True,
                "proofid": f"{proof.proofid:0{64}x}",
                "limited_proofid": f"{proof.limited_proofid:0{64}x}",
                "master": privkey.get_pubkey().get_bytes().hex(),
                "stake_amount": coinbase_amount,
            },
            "network": {
                "proof_count": N,
                "connected_proof_count": N - D,
                "total_stake_amount": coinbase_amount * N,
                "connected_stake_amount": coinbase_amount * (N - D),
                "node_count": N - D + P,
                "connected_node_count": N - D,
                "pending_node_count": P,
            }
        })


if __name__ == '__main__':
    GetAvalancheInfoTest().main()
