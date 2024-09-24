# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test whether Chronik sends WebSocket messages correctly."""
import time

from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.messages import XEC, AvalancheVoteError
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, chronik_sub_to_blocks

QUORUM_NODE_COUNT = 16


class ChronikWsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-chronik",
                "-whitelist=noban@127.0.0.1",
            ],
        ]
        self.supports_cli = False

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()

        # Build a fake quorum of nodes.
        def get_quorum():
            return [
                get_ava_p2p_interface(self, node) for _ in range(0, QUORUM_NODE_COUNT)
            ]

        def has_finalized_tip(tip_expected):
            hash_tip_final = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_final)
            return node.isfinalblock(tip_expected)

        # Connect, but don't subscribe yet
        ws = chronik.ws()

        # Pick one node from the quorum for polling.
        # ws will not receive msgs because it's not subscribed to blocks yet.
        quorum = get_quorum()

        assert node.getavalancheinfo()["ready_to_poll"] is True

        tip = node.getbestblockhash()
        self.wait_until(lambda: has_finalized_tip(tip))

        # Make sure chronik has synced
        node.syncwithvalidationinterfacequeue()

        # Now subscribe to blocks, we'll get block updates from now on
        chronik_sub_to_blocks(ws, node)

        now = int(time.time())
        node.setmocktime(now)

        # Mine block
        tip = self.generate(node, 1)[-1]
        height = node.getblockcount()

        from test_framework.chronik.client import pb

        # We get a CONNECTED msg
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                block=pb.MsgBlock(
                    msg_type=pb.BLK_CONNECTED,
                    block_hash=bytes.fromhex(tip)[::-1],
                    block_height=height,
                    block_timestamp=now,
                )
            ),
        )

        # After we wait, we get a FINALIZED msg
        self.wait_until(lambda: has_finalized_tip(tip))
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                block=pb.MsgBlock(
                    msg_type=pb.BLK_FINALIZED,
                    block_hash=bytes.fromhex(tip)[::-1],
                    block_height=height,
                    block_timestamp=now,
                )
            ),
        )

        def coinbase_data_from_block(blockhash):
            coinbase = node.getblock(blockhash, 2)["tx"][0]
            coinbase_scriptsig = bytes.fromhex(coinbase["vin"][0]["coinbase"])
            coinbase_outputs = [
                {
                    "value": int(txout["value"] * XEC),
                    "output_script": bytes.fromhex(txout["scriptPubKey"]["hex"]),
                }
                for txout in coinbase["vout"]
            ]
            return pb.CoinbaseData(
                coinbase_scriptsig=coinbase_scriptsig, coinbase_outputs=coinbase_outputs
            )

        coinbase_data = coinbase_data_from_block(tip)

        # When we invalidate, we get a DISCONNECTED msg
        node.invalidateblock(tip)
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                block=pb.MsgBlock(
                    msg_type=pb.BLK_DISCONNECTED,
                    block_hash=bytes.fromhex(tip)[::-1],
                    block_height=height,
                    block_timestamp=now,
                    coinbase_data=coinbase_data,
                )
            ),
        )

        now += 1
        node.setmocktime(now)

        tip = self.generate(node, 1)[-1]
        height = node.getblockcount()

        # We get a CONNECTED msg
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                block=pb.MsgBlock(
                    msg_type=pb.BLK_CONNECTED,
                    block_hash=bytes.fromhex(tip)[::-1],
                    block_height=height,
                    block_timestamp=now,
                )
            ),
        )

        # Reject the block via avalanche
        with node.wait_for_debug_log(
            [f"Avalanche rejected block {tip}".encode()],
            chatty_callable=lambda: can_find_inv_in_poll(
                quorum, int(tip, 16), AvalancheVoteError.INVALID
            ),
        ):
            pass

        coinbase_data = coinbase_data_from_block(tip)

        # We get a DISCONNECTED msg
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                block=pb.MsgBlock(
                    msg_type=pb.BLK_DISCONNECTED,
                    block_hash=bytes.fromhex(tip)[::-1],
                    block_height=height,
                    block_timestamp=now,
                    coinbase_data=coinbase_data,
                )
            ),
        )

        # Keep rejected the block until it gets invalidated
        with node.wait_for_debug_log(
            [f"Avalanche invalidated block {tip}".encode()],
            chatty_callable=lambda: can_find_inv_in_poll(
                quorum, int(tip, 16), AvalancheVoteError.INVALID
            ),
        ):
            pass

        # We get an INVALIDATED msg
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                block=pb.MsgBlock(
                    msg_type=pb.BLK_INVALIDATED,
                    block_hash=bytes.fromhex(tip)[::-1],
                    block_height=height,
                    block_timestamp=now,
                    coinbase_data=coinbase_data,
                )
            ),
        )

        ws.close()


if __name__ == "__main__":
    ChronikWsTest().main()
