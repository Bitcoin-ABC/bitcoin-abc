# Copyright (c) 2017-2018 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test transaction upload"""

from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.messages import MSG_TX, AvalancheTxVoteError, CInv, msg_getdata
from test_framework.p2p import P2PDataStore, P2PTxInvStore, p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet import MiniWallet

QUORUM_NODE_COUNT = 16
THE_FUTURE = 2100000000
REPLAY_PROTECTION = THE_FUTURE + 100000000


class P2PNode(P2PDataStore):
    def on_inv(self, msg):
        pass


class P2PLeakTxTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avalanchepreconsensus=1",
                "-avacooldown=0",
                "-avaproofstakeutxoconfirmations=1",
                # Low enough for coinbase transactions to be staked in valid proofs
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                f"-shibusawaactivationtime={THE_FUTURE}",
                f"-replayprotectionactivationtime={REPLAY_PROTECTION}",
            ],
        ]

    def run_test(self):
        # The block and tx generating node
        self.gen_node = self.nodes[0]
        self.miniwallet = MiniWallet(self.gen_node)

        # Activate the shibusawa upgrade
        now = THE_FUTURE
        self.nodes[0].setmocktime(now)
        self.generate(self.gen_node, 6)
        assert self.gen_node.getinfo()["avalanche_preconsensus"]

        self.test_tx_in_block()
        self.test_notfound_on_avalanche_invalidated_tx()
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
        blockhash = self.generate(self.gen_node, 1)[0]

        self.log.debug("Request transaction")
        inbound_peer.last_message.pop("tx", None)
        inbound_peer.send_and_ping(want_tx)
        assert_equal(inbound_peer.last_message.get("tx").tx.txid_hex, txid)

        self.log.debug(
            "Re-request of transaction after a second block is answered with notfound"
        )
        self.generate(self.gen_node, 1)
        inbound_peer.last_message.pop("tx", None)
        inbound_peer.send_and_ping(want_tx)
        assert_equal(
            inbound_peer.last_message.get("notfound").vec,
            [CInv(t=MSG_TX, h=int(txid, 16))],
        )

        self.log.debug(
            "The transaction is back in the mempool and available for request after "
            "a reorg"
        )
        with p2p_lock:
            inbound_peer.last_message.pop("notfound", None)
            inbound_peer.last_message.pop("tx", None)
        self.gen_node.parkblock(blockhash)
        inbound_peer.send_and_ping(want_tx)
        assert_equal(inbound_peer.last_message.get("tx").tx.txid_hex, txid)

        # Restore the chain so we can generate valid proofs in the next test
        self.gen_node.unparkblock(blockhash)

    def test_notfound_on_avalanche_invalidated_tx(self):
        self.gen_node.disconnect_p2ps()
        quorum = [
            get_ava_p2p_interface(self, self.gen_node)
            for _ in range(0, QUORUM_NODE_COUNT)
        ]
        assert self.gen_node.getavalancheinfo()["ready_to_poll"]

        def has_invalidated_tx(txid):
            can_find_inv_in_poll(
                quorum, int(txid, 16), response=AvalancheTxVoteError.INVALID
            )
            return txid not in self.gen_node.getrawmempool()

        inbound_peer = self.gen_node.add_p2p_connection(P2PTxInvStore())

        self.log.info("Transaction is broadcast")
        tx = self.miniwallet.send_self_transfer(from_node=self.gen_node)
        inbound_peer.wait_for_broadcast(txns=[tx["txid"]])

        self.wait_until(lambda: has_invalidated_tx(tx["txid"]))

        self.log.info("Re-request of tx after invalidation is answered with notfound")
        req_vec = [CInv(t=MSG_TX, h=int(tx["txid"], 16))]
        want_tx = msg_getdata()
        want_tx.inv = req_vec
        with p2p_lock:
            inbound_peer.last_message.pop("notfound", None)
            inbound_peer.last_message.pop("tx", None)
        inbound_peer.send_and_ping(want_tx)

        assert_equal(inbound_peer.last_message.get("notfound").vec, req_vec)
        assert "tx" not in inbound_peer.last_message

    def test_notfound_on_unannounced_tx(self):
        self.log.info(
            "Check that we don't leak txs to inbound peers that we haven't yet announced to"
        )
        self.gen_node.disconnect_p2ps()
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
