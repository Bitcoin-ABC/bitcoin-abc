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

import threading
import weakref
from functools import partial
from typing import TYPE_CHECKING, Optional

from PyQt5 import QtWidgets
from PyQt5.QtCore import QMargins, QObject, QPoint, QSize, Qt, QTimer, pyqtSignal
from PyQt5.QtGui import QCursor, QIcon, QImage, QPainter

from electrumabc.address import Address
from electrumabc.i18n import _, ngettext
from electrumabc.plugins import hook, run_hook
from electrumabc.tor.controller import TorController
from electrumabc.util import InvalidPassword, do_in_main_thread, inv_dict
from electrumabc.wallet import AbstractWallet
from electrumabc_gui.qt.amountedit import XECAmountEdit
from electrumabc_gui.qt.main_window import ElectrumWindow
from electrumabc_gui.qt.popup_widget import KillPopupLabel, ShowPopupLabel
from electrumabc_gui.qt.statusbar import StatusBarButton
from electrumabc_gui.qt.tor_downloader import DownloadTorDialog
from electrumabc_gui.qt.util import (
    Buttons,
    CancelButton,
    CloseButton,
    ColorScheme,
    OkButton,
    PasswordLineEdit,
    WaitingDialog,
    WindowModalDialog,
)
from electrumabc_gui.qt.utils.validators import PortValidator, UserPortValidator

from .conf import Conf, Global
from .fusion import can_fuse_from, can_fuse_to
from .plugin import (
    COIN_FRACTION_FUDGE_FACTOR,
    MAX_LIMIT_FUSE_DEPTH,
    TOR_PORTS,
    FusionPlugin,
    select_coins,
)
from .server import Params
from .util import get_coin_name

if TYPE_CHECKING:
    from electrumabc_gui.qt.address_list import AddressList
    from electrumabc_gui.qt import ElectrumGui

from pathlib import Path

heredir = Path(__file__).parent

# Lazy init the icons to avoid creating QObject when importing the module,
# in case the QApplication doesn't exist yet.
icon_fusion_logo = None
icon_fusion_logo_gray = None
image_red_exclamation = None


def get_icon_fusion_logo():
    global icon_fusion_logo
    if icon_fusion_logo is None:
        icon_fusion_logo = QIcon(str(heredir / "cash_fusion_logo_no_text.svg"))
    return icon_fusion_logo


def get_icon_fusion_logo_gray():
    global icon_fusion_logo_gray
    if icon_fusion_logo_gray is None:
        icon_fusion_logo_gray = QIcon(
            str(heredir / "cash_fusion_logo_no_text_gray.svg")
        )
    return icon_fusion_logo_gray


def get_image_red_exclamation():
    global image_red_exclamation
    if image_red_exclamation is None:
        image_red_exclamation = QImage(str(heredir / "red_exclamation.png"))
    return image_red_exclamation


class Plugin(FusionPlugin, QObject):
    server_status_changed_signal = pyqtSignal(bool, tuple)

    fusions_win = None
    weak_settings_tab = None
    gui: Optional[ElectrumGui] = None
    initted = False
    last_server_status = (True, ("Ok", ""))
    _hide_history_txs = False

    def __init__(self, *args, **kwargs):
        # parentless top-level QObject. We need this type for the signal.
        QObject.__init__(self)
        # gives us self.config
        FusionPlugin.__init__(self, *args, **kwargs)
        # widgets we made, that need to be hidden & deleted when plugin is disabled
        self.widgets = weakref.WeakSet()
        self._hide_history_txs = Global(self.config).hide_history_txs

    def on_close(self):
        super().on_close()
        # Shut down plugin.
        # This can be triggered from one wallet's window while
        # other wallets' windows have plugin-related modals open.
        for window in self.gui.windows:
            # this could be slow since it touches windows one by one... could optimize
            # this by dispatching simultaneously.
            self.on_close_window(window)
        # Clean up
        for w in self.widgets:
            try:
                w.setParent(None)
                w.close()
                w.hide()
                w.deleteLater()
            except Exception:
                # could be <RuntimeError: wrapped C/C++ object of type SettingsDialog
                # has been deleted> but really we just want to suppress all exceptions
                pass
        # clean up member attributes to be tidy
        # should trigger a deletion of object if not already dead
        self.fusions_win = None
        self.weak_settings_tab = None
        self.gui = None
        self.initted = False

    @hook
    def init_qt(self, gui):
        # This gets called when this plugin is initialized, but also when
        # any other plugin is initialized after us.
        if self.initted:
            return
        self.initted = self.active = True  # self.active is declared in super
        self.gui = gui
        if self.gui.nd:
            # since a network dialog already exists, let's create the settings
            # tab now.
            self.on_network_dialog(self.gui.nd)

        # We also have to find which windows are already open, and make
        # them work with fusion.
        for window in self.gui.windows:
            self.on_new_window(window)

    @hook
    def address_list_context_menu_setup(self, address_list: AddressList, menu, addrs):
        if not self.active:
            return
        wallet = address_list.wallet
        window = address_list.main_window
        network = wallet.network
        if not (can_fuse_from(wallet) and can_fuse_to(wallet) and network):
            return
        if not hasattr(wallet, "_fusions"):
            # that's a bug... all wallets should have this
            return

        coins = wallet.get_utxos(
            addrs,
            exclude_frozen=True,
            mature=True,
            confirmed_only=True,
            exclude_slp=True,
        )

        def start_fusion():
            def do_it(password):
                try:
                    with wallet.lock:
                        if not hasattr(wallet, "_fusions"):
                            return
                        self.start_fusion(wallet, password, coins)
                except RuntimeError as e:
                    window.show_error(
                        _("CashFusion failed: {error_message}").format(
                            error_message=str(e)
                        )
                    )
                    return
                window.show_message(
                    ngettext(
                        "One coin has been sent to CashFusion for fusing.",
                        "{count} coins have been sent to CashFusion for fusing.",
                        len(coins),
                    ).format(count=len(coins))
                )

            has_pw, password = Plugin.get_cached_pw(wallet)
            if has_pw and password is None:
                d = PasswordDialog(
                    wallet, _("Enter your password to fuse these coins"), do_it
                )
                d.show()
                self.widgets.add(d)
            else:
                do_it(password)

        if coins:
            menu.addAction(
                ngettext(
                    "Input one coin to CashFusion",
                    "Input {count} coins to CashFusion",
                    len(coins),
                ).format(count=len(coins)),
                start_fusion,
            )

    @staticmethod
    def get_spend_only_fused_coins_checkbox_attributes(wallet):
        fuse_depth = Conf(wallet).fuse_depth
        if fuse_depth > 0:
            label = ngettext(
                "Spend only fused coins, minimum {min} fusion",
                "Spend only fused coins, minimum {min} fusions",
                fuse_depth,
            ).format(min=fuse_depth)
            tooltip = ngettext(
                "If checked, only spend coins that have been anonymized by\n"
                "CashFusion, after having been fused at least {min} time.",
                "If checked, only spend coins that have been anonymized by\n"
                "CashFusion, after having been fused at least {min} times.",
                fuse_depth,
            ).format(min=fuse_depth)
        else:
            label = _("Spend only fused coins")
            tooltip = _(
                "If checked, only spend coins that have been\n"
                "anonymized by CashFusion at least once."
            )
        return label, tooltip

    @hook
    def on_new_window(self, window):
        # Called on initial plugin load (if enabled) and every new window; only once per window.
        wallet = window.wallet

        can_fuse = self.wallet_can_fuse(wallet)
        if can_fuse:
            sbbtn = FusionButton(self, wallet)
            self.server_status_changed_signal.connect(sbbtn.update_server_error)
        else:
            # If we can not fuse we create a dummy fusion button that just displays a message
            sbmsg = _(
                "This wallet type ({wtype}) cannot be used with CashFusion.\n\n"
                "Please use a standard deterministic spending wallet with CashFusion."
            ).format(wtype=wallet.wallet_type)
            sbbtn = DisabledFusionButton(wallet, sbmsg)

        # bit of a dirty hack, to insert our status bar icon (always using index 4, should put us just after the password-changer icon)
        sb = window.statusBar()
        sb.insertPermanentWidget(4, sbbtn)
        self.widgets.add(sbbtn)
        window._cashfusion_button = weakref.ref(sbbtn)

        if not can_fuse:
            # don't do anything with non-fusable wallets
            # (if inter-wallet fusing is added, this should change.)
            return

        # NEW! Set up the send tab "Spend only fused coins" checkbox/control
        if hasattr(window, "send_tab_extra_plugin_controls_hbox"):
            hbox = window.send_tab_extra_plugin_controls_hbox
            label, tooltip = self.get_spend_only_fused_coins_checkbox_attributes(wallet)
            spend_only_fused_chk = QtWidgets.QCheckBox(label)
            spend_only_fused_chk.setObjectName("spend_only_fused_chk")
            spend_only_fused_chk.setToolTip(tooltip)
            hbox.insertWidget(0, spend_only_fused_chk)
            spend_only_fused_chk.setChecked(Conf(wallet).spend_only_fused_coins)
            weak_window = weakref.ref(window)

            def on_chk(b):
                window = weak_window()
                if window:
                    wallet = window.wallet
                    Conf(wallet).spend_only_fused_coins = b
                    window.do_update_fee()  # trigger send tab to re-calculate things

            spend_only_fused_chk.toggled.connect(on_chk)
            self.widgets.add(spend_only_fused_chk)

        want_autofuse = Conf(wallet).autofuse
        self.add_wallet(wallet, window.gui_object.get_cached_password(wallet))
        sbbtn.update_state()

        # Set up the utxo_list column
        self.patch_utxo_list(window.utxo_list)

        # prompt for password if auto-fuse was enabled
        if want_autofuse and not self.is_autofusing(wallet):

            def callback(password):
                self.enable_autofusing(wallet, password)
                button = window._cashfusion_button()
                if button:
                    button.update_state()

            d = PasswordDialog(
                wallet,
                _(
                    "Previously you had auto-fusion enabled on this wallet. If you"
                    " would like to keep auto-fusing in the background, enter your"
                    " password."
                ),
                callback_ok=callback,
            )
            d.show()
            self.widgets.add(d)

    @staticmethod
    def patch_utxo_list(utxo_list):
        if getattr(utxo_list, "_fusion_patched_", None) is not None:
            return
        header = utxo_list.headerItem()
        header_labels = [header.text(i) for i in range(header.columnCount())]
        header_labels.append(_("Fusion Status"))
        utxo_list.update_headers(header_labels)
        utxo_list._fusion_patched_ = header_labels[
            -1
        ]  # save the text to be able to find the column later
        utxo_list.wallet.print_error("[fusion] Patched utxo_list")

    @staticmethod
    def find_utxo_list_fusion_column(utxo_list, *, just_column=False):
        label_text = getattr(utxo_list, "_fusion_patched_", None)
        if label_text is None:
            return
        header = utxo_list.headerItem()
        if just_column:
            # fast path, query just the column
            col_ct = header.columnCount()
            if not col_ct:
                return None
            # iterate in reverse (it's likely last)
            for i in range(col_ct - 1, -1, -1):
                if header.text(i) == label_text:
                    return i
        else:
            header_labels = [header.text(i) for i in range(header.columnCount())]
            col = len(header_labels) - 1
            # find the column, iterate in reverse since it's likely last
            for i, lbl in enumerate(reversed(header_labels)):
                if lbl == label_text:
                    col = len(header_labels) - 1 - i
                    break
            return col, header, header_labels

    @staticmethod
    def unpatch_utxo_list(utxo_list):
        tup = Plugin.find_utxo_list_fusion_column(utxo_list)
        if tup is None:
            return
        col, header, header_labels = tup
        del header_labels[col]
        utxo_list.update_headers(header_labels)
        delattr(utxo_list, "_fusion_patched_")
        utxo_list.wallet.print_error("[fusion] Unpatched utxo_list")

    @hook
    def utxo_list_item_setup(self, utxo_list, item, utxo, name):
        col = self.find_utxo_list_fusion_column(utxo_list, just_column=True)
        if col is None:
            return

        wallet = utxo_list.wallet
        fuse_depth = Conf(wallet).fuse_depth
        is_fused = self.is_fuz_coin(wallet, utxo, require_depth=fuse_depth - 1)
        is_partially_fused = (
            is_fused if fuse_depth <= 1 else self.is_fuz_coin(wallet, utxo)
        )

        item.setIcon(col, QIcon())
        if is_fused:
            item.setText(col, _("Fused"))
            item.setIcon(col, icon_fusion_logo)
        elif is_partially_fused:
            count = self.get_coin_fuz_count(wallet, utxo, require_depth=fuse_depth - 1)
            item.setText(
                col, _("Partial {count}/{total}").format(count=count, total=fuse_depth)
            )
            item.setIcon(col, icon_fusion_logo_gray)
        elif self.is_fuz_address(wallet, utxo["address"], require_depth=fuse_depth - 1):
            item.setText(col, _("Fuse Addr"))
            item.setIcon(col, icon_fusion_logo)
            item.setToolTip(
                col,
                _(
                    "This coin shares an address with a fused coin. Do not spend"
                    " separately."
                ),
            )
        elif utxo["height"] <= 0:
            item.setText(col, _("Unconfirmed"))
        elif utxo["coinbase"]:
            # we disallow coinbase coins unconditionally -- due to miner feedback (they don't like shuffling these)
            item.setText(col, _("Coinbase"))
        else:
            item.setText(col, _("Unfused"))

    @hook
    def spendable_coin_filter(self, window, coins):
        """Invoked by the send tab to filter out coins that aren't fused if the wallet has
        'spend only fused coins' enabled."""
        if not coins or not hasattr(window, "wallet"):
            return

        wallet = window.wallet
        if not Conf(wallet).spend_only_fused_coins or not self.wallet_can_fuse(wallet):
            return

        # external_coins_addresses is only ever used if they are doing a sweep. in which case we always allow the coins
        # involved in the sweep
        external_coin_addresses = set()
        if hasattr(window, "tx_external_keypairs"):
            for pubkey in window.tx_external_keypairs:
                a = Address.from_pubkey(pubkey)
                external_coin_addresses.add(a)

        # we can ONLY spend fused coins + ununfused living on a fused coin address
        fuz_adrs_seen = set()
        fuz_coins_seen = set()
        with wallet.lock:
            for coin in coins.copy():
                if coin["address"] in external_coin_addresses:
                    # completely bypass this filter for external keypair dict
                    # which is only used for sweep dialog in send tab
                    continue
                fuse_depth = Conf(wallet).fuse_depth
                is_fuz_adr = self.is_fuz_address(
                    wallet, coin["address"], require_depth=fuse_depth - 1
                )
                if is_fuz_adr:
                    fuz_adrs_seen.add(coin["address"])
                # we allow coins sitting on a fused address to be "spent as fused"
                if (
                    not self.is_fuz_coin(wallet, coin, require_depth=fuse_depth - 1)
                    and not is_fuz_adr
                ):
                    coins.remove(coin)
                else:
                    fuz_coins_seen.add(get_coin_name(coin))
            # Force co-spending of other coins sitting on a fuzed address
            for adr in fuz_adrs_seen:
                adr_coins = wallet.get_addr_utxo(adr)
                for name, adr_coin in adr_coins.items():
                    if (
                        name not in fuz_coins_seen
                        and not adr_coin["is_frozen_coin"]
                        and adr_coin.get("slp_token") is None
                        and not adr_coin.get("coinbase")
                    ):
                        coins.append(adr_coin)
                        fuz_coins_seen.add(name)

    @hook
    def not_enough_funds_extra(self, window) -> Optional[str]:
        """Called by the Qt UI if there is a "not enough funds" error in the send tab"""
        wallet = window.wallet
        if not self.wallet_can_fuse(wallet):
            return
        conf = Conf(wallet)
        if not conf.spend_only_fused_coins:
            return
        needs_fuz = [
            coin
            for coin in wallet.get_utxos(
                exclude_frozen=True,
                mature=True,
                confirmed_only=bool(window.config.get("confirmed_only", False)),
            )
            if not self.is_fuz_coin(wallet, coin, require_depth=conf.fuse_depth - 1)
        ]
        total = sum(c["value"] for c in needs_fuz)
        n_coins = len(needs_fuz)
        if total and needs_fuz:
            return ngettext(
                "{total_bch} in {n_coins} unfused coin",
                "{total_bch} in {n_coins} unfused coins",
                n_coins,
            ).format(
                total_bch=window.format_amount(total) + " " + window.base_unit(),
                n_coins=n_coins,
            )

    @hook
    def on_close_window(self, window):
        self.unpatch_utxo_list(window.utxo_list)
        # Invoked when closing wallet or entire application
        # Also called by on_close, above.
        wallet = window.wallet

        fusions = self.remove_wallet(wallet)
        if not fusions:
            return

        for f in fusions:
            f.stop("Closing wallet")

        # Soft-stop background fuse if running.
        # We avoid doing a hard disconnect in the middle of a fusion round.
        # TODO: only do a gentler 'stop-if-waiting' and have a "STOP SOONER"
        # button on the waiting dialog for the less patient users.
        def task():
            for f in fusions:
                f.join()

        d = WaitingDialog(
            window.top_level_window(),
            _("Shutting down active CashFusions (may take a minute to finish)"),
            task,
        )
        d.exec_()

    @hook
    def on_new_password(self, window, old, new):
        wallet = window.wallet
        if self.is_autofusing(wallet):
            try:
                self.enable_autofusing(wallet, new)
                self.print_error(wallet, "updated autofusion password")
            except InvalidPassword:
                self.disable_autofusing(wallet)
                self.print_error(
                    wallet, "disabled autofusion due to incorrect password - BUG"
                )

    def show_util_window(
        self,
    ):
        if self.fusions_win is None:
            # keep a singleton around
            self.fusions_win = FusionsWindow(self)
            self.widgets.add(self.fusions_win)
        self.fusions_win.show()
        self.fusions_win.raise_()

    def requires_settings(self):
        # called from main_window.py internal_plugins_dialog
        return True

    def settings_widget(self, window):
        # called from main_window.py internal_plugins_dialog
        btn = QtWidgets.QPushButton(_("Settings"))
        btn.clicked.connect(self.show_settings_dialog)
        return btn

    def show_settings_dialog(self):
        self.gui.show_network_dialog(None, jumpto="fusion")

    @hook
    def on_network_dialog(self, network_dialog):
        if self.weak_settings_tab and self.weak_settings_tab():
            return  # already exists
        settings_tab = SettingsWidget(self)
        self.server_status_changed_signal.connect(settings_tab.update_server_error)
        tabs = network_dialog.nlayout.tabs
        tabs.addTab(settings_tab, get_icon_fusion_logo(), _("CashFusion"))
        self.widgets.add(settings_tab)
        self.weak_settings_tab = weakref.ref(settings_tab)

    @hook
    def on_network_dialog_jumpto(self, nlayout, location):
        settings_tab = self.weak_settings_tab and self.weak_settings_tab()
        if settings_tab and location in ("fusion", "cashfusion"):
            nlayout.tabs.setCurrentWidget(settings_tab)
            return True

    def update_coins_ui(self, wallet):
        """Overrides super, the Fusion thread calls this in its thread context
        to indicate it froze/unfroze some coins. We must update the coins tab,
        but only in the main thread."""

        def update_coins_tab(wallet):
            strong_window = wallet and wallet.weak_window and wallet.weak_window()
            if strong_window:
                strong_window.utxo_list.update()  # this is rate_limited so it's ok to call it many times in rapid succession.

        do_in_main_thread(update_coins_tab, wallet)

    def notify_server_status(self, b, tup):
        """Reimplemented from super"""
        super().notify_server_status(b, tup)
        status_tup = (b, tup)
        if self.last_server_status != status_tup:
            self.last_server_status = status_tup
            self.server_status_changed_signal.emit(b, tup)

    def get_server_error(self) -> tuple:
        """Returns a 2-tuple of strings for the last server error, or None
        if there is no extant server error."""
        if not self.last_server_status[0]:
            return self.last_server_status[1]

    @classmethod
    def window_for_wallet(cls, wallet):
        """Convenience: Given a wallet instance, derefernces the weak_window
        attribute of the wallet and returns a strong reference to the window.
        May return None if the window is gone (deallocated)."""
        assert isinstance(wallet, AbstractWallet)
        return (wallet.weak_window and wallet.weak_window()) or None

    @classmethod
    def get_suitable_dialog_window_parent(cls, wallet_or_window):
        """Convenience: Given a wallet or a window instance, return a suitable
        'top level window' parent to use for dialog boxes."""
        if isinstance(wallet_or_window, AbstractWallet):
            wallet = wallet_or_window
            window = cls.window_for_wallet(wallet)
            return (window and window.top_level_window()) or None
        elif isinstance(wallet_or_window, ElectrumWindow):
            window = wallet_or_window
            return window.top_level_window()
        else:
            raise TypeError(
                "Expected a wallet or a window instance, instead got"
                f" {type(wallet_or_window)}"
            )

    @classmethod
    def get_cached_pw(cls, wallet):
        """Will return a tuple: (bool, password) for the given wallet.  The
        boolean is whether the wallet is password protected and the second
        item is the cached password, if it's known, otherwise None if it is not
        known.  If the wallet has no password protection the tuple is always
        (False, None)."""
        if not wallet.has_password():
            return False, None
        window = cls.window_for_wallet(wallet)
        if not window:
            raise RuntimeError(
                f"Wallet {wallet.diagnostic_name()} lacks a valid ElectrumWindow"
                " instance!"
            )
        pw = window.gui_object.get_cached_password(wallet)
        if pw is not None:
            try:
                wallet.check_password(pw)
            except InvalidPassword:
                pw = None
        return True, pw

    @classmethod
    def cache_pw(cls, wallet, password):
        window = cls.window_for_wallet(wallet)
        if window:
            window.gui_object.cache_password(wallet, password)

    def enable_autofusing(self, wallet, password):
        """Overrides super, if super successfully turns on autofusing, kicks
        off the timer to check that Tor is working."""
        super().enable_autofusing(wallet, password)
        if self.is_autofusing(wallet):
            # ok, autofuse enable success -- kick of the timer task to check if
            # Tor is good
            do_in_main_thread(
                self._maybe_prompt_user_if_they_want_integrated_tor_if_no_tor_found,
                wallet,
            )

    _integrated_tor_timer = None

    def _maybe_download_tor(
        self, window: ElectrumWindow, tor_controller: TorController
    ) -> bool:
        """Ask the user if he wants to download Tor, then download it.
        If the download was successful or Tor was installed with a package manager,
        return True.
        """
        icon_pm = get_icon_fusion_logo().pixmap(32)
        answer = window.question(
            _(
                "CashFusion requires Tor to operate anonymously. Would you like to "
                "download the Tor client now? Alternatively (preferably), you can "
                "install Tor for Linux and MacOS using your system's package manager "
                "(in this case click the No button when installing is complete)."
            ),
            icon=icon_pm,
            title=_("Tor Required"),
            parent=None,
            app_modal=True,
            rich_text=True,
            defaultButton=QtWidgets.QMessageBox.Yes,
        )
        if answer:
            dialog = DownloadTorDialog(self.config, window)
            dialog.exec_()

        # Check Tor availability no matter if the download succeeded, as the user
        # could have installed Tor with his package manager while the question dialog
        # was running.
        if tor_controller.detect_tor():
            return True
        return False

    def _maybe_prompt_user_if_they_want_integrated_tor_if_no_tor_found(
        self, wallet: AbstractWallet
    ):
        if self._integrated_tor_timer:
            # timer already active or already prompted user
            return
        weak_self = weakref.ref(self)
        weak_window = wallet.weak_window
        if not weak_window or not weak_window():
            # Something's wrong -- no window for wallet
            return
        network = self.gui.daemon.network

        tbt = network.tor_controller.tor_binary_type
        if tbt == TorController.BinaryType.MISSING:
            if not self._maybe_download_tor(weak_window(), network.tor_controller):
                # Tor unavailable and download failed or cancelled
                return

        def chk_tor_ok():
            self: Optional[Plugin] = weak_self()
            if not self:
                return
            self._integrated_tor_timer = None  # kill QTimer reference
            window = weak_window()

            if (
                not window
                or not self.active
                or not self.gui
                or not self.gui.windows
                or self.tor_port_good is not None
            ):
                return

            if (
                not network
                or not network.tor_controller.is_available()
                or network.tor_controller.is_enabled()
            ):
                return

            icon_pm = get_icon_fusion_logo().pixmap(32)
            answer = window.question(
                _(
                    "CashFusion requires Tor to operate anonymously. Would"
                    " you like to enable the Tor client now?"
                ),
                icon=icon_pm,
                title=_("Tor Required"),
                parent=None,
                app_modal=True,
                rich_text=True,
                defaultButton=QtWidgets.QMessageBox.Yes,
            )
            if not answer:
                return

            def on_status(controller):
                try:
                    network.tor_controller.status_changed.remove(
                        on_status
                    )  # remove the callback immediately
                except ValueError:
                    pass
                if controller.status == controller.Status.STARTED:
                    buttons = [_("Settings..."), _("Ok")]
                    index = window.show_message(
                        _("The Tor client has been successfully started."),
                        detail_text=(
                            _(
                                "The Tor client can be stopped at any time from the"
                                " Network Settings -> Proxy Tab, however CashFusion"
                                " does require Tor in order to operate correctly."
                            )
                        ),
                        icon=icon_pm,
                        rich_text=True,
                        buttons=buttons,
                        defaultButton=buttons[1],
                        escapeButton=buttons[1],
                    )
                    if index == 0:
                        # They want to go to "Settings..." so send
                        # them to the Tor settings (in Proxy tab)
                        self.gui.show_network_dialog(window, jumpto="tor")
                else:
                    controller.set_enabled(
                        False
                    )  # latch it back to False so we may prompt them again in the future
                    window.show_error(_("There was an error starting the Tor client"))

            network.tor_controller.status_changed.append(on_status)
            network.tor_controller.set_enabled(True)

        self._integrated_tor_timer = t = QTimer()
        # if in 5 seconds no tor port, ask user if they want to enable the Tor
        t.timeout.connect(chk_tor_ok)
        t.setSingleShot(True)
        t.start(2500)

    @hook
    def history_list_filter(self, history_list, h_item, label):
        # NB: 'h_item' might be None due to performance reasons
        if self._hide_history_txs:
            return bool(
                label.startswith("CashFusion ")
            )  # this string is not translated for performance reasons
        return None

    @hook
    def history_list_context_menu_setup(self, history_list, menu, item, tx_hash):
        # NB: We unconditionally create this menu if the plugin is loaded because
        # it's possible for any wallet, even a watching-only wallet to have
        # fusion tx's with the correct labels (if the user has imported labels).
        menu.addSeparator()

        def action_callback():
            self._hide_history_txs = not self._hide_history_txs
            Global(self.config).hide_history_txs = self._hide_history_txs
            action.setChecked(self._hide_history_txs)
            if self._hide_history_txs:
                tip = _("Fusion transactions are now hidden")
            else:
                tip = _("Fusion transactions are now shown")
            QtWidgets.QToolTip.showText(QCursor.pos(), tip, history_list)
            # unconditionally update this history list as it may be embedded in the
            # address_detail window and not a global history list..
            history_list.update()
            for w in self.gui.windows:
                # Need to update all the other open windows.
                # Note: We still miss any other open windows' address-detail
                #       history lists with this.. but that's ok as most of the
                #       time it won't be noticed by people and actually
                #       finding all those windows would just make this code
                #       less maintainable.
                # check if not already updated above
                if history_list is not w.history_list:
                    w.history_list.update()

        action = menu.addAction(_("Hide CashFusions"), action_callback)
        action.setCheckable(True)
        action.setChecked(self._hide_history_txs)


class PasswordDialog(WindowModalDialog):
    """Slightly fancier password dialog -- can be used non-modal (asynchronous) and has internal password checking.
    To run non-modally, use .show with the callbacks; to run modally, use .run."""

    def __init__(self, wallet, message, callback_ok=None, callback_cancel=None):
        parent = Plugin.get_suitable_dialog_window_parent(wallet)
        super().__init__(parent=parent, title=_("Enter Password"))
        self.setWindowIcon(get_icon_fusion_logo())
        self.wallet = wallet
        self.callback_ok = callback_ok
        self.callback_cancel = callback_cancel
        self.password = None

        vbox = QtWidgets.QVBoxLayout(self)
        self.msglabel = QtWidgets.QLabel(message)
        self.msglabel.setWordWrap(True)
        self.msglabel.setMinimumWidth(250)
        self.msglabel.setSizePolicy(
            QtWidgets.QSizePolicy.MinimumExpanding, QtWidgets.QSizePolicy.Expanding
        )
        hbox = QtWidgets.QHBoxLayout()
        iconlabel = QtWidgets.QLabel()
        iconlabel.setPixmap(get_icon_fusion_logo().pixmap(32))
        hbox.addWidget(iconlabel)
        hbox.addWidget(self.msglabel, 1, Qt.AlignLeft | Qt.AlignVCenter)
        cmargins = hbox.contentsMargins()
        cmargins.setBottom(10)
        hbox.setContentsMargins(cmargins)  # pad the bottom a bit
        vbox.addLayout(hbox, 1)
        self.pwle = PasswordLineEdit()
        grid_for_hook_api = QtWidgets.QGridLayout()
        grid_for_hook_api.setContentsMargins(0, 0, 0, 0)
        grid_for_hook_api.addWidget(self.pwle, 0, 0)
        run_hook(
            "password_dialog", self.pwle, grid_for_hook_api, 0
        )  # this is for the virtual keyboard plugin
        vbox.addLayout(grid_for_hook_api)
        self.badpass_msg = (
            "<i>" + _("Incorrect password entered. Please try again.") + "</i>"
        )

        buttons = QtWidgets.QHBoxLayout()
        buttons.addStretch(1)
        buttons.addWidget(CancelButton(self))
        okbutton = OkButton(self)
        okbutton.clicked.disconnect()
        okbutton.clicked.connect(self.pw_entered)
        buttons.addWidget(okbutton)
        vbox.addLayout(buttons)

    def _on_pw_ok(self, password):
        self.password = password
        Plugin.cache_pw(
            self.wallet, password
        )  # to remember it for a time so as to not keep bugging the user
        self.accept()
        if self.callback_ok:
            self.callback_ok(password)

    def _chk_pass(self, password):
        pw_ok = not self.wallet.has_password()
        if not pw_ok:
            try:
                self.wallet.check_password(password)
                pw_ok = True
            except InvalidPassword:
                pass
        return pw_ok

    def pw_entered(
        self,
    ):
        password = self.pwle.text()
        if self._chk_pass(password):
            self._on_pw_ok(password)
        else:
            self.msglabel.setText(self.badpass_msg)
            self.pwle.clear()
            self.pwle.setFocus()

    def closeEvent(self, event):
        """This happens if .run() is called, then dialog is closed."""
        super().closeEvent(event)
        if event.isAccepted():
            self._close_hide_common()

    def hideEvent(self, event):
        """This happens if .show() is called, then dialog is closed."""
        super().hideEvent(event)
        if event.isAccepted():
            self._close_hide_common()

    def _close_hide_common(self):
        if not self.result() and self.callback_cancel:
            self.callback_cancel(self)
        self.setParent(None)
        self.deleteLater()

    def run(self):
        self.exec_()
        return self.password


class DisabledFusionButton(StatusBarButton):
    def __init__(self, wallet, message):
        super().__init__(get_icon_fusion_logo_gray(), "Fusion")
        self.wallet = wallet
        self.message = message
        self.setToolTip(_("CashFusion (disabled)"))
        self.clicked.connect(self.show_message)

    def show_message(self):
        QtWidgets.QMessageBox.information(
            Plugin.get_suitable_dialog_window_parent(self.wallet),
            _("CashFusion is disabled"),
            self.message,
        )


class FusionButton(StatusBarButton):
    def __init__(self, plugin, wallet):
        super().__init__(QIcon(), "Fusion")
        self.clicked.connect(self.toggle_autofuse)

        self.plugin = plugin
        self.wallet = wallet

        self.server_error: tuple = None

        self.icon_autofusing_on = get_icon_fusion_logo()
        self.icon_autofusing_off = get_icon_fusion_logo_gray()
        self.icon_fusing_problem = self.style().standardIcon(
            QtWidgets.QStyle.SP_MessageBoxWarning
        )

        #        title = QWidgetAction(self)
        #        title.setDefaultWidget(QtWidgets.QLabel("<i>" + _("CashFusion") + "</i>"))
        self.action_toggle = QtWidgets.QAction(_("Auto-Fuse in Background"))
        self.action_toggle.setCheckable(True)
        self.action_toggle.triggered.connect(self.toggle_autofuse)
        action_separator1 = QtWidgets.QAction(self)
        action_separator1.setSeparator(True)
        action_wsettings = QtWidgets.QAction(_("Wallet Fusion Settings..."), self)
        action_wsettings.triggered.connect(self.show_wallet_settings)
        action_settings = QtWidgets.QAction(_("Server Settings..."), self)
        action_settings.triggered.connect(self.plugin.show_settings_dialog)
        action_separator2 = QtWidgets.QAction(self)
        action_separator2.setSeparator(True)
        action_util = QtWidgets.QAction(_("Fusions..."), self)
        action_util.triggered.connect(self.plugin.show_util_window)

        self.addActions(
            [
                self.action_toggle,
                action_separator1,
                action_wsettings,
                action_settings,
                action_separator2,
                action_util,
            ]
        )

        self.setContextMenuPolicy(Qt.ActionsContextMenu)

        self.update_state()

    def update_state(self):
        autofuse = self.plugin.is_autofusing(self.wallet)
        self.action_toggle.setChecked(autofuse)
        if autofuse:
            self.setIcon(self.icon_autofusing_on)
            self.setToolTip(_("CashFusion is fusing in the background for this wallet"))
            self.setStatusTip(_("CashFusion Auto-fusion - Enabled"))
        else:
            self.setIcon(self.icon_autofusing_off)
            self.setToolTip(
                _("Auto-fusion is paused for this wallet (click to enable)")
            )
            self.setStatusTip(_("CashFusion Auto-fusion - Disabled (click to enable)"))
        if self.server_error:
            self.setToolTip(_("CashFusion") + ": " + ", ".join(self.server_error))
            self.setStatusTip(_("CashFusion") + ": " + ", ".join(self.server_error))

    def paintEvent(self, event):
        super().paintEvent(event)
        if event.isAccepted() and self.server_error:
            # draw error overlay if we are in an error state
            p = QPainter(self)
            try:
                p.setClipRegion(event.region())
                r = self.rect()
                r -= QMargins(4, 6, 4, 6)
                r.moveCenter(r.center() + QPoint(4, 4))
                p.drawImage(r, get_image_red_exclamation())
            finally:
                # paranoia. The above never raises but.. if it does.. PyQt will
                # crash hard if we don't end the QPainter properly before
                # returning.
                p.end()
                del p

    def toggle_autofuse(self):
        plugin = self.plugin
        autofuse = plugin.is_autofusing(self.wallet)
        if not autofuse:
            has_pw, password = Plugin.get_cached_pw(self.wallet)
            if has_pw and password is None:
                # Fixme: See if we can not use a blocking password dialog here.
                pd = PasswordDialog(
                    self.wallet,
                    _(
                        "To perform auto-fusion in the background, please enter your"
                        " password."
                    ),
                )
                # just in case this plugin is unloaded while this dialog is up
                self.plugin.widgets.add(pd)
                password = pd.run()
                del pd
                # must check plugin.active because user can theoretically kill plugin
                # from another window while the above password dialog is up
                if password is None or not plugin.active:
                    return
            try:
                plugin.enable_autofusing(self.wallet, password)
            except InvalidPassword:
                """Somehow the password changed from underneath us. Silenty ignore."""
        else:
            running = plugin.disable_autofusing(self.wallet)
            if running:
                res = QtWidgets.QMessageBox.question(
                    Plugin.get_suitable_dialog_window_parent(self.wallet),
                    _("Disabling automatic Cash Fusions"),
                    _(
                        "New automatic fusions will not be started, but you have {num}"
                        " currently in progress. Would you like to signal them to stop?"
                    ).format(num=len(running)),
                )
                if res == QtWidgets.QMessageBox.Yes:
                    for f in running:
                        f.stop("Stop requested by user")
        self.update_state()

    def show_wallet_settings(self):
        win = getattr(self.wallet, "_cashfusion_settings_window", None)
        if not win:
            win = WalletSettingsDialog(
                Plugin.get_suitable_dialog_window_parent(self.wallet),
                self.plugin,
                self.wallet,
            )
            # ensures if plugin is unloaded while dialog is up, that the dialog will
            # be killed.
            self.plugin.widgets.add(win)
        win.show()
        win.raise_()

    def update_server_error(self):
        tup = self.plugin.get_server_error()
        changed = tup != self.server_error
        if not changed:
            return
        self.server_error = tup
        # make sure name is unique per FusionButton widget
        name = "CashFusionError;" + str(id(self))
        if self.server_error:
            weak_plugin = weakref.ref(self.plugin)

            def onClick():
                KillPopupLabel(name)
                plugin = weak_plugin()
                if plugin:
                    plugin.show_settings_dialog()

            ShowPopupLabel(
                name=name,
                text="<center><b>{}</b><br><small>{}</small></center>".format(
                    _("Server Error"), _("Click this popup to resolve")
                ),
                target=self,
                timeout=20000,
                onClick=onClick,
                onRightClick=onClick,
            )
        else:
            KillPopupLabel(name)

        self.update()  # causes a repaint

        window = self.wallet.weak_window and self.wallet.weak_window()
        if window:
            window.print_error(
                "CashFusion server_error is now {}".format(self.server_error)
            )
            oldTip = self.statusTip()
            self.update_state()
            newTip = self.statusTip()
            if newTip != oldTip:
                window.statusBar().showMessage(newTip, 7500)


class SettingsWidget(QtWidgets.QWidget):
    torscanthread = None
    torscanthread_update = pyqtSignal(object)

    def __init__(self, plugin, parent=None):
        super().__init__(parent)
        self.plugin = plugin
        self.torscanthread_ping = threading.Event()
        self.torscanthread_update.connect(self.torport_update)

        main_layout = QtWidgets.QVBoxLayout(self)

        box = QtWidgets.QGroupBox(_("Network"))
        main_layout.addWidget(box, 0, Qt.AlignTop | Qt.AlignHCenter)
        slayout = QtWidgets.QVBoxLayout(box)

        grid = QtWidgets.QGridLayout()
        slayout.addLayout(grid)

        grid.addWidget(QtWidgets.QLabel(_("Server")), 0, 0)
        hbox = QtWidgets.QHBoxLayout()
        grid.addLayout(hbox, 0, 1)
        self.combo_server_host = QtWidgets.QComboBox()
        self.combo_server_host.setEditable(True)
        self.combo_server_host.setInsertPolicy(QtWidgets.QComboBox.NoInsert)
        self.combo_server_host.setCompleter(None)
        self.combo_server_host.setSizePolicy(
            QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Fixed
        )
        self.combo_server_host.activated.connect(self.combo_server_activated)
        self.combo_server_host.lineEdit().textEdited.connect(self.user_changed_server)
        self.combo_server_host.addItems(
            [
                f'{s[0]} ({s[1]}{" - ssl" if s[2] else ""})'
                for s in Global.Defaults.ServerList
            ]
        )
        hbox.addWidget(self.combo_server_host)
        hbox.addWidget(QtWidgets.QLabel(_("P:")))
        self.le_server_port = QtWidgets.QLineEdit()
        self.le_server_port.setMaximumWidth(50)
        self.le_server_port.setValidator(PortValidator(self.le_server_port))
        self.le_server_port.textEdited.connect(self.user_changed_server)

        hbox.addWidget(self.le_server_port)
        self.cb_server_ssl = QtWidgets.QCheckBox(_("SSL"))
        self.cb_server_ssl.clicked.connect(self.user_changed_server)
        hbox.addWidget(self.cb_server_ssl)

        self.server_error_label = QtWidgets.QLabel()
        self.server_error_label.setAlignment(Qt.AlignTop | Qt.AlignJustify)
        grid.addWidget(self.server_error_label, 1, 0, 1, -1)

        grid.addWidget(QtWidgets.QLabel(_("Tor")), 2, 0)
        hbox = QtWidgets.QHBoxLayout()
        grid.addLayout(hbox, 2, 1)
        self.le_tor_host = QtWidgets.QLineEdit("localhost")
        self.le_tor_host.textEdited.connect(self.user_edit_torhost)
        hbox.addWidget(self.le_tor_host)
        hbox.addWidget(QtWidgets.QLabel(_("P:")))
        self.le_tor_port = QtWidgets.QLineEdit()
        self.le_tor_port.setMaximumWidth(50)
        self.le_tor_port.setValidator(UserPortValidator(self.le_tor_port))
        self.le_tor_port.textEdited.connect(self.user_edit_torport)
        hbox.addWidget(self.le_tor_port)
        self.l_tor_status = QtWidgets.QLabel()
        hbox.addWidget(self.l_tor_status)
        self.b_tor_refresh = QtWidgets.QPushButton()
        self.b_tor_refresh.clicked.connect(self.torscanthread_ping.set)
        self.b_tor_refresh.setIcon(
            self.style().standardIcon(QtWidgets.QStyle.SP_BrowserReload)
        )
        self.b_tor_refresh.setDefault(False)
        self.b_tor_refresh.setAutoDefault(False)
        hbox.addWidget(self.b_tor_refresh)
        self.cb_tor_auto = QtWidgets.QCheckBox(_("Autodetect"))
        self.cb_tor_auto.clicked.connect(self.cb_tor_auto_clicked)
        hbox.addWidget(self.cb_tor_auto)

        btn = QtWidgets.QPushButton(_("Fusions..."))
        btn.setDefault(False)
        btn.setAutoDefault(False)
        btn.clicked.connect(self.plugin.show_util_window)
        buts = Buttons(btn)
        buts.setAlignment(Qt.AlignRight | Qt.AlignTop)
        main_layout.addLayout(buts)

        main_layout.addStretch(1)
        self.stretch_item_index = main_layout.count() - 1

        self.server_widget = ServerWidget(self.plugin)
        self.server_widget.layout().setContentsMargins(0, 0, 0, 0)
        main_layout.addWidget(self.server_widget)
        self.timer_server_widget_visibility = QTimer(self.server_widget)
        self.timer_server_widget_visibility.setSingleShot(False)
        self.timer_server_widget_visibility.timeout.connect(
            self.update_server_widget_visibility
        )

        self.server_widget_index = main_layout.count() - 1

        self.pm_good_proxy = QIcon(":icons/status_connected_proxy.svg").pixmap(24)
        self.pm_bad_proxy = QIcon(":icons/status_disconnected.svg").pixmap(24)

    def update_server(self):
        # called initially / when config changes
        host, port, ssl = self.plugin.get_server()
        try:  # see if it's in default list, if so we can set it ...
            index = Global.Defaults.ServerList.index((host, port, ssl))
        except ValueError:  # not in list
            index = -1
        self.combo_server_host.setCurrentIndex(index)
        self.combo_server_host.setEditText(host)
        self.le_server_port.setText(str(port))
        self.cb_server_ssl.setChecked(ssl)

    def update_server_error(self):
        errtup = self.plugin.get_server_error()
        self.server_error_label.setHidden(errtup is None)
        if errtup:
            color = ColorScheme.RED.get_html()
            self.server_error_label.setText(
                f'<b>{errtup[0]}:</b> <font color="{color}"><i>{errtup[1]}</i></font>'
            )

    def combo_server_activated(self, index):
        # only triggered when user selects a combo item
        self.plugin.set_server(*Global.Defaults.ServerList[index])
        self.update_server()

    def user_changed_server(self, *args):
        # user edited the host / port / ssl
        host = self.combo_server_host.currentText()
        try:
            port = int(self.le_server_port.text())
        except ValueError:
            port = 0
        ssl = self.cb_server_ssl.isChecked()
        self.plugin.set_server(host, port, ssl)

    def update_tor(
        self,
    ):
        # called on init an switch of auto
        autoport = self.plugin.has_auto_torport()
        host = self.plugin.get_torhost()
        port = self.plugin.get_torport()
        self.l_tor_status.clear()
        self.torport_update(port)
        self.cb_tor_auto.setChecked(autoport)
        self.le_tor_host.setEnabled(not autoport)
        self.le_tor_host.setText(str(host))
        self.le_tor_port.setEnabled(not autoport)
        if not autoport:
            self.le_tor_port.setText(str(port))

    def torport_update(self, goodport):
        # signalled from the tor checker thread
        autoport = self.plugin.has_auto_torport()
        port = self.plugin.get_torport()
        if autoport:
            sport = "?" if port is None else str(port)
            self.le_tor_port.setText(sport)
        if goodport is None:
            self.l_tor_status.setPixmap(self.pm_bad_proxy)
            # TODO: switch from %-string to str.format (update also translation files)
            if autoport:
                self.l_tor_status.setToolTip(
                    _("Cannot find a Tor proxy on ports %(ports)s.")
                    % {"ports": TOR_PORTS}
                )
            else:
                self.l_tor_status.setToolTip(
                    _("Cannot find a Tor proxy on port %(port)d.") % {"port": port}
                )
        else:
            self.l_tor_status.setToolTip(_("Found a valid Tor proxy on this port."))
            self.l_tor_status.setPixmap(self.pm_good_proxy)

    def user_edit_torhost(self, host):
        self.plugin.set_torhost(host)
        self.torscanthread_ping.set()

    def user_edit_torport(self, sport):
        try:
            port = int(sport)
        except ValueError:
            return
        self.plugin.set_torport(port)
        self.torscanthread_ping.set()

    def cb_tor_auto_clicked(self, state):
        self.plugin.set_torport("auto" if state else "manual")
        port = self.plugin.get_torport()
        if port is not None:
            self.le_tor_port.setText(str(port))
        self.torscanthread_ping.set()
        self.update_tor()

    def refresh(self):
        self.update_server()
        self.update_tor()
        self.update_server_widget_visibility()
        self.update_server_error()

    def update_server_widget_visibility(self):
        if not self.server_widget.is_server_running():
            self.server_widget.setHidden(True)
            self.layout().setStretch(self.stretch_item_index, 1)
            self.layout().setStretch(self.server_widget_index, 0)
        else:
            self.server_widget.setHidden(False)
            self.layout().setStretch(self.stretch_item_index, 0)
            self.layout().setStretch(self.server_widget_index, 1)

    def showEvent(self, event):
        super().showEvent(event)
        if not event.isAccepted():
            return
        self.refresh()
        self.timer_server_widget_visibility.start(2000)
        if self.torscanthread is None:
            self.torscanthread = threading.Thread(
                name="Fusion-scan_torport_settings", target=self.scan_torport_loop
            )
            self.torscanthread.daemon = True
            self.torscanthread_stopping = False
            self.torscanthread.start()

    def _hide_close_common(self):
        self.timer_server_widget_visibility.stop()
        self.torscanthread_stopping = True
        self.torscanthread_ping.set()
        self.torscanthread = None

    def closeEvent(self, event):
        super().closeEvent(event)
        if not event.isAccepted():
            return
        self._hide_close_common()

    def hideEvent(self, event):
        super().hideEvent(event)
        if not event.isAccepted():
            return
        self._hide_close_common()

    def scan_torport_loop(
        self,
    ):
        while not self.torscanthread_stopping:
            goodport = self.plugin.scan_torport()
            self.torscanthread_update.emit(goodport)
            self.torscanthread_ping.wait(10)
            self.torscanthread_ping.clear()


class WalletSettingsDialog(WindowModalDialog):
    GUI_DEFAULT_FUSE_DEPTH = (
        3  # This what the fuse depth spinbox defaults to, if checked (on new installs)
    )

    def __init__(self, parent, plugin, wallet):
        super().__init__(parent=parent, title=_("CashFusion - Wallet Settings"))
        self.setWindowIcon(get_icon_fusion_logo())
        self.plugin = plugin
        self.wallet = wallet
        self.conf = Conf(self.wallet)

        self.idx2confkey = {}  # int -> 'normal', 'consolidate', etc..
        self.confkey2idx = {}  # str 'normal', 'consolidate', etc -> int

        assert not hasattr(self.wallet, "_cashfusion_settings_window")
        main_window = self.wallet.weak_window()
        assert main_window
        self.wallet._cashfusion_settings_window = self

        main_layout = QtWidgets.QVBoxLayout(self)

        hbox = QtWidgets.QHBoxLayout()
        hbox.addWidget(QtWidgets.QLabel(_("Fusion mode:")))
        self.mode_cb = mode_cb = QtWidgets.QComboBox()

        hbox.addWidget(mode_cb)

        main_layout.addLayout(hbox)

        self.gb_fuse_depth = gb = QtWidgets.QGroupBox(_("Fusion Rounds"))
        gb.setToolTip(
            _(
                "If checked, CashFusion will fuse each coin this many times.\n"
                "If unchecked, Cashfusion will fuse indefinitely until paused."
            )
        )
        hbox = QtWidgets.QHBoxLayout(gb)
        self.chk_fuse_depth = chk = QtWidgets.QCheckBox(_("Fuse coins this many times"))
        hbox.addWidget(chk, 1)
        self.sb_fuse_depth = sb = QtWidgets.QSpinBox()
        sb.setRange(1, MAX_LIMIT_FUSE_DEPTH)
        if self.conf.fuse_depth <= 0:
            # Default it to this if unchecked
            self.sb_fuse_depth.setValue(self.GUI_DEFAULT_FUSE_DEPTH)
        sb.setMinimumWidth(75)
        hbox.addWidget(sb)
        chk.toggled.connect(self.edited_fuse_depth)
        sb.valueChanged.connect(self.edited_fuse_depth)
        main_layout.addWidget(gb)

        self.gb_coinbase = gb = QtWidgets.QGroupBox(_("Coinbase Coins"))
        vbox = QtWidgets.QVBoxLayout(gb)
        self.cb_coinbase = QtWidgets.QCheckBox(
            _("Auto-fuse coinbase coins (if mature)")
        )
        self.cb_coinbase.clicked.connect(self._on_cb_coinbase)
        vbox.addWidget(self.cb_coinbase)
        # The coinbase-related group box is hidden by default. It becomes
        # visible permanently when the wallet settings dialog has seen at least
        # one coinbase coin, indicating a miner's wallet. For most users the
        # coinbase checkbox is confusing, which is why we prefer to hide it.
        gb.setHidden(True)
        main_layout.addWidget(gb)

        box = QtWidgets.QGroupBox(_("Self-Fusing"))
        main_layout.addWidget(box)
        slayout = QtWidgets.QVBoxLayout(box)

        lbl = QtWidgets.QLabel(
            _("Allow this wallet to participate multiply in the same fusion round?")
        )
        lbl.setWordWrap(True)
        slayout.addWidget(lbl)
        box = QtWidgets.QHBoxLayout()
        box.setContentsMargins(0, 0, 0, 0)
        self.combo_self_fuse = QtWidgets.QComboBox()
        self.combo_self_fuse.addItem(_("No"), 1)
        self.combo_self_fuse.addItem(_("Yes - as up to two players"), 2)
        box.addStretch(1)
        box.addWidget(self.combo_self_fuse)
        slayout.addLayout(box)
        del box

        self.combo_self_fuse.activated.connect(self.chose_self_fuse)

        self.stacked_layout = stacked_layout = QtWidgets.QStackedLayout()
        main_layout.addLayout(stacked_layout)

        # Stacked Layout pages ...

        # Normal
        normal_page_w = QtWidgets.QWidget()
        normal_page_layout = QtWidgets.QVBoxLayout(normal_page_w)
        self.confkey2idx["normal"] = stacked_layout.addWidget(normal_page_w)
        mode_cb.addItem(_("Normal"))
        lbl = QtWidgets.QLabel("- " + _("Normal mode") + " -")
        lbl.setAlignment(Qt.AlignCenter)
        normal_page_layout.addWidget(lbl)

        # Consolidate
        consolidate_page_w = QtWidgets.QWidget()
        consolidate_page_layout = QtWidgets.QVBoxLayout(consolidate_page_w)
        self.confkey2idx["consolidate"] = stacked_layout.addWidget(consolidate_page_w)
        mode_cb.addItem(_("Consolidate"))
        lbl = QtWidgets.QLabel("- " + _("Consolidation mode") + " -")
        lbl.setAlignment(Qt.AlignCenter)
        consolidate_page_layout.addWidget(lbl)

        # Fan-out
        fanout_page_w = QtWidgets.QWidget()
        fanout_page_layout = QtWidgets.QVBoxLayout(fanout_page_w)
        self.confkey2idx["fan-out"] = stacked_layout.addWidget(fanout_page_w)
        mode_cb.addItem(_("Fan-out"))
        lbl = QtWidgets.QLabel("- " + _("Fan-out mode") + " -")
        lbl.setAlignment(Qt.AlignCenter)
        fanout_page_layout.addWidget(lbl)

        # Custom
        self.custom_page_w = custom_page_w = QtWidgets.QWidget()
        custom_page_layout = QtWidgets.QVBoxLayout(custom_page_w)
        custom_page_layout.setContentsMargins(0, 0, 0, 0)
        self.confkey2idx["custom"] = stacked_layout.addWidget(custom_page_w)
        mode_cb.addItem(_("Custom"))

        mode_cb.currentIndexChanged.connect(
            self._on_mode_changed
        )  # intentionally connected after all items already added

        box = QtWidgets.QGroupBox(_("Auto-Fusion Coin Selection"))
        custom_page_layout.addWidget(box)
        slayout = QtWidgets.QVBoxLayout(box)

        grid = QtWidgets.QGridLayout()
        slayout.addLayout(grid)

        self.radio_select_size = QtWidgets.QRadioButton(
            _("Target typical output amount")
        )
        grid.addWidget(self.radio_select_size, 0, 0)
        self.radio_select_fraction = QtWidgets.QRadioButton(_("Per-coin random chance"))
        grid.addWidget(self.radio_select_fraction, 1, 0)
        self.radio_select_count = QtWidgets.QRadioButton(
            _("Target number of coins in wallet")
        )
        grid.addWidget(self.radio_select_count, 2, 0)

        self.radio_select_size.clicked.connect(self.edited_size)
        self.radio_select_fraction.clicked.connect(self.edited_fraction)
        self.radio_select_count.clicked.connect(self.edited_count)

        self.amt_selector_size = XECAmountEdit(main_window.get_decimal_point())
        grid.addWidget(self.amt_selector_size, 0, 1)
        self.sb_selector_fraction = QtWidgets.QDoubleSpinBox()
        self.sb_selector_fraction.setRange(0.1, 100.0)
        self.sb_selector_fraction.setSuffix("%")
        self.sb_selector_fraction.setDecimals(1)
        grid.addWidget(self.sb_selector_fraction, 1, 1)
        self.sb_selector_count = QtWidgets.QSpinBox()
        self.sb_selector_count.setRange(
            COIN_FRACTION_FUDGE_FACTOR, 9999
        )  # Somewhat hardcoded limit of 9999 is arbitrary, have this come from constants?
        grid.addWidget(self.sb_selector_count, 2, 1)

        self.amt_selector_size.editingFinished.connect(self.edited_size)
        self.sb_selector_fraction.valueChanged.connect(self.edited_fraction)
        self.sb_selector_count.valueChanged.connect(self.edited_count)

        # Clicking the radio button should bring its corresponding widget buddy into focus
        self.radio_select_size.clicked.connect(self.amt_selector_size.setFocus)
        self.radio_select_fraction.clicked.connect(self.sb_selector_fraction.setFocus)
        self.radio_select_count.clicked.connect(self.sb_selector_count.setFocus)

        low_warn_blurb = _("Are you trying to consolidate?")
        low_warn_tooltip = _("Click for consolidation tips")
        low_warn_blurb_link = '<a href="unused">' + low_warn_blurb + "</a>"
        self.l_warn_selection = QtWidgets.QLabel(
            "<center>" + low_warn_blurb_link + "</center>"
        )
        self.l_warn_selection.setToolTip(low_warn_tooltip)
        self.l_warn_selection.linkActivated.connect(self._show_low_warn_help)
        self.l_warn_selection.setAlignment(Qt.AlignJustify | Qt.AlignVCenter)
        qs = QtWidgets.QSizePolicy(
            QtWidgets.QSizePolicy.Preferred, QtWidgets.QSizePolicy.Preferred
        )
        qs.setRetainSizeWhenHidden(True)
        self.l_warn_selection.setSizePolicy(qs)
        slayout.addWidget(self.l_warn_selection)
        slayout.setAlignment(self.l_warn_selection, Qt.AlignCenter)

        box = QtWidgets.QGroupBox(_("Auto-Fusion Limits"))
        custom_page_layout.addWidget(box)
        slayout = QtWidgets.QVBoxLayout(box)
        grid = QtWidgets.QGridLayout()
        slayout.addLayout(grid)
        grid.addWidget(QtWidgets.QLabel(_("Number of queued fusions")), 0, 0)
        self.sb_queued_autofuse = QtWidgets.QSpinBox()
        self.sb_queued_autofuse.setRange(
            1, 10
        )  # hard-coded rande 1-10, maybe have this come from some constants?
        self.sb_queued_autofuse.setMinimumWidth(
            50
        )  # just so it doesn't end up too tiny
        grid.addWidget(self.sb_queued_autofuse, 0, 1)
        self.cb_autofuse_only_all_confirmed = QtWidgets.QCheckBox(
            _("Only auto-fuse when all coins are confirmed")
        )
        slayout.addWidget(self.cb_autofuse_only_all_confirmed)
        grid.addWidget(QtWidgets.QWidget(), 0, 2)
        grid.setColumnStretch(2, 1)  # spacer

        self.sb_queued_autofuse.valueChanged.connect(self.edited_queued_autofuse)
        self.cb_autofuse_only_all_confirmed.clicked.connect(self.clicked_confirmed_only)

        # / end pages

        cbut = CloseButton(self)
        main_layout.addLayout(Buttons(cbut))
        cbut.setDefault(False)
        cbut.setAutoDefault(False)

        self.idx2confkey = inv_dict(
            self.confkey2idx
        )  # This must be set-up before this function returns

        # We do this here in addition to in showEvent because on some platforms
        # (such as macOS), the window animates-in before refreshing properly and
        # then it refreshes, leading to a jumpy glitch. If we do this, it
        # slides-in already looking as it should.
        self.refresh()

    def _show_low_warn_help(self):
        low_warn_message = (
            _("If you wish to consolidate coins:")
            + "<ul>"
            + "<li>"
            + _("Specify a maximum of 1 queued fusion")
            + "<li>"
            + _("Set 'self-fusing' to 'No'")
            + "<li>"
            + _("Check the 'only when all coins are confirmed' checkbox")
            + "</ul>"
            + _(
                "If you do not wish to necessarily consolidate coins, then it's"
                " perfectly acceptable to ignore this tip."
            )
        )
        self.show_message(low_warn_message, title=_("Help"), rich_text=True)

    def _on_mode_changed(self, idx: int):
        self.conf.fusion_mode = self.idx2confkey[
            idx
        ]  # will raise on bad idx, which indicates programming error.
        self.refresh()

    def _on_cb_coinbase(self, checked: bool):
        self.conf.autofuse_coinbase = checked
        self.refresh()

    def _maybe_switch_page(self):
        mode = self.conf.fusion_mode
        try:
            idx = self.confkey2idx[mode]
            idx_custom = self.confkey2idx["custom"]
            # The below conditional ensures that the custom page always
            # disappears from the layout if not selected. We do this because it
            # is rather large and makes this window unnecessarily big. Note this
            # only works if the 'custom' page is last.. otherwise bad things
            # happen!
            assert idx_custom == max(
                self.confkey2idx.values()
            )  # ensures custom is last page otherwise this code breaks
            if idx == idx_custom:
                if not self.stacked_layout.itemAt(idx_custom):
                    self.stacked_layout.insertWidget(idx_custom, self.custom_page_w)
            elif self.stacked_layout.count() - 1 == idx_custom:
                self.stacked_layout.takeAt(idx_custom)
            self.stacked_layout.setCurrentIndex(idx)
            self.mode_cb.setCurrentIndex(idx)
        except KeyError as e:
            # should never happen because settings object filters out unknown modes
            raise RuntimeError(f"INTERNAL ERROR: Unknown fusion mode: '{mode}'") from e

        self.updateGeometry()
        self.resize(self.sizeHint())

        return idx == idx_custom

    def refresh(self):
        eligible, ineligible, sum_value, has_unconfirmed, has_coinbase = select_coins(
            self.wallet
        )

        select_type, select_amount = self.conf.selector

        edit_widgets = [
            self.amt_selector_size,
            self.sb_selector_fraction,
            self.sb_selector_count,
            self.sb_queued_autofuse,
            self.cb_autofuse_only_all_confirmed,
            self.combo_self_fuse,
            self.stacked_layout,
            self.mode_cb,
            self.cb_coinbase,
            self.sb_fuse_depth,
            self.chk_fuse_depth,
        ]
        try:
            for w in edit_widgets:
                # Block spurious editingFinished signals and valueChanged signals as
                # we modify the state and focus of widgets programatically below.
                # On macOS not doing this led to a very strange/spazzy UI.
                w.blockSignals(True)

            self.cb_coinbase.setChecked(self.conf.autofuse_coinbase)
            if not self.gb_coinbase.isVisible():
                cb_latch = self.conf.coinbase_seen_latch
                if cb_latch or self.cb_coinbase.isChecked() or has_coinbase:
                    if not cb_latch:
                        # Once latched to true, this UI element will forever be
                        # visible for this wallet.  It means the wallet is a miner's
                        # wallet and they care about coinbase coins.
                        self.conf.coinbase_seen_latch = True
                    self.gb_coinbase.setHidden(False)
                del cb_latch

            is_custom_page = self._maybe_switch_page()

            idx = 0
            if self.conf.self_fuse_players > 1:
                idx = 1
            self.combo_self_fuse.setCurrentIndex(idx)
            del idx

            if self.conf.fuse_depth > 0:
                self.sb_fuse_depth.setValue(self.conf.fuse_depth)
            self.chk_fuse_depth.setChecked(self.conf.fuse_depth > 0)
            self.sb_fuse_depth.setEnabled(self.conf.fuse_depth > 0)

            if is_custom_page:
                self.amt_selector_size.setEnabled(select_type == "size")
                self.sb_selector_count.setEnabled(select_type == "count")
                self.sb_selector_fraction.setEnabled(select_type == "fraction")
                if select_type == "size":
                    self.radio_select_size.setChecked(True)
                    sel_size = select_amount
                    if sum_value > 0:
                        sel_fraction = min(
                            COIN_FRACTION_FUDGE_FACTOR * select_amount / sum_value, 1.0
                        )
                    else:
                        sel_fraction = 1.0
                elif select_type == "count":
                    self.radio_select_count.setChecked(True)
                    sel_size = max(sum_value / max(select_amount, 1), 10000)
                    sel_fraction = COIN_FRACTION_FUDGE_FACTOR / max(select_amount, 1)
                elif select_type == "fraction":
                    self.radio_select_fraction.setChecked(True)
                    sel_size = max(
                        sum_value * select_amount / COIN_FRACTION_FUDGE_FACTOR, 10000
                    )
                    sel_fraction = select_amount
                else:
                    self.conf.selector = None
                    return self.refresh()
                sel_count = round(COIN_FRACTION_FUDGE_FACTOR / max(sel_fraction, 0.001))
                self.amt_selector_size.setAmount(round(sel_size))
                self.sb_selector_fraction.setValue(
                    max(min(sel_fraction, 1.0), 0.001) * 100.0
                )
                self.sb_selector_count.setValue(sel_count)
                try:
                    self.sb_queued_autofuse.setValue(self.conf.queued_autofuse)
                except (TypeError, ValueError):
                    pass  # should never happen but paranoia pays off in the long-term
                conf_only = self.conf.autofuse_confirmed_only
                self.cb_autofuse_only_all_confirmed.setChecked(conf_only)
                self.l_warn_selection.setVisible(
                    sel_fraction > 0.2
                    and (not conf_only or self.sb_queued_autofuse.value() > 1)
                )
        finally:
            # re-enable signals
            for w in edit_widgets:
                w.blockSignals(False)

    def edited_size(
        self,
    ):
        size = self.amt_selector_size.get_amount()
        if size is None or size < 10000:
            size = 10000
        self.conf.selector = ("size", size)
        self.refresh()

    def edited_fraction(
        self,
    ):
        fraction = max(self.sb_selector_fraction.value() / 100.0, 0.0)
        self.conf.selector = ("fraction", round(fraction, 3))
        self.refresh()

    def edited_count(
        self,
    ):
        count = self.sb_selector_count.value()
        self.conf.selector = ("count", count)
        self.refresh()

    def edited_queued_autofuse(
        self,
    ):
        prevval = self.conf.queued_autofuse
        numfuse = self.sb_queued_autofuse.value()
        self.conf.queued_autofuse = numfuse
        if prevval > numfuse:
            for f in list(self.wallet._fusions_auto):
                f.stop("User decreased queued-fuse limit", not_if_running=True)
        self.refresh()

    def edited_fuse_depth(
        self,
    ):
        prevval = self.conf.fuse_depth
        newval = self.sb_fuse_depth.value() if self.chk_fuse_depth.isChecked() else 0
        self.conf.fuse_depth = newval
        if prevval == 0 or (prevval > newval and newval != 0):
            for f in list(self.wallet._fusions_auto):
                f.stop("User decreased fuse depth limit", not_if_running=False)
        # update the send tab label for the "spend only confirmed coins" checkbox
        main_window = self.wallet.weak_window and self.wallet.weak_window()
        if main_window:
            chk = main_window.findChild(
                QtWidgets.QCheckBox, "spend_only_fused_chk", Qt.FindChildrenRecursively
            )
            if chk:
                (
                    label,
                    tooltip,
                ) = self.plugin.get_spend_only_fused_coins_checkbox_attributes(
                    self.wallet
                )
                chk.setText(label)
                chk.setToolTip(tooltip)
            # Coins tab may need redisplay if we changed these settings
            if prevval != newval:
                main_window.utxo_list.update()
        self.refresh()

    def clicked_confirmed_only(self, checked):
        self.conf.autofuse_confirmed_only = checked
        self.refresh()

    def chose_self_fuse(
        self,
    ):
        sel = self.combo_self_fuse.currentData()
        oldsel = self.conf.self_fuse_players
        if oldsel != sel:
            self.conf.self_fuse_players = sel
            for f in self.wallet._fusions:
                # we have to stop waiting fusions since the tags won't overlap.
                # otherwise, the user will end up self fusing way too much.
                f.stop("User changed self-fuse limit", not_if_running=True)
        self.refresh()

    def closeEvent(self, event):
        super().closeEvent(event)
        if event.isAccepted():
            self.setParent(None)
            del self.wallet._cashfusion_settings_window

    def showEvent(self, event):
        super().showEvent(event)
        if event.isAccepted():
            self.refresh()


class ServerFusionsBaseMixin:
    def __init__(self, plugin, refresh_interval=2000):
        assert isinstance(self, QtWidgets.QWidget)
        self.plugin = plugin
        self.refresh_interval = refresh_interval

        self.timer_refresh = QTimer(self)
        self.timer_refresh.setSingleShot(False)
        self.timer_refresh.timeout.connect(self.refresh)

    def _on_show(self):
        self.timer_refresh.start(self.refresh_interval)
        self.refresh()

    def _on_hide(self):
        self.timer_refresh.stop()

    def showEvent(self, event):
        super().showEvent(event)
        if event.isAccepted():
            self._on_show()

    def hideEvent(self, event):
        super().hideEvent(event)
        if event.isAccepted():
            self._on_hide()

    def closeEvent(self, event):
        super().closeEvent(event)
        if event.isAccepted():
            self._on_hide()

    def refresh(self):
        raise NotImplementedError(
            "ServerFusionsBaseMixin refresh() needs an implementation"
        )


class ServerWidget(ServerFusionsBaseMixin, QtWidgets.QWidget):
    def __init__(self, plugin, parent=None):
        QtWidgets.QWidget.__init__(self, parent)
        ServerFusionsBaseMixin.__init__(self, plugin)

        main_layout = QtWidgets.QVBoxLayout(self)

        self.serverbox = QtWidgets.QGroupBox(_("Server"))
        main_layout.addWidget(self.serverbox)
        # self.serverbox.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Preferred)

        slayout = QtWidgets.QVBoxLayout(self.serverbox)

        self.l_server_status = QtWidgets.QLabel()
        slayout.addWidget(self.l_server_status)

        self.t_server_waiting = QtWidgets.QTableWidget()
        self.t_server_waiting.setColumnCount(3)
        self.t_server_waiting.setRowCount(len(Params.tiers))
        self.t_server_waiting.setHorizontalHeaderLabels(
            [_("Tier (sats)"), _("Num players"), ""]
        )
        for i, t in enumerate(Params.tiers):
            button = QtWidgets.QPushButton(_("Start"))
            button.setDefault(False)
            # on some platforms if we don't do this, one of the buttons traps "Enter"
            # key
            button.setAutoDefault(False)
            button.clicked.connect(partial(self.clicked_start_fuse, t))
            self.t_server_waiting.setCellWidget(i, 2, button)
        slayout.addWidget(self.t_server_waiting)

    def sizeHint(self):
        return QSize(300, 150)

    def refresh(self):
        if self.is_server_running():
            self.t_server_waiting.setEnabled(True)
            self.l_server_status.setText(
                _("Server status: ACTIVE")
                + f" {self.plugin.fusion_server.host}:{self.plugin.fusion_server.port}"
            )
            table = self.t_server_waiting
            table.setRowCount(len(self.plugin.fusion_server.waiting_pools))
            for i, (t, pool) in enumerate(
                self.plugin.fusion_server.waiting_pools.items()
            ):
                table.setItem(i, 0, QtWidgets.QTableWidgetItem(str(t)))
                table.setItem(i, 1, QtWidgets.QTableWidgetItem(str(len(pool.pool))))
        else:
            self.t_server_waiting.setEnabled(False)
            self.l_server_status.setText(_("Server status: NOT RUNNING"))

    def is_server_running(self):
        return bool(self.plugin.fusion_server)

    def clicked_start_fuse(self, tier, event):
        if self.plugin.fusion_server is None:
            return
        self.plugin.fusion_server.start_fuse(tier)


class FusionsWindow(ServerFusionsBaseMixin, QtWidgets.QDialog):
    def __init__(self, plugin):
        QtWidgets.QDialog.__init__(self, parent=None)
        ServerFusionsBaseMixin.__init__(self, plugin, refresh_interval=1000)

        self.setWindowTitle(_("CashFusion - Fusions"))
        self.setWindowIcon(get_icon_fusion_logo())

        main_layout = QtWidgets.QVBoxLayout(self)

        clientbox = QtWidgets.QGroupBox(_("Fusions"))
        main_layout.addWidget(clientbox)

        clayout = QtWidgets.QVBoxLayout(clientbox)

        self.t_active_fusions = QtWidgets.QTreeWidget()
        self.t_active_fusions.setHeaderLabels(
            [_("Wallet"), _("Status"), _("Status Extra")]
        )
        self.t_active_fusions.setContextMenuPolicy(Qt.CustomContextMenu)
        self.t_active_fusions.customContextMenuRequested.connect(
            self.create_menu_active_fusions
        )
        self.t_active_fusions.setSelectionMode(
            QtWidgets.QAbstractItemView.ExtendedSelection
        )
        self.t_active_fusions.itemDoubleClicked.connect(self.on_double_clicked)
        clayout.addWidget(self.t_active_fusions)

        self.resize(520, 240)  # TODO: Have this somehow not be hard-coded

    def refresh(self):
        tree = self.t_active_fusions
        reselect_fusions = {i.data(0, Qt.UserRole)() for i in tree.selectedItems()}
        reselect_fusions.discard(None)
        reselect_items = []
        tree.clear()
        for fusion in reversed(self.plugin.get_all_fusions()):
            wname = fusion.target_wallet.diagnostic_name()
            status, status_ext = fusion.status
            item = QtWidgets.QTreeWidgetItem([wname, status, status_ext])
            item.setToolTip(0, wname)  # this doesn't always fit in the column
            item.setToolTip(2, status_ext or "")  # neither does this
            item.setData(0, Qt.UserRole, weakref.ref(fusion))
            if fusion in reselect_fusions:
                reselect_items.append(item)
            tree.addTopLevelItem(item)
        for item in reselect_items:
            item.setSelected(True)

    def create_menu_active_fusions(self, position):
        selected = self.t_active_fusions.selectedItems()
        if not selected:
            return

        fusions = {i.data(0, Qt.UserRole)() for i in selected}
        fusions.discard(None)
        statuses = {f.status[0] for f in fusions}
        selection_of_1_fusion = list(fusions)[0] if len(fusions) == 1 else None
        has_live = "running" in statuses or "waiting" in statuses

        menu = QtWidgets.QMenu()

        def cancel():
            for fusion in fusions:
                fusion.stop(_("Stop requested by user"))

        if has_live:
            if "running" in statuses:
                msg = _("Cancel (at end of round)")
            else:
                msg = _("Cancel")
            menu.addAction(msg, cancel)
        if selection_of_1_fusion and selection_of_1_fusion.txid:
            menu.addAction(
                _("View Tx..."), lambda: self._open_tx_for_fusion(selection_of_1_fusion)
            )
        if not menu.isEmpty():
            menu.exec_(self.t_active_fusions.viewport().mapToGlobal(position))

    def on_double_clicked(self, item, column):
        self._open_tx_for_fusion(item.data(0, Qt.UserRole)())

    def _open_tx_for_fusion(self, fusion):
        if not fusion or not fusion.txid or not fusion.target_wallet:
            return
        wallet = fusion.target_wallet
        window = wallet.weak_window and wallet.weak_window()
        txid = fusion.txid
        if window:
            tx = window.wallet.transactions.get(txid)
            if tx:
                window.show_transaction(tx, wallet.get_label(txid))
            else:
                window.show_error(_("Transaction not yet in wallet"))
