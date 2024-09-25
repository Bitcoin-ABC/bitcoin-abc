# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the avalanche cooldown between polls."""
import time

from test_framework.avatools import get_ava_p2p_interface
from test_framework.blocktools import COINBASE_MATURITY
from test_framework.key import ECPubKey
from test_framework.messages import (
    MSG_AVA_PROOF,
    MSG_BLOCK,
    MSG_TX,
    AvalancheVoteError,
    CInv,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet import MiniWallet

QUORUM_NODE_COUNT = 16


class AvalancheCooldownTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [
            [
                "-enableminerfund",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-whitelist=noban@127.0.0.1",
                "-avacooldown=10000",
                "-persistavapeers=0",
                # For polling transactions
                "-avalanchepreconsensus=1",
            ],
        ]

    def run_test(self):
        node = self.nodes[0]

        # Build a fake quorum of nodes.
        def get_quorum():
            return [
                get_ava_p2p_interface(self, node) for _ in range(0, QUORUM_NODE_COUNT)
            ]

        # Pick one node from the quorum for polling.
        quorum = get_quorum()
        poll_node = quorum[0]

        assert node.getavalancheinfo()["ready_to_poll"] is True

        proofid = poll_node.proof.proofid

        # Make a transaction to poll
        wallet = MiniWallet(node)
        self.generate(wallet, 1, sync_fun=self.no_op)
        self.generate(node, COINBASE_MATURITY, sync_fun=self.no_op)
        txid = int(wallet.send_self_transfer(from_node=node)["txid"], 16)

        tip = int(self.generate(node, 1)[-1], 16)

        avakey = ECPubKey()
        avakey.set(bytes.fromhex(node.getavalanchekey()))

        # Create a helper to issue a poll and validate the responses
        def check_poll(inv, expect_response):
            inv_hash, inv_type = inv
            poll_node.send_poll([inv_hash], inv_type)

            if not expect_response:
                return

            response = poll_node.wait_for_avaresponse()
            r = response.response

            assert avakey.verify_schnorr(response.sig, r.get_hash())

            votes = r.votes
            assert_equal(len(votes), 1)
            for i in range(0, len(votes)):
                if votes[i].hash == inv_hash:
                    assert_equal(votes[i].error, AvalancheVoteError.ACCEPTED)

        self.log.info("First poll is legit")
        check_poll(inv=(tip, MSG_BLOCK), expect_response=True)

        for inv in [(tip, MSG_BLOCK), (proofid, MSG_AVA_PROOF), (txid, MSG_TX)]:
            self.log.info(
                "Subsequent polls are spams for type {CInv().typemap[inv[1]]}"
            )
            for _ in range(3):
                with node.assert_debug_log(
                    ["Ignoring repeated avapoll", "cooldown not elapsed"]
                ):
                    check_poll(inv=inv, expect_response=False)

        # Restart with 100ms cooldown. Unfortunately we can't mock time as the
        # node uses the steady clock which is not mockable.
        cooldown_ms = 100
        self.restart_node(
            0, extra_args=self.extra_args[0] + [f"-avacooldown={cooldown_ms}"]
        )

        quorum = get_quorum()
        poll_node = quorum[0]

        assert node.getavalancheinfo()["ready_to_poll"] is True

        proofid = poll_node.proof.proofid

        # Make a transaction to poll
        self.generate(wallet, 1, sync_fun=self.no_op)
        self.generate(node, COINBASE_MATURITY, sync_fun=self.no_op)
        txid = int(wallet.send_self_transfer(from_node=node)["txid"], 16)

        tip = int(self.generate(node, 1)[-1], 16)
        avakey.set(bytes.fromhex(node.getavalanchekey()))

        for inv in [(tip, MSG_BLOCK), (proofid, MSG_AVA_PROOF), (txid, MSG_TX)]:
            self.log.info(f"First poll is legit for type {CInv().typemap[inv[1]]}")
            check_poll(inv=inv, expect_response=True)

            self.log.info("Subsequent polls are legit")
            for _ in range(3):
                time.sleep(cooldown_ms / 1000)
                check_poll(inv=inv, expect_response=True)

            # Cooldown between inv types
            time.sleep(cooldown_ms / 1000)


if __name__ == "__main__":
    AvalancheCooldownTest().main()
