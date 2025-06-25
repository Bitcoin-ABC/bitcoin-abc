# Electrum ABC - lightweight eCash client
# Copyright (C) 2025-present The Electrum ABC developers
#
# Permission is hereby granted, free of charge, to any person
# obtaining a copy of this software and associated documentation files
# (the "Software"), to deal in the Software without restriction,
# including without limitation the rights to use, copy, modify, merge,
# publish, distribute, sublicense, and/or sell copies of the Software,
# and to permit persons to whom the Software is furnished to do so,
# subject to the following conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
# BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
# ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

import contextlib
import os
import shutil
import sys
import tempfile
import unittest

from .util import (
    make_tmp_electrum_data_dir,
    start_ec_daemon,
    stop_ec_daemon,
)

sys.path.append(
    os.path.join(
        os.path.dirname(__file__), "..", "..", "..", "..", "test", "functional"
    )
)
from test_framework.test_node import TestNode  # noqa: E402
from test_framework.util import (  # noqa: E402
    PortSeed,
    chronik_port,
    get_datadir_path,
    initialize_datadir,
    p2p_port,
    rpc_port,
)


class ElectrumABCTestCase(unittest.TestCase):
    """Test case with an Electrum server provided by a Bitcoin ABC node and with
    an Electrum ABC daemon running.
    """

    def setUp(self):
        super(ElectrumABCTestCase, self).setUp()
        PortSeed.n = os.getpid()

        self.electrum_data_dir = make_tmp_electrum_data_dir()

        self.tmpdir = tmpdir = tempfile.mkdtemp(prefix="electrum_func_test_")
        configs_dir = os.path.join(
            os.path.dirname(os.path.realpath(__file__)), "configs"
        )
        initialize_datadir(tmpdir, 0, "regtest")

        self.node = TestNode(
            0,
            get_datadir_path(tmpdir, 0),
            chain="regtest",
            host="127.0.0.1",
            rpc_port=rpc_port(0),
            p2p_port=p2p_port(0),
            chronik_port=chronik_port(0),
            chronik_electrum_port=51001,
            timewait=60,
            timeout_factor=1,
            bitcoind=os.getenv("BITCOIND"),
            bitcoin_cli=os.getenv("BITCOINCLI"),  # needed?
            coverage_dir=None,
            cwd=tmpdir,
            extra_args=[
                "-chronik=1",
                "-chronikelectrumbind=127.0.0.1:51002:s",
                f"-chronikelectrumcert={os.path.join(configs_dir, 'server.crt')}",
                f"-chronikelectrumprivkey={os.path.join(configs_dir, 'server.key')}",
            ],
        )
        self.node.start()
        self.node.wait_for_rpc_connection()
        self.node.createwallet("test_wallet")
        addr = self.node.getnewaddress()
        self.node.generatetoaddress(101, addr, invalid_call=False)

        start_ec_daemon(self.electrum_data_dir)

    def generatetoaddress(self, nblocks, addr):
        return self.node.generatetoaddress(nblocks, addr, invalid_call=False)

    def tearDown(self):
        super(ElectrumABCTestCase, self).tearDown()
        stop_ec_daemon(self.electrum_data_dir)
        # Remove the data directory, ignore race conditions caused by tmp wallet files
        # created and deleted in WalletStorage._write while the daemon process is
        # stopping
        # See https://github.com/python/cpython/pull/14064
        with contextlib.suppress(FileNotFoundError):
            shutil.rmtree(self.electrum_data_dir)

        self.node.stop_node()
        self.node.wait_until_stopped()
        shutil.rmtree(self.tmpdir)
