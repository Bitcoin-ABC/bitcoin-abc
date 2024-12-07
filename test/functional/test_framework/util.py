# Copyright (c) 2014-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Helpful routines for regression testing."""

import enum
import inspect
import json
import logging
import os
import re
import socket
import time
import unittest
from base64 import b64encode
from decimal import ROUND_DOWN, Decimal
from functools import lru_cache
from subprocess import CalledProcessError
from typing import Callable, Dict, Optional

from . import coverage
from .authproxy import AuthServiceProxy, JSONRPCException

logger = logging.getLogger("TestFramework.utils")

# Assert functions
##################


def assert_approx(v, vexp, vspan=10):
    """Assert that `v` is within `vspan` of `vexp`"""
    if v < vexp - vspan:
        raise AssertionError(f"{v} < [{vexp - vspan}..{vexp + vspan}]")
    if v > vexp + vspan:
        raise AssertionError(f"{v} > [{vexp - vspan}..{vexp + vspan}]")


def assert_fee_amount(fee, tx_size, fee_per_kB, wiggleroom=2):
    """
    Assert the fee was in range

    wiggleroom defines an amount that the test expects the wallet to be off by
    when estimating fees.  This can be due to the dummy signature that is added
    during fee calculation, or due to the wallet funding transactions using the
    ceiling of the calculated fee.
    """
    target_fee = satoshi_round(tx_size * fee_per_kB / 1000)
    if fee < (tx_size - wiggleroom) * fee_per_kB / 1000:
        raise AssertionError(f"Fee of {fee} XEC too low! (Should be {target_fee} XEC)")
    if fee > (tx_size + wiggleroom) * fee_per_kB / 1000:
        raise AssertionError(f"Fee of {fee} XEC too high! (Should be {target_fee} XEC)")


def assert_equal(thing1, thing2, *args):
    if thing1 != thing2 or any(thing1 != arg for arg in args):
        raise AssertionError(
            f"not({' == '.join(str(arg) for arg in (thing1, thing2) + args)})"
        )


def assert_greater_than(thing1, thing2):
    if thing1 <= thing2:
        raise AssertionError(f"{thing1} <= {thing2}")


def assert_greater_than_or_equal(thing1, thing2):
    if thing1 < thing2:
        raise AssertionError(f"{thing1} < {thing2}")


def assert_raises(exc, fun, *args, **kwds):
    assert_raises_message(exc, None, fun, *args, **kwds)


def assert_raises_message(exc, message, fun, *args, **kwds):
    try:
        fun(*args, **kwds)
    except JSONRPCException:
        raise AssertionError("Use assert_raises_rpc_error() to test RPC failures")
    except exc as e:
        if message is not None and message not in e.error["message"]:
            raise AssertionError(
                "Expected substring not found in error message:\nsubstring:"
                f" '{message}'\nerror message: '{e.error['message']}'."
            )
    except Exception as e:
        raise AssertionError(f"Unexpected exception raised: {type(e).__name__}")
    else:
        raise AssertionError("No exception raised")


def assert_raises_process_error(
    returncode: int, output: str, fun: Callable, *args, **kwds
):
    """Execute a process and asserts the process return code and output.

    Calls function `fun` with arguments `args` and `kwds`. Catches a CalledProcessError
    and verifies that the return code and output are as expected. Throws AssertionError if
    no CalledProcessError was raised or if the return code and output are not as expected.

    Args:
        returncode: the process return code.
        output: [a substring of] the process output.
        fun: the function to call. This should execute a process.
        args*: positional arguments for the function.
        kwds**: named arguments for the function.
    """
    try:
        fun(*args, **kwds)
    except CalledProcessError as e:
        if returncode != e.returncode:
            raise AssertionError(f"Unexpected returncode {e.returncode}")
        if output not in e.output:
            raise AssertionError(f"Expected substring not found:{e.output}")
    else:
        raise AssertionError("No exception raised")


def assert_raises_rpc_error(
    code: Optional[int], message: Optional[str], fun: Callable, *args, **kwds
):
    """Run an RPC and verify that a specific JSONRPC exception code and message is raised.

    Calls function `fun` with arguments `args` and `kwds`. Catches a JSONRPCException
    and verifies that the error code and message are as expected. Throws AssertionError if
    no JSONRPCException was raised or if the error code/message are not as expected.

    Args:
        code: the error code returned by the RPC call (defined in src/rpc/protocol.h).
            Set to None if checking the error code is not required.
        message: [a substring of] the error string returned by the RPC call.
            Set to None if checking the error string is not required.
        fun: the function to call. This should be the name of an RPC.
        args*: positional arguments for the function.
        kwds**: named arguments for the function.
    """
    assert try_rpc(code, message, fun, *args, **kwds), "No exception raised"


def try_rpc(code, message, fun, *args, **kwds):
    """Tries to run an rpc command.

    Test against error code and message if the rpc fails.
    Returns whether a JSONRPCException was raised."""
    try:
        fun(*args, **kwds)
    except JSONRPCException as e:
        # JSONRPCException was thrown as expected. Check the code and message
        # values are correct.
        if (code is not None) and (code != e.error["code"]):
            raise AssertionError(f"Unexpected JSONRPC error code {e.error['code']}")
        if (message is not None) and (message not in e.error["message"]):
            raise AssertionError(
                "Expected substring not found in error message:\nsubstring:"
                f" '{message}'\nerror message: '{e.error['message']}'."
            )
        return True
    except Exception as e:
        raise AssertionError(f"Unexpected exception raised: {type(e).__name__}")
    else:
        return False


def assert_is_hex_string(string):
    try:
        int(string, 16)
    except Exception as e:
        raise AssertionError(
            f"Couldn't interpret {string!r} as hexadecimal; raised: {e}"
        )


def assert_is_hash_string(string, length=64):
    if not isinstance(string, str):
        raise AssertionError(f"Expected a string, got type {type(string)!r}")
    elif length and len(string) != length:
        raise AssertionError(f"String of length {length} expected; got {len(string)}")
    elif not re.match("[abcdef0-9]+$", string):
        raise AssertionError(
            f"String {string!r} contains invalid characters for a hash."
        )


def assert_array_result(object_array, to_match, expected, should_not_find=False):
    """
    Pass in array of JSON objects, a dictionary with key/value pairs
    to match against, and another dictionary with expected key/value
    pairs.
    If the should_not_find flag is true, to_match should not be found
    in object_array
    """
    if should_not_find:
        assert_equal(expected, {})
    num_matched = 0
    for item in object_array:
        all_match = True
        for key, value in to_match.items():
            if item[key] != value:
                all_match = False
        if not all_match:
            continue
        elif should_not_find:
            num_matched = num_matched + 1
        for key, value in expected.items():
            if item[key] != value:
                raise AssertionError(f"{item} : expected {key}={value}")
            num_matched = num_matched + 1
    if num_matched == 0 and not should_not_find:
        raise AssertionError(f"No objects matched {to_match}")
    if num_matched > 0 and should_not_find:
        raise AssertionError(f"Objects were found {to_match}")


# Utility functions
###################


def check_json_precision():
    """Make sure json library being used does not lose precision converting XEC
    values"""
    n = Decimal("20000000.00000003")
    satoshis = int(json.loads(json.dumps(float(n))) * 1.0e8)
    if satoshis != 2000000000000003:
        raise RuntimeError("JSON encode/decode loses precision")


def EncodeDecimal(o):
    if isinstance(o, Decimal):
        return str(o)
    raise TypeError(f"{o!r} is not JSON serializable")


def count_bytes(hex_string):
    return len(bytearray.fromhex(hex_string))


def str_to_b64str(string):
    return b64encode(string.encode("utf-8")).decode("ascii")


def hex_to_be_bytes(hex_string: str) -> bytes:
    return bytes.fromhex(hex_string)[::-1]


def satoshi_round(amount):
    return Decimal(amount).quantize(Decimal("0.01"), rounding=ROUND_DOWN)


def iter_chunks(lst: list, n: int):
    """Yield successive n-sized chunks from lst."""
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


def wait_until_helper(
    predicate,
    *,
    attempts=float("inf"),
    timeout=float("inf"),
    lock=None,
    timeout_factor=1.0,
):
    """Sleep until the predicate resolves to be True.

    Warning: Note that this method is not recommended to be used in tests as it is
    not aware of the context of the test framework. Using the `wait_until()` members
    from `BitcoinTestFramework` or `P2PInterface` class ensures the timeout is
    properly scaled. Furthermore, `wait_until()` from `P2PInterface` class in
    `p2p.py` has a preset lock.
    """
    if attempts == float("inf") and timeout == float("inf"):
        timeout = 60
    timeout = timeout * timeout_factor
    attempt = 0
    time_end = time.time() + timeout

    while attempt < attempts and time.time() < time_end:
        if lock:
            with lock:
                if predicate():
                    return
        else:
            if predicate():
                return
        attempt += 1
        time.sleep(0.05)

    # Print the cause of the timeout
    predicate_source = f"''''\n{inspect.getsource(predicate)}'''"
    logger.error(f"wait_until() failed. Predicate: {predicate_source}")
    if attempt >= attempts:
        raise AssertionError(
            f"Predicate {predicate_source} not true after {attempts} attempts"
        )
    elif time.time() >= time_end:
        raise AssertionError(
            f"Predicate {predicate_source} not true after {timeout} seconds"
        )
    raise RuntimeError("Unreachable")


# RPC/P2P connection constants and functions
############################################


class PortName(enum.Enum):
    P2P = 0
    RPC = 1
    CHRONIK = 2
    CHRONIKELECTRUM = 3


# The maximum number of nodes a single test can spawn
MAX_NODES = 64
# Don't assign rpc or p2p ports lower than this (for example: 18333 is the
# default testnet port)
PORT_MIN = int(os.getenv("TEST_RUNNER_PORT_MIN", default=20000))
# The number of ports to "reserve" for p2p and rpc, each
PORT_RANGE = 3000
# The number of times we increment the port counters and test it again before
# giving up.
MAX_PORT_RETRY = 5
PORT_START_MAP: Dict[PortName, int] = {
    PortName.P2P: 0,
    PortName.RPC: PORT_RANGE,
    PortName.CHRONIK: PORT_RANGE * 2,
    PortName.CHRONIKELECTRUM: PORT_RANGE * 3,
}

# Globals used for incrementing ports. Initially uninitialized because they
# depend on PortSeed.n.
LAST_USED_PORT_MAP: Dict[PortName, int] = {}


class PortSeed:
    # Must be initialized with a unique integer for each process
    n = None


def get_rpc_proxy(url, node_number, *, timeout=None, coveragedir=None):
    """
    Args:
        url (str): URL of the RPC server to call
        node_number (int): the node number (or id) that this calls to

    Kwargs:
        timeout (int): HTTP timeout in seconds
        coveragedir (str): Directory

    Returns:
        AuthServiceProxy. convenience object for making RPC calls.

    """
    proxy_kwargs = {}
    if timeout is not None:
        proxy_kwargs["timeout"] = int(timeout)

    proxy = AuthServiceProxy(url, **proxy_kwargs)
    proxy.url = url  # store URL on proxy for info

    coverage_logfile = (
        coverage.get_filename(coveragedir, node_number) if coveragedir else None
    )

    return coverage.AuthServiceProxyWrapper(proxy, coverage_logfile)


# We initialize the port counters at runtime, because at import time PortSeed.n
# will not yet be defined. It is defined based on a command line option
# in the BitcoinTestFramework class __init__
def initialize_port(port_name: PortName):
    global LAST_USED_PORT_MAP
    assert PortSeed.n is not None
    LAST_USED_PORT_MAP[port_name] = (
        PORT_MIN
        + PORT_START_MAP[port_name]
        + (MAX_NODES * PortSeed.n) % (PORT_RANGE - 1 - MAX_NODES)
    )


def is_port_available(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(("127.0.0.1", port))
            return True
        except OSError:
            return False


# The LRU cache ensures that for a given type and peer / node index, the
# functions always return the same port, and that it is tested only the
# first time. The parameter `n` is not unused, it is the key in the cache
# dictionary.
@lru_cache(maxsize=None)
def unique_port(port_name: PortName, n: int) -> int:
    global LAST_USED_PORT_MAP
    if port_name not in LAST_USED_PORT_MAP:
        initialize_port(port_name)

    for _ in range(MAX_PORT_RETRY):
        LAST_USED_PORT_MAP[port_name] += 1
        if is_port_available(LAST_USED_PORT_MAP[port_name]):
            return LAST_USED_PORT_MAP[port_name]

    raise RuntimeError(
        f"Could not find available {port_name} port after {MAX_PORT_RETRY} attempts."
    )


def p2p_port(n: int) -> int:
    return unique_port(PortName.P2P, n)


def rpc_port(n: int) -> int:
    return unique_port(PortName.RPC, n)


def chronik_port(n: int) -> int:
    return unique_port(PortName.CHRONIK, n)


def chronikelectrum_port(n: int) -> int:
    return unique_port(PortName.CHRONIKELECTRUM, n)


def rpc_url(datadir, chain, host, port):
    rpc_u, rpc_p = get_auth_cookie(datadir, chain)
    if host is None:
        host = "127.0.0.1"
    return f"http://{rpc_u}:{rpc_p}@{host}:{int(port)}"


# Node functions
################


def initialize_datadir(dirname, n, chain, disable_autoconnect=True):
    datadir = get_datadir_path(dirname, n)
    if not os.path.isdir(datadir):
        os.makedirs(datadir)
    write_config(
        os.path.join(datadir, "bitcoin.conf"),
        n=n,
        chain=chain,
        disable_autoconnect=disable_autoconnect,
    )
    os.makedirs(os.path.join(datadir, "stderr"), exist_ok=True)
    os.makedirs(os.path.join(datadir, "stdout"), exist_ok=True)
    return datadir


def write_config(config_path, *, n, chain, extra_config="", disable_autoconnect=True):
    # Translate chain subdirectory name to config name
    if chain == "testnet3":
        chain_name_conf_arg = "testnet"
        chain_name_conf_section = "test"
    else:
        chain_name_conf_arg = chain
        chain_name_conf_section = chain
    with open(config_path, "w", encoding="utf8") as f:
        if chain_name_conf_arg:
            f.write(f"{chain_name_conf_arg}=1\n")
        if chain_name_conf_section:
            f.write(f"[{chain_name_conf_section}]\n")
        f.write(f"port={p2p_port(n)}\n")
        f.write(f"rpcport={rpc_port(n)}\n")
        f.write(f"chronikbind=127.0.0.1:{chronik_port(n)}\n")
        f.write(f"chronikelectrumbind=127.0.0.1:{chronikelectrum_port(n)}\n")
        # Disable server-side timeouts to avoid intermittent issues
        f.write("rpcservertimeout=99000\n")
        # Chronik by default is tuned for initial sync, tune it down for regtest
        f.write("chroniktxnumcachebucketsize=100\n")
        # FIXME fix the doc issues and turn this flag on to prevent new doc bugs
        f.write("rpcdoccheck=0\n")
        f.write("fallbackfee=200\n")
        f.write("server=1\n")
        f.write("keypool=1\n")
        f.write("discover=0\n")
        f.write("dnsseed=0\n")
        f.write("enablertt=0\n")
        f.write("fixedseeds=0\n")
        f.write("listenonion=0\n")
        f.write("printtoconsole=0\n")
        f.write("upnp=0\n")
        f.write("natpmp=0\n")
        f.write("usecashaddr=1\n")
        # Increase peertimeout to avoid disconnects while using mocktime.
        # peertimeout is measured in mock time, so setting it large enough to
        # cover any duration in mock time is sufficient. It can be overridden
        # in tests.
        f.write("peertimeout=999999999\n")
        f.write("shrinkdebugfile=0\n")
        if disable_autoconnect:
            f.write("connect=0\n")
        f.write(extra_config)


def get_datadir_path(dirname, n):
    return os.path.join(dirname, f"node{n}")


def append_config(datadir, options):
    with open(os.path.join(datadir, "bitcoin.conf"), "a", encoding="utf8") as f:
        for option in options:
            f.write(f"{option}\n")


def get_auth_cookie(datadir, chain):
    user = None
    password = None
    if os.path.isfile(os.path.join(datadir, "bitcoin.conf")):
        with open(os.path.join(datadir, "bitcoin.conf"), "r", encoding="utf8") as f:
            for line in f:
                if line.startswith("rpcuser="):
                    assert user is None  # Ensure that there is only one rpcuser line
                    user = line.split("=")[1].strip("\n")
                if line.startswith("rpcpassword="):
                    assert (
                        password is None
                    )  # Ensure that there is only one rpcpassword line
                    password = line.split("=")[1].strip("\n")
    try:
        with open(os.path.join(datadir, chain, ".cookie"), "r", encoding="ascii") as f:
            userpass = f.read()
            split_userpass = userpass.split(":")
            user = split_userpass[0]
            password = split_userpass[1]
    except OSError:
        pass
    if user is None or password is None:
        raise ValueError("No RPC credentials")
    return user, password


# If a cookie file exists in the given datadir, delete it.
def delete_cookie_file(datadir, chain):
    if os.path.isfile(os.path.join(datadir, chain, ".cookie")):
        logger.debug("Deleting leftover cookie file")
        os.remove(os.path.join(datadir, chain, ".cookie"))


def set_node_times(nodes, t):
    for node in nodes:
        node.setmocktime(t)


def check_node_connections(*, node, num_in, num_out):
    info = node.getnetworkinfo()
    assert_equal(info["connections_in"], num_in)
    assert_equal(info["connections_out"], num_out)


def fill_mempool(test_framework, node, miniwallet):
    """Fill mempool until eviction.
    Allows for simpler testing of scenarios with floating mempoolminfee > minrelay
    Requires -acceptnonstdtxn=1 and -maxmempool=5.
    It will not ensure mempools become synced as it is based on a single node
    and assumes -minrelaytxfee is 1 sat/vbyte.
    """
    test_framework.log.info(
        "Fill the mempool until eviction is triggered and the mempoolminfee rises"
    )
    txouts = gen_return_txouts()
    relayfee = node.getnetworkinfo()["relayfee"]

    assert_equal(relayfee, Decimal("10"))

    tx_batch_size = 1
    num_of_batches = 75
    # Generate UTXOs to flood the mempool
    # 1 to create a tx initially that will be evicted from the mempool later
    # 75 transactions each with a fee rate much higher than the previous one
    test_framework.generate(miniwallet, 1 + (num_of_batches * tx_batch_size))

    # Mine 99 blocks so that the UTXOs are allowed to be spent
    test_framework.generate(node, 100 - 1)

    test_framework.log.debug("Create a mempool tx that will be evicted")
    tx_to_be_evicted_id = miniwallet.send_self_transfer(
        from_node=node, fee_rate=relayfee
    )["txid"]

    # Increase the tx fee rate to give the subsequent transactions a higher
    # priority in the mempool. The tx has an approx. vsize of 65k, i.e.
    # multiplying the previous fee rate (in sats/kvB) by 130 should result
    # in a fee that corresponds to 2x of that fee rate
    base_fee = relayfee * 130

    test_framework.log.debug("Fill up the mempool with txs with higher fee rate")
    with node.assert_debug_log(["rolling minimum fee bumped"]):
        for batch_of_txid in range(num_of_batches):
            fee = (batch_of_txid + 1) * base_fee
            create_lots_of_big_transactions(
                miniwallet, node, fee, tx_batch_size, txouts
            )

    test_framework.log.debug("The tx should be evicted by now")
    # The number of transactions created should be greater than the ones
    # present in the mempool
    assert_greater_than(tx_batch_size * num_of_batches, len(node.getrawmempool()))
    # Initial tx created should not be present in the mempool anymore as it
    # had a lower fee rate
    assert tx_to_be_evicted_id not in node.getrawmempool()

    test_framework.log.debug("Check that mempoolminfee is larger than minrelaytxfee")
    assert_equal(node.getmempoolinfo()["minrelaytxfee"], Decimal("10.00"))
    assert_greater_than(node.getmempoolinfo()["mempoolminfee"], Decimal("10.00"))


# Transaction/Block functions
#############################


def find_output(node, txid, amount, *, blockhash=None):
    """
    Return index to output of txid with value amount
    Raises exception if there is none.
    """
    txdata = node.getrawtransaction(txid, 1, blockhash)
    for i in range(len(txdata["vout"])):
        if txdata["vout"][i]["value"] == amount:
            return i
    raise RuntimeError(f"find_output txid {txid} : {amount} not found")


# Create large OP_RETURN txouts that can be appended to a transaction
# to make it large (helper for constructing large transactions).


def gen_return_txouts():
    # Some pre-processing to create a bunch of OP_RETURN txouts to insert into transactions we create
    # So we have big transactions (and therefore can't fit very many into each block)
    # create one script_pubkey
    script_pubkey = "6a4d0200"  # OP_RETURN OP_PUSH2 512 bytes
    for _ in range(512):
        script_pubkey = f"{script_pubkey}01"
    # concatenate 128 txouts of above script_pubkey which we'll insert before
    # the txout for change
    txouts = []
    from .messages import CTxOut

    txout = CTxOut()
    txout.nValue = 0
    txout.scriptPubKey = bytes.fromhex(script_pubkey)
    for _ in range(128):
        txouts.append(txout)
    return txouts


# Create a spend of each passed-in utxo, splicing in "txouts" to each raw
# transaction to make it large.  See gen_return_txouts() above.
def create_lots_of_big_transactions(
    mini_wallet, node, fee, tx_batch_size, txouts, utxos=None
):
    from .messages import XEC

    fee_sats = int(fee * XEC)
    txids = []
    use_internal_utxos = utxos is None
    for _ in range(tx_batch_size):
        tx = mini_wallet.create_self_transfer(
            utxo_to_spend=None if use_internal_utxos else utxos.pop(),
            fee_rate=0,
        )["tx"]
        tx.vout[0].nValue -= fee_sats
        tx.vout.extend(txouts)
        res = node.testmempoolaccept([tx.serialize().hex()])[0]
        assert_equal(res["fees"]["base"], fee)
        txids.append(node.sendrawtransaction(tx.serialize().hex()))
    return txids


def find_vout_for_address(node, txid, addr):
    """
    Locate the vout index of the given transaction sending to the
    given address. Raises runtime error exception if not found.
    """
    tx = node.getrawtransaction(txid, True)
    for i in range(len(tx["vout"])):
        if any(addr == a for a in tx["vout"][i]["scriptPubKey"]["addresses"]):
            return i
    raise RuntimeError(f"Vout not found for address: txid={txid}, addr={addr}")


def modinv(a, n):
    """Compute the modular inverse of a modulo n using the extended Euclidean
    Algorithm. See https://en.wikipedia.org/wiki/Extended_Euclidean_algorithm#Modular_integers.
    """
    # TODO: Change to pow(a, -1, n) available in Python 3.8
    t1, t2 = 0, 1
    r1, r2 = n, a
    while r2 != 0:
        q = r1 // r2
        t1, t2 = t2, t1 - q * t2
        r1, r2 = r2, r1 - q * r2
    if r1 > 1:
        return None
    if t1 < 0:
        t1 += n
    return t1


def uint256_hex(hash_int: int) -> str:
    return f"{hash_int:0{64}x}"


def get_cli_version(framework, node):
    """Use bitcoin-cli to get the version"""
    version = node.cli().send_cli("-version")
    version = version.splitlines()[0]
    preamble = f"{framework.config['environment']['PACKAGE_NAME']} RPC client version "
    return version[len(preamble) :]


def chronik_sub_to_blocks(ws, node, *, is_unsub=False) -> None:
    """Subscribe to block events and make sure the subscription is active before returning"""
    subscribe_log = "unsubscribe from" if is_unsub else "subscribe to"
    with node.assert_debug_log([f"WS {subscribe_log} blocks"]):
        ws.sub_to_blocks(is_unsub=is_unsub)


def chronik_sub_script(
    ws, node, script_type: str, payload: bytes, *, is_unsub=False
) -> None:
    """Subscribe to script events and make sure the subscription is active before returning"""
    subscribe_log = "unsubscribe from" if is_unsub else "subscribe to"
    with node.assert_debug_log([f"WS {subscribe_log} {script_type}({payload.hex()})"]):
        ws.sub_script(script_type, payload, is_unsub=is_unsub)


def chronik_sub_token_id(ws, node, token_id: str, *, is_unsub=False) -> None:
    """Subscribe to token events and make sure the subscription is active before returning"""
    subscribe_log = "unsubscribe from" if is_unsub else "subscribe to"
    with node.assert_debug_log([f"WS {subscribe_log} token ID {token_id}"]):
        ws.sub_token_id(token_id, is_unsub=is_unsub)


def chronik_sub_lokad_id(ws, node, lokad_id: bytes, *, is_unsub=False) -> None:
    """Subscribe to LOKAD ID events and make sure the subscription is active before returning"""
    subscribe_log = "unsubscribe from" if is_unsub else "subscribe to"
    with node.assert_debug_log([f"WS {subscribe_log} LOKAD ID {lokad_id.hex()}"]):
        ws.sub_lokad_id(lokad_id, is_unsub=is_unsub)


def chronik_sub_plugin(
    ws, node, plugin_name: str, group: bytes, *, is_unsub=False
) -> None:
    """Subscribe to plugin events and make sure the subscription is active before returning"""
    subscribe_log = "unsubscribe from" if is_unsub else "subscribe to"
    with node.assert_debug_log(
        [f"WS {subscribe_log} plugin {plugin_name}, group {group.hex()}"]
    ):
        ws.sub_plugin(plugin_name, group, is_unsub=is_unsub)


class TestFrameworkUtil(unittest.TestCase):
    def test_modinv(self):
        test_vectors = [
            [7, 11],
            [11, 29],
            [90, 13],
            [1891, 3797],
            [6003722857, 77695236973],
        ]

        for a, n in test_vectors:
            self.assertEqual(modinv(a, n), pow(a, n - 2, n))
