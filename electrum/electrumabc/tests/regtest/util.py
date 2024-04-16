import contextlib
import os
import platform
import shutil
import subprocess
import tempfile
import time
from typing import Any, Callable, Generator, Optional

import pytest
import requests
from bitcoinrpc.authproxy import AuthServiceProxy
from jsonpath_ng import parse as path_parse
from jsonrpcclient import Ok as rpc_Ok
from jsonrpcclient import parse as rpc_parse
from jsonrpcclient import request

_bitcoind = None

SUPPORTED_PLATFORM = (
    platform.machine() in ("AMD64", "x86_64") and platform.system() == "Linux"
)

EC_DAEMON_RPC_URL = "http://user:pass@localhost:12342"
FULCRUM_STATS_URL = "http://localhost:8081/stats"
BITCOIND_RPC_URL = "http://user:pass@0.0.0.0:18333"

ELECTRUM_ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "..")
ELECTRUMABC_COMMAND = os.path.join(ELECTRUM_ROOT, "electrum-abc")

DEFAULT_TIMEOUT = 10
DEFAULT_POLL_INTERVAL = 1

COINBASE_MATURITY = 100


def get_fulcrum_stat(json_path: str) -> Any:
    """Get fulcrum's stats, parse the answer and return a particular field defined
    by the json path.
    Return None in case of connection error or if the field is not found.
    """
    try:
        json_result = requests.get(FULCRUM_STATS_URL).json()
    except requests.exceptions.ConnectionError:
        return None

    jsonpath_expr = path_parse(json_path)
    expect_element = jsonpath_expr.find(json_result)

    if len(expect_element) > 0:
        return expect_element[0].value
    return None


def poll_for_answer(
    url: Any,
    json_req: Any,
    poll_interval: int = DEFAULT_POLL_INTERVAL,
    poll_timeout: int = DEFAULT_TIMEOUT,
    expected_answer: Optional[Any] = None,
) -> Any:
    """Poll an RPC method until timeout or an expected answer has been received"""
    start = current = time.time()

    def sleep_and_get_time():
        time.sleep(poll_interval)
        return time.time()

    while current < start + poll_timeout:
        try:
            resp = requests.post(url, json=json_req)
        except requests.exceptions.ConnectionError:
            current = sleep_and_get_time()
            continue

        if resp.status_code == 500:
            current = sleep_and_get_time()
            continue

        parsed = rpc_parse(resp.json())
        if not isinstance(parsed, rpc_Ok):
            raise RuntimeError(f"Unable to parse JSON-RPC: {parsed.message}")
        json_result = rpc_parse(resp.json()).result
        if expected_answer is None:
            return json_result

        # We expect a specific result, so check it and keep polling until we get it.
        path, answer = expected_answer
        jsonpath_expr = path_parse(path)
        expect_element = jsonpath_expr.find(json_result)
        if len(expect_element) > 0 and expect_element[0].value == answer:
            return json_result

        current = sleep_and_get_time()

    raise TimeoutError("Timed out waiting for an answer")


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

    # Let Fulcrum catch up with the indexing
    wait_until(lambda: get_fulcrum_stat("Controller.TxNum") == 102)

    return _bitcoind


# Creates a temp directory on disk for wallet storage
# Starts a daemon, creates and loads a wallet
def start_ec_daemon(datadir: str) -> None:
    """
    Creates a temp directory on disk for wallet storage
    Starts a daemon, creates and loads a wallet
    """
    default_wallet = os.path.join(datadir, "default_wallet")
    subprocess.run(
        [
            ELECTRUMABC_COMMAND,
            "--regtest",
            "-v",
            "-D",
            datadir,
            "-w",
            default_wallet,
            "daemon",
            "start",
        ],
        check=True,
    )
    result = poll_for_answer(EC_DAEMON_RPC_URL, request("version"))

    from ...version import PACKAGE_VERSION

    assert result == PACKAGE_VERSION, f"{result} != {PACKAGE_VERSION}"

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


def stop_ec_daemon(datadir) -> None:
    """Stops the daemon"""
    subprocess.run(
        [ELECTRUMABC_COMMAND, "--regtest", "-D", datadir, "daemon", "stop"], check=True
    )


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
def docker_compose_command() -> str:
    """Use the docker-compose command rather than `docker compose`. This is no longer
    the default since pytest-docker 2.0.0 was released, so we need to specify it.
    The docker version installed on CI seems to be too old to be compatible with the
    way pytest-docker calls the `docker compose` command.
    """
    return "docker-compose"


def make_tmp_electrum_data_dir() -> str:
    """Create a temporary directory with a regtest subdirectory, and copy the Electrum
    config file into it.
    The caller is responsible for deleting the temporary directory."""
    datadir = tempfile.mkdtemp()
    os.mkdir(os.path.join(datadir, "regtest"))
    shutil.copyfile(
        os.path.join(
            ELECTRUM_ROOT,
            "electrumabc",
            "tests",
            "regtest",
            "configs",
            "electrum-abc-config",
        ),
        os.path.join(datadir, "regtest", "config"),
    )
    return datadir


@pytest.fixture(scope="function")
def fulcrum_service(docker_services: Any) -> Generator[None, None, None]:
    """Makes sure all services (bitcoind, fulcrum and the electrum daemon) are up and
    running, make a temporary data dir for Electrum ABC, delete it at the end of the
    test session.
    """
    electrum_datadir = make_tmp_electrum_data_dir()
    bitcoind_rpc_connection()

    # Sanity check that fulcrum is running and responding
    assert get_fulcrum_stat("Controller.Chain") == "regtest"

    try:
        start_ec_daemon(electrum_datadir)
        yield
        stop_ec_daemon(electrum_datadir)
    finally:
        # Remove the data directory, ignore race conditions caused by tmp wallet files
        # created and deleted in WalletStorage._write while the daemon process is
        # stopping
        # See https://github.com/python/cpython/pull/14064
        with contextlib.suppress(FileNotFoundError):
            shutil.rmtree(electrum_datadir)


def wait_for_len(json_req, expected_len: int, timeout=DEFAULT_TIMEOUT):
    """Poll Electrum ABC with a RPC request until the result is the expected length.
    The RPC request must return a sequence (e.g. a list).
    Raise an AssertionError if the request does not have the expected length after the
    timeout.
    Return the result in case of success.
    """
    result = []

    def poll_and_check_len():
        nonlocal result
        result = poll_for_answer(EC_DAEMON_RPC_URL, json_req)
        return len(result) == expected_len

    wait_until(poll_and_check_len, timeout)
    return result


def wait_until(
    test_function: Callable[[], bool],
    timeout=DEFAULT_TIMEOUT,
    interval=DEFAULT_POLL_INTERVAL,
):
    """Run a test function in a loop until it returns True. Raise an AssertionError
    if it did not return True before the timeout is reached.
    """
    t0 = time.time()
    time_end = t0 + timeout
    success = False
    while not success and time.time() < time_end:
        success = test_function()
        time.sleep(interval)
    assert success, f"wait_until: predicate not True after {timeout} seconds"


def get_block_subsidy(blockheight) -> int:
    """Compute the expected coinbase amount in satoshis for a given block height,
    for an empty block (no tx fees)."""
    # See GetBlockSubsidy function in the node
    subsidy_halving_interval = 150
    initial_subsidy = 5_000_000_000
    halvings = blockheight // subsidy_halving_interval
    if halvings >= 64:
        return 0
    return initial_subsidy >> halvings
