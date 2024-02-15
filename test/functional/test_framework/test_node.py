# Copyright (c) 2017-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Class for bitcoind node under test"""

import collections
import contextlib
import decimal
import errno
import http.client
import json
import logging
import os
import re
import shlex
import subprocess
import sys
import tempfile
import time
import urllib.parse
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

from .address import ADDRESS_ECREG_UNSPENDABLE
from .authproxy import JSONRPCException
from .descriptors import descsum_create
from .messages import XEC, CTransaction, FromHex
from .p2p import P2P_SUBVERSION
from .util import (
    EncodeDecimal,
    append_config,
    assert_equal,
    delete_cookie_file,
    get_auth_cookie,
    get_rpc_proxy,
    p2p_port,
    rpc_url,
    wait_until_helper,
)

BITCOIND_PROC_WAIT_TIMEOUT = 60


class FailedToStartError(Exception):
    """Raised when a node fails to start correctly."""


class ErrorMatch(Enum):
    FULL_TEXT = 1
    FULL_REGEX = 2
    PARTIAL_REGEX = 3


class TestNode:
    """A class for representing a bitcoind node under test.

    This class contains:

    - state about the node (whether it's running, etc)
    - a Python subprocess.Popen object representing the running process
    - an RPC connection to the node
    - one or more P2P connections to the node

    To make things easier for the test writer, any unrecognised messages will
    be dispatched to the RPC connection."""

    def __init__(
        self,
        i,
        datadir,
        *,
        chain,
        host,
        rpc_port,
        p2p_port,
        chronik_port,
        timewait,
        timeout_factor,
        bitcoind,
        bitcoin_cli,
        coverage_dir,
        cwd,
        extra_conf=None,
        extra_args=None,
        use_cli=False,
        emulator=None,
        start_perf=False,
        use_valgrind=False,
        descriptors=False,
    ):
        """
        Kwargs:
            start_perf (bool): If True, begin profiling the node with `perf` as soon as
                the node starts.
        """

        self.index = i
        self.p2p_conn_index = 1
        self.datadir = datadir
        self.bitcoinconf = os.path.join(self.datadir, "bitcoin.conf")
        self.stdout_dir = os.path.join(self.datadir, "stdout")
        self.stderr_dir = os.path.join(self.datadir, "stderr")
        self.chain = chain
        self.host = host
        self.rpc_port = rpc_port
        self.p2p_port = p2p_port
        self.chronik_port = chronik_port
        self.name = f"testnode-{i}"
        self.rpc_timeout = timewait
        self.binary = bitcoind
        if not os.path.isfile(self.binary):
            raise FileNotFoundError(
                f"Binary '{self.binary}' could not be found.\nTry setting it"
                f" manually:\n\tBITCOIND=<path/to/bitcoind> {sys.argv[0]}"
            )
        self.coverage_dir = coverage_dir
        self.cwd = cwd
        self.descriptors = descriptors
        if extra_conf is not None:
            append_config(datadir, extra_conf)
        # Most callers will just need to add extra args to the default list
        # below.
        # For those callers that need more flexibility, they can access the
        # default args using the provided facilities.
        # Note that common args are set in the config file (see
        # initialize_datadir)
        self.extra_args = extra_args
        # Configuration for logging is set as command-line args rather than in the bitcoin.conf file.
        # This means that starting a bitcoind using the temp dir to debug a failed test won't
        # spam debug.log.
        self.default_args = [
            "-datadir=" + self.datadir,
            "-logtimemicros",
            "-logthreadnames",
            "-logsourcelocations",
            "-debug",
            "-debugexclude=libevent",
            "-debugexclude=leveldb",
            "-uacomment=" + self.name,
        ]

        if use_valgrind:
            default_suppressions_file = os.path.join(
                os.path.dirname(os.path.realpath(__file__)),
                "..",
                "..",
                "..",
                "contrib",
                "valgrind.supp",
            )
            suppressions_file = os.getenv(
                "VALGRIND_SUPPRESSIONS_FILE", default_suppressions_file
            )
            self.binary = "valgrind"
            self.bitcoind_args = [bitcoind] + self.default_args
            self.default_args = [
                f"--suppressions={suppressions_file}",
                "--gen-suppressions=all",
                "--exit-on-first-error=yes",
                "--error-exitcode=1",
                "--quiet",
            ] + self.bitcoind_args

        if emulator is not None:
            if not os.path.isfile(emulator):
                raise FileNotFoundError(f"Emulator '{emulator}' could not be found.")
        self.emulator = emulator

        if use_cli and not os.path.isfile(bitcoin_cli):
            raise FileNotFoundError(
                f"Binary '{bitcoin_cli}' could not be found.\nTry setting it"
                f" manually:\n\tBITCOINCLI=<path/to/bitcoin-cli> {sys.argv[0]}"
            )
        self.cli = TestNodeCLI(bitcoin_cli, self.datadir, self.emulator)
        self.use_cli = use_cli
        self.start_perf = start_perf

        self.running = False
        self.process = None
        self.rpc_connected = False
        self.rpc = None
        self.url = None
        self.relay_fee_cache = None
        self.log = logging.getLogger(f"TestFramework.node{i}")
        # Whether to kill the node when this object goes away
        self.cleanup_on_exit = True
        # Cache perf subprocesses here by their data output filename.
        self.perf_subprocesses = {}
        self.p2ps = []
        self.timeout_factor = timeout_factor

    AddressKeyPair = collections.namedtuple("AddressKeyPair", ["address", "key"])
    PRIV_KEYS = [
        # address , privkey
        AddressKeyPair(
            "mjTkW3DjgyZck4KbiRusZsqTgaYTxdSz6z",
            "cVpF924EspNh8KjYsfhgY96mmxvT6DgdWiTYMtMjuM74hJaU5psW",
        ),
        AddressKeyPair(
            "msX6jQXvxiNhx3Q62PKeLPrhrqZQdSimTg",
            "cUxsWyKyZ9MAQTaAhUQWJmBbSvHMwSmuv59KgxQV7oZQU3PXN3KE",
        ),
        AddressKeyPair(
            "mnonCMyH9TmAsSj3M59DsbH8H63U3RKoFP",
            "cTrh7dkEAeJd6b3MRX9bZK8eRmNqVCMH3LSUkE3dSFDyzjU38QxK",
        ),
        AddressKeyPair(
            "mqJupas8Dt2uestQDvV2NH3RU8uZh2dqQR",
            "cVuKKa7gbehEQvVq717hYcbE9Dqmq7KEBKqWgWrYBa2CKKrhtRim",
        ),
        AddressKeyPair(
            "msYac7Rvd5ywm6pEmkjyxhbCDKqWsVeYws",
            "cQDCBuKcjanpXDpCqacNSjYfxeQj8G6CAtH1Dsk3cXyqLNC4RPuh",
        ),
        AddressKeyPair(
            "n2rnuUnwLgXqf9kk2kjvVm8R5BZK1yxQBi",
            "cQakmfPSLSqKHyMFGwAqKHgWUiofJCagVGhiB4KCainaeCSxeyYq",
        ),
        AddressKeyPair(
            "myzuPxRwsf3vvGzEuzPfK9Nf2RfwauwYe6",
            "cQMpDLJwA8DBe9NcQbdoSb1BhmFxVjWD5gRyrLZCtpuF9Zi3a9RK",
        ),
        AddressKeyPair(
            "mumwTaMtbxEPUswmLBBN3vM9oGRtGBrys8",
            "cSXmRKXVcoouhNNVpcNKFfxsTsToY5pvB9DVsFksF1ENunTzRKsy",
        ),
        AddressKeyPair(
            "mpV7aGShMkJCZgbW7F6iZgrvuPHjZjH9qg",
            "cSoXt6tm3pqy43UMabY6eUTmR3eSUYFtB2iNQDGgb3VUnRsQys2k",
        ),
        AddressKeyPair(
            "mq4fBNdckGtvY2mijd9am7DRsbRB4KjUkf",
            "cN55daf1HotwBAgAKWVgDcoppmUNDtQSfb7XLutTLeAgVc3u8hik",
        ),
        AddressKeyPair(
            "mpFAHDjX7KregM3rVotdXzQmkbwtbQEnZ6",
            "cT7qK7g1wkYEMvKowd2ZrX1E5f6JQ7TM246UfqbCiyF7kZhorpX3",
        ),
        AddressKeyPair(
            "mzRe8QZMfGi58KyWCse2exxEFry2sfF2Y7",
            "cPiRWE8KMjTRxH1MWkPerhfoHFn5iHPWVK5aPqjW8NxmdwenFinJ",
        ),
    ]

    def get_deterministic_priv_key(self):
        """Return a deterministic priv key in base58, that only depends on the node's index"""
        num_keys = len(self.PRIV_KEYS)
        assert self.index < num_keys, (
            f"Only {num_keys} keys are defined, please extend TestNode.PRIV_KEYS if "
            "more are needed."
        )
        return self.PRIV_KEYS[self.index]

    def _node_msg(self, msg: str) -> str:
        """Return a modified msg that identifies this node by its index as a debugging aid."""
        return f"[node {self.index}] {msg}"

    def _raise_assertion_error(self, msg: str):
        """Raise an AssertionError with msg modified to identify this node."""
        raise AssertionError(self._node_msg(msg))

    def __del__(self):
        # Ensure that we don't leave any bitcoind processes lying around after
        # the test ends
        if self.process and self.cleanup_on_exit:
            # Should only happen on test failure
            # Avoid using logger, as that may have already been shutdown when
            # this destructor is called.
            print(self._node_msg("Cleaning up leftover process"))
            self.process.kill()

    def __getattr__(self, name):
        """Dispatches any unrecognised messages to the RPC connection or a CLI instance."""
        if self.use_cli:
            return getattr(RPCOverloadWrapper(self.cli, True, self.descriptors), name)
        else:
            assert self.rpc is not None, self._node_msg("Error: RPC not initialized")
            assert self.rpc_connected, self._node_msg("Error: No RPC connection")
            return getattr(
                RPCOverloadWrapper(self.rpc, descriptors=self.descriptors), name
            )

    def clear_default_args(self):
        self.default_args.clear()

    def extend_default_args(self, args):
        self.default_args.extend(args)

    def remove_default_args(self, args):
        for rm_arg in args:
            # Remove all occurrences of rm_arg in self.default_args:
            #  - if the arg is a flag (-flag), then the names must match
            #  - if the arg is a value (-key=value) then the name must starts
            #    with "-key=" (the '"' char is to avoid removing "-key_suffix"
            #    arg is "-key" is the argument to remove).
            self.default_args = [
                def_arg
                for def_arg in self.default_args
                if rm_arg != def_arg and not def_arg.startswith(rm_arg + "=")
            ]

    def start(self, extra_args=None, *, cwd=None, stdout=None, stderr=None, **kwargs):
        """Start the node."""
        if extra_args is None:
            extra_args = self.extra_args

        # Add a new stdout and stderr file each time bitcoind is started
        if stderr is None:
            stderr = tempfile.NamedTemporaryFile(dir=self.stderr_dir, delete=False)
        if stdout is None:
            stdout = tempfile.NamedTemporaryFile(dir=self.stdout_dir, delete=False)
        self.stderr = stderr
        self.stdout = stdout

        if cwd is None:
            cwd = self.cwd

        # Delete any existing cookie file -- if such a file exists (eg due to
        # unclean shutdown), it will get overwritten anyway by bitcoind, and
        # potentially interfere with our attempt to authenticate
        delete_cookie_file(self.datadir, self.chain)

        # add environment variable LIBC_FATAL_STDERR_=1 so that libc errors are
        # written to stderr and not the terminal
        subp_env = dict(os.environ, LIBC_FATAL_STDERR_="1")

        p_args = [self.binary] + self.default_args + extra_args
        if self.emulator is not None:
            p_args = [self.emulator] + p_args
        self.process = subprocess.Popen(
            p_args, env=subp_env, stdout=stdout, stderr=stderr, cwd=cwd, **kwargs
        )

        self.running = True
        self.log.debug("bitcoind started, waiting for RPC to come up")

        if self.start_perf:
            self._start_perf()

    def wait_for_rpc_connection(self):
        """Sets up an RPC connection to the bitcoind process. Returns False if unable to connect."""
        # Poll at a rate of four times per second
        poll_per_s = 4
        # Double the range to allow for one retry in case of ETIMEDOUT
        for _ in range(2 * poll_per_s * self.rpc_timeout):
            if self.process.poll() is not None:
                raise FailedToStartError(
                    self._node_msg(
                        f"bitcoind exited with status {self.process.returncode} during "
                        "initialization"
                    )
                )
            try:
                rpc = get_rpc_proxy(
                    rpc_url(self.datadir, self.chain, self.host, self.rpc_port),
                    self.index,
                    timeout=self.rpc_timeout,
                    coveragedir=self.coverage_dir,
                )
                rpc.getblockcount()
                # If the call to getblockcount() succeeds then the RPC
                # connection is up
                wait_until_helper(
                    lambda: rpc.getmempoolinfo()["loaded"],
                    timeout_factor=self.timeout_factor,
                )
                # Wait for the node to finish reindex, block import, and
                # loading the mempool. Usually importing happens fast or
                # even "immediate" when the node is started. However, there
                # is no guarantee and sometimes ThreadImport might finish
                # later. This is going to cause intermittent test failures,
                # because generally the tests assume the node is fully
                # ready after being started.
                #
                # For example, the node will reject block messages from p2p
                # when it is still importing with the error "Unexpected
                # block message received"
                #
                # The wait is done here to make tests as robust as possible
                # and prevent racy tests and intermittent failures as much
                # as possible. Some tests might not need this, but the
                # overhead is trivial, and the added guarantees are worth
                # the minimal performance cost.

                self.log.debug("RPC successfully started")
                if self.use_cli:
                    return
                self.rpc = rpc
                self.rpc_connected = True
                self.url = self.rpc.url
                return
            except JSONRPCException as e:  # Initialization phase
                # -28 RPC in warmup
                # -342 Service unavailable, RPC server started but is shutting down due to error
                if e.error["code"] != -28 and e.error["code"] != -342:
                    raise  # unknown JSON RPC exception
            except ConnectionResetError:
                # This might happen when the RPC server is in warmup, but shut down before the call to getblockcount
                # succeeds. Try again to properly raise the FailedToStartError
                pass
            except OSError as e:
                if e.errno == errno.ETIMEDOUT:
                    # Treat identical to ConnectionResetError
                    pass
                elif e.errno == errno.ECONNREFUSED:
                    # Port not yet open?
                    pass
                else:
                    # unknown OS error
                    raise
            except ValueError as e:
                # cookie file not found and no rpcuser or rpcpassword;
                # bitcoind is still starting
                if "No RPC credentials" not in str(e):
                    raise
            time.sleep(1.0 / poll_per_s)
        self._raise_assertion_error(
            f"Unable to connect to bitcoind after {self.rpc_timeout}s"
        )

    def wait_for_cookie_credentials(self):
        """Ensures auth cookie credentials can be read, e.g. for testing CLI
        with -rpcwait before RPC connection is up."""
        self.log.debug("Waiting for cookie credentials")
        # Poll at a rate of four times per second.
        poll_per_s = 4
        for _ in range(poll_per_s * self.rpc_timeout):
            try:
                get_auth_cookie(self.datadir, self.chain)
                self.log.debug("Cookie credentials successfully retrieved")
                return
            except ValueError:
                # cookie file not found and no rpcuser or rpcpassword;
                # bitcoind is still starting so we continue polling until
                # RPC credentials are retrieved
                pass
            time.sleep(1.0 / poll_per_s)
        self._raise_assertion_error(
            f"Unable to retrieve cookie credentials after {self.rpc_timeout}s"
        )

    def generate(self, nblocks, maxtries=1000000, **kwargs):
        self.log.debug(
            "TestNode.generate() dispatches `generate` call to `generatetoaddress`"
        )
        return self.generatetoaddress(
            nblocks=nblocks,
            address=self.get_deterministic_priv_key().address,
            maxtries=maxtries,
            **kwargs,
        )

    def generateblock(self, *args, invalid_call, **kwargs):
        assert not invalid_call
        return self.__getattr__("generateblock")(*args, **kwargs)

    def generatetoaddress(self, *args, invalid_call, **kwargs):
        assert not invalid_call
        return self.__getattr__("generatetoaddress")(*args, **kwargs)

    def generatetodescriptor(self, *args, invalid_call, **kwargs):
        assert not invalid_call
        return self.__getattr__("generatetodescriptor")(*args, **kwargs)

    def buildavalancheproof(
        self,
        sequence: int,
        expiration: int,
        master: str,
        stakes: List[Dict[str, Any]],
        payoutAddress: Optional[str] = ADDRESS_ECREG_UNSPENDABLE,
    ) -> str:
        return self.__getattr__("buildavalancheproof")(
            sequence=sequence,
            expiration=expiration,
            master=master,
            stakes=stakes,
            payoutAddress=payoutAddress,
        )

    def get_wallet_rpc(self, wallet_name):
        if self.use_cli:
            return RPCOverloadWrapper(
                self.cli(f"-rpcwallet={wallet_name}"), True, self.descriptors
            )
        else:
            assert self.rpc is not None, self._node_msg("Error: RPC not initialized")
            assert self.rpc_connected, self._node_msg("Error: RPC not connected")
            wallet_path = f"wallet/{urllib.parse.quote(wallet_name)}"
            return RPCOverloadWrapper(
                self.rpc / wallet_path, descriptors=self.descriptors
            )

    def stop_node(self, expected_stderr="", *, wait=0, wait_until_stopped=True):
        """Stop the node."""
        if not self.running:
            return
        self.log.debug("Stopping node")
        try:
            self.stop(wait=wait)
        except http.client.CannotSendRequest:
            self.log.exception("Unable to stop node.")

        # If there are any running perf processes, stop them.
        for profile_name in tuple(self.perf_subprocesses.keys()):
            self._stop_perf(profile_name)

        # Check that stderr is as expected
        self.stderr.seek(0)
        stderr = self.stderr.read().decode("utf-8").strip()
        if stderr != expected_stderr:
            raise AssertionError(f"Unexpected stderr {stderr} != {expected_stderr}")

        self.stdout.close()
        self.stderr.close()

        del self.p2ps[:]

        if wait_until_stopped:
            self.wait_until_stopped()

    def is_node_stopped(self):
        """Checks whether the node has stopped.

        Returns True if the node has stopped. False otherwise.
        This method is responsible for freeing resources (self.process)."""
        if not self.running:
            return True
        return_code = self.process.poll()
        if return_code is None:
            return False

        # process has stopped. Assert that it didn't return an error code.
        assert return_code == 0, self._node_msg(
            f"Node returned non-zero exit code ({return_code}) when stopping"
        )
        self.running = False
        self.process = None
        self.rpc_connected = False
        self.rpc = None
        self.log.debug("Node stopped")
        return True

    def wait_until_stopped(self, timeout=BITCOIND_PROC_WAIT_TIMEOUT):
        wait_until_helper(
            self.is_node_stopped, timeout=timeout, timeout_factor=self.timeout_factor
        )

    @property
    def chain_path(self) -> Path:
        return Path(self.datadir) / self.chain

    @property
    def debug_log_path(self) -> Path:
        return self.chain_path / "debug.log"

    def debug_log_bytes(self) -> int:
        with open(self.debug_log_path, encoding="utf-8") as dl:
            dl.seek(0, 2)
            return dl.tell()

    @contextlib.contextmanager
    def assert_debug_log(self, expected_msgs, unexpected_msgs=None, timeout=2):
        """Assert that some debug messages are present within some timeout.
        Unexpected debug messages may be optionally provided to fail a test
        if they appear before expected messages.

        Note: expected_msgs must always be non-empty even if the goal is to check
        for unexpected_msgs. This provides a bounded scenario such that "we expect
        to reach some target resulting in expected_msgs without seeing unexpected_msgs.
        Otherwise, we are testing that something never happens, which is fundamentally
        not robust test logic.
        """
        if not expected_msgs:
            raise AssertionError("Expected debug messages is empty")
        if unexpected_msgs is None:
            unexpected_msgs = []
        time_end = time.time() + timeout * self.timeout_factor
        prev_size = self.debug_log_bytes()

        yield

        while True:
            found = True
            with open(self.debug_log_path, encoding="utf-8") as dl:
                dl.seek(prev_size)
                log = dl.read()
            print_log = " - " + "\n - ".join(log.splitlines())
            for unexpected_msg in unexpected_msgs:
                if re.search(re.escape(unexpected_msg), log, flags=re.MULTILINE):
                    self._raise_assertion_error(
                        f'Unexpected message "{unexpected_msg}" partially matches '
                        f"log:\n\n{print_log}\n\n"
                    )
            for expected_msg in expected_msgs:
                if re.search(re.escape(expected_msg), log, flags=re.MULTILINE) is None:
                    found = False
            if found:
                return
            if time.time() >= time_end:
                break
            time.sleep(0.05)
        self._raise_assertion_error(
            f'Expected messages "{expected_msgs}" does not partially match '
            f"log:\n\n{print_log}\n\n"
        )

    @contextlib.contextmanager
    def wait_for_debug_log(
        self,
        expected_msgs: List[bytes],
        timeout=60,
        interval=0.05,
        chatty_callable=None,
    ):
        """
        Block until we see all the debug log messages or until we exceed the timeout.
        If a chatty_callable is provided, it is repeated at every iteration.
        """
        time_end = time.time() + timeout * self.timeout_factor
        prev_size = self.debug_log_bytes()

        yield

        while True:
            found = True

            if chatty_callable is not None:
                # Ignore the chatty_callable returned value, as we are only
                # interested in the debug log content here.
                chatty_callable()

            with open(self.debug_log_path, "rb") as dl:
                dl.seek(prev_size)
                log = dl.read()

            for expected_msg in expected_msgs:
                if expected_msg not in log:
                    found = False

            if found:
                return

            if time.time() >= time_end:
                print_log = " - " + "\n - ".join(
                    [f"\n - {line.decode()}" for line in log.splitlines()]
                )
                break

            time.sleep(interval)

        self._raise_assertion_error(
            f'Expected messages "{str(expected_msgs)}" does not partially match '
            f"log:\n\n{print_log}\n\n"
        )

    @contextlib.contextmanager
    def profile_with_perf(self, profile_name: str):
        """
        Context manager that allows easy profiling of node activity using `perf`.

        See `test/functional/README.md` for details on perf usage.

        Args:
            profile_name: This string will be appended to the
                profile data filename generated by perf.
        """
        subp = self._start_perf(profile_name)

        yield

        if subp:
            self._stop_perf(profile_name)

    def _start_perf(self, profile_name=None):
        """Start a perf process to profile this node.

        Returns the subprocess running perf."""
        subp = None

        def test_success(cmd):
            return (
                subprocess.call(
                    # shell=True required for pipe use below
                    cmd,
                    shell=True,
                    stderr=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                )
                == 0
            )

        if not sys.platform.startswith("linux"):
            self.log.warning(
                "Can't profile with perf; only availabe on Linux platforms"
            )
            return None

        if not test_success("which perf"):
            self.log.warning("Can't profile with perf; must install perf-tools")
            return None

        if not test_success(f"readelf -S {shlex.quote(self.binary)} | grep .debug_str"):
            self.log.warning(
                "perf output won't be very useful without debug symbols compiled into"
                " bitcoind"
            )

        output_path = tempfile.NamedTemporaryFile(
            dir=self.datadir,
            prefix=f"{profile_name or 'test'}.perf.data.",
            delete=False,
        ).name

        cmd = [
            "perf",
            "record",
            "-g",  # Record the callgraph.
            # Compatibility for gcc's --fomit-frame-pointer.
            "--call-graph",
            "dwarf",
            "-F",
            "101",  # Sampling frequency in Hz.
            "-p",
            str(self.process.pid),
            "-o",
            output_path,
        ]
        subp = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.perf_subprocesses[profile_name] = subp

        return subp

    def _stop_perf(self, profile_name):
        """Stop (and pop) a perf subprocess."""
        subp = self.perf_subprocesses.pop(profile_name)
        output_path = subp.args[subp.args.index("-o") + 1]

        subp.terminate()
        subp.wait(timeout=10)

        stderr = subp.stderr.read().decode()
        if "Consider tweaking /proc/sys/kernel/perf_event_paranoid" in stderr:
            self.log.warning(
                "perf couldn't collect data! Try "
                "'sudo sysctl -w kernel.perf_event_paranoid=-1'"
            )
        else:
            report_cmd = f"perf report -i {output_path}"
            self.log.info(f"See perf output by running '{report_cmd}'")

    def assert_start_raises_init_error(
        self,
        extra_args=None,
        expected_msg=None,
        match=ErrorMatch.FULL_TEXT,
        *args,
        **kwargs,
    ):
        """Attempt to start the node and expect it to raise an error.

        extra_args: extra arguments to pass through to bitcoind
        expected_msg: regex that stderr should match when bitcoind fails

        Will throw if bitcoind starts without an error.
        Will throw if an expected_msg is provided and it does not match bitcoind's stdout.
        """
        with tempfile.NamedTemporaryFile(
            dir=self.stderr_dir, delete=False
        ) as log_stderr, tempfile.NamedTemporaryFile(
            dir=self.stdout_dir, delete=False
        ) as log_stdout:
            try:
                self.start(
                    extra_args, stdout=log_stdout, stderr=log_stderr, *args, **kwargs
                )
                ret = self.process.wait(timeout=self.rpc_timeout)
                self.log.debug(
                    self._node_msg(
                        f"bitcoind exited with status {ret} during initialization"
                    )
                )
                self.running = False
                self.process = None
                # Check stderr for expected message
                if expected_msg is not None:
                    log_stderr.seek(0)
                    stderr = log_stderr.read().decode("utf-8").strip()
                    if match == ErrorMatch.PARTIAL_REGEX:
                        if re.search(expected_msg, stderr, flags=re.MULTILINE) is None:
                            self._raise_assertion_error(
                                f'Expected message "{expected_msg}" does not partially '
                                f'match stderr:\n"{stderr}"'
                            )
                    elif match == ErrorMatch.FULL_REGEX:
                        if re.fullmatch(expected_msg, stderr) is None:
                            self._raise_assertion_error(
                                f'Expected message "{expected_msg}" does not fully '
                                f'match stderr:\n"{stderr}"'
                            )
                    elif match == ErrorMatch.FULL_TEXT:
                        if expected_msg != stderr:
                            self._raise_assertion_error(
                                f'Expected message "{expected_msg}" does not fully '
                                f'match stderr:\n"{stderr}"'
                            )
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.running = False
                self.process = None
                assert_msg = f"bitcoind should have exited within {self.rpc_timeout}s "
                if expected_msg is None:
                    assert_msg += "with an error"
                else:
                    assert_msg += "with expected error " + expected_msg
                self._raise_assertion_error(assert_msg)

    def relay_fee(self, cached=True):
        if not self.relay_fee_cache or not cached:
            self.relay_fee_cache = self.getnetworkinfo()["relayfee"]

        return self.relay_fee_cache

    def calculate_fee(self, tx):
        """Estimate the necessary fees (in sats) for an unsigned CTransaction assuming:
        - the current relayfee on node
        - all inputs are compressed-key p2pkh, and will be signed ecdsa or schnorr
        - all inputs currently unsigned (empty scriptSig)
        """
        billable_size_estimate = tx.billable_size()
        # Add some padding for signatures / public keys
        # 107 = length of PUSH(longest_sig = 72 bytes), PUSH(pubkey = 33 bytes)
        billable_size_estimate += len(tx.vin) * 107

        # relay_fee gives a value in XEC per kB.
        return int(self.relay_fee() / 1000 * billable_size_estimate * XEC)

    def calculate_fee_from_txid(self, txid):
        ctx = FromHex(CTransaction(), self.getrawtransaction(txid))
        return self.calculate_fee(ctx)

    def add_p2p_connection(self, p2p_conn, *, wait_for_verack=True, **kwargs):
        """Add an inbound p2p connection to the node.

        This method adds the p2p connection to the self.p2ps list and also
        returns the connection to the caller."""
        if "dstport" not in kwargs:
            kwargs["dstport"] = p2p_port(self.index)
        if "dstaddr" not in kwargs:
            kwargs["dstaddr"] = "127.0.0.1"

        p2p_conn.peer_connect(
            **kwargs, net=self.chain, timeout_factor=self.timeout_factor
        )()
        self.p2ps.append(p2p_conn)
        p2p_conn.wait_until(lambda: p2p_conn.is_connected, check_connected=False)
        if wait_for_verack:
            # Wait for the node to send us the version and verack
            p2p_conn.wait_for_verack()
            # At this point we have sent our version message and received the version and verack, however the full node
            # has not yet received the verack from us (in reply to their version). So, the connection is not yet fully
            # established (fSuccessfullyConnected).
            #
            # This shouldn't lead to any issues when sending messages, since the verack will be in-flight before the
            # message we send. However, it might lead to races where we are expecting to receive a message. E.g. a
            # transaction that will be added to the mempool as soon as we return here.
            #
            # So syncing here is redundant when we only want to send a message, but the cost is low (a few milliseconds)
            # in comparison to the upside of making tests less fragile and
            # unexpected intermittent errors less likely.
            p2p_conn.sync_with_ping()

            # Consistency check that the Bitcoin ABC has received our user agent
            # string. This checks the node's newest peer. It could be racy if
            # another Bitcoin ABC node has connected since we opened our
            # connection, but we don't expect that to happen.
            assert_equal(self.getpeerinfo()[-1]["subver"], P2P_SUBVERSION)

        return p2p_conn

    def add_outbound_p2p_connection(
        self, p2p_conn, *, p2p_idx, connection_type="outbound-full-relay", **kwargs
    ):
        """Add an outbound p2p connection from node. Must be an
        "outbound-full-relay", "block-relay-only", "addr-fetch", "feeler" or "avalanche" connection.

        This method adds the p2p connection to the self.p2ps list and returns
        the connection to the caller.
        """

        def addconnection_callback(address, port):
            self.log.debug(f"Connecting to {address}:{port} {connection_type}")
            self.addconnection(f"{address}:{port}", connection_type)

        p2p_conn.peer_accept_connection(
            connect_cb=addconnection_callback,
            connect_id=p2p_idx + 1,
            net=self.chain,
            timeout_factor=self.timeout_factor,
            **kwargs,
        )()

        if connection_type == "feeler":
            # feeler connections are closed as soon as the node receives a
            # `version` message
            p2p_conn.wait_until(
                lambda: p2p_conn.message_count["version"] == 1, check_connected=False
            )
            p2p_conn.wait_until(
                lambda: not p2p_conn.is_connected, check_connected=False
            )
        else:
            p2p_conn.wait_for_connect()
            self.p2ps.append(p2p_conn)

            p2p_conn.wait_for_verack()
            p2p_conn.sync_with_ping()

        return p2p_conn

    def num_test_p2p_connections(self):
        """Return number of test framework p2p connections to the node."""
        return len(
            [peer for peer in self.getpeerinfo() if peer["subver"] == P2P_SUBVERSION]
        )

    def disconnect_p2ps(self):
        """Close all p2p connections to the node."""
        for p in self.p2ps:
            p.peer_disconnect()
        del self.p2ps[:]

        wait_until_helper(
            lambda: self.num_test_p2p_connections() == 0,
            timeout_factor=self.timeout_factor,
        )

    def get_chronik_client(self):
        """Return a ChronikClient instance that communicates with this node"""
        # Chronik might not be built-in so let's not import each time this file
        # is included but only where it's expected to not explode.
        from .chronik.client import DEFAULT_TIMEOUT, ChronikClient

        # host is always None in practice, we should get rid of it at some
        # point. In the meantime, let's properly handle the API.
        host = self.host if self.host is not None else "127.0.0.1"
        return ChronikClient(
            host,
            self.chronik_port,
            timeout=DEFAULT_TIMEOUT * self.timeout_factor,
        )


class TestNodeCLIAttr:
    def __init__(self, cli, command):
        self.cli = cli
        self.command = command

    def __call__(self, *args, **kwargs):
        return self.cli.send_cli(self.command, *args, **kwargs)

    def get_request(self, *args, **kwargs):
        return lambda: self(*args, **kwargs)


def arg_to_cli(arg):
    if isinstance(arg, bool):
        return str(arg).lower()
    elif arg is None:
        return "null"
    elif isinstance(arg, dict) or isinstance(arg, list):
        return json.dumps(arg, default=EncodeDecimal)
    else:
        return str(arg)


class TestNodeCLI:
    """Interface to bitcoin-cli for an individual node"""

    def __init__(self, binary, datadir, emulator=None):
        self.options = []
        self.binary = binary
        self.datadir = datadir
        self.input = None
        self.log = logging.getLogger("TestFramework.bitcoincli")
        self.emulator = emulator

    def __call__(self, *options, cli_input=None):
        # TestNodeCLI is callable with bitcoin-cli command-line options
        cli = TestNodeCLI(self.binary, self.datadir, self.emulator)
        cli.options = [str(o) for o in options]
        cli.input = cli_input
        return cli

    def __getattr__(self, command):
        return TestNodeCLIAttr(self, command)

    def batch(self, requests):
        results = []
        for request in requests:
            try:
                results.append({"result": request()})
            except JSONRPCException as e:
                results.append({"error": e})
        return results

    def send_cli(self, command=None, *args, **kwargs):
        """Run bitcoin-cli command. Deserializes returned string as python object."""
        pos_args = [arg_to_cli(arg) for arg in args]
        named_args = [
            str(key) + "=" + arg_to_cli(value) for (key, value) in kwargs.items()
        ]
        assert not (pos_args and named_args), (
            "Cannot use positional arguments and named arguments in the same "
            "bitcoin-cli call"
        )
        p_args = [self.binary, "-datadir=" + self.datadir] + self.options
        if named_args:
            p_args += ["-named"]
        if command is not None:
            p_args += [command]
        p_args += pos_args + named_args
        self.log.debug(f"Running bitcoin-cli {p_args[2:]}")
        if self.emulator is not None:
            p_args = [self.emulator] + p_args
        process = subprocess.Popen(
            p_args,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
        )
        cli_stdout, cli_stderr = process.communicate(input=self.input)
        returncode = process.poll()
        if returncode:
            match = re.match(r"error code: ([-0-9]+)\nerror message:\n(.*)", cli_stderr)
            if match:
                code, message = match.groups()
                raise JSONRPCException({"code": int(code), "message": message})
            # Ignore cli_stdout, raise with cli_stderr
            raise subprocess.CalledProcessError(
                returncode, self.binary, output=cli_stderr
            )
        try:
            return json.loads(cli_stdout, parse_float=decimal.Decimal)
        except (json.JSONDecodeError, decimal.InvalidOperation):
            return cli_stdout.rstrip("\n")


class RPCOverloadWrapper:
    def __init__(self, rpc, cli=False, descriptors=False):
        self.rpc = rpc
        self.is_cli = cli
        self.descriptors = descriptors

    def __getattr__(self, name):
        return getattr(self.rpc, name)

    def createwallet(
        self,
        wallet_name,
        disable_private_keys=None,
        blank=None,
        passphrase="",
        avoid_reuse=None,
        descriptors=None,
        load_on_startup=None,
    ):
        if descriptors is None:
            descriptors = self.descriptors
        return self.__getattr__("createwallet")(
            wallet_name,
            disable_private_keys,
            blank,
            passphrase,
            avoid_reuse,
            descriptors,
            load_on_startup,
        )

    def importprivkey(self, privkey, label=None, rescan=None):
        wallet_info = self.getwalletinfo()
        if "descriptors" not in wallet_info or (
            "descriptors" in wallet_info and not wallet_info["descriptors"]
        ):
            return self.__getattr__("importprivkey")(privkey, label, rescan)
        desc = descsum_create("combo(" + privkey + ")")
        req = [
            {
                "desc": desc,
                "timestamp": 0 if rescan else "now",
                "label": label if label else "",
            }
        ]
        import_res = self.importdescriptors(req)
        if not import_res[0]["success"]:
            raise JSONRPCException(import_res[0]["error"])

    def addmultisigaddress(self, nrequired, keys, label=None):
        wallet_info = self.getwalletinfo()
        if "descriptors" not in wallet_info or (
            "descriptors" in wallet_info and not wallet_info["descriptors"]
        ):
            return self.__getattr__("addmultisigaddress")(nrequired, keys, label)
        cms = self.createmultisig(nrequired, keys)
        req = [
            {"desc": cms["descriptor"], "timestamp": 0, "label": label if label else ""}
        ]
        import_res = self.importdescriptors(req)
        if not import_res[0]["success"]:
            raise JSONRPCException(import_res[0]["error"])
        return cms

    def importpubkey(self, pubkey, label=None, rescan=None):
        wallet_info = self.getwalletinfo()
        if "descriptors" not in wallet_info or (
            "descriptors" in wallet_info and not wallet_info["descriptors"]
        ):
            return self.__getattr__("importpubkey")(pubkey, label, rescan)
        desc = descsum_create("combo(" + pubkey + ")")
        req = [
            {
                "desc": desc,
                "timestamp": 0 if rescan else "now",
                "label": label if label else "",
            }
        ]
        import_res = self.importdescriptors(req)
        if not import_res[0]["success"]:
            raise JSONRPCException(import_res[0]["error"])

    def importaddress(self, address, label=None, rescan=None, p2sh=None):
        wallet_info = self.getwalletinfo()
        if "descriptors" not in wallet_info or (
            "descriptors" in wallet_info and not wallet_info["descriptors"]
        ):
            return self.__getattr__("importaddress")(address, label, rescan, p2sh)
        is_hex = False
        try:
            int(address, 16)
            is_hex = True
            desc = descsum_create("raw(" + address + ")")
        except BaseException:
            desc = descsum_create("addr(" + address + ")")
        reqs = [
            {
                "desc": desc,
                "timestamp": 0 if rescan else "now",
                "label": label if label else "",
            }
        ]
        if is_hex and p2sh:
            reqs.append(
                {
                    "desc": descsum_create("p2sh(raw(" + address + "))"),
                    "timestamp": 0 if rescan else "now",
                    "label": label if label else "",
                }
            )
        import_res = self.importdescriptors(reqs)
        for res in import_res:
            if not res["success"]:
                raise JSONRPCException(res["error"])
