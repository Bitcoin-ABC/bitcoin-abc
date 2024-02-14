# Copyright (c) 2018-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Tests some generic aspects of the RPC interface."""

import multiprocessing
import os
import subprocess
import time

from test_framework.authproxy import JSONRPCException
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_greater_than_or_equal


def expect_http_status(expected_http_status, expected_rpc_code, fcn, *args):
    try:
        fcn(*args)
        raise AssertionError(f"Expected RPC error {expected_rpc_code}, got none")
    except JSONRPCException as exc:
        assert_equal(exc.error["code"], expected_rpc_code)
        assert_equal(exc.http_status, expected_http_status)


def test_work_queue_getrpcinfo(node, error_queue, stop_queue):
    got_error = False
    while not got_error and stop_queue.empty():
        try:
            node.cli("getrpcinfo").send_cli()
        except subprocess.CalledProcessError as e:
            error_queue.put(e.output)
            got_error = True


class RPCInterfaceTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.supports_cli = False

    def test_getrpcinfo(self):
        self.log.info("Testing getrpcinfo...")

        info = self.nodes[0].getrpcinfo()
        assert_equal(len(info["active_commands"]), 1)

        command = info["active_commands"][0]
        assert_equal(command["method"], "getrpcinfo")
        assert_greater_than_or_equal(command["duration"], 0)
        assert_equal(
            info["logpath"],
            os.path.join(self.nodes[0].datadir, self.chain, "debug.log"),
        )

    def test_batch_request(self):
        self.log.info("Testing basic JSON-RPC batch request...")

        results = self.nodes[0].batch(
            [
                # A basic request that will work fine.
                {"method": "getblockcount", "id": 1},
                # Request that will fail.  The whole batch request should still
                # work fine.
                {"method": "invalidmethod", "id": 2},
                # Another call that should succeed.
                {"method": "getblockhash", "id": 3, "params": [0]},
            ]
        )

        result_by_id = {}
        for res in results:
            result_by_id[res["id"]] = res

        assert_equal(result_by_id[1]["error"], None)
        assert_equal(result_by_id[1]["result"], 0)

        assert_equal(result_by_id[2]["error"]["code"], -32601)
        assert_equal(result_by_id[2]["result"], None)

        assert_equal(result_by_id[3]["error"], None)
        assert result_by_id[3]["result"] is not None

    def test_http_status_codes(self):
        self.log.info("Testing HTTP status codes for JSON-RPC requests...")

        expect_http_status(404, -32601, self.nodes[0].invalidmethod)
        expect_http_status(500, -8, self.nodes[0].getblockhash, 42)

    def test_work_queue_exceeded(self):
        if not self.is_cli_compiled():
            self.log.info("Skipping test_work_queue_exceeded (CLI not compiled)")
            return

        self.log.info("Testing work queue exceeded...")
        self.restart_node(0, ["-rpcworkqueue=1", "-rpcthreads=1"])
        processes = []
        error_queue = multiprocessing.Queue()
        stop_queue = multiprocessing.Queue()
        for _ in range(3):
            p = multiprocessing.Process(
                target=test_work_queue_getrpcinfo,
                args=(self.nodes[0], error_queue, stop_queue),
            )
            p.start()
            processes.append(p)

        while error_queue.empty():
            time.sleep(0.1)
        stop_queue.put(True)
        for p in processes:
            p.join()
        while not error_queue.empty():
            assert_equal(
                error_queue.get(), "error: Server response: Work queue depth exceeded\n"
            )

    def run_test(self):
        self.test_getrpcinfo()
        self.test_batch_request()
        self.test_http_status_codes()
        self.test_work_queue_exceeded()


if __name__ == "__main__":
    # Setting the multiprocessing start method to "spawn" causes the test to fail
    # on all platforms. Not setting it causes a failure on Mac OS, because it defaults
    # to spawn (for python 3.8+).
    multiprocessing.set_start_method("fork")
    RPCInterfaceTest().main()
