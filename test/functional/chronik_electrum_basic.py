# Copyright (c) 2024-present The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's electrum interface
"""

import json

import websocket
from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.blocktools import GENESIS_BLOCK_HASH
from test_framework.test_framework import BitcoinTestFramework
from test_framework.test_node import ErrorMatch
from test_framework.util import assert_equal, chronikelectrum_port, get_cli_version

ELECTRUM_PROTOCOL_VERSION = "1.4"


class ChronikElectrumBasic(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 3
        self.chronik_url = "localhost"
        self.chronik_port = [chronikelectrum_port(i) for i in range(self.num_nodes)]
        self.extra_args = [
            [
                "-chronik",
                f"-chronikelectrumbind=127.0.0.1:{self.chronik_port[0]}:t",
                f"-chronikelectrumurl={self.chronik_url}",
                # Validate the peers as fast as possible for the test
                "-chronikelectrumpeersvalidationinterval=1",
            ],
            [
                "-chronik",
                f"-chronikelectrumbind=127.0.0.1:{self.chronik_port[1]}:t",
                "-chronikelectrumpeersvalidationinterval=1",
            ],
            [
                "-chronik",
                f"-chronikelectrumbind=127.0.0.1:{self.chronik_port[2]}:w",
                f"-chronikelectrumurl={self.chronik_url}",
            ],
        ]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        self.node = self.nodes[0]
        self.client = self.node.get_chronik_electrum_client()
        self.test_rpc_errors()
        self.test_donation_address()
        self.test_ping()
        self.test_server_version()
        self.test_server_peers()
        self.test_server_features()
        self.test_server_banner()
        self.test_ws()
        # Run this last as it invalidates self.client
        self.test_init_errors()

    def test_rpc_errors(self):
        """Test adherence to the JSON RPC spec (error codes...)
        See https://www.jsonrpc.org/specification
        """
        response = self.client.foobar()
        assert_equal(response.result, None)
        assert_equal(response.error, {"code": -32600, "message": "Invalid request"})

        response = self.client.spam.foo.bar()
        assert_equal(response.result, None)
        assert_equal(response.error, {"code": -32601, "message": "Method not found"})

        response = self.client.server.ping("spam")
        assert_equal(
            response.error, {"code": -32602, "message": "Expected at most 0 parameters"}
        )

    def test_donation_address(self):
        assert_equal(self.client.server.donation_address().result, "")

        self.node.stop_node()
        self.node.assert_start_raises_init_error(
            self.extra_args[0] + [f"-chronikelectrumdonationaddress={81 * 'a'}"],
            "Error: The -chronikelectrumdonationaddress parameter must be at most 80 characters long.",
        )

        for address in ("lorem_ipsum", ADDRESS_ECREG_UNSPENDABLE, 80 * "a"):
            self.restart_node(
                0,
                extra_args=self.extra_args[0]
                + [f"-chronikelectrumdonationaddress={address}"],
            )
            self.client = self.node.get_chronik_electrum_client()
            assert_equal(self.client.server.donation_address().result, address)

    def test_ping(self):
        # This method return {... "result":null} which JSON-decodes to None
        response = self.client.server.ping()
        assert_equal(response.result, None)
        assert_equal(response.error, None)

    def test_server_version(self):
        # We only support version "1.4" (exact match or within min-max range)
        expected_success_response = [
            f"{self.config['environment']['PACKAGE_NAME']} {get_cli_version(self, self.node)}",
            ELECTRUM_PROTOCOL_VERSION,
        ]
        # This is the usual call Electrum ABC will do, with a single version string
        assert_equal(
            self.client.server.version(
                "Electrum ABC 1.2.3", ELECTRUM_PROTOCOL_VERSION
            ).result,
            expected_success_response,
        )

        # The spec says we should support ranges as version tuples
        for version_tuple in (
            ("1.3.0", "1.5.0"),
            ("1.3", "1.5"),
            ("1.3", "1.4"),
            ("1.4", "1.5"),
            ("1.4", "1.4"),
            ["1.3.9", "1.4.1"],
        ):
            assert_equal(
                self.client.server.version("Electrum ABC 1.2.3", version_tuple).result,
                expected_success_response,
            )

        for unsupported_version in (None, 42, "1.3", "1.4.0", "toto"):
            assert_equal(
                self.client.server.version("", unsupported_version).error,
                {"code": 1, "message": "Unsupported protocol version"},
            )
        # Valid unsupported ranges
        for version_tuple in (("1.2", "1.3"), ("1.3.8", "1.3.9"), ("1.5", "1.6")):
            assert_equal(
                self.client.server.version("", version_tuple).error,
                {"code": 1, "message": "Unsupported protocol version"},
            )

        # More than 2 versions provided as range
        assert_equal(
            self.client.server.version("", ("1.4", "1.4", "1.4")).error,
            {"code": 1, "message": "Unsupported protocol version"},
        )

    def test_server_peers(self):
        self.log.info("Testing the server.peers endpoints")

        # For now peers.subscribe always returns an empty array. This is so
        # while peer validation is not implemented. After this is completed the
        # below calls to subscribe can be uncommented.
        assert_equal(
            self.client.server.peers.subscribe().result,
            [],
        )

        features = {
            "genesis_hash": GENESIS_BLOCK_HASH,
            "hash_function": "sha256",
            "server_version": "Test framework v1.2.3",
            "protocol_min": "1.4",
            "protocol_max": "1.4.5",
            "pruning": 1000,
            "hosts": {
                "localhost": {
                    "tcp_port": self.chronik_port[0],
                },
            },
            "dsproof": False,
        }

        assert_equal(
            self.client.server.add_peer(features).result,
            True,
        )

        self.wait_until(
            lambda: self.client.server.peers.subscribe().result
            == [
                [
                    "127.0.0.1",
                    "localhost",
                    [
                        "v1.4.5",
                        "p1000",
                        f"t{self.chronik_port[0]}",
                    ],
                ],
            ],
        )

        # Re-submitting is forbidden
        assert_equal(
            self.client.server.add_peer(features).result,
            False,
        )

        # All optional fields are absent but the tcp port,
        # use an ip address as the host
        features = {
            "genesis_hash": GENESIS_BLOCK_HASH,
            "hash_function": "sha256",
            "server_version": "Test framework v1.2.3",
            "protocol_min": "1.4",
            "protocol_max": "1.4.5",
            "hosts": {
                "127.0.0.1": {
                    "tcp_port": self.chronik_port[1],
                },
            },
            "dsproof": False,
        }
        assert_equal(
            self.client.server.add_peer(features).result,
            True,
        )
        self.wait_until(
            lambda: self.client.server.peers.subscribe().result
            == [
                [
                    "127.0.0.1",
                    "localhost",
                    [
                        "v1.4.5",
                        "p1000",
                        f"t{self.chronik_port[0]}",
                    ],
                ],
                [
                    "127.0.0.1",
                    "127.0.0.1",
                    [
                        "v1.4.5",
                        f"t{self.chronik_port[1]}",
                    ],
                ],
            ],
        )

        # No host
        features = {
            "genesis_hash": GENESIS_BLOCK_HASH,
            "hash_function": "sha256",
            "server_version": "Test framework v1.2.3",
            "protocol_min": "1.4",
            "protocol_max": "1.4.5",
            "pruning": 1000,
            "dsproof": False,
        }
        assert_equal(
            self.client.server.add_peer(features).result,
            False,
        )

        # Missing protocol max version
        features = {
            "genesis_hash": GENESIS_BLOCK_HASH,
            "hash_function": "sha256",
            "server_version": "Test framework v1.2.3",
            "protocol_min": "1.4",
            "hosts": {
                "0.0.0.1": {},
            },
            "dsproof": False,
        }
        assert_equal(
            self.client.server.add_peer(features).result,
            False,
        )

        # Check we can disable peer validation
        self.stop_node(1)
        with self.nodes[1].assert_debug_log(
            [
                "Electrum peers validation is disabled, server.peers.subscribe will not share any peer"
            ]
        ):
            self.start_node(
                1,
                extra_args=self.extra_args[1]
                + ["-chronikelectrumpeersvalidationinterval=0"],
            )

    def test_server_features(self):
        version = f"{self.config['environment']['PACKAGE_NAME']} {get_cli_version(self, self.node)}"
        assert_equal(
            self.client.server.features().result,
            {
                "genesis_hash": GENESIS_BLOCK_HASH,
                "hash_function": "sha256",
                "server_version": version,
                "protocol_min": "1.4",
                "protocol_max": "1.4.5",
                "pruning": None,
                "hosts": {
                    self.chronik_url: {
                        "tcp_port": chronikelectrum_port(0),
                    },
                },
                "dsproof": False,
            },
        )

    def test_server_banner(self):
        version = f"{self.config['environment']['PACKAGE_NAME']} {get_cli_version(self, self.node)}"
        assert_equal(
            self.client.server.banner().result,
            f"Connected to {version} server",
        )

    def test_ws(self):
        self.log.info("Test the websocket transport")

        features_request = {
            "jsonrpc": "2.0",
            "method": "server.features",
            "params": [],
            "id": 42,
        }

        ws = websocket.WebSocket()
        ws.connect(f"ws://127.0.0.1:{self.chronik_port[2]}", timeout=60)
        ws.send(json.dumps(features_request))

        features_reponse = json.loads(ws.recv())

        assert_equal(features_reponse["id"], 42)
        version = f"{self.config['environment']['PACKAGE_NAME']} {get_cli_version(self, self.node)}"
        assert_equal(
            features_reponse["result"],
            {
                "genesis_hash": GENESIS_BLOCK_HASH,
                "hash_function": "sha256",
                "server_version": version,
                "protocol_min": "1.4",
                "protocol_max": "1.4.5",
                "pruning": None,
                "hosts": {
                    self.chronik_url: {
                        "ws_port": self.chronik_port[2],
                    },
                },
                "dsproof": False,
            },
        )

        ws.close()

    def test_init_errors(self):
        self.node.stop_node()
        self.node.assert_start_raises_init_error(
            [
                "-chronik",
                f"-chronikelectrumbind=127.0.0.1:{chronikelectrum_port(0)}:t",
                "-chronikscripthashindex=0",
            ],
            "Error: The -chronikelectrumbind option requires -chronikscripthashindex to be true.",
        )

        # Chronik Electrum default to TLS if the protocol is not set
        self.node.assert_start_raises_init_error(
            [
                "-chronik",
                f"-chronikelectrumbind=127.0.0.1:{chronikelectrum_port(0)}",
            ],
            "Error: Chronik Electrum TLS configuration requires a certificate chain file (see -chronikelectrumcert)",
        )
        # Same result when the 's' protocol is explicitly set
        self.node.assert_start_raises_init_error(
            [
                "-chronik",
                f"-chronikelectrumbind=127.0.0.1:{chronikelectrum_port(0)}:s",
            ],
            "Error: Chronik Electrum TLS configuration requires a certificate chain file (see -chronikelectrumcert)",
        )
        self.node.assert_start_raises_init_error(
            [
                "-chronik",
                "-chronikelectrumcert=dummy",
                f"-chronikelectrumbind=127.0.0.1:{chronikelectrum_port(0)}",
            ],
            "Error: The -chronikelectrumcert and -chronikelectrumprivkey options should both be set or unset.",
        )
        self.node.assert_start_raises_init_error(
            [
                "-chronik",
                "-chronikelectrumprivkey=dummy",
                f"-chronikelectrumbind=127.0.0.1:{chronikelectrum_port(0)}",
            ],
            "Error: The -chronikelectrumcert and -chronikelectrumprivkey options should both be set or unset.",
        )
        self.node.assert_start_raises_init_error(
            [
                "-chronik",
                "-chronikelectrumcert=dummy",
                "-chronikelectrumprivkey=dummy",
                f"-chronikelectrumbind=127.0.0.1:{chronikelectrum_port(0)}",
            ],
            "Error: Chronik Electrum TLS configuration failed to open the certificate chain file dummy",
            match=ErrorMatch.PARTIAL_REGEX,
        )

        # The peers validation interval must be within range
        self.node.assert_start_raises_init_error(
            [
                "-chronik",
                f"-chronikelectrumbind=127.0.0.1:{chronikelectrum_port(0)}:t",
                "-chronikelectrumpeersvalidationinterval=-1",
            ],
            "Error: The -chronikelectrumpeersvalidationinterval value should be "
            "within the range [1, 4294967295]",
        )
        self.node.assert_start_raises_init_error(
            [
                "-chronik",
                f"-chronikelectrumbind=127.0.0.1:{chronikelectrum_port(0)}:t",
                "-chronikelectrumpeersvalidationinterval=4294967296",
            ],
            "Error: The -chronikelectrumpeersvalidationinterval value should be "
            "within the range [1, 4294967295]",
        )

        self.start_node(0, self.extra_args[0])


if __name__ == "__main__":
    ChronikElectrumBasic().main()
