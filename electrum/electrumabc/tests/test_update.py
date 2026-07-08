#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2026-present The Electrum ABC developers
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

import os
import tempfile
import unittest
from unittest.mock import Mock, patch

from .. import update
from ..simple_config import SimpleConfig
from ..tor_downloader import TOR_BINARY_SHA256
from ..update import update_config
from ..version import VERSION_TUPLE

# Global for inspecting saved config. Reset to None before each test.
saved_config = None


def mock_save_user_config(config, user_dir):
    """Mock that captures the config instead of writing to disk."""
    global saved_config
    saved_config = config


VERY_OLD_VERSION = (4, 3, 0)


class TestUpdate(unittest.TestCase):
    def setUp(self):
        global saved_config
        saved_config = None

    @patch("electrumabc.update.read_user_config")
    @patch("electrumabc.update.save_user_config", side_effect=mock_save_user_config)
    def test_no_update_needed(self, mock_save, mock_read):
        """A config file with latest_version_used more recent than, or equal to, the
        current version is not updated."""
        for v in ((999, 0, 0), VERSION_TUPLE):
            config = {
                "latest_version_used": v,
            }
            mock_read.return_value = config

            update_config()

            mock_save.assert_not_called()
            # Should early-return
            self.assertIsNone(saved_config)

    @patch("electrumabc.update.read_user_config")
    @patch("electrumabc.update.save_user_config", side_effect=mock_save_user_config)
    def test_update_version(self, mock_save, mock_read):
        """Nothing needs updating, so we just bump the version."""
        config = {
            "latest_version_used": VERY_OLD_VERSION,
        }
        mock_read.return_value = config

        update_config()

        self.assertEqual(saved_config, {"latest_version_used": VERSION_TUPLE})

    @patch("electrumabc.update.read_user_config")
    @patch("electrumabc.update.save_user_config", side_effect=mock_save_user_config)
    def test_fee_update(self, mock_save, mock_read):
        """Old config files with old default fees are updated to the current default
        fee.
        """
        config = {
            "latest_version_used": VERY_OLD_VERSION,
            # old default
            "fee_per_kb": 80000,
        }
        mock_read.return_value = config

        update_config()

        self.assertEqual(saved_config["fee_per_kb"], SimpleConfig.default_fee_rate())
        self.assertEqual(saved_config["latest_version_used"], VERSION_TUPLE)

    @patch("electrumabc.update.read_user_config")
    @patch("electrumabc.update.save_user_config", side_effect=mock_save_user_config)
    def test_decimal_point_update(self, mock_save, mock_read):
        """In v5.0.0 we forced the default decimal places to 2 as part of the switch
        from BCHA to XEC.
        """
        config = {
            "latest_version_used": VERY_OLD_VERSION,
            "decimal_point": 8,
        }
        mock_read.return_value = config

        update_config()

        self.assertEqual(saved_config["decimal_point"], 2)
        self.assertEqual(saved_config["latest_version_used"], VERSION_TUPLE)

    @patch("electrumabc.update.read_user_config")
    @patch("electrumabc.update.save_user_config", side_effect=mock_save_user_config)
    def test_explorer_update(self, mock_save, mock_read):
        """In v5.1.5 we made users switch to the "eCash" explorer."""
        config = {
            "latest_version_used": VERY_OLD_VERSION,
            "block_explorer": "BitcoinABC",
        }
        mock_read.return_value = config

        update_config()

        self.assertEqual(saved_config["block_explorer"], "eCash")
        self.assertEqual(saved_config["latest_version_used"], VERSION_TUPLE)

        # If people changed it back to another explorer after 5.1.5
        # we assumed they really wanted another explorer
        config = {
            "latest_version_used": (5, 1, 5),
            "block_explorer": "BitcoinABC",
        }
        mock_read.return_value = config

        update_config()

        self.assertEqual(saved_config["block_explorer"], "BitcoinABC")
        self.assertEqual(saved_config["latest_version_used"], VERSION_TUPLE)

    @patch("electrumabc.update.read_user_config")
    @patch("electrumabc.update.save_user_config", side_effect=mock_save_user_config)
    def test_cashaddr_update(self, mock_save, mock_read):
        """In v5.1.7 we removed support for "CashAddr BCH" addresses"""
        config = {
            "latest_version_used": VERY_OLD_VERSION,
            "address_format": "CashAddr BCH",
        }
        mock_read.return_value = config

        update_config()

        self.assertEqual(saved_config["address_format"], "CashAddr")
        self.assertEqual(saved_config["latest_version_used"], VERSION_TUPLE)

        # legacy BTC addresses are still supported as of today
        config = {
            "latest_version_used": VERY_OLD_VERSION,
            "address_format": "legacy",
        }
        mock_read.return_value = config
        update_config()
        self.assertEqual(saved_config["address_format"], "legacy")
        self.assertEqual(saved_config["latest_version_used"], VERSION_TUPLE)

    @patch("electrumabc.update.read_user_config")
    @patch("electrumabc.update.save_user_config", side_effect=mock_save_user_config)
    def test_tor_update(self, mock_save, mock_read):
        """After 5.5.0, we no longer store the downloaded_tor_path in the config file
        and we delete the previous tor binary from the data directory so users are
        prompted to download the new tor 4.9.11.
        """
        config = {
            "latest_version_used": VERY_OLD_VERSION,
            "downloaded_tor_path": "/foo/bar",
        }
        mock_read.return_value = config

        self.tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmpdir.cleanup)

        tor_path = os.path.join(self.tmpdir.name, "tor", "tor")

        os.mkdir(os.path.dirname(tor_path))
        with open(tor_path, "wb") as f:
            f.write(b"")

        # patch TOR_BINARY_PATH so update will use our temp dir
        bck_tor_binary_path = update.TOR_BINARY_PATH
        update.TOR_BINARY_PATH = tor_path

        update_config()

        self.assertNotIn("downloaded_tor_path", saved_config)
        self.assertEqual(saved_config["latest_version_used"], VERSION_TUPLE)

        # The file is deleted
        self.assertFalse(os.path.isfile(tor_path))

        # Recreate it
        with open(tor_path, "wb") as f:
            f.write(b"")

        # Now patch hashlib so the update process thinks the tor binary is up to date
        with patch("hashlib.sha256") as mock_sha256:
            fake_hash = Mock()
            fake_hash.hexdigest.return_value = TOR_BINARY_SHA256
            mock_sha256.return_value = fake_hash

            config = {
                "latest_version_used": VERY_OLD_VERSION,
            }
            mock_read.return_value = config
            self.assertTrue(os.path.isfile(update.TOR_BINARY_PATH))

            update_config()

            self.assertEqual(saved_config["latest_version_used"], VERSION_TUPLE)

            # The file was not  deleted
            self.assertTrue(os.path.isfile(tor_path))

        # Restore TOR_BINARY_PATH
        update.TOR_BINARY_PATH = bck_tor_binary_path


if __name__ == "__main__":
    unittest.main()
