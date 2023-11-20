#!/usr/bin/env python3
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

import copy
import datetime
import json
import time
from enum import Enum, auto

from PyQt5 import QtWidgets
from PyQt5.QtCore import Qt, QTimer, QUrl, pyqtSignal
from PyQt5.QtGui import QBrush, QCursor, QFont, QIcon, QKeySequence, QTextCharFormat

from electrumabc import web
from electrumabc.address import Address, PublicKey, ScriptOutput
from electrumabc.bitcoin import base_encode
from electrumabc.i18n import _, ngettext
from electrumabc.plugins import run_hook
from electrumabc.printerror import PrintError
from electrumabc.transaction import DUST_THRESHOLD, InputValueMissing, Transaction
from electrumabc.util import Weak, bfh

from .util import (
    MONOSPACE_FONT,
    Buttons,
    ButtonsLineEdit,
    CloseButton,
    ColorScheme,
    CopyButton,
    MessageBoxMixin,
    TextBrowserKeyboardFocusFilter,
    getSaveFileName,
    rate_limited,
    webopen,
)

dialogs = []  # Otherwise python randomly garbage collects the dialogs...

SCHNORR_SIGIL = "ⓢ"


def show_transaction(tx, parent, desc=None, prompt_if_unsaved=False):
    d = TxDialog(tx, parent, desc, prompt_if_unsaved)
    dialogs.append(d)
    d.show()
    return d


class TxDialog(QtWidgets.QDialog, MessageBoxMixin, PrintError):
    # connected to self.throttled_update -- emit from thread to do update in main thread
    throttled_update_sig = pyqtSignal()

    # connected to an inner function to get a callback in main thread upon dl completion
    dl_done_sig = pyqtSignal()

    BROADCAST_COOLDOWN_SECS: int = 5

    class FreezeOp(Enum):
        Freeze = auto()
        Unfreeze = auto()

    def __init__(self, tx: Transaction, parent, desc, prompt_if_unsaved):
        """Transactions in the wallet will show their description.
        Pass desc to give a description for txs not yet in the wallet.
        """
        # We want to be a top-level window
        QtWidgets.QDialog.__init__(self, parent=None)
        # Take a copy; it might get updated in the main window by
        # e.g. the FX plugin.  If this happens during or after a long
        # sign operation the signatures are lost.
        self.tx = copy.deepcopy(tx)
        self.tx.deserialize()
        self.main_window = parent
        self.wallet = parent.wallet
        self.prompt_if_unsaved = prompt_if_unsaved
        self.saved = False
        self.desc = desc
        self.cashaddr_signal_slots = []
        self._dl_pct = None
        self._closed = False
        self.tx_hash = (
            self.tx.txid_fast() if self.tx.raw and self.tx.is_complete() else None
        )
        self.tx_height = self.wallet.get_tx_height(self.tx_hash)[0] or None
        self.block_hash = None
        Weak.finalization_print_error(self)  # track object lifecycle

        self.setMinimumWidth(750)
        self.setWindowTitle(_("Transaction"))

        vbox = QtWidgets.QVBoxLayout()
        self.setLayout(vbox)

        self.tx_hash_e = ButtonsLineEdit()
        label = QtWidgets.QLabel(_("&Transaction ID:"))
        label.setBuddy(self.tx_hash_e)
        vbox.addWidget(label)
        self.tx_hash_e.addCopyButton()
        weakSelfRef = Weak.ref(self)

        def qr_show():
            return weakSelfRef() and weakSelfRef().main_window.show_qrcode(
                str(weakSelfRef().tx_hash_e.text()),
                _("Transaction ID"),
                parent=weakSelfRef(),
            )

        icon = (
            ":icons/qrcode_white.svg"
            if ColorScheme.dark_scheme
            else ":icons/qrcode.svg"
        )
        self.tx_hash_e.addButton(icon, qr_show, _("Show as QR code"))
        self.tx_hash_e.setReadOnly(True)
        vbox.addWidget(self.tx_hash_e)
        self.tx_desc = QtWidgets.QLabel()
        vbox.addWidget(self.tx_desc)
        self.status_label = QtWidgets.QLabel()
        vbox.addWidget(self.status_label)
        self.date_label = QtWidgets.QLabel()
        vbox.addWidget(self.date_label)
        self.amount_label = QtWidgets.QLabel()
        vbox.addWidget(self.amount_label)
        self.size_label = QtWidgets.QLabel()
        vbox.addWidget(self.size_label)
        self.fee_label = QtWidgets.QLabel()
        vbox.addWidget(self.fee_label)

        for label in (
            self.tx_desc,
            self.status_label,
            self.date_label,
            self.amount_label,
            self.size_label,
            self.fee_label,
        ):
            # make these labels selectable by mouse in case user wants to copy-paste things in tx dialog
            label.setTextInteractionFlags(
                label.textInteractionFlags() | Qt.TextSelectableByMouse
            )

        def open_be_url(link):
            if link:
                try:
                    _, txid = link.split(":")
                    url = web.BE_URL(
                        self.main_window.config, web.ExplorerUrlParts.TX, txid
                    )
                except Exception:
                    raise
                    url = None
                if url:
                    webopen(url)
                else:
                    self.show_error(
                        _(
                            "Unable to open in block explorer. Please be sure your"
                            " block explorer is configured correctly in preferences."
                        )
                    )

        self.status_label.linkActivated.connect(open_be_url)

        self.add_io(vbox)

        self.freeze_button = b = QtWidgets.QPushButton(self._make_freeze_button_text())
        b.setToolTip(
            _(
                "Lock/unlock the coin(s) being spent in this transaction.\n\n"
                "Use this facility if you wish to broadcast this transaction later,\n"
                "in order to prevent its inputs from being accidentally spent."
            )
        )
        b.clicked.connect(self.do_freeze_unfreeze)

        self.sign_button = b = QtWidgets.QPushButton(_("&Sign"))
        b.clicked.connect(self.sign)
        b.setToolTip(_("Sign the transaction"))

        self.broadcast_button = b = QtWidgets.QPushButton(_("&Broadcast"))
        b.clicked.connect(self.do_broadcast)
        b.setToolTip(_("Submit the transaction to the blockchain"))
        self.last_broadcast_time = 0

        self.save_button = b = QtWidgets.QPushButton(_("S&ave"))
        b.setToolTip(_("Save the transaction to a file"))
        b.clicked.connect(self.save)

        self.cancel_button = b = CloseButton(self)

        self.qr_button = b = QtWidgets.QPushButton()
        b.setToolTip(_("Show transaction QR code"))
        b.setIcon(QIcon(icon))
        b.clicked.connect(self.show_qr)
        b.setShortcut(QKeySequence(Qt.ALT + Qt.Key_Q))

        self.copy_button = b = CopyButton(
            lambda: str(weakSelfRef() and weakSelfRef().tx),
            callback=lambda: weakSelfRef()
            and weakSelfRef().show_message(
                _("Transaction raw hex copied to clipboard.")
            ),
        )
        b.setToolTip(_("Copy transaction raw hex to the clipboard"))

        # Action buttons
        self.buttons = [
            self.freeze_button,
            self.sign_button,
            self.broadcast_button,
            self.cancel_button,
        ]
        # Transaction sharing buttons
        self.sharing_buttons = [self.copy_button, self.qr_button, self.save_button]

        run_hook("transaction_dialog", self)

        hbox = QtWidgets.QHBoxLayout()
        hbox.addLayout(Buttons(*self.sharing_buttons))
        hbox.addStretch(1)
        hbox.addLayout(Buttons(*self.buttons))
        vbox.addLayout(hbox)

        if self.tx_height:
            # this avoids downloading the block_height info if we already have it.
            self.tx.ephemeral["block_height"] = self.tx_height

        self.throttled_update_sig.connect(self.throttled_update, Qt.QueuedConnection)
        self.initiate_fetch_input_data(True)

        self.update()

        # connect slots so we update in realtime as blocks come in, etc
        parent.history_updated_signal.connect(self.update_tx_if_in_wallet)
        parent.labels_updated_signal.connect(self.update_tx_if_in_wallet)
        parent.network_signal.connect(self.got_verified_tx)

    @classmethod
    def _make_freeze_button_text(
        cls, op: FreezeOp = FreezeOp.Freeze, num_coins: int = 0
    ) -> str:
        if op == cls.FreezeOp.Freeze:
            return ngettext("&Freeze Coin", "&Freeze Coins", num_coins)
        elif op == cls.FreezeOp.Unfreeze:
            return ngettext("&Unfreeze Coin", "&Unfreeze Coins", num_coins)
        raise ValueError(f"Invalid op: {op!r}")

    def initiate_fetch_input_data(self, force):
        weakSelfRef = Weak.ref(self)

        def dl_prog(pct):
            slf = weakSelfRef()
            if slf:
                slf._dl_pct = pct
                slf.throttled_update_sig.emit()

        def dl_done():
            slf = weakSelfRef()
            if slf:
                slf._dl_pct = None
                slf.throttled_update_sig.emit()
                slf.dl_done_sig.emit()

        dl_retries = 0

        def dl_done_mainthread():
            nonlocal dl_retries
            slf = weakSelfRef()
            if slf:
                if slf._closed:
                    return
                dl_retries += 1
                fee = slf.try_calculate_fee()
                if fee is None and dl_retries < 2:
                    if not self.is_fetch_input_data():
                        slf.print_error(
                            "input fetch incomplete; network use is disabled in GUI"
                        )
                        return
                    # retry at most once -- in case a slow server scrwed us up
                    slf.print_error(
                        "input fetch appears incomplete; retrying download once ..."
                    )
                    slf.tx.fetch_input_data(
                        self.wallet,
                        done_callback=dl_done,
                        prog_callback=dl_prog,
                        force=True,
                        use_network=self.is_fetch_input_data(),
                    )  # in this case we reallly do force
                elif fee is not None:
                    slf.print_error("input fetch success")
                else:
                    slf.print_error("input fetch failed")

        try:
            self.dl_done_sig.disconnect()  # disconnect previous
        except TypeError:
            pass
        self.dl_done_sig.connect(dl_done_mainthread, Qt.QueuedConnection)
        self.tx.fetch_input_data(
            self.wallet,
            done_callback=dl_done,
            prog_callback=dl_prog,
            force=force,
            use_network=self.is_fetch_input_data(),
        )

    def got_verified_tx(self, event, args):
        if event == "verified2" and args[1] == self.tx_hash:
            self.update()

    def update_tx_if_in_wallet(self):
        if self.tx.txid() in self.wallet.transactions:
            self.update()

    def do_broadcast(self):
        def broadcast_done(success):
            if not success:
                return
            # 5 second cooldown period on broadcast_button after successful
            # broadcast
            self.last_broadcast_time = time.time()
            # disables the broadcast button if last_broadcast_time is
            # < BROADCAST_COOLDOWN_SECS seconds ago
            self.update()
            # broadcast button will re-enable if we got nothing from server and
            # >= BROADCAST_COOLDOWN_SECS elapsed
            QTimer.singleShot(self.BROADCAST_COOLDOWN_SECS * 1000 + 100, self.update)

        self.main_window.push_top_level_window(self)
        try:
            self.main_window.broadcast_transaction(
                self.tx, self.desc, callback=broadcast_done
            )
        finally:
            self.main_window.pop_top_level_window(self)
        self.saved = True
        self.update()

    def do_freeze_unfreeze(self):
        coins = getattr(self.freeze_button, "_coins", [])
        op = getattr(self.freeze_button, "_op", None)
        if not coins or op is None:
            return
        freeze = op == self.FreezeOp.Freeze
        # Freeze / Unfreeze
        self.wallet.set_frozen_coin_state(coins, freeze)
        delattr(self.freeze_button, "_coins")
        delattr(self.freeze_button, "_op")
        self.update()
        self.main_window.update_tabs()
        if freeze:
            # Freeze op success message
            self.show_message(
                ngettext(
                    "{count} coin has been frozen.",
                    "{count} coins have been frozen.",
                    len(coins),
                ).format(count=len(coins))
                + "\n"
                + _("Check the Coins tab to unfreeze.")
            )
        else:
            # Unfreeze op success message
            self.show_message(
                ngettext(
                    "{count} coin has been unfrozen.",
                    "{count} coins have been unfrozen.",
                    len(coins),
                ).format(count=len(coins))
            )

    def closeEvent(self, event):
        if (
            self.prompt_if_unsaved
            and not self.saved
            and not self.question(
                _("This transaction is not saved. Close anyway?"), title=_("Warning")
            )
        ):
            event.ignore()
        else:
            super().closeEvent(event)
            event.accept()
            if self._closed:
                return
            self._closed = True
            self.tx.fetch_cancel()
            parent = self.main_window
            if parent:
                # clean up connections so window gets gc'd
                try:
                    parent.history_updated_signal.disconnect(
                        self.update_tx_if_in_wallet
                    )
                except TypeError:
                    pass
                try:
                    parent.network_signal.disconnect(self.got_verified_tx)
                except TypeError:
                    pass
                try:
                    parent.labels_updated_signal.disconnect(self.update_tx_if_in_wallet)
                except TypeError:
                    pass
                for slot in self.cashaddr_signal_slots:
                    try:
                        parent.gui_object.addr_fmt_changed.disconnect(slot)
                    except TypeError:
                        pass
                self.cashaddr_signal_slots = []

            cls = self.__class__
            # keep this object alive in PyQt until at least after this
            # event handler completes. This is because on some platforms
            # Python deletes the C++ object right away inside this event
            # handler (QObject with no parent) -- which crashes Qt!
            cls._pyqt_bug_gc_workaround = self

            def clr_workaround():
                cls._pyqt_bug_gc_workaround = None

            QTimer.singleShot(0, clr_workaround)

            try:
                dialogs.remove(self)
            except ValueError:  # wasn't in list
                pass
            while True:
                try:
                    # Esoteric bug happens when user rejects password dialog on top of this window.. so we must keep popping self off the top_level_windows
                    self.main_window.pop_top_level_window(self, raise_if_missing=True)
                except ValueError:
                    break
            # The below is used to clean up any modal dialogs this txdialog may have up
            tlw = self.top_level_window()
            while tlw is not self:
                tlw.reject()
                tlw = self.top_level_window()

    def reject(self):
        # Override escape-key to close normally (and invoke closeEvent)
        self.close()

    def show_qr(self):
        text = bfh(str(self.tx))
        text = base_encode(text, base=43)
        try:
            self.main_window.show_qrcode(text, _("Transaction"), parent=self)
        except Exception as e:
            self.show_message(str(e))

    def sign(self):
        def cleanup():
            self.main_window.pop_top_level_window(self)

        def sign_done(success):
            if success:
                self.sign_button.setDisabled(True)
                self.prompt_if_unsaved = True
                self.saved = False
            self.update()
            cleanup()

        self.main_window.push_top_level_window(self)
        self.main_window.sign_tx(self.tx, sign_done, on_pw_cancel=cleanup)

    def save(self):
        name = (
            "signed_%s.txn" % (self.tx.txid()[0:8])
            if self.tx.is_complete()
            else "unsigned.txn"
        )
        fileName = getSaveFileName(
            _("Select where to save your signed transaction"),
            name,
            self.main_window.config,
            "*.txn",
        )
        if fileName:
            tx_dict = self.tx.as_dict()
            with open(fileName, "w+", encoding="utf-8") as f:
                f.write(json.dumps(tx_dict, indent=4) + "\n")
            self.show_message(_("Transaction saved successfully"))
            self.saved = True

    @rate_limited(0.5, ts_after=True)
    def throttled_update(self):
        if not self._closed:
            self.update()

    def try_calculate_fee(self):
        """Try and compute fee by summing all the input values and subtracting
        the output values. We don't always have 'value' in all the inputs,
        so in that case None will be returned."""
        fee = None
        try:
            fee = self.tx.get_fee()
        except InputValueMissing:
            """'value' key missing or bad from an input"""
        return fee

    def update(self):
        if self._closed:
            # latent timer fire
            return
        desc = self.desc
        base_unit = self.main_window.base_unit()
        format_amount = self.main_window.format_amount
        delta2, info2 = self.wallet.get_tx_extended_info(self.tx)
        spends_coins_mine = delta2.spends_coins_mine
        (
            tx_hash,
            status,
            label,
            can_broadcast,
            amount,
            fee,
            height,
            conf,
            timestamp,
            exp_n,
            status_enum,
        ) = info2
        self.tx_height = height or self.tx.ephemeral.get("block_height") or None
        self.tx_hash = tx_hash
        desc = label or desc
        size = self.tx.estimated_size()

        # Update freeze/unfreeze button depending on tx state
        StatusEnum = self.wallet.StatusEnum
        if spends_coins_mine:
            has_frozen = bool(self.wallet.is_frozen_coin(set(spends_coins_mine)))
            self.freeze_button._coins = spends_coins_mine
            self.freeze_button._op = op = (
                self.FreezeOp.Freeze if not has_frozen else self.FreezeOp.Unfreeze
            )
            # Set the proper text (plural / singular form)
            self.freeze_button.setText(
                self._make_freeze_button_text(op, len(spends_coins_mine))
            )
            # Freeze/Unfreeze enabled only for signed transactions or transactions with frozen coins
            self.freeze_button.setEnabled(
                has_frozen
                or status_enum in (StatusEnum.Signed, StatusEnum.PartiallySigned)
            )
        else:
            self.freeze_button.setEnabled(False)
            self.freeze_button.setText(self._make_freeze_button_text())

        # We enable the broadcast button IFF both of the following hold:
        # 1. can_broadcast is true (tx has not been seen yet on the network
        #    and is_complete).
        # 2. The last time user hit "Broadcast" (and it was successful) was
        #    more than BROADCAST_COOLDOWN_SECS ago. This second condition
        #    implements a broadcast cooldown timer which immediately disables
        #    the "Broadcast" button for a time after a successful broadcast.
        #    This prevents the user from being able to spam the broadcast
        #    button. See #1483.
        self.broadcast_button.setEnabled(
            can_broadcast
            and time.time() - self.last_broadcast_time >= self.BROADCAST_COOLDOWN_SECS
        )

        can_sign = not self.tx.is_complete() and (
            self.wallet.can_sign(self.tx) or bool(self.main_window.tx_external_keypairs)
        )
        self.sign_button.setEnabled(can_sign)
        self.tx_hash_e.setText(tx_hash or _("Unknown"))
        if fee is None:
            fee = self.try_calculate_fee()
        if fee is None:
            # see if we can grab the fee from the wallet internal cache which
            # sometimes has fees for tx's not entirely 'is_mine'
            if self.wallet and self.tx_hash:
                fee = self.wallet.tx_fees.get(self.tx_hash)
        if desc is None:
            self.tx_desc.hide()
        else:
            self.tx_desc.setText(_("Description") + ": " + desc)
            self.tx_desc.show()

        if self.tx_height is not None and self.tx_height > 0 and tx_hash:
            status_extra = (
                "&nbsp;&nbsp;( "
                + _("Mined in block")
                + f': <a href="tx:{tx_hash}">{self.tx_height}</a>'
                + " )"
            )
        else:
            status_extra = ""

        self.status_label.setText(_("Status:") + " " + status + status_extra)

        if timestamp:
            time_str = datetime.datetime.fromtimestamp(timestamp).isoformat(" ")[:-3]
            self.date_label.setText(_("Date: {}").format(time_str))
            self.date_label.show()
        elif exp_n:
            text = "%d blocks" % (exp_n) if exp_n > 0 else _("unknown (low fee)")
            self.date_label.setText(_("Expected confirmation time") + ": " + text)
            self.date_label.show()
        else:
            self.date_label.hide()
        if amount is None:
            amount_str = _("Transaction unrelated to your wallet")
        elif amount > 0:
            amount_str = (
                _("Amount received:") + " %s" % format_amount(amount) + " " + base_unit
            )
        else:
            amount_str = (
                _("Amount sent:") + " %s" % format_amount(-amount) + " " + base_unit
            )
        size_str = _("Size: {size} bytes").format(size=size)
        fee_str = _("Fee") + ": "
        if fee is not None:
            fee_str = _("Fee: {fee_amount} {fee_unit} ( {fee_rate} )")
            fee_str = fee_str.format(
                fee_amount=format_amount(fee),
                fee_unit=base_unit,
                fee_rate=self.main_window.format_fee_rate(fee / size * 1000),
            )
            dusty_fee = sum(
                o.value for o in self.tx.outputs() if o.value < DUST_THRESHOLD
            )
            if dusty_fee:
                fee_str += (
                    " <font color=#999999>"
                    + (_("( %s in dust was added to fee )") % format_amount(dusty_fee))
                    + "</font>"
                )
        elif self._dl_pct is not None:
            fee_str = _("Downloading input data, please wait...") + " {:.0f}%".format(
                self._dl_pct
            )
        else:
            fee_str += _("unknown")
        self.amount_label.setText(amount_str)
        self.fee_label.setText(fee_str)
        self.size_label.setText(size_str)
        self.update_io()
        run_hook("transaction_dialog_update", self)

    def is_fetch_input_data(self):
        return self.main_window.is_fetch_input_data()

    def set_fetch_input_data(self, b):
        self.main_window.set_fetch_input_data(b)
        if self.is_fetch_input_data():
            self.initiate_fetch_input_data(bool(self.try_calculate_fee() is None))
        else:
            self.tx.fetch_cancel()
            self._dl_pct = None  # makes the "download progress" thing clear
            self.update()

    def add_io(self, vbox):
        if self.tx.locktime > 0:
            lbl = QtWidgets.QLabel(
                _("LockTime: {lock_time}").format(lock_time=self.tx.locktime)
            )
            lbl.setTextInteractionFlags(
                lbl.textInteractionFlags() | Qt.TextSelectableByMouse
            )
            vbox.addWidget(lbl)

        hbox = QtWidgets.QHBoxLayout()
        hbox.setContentsMargins(0, 12, 0, 0)

        self.i_text = i_text = TextBrowserKeyboardFocusFilter()
        num_inputs = len(self.tx.txinputs())
        inputs_lbl_text = ngettext(
            "&Input", "&Inputs ({num_inputs})", num_inputs
        ).format(num_inputs=num_inputs)
        label = QtWidgets.QLabel(inputs_lbl_text)
        label.setBuddy(i_text)
        hbox.addWidget(label)

        hbox.addSpacerItem(QtWidgets.QSpacerItem(20, 0))  # 20 px padding
        self.dl_input_chk = chk = QtWidgets.QCheckBox(_("&Download input data"))
        chk.setChecked(self.is_fetch_input_data())
        chk.clicked.connect(self.set_fetch_input_data)
        chk.setToolTip(
            _(
                "If this is checked, accurate fee and input value data will be"
                " retrieved from the network"
            )
        )
        hbox.addWidget(chk)
        hbox.addStretch(1)
        if not self.wallet.network:
            # it makes no sense to enable this checkbox if the network is offline
            chk.setHidden(True)

        self.schnorr_label = QtWidgets.QLabel(
            _("{} = Schnorr signed").format(SCHNORR_SIGIL)
        )
        self.schnorr_label.setAlignment(Qt.AlignVCenter | Qt.AlignRight)
        f = self.schnorr_label.font()
        f.setPointSize(f.pointSize() - 1)  # make it a little smaller
        self.schnorr_label.setFont(f)
        hbox.addWidget(self.schnorr_label)
        self.schnorr_label.setHidden(True)

        vbox.addLayout(hbox)

        i_text.setOpenLinks(False)  # disable automatic link opening
        i_text.anchorClicked.connect(
            self._open_internal_link
        )  # send links to our handler
        self.i_text_has_selection = False

        def set_i_text_has_selection(b):
            self.i_text_has_selection = bool(b)

        i_text.copyAvailable.connect(set_i_text_has_selection)
        i_text.setContextMenuPolicy(Qt.CustomContextMenu)
        i_text.customContextMenuRequested.connect(self.on_context_menu_for_inputs)
        i_text.setFont(QFont(MONOSPACE_FONT))
        i_text.setReadOnly(True)
        i_text.setTextInteractionFlags(
            i_text.textInteractionFlags()
            | Qt.LinksAccessibleByMouse
            | Qt.LinksAccessibleByKeyboard
        )
        i_text.setMinimumWidth(780)
        vbox.addWidget(i_text)

        hbox = QtWidgets.QHBoxLayout()
        hbox.setContentsMargins(0, 0, 0, 0)
        vbox.addLayout(hbox)

        self.o_text = o_text = TextBrowserKeyboardFocusFilter()
        num_outputs = len(self.tx.outputs())
        outputs_lbl_text = ngettext(
            "&Output", "&Outputs ({num_outputs})", num_outputs
        ).format(num_outputs=num_outputs)
        label = QtWidgets.QLabel(outputs_lbl_text)
        label.setBuddy(o_text)
        hbox.addWidget(label)

        box_char = "█"
        self.recv_legend = QtWidgets.QLabel(
            "<font color="
            + ColorScheme.GREEN.as_color(background=True).name()
            + ">"
            + box_char
            + "</font> = "
            + _("Receiving Address")
        )
        self.change_legend = QtWidgets.QLabel(
            "<font color="
            + ColorScheme.YELLOW.as_color(background=True).name()
            + ">"
            + box_char
            + "</font> = "
            + _("Change Address")
        )
        f = self.recv_legend.font()
        f.setPointSize(f.pointSize() - 1)
        self.recv_legend.setFont(f)
        self.change_legend.setFont(f)
        hbox.addStretch(2)
        hbox.addWidget(self.recv_legend)
        hbox.addWidget(self.change_legend)
        self.recv_legend.setHidden(True)
        self.change_legend.setHidden(True)

        o_text.setOpenLinks(False)  # disable automatic link opening
        o_text.anchorClicked.connect(
            self._open_internal_link
        )  # send links to our handler
        self.o_text_has_selection = False

        def set_o_text_has_selection(b):
            self.o_text_has_selection = bool(b)

        o_text.copyAvailable.connect(set_o_text_has_selection)
        o_text.setContextMenuPolicy(Qt.CustomContextMenu)
        o_text.customContextMenuRequested.connect(self.on_context_menu_for_outputs)
        o_text.setFont(QFont(MONOSPACE_FONT))
        o_text.setReadOnly(True)
        o_text.setTextInteractionFlags(
            o_text.textInteractionFlags()
            | Qt.LinksAccessibleByMouse
            | Qt.LinksAccessibleByKeyboard
        )
        vbox.addWidget(o_text)
        self.cashaddr_signal_slots.append(self.update_io)
        self.main_window.gui_object.addr_fmt_changed.connect(self.update_io)
        self.update_io()

    def update_io(self):
        i_text = self.i_text
        o_text = self.o_text
        ext = QTextCharFormat()
        ext.setToolTip(_("Right-click for context menu"))
        lnk = QTextCharFormat()
        lnk.setToolTip(_("Click to open, right-click for menu"))
        lnk.setAnchor(True)
        lnk.setUnderlineStyle(QTextCharFormat.SingleUnderline)
        rec = QTextCharFormat(lnk)
        rec.setBackground(QBrush(ColorScheme.GREEN.as_color(background=True)))
        chg = QTextCharFormat(lnk)
        chg.setBackground(QBrush(ColorScheme.YELLOW.as_color(True)))
        rec_ct, chg_ct = 0, 0

        def text_format(addr):
            nonlocal rec_ct, chg_ct
            if isinstance(addr, Address) and self.wallet.is_mine(addr):
                if self.wallet.is_change(addr):
                    chg_ct += 1
                    chg2 = QTextCharFormat(chg)
                    chg2.setAnchorHref(addr.to_ui_string())
                    return chg2
                else:
                    rec_ct += 1
                    rec2 = QTextCharFormat(rec)
                    rec2.setAnchorHref(addr.to_ui_string())
                    return rec2
            return ext

        def format_amount(amt):
            return self.main_window.format_amount(amt, whitespaces=True)

        i_text.clear()
        cursor = i_text.textCursor()
        has_schnorr = False
        for i, x in enumerate(self.tx.fetched_inputs() or self.tx.inputs()):
            a_name = f"input {i}"
            for fmt in (ext, rec, chg, lnk):
                fmt.setAnchorNames(
                    [a_name]
                )  # anchor name for this line (remember input#); used by context menu creation
            if x["type"] == "coinbase":
                cursor.insertText("coinbase", ext)
                if isinstance(x.get("value"), int):
                    cursor.insertText(format_amount(x["value"]), ext)
            else:
                prevout_hash = x.get("prevout_hash")
                prevout_n = x.get("prevout_n")
                hashn = f"{ prevout_hash[0:6] }...{ prevout_hash[-6:] }:{ prevout_n }"
                # linkify prevout_hash:n, send link to our handler
                lnk2 = QTextCharFormat(lnk)
                lnk2.setAnchorHref(prevout_hash)
                cursor.insertText(hashn, lnk2)
                cursor.insertText(
                    (1 + max(4 - len(str(prevout_n)), 0)) * " ", ext
                )  # put spaces/padding
                addr = x.get("address")
                if addr is None:
                    addr_text = _("unknown")
                else:
                    addr_text = addr.to_ui_string()
                cursor.insertText(addr_text, text_format(addr))
                if x.get("value"):
                    cursor.insertText(format_amount(x["value"]), ext)
                if self.tx.is_schnorr_signed(i):
                    # Schnorr
                    cursor.insertText(" {}".format(SCHNORR_SIGIL), ext)
                    has_schnorr = True
            cursor.insertBlock()

        self.schnorr_label.setVisible(has_schnorr)

        o_text.clear()
        cursor = o_text.textCursor()
        opret_ct = 0
        for i, tup in enumerate(self.tx.outputs()):
            my_addr_in_script = None
            typ, addr, v = tup
            for fmt in (ext, rec, chg, lnk):
                fmt.setAnchorNames(
                    [f"output {i}"]
                )  # anchor name for this line (remember input#); used by context menu creation
            # CashAccounts support
            if isinstance(addr, ScriptOutput) and addr.is_opreturn():
                opret_ct += 1
            # Format Cash Accounts address *in* script to be highlighted with
            # our preferred yellow/green for change/receiving and also
            # linkify it.
            addrstr = addr.to_ui_string()
            my_addr_in_script_str = (
                my_addr_in_script and my_addr_in_script.to_ui_string()
            )
            idx = my_addr_in_script_str and addrstr.find(my_addr_in_script_str)
            if idx is not None and idx > -1:
                cursor.insertText(addrstr[:idx], text_format(addr))
                len2 = idx + len(my_addr_in_script_str)
                cursor.insertText(addrstr[idx:len2], text_format(my_addr_in_script))
                cursor.insertText(addrstr[len2:], text_format(addr))
            else:
                # Regular format. Was not a Cash Accounts script, just
                # any old Address/ScriptOutput/PublicKey output.
                cursor.insertText(addrstr, text_format(addr))
            # /CashAccounts support
            # Mark B. Lundeberg's patented output formatter logic™
            if v is not None:
                if len(addrstr) > 48:  # for long outputs, make a linebreak.
                    cursor.insertBlock()
                    addrstr = "\u21b3"
                    cursor.insertText(addrstr, ext)
                # insert enough spaces until column 43, to line up amounts
                cursor.insertText(" " * (49 - len(addrstr)), ext)
                cursor.insertText(format_amount(v), ext)
            cursor.insertBlock()
            # /Mark B. Lundeberg's patented output formatting logic™

        # make the change & receive legends appear only if we used that color
        self.recv_legend.setVisible(bool(rec_ct))
        self.change_legend.setVisible(bool(chg_ct))

    @staticmethod
    def _copy_to_clipboard(text, widget):
        if not text and isinstance(widget, QtWidgets.QTextEdit):
            widget.copy()
        else:
            QtWidgets.qApp.clipboard().setText(text)
        QtWidgets.QToolTip.showText(
            QCursor.pos(), _("Text copied to clipboard"), widget
        )

    def _open_internal_link(self, target):
        """accepts either a str txid, str address, or a QUrl which should be
        of the bare form "txid" and/or "address" -- used by the clickable
        links in the inputs/outputs QTextBrowsers"""
        if isinstance(target, QUrl):
            target = target.toString(QUrl.None_)
        assert target
        if Address.is_valid(target):
            # target was an address, open address dialog
            self.main_window.show_address(Address.from_string(target), parent=self)
        else:
            # target was a txid, open new tx dialog
            self.main_window.do_process_from_txid(txid=target, parent=self)

    def on_context_menu_for_inputs(self, pos):
        i_text = self.i_text
        menu = QtWidgets.QMenu()
        global_pos = i_text.viewport().mapToGlobal(pos)

        charFormat, cursor = QTextCharFormat(), i_text.cursorForPosition(pos)
        charFormat = cursor and cursor.charFormat()
        name = charFormat.anchorNames() and charFormat.anchorNames()[0]

        show_list = []
        copy_list = []
        was_cb = False
        try:
            # figure out which input they right-clicked on .. input lines have an anchor named "input N"
            i = int(name.split()[1])  # split "input N", translate N -> int
            inp = (self.tx.fetched_inputs() or self.tx.inputs())[i]
            value = inp.get("value")
            # value_text = (value is not None and (self.main_window.format_amount(value) + " " + self.main_window.base_unit()))
            # menu.addAction(_("Input") + " #" + str(i) + (' - ' + value_text if value else '')).setDisabled(True)
            menu.addAction(_("Input") + " #" + str(i)).setDisabled(True)
            menu.addSeparator()
            if inp.get("type") == "coinbase":
                menu.addAction(_("Coinbase Input")).setDisabled(True)
                was_cb = True
            else:
                # not coindbase, add options
                u_tup = inp.get("prevout_hash"), inp.get("prevout_n")
                if all(x is not None for x in u_tup):
                    # Copy UTXO
                    utxo = f"{u_tup[0]}:{u_tup[1]}"
                    show_list += [
                        (_("Show Prev Tx"), lambda: self._open_internal_link(u_tup[0]))
                    ]
                    copy_list += [
                        (
                            _("Copy Prevout"),
                            lambda: self._copy_to_clipboard(utxo, i_text),
                        )
                    ]
                addr = inp.get("address")
                self._add_addr_to_io_menu_lists_for_widget(
                    addr, show_list, copy_list, i_text
                )
                if isinstance(value, int):
                    value_fmtd = self.main_window.format_amount(value)
                    copy_list += [
                        (
                            _("Copy Amount"),
                            lambda: self._copy_to_clipboard(value_fmtd, i_text),
                        )
                    ]
        except (TypeError, ValueError, IndexError, KeyError, AttributeError) as e:
            self.print_error("Inputs right-click menu exception:", repr(e))

        for item in show_list:
            menu.addAction(*item)
        if show_list and copy_list:
            menu.addSeparator()
        for item in copy_list:
            menu.addAction(*item)

        if show_list or copy_list or was_cb:
            menu.addSeparator()
        if self.i_text_has_selection:
            # Add this if they have a selection
            menu.addAction(
                _("Copy Selected Text"), lambda: self._copy_to_clipboard(None, i_text)
            )
        menu.addAction(_("Select All"), i_text.selectAll)
        menu.exec_(global_pos)

    def _add_addr_to_io_menu_lists_for_widget(self, addr, show_list, copy_list, widget):
        if hasattr(addr, "to_ui_string"):
            addr_text = addr.to_ui_string()
            if isinstance(addr, Address) and self.wallet.is_mine(addr):
                show_list += [
                    (_("Address Details"), lambda: self._open_internal_link(addr_text))
                ]
                addr_URL = web.BE_URL(
                    self.main_window.config, web.ExplorerUrlParts.ADDR, addr
                )
                if addr_URL:
                    show_list += [
                        (_("View on block explorer"), lambda: webopen(addr_URL))
                    ]
            if isinstance(addr, ScriptOutput):
                action_text = _("Copy Script Text")
            elif isinstance(addr, PublicKey):
                action_text = _("Copy Public Key")
            else:
                action_text = _("Copy Address")
            copy_list += [
                (action_text, lambda: self._copy_to_clipboard(addr_text, widget))
            ]
            # also add script hex copy to clipboard
            if isinstance(addr, ScriptOutput):
                hex_text = addr.to_script().hex() or ""
                if hex_text:
                    copy_list += [
                        (
                            _("Copy Script Hex"),
                            lambda: self._copy_to_clipboard(hex_text, widget),
                        )
                    ]

    def on_context_menu_for_outputs(self, pos):
        o_text = self.o_text
        menu = QtWidgets.QMenu()
        global_pos = o_text.viewport().mapToGlobal(pos)

        charFormat, cursor = QTextCharFormat(), o_text.cursorForPosition(pos)
        charFormat = cursor and cursor.charFormat()
        name = charFormat.anchorNames() and charFormat.anchorNames()[0]

        show_list = []
        copy_list = []
        try:
            # figure out which output they right-clicked on .. output lines have an anchor named "output N"
            i = int(name.split()[1])  # split "output N", translate N -> int
            ignored, addr, value = (self.tx.outputs())[i]
            menu.addAction(_("Output") + " #" + str(i)).setDisabled(True)
            menu.addSeparator()
            self._add_addr_to_io_menu_lists_for_widget(
                addr, show_list, copy_list, o_text
            )
            if isinstance(value, int):
                value_fmtd = self.main_window.format_amount(value)
                copy_list += [
                    (
                        _("Copy Amount"),
                        lambda: self._copy_to_clipboard(value_fmtd, o_text),
                    )
                ]
        except (TypeError, ValueError, IndexError, KeyError, AttributeError) as e:
            self.print_error("Outputs right-click menu exception:", repr(e))

        for item in show_list:
            menu.addAction(*item)
        if show_list and copy_list:
            menu.addSeparator()
        for item in copy_list:
            menu.addAction(*item)

        if show_list or copy_list:
            menu.addSeparator()
        if self.o_text_has_selection:
            # Add this if they have a selection
            menu.addAction(
                _("Copy Selected Text"), lambda: self._copy_to_clipboard(None, o_text)
            )
        menu.addAction(_("Select All"), o_text.selectAll)
        menu.exec_(global_pos)
