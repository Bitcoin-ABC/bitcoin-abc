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

from qtpy import QtWidgets
from qtpy.QtCore import QTimer

from electrumabc.address import Address
from electrumabc.i18n import _

from .history_list import HistoryList
from .qrtextedit import ShowQRTextEdit
from .util import Buttons, ButtonsLineEdit, CloseButton, ColorScheme, WindowModalDialog


class AddressDialog(WindowModalDialog):
    MIN_WIDTH_NO_FX_HIST = 700
    MIN_WIDTH_FX_HIST = MIN_WIDTH_NO_FX_HIST + 75

    def __init__(self, parent, address, *, windowParent=None):
        assert isinstance(address, Address)
        windowParent = windowParent or parent
        WindowModalDialog.__init__(self, windowParent, _("Address"))
        self.address = address
        self.parent = parent
        self.config = parent.config
        self.wallet = parent.wallet
        self.app = parent.app
        self.saved = True

        self.setMinimumWidth(
            self.MIN_WIDTH_FX_HIST
            if self.parent.fx and self.parent.fx.show_history()
            else self.MIN_WIDTH_NO_FX_HIST
        )
        vbox = QtWidgets.QVBoxLayout()
        self.setLayout(vbox)

        vbox.addWidget(QtWidgets.QLabel(_("Address:")))
        self.addr_e = ButtonsLineEdit()
        icon = (
            ":icons/qrcode_white.svg"
            if ColorScheme.dark_scheme
            else ":icons/qrcode.svg"
        )
        self.addr_e.addButton(icon, self.show_qr, _("Show QR Code"))
        self.addr_e.addCopyButton()
        self.addr_e.setReadOnly(True)
        vbox.addWidget(self.addr_e)
        self.update_addr()

        try:
            # the below line only works for deterministic wallets, other wallets lack this method
            pubkeys = self.wallet.get_public_keys(address)
        except Exception:
            try:
                # ok, now try the usual method for imported wallets, etc
                pubkey = self.wallet.get_public_key(address)
                pubkeys = [pubkey.to_ui_string()]
            except Exception:
                # watching only wallets (totally lacks a private/public key pair for this address)
                pubkeys = None
        if pubkeys:
            vbox.addWidget(QtWidgets.QLabel(_("Public keys") + ":"))
            for pubkey in pubkeys:
                pubkey_e = ButtonsLineEdit(pubkey)
                pubkey_e.addCopyButton()
                vbox.addWidget(pubkey_e)

        try:
            redeem_script = self.wallet.pubkeys_to_redeem_script(pubkeys)
        except Exception:
            redeem_script = None
        if redeem_script:
            vbox.addWidget(QtWidgets.QLabel(_("Redeem Script") + ":"))
            redeem_e = ShowQRTextEdit(text=redeem_script)
            redeem_e.addCopyButton()
            vbox.addWidget(redeem_e)

        vbox.addWidget(QtWidgets.QLabel(_("History")))
        self.hw = HistoryList(self.parent)
        self.hw.get_domain = self.get_domain
        vbox.addWidget(self.hw)

        vbox.addLayout(Buttons(CloseButton(self)))
        self.format_amount = self.parent.format_amount
        self.hw.update()

    def connect_signals(self):
        # connect slots so the embedded history list gets updated whenever the history changes
        self.parent.gui_object.addr_fmt_changed.connect(self.update_addr)
        self.parent.history_updated_signal.connect(self.hw.update)
        self.parent.labels_updated_signal.connect(self.hw.update_labels)
        self.parent.network_signal.connect(self.got_verified_tx)

    def disconnect_signals(self):
        try:
            self.parent.history_updated_signal.disconnect(self.hw.update)
        except TypeError:
            pass
        try:
            self.parent.network_signal.disconnect(self.got_verified_tx)
        except TypeError:
            pass
        try:
            self.parent.gui_object.addr_fmt_changed.disconnect(self.update_addr)
        except TypeError:
            pass
        try:
            self.parent.labels_updated_signal.disconnect(self.hw.update_labels)
        except TypeError:
            pass

    def got_verified_tx(self, event, args):
        if event == "verified2" and args[0] is self.wallet:
            self.hw.update_item(*args[1:])

    def update_addr(self):
        self.addr_e.setText(self.address.to_ui_string())

    def get_domain(self):
        return [self.address]

    def show_qr(self):
        text = self.address.to_ui_string()
        try:
            self.parent.show_qrcode(text, "Address", parent=self)
        except Exception as e:
            self.show_message(str(e))

    def exec_(self):
        """Overrides super class and does some cleanup after exec"""
        self.connect_signals()
        retval = super().exec_()
        self.disconnect_signals()
        import gc

        # run GC in 10 ms. Otherwise this window sticks around in memory for way too
        # long
        QTimer.singleShot(10, lambda: gc.collect())
        return retval
