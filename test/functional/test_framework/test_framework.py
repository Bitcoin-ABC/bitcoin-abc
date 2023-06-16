#!/usr/bin/env python3
# Copyright (c) 2014-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Base class for RPC testing."""

import argparse
import configparser
import logging
import os
import pdb
import platform
import random
import shutil
import subprocess
import sys
import tempfile
import time
from enum import Enum
from typing import List

from . import coverage
from .address import ADDRESS_ECREG_P2SH_OP_TRUE
from .authproxy import JSONRPCException
from .avatools import get_proof_ids
from .p2p import NetworkThread
from .test_node import TestNode
from .util import (
    MAX_NODES,
    PortSeed,
    assert_equal,
    check_json_precision,
    chronik_port,
    get_datadir_path,
    initialize_datadir,
    p2p_port,
    rpc_port,
    uint256_hex,
    wait_until_helper,
)


class TestStatus(Enum):
    PASSED = 1
    FAILED = 2
    SKIPPED = 3


TEST_EXIT_PASSED = 0
TEST_EXIT_FAILED = 1
TEST_EXIT_SKIPPED = 77

# Timestamp is Jun. 10th, 2023 at 12:00:00
TIMESTAMP_IN_THE_PAST = 1686398400

TMPDIR_PREFIX = "bitcoin_func_test_"


class SkipTest(Exception):
    """This exception is raised to skip a test"""

    def __init__(self, message):
        self.message = message


class BitcoinTestMetaClass(type):
    """Metaclass for BitcoinTestFramework.

    Ensures that any attempt to register a subclass of `BitcoinTestFramework`
    adheres to a standard whereby the subclass overrides `set_test_params` and
    `run_test` but DOES NOT override either `__init__` or `main`. If any of
    those standards are violated, a ``TypeError`` is raised."""

    def __new__(cls, clsname, bases, dct):
        if not clsname == "BitcoinTestFramework":
            if not ("run_test" in dct and "set_test_params" in dct):
                raise TypeError(
                    "BitcoinTestFramework subclasses must override "
                    "'run_test' and 'set_test_params'"
                )
            if "__init__" in dct or "main" in dct:
                raise TypeError(
                    "BitcoinTestFramework subclasses may not override "
                    "'__init__' or 'main'"
                )

        return super().__new__(cls, clsname, bases, dct)


class BitcoinTestFramework(metaclass=BitcoinTestMetaClass):
    """Base class for a bitcoin test script.

    Individual bitcoin test scripts should subclass this class and override the set_test_params() and run_test() methods.

    Individual tests can also override the following methods to customize the test setup:

    - add_options()
    - setup_chain()
    - setup_network()
    - setup_nodes()

    The __init__() and main() methods should not be overridden.

    This class also contains various public and private helper methods."""

    def __init__(self):
        """Sets test framework defaults. Do not override this method. Instead, override the set_test_params() method"""
        self.chain: str = "regtest"
        self.setup_clean_chain: bool = False
        self.nodes: List[TestNode] = []
        self.network_thread = None
        # Wait for up to 60 seconds for the RPC server to respond
        self.rpc_timeout = 60
        self.supports_cli = True
        self.bind_to_localhost_only = True
        self.parse_args()
        self.default_wallet_name = ""
        self.wallet_data_filename = "wallet.dat"
        # Optional list of wallet names that can be set in set_test_params to
        # create and import keys to. If unset, default is len(nodes) *
        # [default_wallet_name]. If wallet names are None, wallet creation is
        # skipped. If list is truncated, wallet creation is skipped and keys
        # are not imported.
        self.wallet_names = None
        # Disable ThreadOpenConnections by default, so that adding entries to
        # addrman will not result in automatic connections to them.
        self.disable_autoconnect = True
        self.set_test_params()
        if self.options.timeout_factor == 0:
            self.options.timeout_factor = 99999
        # optionally, increase timeout by a factor
        self.rpc_timeout = int(self.rpc_timeout * self.options.timeout_factor)

    def main(self):
        """Main function. This should not be overridden by the subclass test scripts."""
        assert hasattr(
            self, "num_nodes"
        ), "Test must set self.num_nodes in set_test_params()"

        try:
            self.setup()
            self.run_test()
        except JSONRPCException:
            self.log.exception("JSONRPC error")
            self.success = TestStatus.FAILED
        except SkipTest as e:
            self.log.warning(f"Test Skipped: {e.message}")
            self.success = TestStatus.SKIPPED
        except AssertionError:
            self.log.exception("Assertion failed")
            self.success = TestStatus.FAILED
        except KeyError:
            self.log.exception("Key error")
            self.success = TestStatus.FAILED
        except subprocess.CalledProcessError as e:
            self.log.exception(f"Called Process failed with '{e.output}'")
            self.success = TestStatus.FAILED
        except Exception:
            self.log.exception("Unexpected exception caught during testing")
            self.success = TestStatus.FAILED
        except KeyboardInterrupt:
            self.log.warning("Exiting after keyboard interrupt")
            self.success = TestStatus.FAILED
        finally:
            exit_code = self.shutdown()
            sys.exit(exit_code)

    def parse_args(self):
        parser = argparse.ArgumentParser(usage="%(prog)s [options]")
        parser.add_argument(
            "--nocleanup",
            dest="nocleanup",
            default=False,
            action="store_true",
            help="Leave bitcoinds and test.* datadir on exit or error",
        )
        parser.add_argument(
            "--noshutdown",
            dest="noshutdown",
            default=False,
            action="store_true",
            help="Don't stop bitcoinds after the test execution",
        )
        parser.add_argument(
            "--cachedir",
            dest="cachedir",
            default=os.path.abspath(
                f"{os.path.dirname(os.path.realpath(__file__))}/../../cache"
            ),
            help="Directory for caching pregenerated datadirs (default: %(default)s)",
        )
        parser.add_argument(
            "--tmpdir", dest="tmpdir", help="Root directory for datadirs"
        )
        parser.add_argument(
            "-l",
            "--loglevel",
            dest="loglevel",
            default="INFO",
            help=(
                "log events at this level and higher to the console. Can be set to"
                " DEBUG, INFO, WARNING, ERROR or CRITICAL. Passing --loglevel DEBUG"
                " will output all logs to console. Note that logs at all levels are"
                " always written to the test_framework.log file in the temporary test"
                " directory."
            ),
        )
        parser.add_argument(
            "--tracerpc",
            dest="trace_rpc",
            default=False,
            action="store_true",
            help="Print out all RPC calls as they are made",
        )
        parser.add_argument(
            "--portseed",
            dest="port_seed",
            default=os.getpid(),
            type=int,
            help=(
                "The seed to use for assigning port numbers (default: current"
                " process id)"
            ),
        )
        parser.add_argument(
            "--coveragedir",
            dest="coveragedir",
            help="Write tested RPC commands into this directory",
        )
        parser.add_argument(
            "--configfile",
            dest="configfile",
            default=os.path.abspath(
                os.path.dirname(os.path.realpath(__file__)) + "/../../config.ini"
            ),
            help="Location of the test framework config file (default: %(default)s)",
        )
        parser.add_argument(
            "--pdbonfailure",
            dest="pdbonfailure",
            default=False,
            action="store_true",
            help="Attach a python debugger if test fails",
        )
        parser.add_argument(
            "--usecli",
            dest="usecli",
            default=False,
            action="store_true",
            help="use bitcoin-cli instead of RPC for all commands",
        )
        parser.add_argument(
            "--perf",
            dest="perf",
            default=False,
            action="store_true",
            help="profile running nodes with perf for the duration of the test",
        )
        parser.add_argument(
            "--valgrind",
            dest="valgrind",
            default=False,
            action="store_true",
            help=(
                "run nodes under the valgrind memory error detector: expect at least a"
                " ~10x slowdown, valgrind 3.14 or later required"
            ),
        )
        parser.add_argument(
            "--randomseed",
            type=int,
            help=(
                "set a random seed for deterministically reproducing a previous"
                " test run"
            ),
        )
        parser.add_argument(
            "--descriptors",
            default=False,
            action="store_true",
            help="Run test using a descriptor wallet",
        )
        parser.add_argument(
            "--with-cowperthwaiteactivation",
            dest="cowperthwaiteactivation",
            default=False,
            action="store_true",
            help=f"Activate cowperthwaite update on timestamp {TIMESTAMP_IN_THE_PAST}",
        )
        parser.add_argument(
            "--timeout-factor",
            dest="timeout_factor",
            type=float,
            default=1.0,
            help=(
                "adjust test timeouts by a factor. "
                "Setting it to 0 disables all timeouts"
            ),
        )

        self.add_options(parser)
        self.options = parser.parse_args()

        PortSeed.n = self.options.port_seed

    def setup(self):
        """Call this method to start up the test framework object with options set."""
        check_json_precision()

        self.options.cachedir = os.path.abspath(self.options.cachedir)

        config = configparser.ConfigParser()
        config.read_file(open(self.options.configfile, encoding="utf-8"))
        self.config = config
        fname_bitcoind = os.path.join(
            config["environment"]["BUILDDIR"],
            "src",
            f"bitcoind{config['environment']['EXEEXT']}",
        )
        fname_bitcoincli = os.path.join(
            config["environment"]["BUILDDIR"],
            "src",
            f"bitcoin-cli{config['environment']['EXEEXT']}",
        )
        self.options.bitcoind = os.getenv("BITCOIND", default=fname_bitcoind)
        self.options.bitcoincli = os.getenv("BITCOINCLI", default=fname_bitcoincli)
        self.options.emulator = config["environment"]["EMULATOR"] or None

        os.environ["PATH"] = (
            config["environment"]["BUILDDIR"]
            + os.pathsep
            + config["environment"]["BUILDDIR"]
            + os.path.sep
            + "qt"
            + os.pathsep
            + os.environ["PATH"]
        )

        # Add test dir to sys.path (to access generated modules)
        sys.path.append(os.path.join(config["environment"]["BUILDDIR"], "test"))

        # Set up temp directory and start logging
        if self.options.tmpdir:
            self.options.tmpdir = os.path.abspath(self.options.tmpdir)
            os.makedirs(self.options.tmpdir, exist_ok=False)
        else:
            self.options.tmpdir = tempfile.mkdtemp(prefix=TMPDIR_PREFIX)
        self._start_logging()

        # Seed the PRNG. Note that test runs are reproducible if and only if
        # a single thread accesses the PRNG. For more information, see
        # https://docs.python.org/3/library/random.html#notes-on-reproducibility.
        # The network thread shouldn't access random. If we need to change the
        # network thread to access randomness, it should instantiate its own
        # random.Random object.
        seed = self.options.randomseed

        if seed is None:
            seed = random.randrange(sys.maxsize)
        else:
            self.log.debug(f"User supplied random seed {seed}")

        random.seed(seed)
        self.log.debug(f"PRNG seed is: {seed}")

        self.log.debug("Setting up network thread")
        self.network_thread = NetworkThread()
        self.network_thread.start()

        if self.options.usecli:
            if not self.supports_cli:
                raise SkipTest("--usecli specified but test does not support using CLI")
            self.skip_if_no_cli()
        self.skip_test_if_missing_module()
        self.setup_chain()
        self.setup_network()

        self.success = TestStatus.PASSED

    def shutdown(self):
        """Call this method to shut down the test framework object."""
        if self.success == TestStatus.FAILED and self.options.pdbonfailure:
            print("Testcase failed. Attaching python debugger. Enter ? for help")
            pdb.set_trace()

        self.log.debug("Closing down network thread")
        self.network_thread.close()
        if not self.options.noshutdown:
            self.log.info("Stopping nodes")
            if self.nodes:
                self.stop_nodes()
        else:
            for node in self.nodes:
                node.cleanup_on_exit = False
            self.log.info("Note: bitcoinds were not stopped and may still be running")

        should_clean_up = (
            not self.options.nocleanup
            and not self.options.noshutdown
            and self.success != TestStatus.FAILED
            and not self.options.perf
        )
        if should_clean_up:
            self.log.info(f"Cleaning up {self.options.tmpdir} on exit")
            cleanup_tree_on_exit = True
        elif self.options.perf:
            self.log.warning(
                f"Not cleaning up dir {self.options.tmpdir} due to perf data"
            )
            cleanup_tree_on_exit = False
        else:
            self.log.warning(f"Not cleaning up dir {self.options.tmpdir}")
            cleanup_tree_on_exit = False

        if self.success == TestStatus.PASSED:
            self.log.info("Tests successful")
            exit_code = TEST_EXIT_PASSED
        elif self.success == TestStatus.SKIPPED:
            self.log.info("Test skipped")
            exit_code = TEST_EXIT_SKIPPED
        else:
            self.log.error(
                f"Test failed. Test logging available at {self.options.tmpdir}"
                "/test_framework.log"
            )
            self.log.error("")
            combine_logs_path = os.path.normpath(
                f"{os.path.dirname(os.path.realpath(__file__))}/../combine_logs.py"
            )
            self.log.error(
                f"Hint: Call {combine_logs_path} '{self.options.tmpdir}' to "
                "consolidate all logs"
            )
            self.log.error("")
            self.log.error(
                "If this failure happened unexpectedly or intermittently, please"
                " file a bug and provide a link or upload of the combined log."
            )
            self.log.error(self.config["environment"]["PACKAGE_BUGREPORT"])
            self.log.error("")
            exit_code = TEST_EXIT_FAILED
        # Logging.shutdown will not remove stream- and filehandlers, so we must
        # do it explicitly. Handlers are removed so the next test run can apply
        # different log handler settings.
        # See: https://docs.python.org/3/library/logging.html#logging.shutdown
        for h in list(self.log.handlers):
            h.flush()
            h.close()
            self.log.removeHandler(h)
        rpc_logger = logging.getLogger("BitcoinRPC")
        for h in list(rpc_logger.handlers):
            h.flush()
            rpc_logger.removeHandler(h)
        if cleanup_tree_on_exit:
            shutil.rmtree(self.options.tmpdir)

        self.nodes.clear()
        return exit_code

    # Methods to override in subclass test scripts.
    def set_test_params(self):
        """Tests must this method to change default values for number of nodes, topology, etc"""
        raise NotImplementedError

    def add_options(self, parser):
        """Override this method to add command-line options to the test"""
        pass

    def skip_test_if_missing_module(self):
        """Override this method to skip a test if a module is not compiled"""
        pass

    def setup_chain(self):
        """Override this method to customize blockchain setup"""
        self.log.info(f"Initializing test directory {self.options.tmpdir}")
        if self.setup_clean_chain:
            self._initialize_chain_clean()
        else:
            self._initialize_chain()

    def setup_network(self):
        """Override this method to customize test network topology"""
        self.setup_nodes()

        # Connect the nodes as a "chain".  This allows us
        # to split the network between nodes 1 and 2 to get
        # two halves that can work on competing chains.
        #
        # Topology looks like this:
        # node0 <-- node1 <-- node2 <-- node3
        #
        # If all nodes are in IBD (clean chain from genesis), node0 is assumed to be the source of blocks (miner). To
        # ensure block propagation, all nodes will establish outgoing connections toward node0.
        # See fPreferredDownload in net_processing.
        #
        # If further outbound connections are needed, they can be added at the beginning of the test with e.g.
        # self.connect_nodes(1, 2)
        for i in range(self.num_nodes - 1):
            self.connect_nodes(i + 1, i)
        self.sync_all()

    def setup_nodes(self):
        """Override this method to customize test node setup"""
        extra_args = [[]] * self.num_nodes
        if hasattr(self, "extra_args"):
            extra_args = self.extra_args
        self.add_nodes(self.num_nodes, extra_args)
        self.start_nodes()
        if self.is_wallet_compiled():
            self.import_deterministic_coinbase_privkeys()
        if not self.setup_clean_chain:
            for n in self.nodes:
                assert_equal(n.getblockchaininfo()["blocks"], 199)
            # To ensure that all nodes are out of IBD, the most recent block
            # must have a timestamp not too old (see IsInitialBlockDownload()).
            self.log.debug("Generate a block with current time")
            block_hash = self.generate(self.nodes[0], 1, sync_fun=self.no_op)[0]
            block = self.nodes[0].getblock(blockhash=block_hash, verbosity=0)
            for n in self.nodes:
                n.submitblock(block)
                chain_info = n.getblockchaininfo()
                assert_equal(chain_info["blocks"], 200)
                assert_equal(chain_info["initialblockdownload"], False)

    def import_deterministic_coinbase_privkeys(self):
        wallet_names = (
            [self.default_wallet_name] * len(self.nodes)
            if self.wallet_names is None
            else self.wallet_names
        )
        assert len(wallet_names) <= len(self.nodes)
        for wallet_name, n in zip(wallet_names, self.nodes):
            if wallet_name is not None:
                n.createwallet(
                    wallet_name=wallet_name,
                    descriptors=self.options.descriptors,
                    load_on_startup=True,
                )
            n.importprivkey(
                privkey=n.get_deterministic_priv_key().key, label="coinbase"
            )

    def run_test(self):
        """Tests must override this method to define test logic"""
        raise NotImplementedError

    # Public helper methods. These can be accessed by the subclass test
    # scripts.

    def add_nodes(self, num_nodes: int, extra_args=None, *, host=None, binary=None):
        """Instantiate TestNode objects.

        Should only be called once after the nodes have been specified in
        set_test_params()."""
        if self.bind_to_localhost_only:
            extra_confs = [["bind=127.0.0.1"]] * num_nodes
        else:
            extra_confs = [[]] * num_nodes
        if extra_args is None:
            extra_args = [[]] * num_nodes
        if binary is None:
            binary = [self.options.bitcoind] * num_nodes
        assert_equal(len(extra_confs), num_nodes)
        assert_equal(len(extra_args), num_nodes)
        assert_equal(len(binary), num_nodes)
        for i in range(num_nodes):
            self.nodes.append(
                TestNode(
                    i,
                    get_datadir_path(self.options.tmpdir, i),
                    chain=self.chain,
                    host=host,
                    rpc_port=rpc_port(i),
                    p2p_port=p2p_port(i),
                    chronik_port=chronik_port(i),
                    timewait=self.rpc_timeout,
                    timeout_factor=self.options.timeout_factor,
                    bitcoind=binary[i],
                    bitcoin_cli=self.options.bitcoincli,
                    coverage_dir=self.options.coveragedir,
                    cwd=self.options.tmpdir,
                    extra_conf=extra_confs[i],
                    extra_args=extra_args[i],
                    use_cli=self.options.usecli,
                    emulator=self.options.emulator,
                    start_perf=self.options.perf,
                    use_valgrind=self.options.valgrind,
                    descriptors=self.options.descriptors,
                )
            )

            if self.options.cowperthwaiteactivation:
                self.nodes[i].extend_default_args(
                    [f"-cowperthwaiteactivationtime={TIMESTAMP_IN_THE_PAST}"]
                )

    def start_node(self, i, *args, **kwargs):
        """Start a bitcoind"""

        node = self.nodes[i]

        node.start(*args, **kwargs)
        node.wait_for_rpc_connection()

        if self.options.coveragedir is not None:
            coverage.write_all_rpc_commands(self.options.coveragedir, node.rpc)

    def start_nodes(self, extra_args=None, *args, **kwargs):
        """Start multiple bitcoinds"""

        if extra_args is None:
            extra_args = [None] * self.num_nodes
        assert_equal(len(extra_args), self.num_nodes)
        try:
            for i, node in enumerate(self.nodes):
                node.start(extra_args[i], *args, **kwargs)
            for node in self.nodes:
                node.wait_for_rpc_connection()
        except BaseException:
            # If one node failed to start, stop the others
            self.stop_nodes()
            raise

        if self.options.coveragedir is not None:
            for node in self.nodes:
                coverage.write_all_rpc_commands(self.options.coveragedir, node.rpc)

    def stop_node(self, i, expected_stderr="", wait=0):
        """Stop a bitcoind test node"""
        self.nodes[i].stop_node(expected_stderr, wait=wait)

    def stop_nodes(self, wait=0):
        """Stop multiple bitcoind test nodes"""
        for node in self.nodes:
            # Issue RPC to stop nodes
            node.stop_node(wait=wait, wait_until_stopped=False)

        for node in self.nodes:
            # Wait for nodes to stop
            node.wait_until_stopped()

    def restart_node(self, i, extra_args=None):
        """Stop and start a test node"""
        self.stop_node(i)
        self.start_node(i, extra_args)

    def wait_for_node_exit(self, i, timeout):
        self.nodes[i].process.wait(timeout)

    def connect_nodes(self, a, b):
        from_node = self.nodes[a]
        to_node = self.nodes[b]

        host = to_node.host
        if host is None:
            host = "127.0.0.1"
        ip_port = f"{host}:{str(to_node.p2p_port)}"
        from_node.addnode(ip_port, "onetry")
        # poll until version handshake complete to avoid race conditions
        # with transaction relaying
        # See comments in net_processing:
        # * Must have a version message before anything else
        # * Must have a verack message before anything else
        wait_until_helper(
            lambda: all(peer["version"] != 0 for peer in from_node.getpeerinfo())
        )
        wait_until_helper(
            lambda: all(
                peer["bytesrecv_per_msg"].pop("verack", 0) == 24
                for peer in from_node.getpeerinfo()
            )
        )

    def disconnect_nodes(self, a, b):
        from_node = self.nodes[a]
        to_node = self.nodes[b]

        def get_peer_ids():
            result = []
            for peer in from_node.getpeerinfo():
                if to_node.name in peer["subver"]:
                    result.append(peer["id"])
            return result

        peer_ids = get_peer_ids()
        if not peer_ids:
            self.log.warning(
                f"disconnect_nodes: {from_node.index} and {to_node.index} were not "
                "connected"
            )
            return
        for peer_id in peer_ids:
            try:
                from_node.disconnectnode(nodeid=peer_id)
            except JSONRPCException as e:
                # If this node is disconnected between calculating the peer id
                # and issuing the disconnect, don't worry about it.
                # This avoids a race condition if we're mass-disconnecting
                # peers.
                if e.error["code"] != -29:  # RPC_CLIENT_NODE_NOT_CONNECTED
                    raise

        # wait to disconnect
        wait_until_helper(lambda: not get_peer_ids(), timeout=5)

    def split_network(self):
        """
        Split the network of four nodes into nodes 0/1 and 2/3.
        """
        self.disconnect_nodes(1, 2)
        self.sync_all(self.nodes[:2])
        self.sync_all(self.nodes[2:])

    def join_network(self):
        """
        Join the (previously split) network halves together.
        """
        self.connect_nodes(1, 2)
        self.sync_all()

    def no_op(self):
        pass

    def generate(self, generator, *args, sync_fun=None, **kwargs):
        blocks = generator.generate(*args, invalid_call=False, **kwargs)
        sync_fun() if sync_fun else self.sync_all()
        return blocks

    def generateblock(self, generator, *args, sync_fun=None, **kwargs):
        blocks = generator.generateblock(*args, invalid_call=False, **kwargs)
        sync_fun() if sync_fun else self.sync_all()
        return blocks

    def generatetoaddress(self, generator, *args, sync_fun=None, **kwargs):
        blocks = generator.generatetoaddress(*args, invalid_call=False, **kwargs)
        sync_fun() if sync_fun else self.sync_all()
        return blocks

    def generatetodescriptor(self, generator, *args, sync_fun=None, **kwargs):
        blocks = generator.generatetodescriptor(*args, invalid_call=False, **kwargs)
        sync_fun() if sync_fun else self.sync_all()
        return blocks

    def sync_blocks(self, nodes=None, wait=1, timeout=60):
        """
        Wait until everybody has the same tip.
        sync_blocks needs to be called with an rpc_connections set that has least
        one node already synced to the latest, stable tip, otherwise there's a
        chance it might return before all nodes are stably synced.
        """
        rpc_connections = nodes or self.nodes
        timeout = int(timeout * self.options.timeout_factor)
        stop_time = time.time() + timeout
        while time.time() <= stop_time:
            best_hash = [x.getbestblockhash() for x in rpc_connections]
            if best_hash.count(best_hash[0]) == len(rpc_connections):
                return
            # Check that each peer has at least one connection
            assert all(len(x.getpeerinfo()) for x in rpc_connections)
            time.sleep(wait)
        best_hashes = "".join(f"\n  {b!r}" for b in best_hash)
        raise AssertionError(f"Block sync timed out after {timeout}s:{best_hashes}")

    def sync_mempools(self, nodes=None, wait=1, timeout=60, flush_scheduler=True):
        """
        Wait until everybody has the same transactions in their memory
        pools
        """
        rpc_connections = nodes or self.nodes
        timeout = int(timeout * self.options.timeout_factor)
        stop_time = time.time() + timeout
        while time.time() <= stop_time:
            pool = [set(r.getrawmempool()) for r in rpc_connections]
            if pool.count(pool[0]) == len(rpc_connections):
                if flush_scheduler:
                    for r in rpc_connections:
                        r.syncwithvalidationinterfacequeue()
                return
            # Check that each peer has at least one connection
            assert all(len(x.getpeerinfo()) for x in rpc_connections)
            time.sleep(wait)
        pool_str = "".join(f"\n  {m!r}" for m in pool)
        raise AssertionError(f"Mempool sync timed out after {timeout}s:{pool_str}")

    def sync_proofs(self, nodes=None, wait=1, timeout=60):
        """
        Wait until everybody has the same proofs in their proof pools
        """
        rpc_connections = nodes or self.nodes
        timeout = int(timeout * self.options.timeout_factor)
        stop_time = time.time() + timeout

        def format_ids(id_list):
            """Convert ProodIDs to hex strings for easier debugging"""
            return [uint256_hex(i) for i in id_list]

        while time.time() <= stop_time:
            nodes_proofs = [set(format_ids(get_proof_ids(r))) for r in rpc_connections]
            if nodes_proofs.count(nodes_proofs[0]) == len(rpc_connections):
                return
            # Check that each peer has at least one connection
            assert all(len(x.getpeerinfo()) for x in rpc_connections)
            time.sleep(wait)
        nodes_proofs_str = "".join(f"\n  {m!r}" for m in nodes_proofs)
        raise AssertionError(
            f"Proofs sync timed out after {timeout}s:{nodes_proofs_str}"
        )

    def sync_all(self, nodes=None):
        self.sync_blocks(nodes)
        self.sync_mempools(nodes)
        self.sync_proofs(nodes)

    def wait_until(self, test_function, timeout=60):
        return wait_until_helper(
            test_function, timeout=timeout, timeout_factor=self.options.timeout_factor
        )

    # Private helper methods. These should not be accessed by the subclass
    # test scripts.

    def _start_logging(self):
        # Add logger and logging handlers
        self.log = logging.getLogger("TestFramework")
        self.log.setLevel(logging.DEBUG)
        # Create file handler to log all messages
        fh = logging.FileHandler(
            f"{self.options.tmpdir}/test_framework.log", encoding="utf-8"
        )
        fh.setLevel(logging.DEBUG)
        # Create console handler to log messages to stderr. By default this
        # logs only error messages, but can be configured with --loglevel.
        ch = logging.StreamHandler(sys.stdout)
        # User can provide log level as a number or string (eg DEBUG). loglevel
        # was caught as a string, so try to convert it to an int
        ll = (
            int(self.options.loglevel)
            if self.options.loglevel.isdigit()
            else self.options.loglevel.upper()
        )
        ch.setLevel(ll)
        # Format logs the same as bitcoind's debug.log with microprecision (so
        # log files can be concatenated and sorted)
        formatter = logging.Formatter(
            fmt="%(asctime)s.%(msecs)03d000Z %(name)s (%(levelname)s): %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
        formatter.converter = time.gmtime
        fh.setFormatter(formatter)
        ch.setFormatter(formatter)
        # add the handlers to the logger
        self.log.addHandler(fh)
        self.log.addHandler(ch)

        if self.options.trace_rpc:
            rpc_logger = logging.getLogger("BitcoinRPC")
            rpc_logger.setLevel(logging.DEBUG)
            rpc_handler = logging.StreamHandler(sys.stdout)
            rpc_handler.setLevel(logging.DEBUG)
            rpc_logger.addHandler(rpc_handler)

    def _initialize_chain(self):
        """Initialize a pre-mined blockchain for use by the test.

        Create a cache of a 199-block-long chain
        Afterward, create num_nodes copies from the cache."""

        # Use node 0 to create the cache for all other nodes
        CACHE_NODE_ID = 0
        cache_node_dir = get_datadir_path(self.options.cachedir, CACHE_NODE_ID)
        assert self.num_nodes <= MAX_NODES

        if not os.path.isdir(cache_node_dir):
            self.log.debug(f"Creating cache directory {cache_node_dir}")

            initialize_datadir(
                self.options.cachedir,
                CACHE_NODE_ID,
                self.chain,
                self.disable_autoconnect,
            )
            self.nodes.append(
                TestNode(
                    CACHE_NODE_ID,
                    cache_node_dir,
                    chain=self.chain,
                    extra_conf=["bind=127.0.0.1"],
                    extra_args=["-disablewallet"],
                    host=None,
                    rpc_port=rpc_port(CACHE_NODE_ID),
                    p2p_port=p2p_port(CACHE_NODE_ID),
                    chronik_port=chronik_port(CACHE_NODE_ID),
                    timewait=self.rpc_timeout,
                    timeout_factor=self.options.timeout_factor,
                    bitcoind=self.options.bitcoind,
                    bitcoin_cli=self.options.bitcoincli,
                    coverage_dir=None,
                    cwd=self.options.tmpdir,
                    descriptors=self.options.descriptors,
                    emulator=self.options.emulator,
                )
            )

            if self.options.cowperthwaiteactivation:
                self.nodes[CACHE_NODE_ID].extend_default_args(
                    [f"-cowperthwaiteactivationtime={TIMESTAMP_IN_THE_PAST}"]
                )

            self.start_node(CACHE_NODE_ID)
            cache_node = self.nodes[CACHE_NODE_ID]

            # Wait for RPC connections to be ready
            cache_node.wait_for_rpc_connection()

            # Set a time in the past, so that blocks don't end up in the future
            cache_node.setmocktime(
                cache_node.getblockheader(cache_node.getbestblockhash())["time"]
            )

            # Create a 199-block-long chain; each of the 3 first nodes gets 25
            # mature blocks and 25 immature.
            # The 4th address gets 25 mature and only 24 immature blocks so that
            # the very last block in the cache does not age too much (have an
            # old tip age).
            # This is needed so that we are out of IBD when the test starts,
            # see the tip age check in IsInitialBlockDownload().
            gen_addresses = [k.address for k in TestNode.PRIV_KEYS][:3] + [
                ADDRESS_ECREG_P2SH_OP_TRUE
            ]
            assert_equal(len(gen_addresses), 4)
            for i in range(8):
                self.generatetoaddress(
                    cache_node,
                    nblocks=25 if i != 7 else 24,
                    address=gen_addresses[i % len(gen_addresses)],
                )

            assert_equal(cache_node.getblockchaininfo()["blocks"], 199)

            # Shut it down, and clean up cache directories:
            self.stop_nodes()
            self.nodes = []

            def cache_path(*paths):
                return os.path.join(cache_node_dir, self.chain, *paths)

            # Remove empty wallets dir
            os.rmdir(cache_path("wallets"))
            for entry in os.listdir(cache_path()):
                # Only keep indexes, chainstate and blocks folders
                if entry not in ["chainstate", "blocks", "indexes"]:
                    os.remove(cache_path(entry))

        for i in range(self.num_nodes):
            self.log.debug(f"Copy cache directory {cache_node_dir} to node {i}")
            to_dir = get_datadir_path(self.options.tmpdir, i)
            shutil.copytree(cache_node_dir, to_dir)
            # Overwrite port/rpcport in bitcoin.conf
            initialize_datadir(
                self.options.tmpdir,
                i,
                self.chain,
                self.disable_autoconnect,
            )

    def _initialize_chain_clean(self):
        """Initialize empty blockchain for use by the test.

        Create an empty blockchain and num_nodes wallets.
        Useful if a test case wants complete control over initialization."""
        for i in range(self.num_nodes):
            initialize_datadir(
                self.options.tmpdir,
                i,
                self.chain,
                self.disable_autoconnect,
            )

    def skip_if_no_py3_zmq(self):
        """Attempt to import the zmq package and skip the test if the import fails."""
        try:
            import zmq  # noqa
        except ImportError:
            raise SkipTest("python3-zmq module not available.")

    def skip_if_no_python_bcc(self):
        """Attempt to import the bcc package and skip the tests if the import fails."""
        try:
            import bcc  # type: ignore[import] # noqa: F401
        except ImportError:
            raise SkipTest("bcc python module not available")

    def skip_if_no_bitcoind_tracepoints(self):
        """Skip the running test if bitcoind has not been compiled with USDT tracepoint support."""
        if not self.is_usdt_compiled():
            raise SkipTest("bitcoind has not been built with USDT tracepoints enabled.")

    def skip_if_no_bpf_permissions(self):
        """Skip the running test if we don't have permissions to do BPF syscalls and load BPF maps."""
        # check for 'root' permissions
        if os.geteuid() != 0:
            raise SkipTest(
                "no permissions to use BPF (please review the tests carefully before"
                " running them with higher privileges)"
            )

    def skip_if_platform_not_linux(self):
        """Skip the running test if we are not on a Linux platform"""
        if platform.system() != "Linux":
            raise SkipTest("not on a Linux system")

    def skip_if_no_bitcoind_zmq(self):
        """Skip the running test if bitcoind has not been compiled with zmq support."""
        if not self.is_zmq_compiled():
            raise SkipTest("bitcoind has not been built with zmq enabled.")

    def skip_if_no_wallet(self):
        """Skip the running test if wallet has not been compiled."""
        if not self.is_wallet_compiled():
            raise SkipTest("wallet has not been compiled.")

    def skip_if_no_wallet_tool(self):
        """Skip the running test if bitcoin-wallet has not been compiled."""
        if not self.is_wallet_tool_compiled():
            raise SkipTest("bitcoin-wallet has not been compiled")

    def skip_if_no_cli(self):
        """Skip the running test if bitcoin-cli has not been compiled."""
        if not self.is_cli_compiled():
            raise SkipTest("bitcoin-cli has not been compiled.")

    def skip_if_no_chronik(self):
        """Skip the running test if Chronik indexer has not been compiled."""
        if not self.is_chronik_compiled():
            raise SkipTest("Chronik indexer has not been compiled.")

    def is_cli_compiled(self):
        """Checks whether bitcoin-cli was compiled."""
        return self.config["components"].getboolean("ENABLE_CLI")

    def is_wallet_compiled(self):
        """Checks whether the wallet module was compiled."""
        return self.config["components"].getboolean("ENABLE_WALLET")

    def is_wallet_tool_compiled(self):
        """Checks whether bitcoin-wallet was compiled."""
        return self.config["components"].getboolean("ENABLE_WALLET_TOOL")

    def is_chronik_compiled(self):
        """Checks whether Chronik indexer was compiled."""
        return self.config["components"].getboolean("ENABLE_CHRONIK")

    def is_zmq_compiled(self):
        """Checks whether the zmq module was compiled."""
        return self.config["components"].getboolean("ENABLE_ZMQ")

    def is_usdt_compiled(self):
        """Checks whether the USDT tracepoints were compiled."""
        return self.config["components"].getboolean("ENABLE_USDT_TRACEPOINTS")
