import json
import os
import sys
import unittest
from contextlib import redirect_stderr
from decimal import Decimal as PyDecimal
from io import StringIO
from unittest.mock import MagicMock, patch

from ..address import Address
from ..commands import Commands, get_parser, known_commands, preprocess_cmdline_args

DAEMON_ONLY_COMMANDS = ("stop", "list_wallets", "load_wallet", "close_wallet")


class TestCommandRequirements(unittest.TestCase):
    def test_daemon_only_commands(self):
        """These commands must be run by the daemon, but don't need the network"""
        for name in (*DAEMON_ONLY_COMMANDS, "is_synchronized"):
            cmd = known_commands[name]
            self.assertTrue(cmd.requires_daemon, name)
            self.assertFalse(cmd.requires_network, name)

    def test_no_daemon(self):
        commands = Commands(config=MagicMock(), wallet=None, network=None)
        for name in DAEMON_ONLY_COMMANDS:
            with self.assertRaisesRegex(RuntimeError, "Daemon not running"):
                getattr(commands, name)()

    def test_offline_daemon(self):
        daemon = MagicMock()
        daemon.wallets = {}
        commands = Commands(
            config=MagicMock(), wallet=None, network=None, daemon=daemon
        )
        self.assertEqual(commands.list_wallets(), [])
        with self.assertRaisesRegex(RuntimeError, "Daemon offline"):
            commands.getservers()

    def test_getfeerate_without_network(self):
        config = MagicMock()
        config.fee_per_kb.return_value = 3000
        commands = Commands(config=config, wallet=None, network=None)
        self.assertEqual(commands.getfeerate(), 3000)


ADDRESS = "ecash:qr98e3qdhegz5k79gkfmp0xl27phv63uuqjtz8uutp"


class TestGetAlias(unittest.TestCase):
    """The JSON-RPC server serializes command results with json.dumps, so they
    must not contain Address objects."""

    def setUp(self):
        self.commands = Commands(config=None, wallet=MagicMock(), network=None)

    def test_address(self):
        result = self.commands.getalias(ADDRESS)
        self.assertEqual(
            json.loads(json.dumps(result)), {"address": ADDRESS, "type": "address"}
        )

    def test_openalias(self):
        with patch(
            "electrumabc.alias.resolve_openalias",
            return_value=(Address.from_string(ADDRESS), "Alice", True),
        ):
            result = self.commands.getalias("alice@example.com")
        self.assertEqual(
            json.loads(json.dumps(result)),
            {
                "address": ADDRESS,
                "name": "Alice",
                "type": "openalias",
                "validated": True,
            },
        )


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
        self.stdin = sys.stdin

    def cleanUp(self):
        sys.stdin = self.stdin

    def mock_stdin(self, data: str):
        sys.stdin = StringIO(data)

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

    def test_preprocess(self):
        raw_args = ["./electrum-abc", "close_wallet", "-psn_0_989382"]
        preprocess_cmdline_args(raw_args)
        self.assertFalse(any(arg.startswith("-psn") for arg in raw_args))
        args = self.parser.parse_args(raw_args[1:])
        self.assertEqual(args.cmd, "close_wallet")

        raw_args = ["./electrum-abc", "help", "close_wallet"]
        preprocess_cmdline_args(raw_args)
        self.assertEqual(raw_args, ["./electrum-abc", "close_wallet", "-h"])

        txid = "07da1abf91c73cfd2e3aaf52f9284ddfeac1f87f7ea4396233d70464f736cf97"
        self.mock_stdin(txid)
        raw_args = ["./electrum-abc", "gettransaction", "-"]
        preprocess_cmdline_args(raw_args)
        self.assertEqual(raw_args[2], txid)

        # Test proper handling of BIP21 URIs
        bip21_uri = "ecash:qz4eqgk9fqs3uxxt2xwx0jpfj704e2t6rs7357tn7e?amount=1337.06&label=Donation to toto&op_return=Thx for running this service!"
        raw_args = ["./electrum-abc", bip21_uri]
        preprocess_cmdline_args(raw_args)
        self.assertEqual(raw_args, ["./electrum-abc", "gui", bip21_uri])
        args = self.parser.parse_args(raw_args[1:])
        self.assertEqual(args.cmd, "gui")
        self.assertEqual(args.url, bip21_uri)


if __name__ == "__main__":
    unittest.main()
