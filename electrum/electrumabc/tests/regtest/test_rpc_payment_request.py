from typing import Any

import pytest
from jsonrpcclient import request

# See https://docs.pytest.org/en/7.1.x/how-to/fixtures.html
from .util import docker_compose_file  # noqa: F401
from .util import fulcrum_service  # noqa: F401
from .util import (
    EC_DAEMON_RPC_URL,
    SUPPORTED_PLATFORM,
    bitcoind_rpc_connection,
    poll_for_answer,
)


@pytest.mark.skipif(not SUPPORTED_PLATFORM, reason="Unsupported platform")
def test_addrequest(fulcrum_service: Any) -> None:  # noqa: F811
    """Verify the `addrequest` RPC by creating a request, pay it and remove it"""

    bitcoind = bitcoind_rpc_connection()

    result = poll_for_answer(EC_DAEMON_RPC_URL, request("listrequests"))
    assert len(result) == 0

    result = poll_for_answer(
        EC_DAEMON_RPC_URL, request("addrequest", params={"amount": 2_500_000})
    )
    assert result["status"] == "Pending"
    assert result["amount"] == 250_000_000
    addr = result["address"]

    bitcoind.sendtoaddress(addr, 2_500_000)
    result = poll_for_answer(
        EC_DAEMON_RPC_URL,
        request("listrequests"),
        expected_answer=("[0].status", "Unconfirmed"),
    )
    assert len(result) == 1
    assert result[0]["status"] == "Unconfirmed"

    addr2 = bitcoind.getnewaddress()
    bitcoind.generatetoaddress(1, addr2)
    result = poll_for_answer(
        EC_DAEMON_RPC_URL,
        request("listrequests"),
        expected_answer=("[0].status", "Paid"),
    )
    assert result[0]["status"] == "Paid"

    poll_for_answer(EC_DAEMON_RPC_URL, request("clearrequests"))
    result = poll_for_answer(EC_DAEMON_RPC_URL, request("listrequests"))
    assert len(result) == 0
