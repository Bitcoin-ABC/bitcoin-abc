# Copyright (c) 2017-2018 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test transaction upload"""

from test_framework.messages import MSG_TX, CInv, msg_getdata
from test_framework.p2p import P2PDataStore, p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet import MiniWallet


class P2PNode(P2PDataStore):
    def on_inv(self, msg):
        pass


class P2PLeakTxTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1

    def run_test(self):
        # The block and tx generating node
        self.gen_node = self.nodes[0]
        self.miniwallet = MiniWallet(self.gen_node)

        self.test_tx_in_block()
        self.test_notfound_on_unannounced_tx()

    def test_tx_in_block(self):
        self.log.info(
            "Check that a transaction in the last block is uploaded (beneficial for compact block relay)"
        )
        inbound_peer = self.gen_node.add_p2p_connection(P2PNode())

        self.log.debug("Generate transaction and block")
        inbound_peer.last_message.pop("inv", None)
        txid = self.miniwallet.send_self_transfer(from_node=self.gen_node)["txid"]
        inbound_peer.wait_until(
            lambda: "inv" in inbound_peer.last_message
            and inbound_peer.last_message.get("inv").inv[0].hash == int(txid, 16)
        )
        want_tx = msg_getdata(inv=inbound_peer.last_message.get("inv").inv)
        self.generate(self.gen_node, 1)

        self.log.debug("Request transaction")
        inbound_peer.last_message.pop("tx", None)
        inbound_peer.send_and_ping(want_tx)
        assert_equal(inbound_peer.last_message.get("tx").tx.get_id(), txid)

    def test_notfound_on_unannounced_tx(self):
        self.log.info(
            "Check that we don't leak txs to inbound peers that we haven't yet announced to"
        )
        # An "attacking" inbound peer
        inbound_peer = self.gen_node.add_p2p_connection(P2PNode())

        MAX_REPEATS = 100
        self.log.info(f"Running test up to {MAX_REPEATS} times.")
        for i in range(MAX_REPEATS):
            self.log.info(f"Run repeat {i + 1}")
            txid = self.miniwallet.send_self_transfer(from_node=self.gen_node)["txid"]

            want_tx = msg_getdata()
            want_tx.inv.append(CInv(t=MSG_TX, h=int(txid, 16)))
            with p2p_lock:
                inbound_peer.last_message.pop("notfound", None)
            inbound_peer.send_and_ping(want_tx)

            if inbound_peer.last_message.get("notfound"):
                self.log.debug(f"tx {txid} was not yet announced to us.")
                self.log.debug("node has responded with a notfound message. End test.")
                assert_equal(
                    inbound_peer.last_message["notfound"].vec[0].hash, int(txid, 16)
                )
                with p2p_lock:
                    inbound_peer.last_message.pop("notfound")
                break
            else:
                self.log.debug(
                    f"tx {txid} was already announced to us. Try test again."
                )
                assert int(txid, 16) in [
                    inv.hash for inv in inbound_peer.last_message["inv"].inv
                ]


if __name__ == "__main__":
    P2PLeakTxTest().main()
