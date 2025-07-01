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

from contextlib import suppress
from enum import IntEnum
from functools import partial
from typing import TYPE_CHECKING, List

from qtpy import QtWidgets
from qtpy.QtCore import Qt, Signal
from qtpy.QtGui import QFont, QKeySequence

import electrumabc.web as web
from electrumabc import networks
from electrumabc.address import Address
from electrumabc.i18n import _
from electrumabc.plugins import run_hook
from electrumabc.util import profiler
from electrumabc.wallet import MultisigWallet

from .consolidate_coins_dialog import ConsolidateCoinsWizard
from .invoice_dialog import InvoiceDialog
from .tree_widget import MyTreeWidget
from .util import (
    MONOSPACE_FONT,
    ColorScheme,
    SortableTreeWidgetItem,
    rate_limited,
    webopen,
)

if TYPE_CHECKING:
    from .main_window import ElectrumWindow


class AddressList(MyTreeWidget):
    # Address, Label, Balance
    filter_columns = [0, 1, 2]

    class DataRoles(IntEnum):
        address = Qt.UserRole + 0
        can_edit_label = Qt.UserRole + 1

    # Emits the total number of satoshis for coins on selected addresses.
    selected_amount_changed = Signal("quint64")
    selection_cleared = Signal()

    def __init__(self, main_window: ElectrumWindow, *, picker=False):
        super().__init__(
            [],
            config=main_window.config,
            wallet=main_window.wallet,
            stretch_column=2,
            deferred_updates=True,
        )
        self.main_window = main_window
        self.customContextMenuRequested.connect(self.create_menu)
        self.refresh_headers()
        self.picker = picker
        if self.picker:
            self.setSelectionMode(QtWidgets.QAbstractItemView.SingleSelection)
            self.editable_columns = []
        else:
            self.setSelectionMode(QtWidgets.QAbstractItemView.ExtendedSelection)
        self.setSortingEnabled(True)
        self.monospace_font = QFont(MONOSPACE_FONT)
        assert self.wallet
        self.cleaned_up = False

        self.main_window.gui_object.addr_fmt_changed.connect(self.update)
        self.selectionModel().selectionChanged.connect(self._emit_selection_signals)

    def clean_up(self):
        self.cleaned_up = True
        # paranoia -- we have seen Qt not clean up the signal before the object is
        # destroyed on Python 3.7.3 PyQt 5.12.3, see #1531
        with suppress(TypeError):
            self.main_window.gui_object.addr_fmt_changed.disconnect(self.update)

    def filter(self, p):
        """Reimplementation from superclass filter.  Chops off the
        "ecash:" prefix so that address filters ignore this prefix.
        Closes #1440."""
        cashaddr_prefix = f"{networks.net.CASHADDR_PREFIX}:".lower()
        p = p.strip()
        if len(p) > len(cashaddr_prefix) and p.lower().startswith(cashaddr_prefix):
            # chop off prefix
            p = p[len(cashaddr_prefix) :]
        # call super on chopped-off-piece
        super().filter(p)

    def refresh_headers(self):
        headers = [_("Address"), _("Index"), _("Label"), _("Balance"), _("Tx")]
        fx = self.main_window.fx
        if fx and fx.get_fiat_address_config():
            headers.insert(4, f"{fx.get_currency()} {_('Balance')}")
        self.update_headers(headers)

    # We rate limit the address list refresh no more than once every second
    @rate_limited(1.0, ts_after=True)
    def update(self):
        if self.cleaned_up:
            # short-cut return if window was closed and wallet is stopped
            return
        super().update()

    def get_selected_addresses(self) -> List[Address]:
        data = [item.data(0, self.DataRoles.address) for item in self.selectedItems()]
        # item.data can return None for root nodes in the tree
        return [a for a in data if a is not None]

    @profiler
    def on_update(self):
        # Recursively builds the path for an item eg 'parent_name/item_name'
        def item_path(item):
            return (
                item.text(0)
                if not item.parent()
                else item_path(item.parent()) + "/" + item.text(0)
            )

        def remember_expanded_items(root):
            # Save the set of expanded items... so that address list updates don't
            # annoyingly collapse our tree list widget due to the update. This function
            # recurses. Pass self.invisibleRootItem().
            expanded_item_names = set()
            for i in range(0, root.childCount()):
                it = root.child(i)
                if it and it.childCount():
                    if it.isExpanded():
                        expanded_item_names.add(item_path(it))
                    # recurse
                    expanded_item_names |= remember_expanded_items(it)
            return expanded_item_names

        def restore_expanded_items(root, expanded_item_names):
            # Recursively restore the expanded state saved previously.
            # Pass self.invisibleRootItem().
            for i in range(0, root.childCount()):
                it = root.child(i)
                if it and it.childCount():
                    # recurse, do leaves first
                    restore_expanded_items(it, expanded_item_names)
                    old = bool(it.isExpanded())
                    new = item_path(it) in expanded_item_names
                    if old != new:
                        it.setExpanded(new)

        had_item_count = self.topLevelItemCount()
        sels = self.selectedItems()
        addresses_to_re_select = {item.data(0, self.DataRoles.address) for item in sels}
        expanded_item_names = remember_expanded_items(self.invisibleRootItem())
        # avoid keeping reference to about-to-be delete C++ objects
        del sels
        self.clear()
        # Note we take a shallow list-copy because we want to avoid
        # race conditions with the wallet while iterating here. The wallet may
        # touch/grow the returned lists at any time if a history comes (it
        # basically returns a reference to its own internal lists). The wallet
        # may then, in another thread such as the Synchronizer thread, grow
        # the receiving or change addresses on Deterministic wallets.  While
        # probably safe in a language like Python -- and especially since
        # the lists only grow at the end, we want to avoid bad habits.
        # The performance cost of the shallow copy below is negligible for 10k+
        # addresses even on huge wallets because, I suspect, internally CPython
        # does this type of operation extremely cheaply (probably returning
        # some copy-on-write-semantics handle to the same list).
        receiving_addresses = list(self.wallet.get_receiving_addresses())
        change_addresses = list(self.wallet.get_change_addresses())

        if self.main_window.fx and self.main_window.fx.get_fiat_address_config():
            fx = self.main_window.fx
        else:
            fx = None
        account_item = self
        sequences = [0, 1] if change_addresses else [0]
        items_to_re_select = []
        for is_change in sequences:
            if len(sequences) > 1:
                name = _("Receiving") if not is_change else _("Change")
                seq_item = QtWidgets.QTreeWidgetItem([name, "", "", "", "", ""])
                account_item.addChild(seq_item)
                # first time we create this widget, auto-expand the default address list
                if not had_item_count:
                    seq_item.setExpanded(True)
                    expanded_item_names.add(item_path(seq_item))
            else:
                seq_item = account_item
            hidden_item = QtWidgets.QTreeWidgetItem(
                [_("Empty") if is_change else _("Used"), "", "", "", "", ""]
            )
            has_hidden = False
            addr_list = change_addresses if is_change else receiving_addresses
            for n, address in enumerate(addr_list):
                num = len(self.wallet.get_address_history(address))
                if is_change:
                    is_hidden = self.wallet.is_empty(address)
                else:
                    is_hidden = self.wallet.is_used(address)
                balance = sum(self.wallet.get_addr_balance(address))
                address_text = address.to_ui_string()
                label = self.wallet.labels.get(address.to_storage_string(), "")
                balance_text = self.main_window.format_amount(balance, whitespaces=True)
                columns = [address_text, str(n), label, balance_text, str(num)]
                if fx:
                    rate = fx.exchange_rate()
                    fiat_balance = fx.value_str(balance, rate)
                    columns.insert(4, fiat_balance)
                address_item = SortableTreeWidgetItem(columns)
                address_item.setTextAlignment(3, Qt.AlignRight | Qt.AlignVCenter)
                address_item.setFont(3, self.monospace_font)
                if fx:
                    address_item.setTextAlignment(4, Qt.AlignRight | Qt.AlignVCenter)
                    address_item.setFont(4, self.monospace_font)

                # Set col0 address font to monospace
                address_item.setFont(0, self.monospace_font)

                # Set UserRole data items:
                address_item.setData(0, self.DataRoles.address, address)
                # label can be edited
                address_item.setData(0, self.DataRoles.can_edit_label, True)

                if self.wallet.is_frozen(address):
                    address_item.setBackground(0, ColorScheme.BLUE.as_color(True))
                    address_item.setToolTip(
                        0, _("Address is frozen, right-click to unfreeze")
                    )
                if self.wallet.is_beyond_limit(address, is_change):
                    address_item.setBackground(0, ColorScheme.RED.as_color(True))
                if is_change and self.wallet.is_retired_change_addr(address):
                    address_item.setForeground(0, ColorScheme.GRAY.as_color())
                    old_tt = address_item.toolTip(0)
                    if old_tt:
                        old_tt += "\n"
                    address_item.setToolTip(0, old_tt + _("Change address is retired"))
                if is_hidden:
                    if not has_hidden:
                        seq_item.insertChild(0, hidden_item)
                        has_hidden = True
                    hidden_item.addChild(address_item)
                else:
                    seq_item.addChild(address_item)
                if address in addresses_to_re_select:
                    items_to_re_select.append(address_item)

        for item in items_to_re_select:
            # NB: Need to select the item at the end because internally Qt does some
            # index magic to pick out the selected item and the above code mutates
            # the TreeList, invalidating indices and other craziness, which might
            # produce UI glitches. See #1042
            item.setSelected(True)

        # Now, at the very end, enforce previous UI state with respect to what was
        # expanded or not. See #1042
        restore_expanded_items(self.invisibleRootItem(), expanded_item_names)

    def create_menu(self, position):
        if self.picker:
            # picker mode has no menu
            return

        is_multisig = isinstance(self.wallet, MultisigWallet)
        can_delete = self.wallet.can_delete_address()
        addrs = self.get_selected_addresses()
        multi_select = len(addrs) > 1
        if not addrs:
            return

        menu = QtWidgets.QMenu()

        def doCopy(txt):
            txt = txt.strip()
            self.main_window.copy_to_clipboard(txt)

        col = self.currentColumn()
        column_title = self.headerItem().text(col)

        if not multi_select:
            item = self.itemAt(position)
            if not item:
                return
            if not addrs:
                item.setExpanded(not item.isExpanded())
                return
            addr = addrs[0]

            alt_copy_text, alt_column_title = None, None
            if col == 0:
                copy_text = addr.to_ui_string()
                if Address.FMT_UI == Address.FMT_LEGACY:
                    alt_copy_text, alt_column_title = addr.to_full_string(
                        Address.FMT_CASHADDR
                    ), _("Cash Address")
                else:
                    alt_copy_text, alt_column_title = addr.to_full_string(
                        Address.FMT_LEGACY
                    ), _("Legacy Address")
            else:
                copy_text = item.text(col)
            menu.addAction(_("Copy {}").format(column_title), lambda: doCopy(copy_text))
            if alt_copy_text and alt_column_title:
                # Add 'Copy Legacy Address' and 'Copy Cash Address' alternates if
                # right-click is on column 0
                menu.addAction(
                    _("Copy {}").format(alt_column_title), lambda: doCopy(alt_copy_text)
                )
            a = menu.addAction(
                _("Details") + "...", lambda: self.main_window.show_address(addr)
            )
            if col in self.editable_columns:
                # NB: C++ item may go away if this widget is refreshed while menu is up
                # -- so need to re-grab and not store in lamba. See #953
                menu.addAction(
                    _("Edit {}").format(column_title),
                    lambda: self.editItem(self.itemAt(position), col),
                )
            a = menu.addAction(
                _("Request payment"), lambda: self.main_window.receive_at(addr)
            )
            if self.wallet.get_num_tx(addr) or self.wallet.has_payment_request(addr):
                # This address cannot be used for a payment request because
                # the receive tab will refuse to display it and will instead
                # create a request with a new address, if we were to call
                # self.main_window.receive_at(addr). This is because the receive tab
                # now strongly enforces no-address-reuse. See #1552.
                a.setDisabled(True)
            a = menu.addAction(
                _("Request payment (via invoice file)"),
                lambda: self.create_invoice(addr),
            )
            if self.wallet.can_export():
                menu.addAction(
                    _("Private key"), lambda: self.main_window.show_private_key(addr)
                )
            if not is_multisig and not self.wallet.is_watching_only():
                menu.addAction(
                    _("Sign/verify message") + "...",
                    lambda: self.main_window.sign_verify_message(addr),
                )
                menu.addAction(
                    _("Encrypt/decrypt message") + "...",
                    lambda: self.main_window.encrypt_message(addr),
                )
            if can_delete:
                menu.addAction(
                    _("Remove from wallet"),
                    lambda: self.main_window.remove_address(addr),
                )
            addr_URL = web.BE_URL(self.config, web.ExplorerUrlParts.ADDR, addr)
            if addr_URL:
                menu.addAction(_("View on block explorer"), lambda: webopen(addr_URL))
            menu.addAction(
                "Consolidate coins for address",
                lambda: self._open_consolidate_coins_dialog(addr),
            )

        elif col > -1:
            # multi-select
            texts, alt_copy, alt_copy_text = None, None, None
            if col == 0:  # address column
                texts = [a.to_ui_string() for a in addrs]
                # Add additional copy option: "Address, Balance (n)"
                alt_copy = (
                    _("Copy {}").format(_("Address") + ", " + _("Balance"))
                    + f" ({len(addrs)})"
                )
                alt_copy_text = "\n".join(
                    [
                        a.to_ui_string()
                        + ", "
                        + self.main_window.format_amount(
                            sum(self.wallet.get_addr_balance(a))
                        )
                        for a in addrs
                    ]
                )
            else:
                texts = [i.text(col).strip() for i in self.selectedItems()]
                # omit empty items
                texts = [t for t in texts if t]
            if texts:
                copy_text = "\n".join(texts)
                menu.addAction(
                    _("Copy {}").format(column_title) + f" ({len(texts)})",
                    lambda: doCopy(copy_text),
                )
            if alt_copy and alt_copy_text:
                menu.addAction(alt_copy, lambda: doCopy(alt_copy_text))

        freeze = self.main_window.set_frozen_state
        if any(self.wallet.is_frozen(addr) for addr in addrs):
            menu.addAction(_("Unfreeze"), partial(freeze, addrs, False))
        if not all(self.wallet.is_frozen(addr) for addr in addrs):
            menu.addAction(_("Freeze"), partial(freeze, addrs, True))

        coins = self.wallet.get_spendable_coins(domain=addrs, config=self.config)
        if coins:
            menu.addAction(
                _("Spend from"), partial(self.main_window.spend_coins, coins)
            )

        run_hook("address_list_context_menu_setup", self, menu, addrs)

        run_hook("receive_menu", menu, addrs, self.wallet)
        menu.exec_(self.viewport().mapToGlobal(position))

    def keyPressEvent(self, event):
        if event.matches(QKeySequence.Copy) and self.currentColumn() == 0:
            addrs = self.get_selected_addresses()
            if addrs:
                text = addrs[0].to_ui_string()
                self.main_window.app.clipboard().setText(text)
        else:
            super().keyPressEvent(event)

    def update_labels(self):
        if self.should_defer_update_incr():
            return

        def update_recurse(root):
            child_count = root.childCount()
            for i in range(child_count):
                item = root.child(i)
                addr = item.data(0, self.DataRoles.address)
                if addr is not None:
                    # The address tree has non-leaf nodes that are not addresses
                    # ("Receiving", "Change", "Used", "Empty")
                    label = self.wallet.labels.get(addr.to_storage_string(), "")
                    item.setText(2, label)
                if item.childCount():
                    update_recurse(item)

        update_recurse(self.invisibleRootItem())

    def on_doubleclick(self, item, column):
        if self.permit_edit(item, column):
            super(AddressList, self).on_doubleclick(item, column)
        else:
            addr = item.data(0, self.DataRoles.address)
            if addr is not None:
                self.main_window.show_address(addr)

    def _open_consolidate_coins_dialog(self, addr):
        d = ConsolidateCoinsWizard(addr, self.wallet, self.main_window, parent=self)
        d.exec_()

    def create_invoice(self, address: Address):
        d = InvoiceDialog(self, self.main_window.fx)
        d.set_address(address)
        d.show()

    def _emit_selection_signals(self, *args, **kwargs):
        addrs = self.get_selected_addresses()
        self.selected_amount_changed.emit(
            sum(sum(self.wallet.get_addr_balance(addr)) for addr in addrs)
        )
        if not addrs:
            self.selection_cleared.emit()

    def hideEvent(self, e):
        super().hideEvent(e)
        self.selection_cleared.emit()

    def showEvent(self, e):
        super().showEvent(e)
        self._emit_selection_signals()
