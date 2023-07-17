#!/usr/bin/env python3

import os
import platform
import shutil
import subprocess
import tempfile
import time
from typing import Any, Generator, Optional

import pytest
import requests
from bitcoinrpc.authproxy import AuthServiceProxy
from jsonpath_ng import parse as path_parse
from jsonrpcclient import parse as rpc_parse
from jsonrpcclient import request

_datadir = None
_bitcoind = None

SUPPORTED_PLATFORM = (
    platform.machine() in ("AMD64", "x86_64") and platform.system() == "Linux"
)

EC_DAEMON_RPC_URL = "http://user:pass@localhost:12342"
FULCRUM_STATS_URL = "http://localhost:8081/stats"
BITCOIND_RPC_URL = "http://user:pass@0.0.0.0:18333"

ELECTRUM_ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "..")
ELECTRUMABC_COMMAND = os.path.join(ELECTRUM_ROOT, "electrum-abc")


def poll_for_answer(
    url: Any,
    json_req: Optional[Any] = None,
    poll_interval: int = 1,
    poll_timeout: int = 10,
    expected_answer: Optional[Any] = None,
) -> Any:
    """Poll an RPC method until timeout or an expected answer has been received"""
    start = current = time.time()

    while current < start + poll_timeout:
        retry = False
        try:
            if json_req is None:
                resp = requests.get(url)
                json_result = resp.json()
            else:
                resp = requests.post(url, json=json_req)
                if resp.status_code == 500:
                    retry = True
                else:
                    json_result = rpc_parse(resp.json()).result

            if expected_answer is not None and not retry:
                path, answer = expected_answer
                jsonpath_expr = path_parse(path)
                expect_element = jsonpath_expr.find(json_result)
                if len(expect_element) > 0 and expect_element[0].value == answer:
                    return json_result
            elif retry:
                pass
            else:
                return json_result
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(poll_interval)
        current = time.time()


def bitcoind_rpc_connection() -> AuthServiceProxy:
    """Connects to bitcoind, generates 100 blocks and returns the connection"""
    global _bitcoind
    if _bitcoind is not None:
        return _bitcoind
    _bitcoind = AuthServiceProxy(BITCOIND_RPC_URL)

    poll_for_answer(BITCOIND_RPC_URL, request("uptime"))
    block_count = _bitcoind.getblockcount()
    if block_count < 101:
        _bitcoind.createwallet("test_wallet")
        addr = _bitcoind.getnewaddress()
        _bitcoind.generatetoaddress(101, addr)

    return _bitcoind


# Creates a temp directory on disk for wallet storage
# Starts a daemon, creates and loads a wallet
def start_ec_daemon() -> None:
    """
    Creates a temp directory on disk for wallet storage
    Starts a daemon, creates and loads a wallet
    """
    if _datadir is None:
        assert False
    os.mkdir(os.path.join(_datadir, "regtest"))
    shutil.copyfile(
        os.path.join(
            ELECTRUM_ROOT,
            "electrumabc",
            "tests",
            "regtest",
            "configs",
            "electrum-abc-config",
        ),
        os.path.join(_datadir, "regtest", "config"),
    )
    default_wallet = os.path.join(_datadir, "default_wallet")
    subprocess.run(
        [
            ELECTRUMABC_COMMAND,
            "--regtest",
            "-D",
            _datadir,
            "-w",
            default_wallet,
            "daemon",
            "start",
        ],
        check=True,
    )
    result = poll_for_answer(EC_DAEMON_RPC_URL, request("version"))

    from ...version import PACKAGE_VERSION

    assert result == PACKAGE_VERSION

    r = request("create", params={"wallet_path": default_wallet})
    result = poll_for_answer(EC_DAEMON_RPC_URL, r)
    assert "seed" in result
    assert len(result["seed"].split(" ")) == 12

    result = poll_for_answer(EC_DAEMON_RPC_URL, request("load_wallet"))
    assert result

    # Wait until the wallet is up to date
    poll_for_answer(
        EC_DAEMON_RPC_URL,
        request("getinfo"),
        expected_answer=(f'wallets["{default_wallet}"]', True),
    )


def stop_ec_daemon() -> None:
    """Stops the daemon and removes the wallet storage from disk"""
    subprocess.run(
        [ELECTRUMABC_COMMAND, "--regtest", "-D", _datadir, "daemon", "stop"], check=True
    )
    if _datadir is None or _datadir.startswith("/tmp") is False:
        assert False
    shutil.rmtree(_datadir)


@pytest.fixture(scope="session")
def docker_compose_file(pytestconfig) -> str:
    """Needed since the docker-compose.yml is not in the root directory"""
    return os.path.join(
        str(pytestconfig.rootdir),
        "electrumabc",
        "tests",
        "regtest",
        "docker-compose.yml",
    )


@pytest.fixture(scope="session")
def fulcrum_service(docker_services: Any) -> Generator[None, None, None]:
    """Makes sure all services (bitcoind, fulcrum and the EC daemon) are up and running"""
    global _datadir
    global _bitcoind
    if _datadir is not None:
        yield
    else:
        _datadir = tempfile.mkdtemp()
        _bitcoind = bitcoind_rpc_connection()
        poll_for_answer(FULCRUM_STATS_URL, expected_answer=("Controller.TxNum", 102))

        try:
            start_ec_daemon()
            yield
        finally:
            stop_ec_daemon()
