#!/usr/bin/env python3
# Copyright (c) 2021 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Utilities for avalanche tests."""

import struct
from typing import Any, Optional, List, Dict

from .authproxy import JSONRPCException
from .key import ECKey
from .messages import (
    AvalancheDelegation,
    AvalancheProof,
    AvalancheResponse,
    CInv,
    CTransaction,
    FromHex,
    hash256,
    msg_avahello,
    msg_avapoll,
    msg_tcpavaresponse,
    NODE_AVALANCHE,
    NODE_NETWORK,
    TCPAvalancheResponse,
    ToHex,
)
from .p2p import P2PInterface, p2p_lock
from .test_node import TestNode
from .util import (
    satoshi_round,
    wait_until,
)


def create_coinbase_stakes(
        node: TestNode,
        blockhashes: List[str],
        priv_key: str,
        amount: Optional[str] = None) -> List[Dict[str, Any]]:
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
            'height': b['height'],
            'txid': b['tx'][0]['txid'],
            'n': 0,
            'value': b['tx'][0]['vout'][0]['value'],
        } for b in blocks
    ]

    return [{
        'txid': coinbase['txid'],
        'vout': coinbase['n'],
        'amount': amount or coinbase['value'],
        'height': coinbase['height'],
        'iscoinbase': True,
        'privatekey': priv_key,
    } for coinbase in coinbases]


def get_utxos_in_blocks(node: TestNode, blockhashes: List[str]) -> List[Dict]:
    """Return all UTXOs in the specified list of blocks.
    """
    utxos = filter(
        lambda u: node.gettransaction(u["txid"])["blockhash"] in blockhashes,
        node.listunspent())
    return list(utxos)


def create_stakes(
        node: TestNode, blockhashes: List[str], count: int
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
        outputs = {
            addr: satoshi_round(u['amount'] / 10) for addr in addresses}
        raw_tx = node.createrawtransaction(inputs, outputs)
        ctx = FromHex(CTransaction(), raw_tx)
        ctx.vout[0].nValue -= node.calculate_fee(ctx)
        signed_tx = node.signrawtransactionwithwallet(ToHex(ctx))["hex"]
        node.sendrawtransaction(signed_tx)

    # confirm the transactions
    new_blocks = []
    while node.getmempoolinfo()['size'] > 0:
        new_blocks += node.generate(1)

    utxos = get_utxos_in_blocks(node, new_blocks)
    stakes = []
    # cache block heights
    heights = {}
    for utxo in utxos[:count]:
        blockhash = node.gettransaction(utxo["txid"])["blockhash"]
        if blockhash not in heights:
            heights[blockhash] = node.getblock(blockhash, 1)["height"]
        stakes.append({
            'txid': utxo['txid'],
            'vout': utxo['vout'],
            'amount': utxo['amount'],
            'iscoinbase': utxo['label'] == "coinbase",
            'height': heights[blockhash],
            'privatekey': private_keys[utxo["address"]],
        })

    return stakes


def get_proof_ids(node):
    return [FromHex(AvalancheProof(), peer['proof']
                    ).proofid for peer in node.getavalanchepeerinfo()]


def wait_for_proof(node, proofid_hex, timeout=60):
    def proof_found():
        try:
            node.getrawavalancheproof(proofid_hex)
            return True
        except JSONRPCException:
            return False
    wait_until(proof_found, timeout=timeout)


class AvaP2PInterface(P2PInterface):
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
        assert(self.avahello is None)
        self.avahello = message

    def send_avaresponse(self, round, votes, privkey):
        response = AvalancheResponse(round, 0, votes)
        sig = privkey.sign_schnorr(response.get_hash())
        msg = msg_tcpavaresponse()
        msg.response = TCPAvalancheResponse(response, sig)
        self.send_message(msg)

    def wait_for_avaresponse(self, timeout=5):
        wait_until(
            lambda: len(self.avaresponses) > 0,
            timeout=timeout,
            lock=p2p_lock)

        with p2p_lock:
            return self.avaresponses.pop(0)

    def send_poll(self, hashes):
        msg = msg_avapoll()
        msg.poll.round = self.round
        self.round += 1
        for h in hashes:
            msg.poll.invs.append(CInv(2, h))
        self.send_message(msg)

    def get_avapoll_if_available(self):
        with p2p_lock:
            return self.avapolls.pop(0) if len(self.avapolls) > 0 else None

    def wait_for_avahello(self, timeout=5):
        wait_until(
            lambda: self.avahello is not None,
            timeout=timeout,
            lock=p2p_lock)

        with p2p_lock:
            return self.avahello

    def send_avahello(self, delegation_hex: str, delegated_privkey: ECKey):
        delegation = FromHex(AvalancheDelegation(), delegation_hex)
        local_sighash = hash256(
            delegation.getid() +
            struct.pack("<QQQQ", self.local_nonce, self.remote_nonce,
                        self.local_extra_entropy, self.remote_extra_entropy))

        msg = msg_avahello()
        msg.hello.delegation = delegation
        msg.hello.sig = delegated_privkey.sign_schnorr(local_sighash)
        self.send_message(msg)

        return delegation.proofid


def get_ava_p2p_interface(
        node: TestNode,
        services=NODE_NETWORK | NODE_AVALANCHE) -> AvaP2PInterface:
    """Build and return an AvaP2PInterface connected to the specified
    TestNode.
    """
    n = AvaP2PInterface()
    node.add_p2p_connection(
        n, services=services)
    n.wait_for_verack()
    n.nodeid = node.getpeerinfo()[-1]['id']

    return n
