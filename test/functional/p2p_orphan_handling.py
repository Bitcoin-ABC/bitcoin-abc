#!/usr/bin/env python3
# Copyright (c) 2023 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import time

from test_framework.messages import (
    MSG_TX,
    CInv,
    msg_getdata,
    msg_inv,
    msg_notfound,
    msg_tx,
)
from test_framework.p2p import (
    GETDATA_TX_INTERVAL,
    NONPREF_PEER_TX_DELAY,
    OVERLOADED_PEER_TX_DELAY,
    TXID_RELAY_DELAY,
    P2PTxInvStore,
    p2p_lock,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet import MiniWallet, MiniWalletMode

# Time to bump forward (using setmocktime) before waiting for the node to send getdata(tx) in response
# to an inv(tx), in seconds. This delay includes all possible delays + 1, so it should only be used
# when the value of the delay is not interesting. If we want to test that the node waits x seconds
# for one peer and y seconds for another, use specific values instead.
TXREQUEST_TIME_SKIP = (
    NONPREF_PEER_TX_DELAY + TXID_RELAY_DELAY + OVERLOADED_PEER_TX_DELAY + 1
)


def cleanup(func):
    # Time to fastfoward (using setmocktime) in between subtests to ensure they do not interfere with
    # one another, in seconds. Equal to 12 hours, which is enough to expire anything that may exist
    # (though nothing should since state should be cleared) in p2p data structures.
    LONG_TIME_SKIP = 12 * 60 * 60

    def wrapper(self):
        try:
            func(self)
        finally:
            # Clear mempool
            self.generate(self.nodes[0], 1)
            self.nodes[0].disconnect_p2ps()
            self.nodes[0].bumpmocktime(LONG_TIME_SKIP)

    return wrapper


class PeerTxRelayer(P2PTxInvStore):
    """A P2PTxInvStore that also remembers all of the getdata and tx messages it receives."""

    def __init__(self):
        super().__init__()
        self._tx_received = []
        self._getdata_received = []

    @property
    def tx_received(self):
        with p2p_lock:
            return self._tx_received

    @property
    def getdata_received(self):
        with p2p_lock:
            return self._getdata_received

    def on_tx(self, message):
        self._tx_received.append(message)

    def on_getdata(self, message):
        self._getdata_received.append(message)

    def wait_for_parent_requests(self, txids):
        """Wait for requests for missing parents by txid. Requires that the
        getdata message match these txids exactly; all txids must be requested
        and no additional requests are allowed."""

        def test_function():
            last_getdata = self.last_message.get("getdata")
            if not last_getdata:
                return False
            return len(last_getdata.inv) == len(txids)

        self.wait_until(test_function, timeout=10)

    def assert_no_immediate_response(self, message):
        """Check that the node does not immediately respond to this message with
        any of getdata, inv, tx. The node may respond later."""
        prev_lastmessage = self.last_message
        self.send_and_ping(message)
        after_lastmessage = self.last_message
        for msgtype in ["getdata", "inv", "tx"]:
            if msgtype not in prev_lastmessage:
                assert msgtype not in after_lastmessage
            else:
                assert_equal(prev_lastmessage[msgtype], after_lastmessage[msgtype])

    def assert_never_requested(self, txhash):
        """Check that the node has never sent us a getdata for this hash int
        type)"""
        for getdata in self.getdata_received:
            for request in getdata.inv:
                assert request.hash != txhash


class OrphanHandlingTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [[]]

    def create_parent_and_child(self):
        """Create package with 1 parent and 1 child, normal fees (no cpfp)."""
        parent = self.wallet.create_self_transfer()
        child = self.wallet.create_self_transfer(utxo_to_spend=parent["new_utxo"])
        return child["txid"], child["tx"], parent["tx"]

    def relay_transaction(self, peer, tx):
        """Relay transaction using MSG_TX"""
        txid = int(tx.get_id(), 16)
        peer.send_and_ping(msg_inv([CInv(t=MSG_TX, h=txid)]))
        self.nodes[0].bumpmocktime(TXREQUEST_TIME_SKIP)
        peer.wait_for_getdata([txid])
        peer.send_and_ping(msg_tx(tx))

    @cleanup
    def test_arrival_timing_orphan(self):
        self.log.info("Test missing parents that arrive during delay are not requested")
        node = self.nodes[0]
        tx_parent_arrives = self.wallet.create_self_transfer()
        tx_parent_doesnt_arrive = self.wallet.create_self_transfer()
        # Fake orphan spends nonexistent outputs of the two parents
        tx_fake_orphan = self.wallet.create_self_transfer_multi(
            utxos_to_spend=[
                {
                    "txid": tx_parent_doesnt_arrive["txid"],
                    "vout": 10,
                    "value": tx_parent_doesnt_arrive["new_utxo"]["value"],
                },
                {
                    "txid": tx_parent_arrives["txid"],
                    "vout": 10,
                    "value": tx_parent_arrives["new_utxo"]["value"],
                },
            ]
        )

        peer_spy = node.add_p2p_connection(PeerTxRelayer())
        peer_normal = node.add_p2p_connection(PeerTxRelayer())
        # This transaction is an orphan because it is missing inputs. It is a "fake" orphan that the
        # spy peer has crafted to learn information about tx_parent_arrives even though it isn't
        # able to spend a real output of it, but it could also just be a normal, real child tx.
        # The node should not immediately respond with a request for orphan parents.
        # Also, no request should be sent later because it will be resolved by
        # the time the request is scheduled to be sent.
        peer_spy.assert_no_immediate_response(msg_tx(tx_fake_orphan["tx"]))

        # Node receives transaction. It attempts to obfuscate the exact timing at which this
        # transaction entered its mempool. Send unsolicited because otherwise we need to wait for
        # request delays.
        peer_normal.send_and_ping(msg_tx(tx_parent_arrives["tx"]))
        assert tx_parent_arrives["txid"] in node.getrawmempool()

        # Spy peer should not be able to query the node for the parent yet, since it hasn't been
        # announced / insufficient time has elapsed.
        parent_inv = CInv(t=MSG_TX, h=int(tx_parent_arrives["tx"].get_id(), 16))
        assert_equal(len(peer_spy.get_invs()), 0)
        peer_spy.assert_no_immediate_response(msg_getdata([parent_inv]))

        # Request would be scheduled with this delay because it is not a preferred relay peer.
        self.nodes[0].bumpmocktime(NONPREF_PEER_TX_DELAY)
        peer_spy.assert_never_requested(int(tx_parent_arrives["txid"], 16))
        peer_spy.assert_never_requested(int(tx_parent_doesnt_arrive["txid"], 16))
        # Request would be scheduled with this delay because it is by txid.
        self.nodes[0].bumpmocktime(TXID_RELAY_DELAY)
        peer_spy.wait_for_parent_requests([int(tx_parent_doesnt_arrive["txid"], 16)])
        peer_spy.assert_never_requested(int(tx_parent_arrives["txid"], 16))

    @cleanup
    def test_orphan_rejected_parents_exceptions(self):
        node = self.nodes[0]
        peer1 = node.add_p2p_connection(PeerTxRelayer())
        peer2 = node.add_p2p_connection(PeerTxRelayer())

        self.log.info("Test orphan handling when a parent is known to be invalid")
        parent_low_fee = self.wallet_p2pk.create_self_transfer(fee_rate=0)
        parent_other = self.wallet_p2pk.create_self_transfer()
        child = self.wallet_p2pk.create_self_transfer_multi(
            utxos_to_spend=[parent_other["new_utxo"], parent_low_fee["new_utxo"]]
        )

        # Relay the parent. It should be rejected because it pays 0 fees.
        self.relay_transaction(peer1, parent_low_fee["tx"])
        assert parent_low_fee["txid"] not in node.getrawmempool()

        # Relay the child. It should not be accepted because it has missing
        # inputs. Its parent should not be requested because its txid has been
        # added to the rejection filter.
        with node.assert_debug_log(
            [f"not keeping orphan with rejected parents {child['txid']}"]
        ):
            self.relay_transaction(peer2, child["tx"])
        assert child["txid"] not in node.getrawmempool()

        # No parents are requested.
        self.nodes[0].bumpmocktime(GETDATA_TX_INTERVAL)
        peer1.assert_never_requested(int(parent_other["txid"], 16))
        peer2.assert_never_requested(int(parent_other["txid"], 16))
        peer2.assert_never_requested(int(parent_low_fee["txid"], 16))

    @cleanup
    def test_orphan_multiple_parents(self):
        node = self.nodes[0]
        peer = node.add_p2p_connection(PeerTxRelayer())

        self.log.info(
            "Test orphan parent requests with a mixture of confirmed, in-mempool and missing parents"
        )
        # This UTXO confirmed a long time ago.
        utxo_conf_old = self.wallet.send_self_transfer(from_node=node)["new_utxo"]
        txid_conf_old = utxo_conf_old["txid"]
        self.generate(self.wallet, 10)

        # Create a fake reorg to trigger BlockDisconnected, which resets the
        # rolling bloom filter. The alternative is to mine thousands of
        # transactions to push it out of the filter.
        last_block = node.getbestblockhash()
        node.invalidateblock(last_block)
        node.preciousblock(last_block)
        node.syncwithvalidationinterfacequeue()

        # This UTXO confirmed recently.
        utxo_conf_recent = self.wallet.send_self_transfer(from_node=node)["new_utxo"]
        self.generate(node, 1)

        # This UTXO is unconfirmed and in the mempool.
        assert_equal(len(node.getrawmempool()), 0)
        mempool_tx = self.wallet.send_self_transfer(from_node=node)
        utxo_unconf_mempool = mempool_tx["new_utxo"]

        # This UTXO is unconfirmed and missing.
        missing_tx = self.wallet.create_self_transfer()
        utxo_unconf_missing = missing_tx["new_utxo"]
        assert missing_tx["txid"] not in node.getrawmempool()

        orphan = self.wallet.create_self_transfer_multi(
            utxos_to_spend=[
                utxo_conf_old,
                utxo_conf_recent,
                utxo_unconf_mempool,
                utxo_unconf_missing,
            ]
        )

        self.relay_transaction(peer, orphan["tx"])
        self.nodes[0].bumpmocktime(NONPREF_PEER_TX_DELAY + TXID_RELAY_DELAY)
        peer.sync_with_ping()
        assert_equal(len(peer.last_message["getdata"].inv), 2)
        peer.wait_for_parent_requests(
            [int(txid_conf_old, 16), int(missing_tx["txid"], 16)]
        )

        # Even though the peer would send a notfound for the "old" confirmed
        # transaction, the node doesn't give up on the orphan. Once all of the
        # missing parents are received, it should be submitted to mempool.
        peer.send_message(msg_notfound(vec=[CInv(MSG_TX, int(txid_conf_old, 16))]))
        # Sync with ping to ensure orphans are reconsidered
        peer.send_and_ping(msg_tx(missing_tx["tx"]))
        print(node.getmempoolentry(orphan["txid"]))
        # The entry depends contains all the unconfirmed transactions this one
        # depends on
        assert_equal(
            set(node.getmempoolentry(orphan["txid"])["depends"]),
            {mempool_tx["txid"], missing_tx["txid"]},
        )

    @cleanup
    def test_orphans_overlapping_parents(self):
        node = self.nodes[0]
        # In the process of relaying inflight_parent_AB
        peer_txrequest = node.add_p2p_connection(PeerTxRelayer())
        # Sends the orphans
        peer_orphans = node.add_p2p_connection(PeerTxRelayer())

        confirmed_utxos = [self.wallet_p2pk.get_utxo() for _ in range(4)]
        assert all(utxo["confirmations"] > 0 for utxo in confirmed_utxos)
        self.log.info(
            "Test handling of multiple orphans with missing parents that are already being requested"
        )
        # Parent of child_A only
        missing_parent_A = self.wallet_p2pk.create_self_transfer(
            utxo_to_spend=confirmed_utxos[0]
        )
        # Parents of child_A and child_B
        missing_parent_AB = self.wallet_p2pk.create_self_transfer(
            utxo_to_spend=confirmed_utxos[1]
        )
        inflight_parent_AB = self.wallet_p2pk.create_self_transfer(
            utxo_to_spend=confirmed_utxos[2]
        )
        # Parent of child_B only
        missing_parent_B = self.wallet_p2pk.create_self_transfer(
            utxo_to_spend=confirmed_utxos[3]
        )
        child_A = self.wallet_p2pk.create_self_transfer_multi(
            utxos_to_spend=[
                missing_parent_A["new_utxo"],
                missing_parent_AB["new_utxo"],
                inflight_parent_AB["new_utxo"],
            ]
        )
        child_B = self.wallet_p2pk.create_self_transfer_multi(
            utxos_to_spend=[
                missing_parent_B["new_utxo"],
                missing_parent_AB["new_utxo"],
                inflight_parent_AB["new_utxo"],
            ]
        )

        # Announce inflight_parent_AB and wait for getdata
        peer_txrequest.send_and_ping(
            msg_inv([CInv(t=MSG_TX, h=int(inflight_parent_AB["txid"], 16))])
        )
        self.nodes[0].bumpmocktime(NONPREF_PEER_TX_DELAY)
        peer_txrequest.wait_for_getdata([int(inflight_parent_AB["txid"], 16)])

        self.log.info(
            "Test that the node does not request a parent if it has an in-flight txrequest"
        )
        # Relay orphan child_A
        self.relay_transaction(peer_orphans, child_A["tx"])
        self.nodes[0].bumpmocktime(NONPREF_PEER_TX_DELAY + TXID_RELAY_DELAY)
        # There are 3 missing parents. missing_parent_A and missing_parent_AB
        # should be requested. But inflight_parent_AB should not, because there
        # is already an in-flight request for it.
        peer_orphans.wait_for_parent_requests(
            [int(missing_parent_A["txid"], 16), int(missing_parent_AB["txid"], 16)]
        )

        self.log.info(
            "Test that the node does not request a parent if it has an in-flight orphan parent request"
        )
        # Relay orphan child_B
        self.relay_transaction(peer_orphans, child_B["tx"])
        self.nodes[0].bumpmocktime(NONPREF_PEER_TX_DELAY + TXID_RELAY_DELAY)
        # Only missing_parent_B should be requested. Not inflight_parent_AB or
        # missing_parent_AB because they are already being requested from
        # peer_txrequest and peer_orphans respectively.
        peer_orphans.wait_for_parent_requests([int(missing_parent_B["txid"], 16)])
        peer_orphans.assert_never_requested(int(inflight_parent_AB["txid"], 16))

    @cleanup
    def test_orphan_of_orphan(self):
        node = self.nodes[0]
        peer = node.add_p2p_connection(PeerTxRelayer())

        self.log.info("Test handling of an orphan with a parent who is another orphan")
        missing_grandparent = self.wallet_p2pk.create_self_transfer()
        missing_parent_orphan = self.wallet_p2pk.create_self_transfer(
            utxo_to_spend=missing_grandparent["new_utxo"]
        )
        missing_parent = self.wallet_p2pk.create_self_transfer()
        orphan = self.wallet_p2pk.create_self_transfer_multi(
            utxos_to_spend=[
                missing_parent["new_utxo"],
                missing_parent_orphan["new_utxo"],
            ]
        )

        # The node should put missing_parent_orphan into the orphanage and
        # request missing_grandparent
        self.relay_transaction(peer, missing_parent_orphan["tx"])
        self.nodes[0].bumpmocktime(NONPREF_PEER_TX_DELAY + TXID_RELAY_DELAY)
        peer.wait_for_parent_requests([int(missing_grandparent["txid"], 16)])

        # The node should put the orphan into the orphanage and request
        # missing_parent, skipping missing_parent_orphan because it already has
        # it in the orphanage.
        self.relay_transaction(peer, orphan["tx"])
        self.nodes[0].bumpmocktime(NONPREF_PEER_TX_DELAY + TXID_RELAY_DELAY)
        peer.wait_for_parent_requests([int(missing_parent["txid"], 16)])

    def run_test(self):
        self.nodes[0].setmocktime(int(time.time()))
        self.wallet_p2pk = MiniWallet(self.nodes[0], mode=MiniWalletMode.RAW_P2PK)
        self.generate(self.wallet_p2pk, 10)
        self.wallet = MiniWallet(self.nodes[0])
        self.generate(self.wallet, 160)
        self.test_arrival_timing_orphan()
        self.test_orphan_rejected_parents_exceptions()
        self.test_orphan_multiple_parents()
        self.test_orphans_overlapping_parents()
        self.test_orphan_of_orphan()


if __name__ == "__main__":
    OrphanHandlingTest().main()
