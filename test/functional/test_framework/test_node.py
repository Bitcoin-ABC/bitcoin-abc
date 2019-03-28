#!/usr/bin/env python3
# Copyright (c) 2017 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Class for bitcoind node under test"""

import decimal
import errno
import http.client
import json
import logging
import os
import re
import subprocess
import sys
import time

from .authproxy import JSONRPCException
from .messages import COIN, CTransaction, FromHex
from .util import (
    assert_equal,
    get_rpc_proxy,
    p2p_port,
    rpc_url,
    wait_until,
)

# For Python 3.4 compatibility
JSONDecodeError = getattr(json, "JSONDecodeError", ValueError)

BITCOIND_PROC_WAIT_TIMEOUT = 60


class TestNode():
    """A class for representing a bitcoind node under test.

    This class contains:

    - state about the node (whether it's running, etc)
    - a Python subprocess.Popen object representing the running process
    - an RPC connection to the node
    - one or more P2P connections to the node

    To make things easier for the test writer, any unrecognised messages will
    be dispatched to the RPC connection."""

    def __init__(self, i, dirname, extra_args, host, rpc_port, p2p_port, timewait, binary, stderr, mocktime, coverage_dir, use_cli=False):
        self.index = i
        self.datadir = os.path.join(dirname, "node" + str(i))
        self.host = host
        self.rpc_port = rpc_port
        self.p2p_port = p2p_port
        self.name = "testnode-{}".format(i)
        if timewait:
            self.rpc_timeout = timewait
        else:
            # Wait for up to 60 seconds for the RPC server to respond
            self.rpc_timeout = 60
        if binary is None:
            self.binary = os.getenv("BITCOIND", "bitcoind")
        else:
            self.binary = binary
        if not os.path.isfile(self.binary):
            raise FileNotFoundError(
                "Binary '{}' could not be found.\nTry setting it manually:\n\tBITCOIND=<path/to/bitcoind> {}".format(self.binary, sys.argv[0]))
        self.stderr = stderr
        self.coverage_dir = coverage_dir
        # Most callers will just need to add extra args to the default list
        # below.
        # For those callers that need more flexibity, they can access the
        # default args using the provided facilities
        self.extra_args = extra_args
        self.default_args = ["-datadir=" + self.datadir, "-server", "-keypool=1", "-discover=0", "-rest", "-logtimemicros",
                             "-debug", "-debugexclude=libevent", "-debugexclude=leveldb", "-mocktime=" + str(mocktime), "-uacomment=" + self.name]

        cli_path = os.getenv("BITCOINCLI", "bitcoin-cli")
        if not os.path.isfile(cli_path):
            raise FileNotFoundError(
                "Binary '{}' could not be found.\nTry setting it manually:\n\tBITCOINCLI=<path/to/bitcoin-cli> {}".format(cli_path, sys.argv[0]))
        self.cli = TestNodeCLI(cli_path, self.datadir)
        self.use_cli = use_cli

        self.running = False
        self.process = None
        self.rpc_connected = False
        self.rpc = None
        self.url = None
        self.relay_fee_cache = None
        self.log = logging.getLogger('TestFramework.node{}'.format(i))

        self.p2ps = []

    def __getattr__(self, name):
        """Dispatches any unrecognised messages to the RPC connection or a CLI instance."""
        if self.use_cli:
            return getattr(self.cli, name)
        else:
            assert self.rpc is not None, "Error: RPC not initialized"
            assert self.rpc_connected, "Error: No RPC connection"
            return getattr(self.rpc, name)

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
            self.default_args = [def_arg for def_arg in self.default_args
                                 if rm_arg != def_arg and not def_arg.startswith(rm_arg + '=')]

    def start(self, extra_args=None, stderr=None, *args, **kwargs):
        """Start the node."""
        if extra_args is None:
            extra_args = self.extra_args
        if stderr is None:
            stderr = self.stderr
        self.process = subprocess.Popen(
            [self.binary] + self.default_args + extra_args,
            stderr=stderr, *args, **kwargs)
        self.running = True
        self.log.debug("bitcoind started, waiting for RPC to come up")

    def wait_for_rpc_connection(self):
        """Sets up an RPC connection to the bitcoind process. Returns False if unable to connect."""
        # Poll at a rate of four times per second
        poll_per_s = 4
        for _ in range(poll_per_s * self.rpc_timeout):
            assert self.process.poll(
            ) is None, "bitcoind exited with status {} during initialization".format(self.process.returncode)
            try:
                self.rpc = get_rpc_proxy(rpc_url(self.datadir, self.host, self.rpc_port),
                                         self.index, timeout=self.rpc_timeout, coveragedir=self.coverage_dir)
                self.rpc.getblockcount()
                # If the call to getblockcount() succeeds then the RPC connection is up
                self.rpc_connected = True
                self.url = self.rpc.url
                self.log.debug("RPC successfully started")
                return
            except IOError as e:
                if e.errno != errno.ECONNREFUSED:  # Port not yet open?
                    raise  # unknown IO error
            except JSONRPCException as e:  # Initialization phase
                if e.error['code'] != -28:  # RPC in warmup?
                    raise  # unknown JSON RPC exception
            except ValueError as e:  # cookie file not found and no rpcuser or rpcassword. bitcoind still starting
                if "No RPC credentials" not in str(e):
                    raise
            time.sleep(1.0 / poll_per_s)
        raise AssertionError("Unable to connect to bitcoind")

    def get_wallet_rpc(self, wallet_name):
        if self.use_cli:
            return self.cli("-rpcwallet={}".format(wallet_name))
        else:
            assert self.rpc_connected
            assert self.rpc
            wallet_path = "wallet/{}".format(wallet_name)
            return self.rpc / wallet_path

    def stop_node(self):
        """Stop the node."""
        if not self.running:
            return
        self.log.debug("Stopping node")
        try:
            self.stop()
        except http.client.CannotSendRequest:
            self.log.exception("Unable to stop node.")
        del self.p2ps[:]

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
        assert_equal(return_code, 0)
        self.running = False
        self.process = None
        self.rpc_connected = False
        self.rpc = None
        self.log.debug("Node stopped")
        return True

    def wait_until_stopped(self, timeout=BITCOIND_PROC_WAIT_TIMEOUT):
        wait_until(self.is_node_stopped, timeout=timeout)

    def node_encrypt_wallet(self, passphrase):
        """"Encrypts the wallet.

        This causes bitcoind to shutdown, so this method takes
        care of cleaning up resources."""
        self.encryptwallet(passphrase)
        self.wait_until_stopped()

    def relay_fee(self, cached=True):
        if not self.relay_fee_cache or not cached:
            self.relay_fee_cache = self.getnetworkinfo()["relayfee"]

        return self.relay_fee_cache

    def calculate_fee(self, tx):
        # Relay fee is in satoshis per KB.  Thus the 1000, and the COIN added
        # to get back to an amount of satoshis.
        billable_size_estimate = tx.billable_size()
        # Add some padding for signatures
        # NOTE: Fees must be calculated before signatures are added,
        # so they will never be included in the billable_size above.
        billable_size_estimate += len(tx.vin) * 81

        return int(self.relay_fee() / 1000 * billable_size_estimate * COIN)

    def calculate_fee_from_txid(self, txid):
        ctx = FromHex(CTransaction(), self.getrawtransaction(txid))
        return self.calculate_fee(ctx)

    def add_p2p_connection(self, p2p_conn, *args, **kwargs):
        """Add a p2p connection to the node.

        This method adds the p2p connection to the self.p2ps list and also
        returns the connection to the caller."""
        if 'dstport' not in kwargs:
            kwargs['dstport'] = p2p_port(self.index)
        if 'dstaddr' not in kwargs:
            kwargs['dstaddr'] = '127.0.0.1'

        p2p_conn.peer_connect(*args, **kwargs)
        self.p2ps.append(p2p_conn)

        return p2p_conn

    @property
    def p2p(self):
        """Return the first p2p connection

        Convenience property - most tests only use a single p2p connection to each
        node, so this saves having to write node.p2ps[0] many times."""
        assert self.p2ps, "No p2p connection"
        return self.p2ps[0]

    def disconnect_p2ps(self):
        """Close all p2p connections to the node."""
        for p in self.p2ps:
            p.peer_disconnect()
        del self.p2ps[:]


class TestNodeCLIAttr:
    def __init__(self, cli, command):
        self.cli = cli
        self.command = command

    def __call__(self, *args, **kwargs):
        return self.cli.send_cli(self.command, *args, **kwargs)

    def get_request(self, *args, **kwargs):
        return lambda: self(*args, **kwargs)


class TestNodeCLI():
    """Interface to bitcoin-cli for an individual node"""

    def __init__(self, binary, datadir):
        self.args = []
        self.binary = binary
        self.datadir = datadir
        self.input = None
        self.log = logging.getLogger('TestFramework.bitcoincli')

    def __call__(self, *args, input=None):
        # TestNodeCLI is callable with bitcoin-cli command-line args
        cli = TestNodeCLI(self.binary, self.datadir)
        cli.args = [str(arg) for arg in args]
        cli.input = input
        return cli

    def __getattr__(self, command):
        return TestNodeCLIAttr(self, command)

    def batch(self, requests):
        results = []
        for request in requests:
            try:
                results.append(dict(result=request()))
            except JSONRPCException as e:
                results.append(dict(error=e))
        return results

    def send_cli(self, command, *args, **kwargs):
        """Run bitcoin-cli command. Deserializes returned string as python object."""

        pos_args = [str(arg) for arg in args]
        named_args = [str(key) + "=" + str(value)
                      for (key, value) in kwargs.items()]
        assert not (
            pos_args and named_args), "Cannot use positional arguments and named arguments in the same bitcoin-cli call"

        p_args = [self.binary, "-datadir=" + self.datadir] + self.args
        if named_args:
            p_args += ["-named"]
        p_args += [command] + pos_args + named_args
        self.log.debug("Running bitcoin-cli command: {}".format(command))
        process = subprocess.Popen(p_args, stdin=subprocess.PIPE,
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
        cli_stdout, cli_stderr = process.communicate(input=self.input)
        returncode = process.poll()
        if returncode:
            match = re.match(
                r'error code: ([-0-9]+)\nerror message:\n(.*)', cli_stderr)
            if match:
                code, message = match.groups()
                raise JSONRPCException(dict(code=int(code), message=message))
            # Ignore cli_stdout, raise with cli_stderr
            raise subprocess.CalledProcessError(
                returncode, self.binary, output=cli_stderr)
        try:
            return json.loads(cli_stdout, parse_float=decimal.Decimal)
        except JSONDecodeError:
            return cli_stdout.rstrip("\n")
