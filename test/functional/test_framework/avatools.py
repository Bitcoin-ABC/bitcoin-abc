# Copyright (c) 2021 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Utilities for avalanche tests."""

import random
import struct
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from .authproxy import JSONRPCException
from .key import ECKey
from .messages import (
    MSG_AVA_PROOF,
    MSG_BLOCK,
    NODE_AVALANCHE,
    NODE_NETWORK,
    AvalancheDelegation,
    AvalancheProof,
    AvalancheResponse,
    AvalancheVote,
    AvalancheVoteError,
    CInv,
    CTransaction,
    FromHex,
    TCPAvalancheResponse,
    ToHex,
    calculate_shortid,
    hash256,
    msg_avahello,
    msg_avapoll,
    msg_avaproof,
    msg_avaproofs,
    msg_notfound,
    msg_tcpavaresponse,
)
from .p2p import P2PInterface, p2p_lock

if TYPE_CHECKING:
    from .test_framework import BitcoinTestFramework

from .test_node import TestNode
from .util import satoshi_round, uint256_hex, wait_until_helper
from .wallet_util import bytes_to_wif


def avalanche_proof_from_hex(proof_hex: str) -> AvalancheProof:
    return FromHex(AvalancheProof(), proof_hex)


def create_coinbase_stakes(
    node: TestNode, blockhashes: List[str], priv_key: str, amount: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Returns a list of dictionaries representing stakes, in a format
    compatible with the buildavalancheproof RPC, using only coinbase
    transactions.

    :param node: Test node used to get the block and coinbase data.
    :param blockhashes: List of block hashes, whose coinbase tx will be used
        as a stake.
    :param priv_key: Private key controlling the coinbase UTXO
    :param amount: If specified, this overwrites the amount information
        in the coinbase dicts.
    """
    blocks = [node.getblock(h, 2) for h in blockhashes]
    coinbases = [
        {
            "height": b["height"],
            "txid": b["tx"][0]["txid"],
            "n": 0,
            "value": b["tx"][0]["vout"][0]["value"],
        }
        for b in blocks
    ]

    return [
        {
            "txid": coinbase["txid"],
            "vout": coinbase["n"],
            "amount": amount or coinbase["value"],
            "height": coinbase["height"],
            "iscoinbase": True,
            "privatekey": priv_key,
        }
        for coinbase in coinbases
    ]


def get_utxos_in_blocks(node: TestNode, blockhashes: List[str]) -> List[Dict]:
    """Return all UTXOs in the specified list of blocks."""
    utxos = filter(
        lambda u: node.gettransaction(u["txid"])["blockhash"] in blockhashes,
        node.listunspent(),
    )
    return list(utxos)


def create_stakes(
    test_framework: "BitcoinTestFramework",
    node: TestNode,
    blockhashes: List[str],
    count: int,
    sync_fun=None,
) -> List[Dict[str, Any]]:
    """
    Create a list of stakes by splitting existing UTXOs from a specified list
    of blocks into 10 new coins.

    This function can generate more valid stakes than `get_coinbase_stakes`
    does, because on the regtest chain halving happens every 150 blocks so
    the coinbase amount is below the dust threshold after only 900 blocks.

    :param node: Test node used to generate blocks and send transactions
    :param blockhashes: List of block hashes whose UTXOs will be split.
    :param count: Number of stakes to return.
    """
    assert 10 * len(blockhashes) >= count
    utxos = get_utxos_in_blocks(node, blockhashes)

    addresses = [node.getnewaddress() for _ in range(10)]
    private_keys = {addr: node.dumpprivkey(addr) for addr in addresses}

    for u in utxos:
        inputs = [{"txid": u["txid"], "vout": u["vout"]}]
        outputs = {addr: satoshi_round(u["amount"] / 10) for addr in addresses}
        raw_tx = node.createrawtransaction(inputs, outputs)
        ctx = FromHex(CTransaction(), raw_tx)
        ctx.vout[0].nValue -= node.calculate_fee(ctx)
        signed_tx = node.signrawtransactionwithwallet(ToHex(ctx))["hex"]
        node.sendrawtransaction(signed_tx)

    # confirm the transactions
    new_blocks = []
    while node.getmempoolinfo()["size"] > 0:
        new_blocks += test_framework.generate(
            node, 1, sync_fun=test_framework.no_op if sync_fun is None else sync_fun
        )

    utxos = get_utxos_in_blocks(node, new_blocks)
    stakes = []
    # cache block heights
    heights = {}
    for utxo in utxos[:count]:
        blockhash = node.gettransaction(utxo["txid"])["blockhash"]
        if blockhash not in heights:
            heights[blockhash] = node.getblock(blockhash, 1)["height"]
        stakes.append(
            {
                "txid": utxo["txid"],
                "vout": utxo["vout"],
                "amount": utxo["amount"],
                "iscoinbase": utxo["label"] == "coinbase",
                "height": heights[blockhash],
                "privatekey": private_keys[utxo["address"]],
            }
        )

    return stakes


def get_proof_ids(node):
    return [int(peer["proofid"], 16) for peer in node.getavalanchepeerinfo()]


def wait_for_proof(node, proofid_hex, expect_status="boundToPeer", timeout=60):
    """
    Wait for the proof to be known by the node. The expect_status is checked
    once after the proof is found and can be one of the following: "immature",
    "boundToPeer", "conflicting" or "finalized".
    """
    ret = {}

    def proof_found():
        nonlocal ret
        try:
            ret = node.getrawavalancheproof(proofid_hex)
            return True
        except JSONRPCException:
            return False

    wait_until_helper(proof_found, timeout=timeout)
    assert ret.get(expect_status, False) is True


class NoHandshakeAvaP2PInterface(P2PInterface):
    """P2PInterface with avalanche capabilities"""

    def __init__(self):
        self.round = 0
        self.avahello = None
        self.avaresponses = []
        self.avapolls = []
        self.nodeid: Optional[int] = None
        super().__init__()

    def peer_connect(self, *args, **kwargs):
        create_conn = super().peer_connect(*args, **kwargs)

        # Save the nonce and extra entropy so they can be reused later.
        self.local_nonce = self.on_connection_send_msg.nNonce
        self.local_extra_entropy = self.on_connection_send_msg.nExtraEntropy

        return create_conn

    def peer_accept_connection(self, *args, **kwargs):
        create_conn = super().peer_accept_connection(*args, **kwargs)

        # Save the nonce and extra entropy so they can be reused later.
        self.local_nonce = self.on_connection_send_msg.nNonce
        self.local_extra_entropy = self.on_connection_send_msg.nExtraEntropy

        return create_conn

    def on_version(self, message):
        super().on_version(message)

        # Save the nonce and extra entropy so they can be reused later.
        self.remote_nonce = message.nNonce
        self.remote_extra_entropy = message.nExtraEntropy

    def on_avaresponse(self, message):
        self.avaresponses.append(message.response)

    def on_avapoll(self, message):
        self.avapolls.append(message.poll)

    def on_avahello(self, message):
        assert self.avahello is None
        self.avahello = message

    def send_avaresponse(self, avaround, votes, privkey):
        response = AvalancheResponse(avaround, 0, votes)
        sig = privkey.sign_schnorr(response.get_hash())
        msg = msg_tcpavaresponse()
        msg.response = TCPAvalancheResponse(response, sig)
        self.send_message(msg)

    def wait_for_avaresponse(self, timeout=5):
        self.wait_until(lambda: len(self.avaresponses) > 0, timeout=timeout)

        with p2p_lock:
            return self.avaresponses.pop(0)

    def send_poll(self, hashes, inv_type=MSG_BLOCK):
        msg = msg_avapoll()
        msg.poll.round = self.round
        self.round += 1
        for h in hashes:
            msg.poll.invs.append(CInv(inv_type, h))
        self.send_message(msg)

    def send_proof(self, proof):
        msg = msg_avaproof()
        msg.proof = proof
        self.send_message(msg)

    def get_avapoll_if_available(self):
        with p2p_lock:
            return self.avapolls.pop(0) if len(self.avapolls) > 0 else None

    def wait_for_avahello(self, timeout=5):
        self.wait_until(lambda: self.avahello is not None, timeout=timeout)

        with p2p_lock:
            return self.avahello

    def build_avahello(
        self, delegation: AvalancheDelegation, delegated_privkey: ECKey
    ) -> msg_avahello:
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

        msg = msg_avahello()
        msg.hello.delegation = delegation
        msg.hello.sig = delegated_privkey.sign_schnorr(local_sighash)

        return msg

    def send_avahello(self, delegation_hex: str, delegated_privkey: ECKey):
        delegation = FromHex(AvalancheDelegation(), delegation_hex)
        msg = self.build_avahello(delegation, delegated_privkey)
        self.send_message(msg)

        return msg.hello.delegation.proofid

    def send_avaproof(self, proof: AvalancheProof):
        msg = msg_avaproof()
        msg.proof = proof
        self.send_message(msg)


class AvaP2PInterface(NoHandshakeAvaP2PInterface):
    def __init__(self, test_framework=None, node=None):
        if (test_framework is not None and node is None) or (
            node is not None and test_framework is None
        ):
            raise AssertionError(
                "test_framework and node should both be either set or None"
            )

        super().__init__()

        self.master_privkey = None
        self.proof = None

        self.delegated_privkey = ECKey()
        self.delegated_privkey.generate()
        self.delegation = None

        if test_framework is not None and node is not None:
            self.master_privkey, self.proof = gen_proof(test_framework, node)
            delegation_hex = node.delegateavalancheproof(
                uint256_hex(self.proof.limited_proofid),
                bytes_to_wif(self.master_privkey.get_bytes()),
                self.delegated_privkey.get_pubkey().get_bytes().hex(),
            )
            assert node.verifyavalanchedelegation(delegation_hex)

            self.delegation = FromHex(AvalancheDelegation(), delegation_hex)

    def on_version(self, message):
        super().on_version(message)

        avahello = msg_avahello()
        if self.delegation is not None:
            avahello = self.build_avahello(self.delegation, self.delegated_privkey)
        elif self.proof is not None:
            avahello = self.build_avahello(
                AvalancheDelegation(
                    self.proof.limited_proofid,
                    self.master_privkey.get_pubkey().get_bytes(),
                ),
                self.master_privkey,
            )

        self.send_message(avahello)

    def on_getdata(self, message):
        super().on_getdata(message)

        not_found = []
        for inv in message.inv:
            if (
                inv.type == MSG_AVA_PROOF
                and self.proof is not None
                and inv.hash == self.proof.proofid
            ):
                self.send_avaproof(self.proof)
            else:
                not_found.append(inv)

        if len(not_found) > 0:
            self.send_message(msg_notfound(not_found))


def get_ava_p2p_interface_no_handshake(
    node: TestNode, services=NODE_NETWORK | NODE_AVALANCHE
) -> NoHandshakeAvaP2PInterface:
    """Build and return a NoHandshakeAvaP2PInterface connected to the specified
    TestNode.
    """
    n = NoHandshakeAvaP2PInterface()
    node.add_p2p_connection(n, services=services)
    n.wait_for_verack()
    n.nodeid = node.getpeerinfo()[-1]["id"]

    return n


def get_ava_p2p_interface(
    test_framework: "BitcoinTestFramework",
    node: TestNode,
    services=NODE_NETWORK | NODE_AVALANCHE,
    stake_utxo_confirmations=1,
    sync_fun=None,
) -> AvaP2PInterface:
    """Build and return an AvaP2PInterface connected to the specified TestNode."""
    n = AvaP2PInterface(test_framework, node)

    # Make sure the proof utxos are mature
    if stake_utxo_confirmations > 1:
        test_framework.generate(
            node,
            stake_utxo_confirmations - 1,
            sync_fun=test_framework.no_op if sync_fun is None else sync_fun,
        )

    assert node.verifyavalancheproof(n.proof.serialize().hex())

    proofid_hex = uint256_hex(n.proof.proofid)
    node.add_p2p_connection(n, services=services)
    n.nodeid = node.getpeerinfo()[-1]["id"]

    def avapeer_connected():
        node_list = []
        try:
            node_list = node.getavalanchepeerinfo(proofid_hex)[0]["node_list"]
        except BaseException:
            pass

        return n.nodeid in node_list

    wait_until_helper(avapeer_connected, timeout=5)

    return n


def gen_proof(test_framework, node, coinbase_utxos=1, expiry=0, sync_fun=None):
    blockhashes = test_framework.generate(
        node,
        coinbase_utxos,
        sync_fun=test_framework.no_op if sync_fun is None else sync_fun,
    )

    privkey = ECKey()
    privkey.generate()

    stakes = create_coinbase_stakes(
        node, blockhashes, node.get_deterministic_priv_key().key
    )
    proof_hex = node.buildavalancheproof(
        42, expiry, bytes_to_wif(privkey.get_bytes()), stakes
    )

    return privkey, avalanche_proof_from_hex(proof_hex)


def build_msg_avaproofs(
    proofs: List[AvalancheProof],
    prefilled_proofs: Optional[List[AvalancheProof]] = None,
    key_pair: Optional[List[int]] = None,
) -> msg_avaproofs:
    if key_pair is None:
        key_pair = [random.randint(0, 2**64 - 1)] * 2

    msg = msg_avaproofs()
    msg.key0 = key_pair[0]
    msg.key1 = key_pair[1]
    msg.prefilled_proofs = prefilled_proofs or []
    msg.shortids = [
        calculate_shortid(msg.key0, msg.key1, proof.proofid) for proof in proofs
    ]

    return msg


def can_find_inv_in_poll(
    quorum,
    inv_hash,
    response=AvalancheVoteError.ACCEPTED,
    other_response=AvalancheVoteError.ACCEPTED,
):
    found_hash = False
    for n in quorum:
        poll = n.get_avapoll_if_available()

        # That node has not received a poll
        if poll is None:
            continue

        # We got a poll, check for the hash and repond
        votes = []
        for inv in poll.invs:
            # Vote to everything but our searched inv
            r = other_response

            # Look for what we expect
            if inv.hash == inv_hash:
                r = response
                found_hash = True

            votes.append(AvalancheVote(r, inv.hash))

        n.send_avaresponse(poll.round, votes, n.delegated_privkey)

    return found_hash
