# Copyright (c) 2026 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the number of elements in an avalanche poll."""

import struct

from test_framework.avatools import (
    AvaP2PInterface,
    can_find_inv_in_poll,
    get_ava_p2p_interface,
)
from test_framework.key import ECKey
from test_framework.messages import (
    AvalancheDelegation,
    AvalancheHello,
    AvalancheVote,
    AvalancheVoteError,
    hash256,
    msg_avahello,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_greater_than,
    assert_greater_than_or_equal,
    uint256_hex,
    wait_until_helper_internal,
)

# Should be a multiple of 3 and total above the min for quorum establishment
QUORUM_NODE_COUNT = 6 * 3
PROTOCOL_VERSION_BUMP_MAX_ELEMENTS = 70017
# Should be more than MAX_ELEMENTS_POLL_LEGACY
MAX_ELEMENTS_POLL_LIMITED = 24


class AvalancheHelloLegacy:
    __slots__ = ("delegation", "sig")

    MAX_ELEMENT_POLL = 16

    def __init__(
        self,
        delegation: AvalancheDelegation,
        sig=b"\0" * 64,
    ):
        self.delegation = delegation
        self.sig = sig

    def deserialize(self, f):
        self.delegation.deserialize(f)
        self.sig = f.read(64)

    def serialize(self) -> bytes:
        return self.delegation.serialize() + self.sig

    def __repr__(self):
        return f"AvalancheHello(delegation={self.delegation!r}, sig={self.sig})"

    def get_sighash(self, node):
        b = self.delegation.getid()
        b += struct.pack("<Q", node.remote_nonce)
        b += struct.pack("<Q", node.local_nonce)
        b += struct.pack("<Q", node.remote_extra_entropy)
        b += struct.pack("<Q", node.local_extra_entropy)
        return hash256(b)


class msg_avahello_legacy(msg_avahello):
    __slots__ = ("hello",)
    msgtype = b"avahello"

    def __init__(self):
        self.hello = AvalancheHelloLegacy(AvalancheDelegation())


class OldAvaP2PInterface(AvaP2PInterface):
    def __init__(self, test, node):
        super().__init__(test, node)
        self.version = PROTOCOL_VERSION_BUMP_MAX_ELEMENTS - 1

    def peer_connect(self, *args, **kwargs):
        create_conn = super().peer_connect(*args, **kwargs)

        # Only override the version field from the version message
        self.on_connection_send_msg.nVersion = self.version

        return create_conn

    # Make sure these peers don't send the max_element field of the avahello
    # message
    def build_avahello(
        self,
        delegation: AvalancheDelegation,
        delegated_privkey: ECKey,
        # Unused in the old version
        _max_elements: int = AvalancheHello.MAX_ELEMENT_POLL,
    ) -> msg_avahello_legacy:
        local_sighash = hash256(
            delegation.getid()
            + struct.pack(
                "<QQQQ",
                self.local_nonce,
                self.remote_nonce,
                self.local_extra_entropy,
                self.remote_extra_entropy,
            )
        )

        msg = msg_avahello_legacy()
        msg.hello.delegation = delegation
        msg.hello.sig = delegated_privkey.sign_schnorr(local_sighash)

        return msg


def get_old_ava_p2p_interface(test, node):
    n = OldAvaP2PInterface(test, node)

    assert node.verifyavalancheproof(n.proof.serialize().hex())

    proofid_hex = uint256_hex(n.proof.proofid)
    node.add_p2p_connection(n)
    n.nodeid = node.getpeerinfo()[-1]["id"]

    def avapeer_connected():
        node_list = []
        try:
            node_list = node.getavalanchepeerinfo(proofid_hex)[0]["node_list"]
        except BaseException:
            pass

        return n.nodeid in node_list

    wait_until_helper_internal(avapeer_connected, timeout=5)

    return n


class AvalancheMaxElementsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-persistavapeers=0",
                "-avalanchestakingpreconsensus=0",
            ],
        ]

    def run_test(self):
        node = self.nodes[0]

        quorum_unlimited = [
            get_ava_p2p_interface(self, node) for _ in range(QUORUM_NODE_COUNT // 3)
        ]
        quorum_limited = [
            get_ava_p2p_interface(self, node, max_elements=MAX_ELEMENTS_POLL_LIMITED)
            for _ in range(QUORUM_NODE_COUNT // 3)
        ]
        quorum_legacy = [
            get_old_ava_p2p_interface(self, node) for _ in range(QUORUM_NODE_COUNT // 3)
        ]

        quorum = quorum_unlimited + quorum_limited + quorum_legacy
        assert_equal(len(quorum), QUORUM_NODE_COUNT)

        assert node.getavalancheinfo()["ready_to_poll"] is True

        def has_finalized_proof(proofid):
            can_find_inv_in_poll(quorum, proofid)
            return node.getrawavalancheproof(uint256_hex(proofid))["finalized"]

        for peer in quorum:
            self.wait_until(lambda: has_finalized_proof(peer.proof.proofid))

        def has_finalized_tip(tip_expected):
            hash_tip_final = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_final)
            return node.isfinalblock(tip_expected)

        tip = node.getbestblockhash()
        self.wait_until(lambda: has_finalized_tip(tip))

        # Mine more than MAX_ELEMENTS_POLL_LIMITED blocks and less than
        # MAX_ELEMENTS_POLL
        assert_greater_than(
            AvalancheHello.MAX_ELEMENT_POLL, MAX_ELEMENTS_POLL_LIMITED * 2
        )
        blocks = self.generate(node, MAX_ELEMENTS_POLL_LIMITED * 2)

        def check_polled_blocks(quorum, expected_block_hashes):
            nonlocal all_hashes_present

            expected_sorted_block_hashes = sorted(expected_block_hashes)

            for i, n in enumerate(quorum):
                poll = n.get_avapoll_if_available()
                if poll is None:
                    continue

                # We should never get polled for more elements than the expected
                # ones
                assert_greater_than_or_equal(len(expected_block_hashes), len(poll.invs))

                # All nodes get at least once the max number of elements
                all_hashes_present[i] |= expected_sorted_block_hashes == sorted(
                    [uint256_hex(inv.hash) for inv in poll.invs]
                )

                votes = [
                    AvalancheVote(AvalancheVoteError.UNKNOWN, inv.hash)
                    for inv in poll.invs
                ]
                n.send_avaresponse(poll.round, votes, n.delegated_privkey)

            return all(all_hashes_present)

        # New versions with default max_elements get polled for all blocks
        all_hashes_present = [False] * len(quorum_unlimited)
        self.wait_until(
            lambda: check_polled_blocks(quorum_unlimited, blocks),
        )

        # New versions with limited max_elements get polled for that number of
        # blocks
        all_hashes_present = [False] * len(quorum_limited)
        self.wait_until(
            lambda: check_polled_blocks(
                quorum_limited, blocks[:-MAX_ELEMENTS_POLL_LIMITED]
            ),
        )

        # Old versions get polled for the legacy number of blocks
        all_hashes_present = [False] * len(quorum_legacy)
        self.wait_until(
            lambda: check_polled_blocks(
                quorum_legacy, blocks[-AvalancheHelloLegacy.MAX_ELEMENT_POLL :]
            ),
        )

        self.stop_node(0)

        expected_msg = f"Error: The -avamaxelementpoll value must be between {AvalancheHelloLegacy.MAX_ELEMENT_POLL} and {2**32 - 1}"
        node.assert_start_raises_init_error(
            extra_args=["-avamaxelementpoll=-1"],
            expected_msg=expected_msg,
        )
        node.assert_start_raises_init_error(
            extra_args=["-avamaxelementpoll=0"],
            expected_msg=expected_msg,
        )
        node.assert_start_raises_init_error(
            extra_args=[
                f"-avamaxelementpoll={AvalancheHelloLegacy.MAX_ELEMENT_POLL - 1}"
            ],
            expected_msg=expected_msg,
        )
        node.assert_start_raises_init_error(
            extra_args=[f"-avamaxelementpoll={2**32}"],
            expected_msg=expected_msg,
        )

        # AvalancheHelloLegacy.MAX_ELEMENT_POLL is a valid value
        self.start_node(
            0,
            extra_args=self.extra_args[0]
            + [f"-avamaxelementpoll={AvalancheHelloLegacy.MAX_ELEMENT_POLL}"],
        )
        self.stop_node(0)

        # 2**32 - 1 is a valid value
        self.start_node(
            0,
            extra_args=self.extra_args[0] + [f"-avamaxelementpoll={2**32 - 1}"],
        )


if __name__ == "__main__":
    AvalancheMaxElementsTest().main()
