# Copyright (c) 2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test inventory download behavior
"""

import functools
import random
import time
from dataclasses import dataclass
from typing import Optional

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.avatools import avalanche_proof_from_hex, gen_proof, wait_for_proof
from test_framework.key import ECKey
from test_framework.messages import (
    MSG_AVA_PROOF,
    MSG_AVA_STAKE_CONTENDER,
    MSG_TX,
    MSG_TYPE_MASK,
    CInv,
    CTransaction,
    FromHex,
    msg_avaproof,
    msg_getdata,
    msg_inv,
    msg_notfound,
)
from test_framework.p2p import (
    GETDATA_TX_INTERVAL,
    NONPREF_PEER_TX_DELAY,
    OVERLOADED_PEER_TX_DELAY,
    P2PInterface,
    p2p_lock,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error, uint256_hex
from test_framework.wallet_util import bytes_to_wif


class TestP2PConn(P2PInterface):
    def __init__(self, inv_type):
        super().__init__()
        self.inv_type = inv_type
        self.getdata_count = 0

    def on_getdata(self, message):
        for i in message.inv:
            if i.type & MSG_TYPE_MASK == self.inv_type:
                self.getdata_count += 1


@dataclass(frozen=True)
class NetConstants:
    """Constants from net_processing"""

    bypass_request_limits_permission_flags: Optional[str]
    getdata_supports_notfound: bool
    getdata_interval: int = GETDATA_TX_INTERVAL
    inbound_peer_delay: int = 2  # seconds
    overloaded_peer_delay: int = OVERLOADED_PEER_TX_DELAY
    max_getdata_in_flight: int = 1000
    max_peer_announcements: int = 5000
    nonpref_peer_delay: int = NONPREF_PEER_TX_DELAY

    @property
    def max_getdata_inbound_wait(self):
        return self.getdata_interval + self.inbound_peer_delay


class TestContext:
    def __init__(self, inv_type, inv_name, constants):
        self.inv_type = inv_type
        self.inv_name = inv_name
        self.constants = constants

    def p2p_conn(self):
        return TestP2PConn(self.inv_type)


PROOF_TEST_CONTEXT = TestContext(
    MSG_AVA_PROOF,
    "avaproof",
    NetConstants(
        bypass_request_limits_permission_flags="bypass_proof_request_limits",
        getdata_supports_notfound=True,
    ),
)

STAKE_CONTENDER_TEST_CONTEXT = TestContext(
    MSG_AVA_STAKE_CONTENDER,
    "stakecontender",
    NetConstants(
        bypass_request_limits_permission_flags=None,
        getdata_supports_notfound=False,
    ),
)

TX_TEST_CONTEXT = TestContext(
    MSG_TX,
    "tx",
    NetConstants(
        bypass_request_limits_permission_flags="relay",
        getdata_supports_notfound=True,
    ),
)

# Python test constants
NUM_INBOUND = 10

# Common network parameters
UNCONDITIONAL_RELAY_DELAY = 2 * 60


def skip(context):
    def decorator(test):
        @functools.wraps(test)
        def wrapper(*args, **kwargs):
            # Assume the signature is test(self, context) unless context is
            # passed by name
            call_context = kwargs.get("context", args[1])
            if call_context == context:
                return lambda *args, **kwargs: None
            return test(*args, **kwargs)

        return wrapper

    return decorator


class InventoryDownloadTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
            ]
        ] * self.num_nodes

    def test_data_requests(self, context):
        self.log.info("Test that we request data from all our peers, eventually")

        invid = 0xDEADBEEF

        self.log.info("Announce the invid from each incoming peer to node 0")
        msg = msg_inv([CInv(t=context.inv_type, h=invid)])
        for p in self.nodes[0].p2ps:
            p.send_and_ping(msg)

        outstanding_peer_index = list(range(len(self.nodes[0].p2ps)))

        def getdata_found(peer_index):
            p = self.nodes[0].p2ps[peer_index]
            with p2p_lock:
                return (
                    p.last_message.get("getdata")
                    and p.last_message["getdata"].inv[-1].hash == invid
                )

        node_0_mocktime = int(time.time())
        while outstanding_peer_index:
            node_0_mocktime += context.constants.max_getdata_inbound_wait
            self.nodes[0].setmocktime(node_0_mocktime)
            self.wait_until(
                lambda: any(getdata_found(i) for i in outstanding_peer_index)
            )
            for i in outstanding_peer_index:
                if getdata_found(i):
                    outstanding_peer_index.remove(i)

        self.nodes[0].setmocktime(0)
        self.log.info("All outstanding peers received a getdata")

    @skip(PROOF_TEST_CONTEXT)
    def test_inv_tx(self, context):
        self.log.info("Generate a transaction on node 0")
        tx = self.nodes[0].createrawtransaction(
            inputs=[
                {
                    # coinbase
                    "txid": self.nodes[0].getblock(self.nodes[0].getblockhash(1))["tx"][
                        0
                    ],
                    "vout": 0,
                }
            ],
            outputs={ADDRESS_ECREG_UNSPENDABLE: 50000000 - 250.00},
        )
        tx = self.nodes[0].signrawtransactionwithkey(
            hexstring=tx,
            privkeys=[self.nodes[0].get_deterministic_priv_key().key],
        )["hex"]
        ctx = FromHex(CTransaction(), tx)
        txid = int(ctx.rehash(), 16)

        self.log.info(
            f"Announce the transaction to all nodes from all {NUM_INBOUND} incoming "
            "peers, but never send it"
        )
        msg = msg_inv([CInv(t=context.inv_type, h=txid)])
        for p in self.peers:
            p.send_and_ping(msg)

        self.log.info("Put the tx in node 0's mempool")

        # node1 is an inbound peer for node0, so the tx relay is delayed by a
        # duration calculated using a poisson's law with a 5s average time.
        # In order to make sure the inv is sent we move the time 2 minutes
        # forward, which has the added side effect that the tx can be
        # unconditionally requested.
        with self.nodes[1].assert_debug_log(
            [f"got inv: tx {uint256_hex(txid)}  new peer=0"]
        ):
            self.nodes[0].sendrawtransaction(tx)
            self.nodes[0].setmocktime(int(time.time()) + UNCONDITIONAL_RELAY_DELAY)

        # Since node 1 is connected outbound to an honest peer (node 0), it
        # should get the tx within a timeout.
        # The timeout is the sum of
        # * the worst case until the tx is first requested from an inbound
        #   peer, plus
        # * the first time it is re-requested from the outbound peer, plus
        # * 2 seconds to avoid races
        assert self.nodes[1].getpeerinfo()[0]["inbound"] is False
        max_delay = (
            context.constants.inbound_peer_delay + context.constants.getdata_interval
        )
        margin = 2
        self.log.info(
            f"Tx should be received at node 1 after {max_delay + margin} seconds"
        )
        self.nodes[1].setmocktime(int(time.time()) + max_delay)
        self.sync_mempools(timeout=margin)

    def test_in_flight_max(self, context):
        max_getdata_in_flight = context.constants.max_getdata_in_flight
        max_inbound_delay = (
            context.constants.inbound_peer_delay
            + context.constants.overloaded_peer_delay
        )

        self.log.info(
            f"Test that we don't load peers with more than {max_getdata_in_flight} "
            "getdata requests immediately"
        )
        invids = list(range(max_getdata_in_flight + 2))

        p = self.nodes[0].p2ps[0]

        with p2p_lock:
            p.getdata_count = 0

        mock_time = int(time.time() + 1)
        self.nodes[0].setmocktime(mock_time)
        for i in range(max_getdata_in_flight):
            p.send_message(msg_inv([CInv(t=context.inv_type, h=invids[i])]))
        p.sync_with_ping()
        mock_time += context.constants.inbound_peer_delay
        self.nodes[0].setmocktime(mock_time)
        p.wait_until(lambda: p.getdata_count >= max_getdata_in_flight)
        for i in range(max_getdata_in_flight, len(invids)):
            p.send_message(msg_inv([CInv(t=context.inv_type, h=invids[i])]))
        p.sync_with_ping()
        self.log.info(
            f"No more than {max_getdata_in_flight} requests should be seen within "
            f"{max_inbound_delay - 1} seconds after announcement"
        )
        self.nodes[0].setmocktime(mock_time + max_inbound_delay - 1)
        p.sync_with_ping()
        with p2p_lock:
            assert_equal(p.getdata_count, max_getdata_in_flight)
        self.log.info(
            f"If we wait {max_inbound_delay} seconds after announcement, we should "
            "eventually get more requests"
        )
        self.nodes[0].setmocktime(mock_time + max_inbound_delay)
        p.wait_until(lambda: p.getdata_count == len(invids))

    def test_expiry_fallback(self, context):
        self.log.info("Check that expiry will select another peer for download")
        peer1 = self.nodes[0].add_p2p_connection(context.p2p_conn())
        peer2 = self.nodes[0].add_p2p_connection(context.p2p_conn())
        for p in [peer1, peer2]:
            p.send_message(msg_inv([CInv(t=context.inv_type, h=0xFFAA)]))
        # One of the peers is asked for the data
        peer2.wait_until(lambda: sum(p.getdata_count for p in [peer1, peer2]) == 1)
        with p2p_lock:
            peer_expiry, peer_fallback = (
                (peer1, peer2) if peer1.getdata_count == 1 else (peer2, peer1)
            )
            assert_equal(peer_fallback.getdata_count, 0)
        # Wait for request to peer_expiry to expire
        self.nodes[0].setmocktime(
            int(time.time()) + context.constants.getdata_interval + 1
        )
        peer_fallback.wait_until(lambda: peer_fallback.getdata_count >= 1)
        # reset mocktime
        self.restart_node(0)

    def test_disconnect_fallback(self, context):
        self.log.info("Check that disconnect will select another peer for download")
        peer1 = self.nodes[0].add_p2p_connection(context.p2p_conn())
        peer2 = self.nodes[0].add_p2p_connection(context.p2p_conn())
        for p in [peer1, peer2]:
            p.send_message(msg_inv([CInv(t=context.inv_type, h=0xFFBB)]))
        # One of the peers is asked for the data
        peer2.wait_until(lambda: sum(p.getdata_count for p in [peer1, peer2]) == 1)
        with p2p_lock:
            peer_disconnect, peer_fallback = (
                (peer1, peer2) if peer1.getdata_count == 1 else (peer2, peer1)
            )
            assert_equal(peer_fallback.getdata_count, 0)
        peer_disconnect.peer_disconnect()
        peer_disconnect.wait_for_disconnect()
        peer_fallback.wait_until(lambda: peer_fallback.getdata_count >= 1)

    def test_notfound_fallback(self, context):
        self.log.info(
            "Check that notfounds will select another peer for download immediately"
        )
        peer1 = self.nodes[0].add_p2p_connection(context.p2p_conn())
        peer2 = self.nodes[0].add_p2p_connection(context.p2p_conn())
        for p in [peer1, peer2]:
            p.send_message(msg_inv([CInv(t=context.inv_type, h=0xFFDD)]))
        # One of the peers is asked for the data
        peer2.wait_until(lambda: sum(p.getdata_count for p in [peer1, peer2]) == 1)
        with p2p_lock:
            peer_notfound, peer_fallback = (
                (peer1, peer2) if peer1.getdata_count == 1 else (peer2, peer1)
            )
            assert_equal(peer_fallback.getdata_count, 0)
        # Send notfound, so that fallback peer is selected
        peer_notfound.send_and_ping(msg_notfound(vec=[CInv(context.inv_type, 0xFFDD)]))
        peer_fallback.wait_until(lambda: peer_fallback.getdata_count >= 1)

    def test_preferred_inv(self, context, preferred=False):
        if preferred:
            self.log.info(
                "Check that invs from preferred peers are downloaded immediately"
            )
            self.restart_node(
                0, extra_args=self.extra_args[0] + ["-whitelist=noban@127.0.0.1"]
            )
        else:
            self.log.info(
                f"Check invs from non-preferred peers are downloaded after "
                f"{context.constants.nonpref_peer_delay} s"
            )
        mock_time = int(time.time() + 1)
        self.nodes[0].setmocktime(mock_time)
        peer = self.nodes[0].add_p2p_connection(context.p2p_conn())
        peer.send_message(msg_inv([CInv(t=context.inv_type, h=0xFF00FF00)]))
        peer.sync_with_ping()
        if preferred:
            peer.wait_until(lambda: peer.getdata_count >= 1)
        else:
            with p2p_lock:
                assert_equal(peer.getdata_count, 0)
            self.nodes[0].setmocktime(mock_time + context.constants.nonpref_peer_delay)
            peer.wait_until(lambda: peer.getdata_count >= 1)

    def test_large_inv_batch(self, context):
        max_peer_announcements = context.constants.max_peer_announcements
        net_permissions = context.constants.bypass_request_limits_permission_flags
        self.log.info(
            f"Test how large inv batches are handled with {net_permissions} permission"
        )
        self.restart_node(
            0,
            extra_args=self.extra_args[0] + [f"-whitelist={net_permissions}@127.0.0.1"],
        )
        peer = self.nodes[0].add_p2p_connection(context.p2p_conn())
        peer.send_message(
            msg_inv(
                [
                    CInv(t=context.inv_type, h=invid)
                    for invid in range(max_peer_announcements + 1)
                ]
            )
        )
        peer.wait_until(lambda: peer.getdata_count == max_peer_announcements + 1)

        self.log.info(
            "Test how large inv batches are handled without"
            f" {net_permissions} permission"
        )
        self.restart_node(0)
        peer = self.nodes[0].add_p2p_connection(context.p2p_conn())
        peer.send_message(
            msg_inv(
                [
                    CInv(t=context.inv_type, h=invid)
                    for invid in range(max_peer_announcements + 1)
                ]
            )
        )
        peer.wait_until(lambda: peer.getdata_count == max_peer_announcements)
        peer.sync_with_ping()

    def test_spurious_notfound(self, context):
        self.log.info("Check that spurious notfound is ignored")
        self.nodes[0].p2ps[0].send_message(
            msg_notfound(vec=[CInv(context.inv_type, 1)])
        )

    @skip(TX_TEST_CONTEXT)
    def test_immature_download(self, context):
        node = self.nodes[0]

        # Build a proof with immature utxos
        privkey, immature = gen_proof(self, node)
        proofid_hex = uint256_hex(immature.proofid)

        self.restart_node(
            0,
            extra_args=self.extra_args[0]
            + [
                "-avaproofstakeutxoconfirmations=3",
                f"-avaproof={immature.serialize().hex()}",
                f"-avamasterkey={bytes_to_wif(privkey.get_bytes())}",
            ],
        )
        # Add an inbound so the node proof can be registered and advertised
        node.add_p2p_connection(P2PInterface())
        self.generate(node, 1, sync_fun=self.no_op)
        wait_for_proof(node, proofid_hex, expect_status="immature")

        peer = node.add_p2p_connection(context.p2p_conn())
        peer.send_message(msg_inv([CInv(t=context.inv_type, h=immature.proofid)]))

        # Give enough time for the node to eventually request the proof.
        node.setmocktime(int(time.time()) + context.constants.getdata_interval + 1)
        peer.sync_with_ping()

        assert_equal(peer.getdata_count, 0)

    @skip(TX_TEST_CONTEXT)
    def test_request_invalid_once(self, context):
        node = self.nodes[0]
        privkey = ECKey()
        privkey.generate()

        # Build an invalid proof (no stake)
        no_stake_hex = node.buildavalancheproof(
            42, 2000000000, bytes_to_wif(privkey.get_bytes()), []
        )
        no_stake = avalanche_proof_from_hex(no_stake_hex)
        assert_raises_rpc_error(
            -8,
            "The proof is invalid: no-stake",
            node.verifyavalancheproof,
            no_stake_hex,
        )

        # Send the proof
        msg = msg_avaproof()
        msg.proof = no_stake
        node.p2ps[0].send_message(msg)

        # Check we get banned
        node.p2ps[0].wait_for_disconnect()

        # Now that the node knows the proof is invalid, it should not be
        # requested anymore
        node.p2ps[1].send_message(
            msg_inv([CInv(t=context.inv_type, h=no_stake.proofid)])
        )

        # Give enough time for the node to eventually request the proof
        node.setmocktime(int(time.time()) + context.constants.getdata_interval + 1)
        node.p2ps[1].sync_with_ping()

        assert all(p.getdata_count == 0 for p in node.p2ps[1:])

    def test_inv_ignore(self, context):
        self.log.info(
            f"Announce an item of type {context.inv_name} that is expected to be ignored"
        )
        peer = self.nodes[0].add_p2p_connection(context.p2p_conn())

        # Send an inv message to the node. It should not log the inv since this type is ignored.
        itemid = random.randint(0, 2**256 - 1)
        inv = CInv(t=context.inv_type, h=itemid)
        with self.nodes[0].assert_debug_log(
            ["received: inv (37 bytes)"],
            unexpected_msgs=["got inv:"],
        ):
            peer.send_and_ping(msg_inv([inv]))

        # No getdata request should be made by the node
        assert peer.getdata_count == 0

    def test_getdata_notfound(self, context):
        self.log.info(
            f"Request a item of type {context.inv_name} that is expected to be ignored"
        )
        peer = self.nodes[0].add_p2p_connection(context.p2p_conn())

        # If we craft a random getdata message, it is ignored by the node
        itemid = random.randint(0, 2**256 - 1)
        inv = CInv(t=context.inv_type, h=itemid)
        with self.nodes[0].assert_debug_log(
            [
                "received getdata (1 invsz)",
                f"received getdata for: {context.inv_name} {uint256_hex(itemid)}",
            ],
        ):
            msg = msg_getdata()
            msg.inv.append(inv)
            peer.send_and_ping(msg)

        with p2p_lock:
            if context.constants.getdata_supports_notfound:
                assert "notfound" in peer.last_message
            else:
                assert "notfound" not in peer.last_message

    def run_test(self):
        for context in [STAKE_CONTENDER_TEST_CONTEXT]:
            self.test_inv_ignore(context)

        for context in [
            TX_TEST_CONTEXT,
            PROOF_TEST_CONTEXT,
            STAKE_CONTENDER_TEST_CONTEXT,
        ]:
            self.test_getdata_notfound(context)

        for context in [TX_TEST_CONTEXT, PROOF_TEST_CONTEXT]:
            self.log.info(f"Starting tests using {context.inv_name} inventory type")

            # Run tests without mocktime that only need one peer-connection first,
            # to avoid restarting the nodes
            self.test_expiry_fallback(context)
            self.test_disconnect_fallback(context)
            self.test_notfound_fallback(context)
            self.test_preferred_inv(context)
            self.test_preferred_inv(context, True)
            self.test_large_inv_batch(context)
            self.test_spurious_notfound(context)

            # Run each test against new bitcoind instances, as setting mocktimes has long-term effects on when
            # the next trickle relay event happens.
            for test in [
                self.test_in_flight_max,
                self.test_inv_tx,
                self.test_data_requests,
                self.test_immature_download,
                self.test_request_invalid_once,
            ]:
                self.stop_nodes()
                self.start_nodes()
                self.connect_nodes(1, 0)
                # Setup the p2p connections
                self.peers = []
                for node in self.nodes:
                    for _ in range(NUM_INBOUND):
                        self.peers.append(node.add_p2p_connection(context.p2p_conn()))
                self.log.info(
                    f"Nodes are setup with {NUM_INBOUND} incoming connections each"
                )
                test(context)

        # Restart node0 without avalanche and test that avalanche messages are ignored
        self.restart_node(0, extra_args=self.extra_args[0] + ["-avalanche=0"])
        for context in [PROOF_TEST_CONTEXT, STAKE_CONTENDER_TEST_CONTEXT]:
            self.test_inv_ignore(context)
            self.test_getdata_notfound(context)


if __name__ == "__main__":
    InventoryDownloadTest().main()
