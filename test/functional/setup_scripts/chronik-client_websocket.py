# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Setup script to exercise the chronik-client js library script endpoints
"""

import time

import pathmagic  # noqa
from ipc import send_ipc_message
from setup_framework import SetupFramework
from test_framework.avatools import AvaP2PInterface, can_find_inv_in_poll
from test_framework.messages import (
    XEC,
    AvalancheVoteError,
    CTransaction,
    CTxOut,
    FromHex,
    ToHex,
)
from test_framework.script import OP_CHECKSIG, CScript
from test_framework.util import assert_equal

QUORUM_NODE_COUNT = 16


class ChronikClient_Websocket_Setup(SetupFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-chronik",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-persistavapeers=0",
                "-acceptnonstdtxn=1",
                "-avalanchepreconsensus=1",
            ]
        ]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()
        self.skip_if_no_wallet()

    def run_test(self):
        # Init
        node = self.nodes[0]

        yield True

        self.log.info("Step 1: Initialized regtest chain")

        # p2pkh
        # IFP address p2pkh
        # Note: we use this instead of node.getnewaddress() so we don't get change
        # to our p2pkh address from p2sh txs, causing chronik to give hard-to-predict
        # results (txs with mixed script outputs will come up in each)
        p2pkh_address = "ecregtest:qrfhcnyqnl5cgrnmlfmms675w93ld7mvvqjh9pgptw"
        p2pkh_output_script = bytes.fromhex(
            "76a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6088ac"
        )
        send_ipc_message({"p2pkh_address": p2pkh_address})

        # p2sh
        # use IFP address p2sh
        p2sh_address = "ecregtest:prfhcnyqnl5cgrnmlfmms675w93ld7mvvq9jcw0zsn"
        p2sh_output_script = bytes.fromhex(
            "a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087"
        )
        send_ipc_message({"p2sh_address": p2sh_address})

        # p2pk
        # See coinbase tx of coinbase tx output from https://explorer.e.cash/block/00000000000000002328cef155f92bf149cfbe365eecf4e428f2c11f25fcce56
        pubkey = bytes.fromhex(
            "047fa64f6874fb7213776b24c40bc915451b57ef7f17ad7b982561f99f7cdc7010d141b856a092ee169c5405323895e1962c6b0d7c101120d360164c9e4b3997bd"
        )
        send_ipc_message({"p2pk_script": pubkey.hex()})
        p2pk_script_for_tx_building = CScript([pubkey, OP_CHECKSIG])

        # other
        # Use hex deadbeef
        other_script = "deadbeef"
        send_ipc_message({"other_script": other_script})
        other_script_for_tx_building = bytes.fromhex(other_script)

        # Build a fake quorum of nodes.
        def get_quorum():
            return [
                node.add_p2p_connection(AvaP2PInterface(self, node))
                for _ in range(0, QUORUM_NODE_COUNT)
            ]

        # Pick one node from the quorum for polling.
        quorum = get_quorum()

        def is_quorum_established():
            return node.getavalancheinfo()["ready_to_poll"] is True

        def is_finalblock(blockhash):
            can_find_inv_in_poll(quorum, int(blockhash, 16))
            return node.isfinalblock(blockhash)

        self.wait_until(is_quorum_established)
        self.wait_until(lambda: is_finalblock(node.getbestblockhash()))

        now = int(time.time())
        node.setmocktime(now)
        send_ipc_message({"block_timestamp": now})

        finalized_blockhash = self.generate(node, 1, sync_fun=self.no_op)[0]
        cb_txid = node.getblock(finalized_blockhash)["tx"][0]
        assert not node.isfinalblock(finalized_blockhash)
        assert not node.isfinaltransaction(cb_txid, finalized_blockhash)
        yield True

        self.log.info("Step 2: Avalanche finalize a block")

        with node.assert_debug_log(
            [f"Avalanche finalized block {finalized_blockhash}"]
        ):
            self.wait_until(lambda: is_finalblock(finalized_blockhash))

        send_ipc_message({"finalized_block_blockhash": finalized_blockhash})

        finalized_height = node.getblock(finalized_blockhash, 1)["height"]
        send_ipc_message({"finalized_height": finalized_height})

        assert node.isfinaltransaction(cb_txid, finalized_blockhash)
        yield True

        self.log.info("Step 3: Broadcast 1 tx to a p2pk, p2pkh, and p2sh address")

        # p2pkh
        p2pkh_txid = node.sendtoaddress(p2pkh_address, 1000)
        send_ipc_message({"p2pkh_txid": p2pkh_txid})

        # p2sh
        p2sh_txid = node.sendtoaddress(p2sh_address, 1000)
        send_ipc_message({"p2sh_txid": p2sh_txid})

        # p2pk
        p2pk_tx = CTransaction()
        p2pk_tx.vout.append(CTxOut(1000, p2pk_script_for_tx_building))
        p2pk_rawtx = node.fundrawtransaction(
            ToHex(p2pk_tx),
        )["hex"]
        FromHex(p2pk_tx, p2pk_rawtx)
        p2pk_rawtx = node.signrawtransactionwithwallet(ToHex(p2pk_tx))["hex"]
        p2pk_txid = node.sendrawtransaction(p2pk_rawtx)
        send_ipc_message({"p2pk_txid": p2pk_txid})

        # other
        other_tx = CTransaction()
        other_tx.vout.append(CTxOut(1000, other_script_for_tx_building))
        other_rawtx = node.fundrawtransaction(
            ToHex(other_tx),
        )["hex"]
        FromHex(other_tx, other_rawtx)
        other_rawtx = node.signrawtransactionwithwallet(ToHex(other_tx))["hex"]
        other_txid = node.sendrawtransaction(other_rawtx)
        send_ipc_message({"other_txid": other_txid})
        assert_equal(node.getblockcount(), finalized_height)
        yield True

        self.log.info("Step 4: Mine a block with these txs")
        next_blockhash = self.generate(node, 1, sync_fun=self.no_op)[0]
        send_ipc_message({"next_blockhash": next_blockhash})
        assert_equal(node.getblockcount(), finalized_height + 1)
        yield True

        self.log.info("Step 5: Finalize the block containing these txs with Avalanche")
        next_cb_txid = node.getblock(next_blockhash)["tx"][0]
        assert not node.isfinalblock(next_blockhash)
        with node.assert_debug_log([f"Avalanche finalized block {next_blockhash}"]):
            self.wait_until(lambda: is_finalblock(next_blockhash))
        assert_equal(node.getblockcount(), finalized_height + 1)
        assert node.isfinaltransaction(next_cb_txid, next_blockhash)
        yield True

        def send_coinbase_data(blockhash):
            coinbase = node.getblock(blockhash, 2)["tx"][0]

            coinbase_scriptsig = coinbase["vin"][0]["coinbase"]

            # Only a single output is supported
            assert_equal(len(coinbase["vout"]), 1)
            coinbase_out_value = int(coinbase["vout"][0]["value"] * XEC)
            coinbase_out_scriptpubkey = coinbase["vout"][0]["scriptPubKey"]["hex"]

            send_ipc_message({"coinbase_scriptsig": coinbase_scriptsig})
            send_ipc_message({"coinbase_out_value": coinbase_out_value})
            send_ipc_message({"coinbase_out_scriptpubkey": coinbase_out_scriptpubkey})

        self.log.info("Step 6: Park the block containing those txs")
        send_coinbase_data(next_blockhash)
        node.parkblock(next_blockhash)
        assert_equal(node.getblockcount(), finalized_height)
        yield True

        self.log.info("Step 7: Unpark the block containing those txs")
        node.unparkblock(next_blockhash)
        assert_equal(node.getblockcount(), finalized_height + 1)
        yield True

        self.log.info("Step 8: Manually invalidate the block containing those txs")
        node.invalidateblock(next_blockhash)
        assert_equal(node.getblockcount(), finalized_height)
        yield True

        self.log.info("Step 9: Reconsider the block containing those txs")
        node.reconsiderblock(next_blockhash)
        assert_equal(node.getblockcount(), finalized_height + 1)
        yield True

        self.log.info("Step 10: Broadcast a tx with mixed outputs")
        mixed_output_tx = CTransaction()
        mixed_output_tx.vout.append(CTxOut(1000000, p2pkh_output_script))
        mixed_output_tx.vout.append(CTxOut(1000000, p2sh_output_script))
        mixed_output_tx.vout.append(CTxOut(1000000, p2pk_script_for_tx_building))
        mixed_output_tx.vout.append(CTxOut(1000000, other_script_for_tx_building))
        mixed_output_rawtx = node.fundrawtransaction(
            ToHex(mixed_output_tx),
        )["hex"]
        FromHex(mixed_output_tx, mixed_output_rawtx)
        mixed_output_rawtx = node.signrawtransactionwithwallet(ToHex(mixed_output_tx))[
            "hex"
        ]
        mixed_output_txid = node.sendrawtransaction(mixed_output_rawtx)
        send_ipc_message({"mixed_output_txid": mixed_output_txid})
        yield True

        self.log.info("Step 11: Mine another block")
        next_blockhash = self.generate(node, 1, sync_fun=self.no_op)[0]
        send_ipc_message({"next_blockhash": next_blockhash})
        assert_equal(node.getblockcount(), finalized_height + 2)
        yield True

        def is_rejected_block(blockhash):
            can_find_inv_in_poll(
                quorum,
                int(blockhash, 16),
                AvalancheVoteError.INVALID,
                other_response=AvalancheVoteError.UNKNOWN,
            )
            for tip in node.getchaintips():
                if tip["hash"] == blockhash:
                    return tip["status"] == "parked"
            return False

        self.log.info("Step 12: Avalanche rejects the block")
        send_coinbase_data(next_blockhash)
        self.wait_until(lambda: is_rejected_block(next_blockhash))
        assert_equal(node.getblockcount(), finalized_height + 1)
        yield True

        self.log.info("Step 13: Avalanche invalidates the block")
        with node.wait_for_debug_log(
            [f"Avalanche invalidated block {next_blockhash}".encode()],
            chatty_callable=lambda: can_find_inv_in_poll(
                quorum,
                int(next_blockhash, 16),
                AvalancheVoteError.INVALID,
                other_response=AvalancheVoteError.UNKNOWN,
            ),
        ):
            pass
        assert_equal(node.getblockcount(), finalized_height + 1)
        yield True

        self.log.info("Step 14: Mine another block")
        node.bumpmocktime(1)
        next_blockhash = self.generate(node, 1, sync_fun=self.no_op)[0]
        send_ipc_message({"block_timestamp": now + 1})
        send_ipc_message({"next_blockhash": next_blockhash})
        assert_equal(node.getblockcount(), finalized_height + 2)
        yield True

        self.log.info("Step 15: Finalize a tx via preconsensus")

        def finalize_tx(txid):
            def vote_until_final():
                can_find_inv_in_poll(
                    quorum,
                    int(txid, 16),
                    response=AvalancheVoteError.ACCEPTED,
                    other_response=AvalancheVoteError.UNKNOWN,
                )
                return node.isfinaltransaction(txid)

            self.wait_until(vote_until_final)

        final_txid = node.sendtoaddress(p2pkh_address, 1000)
        send_ipc_message({"final_txid": final_txid})
        assert final_txid in node.getrawmempool()

        finalize_tx(final_txid)
        node.syncwithvalidationinterfacequeue()

        yield True

        self.log.info("Step 16: Invalidate a tx via preconsensus")

        def invalidate_tx(txid):
            def vote_until_invalid():
                can_find_inv_in_poll(
                    quorum,
                    int(txid, 16),
                    response=AvalancheVoteError.INVALID,
                    other_response=AvalancheVoteError.UNKNOWN,
                )
                return (
                    txid not in node.getrawmempool()
                    and node.gettransactionstatus(txid)["pool"] == "none"
                )

            self.wait_until(vote_until_invalid)

        invalid_txid = node.sendtoaddress(p2pkh_address, 1000)
        send_ipc_message({"invalid_txid": invalid_txid})
        assert invalid_txid in node.getrawmempool()

        invalidate_tx(invalid_txid)
        node.syncwithvalidationinterfacequeue()

        yield True


if __name__ == "__main__":
    ChronikClient_Websocket_Setup().main()
