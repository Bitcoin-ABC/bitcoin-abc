#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2012 thomasv@gitorious
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

import contextlib
import csv
import json
import os
import shutil
import sys
import threading
import time
import traceback
from decimal import Decimal as PyDecimal  # Qt 5.12 also exports Decimal
from functools import partial
from typing import TYPE_CHECKING, List, Optional

from qtpy import QtWidgets
from qtpy.QtCore import (
    QObject,
    QRect,
    Qt,
    QTimer,
    Signal,
    SignalInstance,
)
from qtpy.QtGui import QColor, QCursor, QFont, QIcon, QKeySequence, QTextOption

import electrumabc.web as web
from electrumabc import bitcoin, commands, networks, paymentrequest, util
from electrumabc.address import Address
from electrumabc.alias import DEFAULT_ENABLE_ALIASES
from electrumabc.amount import (
    base_unit,
    format_amount,
    format_amount_and_units,
)
from electrumabc.bip32 import InvalidXKeyFormat, InvalidXKeyNotBase58, deserialize_xpub
from electrumabc.constants import CURRENCY, PROJECT_NAME, REPOSITORY_URL, SCRIPT_NAME
from electrumabc.contacts import Contact
from electrumabc.ecc import ECPubkey
from electrumabc.i18n import _
from electrumabc.plugins import run_hook
from electrumabc.printerror import is_verbose
from electrumabc.transaction import (
    SerializationError,
    Transaction,
    rawtx_from_str,
)
from electrumabc.util import (
    InvalidPassword,
    PrintError,
    UserCancelled,
    Weak,
    bfh,
    bh2u,
    format_time,
)
from electrumabc.wallet import AbstractWallet, MultisigWallet

from . import address_dialog, external_plugins_window, qrwindow
from .address_list import AddressList
from .amountedit import AmountEdit, XECAmountEdit
from .avalanche.delegation_editor import AvaDelegationDialog
from .avalanche.proof_editor import AvaProofDialog
from .avalanche.util import AuxiliaryKeysDialog
from .bip38_importer import Bip38Importer
from .console import Console
from .contact_list import ContactList
from .fee_slider import FeeSlider
from .history_list import HistoryList
from .invoice_dialog import InvoiceDialog
from .multi_transactions_dialog import MultiTransactionsDialog
from .password_dialog import (
    ChangePasswordDialogForHW,
    ChangePasswordDialogForSW,
    PassphraseDialog,
    PasswordDialog,
)
from .qrcodewidget import QRCodeWidget, QRDialog
from .qrreader import QrReaderCameraDialog
from .qrtextedit import ShowQRTextEdit
from .request_list import RequestList
from .scan_beyond_gap import ScanBeyondGap
from .seed_dialog import SeedDialog
from .send_tab import SendTab
from .settings_dialog import SettingsDialog
from .sign_verify_dialog import SignVerifyDialog
from .statusbar import NetworkStatus, StatusBar
from .transaction_dialog import show_transaction
from .tree_widget import MyTreeWidget
from .util import (
    MONOSPACE_FONT,
    Buttons,
    ButtonsLineEdit,
    CancelButton,
    ChoicesLayout,
    CloseButton,
    ColorScheme,
    CopyCloseButton,
    EnterButton,
    HelpButton,
    HelpLabel,
    MessageBoxMixin,
    OkButton,
    RateLimiter,
    TaskThread,
    WaitingDialog,
    WindowModalDialog,
    WWLabel,
    copy_to_clipboard,
    destroyed_print_error,
    expiration_values,
    filename_field,
    getOpenFileName,
    getSaveFileName,
    rate_limited,
    text_dialog,
)
from .utxo_list import UTXOList

if sys.platform.startswith("linux"):
    from .udev_installer import InstallHardwareWalletSupportDialog

try:
    # pre-load QtMultimedia at app start, if possible
    # this is because lazy-loading it from within Python
    # callbacks led to crashes on Linux, likely due to
    # bugs in PyQt5 (crashes wouldn't happen when testing
    # with PySide2!).
    from qtpy.QtMultimedia import QCameraInfo

    # defensive programming: not always available so don't keep name around
    del QCameraInfo
except ImportError:
    pass  # we tried to pre-load it, failure is ok; camera just won't be available

if TYPE_CHECKING:
    from . import ElectrumGui


class ElectrumWindow(QtWidgets.QMainWindow, MessageBoxMixin, PrintError):
    # Note: self.clean_up_connections automatically detects signals named XXX_signal
    # and disconnects them on window close.
    new_fx_quotes_signal = Signal()
    new_fx_history_signal = Signal()
    network_signal = Signal(str, object)
    alias_received_signal = Signal()
    history_updated_signal = Signal()
    # note this signal occurs when an explicit update_labels() call happens. Interested
    # GUIs should also listen for history_updated_signal as well which also indicates
    # labels may have changed.
    labels_updated_signal = Signal()
    # functions wanting to be executed from timer_actions should connect to this
    # signal, preferably via Qt.DirectConnection
    on_timer_signal = Signal()

    def __init__(self, gui_object: ElectrumGui, wallet: AbstractWallet):
        QtWidgets.QMainWindow.__init__(self)

        self.gui_object = gui_object
        self.gui_thread = gui_object.gui_thread
        self.wallet = wallet
        assert not self.wallet.weak_window
        # This enables plugins such as CashFusion to keep just a reference to the
        # wallet, but eventually be able to find the window it belongs to.
        self.wallet.weak_window = Weak.ref(self)

        self.config = gui_object.config
        assert self.wallet and self.config and self.gui_object

        self.network = gui_object.daemon.network
        self.fx = gui_object.daemon.fx
        self.tray = gui_object.tray
        self.app = gui_object.app
        self.cleaned_up = False
        self.qr_window = None
        self.internalpluginsdialog = None
        self.externalpluginsdialog = None
        self.hardwarewalletdialog = None
        # alias for backwards compatibility for plugins -- this signal used to live in
        # each window and has since been refactored to gui-object where it belongs
        # (since it's really an app-global setting)
        self.addr_fmt_changed = self.gui_object.addr_fmt_changed
        self.tl_windows = []
        self._tx_dialogs = Weak.Set()
        # manages network callbacks for 'new_transaction' and 'verified2', and collates
        # GUI updates from said callbacks as a performance optimization
        self.tx_update_mgr = TxUpdateMgr(self)
        # defaults to empty list
        self.receive_tab_opreturn_widgets = []
        # keep track of shortcuts and disable them on close
        self._shortcuts = Weak.Set()

        self.status_bar = self.create_status_bar()

        self.need_update = threading.Event()
        self.labels_need_update = threading.Event()

        self.tabs = tabs = QtWidgets.QTabWidget(self)
        self.contact_list = self.create_contacts_tab()
        self.send_tab = self.create_send_tab()
        self.receive_tab = self.create_receive_tab()
        self.address_list = self.create_addresses_tab()
        self.utxo_list = self.create_utxo_tab()
        self.console_tab = self.create_console_tab()
        self.converter_tab = self.create_converter_tab()
        self.history_list = self.create_history_tab()
        tabs.addTab(self.history_list, QIcon(":icons/tab_history.png"), _("History"))
        tabs.addTab(self.send_tab, QIcon(":icons/tab_send.png"), _("Send"))
        tabs.addTab(self.receive_tab, QIcon(":icons/tab_receive.png"), _("Receive"))
        # clears/inits the opreturn widgets
        self.on_toggled_opreturn(bool(self.config.get("enable_opreturn")))

        def add_optional_tab(tabs, tab, icon, description, name, default=True):
            tab.tab_icon = icon
            tab.tab_description = description
            tab.tab_pos = len(tabs)
            tab.tab_name = name
            if self.config.get("show_{}_tab".format(name), default):
                tabs.addTab(tab, icon, description.replace("&", ""))

        add_optional_tab(
            tabs,
            self.address_list,
            QIcon(":icons/tab_addresses.png"),
            _("&Addresses"),
            "addresses",
        )
        add_optional_tab(
            tabs, self.utxo_list, QIcon(":icons/tab_coins.png"), _("Co&ins"), "utxo"
        )
        add_optional_tab(
            tabs,
            self.contact_list,
            QIcon(":icons/tab_contacts.png"),
            _("Con&tacts"),
            "contacts",
        )
        add_optional_tab(
            tabs,
            self.converter_tab,
            QIcon(":icons/tab_converter.svg"),
            _("Address Converter"),
            "converter",
        )
        add_optional_tab(
            tabs,
            self.console_tab,
            QIcon(":icons/tab_console.png"),
            _("Con&sole"),
            "console",
            False,
        )

        tabs.setSizePolicy(
            QtWidgets.QSizePolicy.Policy.Expanding,
            QtWidgets.QSizePolicy.Policy.Expanding,
        )
        self.setCentralWidget(tabs)

        if self.config.get("is_maximized"):
            self.showMaximized()

        self.init_menubar()

        # We use a weak reference here to help along python gc of QShortcut children: prevent the lambdas below from holding a strong ref to self.
        wrtabs = Weak.ref(tabs)
        self._shortcuts.add(
            QtWidgets.QShortcut(QKeySequence("Ctrl+W"), self, self.close)
        )
        # Below is now added to the menu as Ctrl+R but we'll also support F5 like browsers do
        self._shortcuts.add(
            QtWidgets.QShortcut(QKeySequence("F5"), self, self.update_wallet)
        )
        self._shortcuts.add(
            QtWidgets.QShortcut(
                QKeySequence("Ctrl+PgUp"),
                self,
                lambda: wrtabs()
                and wrtabs().setCurrentIndex(
                    (wrtabs().currentIndex() - 1) % wrtabs().count()
                ),
            )
        )
        self._shortcuts.add(
            QtWidgets.QShortcut(
                QKeySequence("Ctrl+PgDown"),
                self,
                lambda: wrtabs()
                and wrtabs().setCurrentIndex(
                    (wrtabs().currentIndex() + 1) % wrtabs().count()
                ),
            )
        )

        for i in range(tabs.count()):
            self._shortcuts.add(
                QtWidgets.QShortcut(
                    QKeySequence("Alt+" + str(i + 1)),
                    self,
                    lambda i=i: wrtabs() and wrtabs().setCurrentIndex(i),
                )
            )

        self.gui_object.addr_fmt_changed.connect(self.status_bar.update_cashaddr_icon)
        self.gui_object.update_available_signal.connect(
            self.status_bar.on_update_available
        )
        self.history_list.setFocus()

        # update fee slider in case we missed the callback
        self.send_tab.fee_slider.update()
        self.load_wallet()

        if self.network:
            self.network_signal.connect(self.on_network_qt)
            interests = [
                "blockchain_updated",
                "wallet_updated",
                "new_transaction",
                "status",
                "banner",
                "verified2",
                "fee",
            ]
            # To avoid leaking references to "self" that prevent the
            # window from being GC-ed when closed, callbacks should be
            # methods of this class only, and specifically not be
            # partials, lambdas or methods of subobjects.  Hence...
            self.network.register_callback(self.on_network, interests)
            # set initial message
            self.console.showMessage(self.network.banner)
            self.network.register_callback(self.on_quotes, ["on_quotes"])
            self.network.register_callback(self.on_history, ["on_history"])
            self.new_fx_quotes_signal.connect(self.on_fx_quotes)
            self.new_fx_history_signal.connect(self.on_fx_history)

        gui_object.timer.timeout.connect(self.timer_actions)
        self.fetch_alias()

    _first_shown = True

    def showEvent(self, event):
        super().showEvent(event)
        if event.isAccepted() and self._first_shown:
            self._first_shown = False
            weakSelf = Weak.ref(self)

            # do this immediately after this event handler finishes -- noop on everything but linux
            def callback():
                strongSelf = weakSelf()
                if strongSelf:
                    strongSelf.gui_object.lin_win_maybe_show_highdpi_caveat_msg(
                        strongSelf
                    )

            QTimer.singleShot(0, callback)

    def on_history(self, event, *args):
        # NB: event should always be 'on_history'
        if not args or args[0] is self.wallet:
            self.new_fx_history_signal.emit()

    @rate_limited(3.0)  # Rate limit to no more than once every 3 seconds
    def on_fx_history(self):
        if self.cleaned_up:
            return
        self.history_list.refresh_headers()
        self.history_list.update()
        self.address_list.update()
        self.history_updated_signal.emit()  # inform things like address_dialog that there's a new history

    def on_quotes(self, b):
        self.new_fx_quotes_signal.emit()

    @rate_limited(3.0)  # Rate limit to no more than once every 3 seconds
    def on_fx_quotes(self):
        if self.cleaned_up:
            return
        self.update_status()
        # Refresh edits with the new rate
        edit = (
            self.send_tab.fiat_send_e
            if self.send_tab.fiat_send_e.is_last_edited
            else self.send_tab.amount_e
        )
        edit.textEdited.emit(edit.text())
        edit = (
            self.fiat_receive_e
            if self.fiat_receive_e.is_last_edited
            else self.receive_amount_e
        )
        edit.textEdited.emit(edit.text())
        # History tab needs updating if it used spot
        if self.fx.history_used_spot:
            self.history_list.update()
            self.history_updated_signal.emit()  # inform things like address_dialog that there's a new history

    def toggle_tab(self, tab):
        show = self.tabs.indexOf(tab) == -1
        self.config.set_key("show_{}_tab".format(tab.tab_name), show)
        item_format = (
            _("Hide {tab_description}") if show else _("Show {tab_description}")
        )
        item_text = item_format.format(tab_description=tab.tab_description)
        tab.menu_action.setText(item_text)
        if show:
            # Find out where to place the tab
            index = len(self.tabs)
            for i in range(len(self.tabs)):
                try:
                    if tab.tab_pos < self.tabs.widget(i).tab_pos:
                        index = i
                        break
                except AttributeError:
                    pass
            self.tabs.insertTab(
                index, tab, tab.tab_icon, tab.tab_description.replace("&", "")
            )
        else:
            i = self.tabs.indexOf(tab)
            self.tabs.removeTab(i)

    def push_top_level_window(self, window):
        """Used for e.g. tx dialog box to ensure new dialogs are appropriately
        parented.  This used to be done by explicitly providing the parent
        window, but that isn't something hardware wallet prompts know."""
        self.tl_windows.append(window)

    def pop_top_level_window(self, window, *, raise_if_missing=False):
        try:
            self.tl_windows.remove(window)
        except ValueError:
            if raise_if_missing:
                raise
            """ Window not in list. Suppressing the exception by default makes
            writing cleanup handlers easier. Doing it this way fixes #1707. """

    def top_level_window(self):
        """Do the right thing in the presence of tx dialog windows"""
        override = self.tl_windows[-1] if self.tl_windows else None
        return self.top_level_window_recurse(override)

    def diagnostic_name(self):
        return "%s/%s" % (PrintError.diagnostic_name(self), self.wallet.basename())

    def is_hidden(self):
        return self.isMinimized() or self.isHidden()

    def show_or_hide(self):
        if self.is_hidden():
            self.bring_to_top()
        else:
            self.hide()

    def bring_to_top(self):
        self.show()
        self.raise_()

    def on_error(self, exc_info):
        if not isinstance(exc_info[1], UserCancelled):
            try:
                traceback.print_exception(*exc_info)
            except OSError:
                # Issue #662, user got IO error.
                # We want them to still get the error displayed to them.
                pass
            self.show_error(str(exc_info[1]))

    def on_network(self, event, *args):
        # self.print_error("on_network:", event, *args)
        if event == "wallet_updated":
            if args[0] is self.wallet:
                self.need_update.set()
        elif event == "blockchain_updated":
            self.need_update.set()
        elif event == "new_transaction":
            self.tx_update_mgr.notif_add(args)  # added only if this wallet's tx
            if args[1] is self.wallet:
                self.network_signal.emit(event, args)
        elif event == "verified2":
            self.tx_update_mgr.verif_add(args)  # added only if this wallet's tx
            if args[0] is self.wallet:
                self.network_signal.emit(event, args)
        elif event in ["status", "banner", "fee"]:
            # Handle in GUI thread
            self.network_signal.emit(event, args)
        else:
            self.print_error("unexpected network message:", event, args)

    def on_network_qt(self, event, args=None):
        if self.cleaned_up:
            return
        # Handle a network message in the GUI thread
        if event == "status":
            self.update_status()
        elif event == "banner":
            self.console.showMessage(args[0])
        elif event == "fee":
            pass
        elif event == "new_transaction":
            self.check_and_reset_receive_address_if_needed()
        elif event == "verified2":
            pass
        else:
            self.print_error("unexpected network_qt signal:", event, args)

    def fetch_alias(self):
        self.alias_info = None
        alias = self.config.get("alias")
        if alias:
            alias = str(alias)

            def f():
                self.alias_info = self.wallet.contacts.resolve_openalias(alias)
                self.alias_received_signal.emit()

            t = threading.Thread(target=f)
            t.setDaemon(True)
            t.start()

    def _close_wallet(self):
        if self.wallet:
            self.print_error("close_wallet", self.wallet.storage.path)
            self.wallet.thread = None

        run_hook("close_wallet", self.wallet)

    def load_wallet(self):
        self.wallet.thread = TaskThread(
            self, self.on_error, name=self.wallet.diagnostic_name() + "/Wallet"
        )
        self.update_recently_visited(self.wallet.storage.path)
        # address used to create a dummy transaction and estimate transaction fee
        self.history_list.update()
        self.address_list.update()
        self.utxo_list.update()
        self.need_update.set()
        # update menus
        self.seed_menu.setEnabled(self.wallet.has_seed())
        self.status_bar.update_lock_icon(self.wallet.has_password())
        self.update_buttons_on_seed()
        self.update_console()
        self.clear_receive_tab()
        self.request_list.update()
        self.tabs.show()
        self.init_geometry()
        if self.config.get("hide_gui") and self.tray.isVisible():
            self.hide()
        else:
            self.show()
            if self._is_invalid_testnet_wallet():
                self.gui_object.daemon.stop_wallet(self.wallet.storage.path)
                self._rebuild_history_action.setEnabled(False)
                self._warn_if_invalid_testnet_wallet()
        self.watching_only_changed()
        self.history_updated_signal.emit()  # inform things like address_dialog that there's a new history
        run_hook("load_wallet", self.wallet, self)

    def init_geometry(self):
        winpos = self.wallet.storage.get("winpos-qt")
        try:
            screen = self.app.desktop().screenGeometry()
            assert screen.contains(QRect(*winpos))
            self.setGeometry(*winpos)
        except Exception:
            self.print_error("using default geometry")
            self.setGeometry(100, 100, 840, 400)

    def watching_only_changed(self):
        title = "%s %s  -  %s" % (
            PROJECT_NAME,
            self.wallet.electrum_version,
            self.wallet.basename(),
        )
        extra = [self.wallet.storage.get("wallet_type", "?")]
        if self.wallet.is_watching_only():
            self.warn_if_watching_only()
            extra.append(_("watching only"))
        title += "  [%s]" % ", ".join(extra)
        self.setWindowTitle(title)
        self.password_menu.setEnabled(self.wallet.may_have_password())
        self.import_privkey_menu.setVisible(self.wallet.can_import_privkey())
        self.import_address_menu.setVisible(self.wallet.can_import_address())
        self.show_aux_keys_menu.setVisible(
            self.wallet.is_deterministic() and self.wallet.can_export()
        )
        self.export_menu.setEnabled(self.wallet.can_export())

    def warn_if_watching_only(self):
        if self.wallet.is_watching_only():
            msg = " ".join(
                [
                    _("This wallet is watching-only."),
                    _(f"This means you will not be able to spend {CURRENCY} with it."),
                    _(
                        "Make sure you own the seed phrase or the private keys, before"
                        f" you request {CURRENCY} to be sent to this wallet."
                    ),
                ]
            )
            self.show_warning(msg, title=_("Information"))

    def _is_invalid_testnet_wallet(self):
        if not networks.net.TESTNET:
            return False
        is_old_bad = False
        xkey = (
            hasattr(self.wallet, "get_master_public_key")
            and self.wallet.get_master_public_key()
        ) or None
        if xkey:
            try:
                deserialize_xpub(xkey)
            except InvalidXKeyNotBase58:
                pass  # old_keystore uses some other key format, so we will let it slide.
            except InvalidXKeyFormat:
                is_old_bad = True
        return is_old_bad

    def _warn_if_invalid_testnet_wallet(self):
        """This was added after the upgrade from the bad xpub testnet wallets
        to the good tpub testnet wallet format in version 3.3.6. See #1164.
        We warn users if they are using the bad wallet format and instruct
        them on how to upgrade their wallets."""
        is_old_bad = self._is_invalid_testnet_wallet()
        if is_old_bad:
            msg = " ".join(
                [
                    _("This testnet wallet has an invalid master key format."),
                    _(
                        f"(Old versions of {PROJECT_NAME} before 3.3.6 produced invalid"
                        " testnet wallets)."
                    ),
                    "<br><br>",
                    _(
                        "In order to use this wallet without errors with this version"
                        " of EC, please <b>re-generate this wallet from seed</b>."
                    ),
                    "<br><br><em><i>~SPV stopped~</i></em>",
                ]
            )
            self.show_critical(msg, title=_("Invalid Master Key"), rich_text=True)
        return is_old_bad

    def open_wallet(self):
        try:
            wallet_folder = self.get_wallet_folder()
        except FileNotFoundError as e:
            self.show_error(str(e))
            return
        if not os.path.exists(wallet_folder):
            wallet_folder = None
        filename, __ = QtWidgets.QFileDialog.getOpenFileName(
            self, _("Select your wallet file"), wallet_folder
        )
        if not filename:
            return
        self.gui_object.new_window(filename)

    def backup_wallet(self):
        self.wallet.storage.write()  # make sure file is committed to disk
        path = self.wallet.storage.path
        wallet_folder = os.path.dirname(path)
        filename, __ = QtWidgets.QFileDialog.getSaveFileName(
            self, _("Enter a filename for the copy of your wallet"), wallet_folder
        )
        if not filename:
            return

        new_path = os.path.join(wallet_folder, filename)
        if new_path != path:
            try:
                # Copy file contents
                shutil.copyfile(path, new_path)

                # Copy file attributes if possible
                # (not supported on targets like Flatpak documents)
                try:
                    shutil.copystat(path, new_path)
                except (IOError, os.error):
                    pass

                self.show_message(
                    _("A copy of your wallet file was created in")
                    + " '%s'" % str(new_path),
                    title=_("Wallet backup created"),
                )
            except (IOError, os.error) as reason:
                self.show_critical(
                    _(
                        f"{PROJECT_NAME} was unable to copy your wallet file to"
                        " the specified location."
                    )
                    + "\n"
                    + str(reason),
                    title=_("Unable to create backup"),
                )

    def update_recently_visited(self, filename):
        recent = self.config.get("recently_open", [])
        try:
            sorted(recent)
        except Exception:
            recent = []
        if filename in recent:
            recent.remove(filename)
        recent.insert(0, filename)
        recent = [path for path in recent if os.path.exists(path)]
        recent = recent[:5]
        self.config.set_key("recently_open", recent)
        self.recently_visited_menu.clear()
        gui_object = self.gui_object
        for i, k in enumerate(sorted(recent)):
            b = os.path.basename(k)

            def loader(k):
                return lambda: gui_object.new_window(k)

            self.recently_visited_menu.addAction(b, loader(k)).setShortcut(
                QKeySequence("Ctrl+%d" % (i + 1))
            )
        self.recently_visited_menu.setEnabled(len(recent))

    def get_wallet_folder(self):
        return self.gui_object.get_wallet_folder()

    def new_wallet(self):
        try:
            full_path = self.gui_object.get_new_wallet_path()
        except FileNotFoundError as e:
            self.show_error(str(e))
            return
        self.gui_object.start_new_window(full_path, None)

    def init_menubar(self):
        menubar = self.menuBar()
        menubar.setObjectName(self.diagnostic_name() + ".QMenuBar")

        file_menu = menubar.addMenu(_("&File"))
        self.recently_visited_menu = file_menu.addMenu(_("Open &Recent"))
        file_menu.addAction(_("&Open wallet") + "...", self.open_wallet).setShortcut(
            QKeySequence.Open
        )
        file_menu.addAction(_("&New/Restore") + "...", self.new_wallet).setShortcut(
            QKeySequence.New
        )
        file_menu.addAction(_("&Save Copy As") + "...", self.backup_wallet).setShortcut(
            QKeySequence.SaveAs
        )
        file_menu.addAction(_("&Delete") + "...", self.remove_wallet)
        file_menu.addSeparator()
        file_menu.addAction(_("&Quit"), self.close).setShortcut(QKeySequence.Quit)

        wallet_menu = menubar.addMenu(_("&Wallet"))
        wallet_menu.addAction(
            _("&Information"),
            self.show_master_public_keys,
        ).setShortcut(QKeySequence("Ctrl+I"))
        wallet_menu.addSeparator()
        self.password_menu = wallet_menu.addAction(
            _("&Password"), self.change_password_dialog
        )
        self.seed_menu = wallet_menu.addAction(_("&Seed"), self.show_seed_dialog)
        private_keys_menu = wallet_menu.addMenu(_("Private Keys"))
        private_keys_menu.addAction(_("&Sweep"), self.send_tab.sweep_key_dialog)
        self.import_privkey_menu = private_keys_menu.addAction(
            _("&Import"), self.do_import_privkey
        )
        self.export_menu = private_keys_menu.addMenu(_("&Export"))
        self.export_menu.addAction(_("&WIF Plaintext"), self.export_privkeys_dialog)
        self.export_menu.addAction(_("&BIP38 Encrypted"), self.export_bip38_dialog)
        self.import_address_menu = wallet_menu.addAction(
            _("Import addresses"), self.import_addresses
        )
        self.show_aux_keys_menu = wallet_menu.addAction(
            _("Show Auxiliary Keys"), self.show_auxiliary_keys
        )
        wallet_menu.addSeparator()
        self._rebuild_history_action = wallet_menu.addAction(
            _("&Rebuild History"), self.rebuild_history
        )
        scan_beyond_gap_action = wallet_menu.addAction(
            _("Scan &More Addresses..."), self.scan_beyond_gap
        )
        scan_beyond_gap_action.setEnabled(
            bool(self.wallet.is_deterministic() and self.network)
        )
        wallet_menu.addSeparator()

        labels_menu = wallet_menu.addMenu(_("&Labels"))
        labels_menu.addAction(_("&Import") + "...", self.do_import_labels)
        labels_menu.addAction(_("&Export") + "...", self.do_export_labels)
        contacts_menu = wallet_menu.addMenu(_("&Contacts"))
        contacts_menu.addAction(_("&New") + "...", self.contact_list.new_contact_dialog)
        if self.config.get("enable_aliases", DEFAULT_ENABLE_ALIASES):
            contacts_menu.addAction(
                _("Add eCash Alias") + "...", self.contact_list.fetch_alias_dialog
            )

        contacts_menu.addAction(
            _("Import") + "...", lambda: self.contact_list.import_contacts()
        )
        contacts_menu.addAction(
            _("Export") + "...", lambda: self.contact_list.export_contacts()
        )
        invoices_menu = wallet_menu.addMenu(_("Invoices"))
        invoices_menu.addAction(
            _("Import") + "...", lambda: self.send_tab.invoice_list.import_invoices()
        )
        hist_menu = wallet_menu.addMenu(_("&History"))
        hist_menu.addAction(_("Export") + "...", self.export_history_dialog)

        wallet_menu.addSeparator()
        wallet_menu.addAction(_("&Find"), self.status_bar.toggle_search).setShortcut(
            QKeySequence("Ctrl+F")
        )
        wallet_menu.addAction(_("Refresh GUI"), self.update_wallet).setShortcut(
            QKeySequence("Ctrl+R")
        )

        def add_toggle_action(view_menu, tab):
            is_shown = self.tabs.indexOf(tab) > -1
            item_format = (
                _("Hide {tab_description}") if is_shown else _("Show {tab_description}")
            )
            item_name = item_format.format(tab_description=tab.tab_description)
            tab.menu_action = view_menu.addAction(
                item_name, lambda: self.toggle_tab(tab)
            )

        view_menu = menubar.addMenu(_("&View"))
        add_toggle_action(view_menu, self.address_list)
        add_toggle_action(view_menu, self.utxo_list)
        add_toggle_action(view_menu, self.contact_list)
        add_toggle_action(view_menu, self.converter_tab)
        add_toggle_action(view_menu, self.console_tab)

        tools_menu = menubar.addMenu(_("&Tools"))

        prefs_tit = _("Preferences") + "..."
        a = tools_menu.addAction(prefs_tit, self.settings_dialog)
        a.setShortcut(QKeySequence("Ctrl+,"))
        if sys.platform == "darwin":
            # This turns off the heuristic matching based on name and keeps the
            # "Preferences" action out of the application menu and into the
            # actual menu we specified on macOS.
            a.setMenuRole(QtWidgets.QAction.NoRole)
        gui_object = self.gui_object
        weakSelf = Weak.ref(self)
        tools_menu.addAction(
            _("&Network") + "...",
            lambda: gui_object.show_network_dialog(weakSelf()),
        ).setShortcut(QKeySequence("Ctrl+K"))
        tools_menu.addAction(
            _("Optional &Features") + "...",
            self.internal_plugins_dialog,
        ).setShortcut(QKeySequence("Shift+Ctrl+P"))
        tools_menu.addAction(
            _("Installed &Plugins") + "...",
            self.external_plugins_dialog,
        ).setShortcut(QKeySequence("Ctrl+P"))
        if sys.platform.startswith("linux"):
            tools_menu.addSeparator()
            tools_menu.addAction(
                _("&Hardware Wallet Support..."), self.hardware_wallet_support
            )
        tools_menu.addSeparator()
        tools_menu.addAction(
            _("&Sign/Verify Message") + "...", self.sign_verify_message
        )
        tools_menu.addAction(
            _("&Encrypt/Decrypt Message") + "...", self.encrypt_message
        )
        tools_menu.addSeparator()

        tools_menu.addAction(_("&Pay to Many"), self.send_tab.paytomany).setShortcut(
            QKeySequence("Ctrl+M")
        )

        raw_transaction_menu = tools_menu.addMenu(_("&Load Transaction"))
        raw_transaction_menu.addAction(
            _("From &File") + "...", self.do_process_from_file
        )
        raw_transaction_menu.addAction(
            _("From &Text") + "...", self.do_process_from_text
        ).setShortcut(QKeySequence("Ctrl+T"))
        raw_transaction_menu.addAction(
            _("From the &Blockchain") + "...", self.do_process_from_txid
        ).setShortcut(QKeySequence("Ctrl+B"))
        raw_transaction_menu.addAction(
            _("From &QR Code") + "...", self.read_tx_from_qrcode
        )
        raw_transaction_menu.addAction(
            _("From &Multiple files") + "...", self.do_process_from_multiple_files
        )

        invoice_menu = tools_menu.addMenu(_("&Invoice"))
        invoice_menu.addAction(_("Create new invoice"), self.do_create_invoice)
        invoice_menu.addAction(_("Load and edit invoice"), self.do_load_edit_invoice)
        invoice_menu.addAction(
            _("Load and pay invoice"), self.send_tab.do_load_pay_invoice
        )

        tools_menu.addSeparator()
        avaproof_action = tools_menu.addAction(
            "Avalanche Proof Editor", self.open_proof_editor
        )
        tools_menu.addAction(
            "Build Avalanche Delegation", self.build_avalanche_delegation
        )

        def enable_disable_avatools():
            if not self.wallet.is_stake_signature_possible():
                avaproof_action.setEnabled(False)
                avaproof_action.setToolTip(
                    "Cannot build avalanche proof or delegation for some hardware, "
                    "multisig or watch-only wallet (Schnorr signature is required)."
                )

        tools_menu.aboutToShow.connect(enable_disable_avatools)

        run_hook("init_menubar_tools", self, tools_menu)

        help_menu = menubar.addMenu(_("&Help"))
        help_menu.addAction(_("&About"), self.show_about)
        help_menu.addAction(_("About Qt"), self.app.aboutQt)
        help_menu.addAction(
            _("&Check for Updates"), lambda: self.gui_object.show_update_checker(self)
        )
        # help_menu.addAction(_("&Official Website"), lambda: webopen("https://..."))
        help_menu.addSeparator()
        # help_menu.addAction(_("Documentation"), lambda: webopen("http://...")).setShortcut(QKeySequence.HelpContents)
        help_menu.addAction(_("&Report Bug..."), self.show_report_bug)
        help_menu.addSeparator()
        help_menu.addAction(_("&Donate to Server") + "...", self.donate_to_server)

    def donate_to_server(self):
        if self.gui_object.warn_if_no_network(self):
            return
        d = {}
        spv_address = self.network.get_donation_address()
        donation_for = _("Donation for")
        if spv_address == "bitcoincash:qplw0d304x9fshz420lkvys2jxup38m9symky6k028":
            # Fulcrum servers without a donation address specified in the
            # configuration file broadcast the fulcrum donation address
            spv_prefix = "Fulcrum developers"
            host = "https://github.com/cculianu/Fulcrum"
            # convert to an ecash: address
            spv_address = "ecash:qplw0d304x9fshz420lkvys2jxup38m9syzms3d4vs"
        else:
            spv_prefix = _("Blockchain Server")
            host = self.network.get_parameters()[0]
        if spv_address:
            d[spv_prefix + ": " + host] = spv_address
        plugin_servers = run_hook("donation_address", self, multi=True)
        for tup in plugin_servers:
            if not isinstance(tup, (list, tuple)) or len(tup) != 2:
                continue
            desc, address = tup
            if (
                desc
                and address
                and isinstance(desc, str)
                and isinstance(address, Address)
                and desc not in d
                and not desc.lower().startswith(spv_prefix.lower())
            ):
                d[desc] = address.to_ui_string()

        def do_payto(desc):
            addr = d[desc]
            # The message is intentionally untranslated, leave it like that
            self.send_tab.pay_to_URI(
                "{pre}:{addr}?message={donation_for} {desc}".format(
                    pre=networks.net.CASHADDR_PREFIX,
                    addr=addr,
                    donation_for=donation_for,
                    desc=desc,
                )
            )

        if len(d) == 1:
            do_payto(next(iter(d.keys())))
        elif len(d) > 1:
            choices = tuple(d.keys())
            index = self.query_choice(
                _("Please select which server you would like to donate to:"),
                choices,
                add_cancel_button=True,
            )
            if index is not None:
                do_payto(choices[index])
        else:
            self.show_error(_("No donation address for this server"))

    def show_about(self):
        QtWidgets.QMessageBox.about(
            self,
            f"{PROJECT_NAME}",
            f"<p><font size=+3><b>{PROJECT_NAME}</b></font></p><p>"
            + _("Version")
            + f" {self.wallet.electrum_version}"
            + "</p>"
            + '<span style="font-weight:200;"><p>'
            + _(
                f"{PROJECT_NAME}'s focus is speed, with low resource usage and"
                f" simplifying {CURRENCY}. You do not need to perform regular "
                "backups, because your wallet can be recovered from a secret "
                "phrase that you can memorize or write on paper. Startup times "
                "are instant because it operates in conjunction with "
                "high-performance servers that handle the most complicated "
                f"parts of the {CURRENCY} system."
            )
            + "</p></span>"
            + f"<p><a href={REPOSITORY_URL}/blob/master/electrum/COPYING>"
            + _("License and copyright information")
            + "</a></p>",
        )

    def show_report_bug(self):
        msg = " ".join(
            [
                _("Please report any bugs as issues on github:<br/>"),
                (
                    f'<a href="{REPOSITORY_URL}/issues">'
                    f"{REPOSITORY_URL}/issues</a><br/><br/>"
                ),
                _(
                    "Before reporting a bug, upgrade to the most recent version of "
                    f"{PROJECT_NAME} (latest release or git HEAD), and include the "
                    "version number in your report."
                ),
                _("Try to explain not only what the bug is, but how it occurs."),
            ]
        )
        self.show_message(
            msg, title=f"{PROJECT_NAME} - " + _("Reporting Bugs"), rich_text=True
        )

    def notify(self, message):
        self.gui_object.notify(message)

    def timer_actions(self):
        # Note this runs in the GUI thread

        if self.need_update.is_set():
            # will clear flag when it runs. (also clears labels_need_update as well)
            self._update_wallet()

        if self.labels_need_update.is_set():
            # will clear flag when it runs.
            self._update_labels()

        self.send_tab.timer_actions()

        # hook for other classes to be called here. For example the tx_update_mgr is
        # called here (see TxUpdateMgr.do_check).
        self.on_timer_signal.emit()

    def get_decimal_point(self) -> int:
        return self.config.get("decimal_point", 2)

    def get_num_zeros(self) -> int:
        return int(self.config.get("num_zeros", 2))

    def base_unit(self):
        return base_unit(self.config)

    def connect_fields(self, window, btc_e, fiat_e, fee_e):
        def edit_changed(edit):
            if edit.follows:
                return
            edit.setStyleSheet(ColorScheme.DEFAULT.as_stylesheet())
            fiat_e.is_last_edited = edit == fiat_e
            amount = edit.get_amount()
            rate = self.fx.exchange_rate() if self.fx else None
            sats_per_unit = self.fx.satoshis_per_unit()
            if rate is None or amount is None:
                if edit is fiat_e:
                    btc_e.setText("")
                    if fee_e:
                        fee_e.setText("")
                else:
                    fiat_e.setText("")
            else:
                if edit is fiat_e:
                    btc_e.follows = True
                    btc_e.setAmount(int(amount / PyDecimal(rate) * sats_per_unit))
                    btc_e.setStyleSheet(ColorScheme.BLUE.as_stylesheet())
                    btc_e.follows = False
                    if fee_e:
                        window.update_fee()
                else:
                    fiat_e.follows = True
                    fiat_e.setText(
                        self.fx.ccy_amount_str(
                            amount * PyDecimal(rate) / sats_per_unit, False
                        )
                    )
                    fiat_e.setStyleSheet(ColorScheme.BLUE.as_stylesheet())
                    fiat_e.follows = False

        btc_e.follows = False
        fiat_e.follows = False
        fiat_e.textChanged.connect(partial(edit_changed, fiat_e))
        btc_e.textChanged.connect(partial(edit_changed, btc_e))
        fiat_e.is_last_edited = False

    def update_status(self):
        if not self.wallet:
            return

        server_lag = 0
        if self.network is None or not self.network.is_running():
            text = _("Offline")
            status = NetworkStatus.DISCONNECTED

        elif self.network.is_connected():
            server_height = self.network.get_server_height()
            server_lag = self.network.get_local_height() - server_height
            num_chains = len(self.network.get_blockchains())
            # Server height can be 0 after switching to a new server
            # until we get a headers subscription request response.
            # Display the synchronizing message in that case.
            if not self.wallet.up_to_date or server_height == 0:
                text = _("Synchronizing...")
                status = NetworkStatus.UPDATING
            elif server_lag > 1:
                text = _("Server is lagging ({} blocks)").format(server_lag)
                if num_chains <= 1:
                    status = NetworkStatus.LAGGING
                else:
                    status = NetworkStatus.LAGGING_FORK
            else:
                c, u, x = self.wallet.get_balance()

                text_items = [
                    _("Balance: {amount_and_unit}").format(
                        amount_and_unit=format_amount_and_units(c, self.config, self.fx)
                    )
                ]
                if u:
                    text_items.append(
                        _("[{amount} unconfirmed]").format(
                            amount=format_amount(u, self.config, True).strip()
                        )
                    )

                if x:
                    text_items.append(
                        _("[{amount} unmatured]").format(
                            amount=format_amount(x, self.config, True).strip()
                        )
                    )

                extra = run_hook("balance_label_extra", self)
                if isinstance(extra, str) and extra:
                    text_items.append(_("[{extra}]").format(extra=extra))

                # append fiat balance and price
                if self.fx.is_enabled():
                    fiat_text = self.fx.get_fiat_status_text(
                        c + u + x, self.base_unit(), self.get_decimal_point()
                    ).strip()
                    if fiat_text:
                        text_items.append(fiat_text)
                n_unverif = self.wallet.get_unverified_tx_pending_count()
                if n_unverif >= 10:
                    # if there are lots left to verify, display this informative text
                    text_items.append(
                        _("[{count} unverified TXs]").format(count=n_unverif)
                    )
                if not self.network.proxy:
                    status = (
                        NetworkStatus.CONNECTED
                        if num_chains <= 1
                        else NetworkStatus.CONNECTED_FORK
                    )
                else:
                    status = (
                        NetworkStatus.CONNECTED_PROXY
                        if num_chains <= 1
                        else NetworkStatus.CONNECTED_PROXY_FORK
                    )

                text = " ".join(text_items)
        else:
            text = _("Not connected")
            status = NetworkStatus.DISCONNECTED

        # server lag
        self.tray.setToolTip("%s (%s)" % (text, self.wallet.basename()))
        self.status_bar.update_status(text, status, server_lag)
        run_hook("window_update_status", self)

    def update_wallet(self):
        # will enqueue an _update_wallet() call in at most 0.5 seconds from now.
        self.need_update.set()

    def _update_wallet(self):
        """Called by self.timer_actions every 0.5 secs if need_update flag is set.
        Note that the flag is actually cleared by update_tabs."""
        self.update_status()
        if (
            self.wallet.up_to_date
            or not self.network
            or not self.network.is_connected()
        ):
            self.update_tabs()

    @rate_limited(1.0, classlevel=True, ts_after=True)
    def update_tabs(self):
        if self.cleaned_up:
            return
        self.history_list.update()
        self.request_list.update()
        self.address_list.update()
        self.utxo_list.update()
        self.contact_list.update()
        self.send_tab.invoice_list.update()
        self.update_completions()
        # inform things like address_dialog that there's a new history, also clears
        # self.tx_update_mgr.verif_q
        self.history_updated_signal.emit()
        self.need_update.clear()  # clear flag
        if self.labels_need_update.is_set():
            # if flag was set, might as well declare the labels updated since they
            # necessarily were due to a full update.
            #
            # just in case client code was waiting for this signal to proceed.
            self.labels_updated_signal.emit()
            # clear flag
            self.labels_need_update.clear()

    def update_labels(self):
        # will enqueue an _update_labels() call in at most 0.5 seconds from now
        self.labels_need_update.set()

    @rate_limited(1.0)
    def _update_labels(self):
        """Called by self.timer_actions every 0.5 secs if labels_need_update flag is set."""
        if self.cleaned_up:
            return
        self.history_list.update_labels()
        self.address_list.update_labels()
        self.utxo_list.update_labels()
        self.update_completions()
        self.labels_updated_signal.emit()
        # clear flag
        self.labels_need_update.clear()

    def create_history_tab(self):
        history_list = HistoryList(self)
        history_list.edited.connect(self.update_labels)
        return history_list

    def show_address(self, addr, *, parent=None):
        parent = parent or self.top_level_window()
        d = address_dialog.AddressDialog(self, addr, windowParent=parent)
        d.exec_()

    def show_transaction(self, tx: Transaction, tx_desc=None):
        """tx_desc is set only for txs created in the Send tab"""
        d = show_transaction(tx, self, tx_desc)
        self._tx_dialogs.add(d)

    def on_toggled_opreturn(self, b):
        """toggles opreturn-related widgets for both the receive and send
        tabs"""
        b = bool(b)
        self.config.set_key("enable_opreturn", b)
        # send tab
        self.send_tab.on_toggled_opreturn(b)
        # receive tab
        for x in self.receive_tab_opreturn_widgets:
            x.setVisible(b)

    def create_receive_tab(self):
        # A 4-column grid layout.  All the stretch is in the last column.
        # The exchange rate plugin adds a fiat widget in column 2
        self.receive_grid = grid = QtWidgets.QGridLayout()
        grid.setSpacing(8)
        grid.setColumnStretch(3, 1)

        self.receive_address: Optional[Address] = None
        self.receive_address_e = ButtonsLineEdit()
        self.receive_address_e.addCopyButton()
        self.receive_address_e.setReadOnly(True)
        msg = _(
            f"{CURRENCY} address where the payment should be received. Note that "
            f"each payment request uses a different {CURRENCY} address."
        )
        label = HelpLabel(_("&Receiving address"), msg)
        label.setBuddy(self.receive_address_e)
        self.receive_address_e.textChanged.connect(self.update_receive_qr)
        self.gui_object.addr_fmt_changed.connect(self.update_receive_address_widget)
        grid.addWidget(label, 0, 0)
        grid.addWidget(self.receive_address_e, 0, 1, 1, -1)

        self.receive_message_e = QtWidgets.QLineEdit()
        label = QtWidgets.QLabel(_("&Description"))
        label.setBuddy(self.receive_message_e)
        grid.addWidget(label, 2, 0)
        grid.addWidget(self.receive_message_e, 2, 1, 1, -1)
        self.receive_message_e.textChanged.connect(self.update_receive_qr)

        # OP_RETURN requests
        self.receive_opreturn_e = QtWidgets.QLineEdit()
        msg = _(
            "You may optionally append an OP_RETURN message to the payment URI and/or"
            " QR you generate.\n\nNote: Not all wallets yet support OP_RETURN"
            " parameters, so make sure the other party's wallet supports OP_RETURN"
            " URIs."
        )
        self.receive_opreturn_label = label = HelpLabel(_("&OP_RETURN"), msg)
        label.setBuddy(self.receive_opreturn_e)
        self.receive_opreturn_rawhex_cb = QtWidgets.QCheckBox(_("Raw &hex script"))
        self.receive_opreturn_rawhex_cb.setToolTip(
            _(
                "If unchecked, the textbox contents are UTF8-encoded into a single-push"
                " script: <tt>OP_RETURN PUSH &lt;text&gt;</tt>. If checked, the text"
                " contents will be interpreted as a raw hexadecimal script to be"
                " appended after the OP_RETURN opcode: <tt>OP_RETURN"
                " &lt;script&gt;</tt>."
            )
        )
        grid.addWidget(label, 3, 0)
        grid.addWidget(self.receive_opreturn_e, 3, 1, 1, 3)
        grid.addWidget(
            self.receive_opreturn_rawhex_cb, 3, 4, Qt.AlignmentFlag.AlignLeft
        )
        self.receive_opreturn_e.textChanged.connect(self.update_receive_qr)
        self.receive_opreturn_rawhex_cb.clicked.connect(self.update_receive_qr)
        self.receive_tab_opreturn_widgets = [
            self.receive_opreturn_e,
            self.receive_opreturn_rawhex_cb,
            self.receive_opreturn_label,
        ]

        self.receive_amount_e = XECAmountEdit(self.get_decimal_point())
        label = QtWidgets.QLabel(_("Requested &amount"))
        label.setBuddy(self.receive_amount_e)
        grid.addWidget(label, 4, 0)
        grid.addWidget(self.receive_amount_e, 4, 1)
        self.receive_amount_e.textChanged.connect(self.update_receive_qr)

        self.fiat_receive_e = AmountEdit(self.fx.get_currency() if self.fx else "")
        if not self.fx or not self.fx.is_enabled():
            self.fiat_receive_e.setVisible(False)
        grid.addWidget(self.fiat_receive_e, 4, 2, Qt.AlignmentFlag.AlignLeft)
        self.connect_fields(self, self.receive_amount_e, self.fiat_receive_e, None)

        self.expires_combo = QtWidgets.QComboBox()
        self.expires_combo.addItems([_(i[0]) for i in expiration_values])
        self.expires_combo.setCurrentIndex(3)
        self.expires_combo.setFixedWidth(self.receive_amount_e.width())
        msg = " ".join(
            [
                _("Expiration date of your request."),
                _(
                    "This information is seen by the recipient if you send them"
                    " a signed payment request."
                ),
                _(
                    "Expired requests have to be deleted manually from your list,"
                    f" in order to free the corresponding {CURRENCY} addresses."
                ),
                _(
                    f"The {CURRENCY} address never expires and will always be "
                    f"part of this {PROJECT_NAME} wallet."
                ),
            ]
        )
        label = HelpLabel(_("Request &expires"), msg)
        label.setBuddy(self.expires_combo)
        grid.addWidget(label, 5, 0)
        grid.addWidget(self.expires_combo, 5, 1)
        self.expires_label = QtWidgets.QLineEdit("")
        self.expires_label.setReadOnly(1)
        self.expires_label.hide()
        grid.addWidget(self.expires_label, 5, 1)

        self.save_request_button = QtWidgets.QPushButton(_("&Save"))
        self.save_request_button.clicked.connect(self.save_payment_request)

        self.new_request_button = QtWidgets.QPushButton(_("&Clear"))
        self.new_request_button.clicked.connect(self.new_payment_request)

        weakSelf = Weak.ref(self)

        class MyQRCodeWidget(QRCodeWidget):
            def mouseReleaseEvent(slf, e):
                """to make the QRWidget clickable"""
                weakSelf() and weakSelf().show_qr_window()

        self.receive_qr = MyQRCodeWidget(fixedSize=200)
        self.receive_qr.setCursor(QCursor(Qt.PointingHandCursor))

        self.receive_buttons = buttons = QtWidgets.QHBoxLayout()
        buttons.addWidget(self.save_request_button)
        buttons.addWidget(self.new_request_button)
        buttons.addStretch(1)
        grid.addLayout(buttons, 6, 2, 1, -1)

        self.receive_requests_label = QtWidgets.QLabel(_("Re&quests"))
        self.request_list = RequestList(self)
        self.request_list.chkVisible()

        self.receive_requests_label.setBuddy(self.request_list)

        # layout
        vbox_g = QtWidgets.QVBoxLayout()
        vbox_g.addLayout(grid)
        vbox_g.addStretch()

        hbox = QtWidgets.QHBoxLayout()
        hbox.addLayout(vbox_g)
        vbox2 = QtWidgets.QVBoxLayout()
        vbox2.setContentsMargins(0, 0, 0, 0)
        vbox2.setSpacing(4)
        vbox2.addWidget(
            self.receive_qr, Qt.AlignmentFlag.AlignHCenter | Qt.AlignmentFlag.AlignTop
        )
        self.receive_qr.setToolTip(_("Receive request QR code (click for details)"))
        but = uribut = QtWidgets.QPushButton(_("Copy &URI"))

        def on_copy_uri():
            if self.receive_qr.data:
                uri = str(self.receive_qr.data)
                copy_to_clipboard(
                    uri, uribut, _("Receive request URI copied to clipboard")
                )

        but.clicked.connect(on_copy_uri)
        but.setSizePolicy(
            QtWidgets.QSizePolicy.Policy.Fixed, QtWidgets.QSizePolicy.Policy.Fixed
        )
        but.setToolTip(_("Click to copy the receive request URI to the clipboard"))
        vbox2.addWidget(but)
        vbox2.setAlignment(
            but, Qt.AlignmentFlag.AlignHCenter | Qt.AlignmentFlag.AlignVCenter
        )

        hbox.addLayout(vbox2)

        class ReceiveTab(QtWidgets.QWidget):
            def showEvent(slf, e):
                super().showEvent(e)
                if e.isAccepted():
                    wslf = weakSelf()
                    if wslf:
                        wslf.check_and_reset_receive_address_if_needed()

        w = ReceiveTab()
        w.searchable_list = self.request_list
        vbox = QtWidgets.QVBoxLayout(w)
        vbox.addLayout(hbox)
        vbox.addStretch(1)
        vbox.addWidget(self.receive_requests_label)
        vbox.addWidget(self.request_list)
        vbox.setStretchFactor(self.request_list, 1000)

        return w

    def delete_payment_request(self, addr):
        self.wallet.remove_payment_request(addr, self.config)
        self.request_list.update()
        self.address_list.update()
        self.clear_receive_tab()

    def get_request_URI(self, addr):
        req = self.wallet.receive_requests[addr]
        message = self.wallet.labels.get(addr.to_storage_string(), "")
        amount = req["amount"]
        op_return = req.get("op_return")
        op_return_raw = req.get("op_return_raw") if not op_return else None
        URI = web.create_URI(
            addr, amount, message, op_return=op_return, op_return_raw=op_return_raw
        )
        if req.get("time"):
            URI += "&time=%d" % req.get("time")
        if req.get("exp"):
            URI += "&exp=%d" % req.get("exp")
        if req.get("name") and req.get("sig"):
            sig = bfh(req.get("sig"))
            sig = bitcoin.base_encode(sig, base=58)
            URI += "&name=" + req["name"] + "&sig=" + sig
        return str(URI)

    def sign_payment_request(self, addr):
        alias = self.config.get("alias")
        if alias and self.alias_info:
            alias_addr, alias_name, validated = self.alias_info
            if alias_addr:
                if self.wallet.is_mine(alias_addr):
                    msg = (
                        _("This payment request will be signed.")
                        + "\n"
                        + _("Please enter your password")
                    )
                    password = None
                    if self.wallet.has_keystore_encryption():
                        password = self.password_dialog(msg)
                        if not password:
                            return
                    try:
                        self.wallet.sign_payment_request(
                            addr, alias, alias_addr, password
                        )
                    except Exception as e:
                        traceback.print_exc(file=sys.stderr)
                        self.show_error(str(e) or repr(e))
                        return
                else:
                    return

    def save_payment_request(self):
        if not self.receive_address:
            self.show_error(_("No receiving address"))
        amount = self.receive_amount_e.get_amount()
        message = self.receive_message_e.text()
        if not message and not amount:
            self.show_error(_("No message or amount"))
            return False
        i = self.expires_combo.currentIndex()
        expiration = expiration_values[i][1]
        kwargs = {}
        opr = self.receive_opreturn_e.text().strip()
        if opr:
            # save op_return, if any
            arg = "op_return"
            if self.receive_opreturn_rawhex_cb.isChecked():
                arg = "op_return_raw"
            kwargs[arg] = opr
        req = self.wallet.make_payment_request(
            self.receive_address, amount, message, expiration, **kwargs
        )
        self.wallet.add_payment_request(req, self.config)
        self.sign_payment_request(self.receive_address)
        self.request_list.update()
        # when adding items to the view the current selection may not reflect what's in
        # the UI. Make sure it's selected.
        self.request_list.select_item_by_address(req.get("address"))
        self.address_list.update()
        self.save_request_button.setEnabled(False)

    def view_and_paste(self, title, msg, data):
        dialog = WindowModalDialog(self.top_level_window(), title)
        vbox = QtWidgets.QVBoxLayout()
        label = QtWidgets.QLabel(msg)
        label.setWordWrap(True)
        vbox.addWidget(label)
        pr_e = ShowQRTextEdit(text=data)
        vbox.addWidget(pr_e)
        vbox.addLayout(Buttons(CopyCloseButton(pr_e.text, self.app, dialog)))
        dialog.setLayout(vbox)
        dialog.exec_()

    def export_payment_request(self, addr):
        r = self.wallet.receive_requests[addr]
        try:
            pr = paymentrequest.serialize_request(r).SerializeToString()
        except ValueError as e:
            """User entered some large amount or other value that doesn't fit
            into a C++ type.  See #1738."""
            self.show_error(str(e))
            return
        name = r["id"] + ".bip70"
        fileName = getSaveFileName(
            _("Select where to save your payment request"), name, self.config, "*.bip70"
        )
        if fileName:
            with open(fileName, "wb+") as f:
                f.write(util.to_bytes(pr))
            self.show_message(_("Request saved successfully"))
            self.saved = True

    def new_payment_request(self):
        addr = self.wallet.get_unused_address(frozen_ok=False)
        if addr is None:
            if not self.wallet.is_deterministic():
                msg = [
                    _("No more addresses in your wallet."),
                    _(
                        "You are using a non-deterministic wallet, which cannot create"
                        " new addresses."
                    ),
                    _(
                        "If you want to create new addresses, use a deterministic"
                        " wallet instead."
                    ),
                ]
                self.show_message(" ".join(msg))
                # New! Since the button is called 'Clear' now, we let them proceed with a re-used address
                addr = self.wallet.get_receiving_address()
            else:
                # Warn if past gap limit.
                if not self.question(
                    _(
                        "Warning: The next address will not be recovered automatically"
                        " if you restore your wallet from seed; you may need to add it"
                        " manually.\n\nThis occurs because you have too many unused"
                        " addresses in your wallet. To avoid this situation, use the"
                        " existing addresses first.\n\nCreate anyway?"
                    )
                ):
                    return
                addr = self.wallet.create_new_address(False)
        self.set_receive_address(addr)
        self.expires_label.hide()
        self.expires_combo.show()
        self.request_list.setCurrentItem(None)
        self.receive_message_e.setFocus()

    def set_receive_address(self, addr: Address):
        self.receive_address = addr
        self.receive_message_e.setText("")
        self.receive_opreturn_rawhex_cb.setChecked(False)
        self.receive_opreturn_e.setText("")
        self.receive_amount_e.setAmount(None)
        self.update_receive_address_widget()

    def update_receive_address_widget(self):
        text = ""
        if self.receive_address:
            text = self.receive_address.to_ui_string()
        self.receive_address_e.setText(text)

    @rate_limited(0.250, ts_after=True)
    def check_and_reset_receive_address_if_needed(self):
        """Check to make sure the receive tab is kosher and doesn't contain
        an already-used address. This should be called from the showEvent
        for the tab."""
        if not self.wallet.use_change or self.cleaned_up:
            # if they don't care about change addresses, they are ok
            # with re-using addresses, so skip this check.
            return
        # ok, they care about anonymity, so make sure the receive address
        # is always an unused address.
        if (
            not self.receive_address  # this should always be defined but check anyway
            or self.receive_address
            in self.wallet.frozen_addresses  # make sure it's not frozen
            or (
                self.wallet.get_address_history(
                    self.receive_address
                )  # make a new address if it has a history
                and not self.wallet.get_payment_request(
                    self.receive_address, self.config
                )
            )
        ):  # and if they aren't actively editing one in the request_list widget
            addr = self.wallet.get_unused_address(
                frozen_ok=False
            )  # try unused, not frozen
            if addr is None:
                if self.wallet.is_deterministic():
                    # creae a new one if deterministic
                    addr = self.wallet.create_new_address(False)
                else:
                    # otherwise give up and just re-use one.
                    addr = self.wallet.get_receiving_address()
            self.receive_address = addr
            self.update_receive_address_widget()

    def clear_receive_tab(self):
        self.expires_label.hide()
        self.expires_combo.show()
        self.request_list.setCurrentItem(None)
        self.set_receive_address(self.wallet.get_receiving_address(frozen_ok=False))

    def show_qr_window(self):
        if not self.qr_window:
            self.qr_window = qrwindow.QRWindow(self.config)
            self.qr_window.setAttribute(Qt.WA_DeleteOnClose, True)
            weakSelf = Weak.ref(self)

            def destroyed_clean(x):
                if weakSelf():
                    weakSelf().qr_window = None
                    weakSelf().print_error("QR Window destroyed.")

            self.qr_window.destroyed.connect(destroyed_clean)
        self.update_receive_qr()
        if self.qr_window.isMinimized():
            self.qr_window.showNormal()
        else:
            self.qr_window.show()
        self.qr_window.raise_()
        self.qr_window.activateWindow()

    def show_send_tab(self):
        self.tabs.setCurrentIndex(self.tabs.indexOf(self.send_tab))

    def show_receive_tab(self):
        self.tabs.setCurrentIndex(self.tabs.indexOf(self.receive_tab))

    def receive_at(self, addr):
        self.receive_address = addr
        self.show_receive_tab()
        self.update_receive_address_widget()

    def update_receive_qr(self):
        if not self.receive_address:
            return
        amount = self.receive_amount_e.get_amount()
        message = self.receive_message_e.text()
        self.save_request_button.setEnabled((amount is not None) or (message != ""))
        kwargs = {}
        if self.receive_opreturn_e.isVisible():
            # set op_return if enabled
            arg = "op_return"
            if self.receive_opreturn_rawhex_cb.isChecked():
                arg = "op_return_raw"
            opret = self.receive_opreturn_e.text()
            if opret:
                kwargs[arg] = opret

        # Special case hack -- see #1473. Omit ecash: prefix from
        # legacy address if no other params present in receive request.
        if (
            Address.FMT_UI == Address.FMT_LEGACY
            and not kwargs
            and not amount
            and not message
        ):
            uri = self.receive_address.to_ui_string_without_prefix()
        else:
            # Otherwise proceed as normal, prepending ecash: to URI
            uri = web.create_URI(self.receive_address, amount, message, **kwargs)

        self.receive_qr.setData(uri)
        if self.qr_window:
            self.qr_window.set_content(
                self, self.receive_address_e.text(), amount, message, uri, **kwargs
            )

    def create_send_tab(self):
        send_tab = SendTab(self, self.config, self.wallet, self.fx, self.network)
        send_tab.show_tab_signal.connect(self.show_send_tab)
        send_tab.payto_e.new_contact_added.connect(self.contact_list.update)
        send_tab.payto_e.new_contact_added.connect(self.update_completions)
        return send_tab

    def get_contact_payto(self, contact: Contact) -> str:
        assert isinstance(contact, Contact)
        _type, label = contact.type, contact.name
        if _type == "openalias":
            return contact.address
        return label + "  " + "<" + contact.address + ">"

    def update_completions(self):
        contact_paytos = []
        for contact in self.contact_list.get_full_contacts():
            s = self.get_contact_payto(contact)
            if s is not None:
                contact_paytos.append(s)
        # case-insensitive sort
        contact_paytos.sort(key=lambda x: x.lower())
        self.send_tab.completions.setStringList(contact_paytos)

    def protected(func):
        """Password request wrapper.  The password is passed to the function
        as the 'password' named argument.  "None" indicates either an
        unencrypted wallet, or the user cancelled the password request.
        An empty input is passed as the empty string."""

        def request_password(self, *args, **kwargs):
            parent = self.top_level_window()
            password = None
            on_pw_cancel = kwargs.pop("on_pw_cancel", None)
            while self.wallet.has_keystore_encryption():
                password = self.password_dialog(parent=parent)
                if password is None:
                    # User cancelled password input
                    if callable(on_pw_cancel):
                        on_pw_cancel()
                    return
                try:
                    self.wallet.check_password(password)
                    break
                except Exception as e:
                    self.show_error(str(e), parent=parent)
                    continue

            kwargs["password"] = password
            return func(self, *args, **kwargs)

        return request_password

    @protected
    def sign_tx(self, tx, callback, password):
        self.send_tab.sign_tx_with_password(tx, callback, password)

    def query_choice(self, msg, choices, *, add_cancel_button=False):
        # Needed by QtHandler for hardware wallets
        dialog = WindowModalDialog(self.top_level_window())
        clayout = ChoicesLayout(msg, choices)
        vbox = QtWidgets.QVBoxLayout(dialog)
        vbox.addLayout(clayout.layout())
        buts = [OkButton(dialog)]
        if add_cancel_button:
            buts.insert(0, CancelButton(dialog))
        vbox.addLayout(Buttons(*buts))
        result = dialog.exec_()
        dialog.setParent(None)
        if not result:
            return None
        return clayout.selected_index()

    def set_frozen_state(self, addrs, freeze):
        self.wallet.set_frozen_state(addrs, freeze)
        self.address_list.update()
        self.utxo_list.update()
        self.send_tab.update_fee()

    def set_frozen_coin_state(self, utxos, freeze):
        self.wallet.set_frozen_coin_state(utxos, freeze)
        self.utxo_list.update()
        self.send_tab.update_fee()

    def create_converter_tab(self):
        source_address = QtWidgets.QLineEdit()
        cash_address = ButtonsLineEdit()
        cash_address.addCopyButton()
        cash_address.setReadOnly(True)
        cash_address_bch = ButtonsLineEdit()
        cash_address_bch.addCopyButton()
        cash_address_bch.setReadOnly(True)
        legacy_address = ButtonsLineEdit()
        legacy_address.addCopyButton()
        legacy_address.setReadOnly(True)

        widgets = [
            (cash_address, Address.FMT_CASHADDR),
            (cash_address_bch, Address.FMT_CASHADDR_BCH),
            (legacy_address, Address.FMT_LEGACY),
        ]

        def convert_address():
            try:
                addr = Address.from_string(
                    source_address.text().strip(), support_arbitrary_prefix=True
                )
            except Exception:
                addr = None
            for widget, fmt in widgets:
                if addr:
                    widget.setText(addr.to_full_string(fmt))
                else:
                    widget.setText("")

        source_address.textChanged.connect(convert_address)

        w = QtWidgets.QWidget()
        grid = QtWidgets.QGridLayout()
        grid.setSpacing(15)
        grid.setColumnStretch(1, 2)
        grid.setColumnStretch(2, 1)

        label = QtWidgets.QLabel(_("&Address to convert"))
        label.setBuddy(source_address)
        grid.addWidget(label, 0, 0)
        grid.addWidget(source_address, 0, 1)

        label = QtWidgets.QLabel(_("&Cash address"))
        label.setBuddy(cash_address)
        grid.addWidget(label, 1, 0)
        grid.addWidget(cash_address, 1, 1)

        label = QtWidgets.QLabel(_("&BCH address"))
        label.setBuddy(cash_address_bch)
        grid.addWidget(label, 2, 0)
        grid.addWidget(cash_address_bch, 2, 1)

        label = QtWidgets.QLabel(_("&Legacy address"))
        label.setBuddy(legacy_address)
        grid.addWidget(label, 3, 0)
        grid.addWidget(legacy_address, 3, 1)

        w.setLayout(grid)

        label = WWLabel(
            _(
                f"This tool helps convert between address formats for {CURRENCY} "
                "addresses.\nYou are encouraged to use the 'Cash address' "
                "format."
            )
        )

        vbox = QtWidgets.QVBoxLayout()
        vbox.addWidget(label)
        vbox.addWidget(w)
        vbox.addStretch(1)

        w = QtWidgets.QWidget()
        w.setLayout(vbox)

        return w

    def create_addresses_tab(self):
        address_list = AddressList(self)
        address_list.edited.connect(self.update_labels)
        address_list.selection_cleared.connect(self.status_bar.clear_selected_amount)
        address_list.selected_amount_changed.connect(
            lambda satoshis: self.status_bar.set_selected_amount(
                format_amount_and_units(satoshis, self.config, self.fx)
            )
        )
        return address_list

    def create_utxo_tab(self):
        utxo_list = UTXOList(self)
        utxo_list.selection_cleared.connect(self.status_bar.clear_selected_amount)
        utxo_list.selected_amount_changed.connect(
            lambda satoshis: self.status_bar.set_selected_amount(
                format_amount_and_units(satoshis, self.config, self.fx)
            )
        )
        self.gui_object.addr_fmt_changed.connect(utxo_list.update)
        utxo_list.edited.connect(self.update_labels)
        return utxo_list

    def remove_address(self, addr):
        if self.question(
            _("Do you want to remove {} from your wallet?".format(addr.to_ui_string()))
        ):
            self.wallet.delete_address(addr)
            self.update_tabs()
            self.update_status()
            self.clear_receive_tab()

    def payto_contacts(self, contacts: List[Contact]):
        paytos = []
        for contact in contacts:
            s = self.get_contact_payto(contact)
            if s is not None:
                paytos.append(s)
        self.show_send_tab()
        self.send_tab.payto_payees(paytos)

    def on_contact_updated(self):
        self.history_list.update()
        # inform things like address_dialog that there's a new history
        self.history_updated_signal.emit()
        self.update_completions()

    def show_invoice(self, key):
        pr = self.wallet.invoices.get(key)
        pr.verify(self.wallet.contacts)
        self.show_pr_details(pr)

    def show_pr_details(self, pr):
        key = pr.get_id()
        d = WindowModalDialog(self.top_level_window(), _("Invoice"))
        vbox = QtWidgets.QVBoxLayout(d)
        grid = QtWidgets.QGridLayout()
        grid.addWidget(QtWidgets.QLabel(_("Requestor") + ":"), 0, 0)
        grid.addWidget(QtWidgets.QLabel(pr.get_requestor()), 0, 1)
        grid.addWidget(QtWidgets.QLabel(_("Amount") + ":"), 1, 0)
        outputs_str = "\n".join(
            format_amount(x[2], self.config)
            + base_unit(self.config)
            + " @ "
            + x[1].to_ui_string()
            for x in pr.get_outputs()
        )
        grid.addWidget(QtWidgets.QLabel(outputs_str), 1, 1)
        expires = pr.get_expiration_date()
        grid.addWidget(QtWidgets.QLabel(_("Memo") + ":"), 2, 0)
        grid.addWidget(QtWidgets.QLabel(pr.get_memo()), 2, 1)
        grid.addWidget(QtWidgets.QLabel(_("Signature") + ":"), 3, 0)
        grid.addWidget(QtWidgets.QLabel(pr.get_verify_status()), 3, 1)
        if expires:
            grid.addWidget(QtWidgets.QLabel(_("Expires") + ":"), 4, 0)
            grid.addWidget(QtWidgets.QLabel(format_time(expires)), 4, 1)
        vbox.addLayout(grid)
        weakD = Weak.ref(d)

        def do_export():
            ext = pr.export_file_ext()
            fn = getSaveFileName(_("Save invoice to file"), "*." + ext, self.config)
            if not fn:
                return
            with open(fn, "wb") as f:
                f.write(pr.export_file_data())
            self.show_message(_("Invoice saved as" + " " + fn))

        exportButton = EnterButton(_("Save"), do_export)

        def do_delete():
            if self.question(_("Delete invoice?")):
                self.send_tab.delete_invoice(key)
                self.history_list.update()
                # inform things like address_dialog that there's a new history
                self.history_updated_signal.emit()
                d = weakD()
                if d:
                    d.close()

        deleteButton = EnterButton(_("Delete"), do_delete)
        vbox.addLayout(Buttons(exportButton, deleteButton, CloseButton(d)))
        d.exec_()
        d.setParent(None)  # So Python can GC

    def create_console_tab(self):
        self.console = Console(wallet=self.wallet)
        return self.console

    def create_contacts_tab(self) -> ContactList:
        contact_list = ContactList(self.wallet.contacts, self.config, self.wallet)
        contact_list.contact_updated.connect(self.on_contact_updated)
        contact_list.payto_contacts_triggered.connect(self.payto_contacts)
        contact_list.sign_verify_message_triggered.connect(self.sign_verify_message)
        self.gui_object.addr_fmt_changed.connect(contact_list.update)
        return contact_list

    def update_console(self):
        console = self.console
        console.history = self.config.get("console-history", [])
        console.history_index = len(console.history)

        console.updateNamespace(
            {
                "wallet": self.wallet,
                "network": self.network,
                "plugins": self.gui_object.plugins,
                "window": self,
            }
        )
        console.updateNamespace({"util": util, "bitcoin": bitcoin})

        set_json = Weak(self.console.set_json)
        c = commands.Commands(
            self.config,
            self.wallet,
            self.network,
            self.gui_object.daemon,
            lambda: set_json(True),
        )
        methods = {}
        password_getter = Weak(self.password_dialog)

        def mkfunc(f, method):
            return lambda *args, **kwargs: f(
                method, *args, password_getter=password_getter, **kwargs
            )

        for m in dir(c):
            if m[0] == "_" or m in ["network", "wallet", "config"]:
                continue
            methods[m] = mkfunc(c._run, m)

        console.updateNamespace(methods)

    def create_status_bar(self) -> StatusBar:
        sb = StatusBar(self.gui_object)
        self.setStatusBar(sb)
        sb.search_box.textChanged.connect(self.do_search)
        sb.password_button.clicked.connect(self.change_password_dialog)
        sb.preferences_button.clicked.connect(self.settings_dialog)
        sb.seed_button.clicked.connect(lambda _checked: self.show_seed_dialog())
        sb.status_button.clicked.connect(
            lambda: self.gui_object.show_network_dialog(self)
        )
        sb.update_available_button.clicked.connect(
            lambda: self.gui_object.show_update_checker(self, skip_check=True)
        )
        return sb

    def update_buttons_on_seed(self):
        self.status_bar.update_buttons_on_seed(
            self.wallet.has_seed(), self.wallet.may_have_password()
        )
        self.send_tab.update_buttons_on_seed()

    def change_password_dialog(self):
        from electrumabc.storage import STO_EV_XPUB_PW

        if self.wallet.get_available_storage_encryption_version() == STO_EV_XPUB_PW:
            d = ChangePasswordDialogForHW(self, self.wallet)
            ok, encrypt_file = d.run()
            if not ok:
                return

            try:
                hw_dev_pw = self.wallet.keystore.get_password_for_storage_encryption()
            except UserCancelled:
                return
            except Exception as e:
                traceback.print_exc(file=sys.stderr)
                self.show_error(str(e))
                return
            old_password = hw_dev_pw if self.wallet.has_password() else None
            new_password = hw_dev_pw if encrypt_file else None
        else:
            d = ChangePasswordDialogForSW(self, self.wallet)
            ok, old_password, new_password, encrypt_file = d.run()

        if not ok:
            return
        try:
            self.wallet.update_password(old_password, new_password, encrypt_file)
            self.gui_object.cache_password(
                self.wallet, None
            )  # clear password cache when user changes it, just in case
            run_hook("on_new_password", self, old_password, new_password)
        except Exception as e:
            if is_verbose:
                traceback.print_exc(file=sys.stderr)
            self.show_error(_("Failed to update password") + "\n\n" + str(e))
            return
        msg = (
            _("Password was updated successfully")
            if self.wallet.has_password()
            else _("Password is disabled, this wallet is not protected")
        )
        self.show_message(msg, title=_("Success"))
        self.status_bar.update_lock_icon(self.wallet.has_password())

    def get_passphrase_dialog(
        self, msg: str, title: Optional[str] = None, *, permit_empty=False
    ) -> str:
        d = PassphraseDialog(
            self.wallet, self.top_level_window(), msg, title, permit_empty=permit_empty
        )
        return d.run()

    def do_search(self, pattern: str):
        """Apply search text to all tabs. FIXME: if a plugin later is loaded
        it will not receive the search filter -- but most plugins I know about
        do not support searchable_list anyway, so hopefully it's a non-issue."""
        for i in range(self.tabs.count()):
            tab = self.tabs.widget(i)
            searchable_list = None
            if isinstance(tab, MyTreeWidget):
                searchable_list = tab
            elif hasattr(tab, "searchable_list"):
                searchable_list = tab.searchable_list
            if searchable_list is None:
                return
            searchable_list.filter(pattern)

    def show_master_public_keys(self):
        dialog = WindowModalDialog(self.top_level_window(), _("Wallet Information"))
        dialog.setMinimumSize(500, 100)
        mpk_list = self.wallet.get_master_public_keys()
        vbox = QtWidgets.QVBoxLayout()
        wallet_type = self.wallet.storage.get("wallet_type", "")
        grid = QtWidgets.QGridLayout()
        basename = os.path.basename(self.wallet.storage.path)
        grid.addWidget(QtWidgets.QLabel(_("Wallet name") + ":"), 0, 0)
        grid.addWidget(QtWidgets.QLabel(basename), 0, 1)
        grid.addWidget(QtWidgets.QLabel(_("Wallet type") + ":"), 1, 0)
        grid.addWidget(QtWidgets.QLabel(wallet_type), 1, 1)
        grid.addWidget(QtWidgets.QLabel(_("Script type") + ":"), 2, 0)
        grid.addWidget(QtWidgets.QLabel(self.wallet.txin_type), 2, 1)
        vbox.addLayout(grid)
        if self.wallet.is_deterministic():
            mpk_text = ShowQRTextEdit()
            mpk_text.setMaximumHeight(150)
            mpk_text.addCopyButton()

            def show_mpk(index):
                mpk_text.setText(mpk_list[index])

            # only show the combobox in case multiple accounts are available
            if len(mpk_list) > 1:

                def label(key):
                    if isinstance(self.wallet, MultisigWallet):
                        return _("cosigner") + " " + str(key + 1)
                    return ""

                labels = [label(i) for i in range(len(mpk_list))]
                labels_clayout = ChoicesLayout(
                    _("Master Public Keys"),
                    labels,
                    lambda clayout: show_mpk(clayout.selected_index()),
                )
                vbox.addLayout(labels_clayout.layout())
            else:
                vbox.addWidget(QtWidgets.QLabel(_("Master Public Key")))
            show_mpk(0)
            vbox.addWidget(mpk_text)
        vbox.addStretch(1)
        vbox.addLayout(Buttons(CloseButton(dialog)))
        dialog.setLayout(vbox)
        dialog.exec_()

    def remove_wallet(self):
        if self.question(
            "\n".join(
                [
                    _("Delete wallet file?"),
                    "%s" % self.wallet.storage.path,
                    _(
                        "If your wallet contains funds, make sure you have saved its"
                        " seed."
                    ),
                ]
            )
        ):
            self._delete_wallet()

    @protected
    def _delete_wallet(self, password):
        wallet_path = self.wallet.storage.path
        basename = os.path.basename(wallet_path)
        r = self.gui_object.daemon.delete_wallet(
            wallet_path
        )  # implicitly also calls stop_wallet
        self.update_recently_visited(
            wallet_path
        )  # this ensures it's deleted from the menu
        if r:
            self.show_error(_("Wallet removed: {}").format(basename))
        else:
            self.show_error(_("Wallet file not found: {}").format(basename))
        self.close()

    @protected
    def show_seed_dialog(self, password):
        if not self.wallet.has_seed():
            self.show_message(_("This wallet has no seed"))
            return
        keystore = self.wallet.get_keystore()
        try:
            seed = keystore.get_seed(password)
            passphrase = keystore.get_passphrase(password)  # may be None or ''
            derivation = (
                keystore.has_derivation() and keystore.derivation
            )  # may be None or ''
            seed_type = getattr(keystore, "seed_type", "")
            if derivation == "m/" and seed_type in ["electrum", "standard"]:
                derivation = None  # suppress Electrum seed 'm/' derivation from UI
        except Exception as e:
            self.show_error(str(e))
            return

        d = SeedDialog(self.top_level_window(), seed, passphrase, derivation, seed_type)
        d.exec_()

    def show_qrcode(self, data, title=_("QR code"), parent=None):
        if not data:
            return
        d = QRDialog(data, parent or self, title)
        d.exec_()
        d.setParent(None)  # Help Python GC this sooner rather than later

    @protected
    def show_private_key(self, address, password):
        if not address:
            return
        try:
            pk = self.wallet.export_private_key(address, password)
        except Exception as e:
            if is_verbose:
                traceback.print_exc(file=sys.stderr)
            self.show_message(str(e))
            return
        xtype = bitcoin.deserialize_privkey(pk)[0]
        d = WindowModalDialog(self.top_level_window(), _("Private key"))
        d.setMinimumSize(600, 150)
        vbox = QtWidgets.QVBoxLayout()
        vbox.addWidget(QtWidgets.QLabel("{}: {}".format(_("Address"), address)))
        vbox.addWidget(QtWidgets.QLabel(_("Script type") + ": " + xtype.name))
        pk_lbl = QtWidgets.QLabel(_("Private key") + ":")
        vbox.addWidget(pk_lbl)
        keys_e = ShowQRTextEdit(text=pk)
        keys_e.addCopyButton()

        # BIP38 Encrypt Button
        def setup_encrypt_button():
            encrypt_but = QtWidgets.QPushButton(_("Encrypt BIP38") + "...")
            f = encrypt_but.font()
            f.setPointSize(f.pointSize() - 1)
            encrypt_but.setFont(f)  # make font -= 1
            encrypt_but.setEnabled(bool(bitcoin.Bip38Key.canEncrypt()))
            encrypt_but.setToolTip(
                _("Encrypt this private key using BIP38 encryption")
                if encrypt_but.isEnabled()
                else _("BIP38 encryption unavailable: install pycryptodomex to enable")
            )
            border_color = ColorScheme.DEFAULT.as_color(False)
            border_color.setAlphaF(0.65)
            encrypt_but_ss_en = (
                keys_e.styleSheet()
                + "QPushButton { border: 1px solid %s; border-radius: 6px; padding:"
                " 2px; margin: 2px; } QPushButton:hover { border: 1px solid #3daee9;"
                " } QPushButton:disabled { border: 1px solid transparent; "
                % (border_color.name(QColor.HexArgb))
            )
            encrypt_but_ss_dis = keys_e.styleSheet()
            encrypt_but.setStyleSheet(
                encrypt_but_ss_en if encrypt_but.isEnabled() else encrypt_but_ss_dis
            )

            def on_encrypt():
                passphrase = self.get_passphrase_dialog(
                    msg=(
                        _("Specify a passphrase to use for BIP38 encryption.")
                        + "\n"
                        + _(
                            "Save this passphrase if you save the generated key so you"
                            " may decrypt it later."
                        )
                    )
                )
                if not passphrase:
                    return
                try:
                    bip38 = str(bitcoin.Bip38Key.encrypt(pk, passphrase))
                    keys_e.setText(bip38)
                    encrypt_but.setEnabled(False)
                    encrypt_but.setStyleSheet(encrypt_but_ss_dis)
                    pk_lbl.setText(_("BIP38 Key") + ":")
                    self.show_message(
                        _(
                            "WIF key has been encrypted using BIP38.\n\nYou may save"
                            " this encrypted key to a file or print out its QR code"
                            " and/or text.\n\nIt is strongly encrypted with the"
                            " passphrase you specified and safe to store"
                            " electronically. However, the passphrase should be stored"
                            " securely and not shared with anyone."
                        )
                    )
                except Exception as e:
                    if is_verbose:
                        traceback.print_exc(file=sys.stderr)
                    self.show_error(str(e))

            encrypt_but.clicked.connect(on_encrypt)
            keys_e.addWidget(encrypt_but, 0)

        setup_encrypt_button()
        # /BIP38 Encrypt Button
        vbox.addWidget(keys_e)
        vbox.addWidget(QtWidgets.QLabel(_("Redeem Script") + ":"))
        rds_e = ShowQRTextEdit(text=address.to_script().hex())
        rds_e.addCopyButton()
        vbox.addWidget(rds_e)
        vbox.addLayout(Buttons(CloseButton(d)))
        d.setLayout(vbox)

        d.exec_()

    def sign_verify_message(self, address=None):
        d = SignVerifyDialog(self.wallet, address, parent=self)
        d.exec_()

    @protected
    def do_decrypt(self, message_e, pubkey_e, encrypted_e, password):
        if self.wallet.is_watching_only():
            self.show_message(_("This is a watching-only wallet."))
            return
        cyphertext = encrypted_e.toPlainText()
        task = partial(
            self.wallet.decrypt_message, pubkey_e.text(), cyphertext, password
        )
        self.wallet.thread.add(
            task, on_success=lambda text: message_e.setText(text.decode("utf-8"))
        )

    def do_encrypt(self, message_e, pubkey_e, encrypted_e):
        message = message_e.toPlainText()
        message = message.encode("utf-8")
        try:
            public_key = ECPubkey(bytes.fromhex(pubkey_e.text()))
            encrypted = public_key.encrypt_message(message)
            encrypted_e.setText(encrypted.decode("ascii"))
        except Exception as e:
            if is_verbose:
                traceback.print_exc(file=sys.stderr)
            self.show_warning(str(e))

    def encrypt_message(self, address=None):
        d = WindowModalDialog(self.top_level_window(), _("Encrypt/decrypt Message"))
        d.setMinimumSize(610, 490)

        layout = QtWidgets.QGridLayout(d)

        message_e = QtWidgets.QTextEdit()
        message_e.setAcceptRichText(False)
        layout.addWidget(QtWidgets.QLabel(_("Message")), 1, 0)
        layout.addWidget(message_e, 1, 1)
        layout.setRowStretch(2, 3)

        pubkey_e = QtWidgets.QLineEdit()
        if address:
            pubkey = self.wallet.get_public_key(address)
            if not isinstance(pubkey, str):
                pubkey = pubkey.to_ui_string()
            pubkey_e.setText(pubkey)
        layout.addWidget(QtWidgets.QLabel(_("Public key")), 2, 0)
        layout.addWidget(pubkey_e, 2, 1)

        encrypted_e = QtWidgets.QTextEdit()
        encrypted_e.setAcceptRichText(False)
        layout.addWidget(QtWidgets.QLabel(_("Encrypted")), 3, 0)
        layout.addWidget(encrypted_e, 3, 1)
        layout.setRowStretch(3, 1)

        hbox = QtWidgets.QHBoxLayout()
        b = QtWidgets.QPushButton(_("Encrypt"))
        b.clicked.connect(lambda: self.do_encrypt(message_e, pubkey_e, encrypted_e))
        hbox.addWidget(b)

        b = QtWidgets.QPushButton(_("Decrypt"))
        b.clicked.connect(lambda: self.do_decrypt(message_e, pubkey_e, encrypted_e))
        hbox.addWidget(b)

        b = QtWidgets.QPushButton(_("Close"))
        b.clicked.connect(d.accept)
        hbox.addWidget(b)

        layout.addLayout(hbox, 4, 1)
        d.exec_()

    def password_dialog(self, msg=None, parent=None):
        parent = parent or self
        return PasswordDialog(parent, msg).run()

    def tx_from_text(self, txt: str) -> Optional[Transaction]:
        try:
            raw_tx = rawtx_from_str(txt)
            tx = Transaction(raw_tx, sign_schnorr=self.wallet.is_schnorr_enabled())
            tx.deserialize()
            if self.wallet:
                my_coins = self.wallet.get_spendable_coins(None, self.config)
                my_outpoints = [
                    vin["prevout_hash"] + ":" + str(vin["prevout_n"])
                    for vin in my_coins
                ]
                for txin in tx.txinputs():
                    outpoint = str(txin.outpoint)
                    if outpoint in my_outpoints:
                        my_index = my_outpoints.index(outpoint)
                        txin.set_value(my_coins[my_index]["value"])
            return tx
        except Exception:
            if is_verbose:
                traceback.print_exc(file=sys.stderr)
            self.show_critical(
                _(f"{PROJECT_NAME} was unable to parse your transaction")
            )
            return

    # Due to the asynchronous nature of the qr reader we need to keep the
    # dialog instance as member variable to prevent reentrancy/multiple ones
    # from being presented at once.
    _qr_dialog = None

    def read_tx_from_qrcode(self):
        if self._qr_dialog:
            # Re-entrancy prevention -- there is some lag between when the user
            # taps the QR button and the modal dialog appears.  We want to
            # prevent multiple instances of the dialog from appearing, so we
            # must do this.
            self.print_error("Warning: QR dialog is already presented, ignoring.")
            return
        if self.gui_object.warn_if_cant_import_qrreader(self):
            return

        self._qr_dialog = None
        try:
            self._qr_dialog = QrReaderCameraDialog(
                parent=self.top_level_window(), config=self.config
            )

            def _on_qr_reader_finished(success: bool, error: str, result):
                if self._qr_dialog:
                    self._qr_dialog.deleteLater()
                    self._qr_dialog = None
                if not success:
                    if error:
                        self.show_error(error)
                    return
                if not result:
                    return
                # if the user scanned an ecash URI
                if result.lower().startswith(networks.net.CASHADDR_PREFIX + ":"):
                    self.send_tab.pay_to_URI(result)
                    return
                # else if the user scanned an offline signed tx
                try:
                    result = bh2u(bitcoin.base_decode(result, length=None, base=43))
                    # will show an error dialog on error
                    tx = self.tx_from_text(result)
                    if not tx:
                        return
                except Exception as e:
                    self.show_error(str(e))
                    return
                self.show_transaction(tx)

            self._qr_dialog.qr_finished.connect(_on_qr_reader_finished)
            self._qr_dialog.start_scan(self.config.get_video_device())
        except Exception as e:
            if is_verbose:
                traceback.print_exc(file=sys.stderr)
            self._qr_dialog = None
            self.show_error(str(e))

    def read_tx_from_file(self, filename: str) -> Optional[Transaction]:
        try:
            with open(filename, "r", encoding="utf-8") as f:
                file_content = f.read()
            file_content = file_content.strip()
            json.loads(str(file_content))
        except (ValueError, IOError, OSError, json.decoder.JSONDecodeError) as reason:
            self.show_critical(
                _(f"{PROJECT_NAME} was unable to open your transaction file")
                + "\n"
                + str(reason),
                title=_("Unable to read file or no transaction found"),
            )
            return
        tx = self.tx_from_text(file_content)
        return tx

    def do_process_from_text(self):
        text = text_dialog(
            self.top_level_window(),
            _("Input raw transaction"),
            _("Transaction:"),
            _("Load transaction"),
            self.config,
        )
        if not text:
            return
        try:
            tx = self.tx_from_text(text)
            if tx:
                self.show_transaction(tx)
        except SerializationError as e:
            self.show_critical(
                _(f"{PROJECT_NAME} was unable to deserialize the transaction:")
                + "\n"
                + str(e)
            )

    def do_process_from_file(self):
        fileName = getOpenFileName(
            _("Select your transaction file"), self.config, "*.txn"
        )
        if not fileName:
            return
        try:
            tx = self.read_tx_from_file(fileName)
            if tx:
                self.show_transaction(tx)
        except SerializationError as e:
            self.show_critical(
                _(f"{PROJECT_NAME} was unable to deserialize the transaction:")
                + "\n"
                + str(e)
            )

    def do_process_from_multiple_files(self):
        filenames, _filter = QtWidgets.QFileDialog.getOpenFileNames(
            self,
            "Select one or more files to open",
            self.config.get("io_dir", os.path.expanduser("~")),
        )

        transactions = []
        for filename in filenames:
            try:
                tx = self.read_tx_from_file(filename)
                if tx is not None:
                    transactions.append(tx)
            except SerializationError as e:
                self.show_critical(
                    f"{PROJECT_NAME} was unable to deserialize the"
                    f" transaction in file {filename}:\n" + str(e)
                )
        if not transactions:
            return

        multi_tx_dialog = MultiTransactionsDialog(self.wallet, self, self)
        multi_tx_dialog.widget.set_transactions(transactions)
        multi_tx_dialog.exec_()

    def do_process_from_txid(self, *, txid=None, parent=None):
        parent = parent or self
        if self.gui_object.warn_if_no_network(parent):
            return
        ok = txid is not None
        if not ok:
            txid, ok = QtWidgets.QInputDialog.getText(
                parent, _("Lookup transaction"), _("Transaction ID") + ":"
            )
        if ok and txid:
            ok, r = self.network.get_raw_tx_for_txid(txid, timeout=10.0)
            if not ok:
                parent.show_message(_("Error retrieving transaction") + ":\n" + r)
                return
            # note that presumably the tx is already signed if it comes from blockchain
            # so this sign_schnorr parameter is superfluous, but here to satisfy
            # my OCD -Calin
            tx = Transaction(
                bytes.fromhex(r), sign_schnorr=self.wallet.is_schnorr_enabled()
            )
            self.show_transaction(tx)

    def do_create_invoice(self):
        d = InvoiceDialog(self, self.fx)
        d.set_address(self.receive_address)
        d.show()

    def do_load_edit_invoice(self):
        d = InvoiceDialog(self, self.fx)
        d.open_file_and_load_invoice()
        d.show()

    def open_proof_editor(self):
        dialog = AvaProofDialog(self.wallet, self.receive_address, parent=self)
        dialog.show()

    def build_avalanche_delegation(self):
        """
        Open a dialog to build an avalanche delegation.
        The user first provides a proof, a limited proof id or an existing delegation.
        Then he provides a delegator private key (must match provided proof or
        delegation) and a new delegated public key.

        Alternatively, this dialog can be opened from the proof building dialog. It is
        then prefilled with the correct data (except the delegated public key).
        """
        dialog = AvaDelegationDialog(self.wallet, parent=self)
        dialog.show()

    def export_bip38_dialog(self):
        """Convenience method. Simply calls self.export_privkeys_dialog(bip38=True)"""
        self.export_privkeys_dialog(bip38=True)

    @protected
    def export_privkeys_dialog(self, password, *, bip38=False):
        if self.wallet.is_watching_only():
            self.show_message(_("This is a watching-only wallet"))
            return

        if isinstance(self.wallet, MultisigWallet):
            if bip38:
                self.show_error(
                    _("WARNING: This is a multi-signature wallet.")
                    + "\n"
                    + _("It cannot be used with BIP38 encrypted keys.")
                )
                return
            self.show_message(
                _("WARNING: This is a multi-signature wallet.")
                + "\n"
                + _('It can not be "backed up" by simply exporting these private keys.')
            )

        if bip38:
            if not bitcoin.Bip38Key.canEncrypt() or not bitcoin.Bip38Key.isFast():
                self.show_error(
                    _(
                        "BIP38 Encryption is not available. Please install "
                        f"'pycryptodomex' and restart {PROJECT_NAME} to enable"
                        "BIP38."
                    )
                )
                return
            passphrase = self.get_passphrase_dialog(
                msg=(
                    _(
                        "You are exporting your wallet's private keys as BIP38"
                        " encrypted keys."
                    )
                    + "\n\n"
                    + _("You must specify a passphrase to use for encryption.")
                    + "\n"
                    + _(
                        "Save this passphrase so you may decrypt your BIP38 keys later."
                    )
                )
            )
            if not passphrase:
                # user cancel
                return
            bip38 = passphrase  # overwrite arg with passphrase.. for use down below ;)

        class MyWindowModalDialog(WindowModalDialog):
            computing_privkeys_signal = Signal()
            show_privkeys_signal = Signal()

        d = MyWindowModalDialog(self.top_level_window(), _("Private keys"))
        weak_d = Weak.ref(d)
        d.setObjectName("WindowModalDialog - Private Key Export")
        destroyed_print_error(d)  # track object lifecycle
        d.setMinimumSize(850, 300)
        vbox = QtWidgets.QVBoxLayout(d)

        lines = [
            _("WARNING: ALL your private keys are secret."),
            _("Exposing a single private key can compromise your entire wallet!"),
            _(
                "In particular, DO NOT use 'redeem private key' services proposed by"
                " third parties."
            ),
        ]
        if bip38:
            del lines[0]  # No need to scream-WARN them since BIP38 *are* encrypted
        msg = "\n".join(lines)
        vbox.addWidget(QtWidgets.QLabel(msg))

        if bip38:
            wwlbl = WWLabel()

            def set_ww_txt(pf_shown=False):
                if pf_shown:
                    pf_text = (
                        "<font face='{monoface}' size=+1><b>".format(
                            monoface=MONOSPACE_FONT
                        )
                        + bip38
                        + '</b></font> <a href="hide">{link}</a>'.format(link=_("Hide"))
                    )
                else:
                    pf_text = '<a href="show">{link}</a>'.format(
                        link=_("Click to show")
                    )
                wwlbl.setText(
                    _(
                        "The below keys are BIP38 <i>encrypted</i> using the"
                        " passphrase: {passphrase}<br>Please <i>write this passphrase"
                        " down</i> and store it in a secret place, separate from these"
                        " encrypted keys."
                    ).format(passphrase=pf_text)
                )

            def toggle_ww_txt(link):
                set_ww_txt(link == "show")

            set_ww_txt()
            wwlbl.linkActivated.connect(toggle_ww_txt)
            vbox.addWidget(wwlbl)

        e = QtWidgets.QTextEdit()
        e.setFont(QFont(MONOSPACE_FONT))
        e.setWordWrapMode(QTextOption.NoWrap)
        e.setReadOnly(True)
        vbox.addWidget(e)

        defaultname = (
            f"{SCRIPT_NAME}-private-keys.csv"
            if not bip38
            else f"{SCRIPT_NAME}-bip38-keys.csv"
        )
        select_msg = _("Select file to export your private keys to")
        box, filename_e, csv_button = filename_field(
            self.config, defaultname, select_msg
        )
        vbox.addSpacing(12)
        vbox.addWidget(box)

        b = OkButton(d, _("Export"))
        b.setEnabled(False)
        vbox.addLayout(Buttons(CancelButton(d), b))

        private_keys = {}
        addresses = self.wallet.get_addresses()
        stop = False

        def privkeys_thread():
            for addr in addresses:
                if not bip38:
                    # This artificial sleep is likely a security / paranoia measure
                    # to allow user to cancel or to make the process "feel expensive".
                    # In the bip38 case it's already slow enough so this delay
                    # is not needed.
                    time.sleep(0.100)
                if stop:
                    return
                try:
                    privkey = self.wallet.export_private_key(addr, password)
                    if bip38 and privkey:
                        privkey = str(
                            bitcoin.Bip38Key.encrypt(privkey, bip38)
                        )  # __str__() -> base58 encoded bip38 key
                except InvalidPassword:
                    # See #921 -- possibly a corrupted wallet or other strangeness
                    privkey = "INVALID_PASSWORD"
                private_keys[addr.to_ui_string()] = privkey
                strong_d = weak_d()
                try:
                    if strong_d and not stop:
                        strong_d.computing_privkeys_signal.emit()
                    else:
                        return
                finally:
                    del strong_d
            if stop:
                return
            strong_d = weak_d()
            if strong_d:
                strong_d.show_privkeys_signal.emit()

        def show_privkeys():
            nonlocal stop
            if stop:
                return
            s = "\n".join(
                "{:45} {}".format(addr, privkey)
                for addr, privkey in private_keys.items()
            )
            e.setText(s)
            b.setEnabled(True)
            stop = True

        thr = None

        def on_dialog_closed(*args):
            nonlocal stop
            stop = True
            try:
                d.computing_privkeys_signal.disconnect()
            except TypeError:
                pass
            try:
                d.show_privkeys_signal.disconnect()
            except TypeError:
                pass
            try:
                d.finished.disconnect()
            except TypeError:
                pass
            if thr and thr.is_alive():
                # wait for thread to end for maximal GC mojo
                thr.join(timeout=1.0)

        def computing_privkeys_slot():
            if stop:
                return
            e.setText(
                _("Please wait... {num}/{total}").format(
                    num=len(private_keys), total=len(addresses)
                )
            )

        d.computing_privkeys_signal.connect(computing_privkeys_slot)
        d.show_privkeys_signal.connect(show_privkeys)
        d.finished.connect(on_dialog_closed)
        thr = threading.Thread(target=privkeys_thread, daemon=True)
        thr.start()

        res = d.exec_()
        if not res:
            stop = True
            return

        filename = filename_e.text()
        if not filename:
            return

        try:
            self.do_export_privkeys(filename, private_keys, csv_button.isChecked())
        except (IOError, os.error) as reason:
            txt = "\n".join(
                [
                    _(f"{PROJECT_NAME} was unable to produce a privatekey-export."),
                    str(reason),
                ]
            )
            self.show_critical(txt, title=_("Unable to create csv"))

        except Exception as e:
            self.show_message(str(e))
            return

        self.show_message(_("Private keys exported."))

    def do_export_privkeys(self, fileName, pklist, is_csv):
        with open(fileName, "w+", encoding="utf-8") as f:
            if is_csv:
                transaction = csv.writer(f)
                transaction.writerow(["address", "private_key"])
                for addr, pk in pklist.items():
                    transaction.writerow(["%34s" % addr, pk])
            else:
                f.write(json.dumps(pklist, indent=4))

    def do_import_labels(self):
        labelsFile = getOpenFileName(_("Open labels file"), self.config, "*.json")
        if not labelsFile:
            return
        try:
            with open(
                labelsFile, "r", encoding="utf-8"
            ) as f:  # always ensure UTF-8. See issue #1453.
                data = f.read()
                data = json.loads(data)
            if (
                type(data) is not dict
                or not len(data)
                or not all(type(v) is str and type(k) is str for k, v in data.items())
            ):
                self.show_critical(
                    _("The file you selected does not appear to contain labels.")
                )
                return
            for key, value in data.items():
                self.wallet.set_label(key, value)
            self.show_message(
                _("Your labels were imported from") + " '%s'" % str(labelsFile)
            )
        except (IOError, OSError, json.decoder.JSONDecodeError) as reason:
            self.show_critical(
                _(f"{PROJECT_NAME} was unable to import your labels.")
                + "\n"
                + str(reason)
            )
        self.address_list.update()
        self.history_list.update()
        self.utxo_list.update()
        self.history_updated_signal.emit()  # inform things like address_dialog that there's a new history

    def do_export_labels(self):
        labels = self.wallet.labels
        try:
            fileName = getSaveFileName(
                _("Select file to save your labels"),
                f"{SCRIPT_NAME}_labels.json",
                self.config,
                "*.json",
            )
            if fileName:
                with open(
                    fileName, "w+", encoding="utf-8"
                ) as f:  # always ensure UTF-8. See issue #1453.
                    json.dump(labels, f, indent=4, sort_keys=True)
                self.show_message(
                    _("Your labels were exported to") + " '%s'" % str(fileName)
                )
        except (IOError, os.error) as reason:
            self.show_critical(
                _(f"{PROJECT_NAME} was unable to export your labels.")
                + "\n"
                + str(reason)
            )

    def export_history_dialog(self):
        d = WindowModalDialog(self.top_level_window(), _("Export History"))
        d.setMinimumSize(400, 200)
        vbox = QtWidgets.QVBoxLayout(d)
        defaultname = os.path.expanduser(f"~/{SCRIPT_NAME}-history.csv")
        select_msg = _("Select file to export your wallet transactions to")
        box, filename_e, csv_button = filename_field(
            self.config, defaultname, select_msg
        )
        vbox.addWidget(box)
        include_addresses_chk = QtWidgets.QCheckBox(_("Include addresses"))
        include_addresses_chk.setChecked(True)
        include_addresses_chk.setToolTip(
            _("Include input and output addresses in history export")
        )
        vbox.addWidget(include_addresses_chk)
        fee_dl_chk = QtWidgets.QCheckBox(_("Fetch accurate fees from network (slower)"))
        fee_dl_chk.setChecked(self.is_fetch_input_data())
        fee_dl_chk.setEnabled(bool(self.wallet.network))
        fee_dl_chk.setToolTip(
            _(
                "If this is checked, accurate fee and input value data will be"
                " retrieved from the network"
            )
        )
        vbox.addWidget(fee_dl_chk)
        fee_time_w = QtWidgets.QWidget()
        fee_time_w.setToolTip(
            _(
                "The amount of overall time in seconds to allow for downloading fee"
                " data before giving up"
            )
        )
        hbox = QtWidgets.QHBoxLayout(fee_time_w)
        hbox.setContentsMargins(20, 0, 0, 0)
        hbox.addWidget(QtWidgets.QLabel(_("Timeout:")), 0, Qt.AlignmentFlag.AlignRight)
        fee_time_sb = QtWidgets.QSpinBox()
        fee_time_sb.setMinimum(10)
        fee_time_sb.setMaximum(9999)
        fee_time_sb.setSuffix(" " + _("seconds"))
        fee_time_sb.setValue(30)
        fee_dl_chk.clicked.connect(fee_time_w.setEnabled)
        fee_time_w.setEnabled(fee_dl_chk.isChecked())
        hbox.addWidget(fee_time_sb, 0, Qt.AlignmentFlag.AlignLeft)
        hbox.addStretch(1)
        vbox.addWidget(fee_time_w)
        vbox.addStretch(1)
        hbox = Buttons(CancelButton(d), OkButton(d, _("Export")))
        vbox.addLayout(hbox)
        run_hook("export_history_dialog", self, hbox)
        self.update()
        res = d.exec_()
        d.setParent(None)  # for python GC
        if not res:
            return
        filename = filename_e.text()
        if not filename:
            return
        success = False
        try:
            # minimum 10s time for calc. fees, etc
            timeout = max(fee_time_sb.value() if fee_dl_chk.isChecked() else 10.0, 10.0)
            success = self.do_export_history(
                filename,
                csv_button.isChecked(),
                download_inputs=fee_dl_chk.isChecked(),
                timeout=timeout,
                include_addresses=include_addresses_chk.isChecked(),
            )
        except Exception as reason:
            export_error_label = _(
                f"{PROJECT_NAME} was unable to produce a transaction export."
            )
            self.show_critical(
                export_error_label + "\n" + str(reason),
                title=_("Unable to export history"),
            )
        else:
            if success:
                self.show_message(
                    _("Your wallet history has been successfully exported.")
                )

    def is_fetch_input_data(self):
        """default on if network.auto_connect is True, otherwise use config value"""
        return bool(
            self.wallet
            and self.wallet.network
            and self.config.get("fetch_input_data", self.wallet.network.auto_connect)
        )

    def set_fetch_input_data(self, b):
        self.config.set_key("fetch_input_data", bool(b))

    def do_export_history(
        self,
        fileName,
        is_csv,
        *,
        download_inputs=False,
        timeout=30.0,
        include_addresses=True,
    ):
        wallet = self.wallet
        if not wallet:
            return
        dlg = None  # this will be set at the bottom of this function

        def task():
            def update_prog(x):
                if dlg:
                    dlg.update_progress(int(x * 100))

            return wallet.export_history(
                fx=self.fx,
                show_addresses=include_addresses,
                decimal_point=self.get_decimal_point(),
                fee_calc_timeout=timeout,
                download_inputs=download_inputs,
                progress_callback=update_prog,
            )

        success = False

        def on_success(history):
            nonlocal success
            ccy = (self.fx and self.fx.get_currency()) or ""
            has_fiat_columns = (
                history
                and self.fx
                and self.fx.show_history()
                and "fiat_value" in history[0]
                and "fiat_balance" in history[0]
                and "fiat_fee" in history[0]
            )
            lines = []
            for item in history:
                if is_csv:
                    cols = [
                        item["txid"],
                        item.get("label", ""),
                        item["confirmations"],
                        item["value"],
                        item["fee"],
                        item["date"],
                    ]
                    if has_fiat_columns:
                        cols += [
                            item["fiat_value"],
                            item["fiat_balance"],
                            item["fiat_fee"],
                        ]
                    if include_addresses:
                        inaddrs_filtered = (
                            x
                            for x in (item.get("input_addresses") or [])
                            if Address.is_valid(x)
                        )
                        outaddrs_filtered = (
                            x
                            for x in (item.get("output_addresses") or [])
                            if Address.is_valid(x)
                        )
                        cols.append(",".join(inaddrs_filtered))
                        cols.append(",".join(outaddrs_filtered))
                    lines.append(cols)
                else:
                    if has_fiat_columns and ccy:
                        # add the currency to each entry in the json. this wastes space
                        # but json is bloated anyway so this won't hurt too much, we
                        # hope
                        item["fiat_currency"] = ccy
                    elif not has_fiat_columns:
                        # No need to include these fields as they will always be 'No Data'
                        item.pop("fiat_value", None)
                        item.pop("fiat_balance", None)
                        item.pop("fiat_fee", None)
                    lines.append(item)

            with open(
                fileName, "w+", encoding="utf-8"
            ) as f:  # ensure encoding to utf-8. Avoid Windows cp1252. See #1453.
                if is_csv:
                    transaction = csv.writer(f, lineterminator="\n")
                    cols = [
                        "transaction_hash",
                        "label",
                        "confirmations",
                        "value",
                        "fee",
                        "timestamp",
                    ]
                    if has_fiat_columns:
                        cols += [
                            f"fiat_value_{ccy}",
                            f"fiat_balance_{ccy}",
                            f"fiat_fee_{ccy}",
                        ]  # in CSV mode, we use column names eg fiat_value_USD, etc
                    if include_addresses:
                        cols += ["input_addresses", "output_addresses"]
                    transaction.writerow(cols)
                    for line in lines:
                        transaction.writerow(line)
                else:
                    f.write(json.dumps(lines, indent=4))
            success = True

        # kick off the waiting dialog to do all of the above
        dlg = WaitingDialog(
            self.top_level_window(),
            _("Exporting history, please wait ..."),
            task,
            on_success,
            self.on_error,
            disable_escape_key=True,
            auto_exec=False,
            auto_show=False,
            progress_bar=True,
            progress_min=0,
            progress_max=100,
        )
        dlg.exec_()
        # this will block heere in the WaitingDialog event loop... and set success to True if success
        return success

    def _do_import(self, title, msg, func):
        text = text_dialog(
            self.top_level_window(),
            title,
            msg + " :",
            _("Import"),
            self.config,
            allow_multi=True,
        )
        if not text:
            return
        bad, bad_info = [], []
        good = []
        for key in str(text).split():
            try:
                addr = func(key)
                good.append(addr)
            except Exception as e:
                bad.append(key)
                bad_info.append("{}: {}".format(key, str(e)))
                continue
        if good:
            self.show_message(
                _("The following addresses were added") + ":\n" + "\n".join(good)
            )
        if bad:
            self.show_warning(
                _("The following could not be imported") + ":\n" + "\n".join(bad),
                detail_text="\n\n".join(bad_info),
            )
        self.address_list.update()
        self.history_list.update()
        self.history_updated_signal.emit()  # inform things like address_dialog that there's a new history

    def import_addresses(self):
        if not self.wallet.can_import_address():
            return
        title, msg = _("Import addresses"), _("Enter addresses")

        def import_addr(addr):
            if self.wallet.import_address(Address.from_string(addr)):
                return addr
            return ""

        self._do_import(title, msg, import_addr)

    def show_auxiliary_keys(self):
        if not self.wallet.is_deterministic() or not self.wallet.can_export():
            return

        d = AuxiliaryKeysDialog(self.wallet, parent=self)
        d.show()

    @protected
    def do_import_privkey(self, password):
        if not self.wallet.can_import_privkey():
            return
        title, msg = _("Import private keys"), _("Enter private keys")
        if bitcoin.is_bip38_available():
            msg += " " + _("or BIP38 keys")

        def func(key):
            if bitcoin.is_bip38_available() and bitcoin.is_bip38_key(key):
                d = Bip38Importer(
                    [key],
                    parent=self.top_level_window(),
                    message=_(
                        "A BIP38 key was specified, please enter a password to"
                        " decrypt it"
                    ),
                    show_count=False,
                )
                d.exec_()
                d.setParent(None)  # python GC quicker if this happens
                if d.decoded_keys:
                    wif, adr = d.decoded_keys[key]
                    return self.wallet.import_private_key(wif, password)
                else:
                    raise util.UserCancelled()
            else:
                return self.wallet.import_private_key(key, password)

        self._do_import(title, msg, func)

    def update_fiat(self):
        b = self.fx and self.fx.is_enabled()
        self.fiat_send_e.setVisible(b)
        self.fiat_receive_e.setVisible(b)
        self.history_list.refresh_headers()
        self.history_list.update()
        self.history_updated_signal.emit()  # inform things like address_dialog that there's a new history
        self.address_list.refresh_headers()
        self.address_list.update()
        self.update_status()

    def settings_dialog(self):
        d = SettingsDialog(
            self.top_level_window(),
            self.config,
            self.wallet,
            self.fx,
            self.alias_info,
            self.base_unit(),
            self.gui_object,
        )
        d.num_zeros_changed.connect(self.update_tabs)
        d.num_zeros_changed.connect(self.update_status)
        d.custom_fee_changed.connect(self.send_tab.fee_slider.update)
        d.custom_fee_changed.connect(self.send_tab.fee_slider_mogrifier)
        d.show_fee_changed.connect(self.send_tab.fee_e.setVisible)
        d.alias_changed.connect(self.fetch_alias)
        d.unit_changed.connect(lambda _decimal_point: self.update_tabs())
        d.unit_changed.connect(lambda _decimal_point: self.update_status())
        d.enable_opreturn_changed.connect(self.on_toggled_opreturn)
        d.currency_changed.connect(self.update_fiat)
        d.show_fiat_balance_toggled.connect(self.address_list.refresh_headers)
        d.show_fiat_balance_toggled.connect(self.address_list.update)

        def on_show_history(checked):
            changed = bool(self.fx.get_history_config()) != bool(checked)
            self.history_list.refresh_headers()
            if self.fx.is_enabled() and checked:
                # reset timeout to get historical rates
                self.fx.timeout = 0
                if changed:
                    # this won't happen too often as it's rate-limited
                    self.history_list.update()

        d.show_history_rates_toggled.connect(on_show_history)

        def update_amounts(decimal_point: int):
            self.receive_amount_e.update_unit(decimal_point)
            self.send_tab.update_unit(decimal_point)

        d.unit_changed.connect(update_amounts)

        self.alias_received_signal.connect(lambda: d.set_alias_color(self.alias_info))

        try:
            # run the dialog
            d.exec_()
        finally:
            self.alias_received_signal.disconnect()
            d.dialog_finished = True  # paranoia for scan_cameras

        if self.fx:
            self.fx.timeout = 0

        run_hook("close_settings_dialog")
        if d.need_restart:
            self.show_message(
                _(f"Please restart {PROJECT_NAME} to activate the new GUI settings"),
                title=_("Success"),
            )
        elif d.need_wallet_reopen:
            self.show_message(
                _("Please close and reopen this wallet to activate the new settings"),
                title=_("Success"),
            )

    def closeEvent(self, event):
        # It seems in some rare cases this closeEvent() is called twice.
        # clean_up() guards against that situation.
        self.clean_up()
        super().closeEvent(event)
        event.accept()  # paranoia. be sure it's always accepted.

    def is_alive(self):
        return bool(not self.cleaned_up)

    def clean_up_connections(self):
        def disconnect_signals():
            del self.addr_fmt_changed  # delete alias so it doesn interfere with below
            for attr_name in dir(self):
                if attr_name.endswith("_signal"):
                    sig = getattr(self, attr_name)
                    if isinstance(sig, SignalInstance):
                        try:
                            sig.disconnect()
                        except TypeError:
                            pass  # no connections
                # NB: this needs to match the attribute name in util.py rate_limited decorator
                elif attr_name.endswith("__RateLimiter"):
                    rl_obj = getattr(self, attr_name)
                    if isinstance(rl_obj, RateLimiter):
                        rl_obj.kill_timer()
            # The below shouldn't even be needed, since Qt should take care of this,
            # but Axel Gembe got a crash related to this on Python 3.7.3, PyQt 5.12.3
            # so here we are. See #1531
            try:
                self.gui_object.addr_fmt_changed.disconnect(
                    self.status_bar.update_cashaddr_icon
                )
            except TypeError:
                pass
            try:
                self.gui_object.addr_fmt_changed.disconnect(
                    self.update_receive_address_widget
                )
            except TypeError:
                pass
            try:
                self.gui_object.cashaddr_status_button_hidden_signal.disconnect(
                    self.status_bar.addr_converter_button.setHidden
                )
            except TypeError:
                pass
            try:
                self.gui_object.update_available_signal.disconnect(
                    self.status_bar.on_update_available
                )
            except TypeError:
                pass
            try:
                self.disconnect()
            except TypeError:
                pass

        def disconnect_network_callbacks():
            if self.network:
                self.network.unregister_callback(self.on_network)
                self.network.unregister_callback(self.on_quotes)
                self.network.unregister_callback(self.on_history)

        # /
        disconnect_network_callbacks()
        disconnect_signals()

    def clean_up_children(self):
        # Status bar holds references to self, so clear it to help GC this window
        self.setStatusBar(None)
        # Note that due to quirks on macOS and the shared menu bar, we do *NOT*
        # clear the menuBar. Instead, doing this causes the object to get
        # deleted and/or its actions (and more importantly menu action hotkeys)
        # to go away immediately.
        self.setMenuBar(None)

        # Disable shortcuts immediately to prevent them from accidentally firing
        # on us after we are closed.  They will get deleted when this QObject
        # is finally deleted by Qt.
        for shortcut in self._shortcuts:
            shortcut.setEnabled(False)
            del shortcut
        self._shortcuts.clear()

        # Reparent children to 'None' so python GC can clean them up sooner rather than later.
        # This also hopefully helps accelerate this window's GC.
        children = [
            c
            for c in self.children()
            if (
                isinstance(c, (QtWidgets.QWidget, QtWidgets.QAction, TaskThread))
                and not isinstance(
                    c,
                    (
                        QtWidgets.QStatusBar,
                        QtWidgets.QMenuBar,
                        QtWidgets.QFocusFrame,
                        QtWidgets.QShortcut,
                    ),
                )
            )
        ]
        for c in children:
            try:
                c.disconnect()
            except TypeError:
                pass
            c.setParent(None)

    def clean_up(self):
        if self.cleaned_up:
            return
        self.cleaned_up = True
        # guard against window close before load_wallet was called (#1554)
        if self.wallet.thread:
            self.wallet.thread.stop()
            # Join the thread to make sure it's really dead.
            self.wallet.thread.wait()

        for w in [
            self.address_list,
            self.history_list,
            self.utxo_list,
            self.contact_list,
            self.tx_update_mgr,
        ]:
            if w:
                # tell relevant object to clean itself up, unregister callbacks,
                # disconnect signals, etc
                w.clean_up()

        with contextlib.suppress(TypeError):
            self.gui_object.addr_fmt_changed.disconnect(self.utxo_list.update)
            self.gui_object.addr_fmt_changed.disconnect(self.contact_list.update)

        # We catch these errors with the understanding that there is no recovery at
        # this point, given user has likely performed an action we cannot recover
        # cleanly from.  So we attempt to exit as cleanly as possible.
        try:
            self.config.set_key("is_maximized", self.isMaximized())
            self.config.set_key("console-history", self.console.history[-50:], True)
        except (OSError, PermissionError) as e:
            self.print_error("unable to write to config (directory removed?)", e)

        if not self.isMaximized():
            try:
                g = self.geometry()
                self.wallet.storage.put(
                    "winpos-qt", [g.left(), g.top(), g.width(), g.height()]
                )
            except (OSError, PermissionError) as e:
                self.print_error(
                    "unable to write to wallet storage (directory removed?)", e
                )

        # Should be no side-effects in this function relating to file access past this point.
        if self.qr_window:
            self.qr_window.close()
            self.qr_window = None  # force GC sooner rather than later.
        for d in list(self._tx_dialogs):
            # clean up all extant tx dialogs we opened as they hold references
            # to us that will be invalidated
            d.prompt_if_unsaved = False  # make sure to unconditionally close
            d.close()
        self._close_wallet()

        try:
            self.gui_object.timer.timeout.disconnect(self.timer_actions)
        except TypeError:
            pass  # defensive programming: this can happen if we got an exception before the timer action was connected

        self.gui_object.close_window(self)  # implicitly runs the hook: on_close_window
        # Now, actually STOP the wallet's synchronizer and verifiers and remove
        # it from the daemon. Note that its addresses will still stay
        # 'subscribed' to the ElectrumX server until we connect to a new server,
        # (due to ElectrumX protocol limitations).. but this is harmless.
        self.gui_object.daemon.stop_wallet(self.wallet.storage.path)

        # At this point all plugins should have removed any references to this window.
        # Now, just to be paranoid, do some active destruction of signal/slot connections as well as
        # Removing child widgets forcefully to speed up Python's own GC of this window.
        self.clean_up_connections()
        self.clean_up_children()

        # And finally, print when we are destroyed by C++ for debug purposes
        # We must call this here as above calls disconnected all signals
        # involving this widget.
        destroyed_print_error(self)

    def internal_plugins_dialog(self):
        if self.internalpluginsdialog:
            # NB: reentrance here is possible due to the way the window menus work on MacOS.. so guard against it
            self.internalpluginsdialog.raise_()
            return
        d = WindowModalDialog(
            parent=self.top_level_window(), title=_("Optional Features")
        )
        weakD = Weak.ref(d)

        gui_object = self.gui_object
        plugins = gui_object.plugins

        vbox = QtWidgets.QVBoxLayout(d)

        # plugins
        scroll = QtWidgets.QScrollArea()
        scroll.setEnabled(True)
        scroll.setWidgetResizable(True)
        scroll.setMinimumSize(400, 250)
        vbox.addWidget(scroll)

        w = QtWidgets.QWidget()
        scroll.setWidget(w)
        w.setMinimumHeight(plugins.get_internal_plugin_count() * 35)

        grid = QtWidgets.QGridLayout()
        grid.setColumnStretch(0, 1)
        weakGrid = Weak.ref(grid)
        w.setLayout(grid)

        settings_widgets = Weak.ValueDictionary()

        def enable_settings_widget(p, name, i):
            widget = settings_widgets.get(name)
            grid = weakGrid()
            d = weakD()
            if d and grid and not widget and p and p.requires_settings():
                widget = settings_widgets[name] = p.settings_widget(d)
                grid.addWidget(widget, i, 1)
            if widget:
                widget.setEnabled(bool(p and p.is_enabled()))
                if not p:
                    # Need to delete settings widget because keeping it around causes bugs as it points to a now-dead plugin instance
                    settings_widgets.pop(name)
                    widget.hide()
                    widget.setParent(None)
                    widget.deleteLater()
                    widget = None

        def do_toggle(weakCb, name, i):
            cb = weakCb()
            if cb:
                p = plugins.toggle_internal_plugin(name)
                cb.setChecked(bool(p))
                enable_settings_widget(p, name, i)
                # All plugins get this whenever one is toggled.
                run_hook("init_qt", gui_object)

        for i, descr in enumerate(plugins.internal_plugin_metadata.values()):
            # descr["__name__"] is the fully qualified package name
            # (electrumabc_plugins.name)
            name = descr["__name__"].split(".")[-1]
            p = plugins.get_internal_plugin(name)
            if descr.get("registers_keystore"):
                continue
            try:
                plugins.retranslate_internal_plugin_metadata(name)
                cb = QtWidgets.QCheckBox(descr["fullname"])
                weakCb = Weak.ref(cb)
                plugin_is_loaded = p is not None
                cb_enabled = (
                    not plugin_is_loaded
                    and plugins.is_internal_plugin_available(name, self.wallet)
                    or plugin_is_loaded
                    and p.can_user_disable()
                )
                cb.setEnabled(cb_enabled)
                cb.setChecked(plugin_is_loaded and p.is_enabled())
                grid.addWidget(cb, i, 0)
                enable_settings_widget(p, name, i)
                cb.clicked.connect(partial(do_toggle, weakCb, name, i))
                msg = descr["description"]
                if descr.get("requires"):
                    msg += (
                        "\n\n"
                        + _("Requires")
                        + ":\n"
                        + "\n".join(x[1] for x in descr.get("requires"))
                    )
                grid.addWidget(HelpButton(msg), i, 2)
            except Exception:
                self.print_msg("error: cannot display plugin", name)
                traceback.print_exc(file=sys.stderr)
        grid.setRowStretch(len(plugins.internal_plugin_metadata.values()), 1)
        vbox.addLayout(Buttons(CloseButton(d)))
        self.internalpluginsdialog = d
        d.exec_()
        self.internalpluginsdialog = None  # Python GC please!

    def external_plugins_dialog(self):
        if self.externalpluginsdialog:
            # NB: reentrance here is possible due to the way the window menus work on MacOS.. so guard against it
            self.externalpluginsdialog.raise_()
            return

        d = external_plugins_window.ExternalPluginsDialog(self, _("Plugin Manager"))
        self.externalpluginsdialog = d
        d.exec_()
        self.externalpluginsdialog = None  # allow python to GC

    def hardware_wallet_support(self):
        if not sys.platform.startswith("linux"):
            self.print_error("FIXME! hardware_wallet_support is Linux only!")
            return
        if self.hardwarewalletdialog:
            # NB: reentrance here is possible due to the way the window menus work on MacOS.. so guard against it
            self.hardwarewalletdialog.raise_()
            return

        d = InstallHardwareWalletSupportDialog(
            self.top_level_window(), self.gui_object.plugins
        )
        self.hardwarewalletdialog = d
        d.exec_()
        self.hardwarewalletdialog = None  # allow python to GC

    def cpfp(self, parent_tx, new_tx):
        total_size = parent_tx.estimated_size() + new_tx.estimated_size()
        d = WindowModalDialog(self.top_level_window(), _("Child Pays for Parent"))
        vbox = QtWidgets.QVBoxLayout(d)
        msg = (
            "A CPFP is a transaction that sends an unconfirmed output back to "
            "yourself, with a high fee. The goal is to have miners confirm "
            "the parent transaction in order to get the fee attached to the "
            "child transaction."
        )
        vbox.addWidget(WWLabel(_(msg)))
        msg2 = (
            "The proposed fee is computed using your "
            "fee/kB settings, applied to the total size of both child and "
            "parent transactions. After you broadcast a CPFP transaction, "
            "it is normal to see a new unconfirmed transaction in your history."
        )
        vbox.addWidget(WWLabel(_(msg2)))
        grid = QtWidgets.QGridLayout()
        grid.addWidget(QtWidgets.QLabel(_("Total size") + ":"), 0, 0)
        grid.addWidget(
            QtWidgets.QLabel(_("{total_size} bytes").format(total_size=total_size)),
            0,
            1,
        )
        max_fee = new_tx.output_value()
        grid.addWidget(QtWidgets.QLabel(_("Input amount") + ":"), 1, 0)
        grid.addWidget(
            QtWidgets.QLabel(
                format_amount(max_fee, self.config) + " " + self.base_unit()
            ),
            1,
            1,
        )
        output_amount = QtWidgets.QLabel("")
        grid.addWidget(QtWidgets.QLabel(_("Output amount") + ":"), 2, 0)
        grid.addWidget(output_amount, 2, 1)
        fee_e = XECAmountEdit(self.get_decimal_point())

        def f(x):
            a = max_fee - fee_e.get_amount()
            output_amount.setText(
                (format_amount(a, self.config) + " " + self.base_unit()) if a else ""
            )

        fee_e.textChanged.connect(f)
        fee = self.config.fee_per_kb() * total_size / 1000
        fee_e.setAmount(fee)
        grid.addWidget(QtWidgets.QLabel(_("Fee" + ":")), 3, 0)
        grid.addWidget(fee_e, 3, 1)

        def on_rate(fee_rate):
            fee = fee_rate * total_size / 1000
            fee = min(max_fee, fee)
            fee_e.setAmount(fee)

        fee_slider = FeeSlider(self.config, on_rate)
        fee_slider.update()
        grid.addWidget(fee_slider, 4, 1)
        vbox.addLayout(grid)
        vbox.addLayout(Buttons(CancelButton(d), OkButton(d)))
        result = d.exec_()
        d.setParent(None)  # So Python can GC
        if not result:
            return
        fee = fee_e.get_amount()
        if fee > max_fee:
            self.show_error(_("Max fee exceeded"))
            return
        new_tx = self.wallet.cpfp(
            parent_tx, fee, self.config.is_current_block_locktime_enabled()
        )
        if new_tx is None:
            self.show_error(_("CPFP no longer valid"))
            return
        self.show_transaction(new_tx)

    def rebuild_history(self):
        if self.gui_object.warn_if_no_network(self):
            # Don't allow if offline mode.
            return
        msg = " ".join(
            [
                _(
                    "This feature is intended to allow you to rebuild a wallet if it"
                    " has become corrupted."
                ),
                "\n\n"
                + _(
                    "Your entire transaction history will be downloaded again from the"
                    " server and verified from the blockchain."
                ),
                _("Just to be safe, back up your wallet file first!"),
                "\n\n" + _("Rebuild this wallet's history now?"),
            ]
        )
        if self.question(msg, title=_("Rebuild Wallet History")):
            try:
                self.wallet.rebuild_history()
            except RuntimeError as e:
                self.show_error(str(e))

    def scan_beyond_gap(self):
        if self.gui_object.warn_if_no_network(self):
            return
        d = ScanBeyondGap(self)
        d.exec_()
        d.setParent(None)  # help along Python by dropping refct to 0

    def _pick_address(self, *, title=None, icon=None) -> Address:
        """Returns None on user cancel, or a valid is_mine Address object
        from the Address list."""
        # Show user address picker
        d = WindowModalDialog(self.top_level_window(), title or _("Choose an address"))
        d.setObjectName("Window Modal Dialog - " + d.windowTitle())
        destroyed_print_error(d)  # track object lifecycle
        d.setMinimumWidth(self.width() - 150)
        vbox = QtWidgets.QVBoxLayout(d)
        if icon:
            hbox = QtWidgets.QHBoxLayout()
            hbox.setContentsMargins(0, 0, 0, 0)
            ic_lbl = QtWidgets.QLabel()
            ic_lbl.setPixmap(icon.pixmap(50))
            hbox.addWidget(ic_lbl)
            hbox.addItem(QtWidgets.QSpacerItem(10, 1))
            t_lbl = QtWidgets.QLabel(
                "<font size=+1><b>" + (title or "") + "</b></font>"
            )
            hbox.addWidget(t_lbl, 0, Qt.AlignmentFlag.AlignLeft)
            hbox.addStretch(1)
            vbox.addLayout(hbox)
        vbox.addWidget(QtWidgets.QLabel(_("Choose an address") + ":"))
        addrlist = AddressList(self, picker=True)
        try:
            addrlist.setObjectName("AddressList - " + d.windowTitle())
            destroyed_print_error(addrlist)  # track object lifecycle
            addrlist.update()
            vbox.addWidget(addrlist)

            ok = OkButton(d)
            ok.setDisabled(True)

            addr = None

            def on_item_changed(current, previous):
                nonlocal addr
                addr = current and current.data(0, addrlist.DataRoles.address)
                ok.setEnabled(addr is not None)

            def on_selection_changed():
                items = addrlist.selectedItems()
                if items:
                    on_item_changed(items[0], None)
                else:
                    on_item_changed(None, None)

            addrlist.currentItemChanged.connect(on_item_changed)

            cancel = CancelButton(d)

            vbox.addLayout(Buttons(cancel, ok))

            res = d.exec_()
            if res == QtWidgets.QDialog.Accepted:
                return addr
            return None
        finally:
            addrlist.clean_up()  # required to unregister network callback


class TxUpdateMgr(QObject, PrintError):
    """Manages new transaction notifications and transaction verified
    notifications from the network thread. It collates them and sends them to
    the appropriate GUI controls in the main_window in an efficient manner."""

    def __init__(self, main_window_parent: ElectrumWindow):
        assert isinstance(main_window_parent, ElectrumWindow), (
            "TxUpdateMgr must be constructed with an ElectrumWindow as its parent"
        )
        super().__init__(main_window_parent)
        self.cleaned_up = False
        self.lock = threading.Lock()  # used to lock thread-shared attrs below
        # begin thread-shared attributes
        self.notif_q = []
        self.verif_q = []
        self.need_process_v, self.need_process_n = False, False
        # /end thread-shared attributes
        self.weakParent = Weak.ref(main_window_parent)
        # immediately clear verif_q on history update because it would be redundant
        # to keep the verify queue around after a history list update
        main_window_parent.history_updated_signal.connect(
            self.verifs_get_and_clear, Qt.DirectConnection
        )
        # hook into main_window's timer_actions function
        main_window_parent.on_timer_signal.connect(self.do_check, Qt.DirectConnection)
        self.full_hist_refresh_timer = QTimer(self)
        self.full_hist_refresh_timer.setInterval(1000)
        self.full_hist_refresh_timer.setSingleShot(False)
        self.full_hist_refresh_timer.timeout.connect(
            self.schedule_full_hist_refresh_maybe
        )

    def diagnostic_name(self):
        return (
            ((self.weakParent() and self.weakParent().diagnostic_name()) or "???")
            + "."
            + __class__.__name__
        )

    def clean_up(self):
        self.cleaned_up = True
        main_window_parent = self.weakParent()  # weak -> strong ref
        if main_window_parent:
            try:
                main_window_parent.history_updated_signal.disconnect(
                    self.verifs_get_and_clear
                )
            except TypeError:
                pass
            try:
                main_window_parent.on_timer_signal.disconnect(self.do_check)
            except TypeError:
                pass

    def do_check(self):
        """Called from timer_actions in main_window to check if notifs or
        verifs need to update the GUI.
          - Checks the need_process_[v|n] flags
          - If either flag is set, call the @rate_limited process_verifs
            and/or process_notifs functions which update GUI parent in a
            rate-limited (collated) fashion (for decent GUI responsiveness)."""
        with self.lock:
            bV, bN = self.need_process_v, self.need_process_n
            self.need_process_v, self.need_process_n = False, False
        if bV:
            self.process_verifs()  # rate_limited call (1 per second)
        if bN:
            self.process_notifs()  # rate_limited call (1 per 15 seconds)

    def verifs_get_and_clear(self):
        """Clears the verif_q. This is called from the network
        thread for the 'verified2' event as well as from the below
        update_verifs (GUI thread), hence the lock."""
        with self.lock:
            ret = self.verif_q
            self.verif_q = []
            self.need_process_v = False
            return ret

    def notifs_get_and_clear(self):
        with self.lock:
            ret = self.notif_q
            self.notif_q = []
            self.need_process_n = False
            return ret

    def verif_add(self, args):
        # args: [wallet, tx_hash, height, conf, timestamp]
        # filter out tx's not for this wallet
        parent = self.weakParent()
        if not parent or parent.cleaned_up:
            return
        if args[0] is parent.wallet:
            with self.lock:
                self.verif_q.append(args[1:])
                self.need_process_v = True

    def notif_add(self, args):
        parent = self.weakParent()
        if not parent or parent.cleaned_up:
            return
        tx, wallet = args
        # filter out tx's not for this wallet
        if wallet is parent.wallet:
            with self.lock:
                self.notif_q.append(tx)
                self.need_process_n = True

    @rate_limited(1.0, ts_after=True)
    def process_verifs(self):
        """Update history list with tx's from verifs_q, but limit the
        GUI update rate to once per second."""
        parent = self.weakParent()
        if not parent or parent.cleaned_up:
            return
        items = self.verifs_get_and_clear()
        if items:
            t0 = time.time()
            parent.history_list.setUpdatesEnabled(False)
            had_sorting = parent.history_list.isSortingEnabled()
            if had_sorting:
                parent.history_list.setSortingEnabled(False)
            n_updates = 0
            for item in items:
                did_update = parent.history_list.update_item(*item)
                n_updates += 1 if did_update else 0
            self.print_error(
                "Updated {}/{} verified txs in GUI in {:0.2f} ms".format(
                    n_updates, len(items), (time.time() - t0) * 1e3
                )
            )
            if had_sorting:
                parent.history_list.setSortingEnabled(True)
            parent.history_list.setUpdatesEnabled(True)
            parent.update_status()
            if parent.history_list.has_unknown_balances:
                self.print_error(
                    "History tab: 'Unknown' balances detected, will schedule a GUI"
                    " refresh after wallet settles"
                )
                self._full_refresh_ctr = 0
                self.full_hist_refresh_timer.start()

    _full_refresh_ctr = 0

    def schedule_full_hist_refresh_maybe(self):
        """self.full_hist_refresh_timer timeout slot. May schedule a full
        history refresh after wallet settles if we have "Unknown" balances."""
        parent = self.weakParent()
        if self._full_refresh_ctr > 60:
            # Too many retries. Give up.
            self.print_error(
                "History tab: Full refresh scheduler timed out.. wallet hasn't settled"
                " in 1 minute. Giving up."
            )
            self.full_hist_refresh_timer.stop()
        elif parent and parent.history_list.has_unknown_balances:
            # Still have 'Unknown' balance. Check if wallet is settled.
            if self.need_process_v or not parent.wallet.is_fully_settled_down():
                # Wallet not fully settled down yet... schedule this function to run later
                self.print_error(
                    "History tab: Wallet not yet settled.. will try again in 1"
                    " second..."
                )
            else:
                # Wallet has settled. Schedule an update. Note this function may be called again
                # in 1 second to check if the 'Unknown' situation has corrected itself.
                self.print_error(
                    "History tab: Wallet has settled down, latching need_update to true"
                )
                parent.need_update.set()
            self._full_refresh_ctr += 1
        else:
            # No more polling is required. 'Unknown' balance disappeared from
            # GUI (or parent window was just closed).
            self.full_hist_refresh_timer.stop()
            self._full_refresh_ctr = 0

    @rate_limited(5.0, classlevel=True)
    def process_notifs(self):
        parent = self.weakParent()
        if not parent or parent.cleaned_up or not parent.network:
            return
        txns = self.notifs_get_and_clear()
        if not txns:
            return
        # Combine the transactions
        n_ok, total_amount = 0, 0
        for tx in txns:
            if tx:
                delta = parent.wallet.get_wallet_delta(tx)
                if not delta.is_relevant:
                    continue
                total_amount += delta.v
                n_ok += 1
        if not parent.wallet.storage.get("gui_notify_tx", True) or total_amount <= 0:
            return
        self.print_error(f"Notifying GUI {n_ok} tx")
        parent.notify(
            _("New transaction: {}").format(
                format_amount_and_units(
                    total_amount, parent.config, parent.fx, is_diff=True
                )
            )
        )
