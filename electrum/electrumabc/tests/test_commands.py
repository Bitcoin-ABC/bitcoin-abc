import os
import unittest
from contextlib import redirect_stderr
from decimal import Decimal as PyDecimal

from ..commands import Commands, get_parser


class TestCommands(unittest.TestCase):
    def test_setconfig_non_auth_number(self):
        self.assertEqual(7777, Commands._setconfig_normalize_value("rpcport", "7777"))
        self.assertEqual(7777, Commands._setconfig_normalize_value("rpcport", "7777"))
        self.assertAlmostEqual(
            PyDecimal(2.3), Commands._setconfig_normalize_value("somekey", "2.3")
        )

    def test_setconfig_non_auth_number_as_string(self):
        self.assertEqual(
            "7777", Commands._setconfig_normalize_value("somekey", "'7777'")
        )

    def test_setconfig_non_auth_boolean(self):
        self.assertEqual(
            True, Commands._setconfig_normalize_value("show_console_tab", "true")
        )
        self.assertEqual(
            True, Commands._setconfig_normalize_value("show_console_tab", "True")
        )

    def test_setconfig_non_auth_list(self):
        self.assertEqual(
            ["file:///var/www/", "https://electrum.org"],
            Commands._setconfig_normalize_value(
                "url_rewrite", "['file:///var/www/','https://electrum.org']"
            ),
        )
        self.assertEqual(
            ["file:///var/www/", "https://electrum.org"],
            Commands._setconfig_normalize_value(
                "url_rewrite", '["file:///var/www/","https://electrum.org"]'
            ),
        )

    def test_setconfig_auth(self):
        self.assertEqual("7777", Commands._setconfig_normalize_value("rpcuser", "7777"))
        self.assertEqual("7777", Commands._setconfig_normalize_value("rpcuser", "7777"))
        self.assertEqual(
            "7777", Commands._setconfig_normalize_value("rpcpassword", "7777")
        )
        self.assertEqual(
            "2asd", Commands._setconfig_normalize_value("rpcpassword", "2asd")
        )
        self.assertEqual(
            "['file:///var/www/','https://electrum.org']",
            Commands._setconfig_normalize_value(
                "rpcpassword", "['file:///var/www/','https://electrum.org']"
            ),
        )


class TestArgParser(unittest.TestCase):
    def setUp(self) -> None:
        self.parser = get_parser()

    def test_global_options(self):
        path_to_wallet = os.path.abspath("/path/to/wallet")
        args_no_command = self.parser.parse_args(["-w", path_to_wallet, "--verbose"])
        self.assertEqual(args_no_command.wallet_path, path_to_wallet)
        self.assertTrue(args_no_command.verbose)
        self.assertEqual(args_no_command.cmd, None)

        args_with_command = self.parser.parse_args(["-w", path_to_wallet, "history"])
        self.assertEqual(args_with_command.wallet_path, path_to_wallet)
        self.assertEqual(args_with_command.cmd, "history")

        # global options must be before any command or subparser
        with open(os.devnull, "w", encoding="utf-8") as null, redirect_stderr(null):
            with self.assertRaises(SystemExit):
                self.parser.parse_args(["history", "-w", "/path/to/wallet"])

            with self.assertRaises(SystemExit):
                self.parser.parse_args(["gui", "-w", "/path/to/wallet"])

    def test_default_values(self):
        """Test a boolean argument with action store_true"""
        args = self.parser.parse_args([])
        self.assertEqual(args.regtest, False)

        args = self.parser.parse_args(["--regtest"])
        self.assertEqual(args.regtest, True)

    def test_dest(self):
        """Test that some arguments have the expected dest"""
        path_to_wallet = os.path.abspath("/path/to/wallet")
        args = self.parser.parse_args(["--testnet", "--wallet", path_to_wallet])

        # Test arguments that have no explicit dest, so the dest is inferred from
        # the long option.
        self.assertTrue(hasattr(args, "testnet"))
        # The argument is defined even if not on the command line.
        self.assertTrue(hasattr(args, "test_release_notification"))

        # Test arguments with an explicit dest different from the long option
        # --wallet
        self.assertFalse(hasattr(args, "wallet"))
        self.assertTrue(hasattr(args, "wallet_path"))

        # --dir
        self.assertFalse(hasattr(args, "dir"))
        self.assertTrue(hasattr(args, "data_path"))


def suite():
    test_suite = unittest.TestSuite()
    loadTests = unittest.defaultTestLoader.loadTestsFromTestCase
    test_suite.addTest(loadTests(TestCommands))
    test_suite.addTest(loadTests(TestArgParser))
    return test_suite


if __name__ == "__main__":
    unittest.main(defaultTest="suite")
