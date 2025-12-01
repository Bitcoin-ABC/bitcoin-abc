# Electrum ABC - lightweight eCash client
# Copyright (C) 2025-present The Electrum ABC developers
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

import copy
import sys
import traceback
from decimal import Decimal
from functools import partial
from typing import TYPE_CHECKING, Callable, Dict, List, Optional, Tuple

from qtpy import QtWidgets
from qtpy.QtCore import (
    QStringListModel,
    Qt,
    Signal,
)
from qtpy.QtGui import QIcon

import electrumabc.web as web
from electrumabc import keystore, networks
from electrumabc.address import Address
from electrumabc.amount import (
    base_unit,
    format_amount,
    format_amount_and_units,
    format_satoshis_plain,
)
from electrumabc.bitcoin import TYPE_ADDRESS, is_bip38_available, is_bip38_key
from electrumabc.constants import CURRENCY, PROJECT_NAME
from electrumabc.i18n import _, ngettext
from electrumabc.invoice import ExchangeRateApiError
from electrumabc.paymentrequest import PR_PAID
from electrumabc.plugins import run_hook
from electrumabc.printerror import PrintError
from electrumabc.transaction import (
    OPReturn,
    Transaction,
    TxOutput,
)
from electrumabc.util import ExcessiveFee, NotEnoughFunds
from electrumabc.wallet import sweep_preparations

from .amountedit import AmountEdit, MyLineEdit, XECAmountEdit
from .bip38_importer import Bip38Importer
from .fee_slider import FeeSlider
from .invoice_dialog import load_invoice_from_file_and_show_error_message
from .invoice_list import InvoiceList
from .paytoedit import PayToEdit
from .popup_widget import ShowPopupLabel
from .qrtextedit import ScanQRTextEdit
from .tree_widget import MyTreeWidget
from .util import (
    Buttons,
    CancelButton,
    ColorScheme,
    EnterButton,
    HelpButton,
    HelpLabel,
    MessageBoxMixin,
    OkButton,
    WaitingDialog,
    WindowModalDialog,
    address_combo,
)

if TYPE_CHECKING:
    from electrumabc.exchange_rate import FxThread
    from electrumabc.network import Network
    from electrumabc.simple_config import SimpleConfig
    from electrumabc.wallet import AbstractWallet

    from .main_window import ElectrumWindow


class SendTab(QtWidgets.QWidget, MessageBoxMixin, PrintError):
    show_tab_signal = Signal()
    payment_request_ok_signal = Signal()
    payment_request_error_signal = Signal()

    def __init__(
        self,
        window: ElectrumWindow,
        config: SimpleConfig,
        wallet: AbstractWallet,
        fx: FxThread,
        network: Network,
    ):
        QtWidgets.QWidget.__init__(self, window)
        MessageBoxMixin.__init__(self)

        self.window = window
        self.wallet = wallet
        self.fx = fx
        self.config = config
        self.network = network

        self.payment_request = None
        self.not_enough_funds = False
        self.op_return_toolong = False
        self.tx_external_keypairs: Dict[bytes, Tuple[bytes, bool]] = {}
        self.require_fee_update = False

        self.completions = QStringListModel()

        grid = QtWidgets.QGridLayout()
        grid.setSpacing(8)
        grid.setColumnStretch(3, 1)

        self.amount_e = XECAmountEdit(self.config.get_decimal_point())
        self.payto_e = PayToEdit(self, self.wallet.contacts)
        # NB: the translators hopefully will not have too tough a time with this
        # *fingers crossed* :)
        msg = (
            '<span style="font-weight:400;">'
            + _("Recipient of the funds.")
            + " "
            + _(
                "You may enter:"
                "<ul>"
                f"<li> {CURRENCY} <b>Address</b> <b>★</b>"
                "<li> Bitcoin Legacy <b>Address</b> <b>★</b>"
                "<li> <b>Contact name</b> <b>★</b> from the Contacts tab"
                "<li> <b>OpenAlias</b> e.g. <i>satoshi@domain.com</i>"
                "</ul><br>"
                "&nbsp;&nbsp;&nbsp;<b>★</b> = Supports <b>pay-to-many</b>, where"
                " you may optionally enter multiple lines of the form:"
                "</span><br><pre>"
                "    recipient1, amount1 \n"
                "    recipient2, amount2 \n"
                "    etc..."
                "</pre>"
            )
        )
        self.payto_label = payto_label = HelpLabel(_("Pay &to"), msg)
        payto_label.setBuddy(self.payto_e)
        qmark = (
            ":icons/question-mark-dark.svg"
            if ColorScheme.dark_scheme
            else ":icons/question-mark-light.svg"
        )
        qmark_help_but = HelpButton(
            msg, button_text="", fixed_size=False, icon=QIcon(qmark), custom_parent=self
        )
        self.payto_e.addWidget(qmark_help_but, index=0)
        grid.addWidget(payto_label, 1, 0)
        grid.addWidget(self.payto_e, 1, 1, 1, -1)

        completer = QtWidgets.QCompleter(self.payto_e)
        completer.setCaseSensitivity(Qt.CaseSensitivity.CaseInsensitive)
        self.payto_e.set_completer(completer)
        completer.setModel(self.completions)

        msg = (
            _("Description of the transaction (not mandatory).")
            + "\n\n"
            + _(
                "The description is not sent to the recipient of the funds. It is"
                " stored in your wallet file, and displayed in the 'History' tab."
            )
        )
        description_label = HelpLabel(_("&Description"), msg)
        grid.addWidget(description_label, 2, 0)
        self.message_e = MyLineEdit()
        description_label.setBuddy(self.message_e)
        grid.addWidget(self.message_e, 2, 1, 1, -1)

        msg_opreturn = (
            _("OP_RETURN data (optional).")
            + "\n\n"
            + _(
                f"Posts a PERMANENT note to the {CURRENCY} "
                "blockchain as part of this transaction."
            )
            + "\n\n"
            + _(
                "If you specify OP_RETURN text, you may leave the 'Pay to' field blank."
            )
        )
        self.opreturn_label = HelpLabel(_("&OP_RETURN"), msg_opreturn)
        grid.addWidget(self.opreturn_label, 3, 0)
        self.message_opreturn_e = MyLineEdit()
        self.opreturn_label.setBuddy(self.message_opreturn_e)
        hbox = QtWidgets.QHBoxLayout()
        hbox.addWidget(self.message_opreturn_e)
        self.opreturn_rawhex_cb = QtWidgets.QCheckBox(_("&Raw hex script"))
        self.opreturn_rawhex_cb.setToolTip(
            _(
                "If unchecked, the textbox contents are UTF8-encoded into a single-push"
                " script: <tt>OP_RETURN PUSH &lt;text&gt;</tt>. If checked, the text"
                " contents will be interpreted as a raw hexadecimal script to be"
                " appended after the OP_RETURN opcode: <tt>OP_RETURN"
                " &lt;script&gt;</tt>."
            )
        )
        hbox.addWidget(self.opreturn_rawhex_cb)
        self.opreturn_shuffle_outputs_cb = QtWidgets.QCheckBox(_("Shuffle outputs"))
        self.opreturn_shuffle_outputs_cb.setChecked(True)
        self.opreturn_shuffle_outputs_cb.setEnabled(
            self.message_opreturn_e.text() != ""
        )
        self.opreturn_shuffle_outputs_cb.setToolTip(
            _(
                "<p>For some OP_RETURN use cases such as SLP, the order of the outputs"
                " in the transaction matters, so you might want to uncheck this. By"
                " default, outputs are shuffled for privacy reasons. This setting is "
                "ignored if the OP_RETURN data is empty.</p>"
            )
        )
        hbox.addWidget(self.opreturn_shuffle_outputs_cb)
        grid.addLayout(hbox, 3, 1, 1, -1)

        self.message_opreturn_e.textChanged.connect(
            lambda text: self.opreturn_shuffle_outputs_cb.setEnabled(bool(text))
        )

        self.send_tab_opreturn_widgets = [
            self.message_opreturn_e,
            self.opreturn_rawhex_cb,
            self.opreturn_shuffle_outputs_cb,
            self.opreturn_label,
        ]

        self.from_label = QtWidgets.QLabel(_("&From"))
        grid.addWidget(self.from_label, 4, 0)
        self.from_list = MyTreeWidget(["", ""], self.config, self.wallet)
        self.from_list.customContextMenuRequested.connect(self.from_list_menu)
        self.from_label.setBuddy(self.from_list)
        self.from_list.setHeaderHidden(True)
        self.from_list.setMaximumHeight(80)
        grid.addWidget(self.from_list, 4, 1, 1, -1)
        self.set_pay_from([])

        msg = (
            _("Amount to be sent.")
            + "\n\n"
            + _(
                "The amount will be displayed in red if you do not have enough funds in"
                " your wallet."
            )
            + " "
            + _(
                "Note that if you have frozen some of your addresses, the available"
                " funds will be lower than your total balance."
            )
            + "\n\n"
            + _('Keyboard shortcut: type "!" to send all your coins.')
        )
        amount_label = HelpLabel(_("&Amount"), msg)
        amount_label.setBuddy(self.amount_e)
        grid.addWidget(amount_label, 5, 0)
        grid.addWidget(self.amount_e, 5, 1)

        self.fiat_send_e = AmountEdit(self.fx.get_currency() if self.fx else "")
        if not self.fx or not self.fx.is_enabled():
            self.fiat_send_e.setVisible(False)
        grid.addWidget(self.fiat_send_e, 5, 2)
        self.amount_e.frozen.connect(
            lambda: self.fiat_send_e.setFrozen(self.amount_e.isReadOnly())
        )

        self.max_button = EnterButton(_("&Max"), self.spend_max)
        self.max_button.setFixedWidth(self.amount_e.width())
        self.max_button.setCheckable(True)
        grid.addWidget(self.max_button, 5, 3)
        hbox = self.send_tab_extra_plugin_controls_hbox = QtWidgets.QHBoxLayout()
        hbox.addStretch(1)
        grid.addLayout(hbox, 5, 4, 1, -1)

        msg = (
            _(
                f"{CURRENCY} transactions are in general not free. A transaction fee is"
                "   paid by the sender of the funds."
            )
            + "\n\n"
            + _(
                "The amount of fee can be decided freely by the sender. However, "
                "transactions with low fees take more time to be processed."
            )
            + "\n\n"
            + _(
                "A suggested fee is automatically added to this field. You may "
                "override it. The suggested fee increases with the size of the "
                "transaction."
            )
        )
        self.fee_e_label = HelpLabel(_("F&ee"), msg)

        def fee_cb(fee_rate):
            self.config.set_key("fee_per_kb", fee_rate, False)
            self.spend_max() if self.max_button.isChecked() else self.update_fee()

        self.fee_slider = FeeSlider(self.config, fee_cb)
        self.fee_e_label.setBuddy(self.fee_slider)
        self.fee_slider.setFixedWidth(self.amount_e.width())

        self.fee_custom_lbl = HelpLabel(
            self.get_custom_fee_text(),
            _("This is the fee rate that will be used for this transaction.")
            + "\n\n"
            + _(
                "It is calculated from the Custom Fee Rate in preferences, but can be"
                " overridden from the manual fee edit on this form (if enabled)."
            )
            + "\n\n"
            + _(
                "Generally, a fee of 1.0 sats/B is a good minimal rate to ensure your"
                " transaction will make it into the next block."
            ),
        )
        self.fee_custom_lbl.setFixedWidth(self.amount_e.width())

        self.fee_slider_mogrifier()

        self.fee_e = XECAmountEdit(self.window.get_decimal_point())
        if not self.config.get("show_fee", False):
            self.fee_e.setVisible(False)
        self.fee_e.textEdited.connect(self.update_fee)
        # This is so that when the user blanks the fee and moves on,
        # we go back to auto-calculate mode and put a fee back.
        self.fee_e.editingFinished.connect(self.update_fee)
        self.window.connect_fields(self, self.amount_e, self.fiat_send_e, self.fee_e)

        grid.addWidget(self.fee_e_label, 6, 0)
        grid.addWidget(self.fee_slider, 6, 1)
        grid.addWidget(self.fee_custom_lbl, 6, 1)
        grid.addWidget(self.fee_e, 6, 2)

        self.preview_button = EnterButton(_("&Preview"), self.do_preview)
        self.preview_button.setToolTip(
            _("Display the details of your transactions before signing it.")
        )
        self.send_button = EnterButton(_("&Send"), self.do_send)
        self.clear_button = EnterButton(_("&Clear"), self.do_clear)
        buttons = QtWidgets.QHBoxLayout()
        buttons.addStretch(1)
        buttons.addWidget(self.clear_button)
        buttons.addWidget(self.preview_button)
        buttons.addWidget(self.send_button)
        grid.addLayout(buttons, 7, 1, 1, 3)

        # hide/unhide various buttons
        self.payto_e.textChanged.connect(self.update_buttons_on_seed)

        self.amount_e.shortcut.connect(self.spend_max)
        self.payto_e.textChanged.connect(self.update_fee)
        self.amount_e.textEdited.connect(self.update_fee)
        self.message_opreturn_e.textEdited.connect(self.update_fee)
        self.message_opreturn_e.textChanged.connect(self.update_fee)
        self.message_opreturn_e.editingFinished.connect(self.update_fee)
        self.opreturn_rawhex_cb.stateChanged.connect(self.update_fee)

        def reset_max(text):
            self.max_button.setChecked(False)
            enabled = not bool(text) and not self.amount_e.isReadOnly()
            self.max_button.setEnabled(enabled)

        self.amount_e.textEdited.connect(reset_max)
        self.fiat_send_e.textEdited.connect(reset_max)

        def entry_changed():
            text = ""
            if self.not_enough_funds:
                amt_color, fee_color = ColorScheme.RED, ColorScheme.RED
                text = _("Not enough funds")
                c, u, x = self.wallet.get_frozen_balance()
                if c + u + x:
                    text += (
                        " ("
                        + format_amount(c + u + x, self.config).strip()
                        + " "
                        + base_unit(self.config)
                        + " "
                        + _("are frozen")
                        + ")"
                    )

                extra = run_hook("not_enough_funds_extra", self.wallet, self.config)
                if isinstance(extra, str) and extra:
                    text += " ({})".format(extra)

            elif self.fee_e.isModified():
                amt_color, fee_color = ColorScheme.DEFAULT, ColorScheme.DEFAULT
            elif self.amount_e.isModified():
                amt_color, fee_color = ColorScheme.DEFAULT, ColorScheme.BLUE
            else:
                amt_color, fee_color = ColorScheme.BLUE, ColorScheme.BLUE
            opret_color = ColorScheme.DEFAULT
            if self.op_return_toolong:
                opret_color = ColorScheme.RED
                text = (
                    _(
                        "OP_RETURN message too large, needs to be no longer than 220"
                        " bytes"
                    )
                    + (", " if text else "")
                    + text
                )

            self.window.statusBar().showMessage(text)
            self.amount_e.setStyleSheet(amt_color.as_stylesheet())
            self.fee_e.setStyleSheet(fee_color.as_stylesheet())
            self.message_opreturn_e.setStyleSheet(opret_color.as_stylesheet())

        self.amount_e.textChanged.connect(entry_changed)
        self.fee_e.textChanged.connect(entry_changed)
        self.message_opreturn_e.textChanged.connect(entry_changed)
        self.message_opreturn_e.textEdited.connect(entry_changed)
        self.message_opreturn_e.editingFinished.connect(entry_changed)
        self.opreturn_rawhex_cb.stateChanged.connect(entry_changed)

        invoices_should_be_visible = len(self.wallet.invoices.unpaid_invoices()) > 0
        self.invoices_label = QtWidgets.QLabel(_("Invoices"))
        self.invoices_label.setVisible(invoices_should_be_visible)
        self.invoice_list = InvoiceList(self.window)
        self.invoice_list.setVisible(invoices_should_be_visible)
        self.invoice_list.visibility_changed.connect(self.invoices_label.setVisible)
        self.invoice_list.pay_invoice_signal.connect(self.do_pay_invoice)
        self.invoice_list.delete_invoice_signal.connect(self.delete_invoice)

        vbox = QtWidgets.QVBoxLayout(self)
        vbox.addLayout(grid)
        vbox.addStretch(1)
        vbox.addWidget(self.invoices_label)
        vbox.addWidget(self.invoice_list)
        vbox.setStretchFactor(self.invoice_list, 1000)
        self.searchable_list = self.invoice_list

        self.payment_request_ok_signal.connect(self.payment_request_ok)
        self.payment_request_error_signal.connect(self.payment_request_error)

    def spend_max(self):
        self.max_button.setChecked(True)
        self.do_update_fee()

    def update_fee(self):
        self.require_fee_update = True

    def get_payto_or_dummy(self):
        r = self.payto_e.get_recipient()
        if r:
            return r
        return (TYPE_ADDRESS, self.wallet.dummy_address())

    def get_custom_fee_text(self, fee_rate=None):
        if not self.config.has_custom_fee_rate():
            return ""
        else:
            if fee_rate is None:
                fee_rate = self.config.custom_fee_rate() / 1000.0
            return str(round(fee_rate * 100) / 100) + " sats/B"

    def do_update_fee(self):
        """Recalculate the fee.  If the fee was manually input, retain it, but
        still build the TX to see if there are enough funds.
        """
        freeze_fee = self.fee_e.isModified() and (
            self.fee_e.text() or self.fee_e.hasFocus()
        )
        amount = "!" if self.max_button.isChecked() else self.amount_e.get_amount()
        fee_rate = None
        if amount is None:
            if not freeze_fee:
                self.fee_e.setAmount(None)
            self.not_enough_funds = False
            self.window.statusBar().showMessage("")
        else:
            fee = self.fee_e.get_amount() if freeze_fee else None
            outputs = self.payto_e.get_outputs(self.max_button.isChecked())
            if not outputs:
                _type, addr = self.get_payto_or_dummy()
                outputs = [TxOutput(_type, addr, amount)]
            try:
                opreturn_message = (
                    self.message_opreturn_e.text()
                    if self.config.get("enable_opreturn")
                    else None
                )
                if opreturn_message:
                    if self.opreturn_rawhex_cb.isChecked():
                        outputs.append(OPReturn.output_for_rawhex(opreturn_message))
                    else:
                        outputs.append(OPReturn.output_for_stringdata(opreturn_message))
                tx = self.wallet.make_unsigned_transaction(
                    self.get_coins(), outputs, self.config, fee
                )
                self.not_enough_funds = False
                self.op_return_toolong = False
            except NotEnoughFunds:
                self.not_enough_funds = True
                if not freeze_fee:
                    self.fee_e.setAmount(None)
                return
            except OPReturn.TooLarge:
                self.op_return_toolong = True
                return
            except OPReturn.Error as e:
                self.window.statusBar().showMessage(str(e))
                return
            except Exception:
                return

            if not freeze_fee:
                fee = None if self.not_enough_funds else tx.get_fee()
                self.fee_e.setAmount(fee)

            if self.max_button.isChecked():
                amount = tx.output_value()
                self.amount_e.setAmount(amount)
            if fee is not None:
                fee_rate = fee / tx.estimated_size()
        self.fee_slider_mogrifier(self.get_custom_fee_text(fee_rate))

    def fee_slider_mogrifier(self, text=None):
        fee_slider_hidden = self.config.has_custom_fee_rate()
        self.fee_slider.setHidden(fee_slider_hidden)
        self.fee_custom_lbl.setHidden(not fee_slider_hidden)
        if text is not None:
            self.fee_custom_lbl.setText(text)

    def from_list_delete(self, name):
        item = self.from_list.currentItem()
        if (
            item
            and item.data(0, Qt.UserRole) == name
            and not item.data(0, Qt.UserRole + 1)
        ):
            i = self.from_list.indexOfTopLevelItem(item)
            try:
                self.pay_from.pop(i)
            except IndexError:
                # The list may contain items not in the pay_from if added by a
                # plugin using the spendable_coin_filter hook
                pass
            self.redraw_from_list()
            self.update_fee()

    def from_list_menu(self, position):
        item = self.from_list.itemAt(position)
        if not item:
            return
        menu = QtWidgets.QMenu()
        name = item.data(0, Qt.UserRole)
        action = menu.addAction(_("Remove"), lambda: self.from_list_delete(name))
        if item.data(0, Qt.UserRole + 1):
            action.setText(_("Not Removable"))
            action.setDisabled(True)
        menu.exec_(self.from_list.viewport().mapToGlobal(position))

    def set_pay_from(self, coins):
        self.pay_from = list(coins)
        self.redraw_from_list()

    def redraw_from_list(self, *, spendable=None):
        """Optional kwarg spendable indicates *which* of the UTXOs in the
        self.pay_from list are actually spendable.  If this arg is specified,
        coins in the self.pay_from list that aren't also in the 'spendable' list
        will be grayed out in the UI, to indicate that they will not be used.
        Otherwise all coins will be non-gray (default).
        (Added for CashShuffle 02/23/2019)"""
        sel = self.from_list.currentItem() and self.from_list.currentItem().data(
            0, Qt.UserRole
        )
        self.from_list.clear()
        self.from_label.setHidden(len(self.pay_from) == 0)
        self.from_list.setHidden(len(self.pay_from) == 0)

        def name(x):
            return "{}:{}".format(x["prevout_hash"], x["prevout_n"])

        def format_outpoint_and_address(x):
            h = x["prevout_hash"]
            return "{}...{}:{:d}\t{}".format(
                h[0:10], h[-10:], x["prevout_n"], x["address"]
            )

        def grayify(twi):
            b = twi.foreground(0)
            b.setColor(Qt.gray)
            for i in range(twi.columnCount()):
                twi.setForeground(i, b)

        def new(item, is_unremovable=False):
            ret = QtWidgets.QTreeWidgetItem(
                [
                    format_outpoint_and_address(item),
                    format_amount(item["value"], self.config),
                ]
            )
            ret.setData(0, Qt.UserRole, name(item))
            ret.setData(0, Qt.UserRole + 1, is_unremovable)
            return ret

        for item in self.pay_from:
            twi = new(item)
            if spendable is not None and item not in spendable:
                grayify(twi)
            self.from_list.addTopLevelItem(twi)
            if name(item) == sel:
                self.from_list.setCurrentItem(twi)

        if spendable is not None:  # spendable may be None if no plugin filtered coins.
            for item in spendable:
                # append items added by the plugin to the spendable list
                # at the bottom.  These coins are marked as "not removable"
                # in the UI (the plugin basically insisted these coins must
                # be spent with the other coins in the list for privacy).
                if item not in self.pay_from:
                    twi = new(item, True)
                    self.from_list.addTopLevelItem(twi)
                    if name(item) == sel:
                        self.from_list.setCurrentItem(twi)

    def read_send_tab(self):
        isInvoice = False

        if self.payment_request and self.payment_request.has_expired():
            self.show_error(_("Payment request has expired"))
            return
        label = self.message_e.text()

        if self.payment_request:
            isInvoice = True
            outputs = self.payment_request.get_outputs()
        else:
            errors = self.payto_e.get_errors()
            if errors:
                self.show_warning(
                    _("Invalid lines found:")
                    + "\n\n"
                    + "\n".join(
                        [_("Line #") + str(x[0] + 1) + ": " + x[1] for x in errors]
                    )
                )
                return
            outputs = self.payto_e.get_outputs(self.max_button.isChecked())

            if self.payto_e.is_alias and not self.payto_e.validated:
                alias = self.payto_e.toPlainText()
                msg = (
                    _(
                        'WARNING: the alias "{}" could not be validated via an'
                        " additional security check, DNSSEC, and thus may not be"
                        " correct."
                    ).format(alias)
                    + "\n"
                )
                msg += _("Do you wish to continue?")
                if not self.question(msg):
                    return

        try:
            # handle op_return if specified and enabled
            opreturn_message = self.message_opreturn_e.text()
            if opreturn_message:
                if self.opreturn_rawhex_cb.isChecked():
                    outputs.append(OPReturn.output_for_rawhex(opreturn_message))
                else:
                    outputs.append(OPReturn.output_for_stringdata(opreturn_message))
        except OPReturn.TooLarge as e:
            self.show_error(str(e))
            return
        except OPReturn.Error as e:
            self.show_error(str(e))
            return

        if not outputs:
            self.show_error(_("No outputs"))
            return

        for o in outputs:
            if o.value is None:
                self.show_error(_("Invalid Amount"))
                return

        freeze_fee = (
            self.fee_e.isVisible()
            and self.fee_e.isModified()
            and (self.fee_e.text() or self.fee_e.hasFocus())
        )
        fee = self.fee_e.get_amount() if freeze_fee else None
        coins = self.get_coins(isInvoice)
        return outputs, fee, label, coins

    def _chk_no_segwit_suspects(self):
        """Makes sure the payto_e has no addresses that might be BTC segwit
        in it and if it does, warn user. Intended to be called from do_send.
        Returns True if no segwit suspects were detected in the payto_e,
        False otherwise.  If False is returned, a suitable error dialog
        will have already been presented to the user."""
        if bool(self.config.get("allow_legacy_p2sh", False)):
            return True
        segwits = set()
        prefix_char = "3" if not networks.net.TESTNET else "2"
        for line in self.payto_e.lines():
            line = line.strip()
            if ":" in line and line.lower().startswith(
                networks.net.CASHADDR_PREFIX + ":"
            ):
                # strip ecash: prefix
                line = line.split(":", 1)[1]
            if "," in line:
                line = line.split(",", 1)[
                    0
                ]  # if address, amount line, strip address out and ignore rest
            line = line.strip()
            if line.startswith(prefix_char) and Address.is_valid(line):
                segwits.add(line)
        if segwits:
            msg = ngettext(
                "Possible BTC Segwit address in 'Pay to' field. Please use CashAddr"
                " format for p2sh addresses.\n\n{segwit_addresses}",
                "Possible BTC Segwit addresses in 'Pay to' field. Please use"
                " CashAddr format for p2sh addresses.\n\n{segwit_addresses}",
                len(segwits),
            ).format(segwit_addresses="\n".join(segwits))
            detail = _(
                "Legacy '{prefix_char}...' p2sh address support in the Send tab is "
                "restricted by default in order to prevent inadvertently "
                f"sending {CURRENCY} to Segwit BTC addresses.\n\n"
                "If you are an expert user, go to 'Preferences -> Transactions' "
                "to enable the use of legacy p2sh addresses in the Send tab."
            ).format(prefix_char=prefix_char)
            self.show_error(msg, detail_text=detail)
            return False
        return True

    def _warn_if_legacy_address(self):
        """Show a warning if self.payto_e has legacy addresses, since the user
        might be trying to send BTC instead of BCHA."""
        warn_legacy_address = bool(self.config.get("warn_legacy_address", True))
        if not warn_legacy_address:
            return
        for line in self.payto_e.lines():
            line = line.strip()
            if line.lower().startswith(networks.net.CASHADDR_PREFIX + ":"):
                # strip "ecash:" prefix
                line = line.split(":", 1)[1]
            if "," in line:
                # if address, amount line, strip address out and ignore rest
                line = line.split(",", 1)[0]
            line = line.strip()
            if Address.is_legacy(line):
                msg1 = (
                    _("You are about to send {} to a legacy address.").format(CURRENCY)
                    + "<br><br>"
                    + _(
                        "Legacy addresses are deprecated for {} "
                        ", and used by Bitcoin (BTC)."
                    ).format(CURRENCY)
                )
                msg2 = _("Proceed if what you intend to do is to send {}.").format(
                    CURRENCY
                )
                msg3 = _(
                    "If you intend to send BTC, close the application "
                    "and use a BTC wallet instead. {} is a "
                    "{} wallet, not a BTC wallet."
                ).format(PROJECT_NAME, CURRENCY)
                res = self.msg_box(
                    parent=self,
                    icon=QtWidgets.QMessageBox.Warning,
                    title=_("You are sending to a legacy address"),
                    rich_text=True,
                    text=msg1,
                    informative_text=msg2,
                    detail_text=msg3,
                    checkbox_text=_("Never show this again"),
                    checkbox_ischecked=False,
                )
                if res[1]:  # Never ask if checked
                    self.config.set_key("warn_legacy_address", False)
                break

    def do_preview(self):
        self.do_send(preview=True)

    def do_send(self, preview=False):
        # paranoia -- force a resolve right away in case user pasted an
        # openalias and hit preview too quickly.
        self.payto_e.resolve(force_if_has_focus=True)

        if not self._chk_no_segwit_suspects():
            return

        self._warn_if_legacy_address()

        r = self.read_send_tab()
        if not r:
            return
        outputs, fee, tx_desc, coins = r
        shuffle_outputs = True
        if (
            self.message_opreturn_e.isVisible()
            and self.message_opreturn_e.text()
            and not self.opreturn_shuffle_outputs_cb.isChecked()
        ):
            shuffle_outputs = False
        try:
            tx = self.wallet.make_unsigned_transaction(
                coins, outputs, self.config, fee, shuffle_outputs=shuffle_outputs
            )
        except NotEnoughFunds:
            self.show_message(_("Insufficient funds"))
            return
        except ExcessiveFee:
            self.show_message(_("Your fee is too high.  Max is 50 sat/byte."))
            return
        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            self.show_message(str(e))
            return

        amount = (
            tx.output_value()
            if self.max_button.isChecked()
            else sum(x[2] for x in outputs)
        )
        fee = tx.get_fee()

        if preview:
            # NB: this ultimately takes a deepcopy of the tx in question
            # (TxDialog always takes a deep copy).
            self.window.show_transaction(tx, tx_desc)
            return

        # We must "freeze" the tx and take a deep copy of it here. This is
        # because it's possible that it points to coins in self.pay_from and
        # other shared data. We want the tx to be immutable from this point
        # forward with its own private data. This fixes a bug where sometimes
        # the tx would stop being "is_complete" randomly after broadcast!
        tx = copy.deepcopy(tx)

        # confirmation dialog
        msg = [
            _("Amount to be sent")
            + ": "
            + format_amount_and_units(amount, self.config, self.fx),
            _("Mining fee") + ": " + format_amount_and_units(fee, self.config, self.fx),
        ]

        if fee < (tx.estimated_size()):
            msg.append(
                _("Warning")
                + ": "
                + _(
                    "You're using a fee of less than 1.0 sats/B. It may take a very"
                    " long time to confirm."
                )
            )
            tx.ephemeral["warned_low_fee_already"] = True

        if self.config.get("enable_opreturn") and self.message_opreturn_e.text():
            msg.append(
                _(
                    "You are using an OP_RETURN message. This gets permanently written"
                    " to the blockchain."
                )
            )

        if self.wallet.has_keystore_encryption():
            msg.append("")
            msg.append(_("Enter your password to proceed"))
            password = self.window.password_dialog("\n".join(msg))
            if not password:
                return
        else:
            msg.append(_("Proceed?"))
            password = None
            if not self.question("\n\n".join(msg)):
                return

        def sign_done(success):
            if success:
                if not tx.is_complete():
                    self.window.show_transaction(tx, tx_desc)
                    self.do_clear()
                else:
                    self.broadcast_transaction(tx, tx_desc)

        self.sign_tx_with_password(tx, sign_done, password)

    def sign_tx_with_password(self, tx, callback, password):
        """Sign the transaction in a separate thread.  When done, calls
        the callback with a success code of True or False.
        """

        def on_signed(result):
            callback(True)

        def on_failed(exc_info):
            self.window.on_error(exc_info)
            callback(False)

        if self.tx_external_keypairs:
            task = partial(
                Transaction.sign, tx, self.tx_external_keypairs, use_cache=True
            )
        else:
            task = partial(self.wallet.sign_transaction, tx, password, use_cache=True)
        WaitingDialog(self, _("Signing transaction..."), task, on_signed, on_failed)

    def broadcast_transaction(
        self,
        tx: Transaction,
        tx_desc,
        *,
        callback: Optional[Callable[[bool], None]] = None,
    ):
        if self.window.gui_object.warn_if_no_network(self):
            # Don't allow a useless broadcast when in offline mode. Previous to this
            # we were getting an exception on broadcast.
            return

        # Capture current TL window; override might be removed on return
        parent = self.top_level_window()
        if not self.network.is_connected():
            # Don't allow a potentially very slow broadcast when obviously not connected.
            parent.show_error(_("Not connected"))
            return

        # Check fee and warn if it's below 1.0 sats/B (and not warned already)
        fee = None
        try:
            fee = tx.get_fee()
        except Exception:
            # no fee info available for tx
            pass
        # Check fee >= size otherwise warn. FIXME: If someday network relay
        # rules change to be other than 1.0 sats/B minimum, this code needs
        # to be changed.
        if (
            fee is not None
            and tx.is_complete()
            and fee < tx.estimated_size()
            and not tx.ephemeral.get("warned_low_fee_already")
        ):
            msg = (
                _("Warning")
                + ": "
                + _(
                    "You're using a fee of less than 1.0 sats/B. It may take a very"
                    " long time to confirm."
                )
                + "\n\n"
                + _("Proceed?")
            )
            if not self.question(msg, title=_("Low Fee")):
                return

        def broadcast_thread() -> Tuple[bool, str]:
            # non-GUI thread
            pr = self.payment_request
            if not pr:
                # Not a PR, just broadcast.
                return self.network.broadcast_transaction(tx)

            if pr.has_expired():
                self.payment_request = None
                return False, _("Payment request has expired")

            refund_address = self.wallet.get_receiving_addresses()[0]
            ack_status, ack_msg = pr.send_payment(str(tx), refund_address)
            if not ack_status:
                if ack_msg == "no url":
                    # "no url" hard-coded in send_payment method
                    # it means merchant doesn't need the tx sent to him
                    # since he didn't specify a POST url.
                    # so we just broadcast and rely on that result status.
                    ack_msg = None
                else:
                    return False, ack_msg
            # at this point either ack_status is True or there is "no url"
            # and we proceed anyway with the broadcast
            status, msg = self.network.broadcast_transaction(tx)

            # prefer the merchant's ack_msg over the broadcast msg, but fallback
            # to broadcast msg if no ack_msg.
            msg = ack_msg or msg
            # if both broadcast and merchant ACK failed -- it's a failure. if
            # either succeeded -- it's a success
            status = bool(ack_status or status)

            if status:
                self.wallet.invoices.set_paid(pr, tx.txid())
                self.wallet.invoices.save()
                self.payment_request = None

            return status, msg

        def broadcast_done(result: Optional[Tuple[bool, str]]):
            # GUI thread
            status, msg = result or (False, "")
            if not status:
                if msg.startswith("error: "):
                    # take the last part, sans the "error: " prefix
                    msg = msg.split(" ", 1)[-1]
                if msg:
                    parent.show_error(msg)
                if callback:
                    callback(False)
                return

            buttons, copy_index, copy_link = [_("Ok")], None, ""
            try:
                # returns None if not is_complete, but may raise potentially as well
                txid = tx.txid()
            except Exception:
                txid = None
            if txid is not None:
                if tx_desc is not None:
                    self.wallet.set_label(txid, tx_desc)
                copy_link = web.BE_URL(self.config, web.ExplorerUrlParts.TX, txid)
                if copy_link:
                    # tx is complete and there is a copy_link
                    buttons.insert(0, _("Copy link"))
                    copy_index = 0
            if (
                parent.show_message(
                    _("Payment sent.") + "\n" + msg,
                    buttons=buttons,
                    defaultButton=buttons[-1],
                    escapeButton=buttons[-1],
                )
                == copy_index
            ):
                # There WAS a 'Copy link' and they clicked it
                self.windo.copy_to_clipboard(
                    copy_link,
                    _("Block explorer link copied to clipboard"),
                    self.top_level_window(),
                )
            self.invoice_list.update()
            self.do_clear()
            if callback:
                callback(True)

        WaitingDialog(
            self,
            _("Broadcasting transaction..."),
            broadcast_thread,
            broadcast_done,
            self.window.on_error,
        )

    def lock_amount(self, b):
        self.amount_e.setFrozen(b)
        self.max_button.setEnabled(not b)

    def prepare_for_payment_request(self):
        self.show_tab_signal.emit()
        self.payto_e.is_pr = True
        for e in [self.payto_e, self.amount_e, self.message_e]:
            e.setFrozen(True)
        self.max_button.setDisabled(True)
        self.payto_e.setText(_("please wait..."))
        return True

    def delete_invoice(self, key):
        self.wallet.invoices.remove(key)
        self.invoice_list.update()

    def payment_request_ok(self):
        pr = self.payment_request
        key = self.wallet.invoices.add(pr)
        status = self.wallet.invoices.get_status(key)
        self.invoice_list.update()
        if status == PR_PAID:
            self.show_message("invoice already paid")
            self.do_clear()
            self.payment_request = None
            return
        self.payto_e.is_pr = True
        if not pr.has_expired():
            self.payto_e.setGreen()
        else:
            self.payto_e.setExpired()
        self.payto_e.setText(pr.get_requestor())
        self.amount_e.setText(
            format_satoshis_plain(pr.get_amount(), self.window.get_decimal_point())
        )
        self.message_e.setText(pr.get_memo())
        # signal to set fee
        self.amount_e.textEdited.emit("")

    def payment_request_error(self):
        request_error = (self.payment_request and self.payment_request.error) or ""
        self.payment_request = None
        self.print_error("PaymentRequest error:", request_error)
        self.show_error(
            _("There was an error processing the payment request"),
            rich_text=False,
            detail_text=request_error,
        )
        self.do_clear()

    def on_pr(self, request):
        self.payment_request = request
        if self.payment_request.verify(self.wallet.contacts):
            self.payment_request_ok_signal.emit()
        else:
            self.payment_request_error_signal.emit()

    def pay_to_URI(self, URI):
        if not URI:
            return
        try:
            out = web.parse_URI(
                URI, self.on_pr, strict=True, on_exc=self.window.on_error
            )
        except web.ExtraParametersInURIWarning as e:
            out = e.args[0]  # out dict is in e.args[0]
            extra_params = e.args[1:]
            ShowPopupLabel(
                name="`Pay to` error",
                text=ngettext(
                    "Extra parameter in URI was ignored:\n\n{extra_params}",
                    "Extra parameters in URI were ignored:\n\n{extra_params}",
                    len(extra_params),
                ).format(extra_params=", ".join(extra_params)),
                target=self.payto_e,
                timeout=5000,
            )
            # fall through ...
        except web.BadURIParameter as e:
            extra_info = (len(e.args) > 1 and str(e.args[1])) or ""
            self.print_error("Bad URI Parameter:", *[repr(i) for i in e.args])
            if extra_info:
                extra_info = "\n\n" + extra_info  # prepend newlines
            ShowPopupLabel(
                name="`Pay to` error",
                text=_("Bad parameter: {bad_param_name}{extra_info}").format(
                    bad_param_name=e.args[0], extra_info=extra_info
                ),
                target=self.payto_e,
                timeout=5000,
            )
            return
        except web.DuplicateKeyInURIError as e:
            # this exception always has a translated message as args[0]
            # plus a list of keys as args[1:], see web.parse_URI
            ShowPopupLabel(
                name="`Pay to` error",
                text=e.args[0] + ":\n\n" + ", ".join(e.args[1:]),
                target=self.payto_e,
                timeout=5000,
            )
            return
        except Exception as e:
            ShowPopupLabel(
                name="`Pay to` error",
                text=_("Invalid ecash URI:") + "\n\n" + str(e),
                target=self.payto_e,
                timeout=5000,
            )
            return
        self.show_tab_signal.emit()
        r = out.get("r")
        if r:
            self.prepare_for_payment_request()
            return
        addresses = out.get("addresses", [])
        amounts = out.get("amounts", [])
        if (len(addresses) == 1 and len(amounts) > 1) or (
            len(addresses) != 1 and len(addresses) != len(amounts)
        ):
            ShowPopupLabel(
                name="`Pay to` error",
                text=_("Inconsistent number of addresses and amounts in ecash URI:")
                + f" {len(addresses)} addresses and {len(amounts)} amounts",
                target=self.payto_e,
                timeout=5000,
            )
            return
        label = out.get("label")
        message = out.get("message")
        op_return = out.get("op_return")
        op_return_raw = out.get("op_return_raw")

        # use label as description (not BIP21 compliant)
        if label and not message:
            message = label
        if len(amounts) == 1:
            self.amount_e.setAmount(amounts[0])
            self.amount_e.textEdited.emit("")

        if len(addresses) == 1:
            # if address, set the payto field to the address.
            self.payto_e.setText(addresses[0])
        elif (
            len(addresses) == 0
            and URI.strip().lower().split(":", 1)[0] in web.parseable_schemes()
        ):
            # if *not* address, then we set the payto field to the empty string
            # only IFF it was ecash:, see issue Electron-Cash#1131.
            self.payto_e.setText("")
        elif len(addresses) > 1:
            # For multiple outputs, we fill the payto field with the expected CSV
            # string. Note that amounts are in sats and we convert them to XEC.
            assert len(addresses) == len(amounts)
            self.payto_e.setText(
                "\n".join(
                    f"{addr}, {format_satoshis_plain(amount, self.window.get_decimal_point())}"
                    for addr, amount in zip(addresses, amounts)
                )
            )

        if message:
            self.message_e.setText(message)
        if op_return:
            self.message_opreturn_e.setText(op_return)
            self.message_opreturn_e.setHidden(False)
            self.opreturn_rawhex_cb.setHidden(False)
            self.opreturn_rawhex_cb.setChecked(False)
            self.opreturn_label.setHidden(False)
        elif op_return_raw is not None:
            # 'is not None' allows blank value.
            # op_return_raw is secondary precedence to op_return
            if not op_return_raw:
                op_return_raw = "empty"
            self.message_opreturn_e.setText(op_return_raw)
            self.message_opreturn_e.setHidden(False)
            self.opreturn_rawhex_cb.setHidden(False)
            self.opreturn_rawhex_cb.setChecked(True)
            self.opreturn_label.setHidden(False)
        elif not self.config.get("enable_opreturn"):
            self.message_opreturn_e.setText("")
            self.message_opreturn_e.setHidden(True)
            self.opreturn_rawhex_cb.setHidden(True)
            self.opreturn_label.setHidden(True)

        total_amount = sum(amounts)
        if self.amount_exceeds_warning_threshold(total_amount):
            # The user is one click away from broadcasting a tx prefilled by a URI.
            # If the amount is significant, warn them about it.
            self.show_warning(
                _(
                    "The amount field has been populated by a BIP21 payment URI with a "
                    "value of {amount_and_unit}. Please check the amount and destination "
                    "carefully before sending the transaction."
                ).format(
                    amount_and_unit=format_amount_and_units(
                        total_amount, self.config, self.fx
                    )
                )
            )

    def amount_exceeds_warning_threshold(self, amount_sats: int) -> bool:
        USD_THRESHOLD = 100
        XEC_THRESHOLD = 3_000_000
        rate = self.fx.exchange_rate("USD") if self.fx else None
        sats_per_unit = self.fx.satoshis_per_unit()
        amount_xec = Decimal(amount_sats) / Decimal(sats_per_unit)
        if rate is not None:
            return amount_xec * rate >= USD_THRESHOLD
        return amount_xec >= XEC_THRESHOLD

    def do_clear(self):
        """Clears the send tab, resetting its UI state to its initiatial state."""
        self.max_button.setChecked(False)
        self.not_enough_funds = False
        self.op_return_toolong = False
        self.payment_request = None
        self.payto_e.is_pr = False
        self.payto_e.is_alias, self.payto_e.validated = (
            False,
            False,
        )  # clear flags to avoid bad things
        for e in [
            self.payto_e,
            self.message_e,
            self.amount_e,
            self.fiat_send_e,
            self.fee_e,
            self.message_opreturn_e,
        ]:
            e.setText("")
            e.setFrozen(False)
        self.payto_e.setHidden(False)
        self.payto_label.setHidden(False)
        self.max_button.setDisabled(False)
        self.opreturn_rawhex_cb.setChecked(False)
        self.opreturn_rawhex_cb.setDisabled(False)
        self.set_pay_from([])
        self.tx_external_keypairs = {}
        self.message_opreturn_e.setVisible(self.config.get("enable_opreturn", False))
        self.opreturn_rawhex_cb.setVisible(self.config.get("enable_opreturn", False))
        self.opreturn_label.setVisible(self.config.get("enable_opreturn", False))
        self.window.update_status()

    def get_coins(self, isInvoice=False):
        if self.pay_from:
            coins = copy.deepcopy(self.pay_from)
        else:
            coins = self.wallet.get_spendable_coins(None, self.config, isInvoice)
        # may modify coins -- used by CashFusion if the 'spend only fused coins' option
        # is enabled
        run_hook("spendable_coin_filter", self.wallet, self.tx_external_keypairs, coins)
        if self.pay_from:
            # coins may have been filtered, so indicate this in the UI
            self.redraw_from_list(spendable=coins)
        return coins

    def spend_coins(self, coins):
        self.set_pay_from(coins)
        self.show_tab_signal.emit()
        self.update_fee()

    def paytomany(self):
        self.show_tab_signal.emit()
        self.do_clear()
        self.payto_e.paytomany()
        msg = "\n".join(
            [
                _("Enter a list of outputs in the 'Pay to' field."),
                _("One output per line."),
                _("Format: address, amount"),
                _("You may load a CSV file using the file icon."),
            ]
        )
        self.show_message(msg, title=_("Pay to many"))

    def payto_payees(self, payees: List[str]):
        """Like payto_contacts except it accepts a list of free-form strings
        rather than requiring a list of Contacts objects"""
        if len(payees) == 1:
            self.payto_e.setText(payees[0])
            self.amount_e.setFocus()
        else:
            text = "\n".join([payee + ", 0" for payee in payees])
            self.payto_e.setText(text)
            self.payto_e.setFocus()

    def do_pay_invoice(self, key):
        pr = self.wallet.invoices.get(key)
        self.payment_request = pr
        self.prepare_for_payment_request()
        pr.error = None  # this forces verify() to re-run
        if pr.verify(self.wallet.contacts):
            self.payment_request_ok()
        else:
            self.payment_request_error()

    def do_load_pay_invoice(self):
        filename, _selected_filter = QtWidgets.QFileDialog.getOpenFileName(
            self,
            _("Load invoice from file"),
            filter="JSON file (*.json);;All files (*)",
        )

        if not filename:
            return

        invoice = load_invoice_from_file_and_show_error_message(filename, self)
        try:
            xec_amount = invoice.get_xec_amount()
        except ExchangeRateApiError as e:
            QtWidgets.QMessageBox.critical(
                self,
                _("Exchange rate API error"),
                _("An error was raised while trying to fetch the exchange rate:")
                + f"\n\n{e.reason}",
            )
            return

        amount_str = format_satoshis_plain(
            int(xec_amount * 100), self.get_decimal_point()
        )
        computed_rate = invoice.amount / xec_amount
        if invoice is None:
            return
        self.show_tab_signal.emit()
        self.payto_e.setText(invoice.address.to_ui_string())
        self.amount_e.setText(amount_str)
        self.message_e.setText(invoice.label)
        # signal to set fee
        self.amount_e.textEdited.emit("")

        QtWidgets.QMessageBox.warning(
            self,
            _("Paying invoice"),
            _(
                "You are about to use the experimental 'Pay Invoice' feature. Please "
                "review the XEC amount carefully before sending the transaction."
            )
            + f"\n\nAddress: {invoice.address.to_ui_string()}"
            f"\n\nAmount ({base_unit(self.config)}): {amount_str}"
            f"\n\nLabel: {invoice.label}"
            f"\n\nInvoice currency: {invoice.currency}"
            f"\n\nExchange rate ({invoice.currency}/XEC): "
            f"{1 if invoice.exchange_rate is None else computed_rate:.10f}",
        )

    def sweep_key_dialog(self):
        addresses = self.wallet.get_unused_addresses()
        if not addresses:
            try:
                addresses = self.wallet.get_receiving_addresses()
            except AttributeError:
                addresses = self.wallet.get_addresses()
        if not addresses:
            self.show_warning(_("Wallet has no address to sweep to"))
            return

        d = WindowModalDialog(self.top_level_window(), title=_("Sweep private keys"))
        d.setMinimumSize(600, 300)

        vbox = QtWidgets.QVBoxLayout(d)
        bip38_warn_label = QtWidgets.QLabel(
            _(
                "<b>BIP38 support is disabled because a requisite library is not"
                " installed.</b> Please install 'cryptodomex' or omit BIP38 private"
                " keys (private keys starting in 6P...). Decrypt keys to WIF format"
                " (starting with 5, K, or L) in order to sweep."
            )
        )
        bip38_warn_label.setWordWrap(True)
        bip38_warn_label.setHidden(True)
        vbox.addWidget(bip38_warn_label)
        extra = ""
        if is_bip38_available():
            extra += " " + _("or BIP38 keys")
        vbox.addWidget(QtWidgets.QLabel(_("Enter private keys") + extra + " :"))

        keys_e = ScanQRTextEdit(self.config, allow_multi=True)
        keys_e.setTabChangesFocus(True)
        vbox.addWidget(keys_e)

        h, addr_combo = address_combo(addresses)
        vbox.addLayout(h)

        vbox.addStretch(1)
        sweep_button = OkButton(d, _("Sweep"))
        vbox.addLayout(Buttons(CancelButton(d), sweep_button))

        def get_address_text():
            return addr_combo.currentText()

        def get_priv_keys():
            return keystore.get_private_keys(keys_e.toPlainText(), allow_bip38=True)

        def has_bip38_keys_but_no_bip38():
            if is_bip38_available():
                return False
            keys = [k for k in keys_e.toPlainText().split() if k]
            return any(is_bip38_key(k) for k in keys)

        def enable_sweep():
            bad_bip38 = has_bip38_keys_but_no_bip38()
            sweepok = bool(get_address_text() and not bad_bip38 and get_priv_keys())
            sweep_button.setEnabled(sweepok)
            bip38_warn_label.setHidden(not bad_bip38)

        keys_e.textChanged.connect(enable_sweep)
        enable_sweep()
        res = d.exec_()
        d.setParent(None)
        if not res:
            return

        try:
            self.do_clear()
            keys = get_priv_keys()
            bip38s = {}
            for i, k in enumerate(keys):
                if is_bip38_key(k):
                    bip38s[k] = i
            if bip38s:
                # For all the BIP38s detected, prompt for password
                d2 = Bip38Importer(bip38s.keys(), parent=self.top_level_window())
                d2.exec_()
                d2.setParent(None)
                if d2.decoded_keys:
                    for k, tup in d2.decoded_keys.items():
                        wif, adr = tup
                        # rewrite the keys they specified with the decrypted WIF in the keys list for sweep_preparations to work below...
                        i = bip38s[k]
                        keys[i] = wif
                else:
                    self.show_message(_("User cancelled"))
                    return
            inputs, keypairs = sweep_preparations(keys, self.network)
            self.tx_external_keypairs = keypairs
            self.payto_e.setText(get_address_text())
            self.spend_coins([inp.to_coin_dict() for inp in inputs])
            self.spend_max()
        except Exception as e:
            self.show_message(str(e))
            return
        self.payto_e.setFrozen(True)
        self.amount_e.setFrozen(True)
        self.warn_if_watching_only()

    def on_toggled_opreturn(self, b):
        if not b:
            self.message_opreturn_e.setText("")
            self.op_return_toolong = False
        for x in self.send_tab_opreturn_widgets:
            x.setVisible(b)

    def update_buttons_on_seed(self):
        self.send_button.setVisible(not self.wallet.is_watching_only())
        self.preview_button.setVisible(True)

    def timer_actions(self):
        # resolve aliases
        # FIXME this is a blocking network call that has a timeout of 5 sec
        self.payto_e.resolve()
        # update fee
        if self.require_fee_update:
            self.do_update_fee()
            self.require_fee_update = False

    def update_unit(self, decimal_point):
        self.amount_e.update_unit(decimal_point)
        self.fee_e.update_unit(decimal_point)
