# Copyright (c) 2017 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test RPC calls related to net.

Tests correspond to code in rpc/net.cpp.
"""

import time
from decimal import Decimal
from itertools import product

import test_framework.messages
from test_framework.avatools import create_coinbase_stakes
from test_framework.key import ECKey
from test_framework.messages import NODE_NETWORK
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_approx,
    assert_equal,
    assert_greater_than,
    assert_raises_rpc_error,
    p2p_port,
)
from test_framework.wallet_util import bytes_to_wif


def assert_net_servicesnames(servicesflag, servicenames):
    """Utility that checks if all flags are correctly decoded in
    `getpeerinfo` and `getnetworkinfo`.

    :param servicesflag: The services as an integer.
    :param servicenames: The list of decoded services names, as strings.
    """
    servicesflag_generated = 0
    for servicename in servicenames:
        servicesflag_generated |= getattr(
            test_framework.messages, f"NODE_{servicename}"
        )
    assert servicesflag_generated == servicesflag


class NetTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-minrelaytxfee=10",
            ],
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-minrelaytxfee=5",
            ],
        ]
        self.supports_cli = False

    def run_test(self):
        # By default, the test framework sets up an addnode connection from
        # node 1 --> node0. By connecting node0 --> node 1, we're left with
        # the two nodes being connected both ways.
        # Topology will look like: node0 <--> node1
        self.connect_nodes(0, 1)
        self.sync_all()

        self.test_connection_count()
        self.test_getpeerinfo()
        self.test_getnettotals()
        self.test_getnetworkinfo()
        self.test_getaddednodeinfo()
        self.test_service_flags()
        self.test_getnodeaddresses()
        self.test_addpeeraddress()
        self.test_sendmsgtopeer()

    def test_connection_count(self):
        self.log.info("Test getconnectioncount")
        # After using `connect_nodes` to connect nodes 0 and 1 to each other.
        assert_equal(self.nodes[0].getconnectioncount(), 2)

    def test_getpeerinfo(self):
        self.log.info("Test getpeerinfo")
        # Create a few getpeerinfo last_block/last_transaction/last_proof
        # values.
        if self.is_wallet_compiled():
            self.nodes[0].sendtoaddress(self.nodes[1].getnewaddress(), 1000000)
        tip = self.generate(self.nodes[1], 1)[0]

        stake = create_coinbase_stakes(
            self.nodes[1], [tip], self.nodes[1].get_deterministic_priv_key().key
        )
        privkey = ECKey()
        privkey.generate()
        proof = self.nodes[1].buildavalancheproof(
            42, 2000000000, bytes_to_wif(privkey.get_bytes()), stake
        )
        self.nodes[1].sendavalancheproof(proof)
        self.sync_proofs()

        time_now = int(time.time())
        peer_info = [x.getpeerinfo() for x in self.nodes]
        # Verify last_block, last_transaction and last_proof keys/values.
        for node, peer, field in product(
            range(self.num_nodes),
            range(2),
            ["last_block", "last_transaction", "last_proof"],
        ):
            assert field in peer_info[node][peer].keys()
            if peer_info[node][peer][field] != 0:
                assert_approx(peer_info[node][peer][field], time_now, vspan=60)
        # check both sides of bidirectional connection between nodes
        # the address bound to on one side will be the source address for the
        # other node
        assert_equal(peer_info[0][0]["addrbind"], peer_info[1][0]["addr"])
        assert_equal(peer_info[1][0]["addrbind"], peer_info[0][0]["addr"])
        assert_equal(peer_info[0][0]["minfeefilter"], Decimal("5.00"))
        assert_equal(peer_info[1][0]["minfeefilter"], Decimal("10.00"))
        # check the `servicesnames` field
        for info in peer_info:
            assert_net_servicesnames(
                int(info[0]["services"], 0x10), info[0]["servicesnames"]
            )

        assert_equal(peer_info[0][0]["connection_type"], "inbound")
        assert_equal(peer_info[0][1]["connection_type"], "manual")

        assert_equal(peer_info[1][0]["connection_type"], "manual")
        assert_equal(peer_info[1][1]["connection_type"], "inbound")

        # Check dynamically generated networks list in getpeerinfo help output.
        assert "(ipv4, ipv6, onion, i2p, not_publicly_routable)" in self.nodes[0].help(
            "getpeerinfo"
        )

        # Node state fields
        for node, peer, field in product(
            range(self.num_nodes),
            range(2),
            ["startingheight", "synced_headers", "synced_blocks", "inflight"],
        ):
            assert field in peer_info[node][peer].keys()

    def test_getnettotals(self):
        self.log.info("Test getnettotals")
        # Test getnettotals and getpeerinfo by doing a ping. The bytes
        # sent/received should increase by at least the size of one ping (32
        # bytes) and one pong (32 bytes).
        net_totals_before = self.nodes[0].getnettotals()
        peer_info_before = self.nodes[0].getpeerinfo()
        self.nodes[0].ping()
        self.wait_until(
            lambda: self.nodes[0].getnettotals()["totalbytessent"]
            >= net_totals_before["totalbytessent"] + 32 * 2,
            timeout=10,
        )
        self.wait_until(
            lambda: self.nodes[0].getnettotals()["totalbytesrecv"]
            >= net_totals_before["totalbytesrecv"] + 32 * 2,
            timeout=10,
        )

        for peer_before in peer_info_before:

            def peer_after():
                return next(
                    p
                    for p in self.nodes[0].getpeerinfo()
                    if p["id"] == peer_before["id"]
                )

            self.wait_until(
                lambda: peer_after()["bytesrecv_per_msg"].get("pong", 0)
                >= peer_before["bytesrecv_per_msg"].get("pong", 0) + 32,
                timeout=10,
            )
            self.wait_until(
                lambda: peer_after()["bytessent_per_msg"].get("ping", 0)
                >= peer_before["bytessent_per_msg"].get("ping", 0) + 32,
                timeout=10,
            )

    def test_getnetworkinfo(self):
        self.log.info("Test getnetworkinfo")
        info = self.nodes[0].getnetworkinfo()
        assert_equal(info["networkactive"], True)
        assert_equal(info["connections"], 2)
        assert_equal(info["connections_in"], 1)
        assert_equal(info["connections_out"], 1)

        with self.nodes[0].assert_debug_log(
            expected_msgs=["SetNetworkActive: false\n"]
        ):
            self.nodes[0].setnetworkactive(state=False)
        assert_equal(self.nodes[0].getnetworkinfo()["networkactive"], False)
        # Wait a bit for all sockets to close
        self.wait_until(
            lambda: self.nodes[0].getnetworkinfo()["connections"] == 0, timeout=3
        )

        with self.nodes[0].assert_debug_log(expected_msgs=["SetNetworkActive: true\n"]):
            self.nodes[0].setnetworkactive(state=True)
        # Connect nodes both ways.
        self.connect_nodes(0, 1)
        self.connect_nodes(1, 0)

        info = self.nodes[0].getnetworkinfo()
        assert_equal(info["networkactive"], True)
        assert_equal(info["connections"], 2)
        assert_equal(info["connections_in"], 1)
        assert_equal(info["connections_out"], 1)

        # check the `servicesnames` field
        network_info = [node.getnetworkinfo() for node in self.nodes]
        for info in network_info:
            assert_net_servicesnames(
                int(info["localservices"], 0x10), info["localservicesnames"]
            )

        # Check dynamically generated networks list in getnetworkinfo help
        # output.
        assert "(ipv4, ipv6, onion, i2p)" in self.nodes[0].help("getnetworkinfo")

    def test_getaddednodeinfo(self):
        self.log.info("Test getaddednodeinfo")
        assert_equal(self.nodes[0].getaddednodeinfo(), [])
        # add a node (node2) to node0
        ip_port = f"127.0.0.1:{p2p_port(2)}"
        self.nodes[0].addnode(node=ip_port, command="add")
        # check that the node has indeed been added
        added_nodes = self.nodes[0].getaddednodeinfo(ip_port)
        assert_equal(len(added_nodes), 1)
        assert_equal(added_nodes[0]["addednode"], ip_port)
        # check that node cannot be added again
        assert_raises_rpc_error(
            -23,
            "Node already added",
            self.nodes[0].addnode,
            node=ip_port,
            command="add",
        )
        # check that node can be removed
        self.nodes[0].addnode(node=ip_port, command="remove")
        assert_equal(self.nodes[0].getaddednodeinfo(), [])
        # check that trying to remove the node again returns an error
        assert_raises_rpc_error(
            -24,
            "Node could not be removed",
            self.nodes[0].addnode,
            node=ip_port,
            command="remove",
        )
        # check that a non-existent node returns an error
        assert_raises_rpc_error(
            -24, "Node has not been added", self.nodes[0].getaddednodeinfo, "1.1.1.1"
        )

    def test_service_flags(self):
        self.log.info("Test service flags")
        self.nodes[0].add_p2p_connection(P2PInterface(), services=(1 << 5) | (1 << 63))
        assert_equal(
            ["UNKNOWN[2^5]", "UNKNOWN[2^63]"],
            self.nodes[0].getpeerinfo()[-1]["servicesnames"],
        )
        self.nodes[0].disconnect_p2ps()

    def test_getnodeaddresses(self):
        self.log.info("Test getnodeaddresses")
        self.nodes[0].add_p2p_connection(P2PInterface())

        # Add an IPv6 address to the address manager.
        ipv6_addr = "1233:3432:2434:2343:3234:2345:6546:4534"
        self.nodes[0].addpeeraddress(address=ipv6_addr, port=8333)

        # Add 10,000 IPv4 addresses to the address manager. Due to the way bucket
        # and bucket positions are calculated, some of these addresses will
        # collide.
        imported_addrs = []
        for i in range(10000):
            first_octet = i >> 8
            second_octet = i % 256
            a = f"{first_octet}.{second_octet}.1.1"
            imported_addrs.append(a)
            self.nodes[0].addpeeraddress(a, 8333)

        # Fetch the addresses via the RPC and test the results.
        # default count is 1
        assert_equal(len(self.nodes[0].getnodeaddresses()), 1)
        assert_equal(len(self.nodes[0].getnodeaddresses(count=2)), 2)
        assert_equal(len(self.nodes[0].getnodeaddresses(network="ipv4", count=8)), 8)

        # Maximum possible addresses in AddrMan is 10000. The actual number will
        # usually be less due to bucket and bucket position collisions.
        node_addresses = self.nodes[0].getnodeaddresses(0, "ipv4")
        assert_greater_than(len(node_addresses), 5000)
        assert_greater_than(10000, len(node_addresses))
        for a in node_addresses:
            assert_greater_than(a["time"], 1527811200)  # 1st June 2018
            assert_equal(a["services"], NODE_NETWORK)
            assert a["address"] in imported_addrs
            assert_equal(a["port"], 8333)
            assert_equal(a["network"], "ipv4")

        # Test the IPv6 address.
        res = self.nodes[0].getnodeaddresses(0, "ipv6")
        assert_equal(len(res), 1)
        assert_equal(res[0]["address"], ipv6_addr)
        assert_equal(res[0]["network"], "ipv6")
        assert_equal(res[0]["port"], 8333)
        assert_equal(res[0]["services"], NODE_NETWORK)

        # Test for the absence of onion and I2P addresses.
        for network in ["onion", "i2p"]:
            assert_equal(self.nodes[0].getnodeaddresses(0, network), [])

        # Test invalid arguments.
        assert_raises_rpc_error(
            -8, "Address count out of range", self.nodes[0].getnodeaddresses, -1
        )
        assert_raises_rpc_error(
            -8, "Network not recognized: Foo", self.nodes[0].getnodeaddresses, 1, "Foo"
        )

    def test_addpeeraddress(self):
        """RPC addpeeraddress sets the source address equal to the destination address.
        If an address with the same /16 as an existing new entry is passed, it will be
        placed in the same new bucket and have a 1/64 chance of the bucket positions
        colliding (depending on the value of nKey in the addrman), in which case the
        new address won't be added.  The probability of collision can be reduced to
        1/2^16 = 1/65536 by using an address from a different /16.  We avoid this here
        by first testing adding a tried table entry before testing adding a new table one.
        """
        self.log.info("Test addpeeraddress")
        self.restart_node(1, ["-checkaddrman=1"])
        node = self.nodes[1]

        self.log.debug("Test that addpeerinfo is a hidden RPC")
        # It is hidden from general help, but its detailed help may be called
        # directly.
        assert "addpeerinfo" not in node.help()
        assert "addpeerinfo" in node.help("addpeerinfo")

        self.log.debug("Test that adding an empty address fails")
        assert_equal(node.addpeeraddress(address="", port=8333), {"success": False})
        assert_equal(node.getnodeaddresses(count=0), [])

        self.log.debug("Test that adding a valid address to the tried table succeeds")
        assert_equal(
            node.addpeeraddress(address="1.2.3.4", tried=True, port=8333),
            {"success": True},
        )
        with node.assert_debug_log(
            expected_msgs=["CheckAddrman: new 0, tried 1, total 1 started"]
        ):
            # getnodeaddresses re-runs the addrman checks
            addrs = node.getnodeaddresses(count=0)
            assert_equal(len(addrs), 1)
            assert_equal(addrs[0]["address"], "1.2.3.4")
            assert_equal(addrs[0]["port"], 8333)

        self.log.debug(
            "Test that adding an already-present tried address to the new and tried"
            " tables fails"
        )
        for value in [True, False]:
            assert_equal(
                node.addpeeraddress(address="1.2.3.4", tried=value, port=8333),
                {"success": False},
            )
        assert_equal(len(node.getnodeaddresses(count=0)), 1)

        self.log.debug(
            "Test that adding a second address, this time to the new table, succeeds"
        )
        assert_equal(
            node.addpeeraddress(address="2.0.0.0", port=8333), {"success": True}
        )
        with node.assert_debug_log(
            expected_msgs=["CheckAddrman: new 1, tried 1, total 2 started"]
        ):
            # getnodeaddresses re-runs the addrman checks
            addrs = node.getnodeaddresses(count=0)
            assert_equal(len(addrs), 2)

    def test_sendmsgtopeer(self):
        node = self.nodes[0]

        self.restart_node(0)
        self.connect_nodes(0, 1)

        self.log.info("Test sendmsgtopeer")
        self.log.debug("Send a valid message")
        with self.nodes[1].assert_debug_log(expected_msgs=["received: addr"]):
            node.sendmsgtopeer(peer_id=0, msg_type="addr", msg="FFFFFF")

        self.log.debug("Test error for sending to non-existing peer")
        assert_raises_rpc_error(
            -1,
            "Error: Could not send message to peer",
            node.sendmsgtopeer,
            peer_id=100,
            msg_type="addr",
            msg="FF",
        )

        self.log.debug("Test that zero-length msg_type is allowed")
        node.sendmsgtopeer(peer_id=0, msg_type="addr", msg="")

        self.log.debug("Test error for msg_type that is too long")
        assert_raises_rpc_error(
            -8,
            "Error: msg_type too long, max length is 12",
            node.sendmsgtopeer,
            peer_id=0,
            msg_type="long_msg_type",
            msg="FF",
        )

        self.log.debug("Test that unknown msg_type is allowed")
        node.sendmsgtopeer(peer_id=0, msg_type="unknown", msg="FF")

        self.log.debug("Test that empty msg is allowed")
        node.sendmsgtopeer(peer_id=0, msg_type="addr", msg="FF")

        self.log.debug(
            "Test that oversized messages are allowed, but get us disconnected"
        )
        zero_byte_string = b"\x00" * 4000001
        node.sendmsgtopeer(peer_id=0, msg_type="addr", msg=zero_byte_string.hex())
        self.wait_until(lambda: len(self.nodes[0].getpeerinfo()) == 0, timeout=10)


if __name__ == "__main__":
    NetTest().main()
