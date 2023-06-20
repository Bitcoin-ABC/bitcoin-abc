#!/usr/bin/env python3
#
# Electron Cash - a lightweight Bitcoin Cash client
# CashFusion - an advanced coin anonymizer
#
# Copyright (C) 2020 Mark B. Lundeberg
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
from __future__ import annotations

from contextlib import suppress
from typing import TYPE_CHECKING, List, NamedTuple, Optional, Tuple

from electrumabc.plugins import daemon_command
from electrumabc.util import InvalidPassword

from .plugin import FusionPlugin

if TYPE_CHECKING:
    from electrumabc.daemon import Daemon
    from electrumabc.simple_config import SimpleConfig
    from electrumabc.wallet import AbstractWallet


class WalletToFuse(NamedTuple):
    name: str
    wallet: AbstractWallet
    password: Optional[str]


def is_password_valid(wallet: AbstractWallet, pwd: str) -> bool:
    try:
        wallet.storage.check_password(pwd)
    except InvalidPassword:
        return False
    return True


def find_password_in_list(
    wallet: AbstractWallet, passwords: List[str]
) -> Optional[str]:
    for pwd in passwords:
        if is_password_valid(wallet, pwd):
            return pwd
    return None


class Plugin(FusionPlugin):
    def _get_fusable_wallets(
        self, daemon: Daemon, passwords: List[str]
    ) -> Tuple[int, int, List[WalletToFuse]]:
        wallets_to_fuse: List[WalletToFuse] = []
        num_hardware_wallets = 0
        num_wallets_without_password = 0
        for name, wallet in daemon.wallets.items():
            if wallet.is_hardware():
                num_hardware_wallets += 1
                continue

            password = None
            if wallet.storage.is_encrypted():
                password = find_password_in_list(wallet, passwords)
                if password is None:
                    num_wallets_without_password += 1
                    continue
            wallets_to_fuse.append(WalletToFuse(name, wallet, password))
        return num_hardware_wallets, num_wallets_without_password, wallets_to_fuse

    @daemon_command
    def enable_autofuse(self, daemon: Daemon, config: SimpleConfig):
        """Usage:

            ./electrum-abc daemon start
            ./electrum-abc -w  /path/to/wallet daemon load_wallet
            ./electrum-abc daemon enable_autofuse

        For encrypted wallets, the password must be supplied on the command line:

            ./electrum-abc daemon start
            ./electrum-abc -w  /path/to/encrypted_wallet daemon load_wallet
            ./electrum-abc daemon enable_autofuse 'password1'
        """
        passwords = config.get("subargs")
        num_hw, num_without_pwd, wallets_to_fuse = self._get_fusable_wallets(
            daemon, passwords
        )
        if not (num_hw + num_without_pwd + len(wallets_to_fuse)):
            return "No wallet currently loaded. Use the `load_wallet` command."
        ret = ""
        if num_hw:
            ret += f"Ignoring {num_hw} hardware wallets.\n"
        if num_without_pwd:
            ret += (
                f"Ignoring {num_without_pwd} encrypted wallets with no password or an "
                "incorrect password specified on the command line.\n"
            )
        if not wallets_to_fuse:
            ret += "None of the loaded wallets are eligible for running Cash Fusion.\n"
            return ret

        if self.tor_port_good is None:
            ret += "Enabling tor for Cash Fusion.\n"
            self._enable_tor(daemon)

        for w in wallets_to_fuse:
            ret += f"Adding wallet {w.name} to Cash Fusion.\n"
            super().add_wallet(w.wallet, w.password)
            super().enable_autofusing(w.wallet, w.password)
        return ret

    def _enable_tor(self, daemon: Daemon):
        if self.active and self.tor_port_good is None:
            network = daemon.network
            if (
                network
                and network.tor_controller.is_available()
                and not network.tor_controller.is_enabled()
            ):

                def on_status(controller):
                    with suppress(ValueError):
                        # remove the callback immediately
                        network.tor_controller.status_changed.remove(on_status)
                    if controller.status != controller.Status.STARTED:
                        # OSError can happen when printing from a daemon command
                        # after the terminal in which the daemon was started was closed.
                        with suppress(OSError):
                            print("There was an error starting the Tor client")

                network.tor_controller.status_changed.append(on_status)
                network.tor_controller.set_enabled(True)

    @daemon_command
    def fusion_status(self, daemon: Daemon, config: SimpleConfig):
        """Print a table showing the status for all fusions."""
        if not daemon.wallets:
            return (
                "No wallet currently loaded or fusing. Try `load_wallet` and "
                "`daemon enable_autofuse`"
            )
        ret = "Wallet                    Status          Status Extra\n"
        for fusion in reversed(self.get_all_fusions()):
            wname = fusion.target_wallet.diagnostic_name()
            status, status_ext = fusion.status
            ret += f"{wname:<25.25} {status:<15.15} {status_ext}\n"
        return ret
