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

from collections import defaultdict
from enum import IntEnum
from typing import TYPE_CHECKING, List

from PyQt5 import QtWidgets
from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtGui import QFont, QIcon

import electrumabc.web as web
from electrumabc.address import Address
from electrumabc.constants import PROJECT_NAME, SCRIPT_NAME
from electrumabc.contacts import Contact, contact_types
from electrumabc.i18n import _
from electrumabc.plugins import run_hook
from electrumabc.printerror import PrintError

from .util import MONOSPACE_FONT, ColorScheme, MyTreeWidget, rate_limited, webopen

if TYPE_CHECKING:
    from .main_window import ElectrumWindow


class ContactList(PrintError, MyTreeWidget):
    # Name, Label, Address
    filter_columns = [1, 2, 3]

    do_update_signal = pyqtSignal()

    class DataRoles(IntEnum):
        Contact = Qt.UserRole + 0

    def __init__(self, main_window: ElectrumWindow):
        MyTreeWidget.__init__(
            self,
            main_window,
            headers=["", _("Name"), _("Label"), _("Address"), _("Type")],
            config=main_window.config,
            wallet=main_window.wallet,
            stretch_column=2,
            editable_columns=[1, 2],
            deferred_updates=True,
        )
        self.main_window = main_window
        self.customContextMenuRequested.connect(self.create_menu)
        self.setSelectionMode(QtWidgets.QAbstractItemView.ExtendedSelection)
        self.setSortingEnabled(True)
        self.sortItems(1, Qt.AscendingOrder)
        self.setIndentation(0)
        self._edited_item_cur_sel = (None,) * 3
        self.monospace_font = QFont(MONOSPACE_FONT)
        self.cleaned_up = False
        self.do_update_signal.connect(self.update)
        self.icon_openalias = QIcon(":icons/openalias-logo.svg")
        self.icon_contacts = QIcon(":icons/tab_contacts.png")
        self.icon_unverif = QIcon(":/icons/unconfirmed.svg")

        self.main_window.gui_object.addr_fmt_changed.connect(self.update)

    def clean_up(self):
        self.cleaned_up = True
        try:
            self.do_update_signal.disconnect(self.update)
        except TypeError:
            pass
        try:
            self.main_window.gui_object.addr_fmt_changed.disconnect(self.update)
        except TypeError:
            pass

    def on_permit_edit(self, item, column):
        # openalias items shouldn't be editable
        if column == 2:  # Label, always editable
            return True
        return item.data(0, self.DataRoles.Contact).type == "address"

    def on_edited(self, item, column, prior_value):
        contact = item.data(0, self.DataRoles.Contact)
        if column == 2:  # Label
            label_key = contact.address
            try:
                label_key = Address.from_string(label_key).to_storage_string()
            except Exception:
                pass
            self.wallet.set_label(label_key, item.text(2))
            self.update()  # force refresh in case 2 contacts use the same address
            return
        # else.. Name
        typ = contact.type
        was_cur, was_sel = bool(self.currentItem()), item.isSelected()
        name, value = item.text(1), item.text(3)
        del item  # paranoia

        key = self.main_window.set_contact(name, value, typ=typ, replace=contact)

        if key:
            # Due to deferred updates, on_update will actually be called later.
            # So, we have to save the edited item's "current" and "selected"
            # status here. 'on_update' will look at this tuple and clear it
            # after updating.
            self._edited_item_cur_sel = (key, was_cur, was_sel)

    def import_contacts(self):
        wallet_folder = self.main_window.get_wallet_folder()
        filename, __ = QtWidgets.QFileDialog.getOpenFileName(
            self.main_window, "Select your wallet file", wallet_folder
        )
        if not filename:
            return
        try:
            num = self.main_window.contacts.import_file(filename)
            self.main_window.show_message(
                _("{} contacts successfully imported.").format(num)
            )
        except Exception as e:
            self.main_window.show_error(
                _(f"{PROJECT_NAME} was unable to import your contacts.")
                + "\n"
                + repr(e)
            )
        self.on_update()

    def export_contacts(self):
        if self.main_window.contacts.empty:
            self.main_window.show_error(_("Your contact list is empty."))
            return
        try:
            fileName = self.main_window.getSaveFileName(
                _("Select file to save your contacts"),
                f"{SCRIPT_NAME}-contacts.json",
                "*.json",
            )
            if fileName:
                num = self.main_window.contacts.export_file(fileName)
                self.main_window.show_message(
                    _("{} contacts exported to '{}'").format(num, fileName)
                )
        except Exception as e:
            self.main_window.show_error(
                _(f"{PROJECT_NAME} was unable to export your contacts.")
                + "\n"
                + repr(e)
            )

    def find_item(self, key: Contact) -> QtWidgets.QTreeWidgetItem:
        """Rather than store the item reference in a lambda, we store its key.
        Storing the item reference can lead to C++ Runtime Errors if the
        underlying QTreeWidgetItem is deleted on .update() while the right-click
        menu is still up. This function returns a currently alive item given a
        key."""
        for item in self.get_leaves():
            if item.data(0, self.DataRoles.Contact) == key:
                return item

    def _on_edit_item(self, key: Contact, column: int):
        """Callback from context menu, private method."""
        item = self.find_item(key)
        if item:
            self.editItem(item, column)

    @staticmethod
    def _i2c(item: QtWidgets.QTreeWidgetItem) -> Contact:
        return item.data(0, ContactList.DataRoles.Contact)

    def create_menu(self, position):
        menu = QtWidgets.QMenu()
        selected = self.selectedItems()
        if selected:
            keys = [self._i2c(item) for item in selected]
            deletable_keys = [k for k in keys if k.type in contact_types]
            column = self.currentColumn()
            column_title = self.headerItem().text(column)
            column_data = "\n".join([item.text(column) for item in selected])
            item = self.currentItem()

            if len(selected) > 1:
                column_title += f" ({len(selected)})"
            menu.addAction(
                _("Copy {}").format(column_title),
                lambda: self.main_window.app.clipboard().setText(column_data),
            )
            if (
                item
                and column in self.editable_columns
                and self.on_permit_edit(item, column)
            ):
                key = item.data(0, self.DataRoles.Contact)
                # this key & find_item business is so we don't hold a reference
                # to the ephemeral item, which may be deleted while the
                # context menu is up.  Accessing the item after on_update runs
                # means the item is deleted and you get a C++ object deleted
                # runtime error.
                menu.addAction(
                    _("Edit {}").format(column_title),
                    lambda: self._on_edit_item(key, column),
                )
            a = menu.addAction(
                _("Pay to"), lambda: self.main_window.payto_contacts(keys)
            )
            if not keys:
                a.setDisabled(True)
            a = menu.addAction(
                _("Delete"), lambda: self.main_window.delete_contacts(deletable_keys)
            )
            if not deletable_keys:
                a.setDisabled(True)
            # Add sign/verify and encrypt/decrypt menu - but only if just 1 thing selected
            if len(keys) == 1 and Address.is_valid(keys[0].address):
                signAddr = Address.from_string(keys[0].address)
                a = menu.addAction(
                    _("Sign/verify message") + "...",
                    lambda: self.main_window.sign_verify_message(signAddr),
                )
                if signAddr.kind != Address.ADDR_P2PKH:
                    # We only allow this for P2PKH since it makes no sense for P2SH
                    # (ambiguous public key)
                    a.setDisabled(True)
            URLs = [
                web.BE_URL(
                    self.config,
                    web.ExplorerUrlParts.ADDR,
                    Address.from_string(key.address),
                )
                for key in keys
                if Address.is_valid(key.address)
            ]
            a = menu.addAction(
                _("View on block explorer"),
                lambda: [URL and webopen(URL) for URL in URLs],
            )
            if not any(URLs):
                a.setDisabled(True)
            menu.addSeparator()

        menu.addAction(
            self.icon_contacts,
            _("Add Contact") + " - " + _("Address"),
            self.main_window.new_contact_dialog,
        )
        menu.addSeparator()
        menu.addAction(
            QIcon(
                ":icons/import.svg"
                if not ColorScheme.dark_scheme
                else ":icons/import_dark_theme.svg"
            ),
            _("Import file"),
            self.import_contacts,
        )
        if not self.main_window.contacts.empty:
            menu.addAction(
                QIcon(
                    ":icons/save.svg"
                    if not ColorScheme.dark_scheme
                    else ":icons/save_dark_theme.svg"
                ),
                _("Export file"),
                self.export_contacts,
            )

        run_hook("create_contact_menu", menu, selected)
        menu.exec_(self.viewport().mapToGlobal(position))

    def get_full_contacts(self) -> List[Contact]:
        return self.main_window.contacts.get_all(nocopy=True)

    @rate_limited(
        0.333, ts_after=True
    )  # We rate limit the contact list refresh no more 3 per second
    def update(self):
        if self.cleaned_up:
            # short-cut return if window was closed and wallet is stopped
            return
        super().update()

    def on_update(self):
        if self.cleaned_up:
            return
        item = self.currentItem()
        current_contact = item.data(0, self.DataRoles.Contact) if item else None
        selected = self.selectedItems() or []
        selected_contacts = set(
            item.data(0, self.DataRoles.Contact) for item in selected
        )
        # must not hold a reference to a C++ object that will soon be deleted in
        # self.clear()..
        del item, selected
        self.clear()
        type_names = defaultdict(lambda: _("Unknown"))
        type_names.update(
            {
                "openalias": _("OpenAlias"),
                "address": _("Address"),
            }
        )
        type_icons = {
            "openalias": self.icon_openalias,
            "address": self.icon_contacts,
        }
        selected_items, current_item = [], None
        edited = self._edited_item_cur_sel
        for contact in self.get_full_contacts():
            _type, name, address = contact.type, contact.name, contact.address
            label_key = address
            if _type == "address":
                try:
                    # try and re-parse and re-display the address based on current UI string settings
                    addy = Address.from_string(address)
                    address = addy.to_ui_string()
                    label_key = addy.to_storage_string()
                    del addy
                except Exception:
                    """This may happen because we may not have always enforced this as strictly as we could have in legacy code. Just move on.."""
            label = self.wallet.get_label(label_key)
            item = QtWidgets.QTreeWidgetItem(
                ["", name, label, address, type_names[_type]]
            )
            item.setData(0, self.DataRoles.Contact, contact)
            item.DataRole = self.DataRoles.Contact
            if _type in type_icons:
                item.setIcon(4, type_icons[_type])
            # always give the "Address" field a monospace font even if it's
            # not strictly an address such as openalias...
            item.setFont(3, self.monospace_font)
            self.addTopLevelItem(item)
            if contact == current_contact or (contact == edited[0] and edited[1]):
                current_item = (
                    item  # this key was the current item before and it hasn't gone away
                )
            if contact in selected_contacts or (contact == edited[0] and edited[2]):
                selected_items.append(
                    item
                )  # this key was selected before and it hasn't gone away

        if (
            selected_items
        ):  # sometimes currentItem is set even if nothing actually selected. grr..
            # restore current item & selections
            if current_item:
                # set the current item. this may also implicitly select it
                self.setCurrentItem(current_item)
            for item in selected_items:
                # restore the previous selection
                item.setSelected(True)
        self._edited_item_cur_sel = (None,) * 3
        run_hook("update_contacts_tab", self)
