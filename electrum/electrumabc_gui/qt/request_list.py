#!/usr/bin/env python3
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

from typing import TYPE_CHECKING

from PyQt5 import QtWidgets
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QIcon

from electrumabc.address import Address
from electrumabc.i18n import _
from electrumabc.paymentrequest import PR_UNKNOWN, pr_tooltips
from electrumabc.plugins import run_hook
from electrumabc.util import age, format_time

from .util import MyTreeWidget, pr_icons

if TYPE_CHECKING:
    from .main_window import ElectrumWindow


class RequestList(MyTreeWidget):
    # Date, Account, Address, Description, Amount
    filter_columns = [0, 1, 2, 3, 4]

    def __init__(self, main_window: ElectrumWindow):
        MyTreeWidget.__init__(
            self,
            main_window,
            [_("Date"), _("Address"), "", _("Description"), _("Amount"), _("Status")],
            config=main_window.config,
            wallet=main_window.wallet,
            stretch_column=3,
            deferred_updates=False,
        )
        self.main_window = main_window
        self.customContextMenuRequested.connect(self.create_menu)
        self.currentItemChanged.connect(self.item_changed)
        self.itemClicked.connect(self.item_changed)
        self.setSortingEnabled(True)
        self.setColumnWidth(0, 180)
        self.hideColumn(1)

    def item_changed(self, item):
        if item is None:
            return
        if not item.isSelected():
            return
        addr = item.data(0, Qt.UserRole)
        req = self.wallet.receive_requests.get(addr)
        if not req:
            return
        expires = age(req["time"] + req["exp"]) if req.get("exp") else _("Never")
        amount = req["amount"]
        opr = req.get("op_return") or req.get("op_return_raw")
        opr_is_raw = bool(req.get("op_return_raw"))
        message = self.wallet.labels.get(addr.to_storage_string(), "")
        self.main_window.receive_address = addr
        self.main_window.receive_address_e.setText(addr.to_ui_string())
        self.main_window.receive_message_e.setText(message)
        self.main_window.receive_amount_e.setAmount(amount)
        self.main_window.expires_combo.hide()
        self.main_window.expires_label.show()
        self.main_window.expires_label.setText(expires)
        self.main_window.receive_opreturn_rawhex_cb.setChecked(opr_is_raw)
        self.main_window.receive_opreturn_e.setText(opr or "")
        self.main_window.save_request_button.setEnabled(False)

    def select_item_by_address(self, address):
        self.setCurrentItem(None)
        for i in range(self.topLevelItemCount()):
            item = self.topLevelItem(i)
            if item and item.data(0, Qt.UserRole) == address:
                self.setCurrentItem(item)
                return

    def on_edited(self, item, column, prior):
        """Called only when the text in the memo field actually changes.
        Updates the UI and re-saves the request."""
        super().on_edited(item, column, prior)
        self.setCurrentItem(item)
        addr = item.data(0, Qt.UserRole)
        req = self.wallet.receive_requests.get(addr)
        if req:
            self.main_window.save_payment_request()

    def chkVisible(self):
        # hide receive tab if no receive requests available
        b = len(self.wallet.receive_requests) > 0 and self.main_window.isVisible()
        self.setVisible(b)
        self.main_window.receive_requests_label.setVisible(b)
        if not b:
            self.main_window.expires_label.hide()
            self.main_window.expires_combo.show()

    def on_update(self):
        self.chkVisible()

        # update the receive address if necessary
        current_address_string = self.main_window.receive_address_e.text().strip()
        current_address = (
            Address.from_string(current_address_string)
            if len(current_address_string)
            else None
        )
        domain = self.wallet.get_receiving_addresses()
        addr = self.wallet.get_unused_address()
        if current_address not in domain and addr:
            self.main_window.set_receive_address(addr)

        # clear the list and fill it again
        item = self.currentItem()
        prev_sel = item.data(0, Qt.UserRole) if item else None
        self.clear()
        for req in self.wallet.get_sorted_requests(self.config):
            address = req["address"]
            if address not in domain:
                continue
            timestamp = req.get("time", 0)
            amount = req.get("amount")
            message = req.get("memo", "")
            date = format_time(timestamp)
            status = req.get("status")
            signature = req.get("sig")
            requestor = req.get("name", "")
            amount_str = self.main_window.format_amount(amount) if amount else ""
            item = QtWidgets.QTreeWidgetItem(
                [
                    date,
                    address.to_ui_string(),
                    "",
                    message,
                    amount_str,
                    _(pr_tooltips.get(status, "")),
                ]
            )
            item.setData(0, Qt.UserRole, address)
            if signature is not None:
                item.setIcon(2, QIcon(":icons/seal.svg"))
                item.setToolTip(2, "signed by " + requestor)
            if status is not PR_UNKNOWN:
                item.setIcon(6, QIcon(pr_icons.get(status)))
            self.addTopLevelItem(item)
            if prev_sel == address:
                self.setCurrentItem(item)

    def create_menu(self, position):
        item = self.itemAt(position)
        if not item:
            return
        self.setCurrentItem(item)  # sometimes it's not the current item.
        addr = item.data(0, Qt.UserRole)
        column = self.currentColumn()
        column_title = self.headerItem().text(column)
        column_data = item.text(column)
        menu = QtWidgets.QMenu(self)
        menu.addAction(
            _("Copy {}").format(column_title),
            lambda: self.main_window.app.clipboard().setText(column_data.strip()),
        )
        menu.addAction(
            _("Copy URI"),
            lambda: self.main_window.view_and_paste(
                "URI", "", self.main_window.get_request_URI(addr)
            ),
        )
        menu.addAction(
            _("Save as BIP70 file"),
            lambda: self.main_window.export_payment_request(addr),
        )
        menu.addAction(
            _("Delete"), lambda: self.main_window.delete_payment_request(addr)
        )
        run_hook("receive_list_menu", menu, addr)
        menu.exec_(self.viewport().mapToGlobal(position))
