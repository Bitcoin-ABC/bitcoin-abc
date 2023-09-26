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

import os
from collections import defaultdict
from enum import IntEnum
from typing import TYPE_CHECKING, List, Optional

from PyQt5 import QtWidgets
from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtGui import QFont, QIcon

from electrumabc import networks, web
from electrumabc.address import Address
from electrumabc.constants import PROJECT_NAME, SCRIPT_NAME
from electrumabc.contacts import Contact, contact_types
from electrumabc.i18n import _, ngettext
from electrumabc.plugins import run_hook
from electrumabc.printerror import PrintError

from .tree_widget import MyTreeWidget
from .util import (
    MONOSPACE_FONT,
    Buttons,
    CancelButton,
    ColorScheme,
    MessageBoxMixin,
    OkButton,
    WindowModalDialog,
    char_width_in_lineedit,
    getSaveFileName,
    rate_limited,
    webopen,
)

if TYPE_CHECKING:
    from electrumabc.contacts import Contacts

    from .main_window import ElectrumWindow


class ContactList(PrintError, MessageBoxMixin, MyTreeWidget):
    # Name, Label, Address
    filter_columns = [1, 2, 3]

    do_update_signal = pyqtSignal()

    contact_updated = pyqtSignal()
    """Emitted when a contact is added, renamed or deleted"""

    class DataRoles(IntEnum):
        Contact = Qt.UserRole + 0

    def __init__(self, main_window: ElectrumWindow, contact_manager: Contacts):
        MyTreeWidget.__init__(
            self,
            headers=["", _("Name"), _("Label"), _("Address"), _("Type")],
            config=main_window.config,
            wallet=main_window.wallet,
            stretch_column=2,
            editable_columns=[1, 2],
            deferred_updates=True,
        )
        self.main_window = main_window
        self.contact_manager = contact_manager
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

        key = self.set_contact(name, value, typ=typ, replace=contact)

        if key:
            # Due to deferred updates, on_update will actually be called later.
            # So, we have to save the edited item's "current" and "selected"
            # status here. 'on_update' will look at this tuple and clear it
            # after updating.
            self._edited_item_cur_sel = (key, was_cur, was_sel)

    def import_contacts(self):
        wallet_folder = os.path.dirname(os.path.abspath(self.config.get_wallet_path()))
        filename, __ = QtWidgets.QFileDialog.getOpenFileName(
            self, "Select your wallet file", wallet_folder
        )
        if not filename:
            return
        try:
            num = self.contact_manager.import_file(filename)
            self.show_message(_("{} contacts successfully imported.").format(num))
        except Exception as e:
            self.show_error(
                _(f"{PROJECT_NAME} was unable to import your contacts.")
                + "\n"
                + repr(e)
            )
        self.on_update()

    def export_contacts(self):
        if self.contact_manager.empty:
            self.show_error(_("Your contact list is empty."))
            return
        try:
            fileName = getSaveFileName(
                _("Select file to save your contacts"),
                f"{SCRIPT_NAME}-contacts.json",
                self.config,
                "*.json",
            )
            if fileName:
                num = self.contact_manager.export_file(fileName)
                self.show_message(
                    _("{} contacts exported to '{}'").format(num, fileName)
                )
        except Exception as e:
            self.show_error(
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
                lambda: QtWidgets.QApplication.instance()
                .clipboard()
                .setText(column_data),
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
                _("Delete"), lambda: self.delete_contacts(deletable_keys)
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
            self.new_contact_dialog,
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
        if not self.contact_manager.empty:
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
        return self.contact_manager.get_all(nocopy=True)

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
        selected_contacts = {item.data(0, self.DataRoles.Contact) for item in selected}
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

    def new_contact_dialog(self):
        d = NewContactDialog(self.top_level_window())
        if d.exec_():
            address = d.get_address()
            prefix = networks.net.CASHADDR_PREFIX.lower() + ":"
            if address.lower().startswith(prefix):
                address = address[len(prefix) :]
            self.set_contact(d.get_name(), address)

    def set_contact(
        self, label, address, typ="address", replace: Optional[Contact] = None
    ) -> Optional[Contact]:
        """Returns a reference to the newly inserted Contact object.
        replace is optional and if specified, replace an existing contact,
        otherwise add a new one.

        Note that duplicate contacts will not be added multiple times, but in
        that case the returned value would still be a valid Contact.

        Returns None on failure."""
        assert typ == "address"
        if not Address.is_valid(address):
            self.show_error(_("Invalid Address"))
            # Displays original unchanged value
            self.update()
            return
        contact = Contact(name=label, address=address, type=typ)
        if replace != contact:
            if self.contact_manager.has(contact):
                self.show_error(
                    _(
                        f"A contact named {contact.name} with the same address and type"
                        " already exists."
                    )
                )
                self.update()
                return replace or contact
            self.contact_manager.add(contact, replace_old=replace, unique=True)
        self.update()
        self.contact_updated.emit()

        # The contact has changed, update any addresses that are displayed with the old
        # information.
        run_hook("update_contact2", contact, replace)
        return contact

    def delete_contacts(self, contacts: List[Contact]):
        names = [
            f"{contact.name} <{contact.address[:8]}{'…' if len(contact.address) > 8 else ''}>"
            for contact in contacts
        ]
        n = len(names)
        contact_str = (
            " + ".join(names)
            if n <= 3
            else ngettext(
                "{number_of_contacts} contact", "{number_of_contacts} contacts", n
            ).format(number_of_contacts=n)
        )
        if not self.question(
            _(
                "Remove {list_of_contacts_OR_count_of_contacts_plus_the_word_count}"
                " from your list of contacts?"
            ).format(
                list_of_contacts_OR_count_of_contacts_plus_the_word_count=contact_str
            )
        ):
            return
        removed_entries = []
        for contact in contacts:
            if self.contact_manager.remove(contact):
                removed_entries.append(contact)

        self.update()
        self.contact_updated.emit()
        run_hook("delete_contacts2", removed_entries)


class NewContactDialog(WindowModalDialog):
    def __init__(self, parent: QtWidgets.QWidget):
        super().__init__(parent, title=_("New Contact"))

        vbox = QtWidgets.QVBoxLayout(self)
        vbox.addWidget(QtWidgets.QLabel(_("New Contact") + ":"))
        grid = QtWidgets.QGridLayout()
        self.name_edit = QtWidgets.QLineEdit()
        self.name_edit.setFixedWidth(38 * char_width_in_lineedit())
        self.address_edit = QtWidgets.QLineEdit()
        self.address_edit.setFixedWidth(38 * char_width_in_lineedit())
        grid.addWidget(QtWidgets.QLabel(_("Name")), 1, 0)
        grid.addWidget(self.name_edit, 1, 1)
        grid.addWidget(QtWidgets.QLabel(_("Address")), 2, 0)
        grid.addWidget(self.address_edit, 2, 1)
        vbox.addLayout(grid)
        vbox.addLayout(Buttons(CancelButton(self), OkButton(self)))

    def get_name(self) -> str:
        return self.name_edit.text().strip()

    def get_address(self) -> str:
        return self.address_edit.text().strip()
