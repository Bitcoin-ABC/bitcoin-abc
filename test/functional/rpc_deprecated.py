# Copyright (c) 2017-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test deprecation of RPC calls."""
import time

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.avatools import (
    can_find_inv_in_poll,
    gen_proof,
    get_ava_p2p_interface,
)
from test_framework.messages import AvalancheProofVoteResponse
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, uint256_hex
from test_framework.wallet_util import bytes_to_wif


class DeprecatedRpcTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-whitelist=noban@127.0.0.1",
                "-avalanchestakingrewards=1",
            ],
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-whitelist=noban@127.0.0.1",
                "-avalanchestakingrewards=1",
                "-deprecatedrpc=getstakingreward",
            ],
        ]

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def run_test(self):
        # This test should be used to verify correct behaviour of deprecated
        # RPC methods with and without the -deprecatedrpc flags. For example:
        #
        # In set_test_params:
        # self.extra_args = [[], ["-deprecatedrpc=generate"]]
        #
        # In run_test:
        # self.log.info("Test generate RPC")
        # assert_raises_rpc_error(-32, 'The wallet generate rpc method is deprecated', self.nodes[0].rpc.generate, 1)
        # self.nodes[1].generate(1)
        privkey, proof = gen_proof(self, self.nodes[0])
        proof_args = [
            f"-avaproof={proof.serialize().hex()}",
            f"-avamasterkey={bytes_to_wif(privkey.get_bytes())}",
        ]

        self.restart_node(0, extra_args=self.extra_args[0] + proof_args)
        self.restart_node(1, extra_args=self.extra_args[1] + proof_args)

        self.connect_nodes(0, 1)

        now = int(time.time())
        self.nodes[0].setmocktime(now)
        self.nodes[1].setmocktime(now)

        # Build a quorum
        quorum0 = [get_ava_p2p_interface(self, self.nodes[0]) for _ in range(8)]
        quorum1 = [get_ava_p2p_interface(self, self.nodes[1]) for _ in range(8)]
        assert self.nodes[0].getavalancheinfo()["ready_to_poll"] is True
        assert self.nodes[1].getavalancheinfo()["ready_to_poll"] is True

        now += 60 * 60
        self.nodes[0].setmocktime(now)
        self.nodes[1].setmocktime(now)

        def wait_for_finalized_proof(node, quorum, proofid):
            def finalize_proof(proofid):
                can_find_inv_in_poll(
                    quorum, proofid, response=AvalancheProofVoteResponse.ACTIVE
                )
                return node.getrawavalancheproof(uint256_hex(proofid)).get(
                    "finalized", False
                )

            self.wait_until(lambda: finalize_proof(proofid))

        for peer in quorum0:
            wait_for_finalized_proof(self.nodes[0], quorum0, peer.proof.proofid)
        for peer in quorum1:
            wait_for_finalized_proof(self.nodes[1], quorum1, peer.proof.proofid)

        self.generate(self.nodes[0], 1)
        self.sync_blocks()

        tip = self.nodes[0].getbestblockhash()

        self.nodes[0].setstakingreward(
            blockhash=tip,
            payoutscript="76a914000000000000000000000000000000000000000088ac",
            append=False,
        )
        self.nodes[0].setstakingreward(
            blockhash=tip,
            payoutscript="76a914000000000000000000000000000000000000000188ac",
            append=True,
        )
        self.nodes[1].setstakingreward(
            blockhash=tip,
            payoutscript="76a914000000000000000000000000000000000000000088ac",
            append=False,
        )
        self.nodes[1].setstakingreward(
            blockhash=tip,
            payoutscript="76a914000000000000000000000000000000000000000188ac",
            append=True,
        )

        assert_equal(
            self.nodes[0].getstakingreward(tip),
            [
                {
                    "asm": "OP_DUP OP_HASH160 0000000000000000000000000000000000000000 OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a914000000000000000000000000000000000000000088ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash",
                    "addresses": [ADDRESS_ECREG_UNSPENDABLE],
                },
                {
                    "asm": "OP_DUP OP_HASH160 0000000000000000000000000000000000000001 OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a914000000000000000000000000000000000000000188ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash",
                    "addresses": [
                        "ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqyx0q3yvg0"
                    ],
                },
            ],
        )
        assert_equal(
            self.nodes[1].getstakingreward(tip),
            {
                "asm": "OP_DUP OP_HASH160 0000000000000000000000000000000000000000 OP_EQUALVERIFY OP_CHECKSIG",
                "hex": "76a914000000000000000000000000000000000000000088ac",
                "reqSigs": 1,
                "type": "pubkeyhash",
                "addresses": [ADDRESS_ECREG_UNSPENDABLE],
            },
        )


if __name__ == "__main__":
    DeprecatedRpcTest().main()
