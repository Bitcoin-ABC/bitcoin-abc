#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2015 Thomas Voegtlin
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

import os
from typing import TYPE_CHECKING

from qtpy import QtWidgets
from qtpy.QtCore import Qt, Signal
from qtpy.QtGui import QFont, QIcon

from electrumabc.amount import format_amount
from electrumabc.i18n import _
from electrumabc.paymentrequest import PR_UNPAID, pr_tooltips
from electrumabc.util import FileImportFailed, format_time

from .tree_widget import MyTreeWidget, pr_icons
from .util import MONOSPACE_FONT

if TYPE_CHECKING:
    from .main_window import ElectrumWindow


class InvoiceList(MyTreeWidget):
    filter_columns = [0, 1, 2, 3]  # Date, Requestor, Description, Amount
    visibility_changed = Signal(bool)
    pay_invoice_signal = Signal(str)
    delete_invoice_signal = Signal(str)

    def __init__(self, main_window: ElectrumWindow):
        MyTreeWidget.__init__(
            self,
            [_("Expires"), _("Requestor"), _("Description"), _("Amount"), _("Status")],
            config=main_window.config,
            wallet=main_window.wallet,
            stretch_column=2,
        )
        self.main_window = main_window
        self.customContextMenuRequested.connect(self.create_menu)
        self.setSortingEnabled(True)
        self.header().setSectionResizeMode(1, QtWidgets.QHeaderView.Interactive)
        self.setColumnWidth(1, 200)

    def on_update(self):
        inv_list = self.wallet.invoices.unpaid_invoices()
        self.clear()
        for pr in inv_list:
            key = pr.get_id()
            status = self.wallet.invoices.get_status(key)
            if status is None:
                continue
            requestor = pr.get_requestor()
            exp = pr.get_expiration_date()
            date_str = format_time(exp) if exp else _("Never")
            item = QtWidgets.QTreeWidgetItem(
                [
                    date_str,
                    requestor,
                    pr.memo,
                    format_amount(pr.get_amount(), self.config, whitespaces=True),
                    _(pr_tooltips.get(status, "")),
                ]
            )
            item.setIcon(4, QIcon(pr_icons.get(status)))
            item.setData(0, Qt.UserRole, key)
            item.setFont(1, QFont(MONOSPACE_FONT))
            item.setFont(3, QFont(MONOSPACE_FONT))
            self.addTopLevelItem(item)
        self.setCurrentItem(self.topLevelItem(0))
        was_visible = self.isVisible()
        should_be_visible = len(inv_list) > 0
        self.setVisible(should_be_visible)
        if should_be_visible != was_visible:
            self.visibility_changed.emit(should_be_visible)

    def import_invoices(self):
        wallet_folder = os.path.dirname(os.path.abspath(self.config.get_wallet_path()))
        filename, __ = QtWidgets.QFileDialog.getOpenFileName(
            self.main_window, _("Select your invoice file"), wallet_folder
        )
        if not filename:
            return
        try:
            self.wallet.invoices.import_file(filename)
        except FileImportFailed as e:
            self.main_window.show_message(str(e))
        self.on_update()

    def create_menu(self, position):
        menu = QtWidgets.QMenu()
        item = self.itemAt(position)
        if not item:
            return
        key = item.data(0, Qt.UserRole)
        column = self.currentColumn()
        column_title = self.headerItem().text(column)
        column_data = item.text(column)
        self.wallet.invoices.get(key)
        status = self.wallet.invoices.get_status(key)
        if column_data:
            menu.addAction(
                _("Copy {}").format(column_title),
                lambda: self.main_window.app.clipboard().setText(column_data.strip()),
            )
        menu.addAction(_("Details"), lambda: self.main_window.show_invoice(key))
        if status == PR_UNPAID:
            menu.addAction(_("Pay Now"), lambda: self.pay_invoice_signal.emit(key))
        menu.addAction(_("Delete"), lambda: self.delete_invoice_signal.emit(key))
        menu.exec_(self.viewport().mapToGlobal(position))
