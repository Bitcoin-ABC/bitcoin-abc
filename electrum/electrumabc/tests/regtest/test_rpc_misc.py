from decimal import Decimal
from typing import Any

import pytest
from jsonrpcclient import request

from ...constants import XEC

# See https://docs.pytest.org/en/7.1.x/how-to/fixtures.html
from .util import (  # noqa: F401
    EC_DAEMON_RPC_URL,
    SUPPORTED_PLATFORM,
    bitcoind_rpc_connection,
    docker_compose_command,
    docker_compose_file,
    fulcrum_service,
    get_block_subsidy,
    poll_for_answer,
    wait_for_len,
    wait_until,
)

if not SUPPORTED_PLATFORM:
    pytest.skip(allow_module_level=True)


def test_getunusedaddress(fulcrum_service: Any) -> None:  # noqa: F811
    """Verify the `getunusedaddress` RPC"""
    result = poll_for_answer(EC_DAEMON_RPC_URL, request("getunusedaddress"))

    # The daemon returns an address with a prefix.
    prefix = "ecregtest:"
    # Check that the length is 42 and starts with 'q'
    assert len(result) == len(prefix) + 42
    assert result.startswith(prefix + "q")


def test_getservers(fulcrum_service: Any) -> None:  # noqa: F811
    """Verify the `getservers` RPC"""
    result = poll_for_answer(EC_DAEMON_RPC_URL, request("getservers"))

    # Only one server in this setup
    assert len(result) == 1


def test_balance(fulcrum_service: Any) -> None:  # noqa: F811
    """Verify the `getbalance` RPC"""
    addr = poll_for_answer(EC_DAEMON_RPC_URL, request("getunusedaddress"))

    bitcoind = bitcoind_rpc_connection()

    tip_height = bitcoind.getblockchaininfo()["blocks"]
    coinbase_amount = XEC.satoshis_to_unit(get_block_subsidy(tip_height + 1))

    bitcoind.generatetoaddress(1, addr)

    def wallet_has_expected_amount(amount_status: str, amount: Decimal) -> bool:
        """Check the wallet balance for a specific amount.
        The amount is in XEC.
        amount_status can be one of "unmatured", "unconfirmed" or "confirmed"
        """
        result = poll_for_answer(EC_DAEMON_RPC_URL, request("getbalance"))
        return amount_status in result and Decimal(result[amount_status]) == amount

    wait_until(lambda: wallet_has_expected_amount("unmatured", coinbase_amount))

    bitcoind.sendtoaddress(addr, 10_000_000)
    result = poll_for_answer(
        EC_DAEMON_RPC_URL,
        request("getbalance"),
        expected_answer=("unconfirmed", "10000000"),
    )
    assert (
        Decimal(result["unmatured"]) == coinbase_amount
        and result["unconfirmed"] == "10000000"
    )

    bitcoind.generatetoaddress(1, bitcoind.getnewaddress())
    result = poll_for_answer(
        EC_DAEMON_RPC_URL,
        request("getbalance"),
        expected_answer=("confirmed", "10000000"),
    )
    assert (
        Decimal(result["unmatured"]) == coinbase_amount
        and result["confirmed"] == "10000000"
    )

    bitcoind.generatetoaddress(97, bitcoind.getnewaddress())
    bitcoind.sendtoaddress(addr, 10_000_000)
    result = poll_for_answer(
        EC_DAEMON_RPC_URL,
        request("getbalance"),
        expected_answer=("unconfirmed", "10000000"),
    )
    assert (
        Decimal(result["unmatured"]) == coinbase_amount
        and result["confirmed"] == "10000000"
        and result["unconfirmed"] == "10000000"
    )

    bitcoind.generatetoaddress(1, bitcoind.getnewaddress())
    wait_until(
        lambda: wallet_has_expected_amount("confirmed", coinbase_amount + 20_000_000)
    )


def test_payto_broadcast_getaddresshistory(fulcrum_service):  # noqa: F811
    """Use the payto and broadcast commands and check the resulting  wallet UTXOs
    with getaddresshistory"""
    addr = poll_for_answer(EC_DAEMON_RPC_URL, request("getunusedaddress"))

    bitcoind = bitcoind_rpc_connection()
    bitcoind.sendtoaddress(addr, 10_000_000)

    hist = wait_for_len(request("getaddresshistory", params={"address": addr}), 1)
    txid0 = hist[0]["tx_hash"]

    tx_hex = poll_for_answer(
        EC_DAEMON_RPC_URL,
        request(
            "payto",
            params={"destination": addr, "amount": 1_000, "addtransaction": True},
        ),
    )["hex"]
    success, txid1 = poll_for_answer(
        EC_DAEMON_RPC_URL, request("broadcast", params={"tx": tx_hex})
    )
    assert success

    tx_hex = poll_for_answer(
        EC_DAEMON_RPC_URL,
        request(
            "payto",
            params={"destination": addr, "amount": 2_000, "addtransaction": True},
        ),
    )["hex"]
    success, txid2 = poll_for_answer(
        EC_DAEMON_RPC_URL, request("broadcast", params={"tx": tx_hex})
    )
    assert success

    hist = wait_for_len(request("getaddresshistory", params={"address": addr}), 3)
    assert {txid0, txid1, txid2} == {h["tx_hash"] for h in hist}

    total_fee = sum(XEC.satoshis_to_unit(tx["fee"]) for tx in hist[1:])
    coins = poll_for_answer(EC_DAEMON_RPC_URL, request("listunspent"))
    assert {Decimal(coin["value"]) for coin in coins} == {
        Decimal(1000),
        Decimal(2000),
        Decimal(9_997_000) - total_fee,
    }


def test_deserialize(fulcrum_service):  # noqa: F811
    # txid f8c9d5fea8bda2ba3514c5d316a68d7439c04de29b0404eaa197e2da871712f6
    tx = poll_for_answer(
        EC_DAEMON_RPC_URL,
        request(
            "deserialize",
            params={
                "tx": (
                    "0100000001f184f3128dc56f6575cf876c77657af21888fab6e602d1e3df7aa24"
                    "d1d36c632010000006a47304402207f0066e8c48bc73fbd58045b9ce7272d5cd7"
                    "1fdd86ab1debdd0628f5cc14a77d02207b2c92f785dd89387eadc37cfaa825392"
                    "c2dfa8e24b7673546b5ed02050639a8412103562731a08eb23e6260b516c4564f"
                    "746033e9080bc9f61ad2158a63927500b8b1ffffffff02a6ca360c00000000197"
                    "6a9142560d750b51eebd180cef831b4a5c7aafc487bbd88acc2b64d0300000000"
                    "1976a914231f7087937684790d1049294f3aef9cfb7b05dd88ac00000000"
                )
            },
        ),
    )
    assert tx == {
        "version": 1,
        "inputs": [
            {
                "prevout_hash": "32c6361d4da27adfe3d102e6b6fa8818f27a65776c87cf75656fc58d12f384f1",
                "prevout_n": 1,
                "sequence": 4294967295,
                "address": "ecregtest:qq337uy8jdmgg7gdzpyjjne6a7w0k7c9m5nf563x23",
                "scriptSig": "47304402207f0066e8c48bc73fbd58045b9ce7272d5cd71fdd86ab1debdd0628f5cc14a77d02207b2c92f785dd89387eadc37cfaa825392c2dfa8e24b7673546b5ed02050639a8412103562731a08eb23e6260b516c4564f746033e9080bc9f61ad2158a63927500b8b1",
                "x_pubkeys": [
                    "03562731a08eb23e6260b516c4564f746033e9080bc9f61ad2158a63927500b8b1"
                ],
                "pubkeys": [
                    "03562731a08eb23e6260b516c4564f746033e9080bc9f61ad2158a63927500b8b1"
                ],
                "signatures": [
                    "304402207f0066e8c48bc73fbd58045b9ce7272d5cd71fdd86ab1debdd0628f5cc14a77d02207b2c92f785dd89387eadc37cfaa825392c2dfa8e24b7673546b5ed02050639a841"
                ],
                "num_sig": 1,
                "type": "p2pkh",
            }
        ],
        "outputs": [
            {
                "value": 204917414,
                "type": 0,
                "address": "ecregtest:qqjkp46sk50wh5vqemurrd99c740cjrmh52e6vmeq9",
                "scriptPubKey": "76a9142560d750b51eebd180cef831b4a5c7aafc487bbd88ac",
                "prevout_n": 0,
            },
            {
                "value": 55424706,
                "type": 0,
                "address": "ecregtest:qq337uy8jdmgg7gdzpyjjne6a7w0k7c9m5nf563x23",
                "scriptPubKey": "76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac",
                "prevout_n": 1,
            },
        ],
        "lockTime": 0,
    }


def test_signtransaction(fulcrum_service):  # noqa: F811
    """Create an unsigned transaction, sign and broadcast it"""
    addr = poll_for_answer(EC_DAEMON_RPC_URL, request("getunusedaddress"))

    bitcoind = bitcoind_rpc_connection()
    bitcoind.sendtoaddress(addr, 1_100)

    wait_for_len(request("history"), 1)

    unsigned_tx_hex = poll_for_answer(
        EC_DAEMON_RPC_URL,
        request(
            "payto",
            params={"destination": addr, "amount": 1_000, "unsigned": True},
        ),
    )["hex"]

    signed_tx_hex = poll_for_answer(
        EC_DAEMON_RPC_URL,
        request(
            "signtransaction",
            params={"tx": unsigned_tx_hex},
        ),
    )["hex"]

    success, _ = poll_for_answer(
        EC_DAEMON_RPC_URL,
        request(
            "broadcast",
            params={"tx": signed_tx_hex},
        ),
    )
    assert success
