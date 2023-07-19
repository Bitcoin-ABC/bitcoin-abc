from typing import Any

import pytest
from jsonrpcclient import request

# See https://docs.pytest.org/en/7.1.x/how-to/fixtures.html
from .util import (  # noqa: F401
    EC_DAEMON_RPC_URL,
    SUPPORTED_PLATFORM,
    bitcoind_rpc_connection,
    docker_compose_command,
    docker_compose_file,
    fulcrum_service,
    poll_for_answer,
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

    bitcoind.generatetoaddress(1, addr)
    result = poll_for_answer(
        EC_DAEMON_RPC_URL,
        request("getbalance"),
        expected_answer=("unmatured", "50000000"),
    )
    assert result["unmatured"] == "50000000"

    bitcoind.sendtoaddress(addr, 10_000_000)
    result = poll_for_answer(
        EC_DAEMON_RPC_URL,
        request("getbalance"),
        expected_answer=("unconfirmed", "10000000"),
    )
    assert result["unmatured"] == "50000000" and result["unconfirmed"] == "10000000"

    bitcoind.generatetoaddress(1, bitcoind.getnewaddress())
    result = poll_for_answer(
        EC_DAEMON_RPC_URL,
        request("getbalance"),
        expected_answer=("confirmed", "10000000"),
    )
    assert result["unmatured"] == "50000000" and result["confirmed"] == "10000000"

    bitcoind.generatetoaddress(97, bitcoind.getnewaddress())
    bitcoind.sendtoaddress(addr, 10_000_000)
    result = poll_for_answer(
        EC_DAEMON_RPC_URL,
        request("getbalance"),
        expected_answer=("unconfirmed", "10000000"),
    )
    assert (
        result["unmatured"] == "50000000"
        and result["confirmed"] == "10000000"
        and result["unconfirmed"] == "10000000"
    )

    bitcoind.generatetoaddress(1, bitcoind.getnewaddress())
    result = poll_for_answer(
        EC_DAEMON_RPC_URL,
        request("getbalance"),
        expected_answer=("confirmed", "70000000"),
    )
    assert result["confirmed"] == "70000000"
