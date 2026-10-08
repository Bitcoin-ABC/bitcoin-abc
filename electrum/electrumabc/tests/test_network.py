# Electrum ABC - lightweight eCash client
# Copyright (c) 2026 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.


import unittest
from unittest.mock import MagicMock, patch

from .. import networks
from ..network import Network
from ..simple_config import SimpleConfig


class TestNetworkOnNotifyHeader(unittest.TestCase):
    def setUp(self):
        with patch.object(Network, "__init__", return_value=None):
            self.network = Network(SimpleConfig())
        self.network.connection_down = MagicMock()
        self.interface = MagicMock()
        self.interface.server = "test.server:50002"
        self.interface.tip_header = None
        self.interface.tip = None

    def test_connection_down_when_header_dict_not_dict(self):
        """Malformed: header_dict is not a dict."""
        for bad in (None, [], "string", 42, True):
            self.network.on_notify_header(self.interface, bad)
            self.network.connection_down.assert_called_once_with(self.interface.server)
            self.network.connection_down.reset_mock()

    def test_connection_down_when_missing_hex(self):
        """Malformed: missing 'hex' key."""
        header_dict = {"height": 100}
        self.network.on_notify_header(self.interface, header_dict)
        self.network.connection_down.assert_called_once_with(self.interface.server)

    def test_connection_down_when_missing_height(self):
        """Malformed: missing 'height' key."""
        header_dict = {"hex": "00" * 80}
        self.network.on_notify_header(self.interface, header_dict)
        self.network.connection_down.assert_called_once_with(self.interface.server)

    def test_connection_down_when_height_not_int(self):
        """Malformed: 'height' is not an int.
        Note that in python bool is a subclass of int, but we disconnect anyway
        in this case because of the height <= VERIFICATION_BLOCK_HEIGHT condition
        """
        for bad_height in ("100", 100.5, None, [], {}, True, False):
            self.network.connection_down.reset_mock()
            header_dict = {"hex": "00" * 80, "height": bad_height}
            self.network.on_notify_header(self.interface, header_dict)
            self.network.connection_down.assert_called_once_with(self.interface.server)

    def test_connection_down_on_deserialize_header_exceptions(self):
        """Malformed hex / bad data that makes deserialize_header raise."""
        header_too_short = "00" * 78
        header_non_hex = "spam"
        headers_non_string = (1, None, [], b"deadbeef")

        for bad_header in (header_too_short, header_non_hex, *headers_non_string):
            self.network.connection_down.reset_mock()
            header_dict = {"hex": bad_header, "height": 1000}
            self.network.on_notify_header(self.interface, header_dict)
            self.network.connection_down.assert_called_once_with(self.interface.server)

    def test_connection_down_when_height_behind_verification(self):
        """Server height <= VERIFICATION_BLOCK_HEIGHT → drop connection."""
        checkpoint_height = networks.net.VERIFICATION_BLOCK_HEIGHT

        header_dict = {"hex": "00" * 80, "height": checkpoint_height}
        self.network.on_notify_header(self.interface, header_dict)
        self.network.connection_down.assert_called_once_with(self.interface.server)

        self.network.connection_down.reset_mock()
        header_dict = {"hex": "00" * 80, "height": checkpoint_height - 1}
        self.network.on_notify_header(self.interface, header_dict)
        self.network.connection_down.assert_called_once_with(self.interface.server)

    def test_happy_path_does_not_close_connection(self):
        """Sanity: valid header does not call connection_down."""
        self.network.request_initial_proof_and_headers = MagicMock()
        self.network._process_latest_tip = MagicMock()

        valid_server_height = networks.net.VERIFICATION_BLOCK_HEIGHT + 100
        header_hex = "00" * 80
        expected_header = {
            "version": 0,
            "prev_block_hash": 32 * "00",
            "merkle_root": 32 * "00",
            "timestamp": 0,
            "bits": 0,
            "nonce": 0,
            "block_height": valid_server_height,
        }
        header_dict = {"hex": header_hex, "height": valid_server_height}
        self.network.on_notify_header(self.interface, header_dict)
        self.network.connection_down.assert_not_called()
        self.assertEqual(self.interface.tip_header, expected_header)
        self.assertEqual(self.interface.tip, valid_server_height)


if __name__ == "__main__":
    unittest.main()
